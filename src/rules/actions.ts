import type { ActionOffer, CastAccess, ChoiceOption, Element, EngineContext, MatchState, RuleError, Seat } from './types';
import { legalAbilityTargets, legalSummonTargets } from './targets';
import { hasKeyword } from './continuous';
import { isReadyForDullCost } from './activation';

const other = (seat: Seat): Seat => seat === 0 ? 1 : 0;
const error = (code: string, message: string): RuleError => ({ code, message });
const find = (state: MatchState, object: string) => Object.values(state.cards).find(card => card.object === object);
const isLightDark = (elements: Element[]) => elements.some(element => element === 'Light' || element === 'Dark');

function paymentOptions(state: MatchState, seat: Seat, source: string, elements: Element[], context: EngineContext) {
  const colorlessCost = isLightDark(elements);
  const canPay = (card: (typeof state.cards)[string], discard: boolean): boolean => {
    const definition = context.catalog[card.card];
    if (!definition || card.object === source) return false;
    if (discard) {
      return card.zone === 'hand' && card.owner === seat && card.controller === seat && !isLightDark(definition.elements) &&
        (colorlessCost || definition.elements.some(element => elements.includes(element)));
    }
    return card.zone === 'field' && card.controller === seat && definition.type === 'Backup' && !card.dull &&
      (colorlessCost || definition.elements.some(element => elements.includes(element)));
  };
  return {
    discardOptions: state.zones[seat].hand.map(instance => state.cards[instance]!).filter(card => canPay(card, true)).map(card => card.object),
    backupOptions: state.field.map(instance => state.cards[instance]!).filter(card => canPay(card, false)).map(card => card.object),
  };
}

function castTiming(state: MatchState, seat: Seat, summon: boolean): RuleError[] {
  if (state.result) return [error('GAME_OVER', 'This match has already ended.')];
  if (state.choice) return [error('DECISION_REQUIRED', 'Resolve the open decision first.')];
  if (state.combat?.step === 'firstStrike' || state.combat?.step === 'normalDamage') {
    return [error('WRONG_TIMING', 'Cards cannot be cast during a combat damage checkpoint.')];
  }
  if (state.priority !== seat || (!summon && state.active !== seat)) return [error('WRONG_PRIORITY', 'You do not have priority.')];
  const valid = summon
    ? !['setup', 'active', 'draw', 'end'].includes(state.phase)
    : state.phase === 'main1' || state.phase === 'main2';
  if (!valid || (!summon && state.stack.length !== 0)) return [error('WRONG_TIMING', summon
    ? 'A Summon can be cast during a player timing window.'
    : 'A Character can be cast during your Main Phase with an empty stack.')];
  return [];
}

function hasPayment(state: MatchState, seat: Seat, source: string, cost: number, elements: Element[], context: EngineContext, excluded: string[] = []): boolean {
  if (cost === 0) return true;
  const targetColorless = isLightDark(elements);
  const sources = Object.values(state.cards).filter(card => {
    if (card.controller !== seat || card.object === source || excluded.includes(card.object)) return false;
    const definition = context.catalog[card.card];
    if (!definition || (!targetColorless && !definition.elements.some(element => elements.includes(element)))) return false;
    return (card.zone === 'field' && definition.type === 'Backup' && !card.dull) ||
      (card.zone === 'hand' && card.owner === seat && !isLightDark(definition.elements));
  });
  const generated: Partial<Record<Element, number>> = {};
  let total = 0;
  for (const card of sources) {
    const definition = context.catalog[card.card]!;
    const cp = card.zone === 'hand' ? 2 : 1;
    total += cp;
    for (const element of definition.elements) {
      if (elements.includes(element) || targetColorless) generated[element] = (generated[element] ?? 0) + cp;
    }
  }
  return total >= cost && (targetColorless || elements.some(element => (generated[element] ?? 0) > 0));
}

