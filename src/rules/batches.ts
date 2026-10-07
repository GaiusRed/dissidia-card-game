import { effectivePower } from './continuous';
import { applyOperation } from './operations';
import { replacementDamage } from './damage';
import { scheduleDepartureAbilities } from './triggers';
import { openTriggerOrder } from './priority';
import type { Operation, OperationBatch, PendingBatch, SchedulerResult } from './contracts/execution';
import type { EngineContext, MatchState } from './types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function referencedObjects(operation: Operation): string[] {
  switch (operation.kind) {
    case 'move': case 'status': case 'power': case 'keyword': case 'control': return [operation.object];
    case 'forward-damage': return [operation.target];
    case 'discard': case 'reveal': return [...operation.objects];
    case 'cancel-stack': return [operation.item];
    default: return [];
  }
}

/** Capture the batch membership, affected objects, observers, and characteristics before mutation. */
export function prepareBatch(state: MatchState, batch: OperationBatch, context: EngineContext): PendingBatch {
  if (batch.operations.length === 0) throw new Error('A simultaneous batch must contain at least one operation.');
  const objects = new Set(batch.operations.flatMap(referencedObjects));
  const snapshots = Object.values(state.cards).filter(card => objects.has(card.object)).map(card => ({ ...card }));
  if (snapshots.length !== objects.size) throw new Error('A simultaneous batch contains an unknown card object.');
  const field = state.field.map(instance => state.cards[instance]).filter((card): card is NonNullable<typeof card> => !!card);
  const operations = batch.operations.map(operation => {
    if (operation.kind !== 'forward-damage') return clone(operation);
    const target = Object.values(state.cards).find(card => card.object === operation.target);
    return target ? { ...operation, amount: replacementDamage(state, target.object, operation.amount, context) } : clone(operation);
  });
  return {
    id: `batch-${state.nextId++}`,
    operations,
    snapshots,
    observers: field.map(card => ({ ...card })),
    characteristics: snapshots.filter(card => card.zone === 'field')
      .map(card => ({ object: card.object, power: effectivePower(state, card.object, context) })),
    replacementIndex: 0,
    replacements: [],
    phase: 'replacements',
  };
}

/** Apply the original operation set with selected replacements, atomically, then expose its events. */
export function applyPreparedBatch(state: MatchState, batch: PendingBatch, context: EngineContext): SchedulerResult {
  const draft = clone(state);
  const finalOperations = batch.operations.map((operation, index) =>
    batch.replacements.find(item => item.operation === index)?.replacement ?? operation);
  const events = [] as import('./types').RuleEvent[];
  for (const operation of finalOperations) {
    const cardObject = operation.kind === 'move'
      ? batch.snapshots.find(card => card.object === operation.object)
      : undefined;
    const power = cardObject && cardObject.zone === 'field'
      ? batch.characteristics.find(item => item.object === cardObject.object)?.power : undefined;
    const applied = applyOperation(draft, operation, context, {
      simultaneous: true,
      observers: batch.observers,
      deferDepartureTriggers: true,
      ...(power === undefined ? {} : { lastPower: power }),
    });
    if (applied.error) return { events: [], error: applied.error };
    events.push(...applied.events);
  }
  finalOperations.forEach((operation, index) => {
    if (operation.kind !== 'move') return;
    const departed = batch.snapshots.find(card => card.object === operation.object);
    if (!departed || departed.zone !== 'field') return;
    const power = batch.characteristics.find(item => item.object === departed.object)?.power ?? 0;
    scheduleDepartureAbilities(draft, departed, operation.to, context, power, batch.observers, true);
  });
  // First Strike damage has no priority window before ordinary combat damage.
  // Keep its triggers collected until the complete combat damage sequence ends.
  if (draft.triggers.length > 0 && draft.combat?.step !== 'normalDamage') openTriggerOrder(draft, context);
  Object.assign(state, draft);
  return { events, error: null };
}

export function selectBatchReplacement(batch: PendingBatch, operation: number, replacement: Operation): void {
  if (!Number.isSafeInteger(operation) || operation < 0 || operation >= batch.operations.length) {
    throw new Error('A batch replacement must reference an existing operation.');
  }
  if (batch.replacements.some(item => item.operation === operation)) throw new Error('A batch operation can only be replaced once.');
  batch.replacements.push({ operation, replacement });
}

/** Advance the frozen batch to the next Commander replacement request, if one exists. */
export function nextCommanderReplacement(state: MatchState, batch: PendingBatch):
  { operation: number; object: string; destination: import('./types').Zone; owner: 0 | 1 } | null {
  while (batch.replacementIndex < batch.operations.length) {
    const index = batch.replacementIndex++;
    const operation = batch.operations[index]!;
    if (operation.kind !== 'move' || batch.replacements.some(item => item.operation === index)) continue;
    const snapshot = batch.snapshots.find(card => card.object === operation.object);
    if (!snapshot || snapshot.zone !== 'field' || state.commanders[snapshot.owner].instance !== snapshot.instance) continue;
    return { operation: index, object: snapshot.object, destination: operation.to, owner: snapshot.owner };
  }
  batch.phase = 'apply';
  return null;
}
