import type { ActionOffer, CastAccess, ChoiceOption, Element, EngineContext, MatchState, RuleError, Seat } from './types';

const other = (seat: Seat): Seat => seat === 0 ? 1 : 0;
const error = (code: string, message: string): RuleError => ({ code, message });
const find = (state: MatchState, object: string) => Object.values(state.cards).find(card => card.object === object);
const isLightDark = (elements: Element[]) => elements.some(element => element === 'Light' || element === 'Dark');

function castTiming(state: MatchState, seat: Seat, summon: boolean): RuleError[] {
  if (state.result) return [error('GAME_OVER', 'This match has already ended.')];
  if (state.choice) return [error('DECISION_REQUIRED', 'Resolve the open decision first.')];
  if (state.priority !== seat || (!summon && state.active !== seat)) return [error('WRONG_PRIORITY', 'You do not have priority.')];
  const valid = summon
    ? !['setup', 'active', 'draw', 'end'].includes(state.phase)
    : state.phase === 'main1' || state.phase === 'main2';
  if (!valid || (!summon && state.stack.length !== 0)) return [error('WRONG_TIMING', summon
    ? 'A Summon can be cast during a player timing window.'
    : 'A Character can be cast during your Main Phase with an empty stack.')];
  return [];
}

function hasPayment(state: MatchState, seat: Seat, source: string, cost: number, elements: Element[], context: EngineContext): boolean {
  if (cost === 0) return true;
  const targetColorless = isLightDark(elements);
  const sources = Object.values(state.cards).filter(card => {
    if (card.owner !== seat || card.controller !== seat || card.object === source) return false;
    const definition = context.catalog[card.card];
    if (!definition || (!targetColorless && !definition.elements.some(element => elements.includes(element)))) return false;
    return (card.zone === 'field' && definition.type === 'Backup' && !card.dull) ||
      (card.zone === 'hand' && !isLightDark(definition.elements));
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

function targetOptions(state: MatchState, seat: Seat, handler: string | null, context: EngineContext): ChoiceOption[] {
  if (!handler) return [];
  const all = state.field.map(instance => state.cards[instance]!).filter(card => card.zone === 'field');
  const forwards = all.filter(card => context.catalog[card.card]?.type === 'Forward');
  const opposing = all.filter(card => card.controller !== seat);
  let eligible = forwards;
  if (handler === 'borrowed-banner') eligible = opposing.filter(card => ['Forward', 'Backup'].includes(context.catalog[card.card]?.type ?? ''));
  if (handler === 'controlled-burn') eligible = opposing.filter(card => context.catalog[card.card]?.type === 'Forward' ||
    (context.catalog[card.card]?.type === 'Backup' && (context.catalog[card.card]?.cost ?? 99) <= 2));
  if (handler === 'ashen-verdict') eligible = forwards.filter(card => card.dull);
  if (handler === 'stillwater') eligible = state.stack.map(item => find(state, item.source)).filter((card): card is NonNullable<typeof card> => !!card);
  if (handler === 'final-spark' || handler === 'rising-undertow') return [];
  return eligible.map(card => ({ id: card.object, label: context.catalog[card.card]?.name ?? card.card, object: card.object }));
}

function targetRequirement(handler: string | null): number {
  if (!handler || handler === 'final-spark' || handler === 'rising-undertow') return 0;
  return handler === 'twin-embers' ? 2 : 1;
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
    const required = targetRequirement(definition.summonHandler);
    if (targetOptions(state, seat, definition.summonHandler, context).length < required) errors.push(error('NO_LEGAL_TARGET', 'No legal target is available for this Summon.'));
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
      const targets = targetOptions(state, seat, definition.summonHandler, context);
      const count = targetRequirement(definition.summonHandler);
      offers.push({ id: `cast:${access.source}`, kind: 'cast', source: access.source, label: `Cast ${definition.name}`,
        ability: null, targetOptions: targets, minTargets: count, maxTargets: count,
        modes: definition.summonHandler === 'controlled-burn' ? [
          { id: 'backup', label: 'Break a Backup', object: null }, { id: 'forward', label: 'Remove a Forward', object: null },
        ] : [], needsPayment: access.displayedCost > 0,
        payment: { cost: access.displayedCost, commanderTax: access.commanderTax, elements: definition.elements,
          discardOptions: state.zones[seat].hand.map(id => state.cards[id]!.object).filter(id => id !== access.source),
          backupOptions: state.field.map(id => state.cards[id]!).filter(item => item.controller === seat && context.catalog[item.card]?.type === 'Backup' && !item.dull).map(item => item.object),
          specialOptions: [], dullSource: false, sacrificeSource: false } });
    }
  }
  if (state.priority === seat) offers.push({ id: 'pass', kind: 'pass', source: null, label: 'Pass priority', ability: null,
    targetOptions: [], minTargets: 0, maxTargets: 0, modes: [], needsPayment: false, payment: null });
  // Combat declarations are derived from the same current objects as reducer validation.
  if (state.phase === 'attack' && state.active === seat && !state.combat) {
    const attackers = state.field.map(id => state.cards[id]!).filter(card => card.controller === seat &&
      context.catalog[card.card]?.type === 'Forward' && !card.dull && !card.frozen && card.attackedTurn !== state.turn &&
      (card.controlledSinceTurn < state.turn || context.catalog[card.card]?.keywords.includes('Haste')));
    for (const card of attackers) offers.push({ id: `attack:${card.object}`, kind: 'attack', source: card.object,
      label: `Attack with ${context.catalog[card.card]?.name ?? card.card}`, ability: null, targetOptions: [],
      minTargets: 0, maxTargets: 0, modes: [], needsPayment: false, payment: null });
  }
  if (state.phase === 'attack' && state.active !== seat && state.combat?.step === 'block') {
    const blockers = state.field.map(id => state.cards[id]!).filter(card => card.controller === seat &&
      context.catalog[card.card]?.type === 'Forward' && !card.dull && !card.frozen);
    offers.push({ id: 'block:none', kind: 'block', source: null, label: 'Do not block', ability: null,
      targetOptions: blockers.map(card => ({ id: card.object, label: context.catalog[card.card]?.name ?? card.card, object: card.object })),
      minTargets: 0, maxTargets: 1, modes: [], needsPayment: false, payment: null });
  }
  return offers;
}
