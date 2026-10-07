import type { Catalog, EngineContext, MatchState, ObjectId } from './types';
import { moveCard } from './zones';
import type { RuleEvent, Seat } from './types';

/** Apply simple replacement abilities before adding damage to a Forward. */
export function replacementDamage(state: MatchState, target: ObjectId, amount: number,
  context: { catalog: Catalog; cardEffects?: EngineContext['cardEffects'] }): number {
  const card = Object.values(state.cards).find(item => item.object === target);
  if (!card || amount <= 0) return Math.max(0, amount);
  const replacement = context.cardEffects?.[card.card]?.replaceDamage;
  if (replacement) return replacement(state, card, amount, context as EngineContext);
  return amount;
}

export function dealPlayerDamage(state: MatchState, seat: Seat, amount: number, source: string, context: EngineContext): RuleEvent[] {
  const events: RuleEvent[] = [];
  const eligible: ObjectId[] = [];
  for (let index = 0; index < amount; index += 1) {
    const instance = state.zones[seat].deck[0];
    if (!instance) {
      state.work.push({ handler: 'rule-process', step: 'empty-deck', data: { seat } });
      events.push({ id: `event-${state.nextId++}`, type: 'player.attempted-empty-draw', data: { seat, source } });
      break;
    }
    const old = moveCard(state, instance, 'damage');
    events.push({ id: `event-${state.nextId++}`, type: 'player.damaged', data: { seat, card: old.card, source } });
    const damaged = state.cards[old.instance]!;
    if (context.catalog[old.card]?.ex) eligible.push(damaged.object);
  }
  if (eligible.length) state.work.push({ handler: 'damage', step: 'offer-ex', data: { seat, remaining: eligible } });
  return events;
}

/** Open the next mandatory timing decision in an ordered damage batch. */
export function continueDamageEx(state: MatchState, context: EngineContext): void {
  if (state.choice || state.result) return;
  const index = state.work.findIndex(item => item.handler === 'damage' && item.step === 'offer-ex');
  if (index < 0) return;
  const continuation = state.work[index]!;
  const data = continuation.data as { seat: Seat; remaining: ObjectId[] };
  const remaining = [...data.remaining];
  while (remaining.length) {
    const object = remaining.shift()!;
    const source = Object.values(state.cards).find(card => card.object === object);
    const definition = source && context.catalog[source.card];
    state.work[index] = { ...continuation, data: { seat: data.seat, remaining } };
    if (!source || source.zone !== 'damage' || !definition?.ex || !definition.exHandler || !context.handlers[definition.exHandler]) continue;
    state.choice = {
      id: `choice-${state.nextId++}`, seat: data.seat, kind: 'confirm',
      reason: `${definition.name}: use this EX Burst?`,
      options: [{ id: 'use', label: 'Use EX Burst', object }, { id: 'skip', label: 'Skip', object }],
      min: 1, max: 1, allocation: null,
      resume: { handler: definition.exHandler, step: 'decision', data: { seat: data.seat, source: object } },
    };
    state.priority = null;
    return;
  }
  state.work.splice(index, 1);
  state.priority = state.active;
}
