import type { EngineContext, Element, MatchState, ObjectId, Payment, RuleError, RuleEvent, Seat } from './types';
import { moveCard } from './zones';

function byObject(state: MatchState, object: ObjectId | null) {
  if (object === null) return undefined;
  return Object.values(state.cards).find(card => card.object === object);
}
const issue = (code: string, message: string): RuleError => ({ code, message });

export function validatePayment(
  state: MatchState, seat: Seat, source: ObjectId, payment: Payment, cost: number, context: EngineContext,
): RuleError[] {
  const errors: RuleError[] = [];
  const sourceCard = byObject(state, source);
  if (!sourceCard) return [issue('UNKNOWN_SOURCE', 'The card being played or activated has left its zone.')];
  const sourceDefinition = context.catalog[sourceCard.card];
  if (!sourceDefinition) return [issue('UNKNOWN_SOURCE', 'The source card has no catalog definition.')];
  const sources = [...payment.discard, ...payment.dullBackups];
  const distinct = new Set(sources);
  if (distinct.size !== sources.length || (payment.specialDiscard !== null && distinct.has(payment.specialDiscard))) {
    errors.push(issue('DUPLICATE_COST_SOURCE', 'One card cannot pay two parts of the same cost.'));
  }
  const lightDarkTarget = sourceDefinition.elements.some(element => element === 'Light' || element === 'Dark');
  const generated: Partial<Record<Element, number>> = {};

  for (const object of sources) {
    const card = byObject(state, object);
    if (!card || card.object === source) {
      errors.push(issue('INVALID_CP_SOURCE', 'A CP source must be an eligible card you control.'));
      continue;
    }
    const definition = context.catalog[card.card];
    if (!definition) {
      errors.push(issue('INVALID_CP_SOURCE', 'The CP source has no catalog definition.'));
      continue;
    }
    const element = payment.sourceElements[object];
    if (!element || !definition.elements.includes(element)) {
      errors.push(issue('INVALID_CP_ELEMENT', 'Choose an element printed on each CP source.'));
      continue;
    }
    const sharesElement = lightDarkTarget || sourceDefinition.elements.some(item => definition.elements.includes(item));
    if (!sharesElement) errors.push(issue('INVALID_CP_SOURCE', 'The CP source must share an element with the card being played.'));
    if (payment.discard.includes(object)) {
      if (card.owner !== seat || card.controller !== seat || card.zone !== 'hand' || definition.elements.some(item => item === 'Light' || item === 'Dark')) {
        errors.push(issue('INVALID_CP_SOURCE', 'Only an eligible card in your hand can be discarded for CP.'));
      }
      generated[element] = (generated[element] ?? 0) + 2;
    } else {
      if (card.controller !== seat || card.zone !== 'field' || definition.type !== 'Backup' || card.dull) {
        errors.push(issue('INVALID_CP_SOURCE', 'Only an active Backup you control can be dulled for CP.'));
      }
      generated[element] = (generated[element] ?? 0) + 1;
    }
  }
  for (const object of Object.keys(payment.sourceElements)) {
    if (!sources.includes(object)) errors.push(issue('INVALID_CP_ELEMENT', 'An element choice has no matching CP source.'));
  }

  const amounts = Object.values(payment.spend);
  if (amounts.some(amount => !Number.isInteger(amount) || amount < 0)) errors.push(issue('INVALID_CP_AMOUNT', 'CP amounts must be nonnegative whole numbers.'));
  const spent = amounts.reduce((sum, amount) => sum + amount, 0);
  if (spent < cost) errors.push(issue('UNDERPAYMENT', 'The selected CP does not cover the full cost.'));
  if (spent > cost) errors.push(issue('OVERPAYMENT', 'Spend exactly the required CP. Unused generated CP expires.'));
  for (const element of Object.keys(payment.spend) as Element[]) {
    if ((payment.spend[element] ?? 0) > (generated[element] ?? 0)) errors.push(issue('UNGENERATED_CP', 'Spend only CP that the selected sources generate.'));
  }
  const matchingSpent = sourceDefinition.elements.some(element => (payment.spend[element] ?? 0) > 0);
  if (cost > 0 && !lightDarkTarget && !matchingSpent) errors.push(issue('ELEMENT_REQUIREMENT', 'Spend at least one CP of the card’s element.'));
  if (cost === 0 && sources.length > 0) errors.push(issue('UNNEEDED_CP', 'A zero-cost action does not need CP sources.'));

  const special = byObject(state, payment.specialDiscard);
  if (payment.specialDiscard !== null) {
    const specialDefinition = special ? context.catalog[special.card] : undefined;
    if (!special || special.owner !== seat || special.zone !== 'hand' || special.object === source ||
        !specialDefinition || specialDefinition.name !== sourceDefinition.name) {
      errors.push(issue('INVALID_SPECIAL_DISCARD', 'Special discard requires another card with the same name in your hand.'));
    }
  }
  if (payment.dullSource || payment.sacrificeSource) {
    if (sourceCard.zone !== 'field' || sourceCard.controller !== seat) {
      errors.push(issue('INVALID_ABILITY_SOURCE', 'This ability requires its source on your field under your control.'));
    }
    if (payment.dullSource && sourceCard.dull) errors.push(issue('SOURCE_ALREADY_DULL', 'The ability source must be active.'));
  }
  return errors;
}

export function commitPayment(
  state: MatchState, seat: Seat, source: ObjectId, payment: Payment, cost: number, context: EngineContext,
): RuleEvent[] {
  const found = byObject(state, source);
  if (!found) throw new Error('Payment source disappeared before commitment.');
  const errors = validatePayment(state, seat, source, payment, cost, context);
  if (errors.length) throw new Error(errors.map(error => error.message).join(' '));
  const events: RuleEvent[] = [];
  const emit = (type: string, object: ObjectId) => events.push({
    id: 'event-' + state.nextId++, type, data: { card: object, seat },
  });
  for (const object of payment.discard) {
    const card = byObject(state, object)!;
    const old = moveCard(state, card.instance, 'break');
    emit('card.discarded', old.object);
  }
  for (const object of payment.dullBackups) {
    const card = byObject(state, object)!;
    card.dull = true;
    emit('backup.dulled-for-cp', object);
  }
  if (payment.specialDiscard !== null) {
    const card = byObject(state, payment.specialDiscard)!;
    const old = moveCard(state, card.instance, 'break');
    emit('card.discarded-for-special', old.object);
  }
  const abilitySource = byObject(state, source);
  if (abilitySource && payment.dullSource) {
    abilitySource.dull = true;
    emit('ability.source-dulled', source);
  }
  if (abilitySource && payment.sacrificeSource) {
    const old = moveCard(state, abilitySource.instance, 'break');
    emit('ability.source-sacrificed', old.object);
  }
  return events;
}
