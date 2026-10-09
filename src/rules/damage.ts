import type { EngineContext, MatchState, ObjectId } from './types';
import { moveCard } from './zones';
import type { RuleEvent, Seat } from './types';

/** Apply simple replacement abilities before adding damage to a Forward. */
export function replacementDamage(state: MatchState, target: ObjectId, amount: number,
  context: Pick<EngineContext, 'catalog' | 'registry'>): number {
  const card = Object.values(state.cards).find(item => item.object === target);
  if (!card || amount <= 0) return Math.max(0, amount);
  const script = context.registry?.manifest.cards.some(entry => entry.number === card.card)
    ? context.registry.card(card.card) : undefined;
  if (script) {
    let operation: import('./contracts/execution').Operation = { kind: 'forward-damage', source: '', target, amount };
    const applied = new Set<string>();
    for (const ability of script.abilities) for (const provider of ability.replacements) {
      const proposal = provider.propose(state, operation, card);
      if (!proposal || applied.has(proposal.id)) continue;
      operation = proposal.operation;
      applied.add(proposal.id);
    }
    if (operation.kind === 'forward-damage') return Math.max(0, operation.amount);
  }
  return amount;
}

export function dealPlayerDamage(state: MatchState, seat: Seat, amount: number, source: string, context: EngineContext): RuleEvent[] {
  const events: RuleEvent[] = [];
  const eligible: ObjectId[] = [];
  for (let index = 0; index < amount; index += 1) {
    const instance = state.zones[seat].deck[0];
    if (!instance) {
      state.work.push({ kind: 'empty-deck', seat });
      events.push({ id: `event-${state.nextId++}`, type: 'player.attempted-empty-draw', data: { seat, source } });
      break;
    }
    const old = moveCard(state, instance, 'damage');
    events.push({ id: `event-${state.nextId++}`, type: 'player.damaged', data: { seat, card: old.card, source } });
    const damaged = state.cards[old.instance]!;
    if (context.catalog[old.card]?.ex) eligible.push(damaged.object);
  }
  if (eligible.length) state.work.push({ kind: 'offer-ex', seat, remaining: eligible });
  return events;
}

/** Open the next mandatory timing decision in an ordered damage batch. */
export function continueDamageEx(state: MatchState, context: EngineContext): void {
  if (state.choice || state.result) return;
  const index = state.work.findIndex(item => item.kind === 'offer-ex');
  if (index < 0) return;
  const continuation = state.work[index]!;
  if (continuation.kind !== 'offer-ex') return;
  const data = continuation;
  const remaining = [...data.remaining];
  while (remaining.length) {
    const object = remaining.shift()!;
    const source = Object.values(state.cards).find(card => card.object === object);
    const definition = source && context.catalog[source.card];
    state.work[index] = { ...continuation, remaining };
    const registered = source && context.registry?.manifest.cards.find(entry => entry.number === source.card);
    const typed = source && registered && context.registry
      ? context.registry.card(source.card).abilities.find(ability => ability.ex) : undefined;
    if (source && registered && typed) {
      state.execution.frames.push({
        id: `frame-${state.nextId++}`,
        resume: { script: source.card, version: registered.behaviorVersion, ability: typed.id, step: 'resolve', payload: null },
        mode: 'ex', controller: data.seat, source: source.object, lastKnown: { ...source }, targets: [],
        selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: state.active },
        operationIndex: 0, scriptComplete: false,
      });
      state.priority = null;
      return;
    }
    if (!source || source.zone !== 'damage' || !definition?.ex) continue;
    throw new Error(`EX card ${source.card} has no registered EX script.`);
  }
  state.work.splice(index, 1);
  state.priority = state.active;
}