function sourceBlockers(state: MatchState, seat: Seat, source: string, context: EngineContext): RuleError[] {
  const card = find(state, source);
  if (!card) return [error('UNKNOWN_SOURCE', 'The card is no longer in this zone.')];
  const definition = context.catalog[card.card];
  if (!definition) return [error('UNKNOWN_CARD', 'The card has no catalog definition.')];
  const commander = state.commanders[card.owner];
  const commanderAccess = card.zone === 'commander' && commander?.instance === card.instance;
  if (card.owner !== seat || (card.zone !== 'hand' && !commanderAccess)) return [error('ILLEGAL_SOURCE_ZONE', 'This card cannot be cast from its current zone.')];
  const summon = definition.type === 'Summon';
  const errors = castTiming(state, seat, summon);
  if (summon && card.zone === 'commander') errors.push(error('ILLEGAL_SOURCE_ZONE', 'A Commander cannot be a Summon.'));
  const controlled = state.field.map(instance => state.cards[instance]!).filter(item => item.controller === seat && context.catalog[item.card]?.type !== 'Summon');
  if (definition.type === 'Backup' && controlled.filter(item => context.catalog[item.card]?.type === 'Backup').length >= 5) errors.push(error('BACKUP_LIMIT', 'You already control five Backups.'));
  if (!definition.generic && controlled.some(item => !context.catalog[item.card]?.generic && context.catalog[item.card]?.name === definition.name)) errors.push(error('DUPLICATE_NAME', 'You already control a non-Generic Character with this name.'));
  if (!summon && isLightDark(definition.elements) && controlled.some(item => isLightDark(context.catalog[item.card]?.elements ?? []))) errors.push(error('LIGHT_DARK_LIMIT', 'You already control a Light or Dark Character.'));
  const commanderTax = commanderAccess ? commander.casts * 2 : 0;
  const cost = definition.cost + commanderTax;
  if (!hasPayment(state, seat, source, cost, definition.elements, context)) errors.push(error('INSUFFICIENT_CP', `You need ${cost} CP, including Commander tax.`));
  if (summon) {
    const required = definition.summonTarget?.min ?? 0;
    if (legalSummonTargets(state, seat, definition.summonTarget, null, context).length < required) errors.push(error('NO_LEGAL_TARGET', 'No legal target is available for this Summon.'));
  }
  return errors;
}

export function describeCastAccess(state: MatchState, seat: Seat, context: EngineContext): CastAccess[] {
  return state.zones[seat].hand.concat([state.commanders[seat].instance]).map(instance => {
    const card = state.cards[instance]!;
    const definition = context.catalog[card.card]!;
    const isCommander = card.zone === 'commander';
    const tax = isCommander ? state.commanders[seat].casts * 2 : 0;
    const blockedReasons = sourceBlockers(state, seat, card.object, context);
    return { source: card.object, sourceZone: card.zone, canDeclare: blockedReasons.length === 0,
      blockedReasons, displayedCost: definition.cost + tax, commanderTax: tax };
  });
}

