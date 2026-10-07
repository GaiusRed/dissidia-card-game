import type { CostSpec, EngineContext, Element, MatchState, ObjectId, Payment, RuleError, RuleEvent, Seat } from './types';
import { prepareBatch } from './batches';

function byObject(state: MatchState, object: ObjectId | null) {
  if (object === null) return undefined;
  return Object.values(state.cards).find(card => card.object === object);
}
const issue = (code: string, message: string): RuleError => ({ code, message });

export function validatePayment(
  state: MatchState, seat: Seat, source: ObjectId, payment: Payment, spec: CostSpec, context: EngineContext,
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
  const lightDarkTarget = spec.elements.some(element => element === 'Light' || element === 'Dark');
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
    const sharesElement = lightDarkTarget || spec.elements.some(item => definition.elements.includes(item));
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
  if (spent < spec.amount) errors.push(issue('UNDERPAYMENT', 'The selected CP does not cover the full cost.'));
  if (spent > spec.amount) errors.push(issue('OVERPAYMENT', 'Spend exactly the required CP. Unused generated CP expires.'));
  for (const element of Object.keys(payment.spend) as Element[]) {
    if ((payment.spend[element] ?? 0) > (generated[element] ?? 0)) errors.push(issue('UNGENERATED_CP', 'Spend only CP that the selected sources generate.'));
  }
  const matchingSpent = spec.elements.some(element => (payment.spend[element] ?? 0) > 0);
  if (spec.amount > 0 && !lightDarkTarget && !matchingSpent) errors.push(issue('ELEMENT_REQUIREMENT', 'Spend at least one CP of the card’s element.'));
  if (spec.amount === 0 && sources.length > 0) errors.push(issue('UNNEEDED_CP', 'A zero-cost action does not need CP sources.'));
  const excess = Object.entries(generated).reduce((sum, [element, amount]) => sum + Math.max(0, amount! - (payment.spend[element as Element] ?? 0)), 0);
  if (excess > 1) errors.push(issue('EXCESS_CP', 'Unused CP cannot exceed one point.'));
  for (const object of sources) {
    const element = payment.sourceElements[object];
    const amount = payment.discard.includes(object) ? 2 : 1;
    if (element && (generated[element] ?? 0) - amount >= (payment.spend[element] ?? 0)) {
      errors.push(issue('EXCESS_CP_SOURCE', 'Every selected CP source must be needed to pay the declared cost.'));
    }
  }

  const special = byObject(state, payment.specialDiscard);
  if (payment.specialDiscard !== null) {
    const specialDefinition = special ? context.catalog[special.card] : undefined;
    if (!spec.specialDiscardName || !special || special.owner !== seat || special.zone !== 'hand' || special.object === source ||
        !specialDefinition || specialDefinition.name !== spec.specialDiscardName) {
      errors.push(issue('INVALID_SPECIAL_DISCARD', 'Special discard requires another card with the same name in your hand.'));
    }
  }
  if (payment.dullSource !== spec.dullSource || payment.sacrificeSource !== spec.sacrificeSource ||
      ((payment.specialDiscard !== null) !== (spec.specialDiscardName !== null))) {
    errors.push(issue('INVALID_COST_COMPONENTS', 'Payment components must match the declared ability cost.'));
  }
  if (spec.dullSource || spec.sacrificeSource) {
    if (sourceCard.zone !== 'field' || sourceCard.controller !== seat) {
      errors.push(issue('INVALID_ABILITY_SOURCE', 'This ability requires its source on your field under your control.'));
    }
    if (spec.dullSource && sourceCard.dull) errors.push(issue('SOURCE_ALREADY_DULL', 'The ability source must be active.'));
  }
  return errors;
}

export function commitPayment(
  state: MatchState, seat: Seat, source: ObjectId, payment: Payment, spec: CostSpec, context: EngineContext,
): RuleEvent[] {
  const found = byObject(state, source);
  if (!found) throw new Error('Payment source disappeared before commitment.');
  const errors = validatePayment(state, seat, source, payment, spec, context);
  if (errors.length) throw new Error(errors.map(error => error.message).join(' '));
  const operations: import('./contracts/execution').Operation[] = [];
  if (payment.discard.length > 0) operations.push({ kind: 'discard', seat, objects: [...payment.discard], reason: 'cost' });
  if (payment.specialDiscard !== null) operations.push({ kind: 'discard', seat, objects: [payment.specialDiscard], reason: 'special-cost' });
  for (const object of payment.dullBackups) operations.push({ kind: 'status', object, dull: true, freeze: false });
  const abilitySource = byObject(state, source);
  if (abilitySource && spec.dullSource) operations.push({ kind: 'status', object: abilitySource.object, dull: true, freeze: false });
  if (abilitySource && spec.sacrificeSource) operations.push({ kind: 'move', object: abilitySource.object, to: 'break', index: null });
  if (operations.length > 0) state.execution.batch = prepareBatch(state, { simultaneous: true, operations }, context);
  return [];
}
