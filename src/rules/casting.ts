import { commitPayment, validatePayment } from './payment';
import type { EngineContext, MatchState, ObjectId, Payment, RuleError, Seat } from './types';
import type { CostSpec } from './types';
import { moveCard } from './zones';
import { scheduleEntryAbilities } from './triggers';
import { legalSummonTargets } from './targets';

const error = (code: string, message: string): RuleError => ({ code, message });
export function castCharacter(state: MatchState, seat: Seat, source: ObjectId, payment: Payment, context: EngineContext): RuleError[] {
  const card = Object.values(state.cards).find(item => item.object === source);
  if (!card) return [error('UNKNOWN_SOURCE', 'That card has changed zones.')];
  const definition = context.catalog[card.card];
  if (!definition) return [error('UNKNOWN_CARD', 'The card has no catalog definition.')];
  const commander = state.commanders[card.owner];
  const fromCommanderZone = card.zone === 'commander' && commander.instance === card.instance;
  if (seat !== card.owner || (card.zone !== 'hand' && !fromCommanderZone)) {
    return [error('ILLEGAL_SOURCE_ZONE', 'A Character must be cast from your hand or its Command Zone.')];
  }
  if (definition.type === 'Summon') return [error('NOT_A_CHARACTER', 'A Summon does not enter the field as a Character.')];
  if (state.result || state.choice || state.priority !== seat || state.active !== seat ||
      (state.phase !== 'main1' && state.phase !== 'main2') || state.stack.length !== 0) {
    return [error('WRONG_TIMING', 'Cast a Character during your Main Phase with an empty stack and your priority.')];
  }
  const controlledField = state.field.map(instance => state.cards[instance]!)
    .filter(object => object.controller === seat && context.catalog[object.card]!.type !== 'Summon');
  if (definition.type === 'Backup' && controlledField.filter(object => context.catalog[object.card]!.type === 'Backup').length >= 5) {
    return [error('BACKUP_LIMIT', 'You cannot cast a sixth Backup onto your field.')];
  }
  if (!definition.generic && controlledField.some(object => {
    const other = context.catalog[object.card]!;
    return other.name === definition.name && !other.generic;
  })) return [error('DUPLICATE_NAME', 'You already control a non-Generic Character with this name.')];
  if (definition.elements.some(element => element === 'Light' || element === 'Dark') &&
      state.field.some(instance => state.cards[instance]!.controller === seat &&
        context.catalog[state.cards[instance]!.card]!.elements.some(element => element === 'Light' || element === 'Dark'))) {
    return [error('LIGHT_DARK_LIMIT', 'Only one Light or Dark card can be on your field.')];
  }
  const cost = definition.cost + (fromCommanderZone ? commander.casts * 2 : 0);
  const costSpec: CostSpec = { amount: cost, elements: definition.elements, dullSource: false, sacrificeSource: false, specialDiscardName: null };
  const paymentErrors = validatePayment(state, seat, source, payment, costSpec, context);
  if (paymentErrors.length) return paymentErrors;
  commitPayment(state, seat, source, payment, costSpec, context);
  moveCard(state, card.instance, 'field');
  const entered = state.cards[card.instance]!;
  entered.controller = seat;
  entered.controlledSinceTurn = state.turn;
  entered.dull = definition.type === 'Backup';
  if (fromCommanderZone) commander.casts += 1;
  state.passes = 0;
  state.priority = seat;
  scheduleEntryAbilities(state, card.instance, context);
  return [];
}

export function castSummon(state: MatchState, seat: Seat, source: ObjectId, targets: ObjectId[], mode: string | null,
  payment: Payment, context: EngineContext): RuleError[] {
  const card = Object.values(state.cards).find(item => item.object === source);
  if (!card) return [error('UNKNOWN_SOURCE', 'That card has changed zones.')];
  const definition = context.catalog[card.card];
  if (!definition || definition.type !== 'Summon') return [error('NOT_A_SUMMON', 'This card cannot be cast as a Summon.')];
  const registered = context.registry.manifest.cards.find(item => item.number === definition.number);
  const typedSummon = context.registry.card(definition.number).abilities.find(ability => ability.kind === 'summon');
  if (!registered || !typedSummon) {
    return [error('UNSUPPORTED_SUMMON', 'This Summon has no registered resolver.')];
  }
  if (card.zone !== 'hand' || card.owner !== seat) return [error('ILLEGAL_SOURCE_ZONE', 'A Summon must be cast from your hand.')];
  if (state.result || state.choice || state.priority !== seat || state.phase === 'setup' || state.phase === 'active' || state.phase === 'draw' || state.phase === 'end') {
    return [error('WRONG_TIMING', 'Cast a Summon when you have priority in a player timing window.')];
  }
  if (state.combat?.step === 'firstStrike' || state.combat?.step === 'normalDamage') {
    return [error('WRONG_TIMING', 'Cards cannot be cast during the First Strike checkpoint.')];
  }
  const targetRule = definition.summonTarget;
  if (!targetRule) return [error('UNSUPPORTED_SUMMON', 'This Summon has no registered target declaration.')];
  if (targets.length < targetRule.min || targets.length > targetRule.max) return [error('WRONG_TARGET_COUNT', 'Choose the required targets for this Summon.')];
  if (new Set(targets).size !== targets.length) return [error('DUPLICATE_TARGET', 'Choose a different object for each target.')];
  if (targetRule.modes?.length && !targetRule.modes.some(item => item.id === mode) || !targetRule.modes?.length && mode !== null) {
    return [error('INVALID_MODE', 'Choose a mode declared by this Summon.')];
  }
  if (targets.some(target => !legalSummonTargets(state, seat, targetRule, mode, context).some(item => item.object === target))) {
    return [error('ILLEGAL_TARGET', 'Choose a legal target for this Summon and mode.')];
  }
  const costSpec: CostSpec = { amount: definition.cost, elements: definition.elements, dullSource: false, sacrificeSource: false, specialDiscardName: null };
  const paymentErrors = validatePayment(state, seat, source, payment, costSpec, context);
  if (paymentErrors.length) return paymentErrors;
  commitPayment(state, seat, source, payment, costSpec, context);
  const lastKnown = moveCard(state, card.instance, 'stack');
  const resume = {
    script: definition.number, version: registered.behaviorVersion, ability: typedSummon.id, step: 'resolve', payload: null,
  };
  state.stack.push({ id: `stack-${state.nextId++}`, controller: seat, source: state.cards[card.instance]!.object,
    lastKnown, targets: [...targets], mode, data: null, resume });
  state.passes = 0;
  state.priority = seat;
  return [];
}
