import { commitPayment, validatePayment } from './payment';
import type { EngineContext, MatchState, ObjectId, Payment, RuleError, Seat } from './types';
import { moveCard } from './zones';
import { scheduleEntryAbilities } from './triggers';

const error = (code: string, message: string): RuleError => ({ code, message });
export function castCharacter(state: MatchState, seat: Seat, source: ObjectId, payment: Payment, context: EngineContext): RuleError[] {
  const card = Object.values(state.cards).find(item => item.object === source);
  if (!card) return [error('UNKNOWN_SOURCE', 'That card has changed zones.')];
  const definition = context.catalog[card.card];
  if (!definition) return [error('UNKNOWN_CARD', 'The card has no catalog definition.')];
  const commander = state.commanders[card.owner];
  const fromCommanderZone = card.zone === 'commander' && commander.instance === card.instance;
  if (seat !== card.owner || (card.zone !== 'hand' && !fromCommanderZone)) {
    return [error('ILLEGAL_SOURCE_ZONE', 'A Character must be cast from your hand or its Commander Zone.')];
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
  const paymentErrors = validatePayment(state, seat, source, payment, cost, context);
  if (paymentErrors.length) return paymentErrors;
  commitPayment(state, seat, source, payment, cost, context);
  moveCard(state, card.instance, 'field');
  const entered = state.cards[card.instance]!;
  entered.controller = seat;
  entered.controlledSinceTurn = state.turn;
  entered.dull = definition.type === 'Backup';
  if (fromCommanderZone) commander.casts += 1;
  scheduleEntryAbilities(state, card.instance, context);
  return [];
}

export function castSummon(state: MatchState, seat: Seat, source: ObjectId, targets: ObjectId[], mode: string | null,
  payment: Payment, context: EngineContext): RuleError[] {
  const card = Object.values(state.cards).find(item => item.object === source);
  if (!card) return [error('UNKNOWN_SOURCE', 'That card has changed zones.')];
  const definition = context.catalog[card.card];
  if (!definition || definition.type !== 'Summon' || !definition.summonHandler) return [error('NOT_A_SUMMON', 'This card cannot be cast as a Summon.')];
  if (card.zone !== 'hand' || card.owner !== seat) return [error('ILLEGAL_SOURCE_ZONE', 'A Summon must be cast from your hand.')];
  if (state.result || state.choice || state.priority !== seat || state.phase === 'setup' || state.phase === 'active' || state.phase === 'draw' || state.phase === 'end') {
    return [error('WRONG_TIMING', 'Cast a Summon when you have priority in a player timing window.')];
  }
  const supported = new Set(['scorch', 'twin-embers', 'war-cry', 'ashen-verdict', 'final-spark', 'controlled-burn',
    'return-tide', 'stillwater', 'guarding-current', 'shape-tide', 'borrowed-banner', 'rising-undertow']);
  if (!supported.has(definition.summonHandler)) return [error('UNSUPPORTED_SUMMON', 'This Summon handler has not been implemented.')];
  const singleTarget = new Set(['scorch', 'war-cry', 'ashen-verdict', 'return-tide', 'guarding-current', 'shape-tide', 'borrowed-banner', 'stillwater', 'controlled-burn']);
  const requiresTwo = definition.summonHandler === 'twin-embers';
  const noTargets = new Set(['final-spark', 'rising-undertow']);
  if (singleTarget.has(definition.summonHandler) && targets.length !== 1 || requiresTwo && targets.length !== 2 ||
      noTargets.has(definition.summonHandler) && targets.length !== 0) return [error('WRONG_TARGET_COUNT', 'Choose the required targets for this Summon.')];
  if (new Set(targets).size !== targets.length) return [error('DUPLICATE_TARGET', 'Choose a different object for each target.')];
  if (definition.summonHandler === 'stillwater') {
    if (!state.stack.some(item => item.source === targets[0])) return [error('ILLEGAL_TARGET', 'Choose a Summon currently on the stack.')];
  }
  if (definition.summonHandler === 'controlled-burn' && mode !== 'backup' && mode !== 'forward') return [error('INVALID_MODE', 'Choose whether Controlled Burn breaks a Backup or removes a Forward.')];
  if (definition.summonHandler === 'scorch' || definition.summonHandler === 'twin-embers' || definition.summonHandler === 'war-cry' ||
      definition.summonHandler === 'ashen-verdict' || definition.summonHandler === 'return-tide' || definition.summonHandler === 'guarding-current' ||
      definition.summonHandler === 'shape-tide' || definition.summonHandler === 'borrowed-banner' || definition.summonHandler === 'controlled-burn') {
    const targetCards = targets.map(target => Object.values(state.cards).find(item => item.object === target));
    if (targetCards.some(target => !target || target.zone !== 'field')) {
      return [error('ILLEGAL_TARGET', 'Choose a legal card currently on the field.')];
    }
    if (definition.summonHandler === 'controlled-burn') {
      const target = targetCards[0]!;
      const type = context.catalog[target!.card]?.type;
      if (mode === 'backup' && (type !== 'Backup' || context.catalog[target!.card]!.cost > 2) || mode === 'forward' && type !== 'Forward') {
        return [error('ILLEGAL_TARGET', 'The target does not match the selected Controlled Burn mode.')];
      }
    } else if (definition.summonHandler === 'borrowed-banner') {
      if (targetCards.some(target => !['Forward', 'Backup'].includes(context.catalog[target!.card]?.type ?? '') || target!.controller === seat)) return [error('ILLEGAL_TARGET', 'Borrowed Banner requires an opposing Character.')];
    } else if (targetCards.some(target => context.catalog[target!.card]?.type !== 'Forward')) {
      return [error('ILLEGAL_TARGET', 'Choose a Forward currently on the field.')];
    }
    if (definition.summonHandler === 'ashen-verdict' && targetCards.some(target => !target!.dull)) return [error('ILLEGAL_TARGET', 'Ashen Verdict requires a dull Forward.')];
  }
  const paymentErrors = validatePayment(state, seat, source, payment, definition.cost, context);
  if (paymentErrors.length) return paymentErrors;
  commitPayment(state, seat, source, payment, definition.cost, context);
  const lastKnown = moveCard(state, card.instance, 'stack');
  state.stack.push({ id: `stack-${state.nextId++}`, controller: seat, source: state.cards[card.instance]!.object,
    lastKnown, handler: definition.summonHandler, targets: [...targets], mode, data: null });
  state.passes = 0;
  state.priority = seat === 0 ? 1 : 0;
  return [];
}