export function legalActions(state: MatchState, seat: Seat, context: EngineContext): ActionOffer[] {
  if (state.result || state.choice || state.priority !== seat) return [];
  const offers: ActionOffer[] = [];
  {
    for (const access of describeCastAccess(state, seat, context)) {
      if (!access.canDeclare) continue;
      const card = find(state, access.source)!;
      const definition = context.catalog[card.card]!;
      const targets = legalSummonTargets(state, seat, definition.summonTarget, null, context)
        .map(card => ({ id: card.object, label: context.catalog[card.card]?.name ?? card.card, object: card.object }));
      const allModeTargetOptions = Object.fromEntries((definition.summonTarget?.modes ?? []).map(mode => [mode.id,
        legalSummonTargets(state, seat, definition.summonTarget, mode.id, context)
          .map(card => ({ id: card.object, label: context.catalog[card.card]?.name ?? card.card, object: card.object }))]));
      const availableModes = (definition.summonTarget?.modes ?? []).filter(mode => (allModeTargetOptions[mode.id]?.length ?? 0) > 0);
      const modeTargetOptions = Object.fromEntries(availableModes.map(mode => [mode.id, allModeTargetOptions[mode.id]!]));
      const count = definition.summonTarget?.min ?? 0;
      const sources = paymentOptions(state, seat, access.source, definition.elements, context);
      offers.push({ id: `cast:${access.source}`, kind: 'cast', source: access.source, label: `Cast ${definition.name}`,
        ability: null, targetOptions: targets, minTargets: count, maxTargets: definition.summonTarget?.max ?? count,
        modes: availableModes.map(mode => ({ id: mode.id, label: mode.label, object: null })),
        modeTargetOptions, needsPayment: access.displayedCost > 0,
        payment: { cost: access.displayedCost, commanderTax: access.commanderTax, elements: definition.elements,
          ...sources,
          specialOptions: [], dullSource: false, sacrificeSource: false } });
    }
  }
  if (state.priority === seat) offers.push({ id: 'pass', kind: 'pass', source: null, label: 'Pass priority', ability: null,
    targetOptions: [], minTargets: 0, maxTargets: 0, modes: [], needsPayment: false, payment: null });
  if (!state.result && !state.choice && state.priority === seat && !['setup', 'active', 'draw', 'end'].includes(state.phase)) {
    for (const instance of state.field) {
      const source = state.cards[instance]!;
      if (source.controller !== seat) continue;
      const definition = context.catalog[source.card]!;
      for (const ability of definition.abilities) {
        if (ability.kind !== 'action' && ability.kind !== 'special') continue;
        const rule = ability.activation;
        const typed = context.registry.manifest.cards.some(item => item.number === source.card) &&
          context.registry.card(source.card).abilities.some(item => item.id === ability.id);
        if (!rule || !typed || (rule.dullSource && (source.dull || !isReadyForDullCost(state, source.object, context)))) continue;
        const targetCards = legalAbilityTargets(state, seat, rule.target, context);
        const specials = rule.specialDiscardName ? state.zones[seat].hand.map(id => state.cards[id]!)
          .filter(card => context.catalog[card.card]?.name === rule.specialDiscardName && card.object !== source.object) : [];
        if (targetCards.length === 0 || (rule.specialDiscardName !== null && specials.length === 0)) continue;
        if (!hasPayment(state, seat, source.object, rule.cost, rule.elements, context)) continue;
        const targetOptions = targetCards.map(card => ({ id: card.object, label: context.catalog[card.card]?.name ?? card.card, object: card.object }));
        const handOptions = state.zones[seat].hand.map(id => state.cards[id]!).filter(card => card.object !== source.object).map(card => card.object);
        const sources = paymentOptions(state, seat, source.object, rule.elements, context);
        offers.push({ id: `activate:${source.object}:${ability.id}`, kind: 'activate', source: source.object,
          label: `Activate ${ability.text}`, ability: ability.id, targetOptions, minTargets: 1, maxTargets: 1,
          modes: [], needsPayment: rule.cost > 0 || rule.dullSource || rule.sacrificeSource || rule.specialDiscardName !== null,
          payment: { cost: rule.cost, commanderTax: 0, elements: rule.elements, discardOptions: sources.discardOptions.filter(object => handOptions.includes(object)),
            backupOptions: sources.backupOptions, specialOptions: specials.map(card => card.object), dullSource: rule.dullSource, sacrificeSource: rule.sacrificeSource } });
      }
    }
  }
  // Combat declarations are derived from the same current objects as reducer validation.
  if (state.phase === 'attack' && state.active === seat && !state.combat && state.stack.length === 0) {
    const attackers = state.field.map(id => state.cards[id]!).filter(card => card.controller === seat &&
      context.catalog[card.card]?.type === 'Forward' && !card.dull && card.attackedTurn !== state.turn &&
      (card.controlledSinceTurn < state.turn || hasKeyword(state, card.object, 'Haste', context)));
    for (const card of attackers) offers.push({ id: `attack:${card.object}`, kind: 'attack', source: card.object,
      label: `Attack with ${context.catalog[card.card]?.name ?? card.card}`, ability: null, targetOptions: [],
      minTargets: 0, maxTargets: 0, modes: [], needsPayment: false, payment: null });
  }
  if (state.phase === 'attack' && state.active !== seat && state.combat?.step === 'block') {
    const blockers = state.field.map(id => state.cards[id]!).filter(card => card.controller === seat &&
      context.catalog[card.card]?.type === 'Forward' && !card.dull);
    if (blockers.length > 0) offers.push({ id: 'block:choose', kind: 'block', source: null, label: 'Choose a blocker', ability: null,
      targetOptions: blockers.map(card => ({ id: card.object, label: context.catalog[card.card]?.name ?? card.card, object: card.object })),
      minTargets: 1, maxTargets: 1, modes: [], needsPayment: false, payment: null });
  }
  return offers;
}
