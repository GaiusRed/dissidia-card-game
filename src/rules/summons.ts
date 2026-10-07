import { moveCard } from './zones';
import type { EngineContext, MatchState, RuleEvent, StackItem } from './types';

function event(state: MatchState, type: string, data: RuleEvent['data']): RuleEvent {
  return { id: `event-${state.nextId++}`, type, data };
}

function runCardScript(state: MatchState, item: StackItem, context: EngineContext, step: string, data: import('./types').Json) {
  const script = context.handlers[item.handler];
  if (!script) throw new Error(`No card script registered for ${item.lastKnown.card}/${item.handler}.`);
  return script({ state, catalog: context.catalog, handlers: context.handlers, cardEffects: context.cardEffects,
    frame: { handler: item.handler, step, data } });
}

/** Resolve a Summon through its owning card module, then apply generic stack cleanup. */
export function resolveSummon(state: MatchState, item: StackItem, context: EngineContext): RuleEvent[] {
  const result = runCardScript(state, item, context, 'resolve', {
    source: item.source, targets: item.targets, mode: item.mode, seat: item.controller,
    instance: item.lastKnown.instance, card: item.lastKnown.card,
  });
  const events = [...result.events];
  state.work.push(...result.next);
  if (result.choice) state.choice = result.choice;
  const summon = state.cards[item.lastKnown.instance];
  if (summon?.zone === 'stack') {
    const old = moveCard(state, summon.instance, 'break');
    events.push(event(state, 'summon.resolved', { card: old.card, source: old.object }));
  }
  return events;
}

/** Resume a card-owned, JSON-serializable Summon continuation after an interrupted choice. */
export function resumePendingSummonResolution(state: MatchState, context: EngineContext): RuleEvent[] {
  const index = state.work.findIndex(item => item.handler === 'summon-resolution' && item.step === 'resume-handler');
  if (index < 0 || state.choice) return [];
  const continuation = state.work[index]!;
  const raw = continuation.data && typeof continuation.data === 'object' && !Array.isArray(continuation.data)
    ? continuation.data as Record<string, import('./types').Json> : {};
  const handler = typeof raw.script === 'string' ? raw.script : 'twin-embers';
  const item: StackItem = {
    id: typeof raw.id === 'string' ? raw.id : 'resume',
    controller: raw.seat === 1 ? 1 : 0,
    source: typeof raw.source === 'string' ? raw.source : '',
    lastKnown: state.cards[String(raw.instance)] ?? {
      instance: String(raw.instance ?? ''), object: String(raw.source ?? ''), card: String(raw.card ?? ''), owner: raw.seat === 1 ? 1 : 0,
      controller: raw.seat === 1 ? 1 : 0, zone: 'break', dull: false, damage: 0, controlledSinceTurn: state.turn, attackedTurn: null, frozen: false,
    },
    handler, targets: Array.isArray(raw.targets) ? raw.targets.filter((value): value is string => typeof value === 'string') : [],
    mode: typeof raw.mode === 'string' ? raw.mode : null, data: null,
  };
  const result = runCardScript(state, item, context, 'resume', continuation.data);
  if (result.choice) state.choice = result.choice;
  if (result.choice) state.priority = null;
  else {
    state.work.splice(index, 1);
    state.priority = state.active;
  }
  state.work.push(...result.next);
  return result.events;
}
