import { advanceTurnStep } from './turns';
import { resolveCombat } from './combat';
import { resolveSummon } from './summons';
import { expireTurnEffects } from './continuous';
import { effectivePower } from './continuous';
import { requestDeparture } from './commander';
import type { EngineContext, MatchState, RuleEvent, Seat, StackItem } from './types';

const other = (seat: Seat): Seat => seat === 0 ? 1 : 0;
function event(state: MatchState, type: string, data: RuleEvent['data']): RuleEvent {
  return { id: 'event-' + state.nextId++, type, data };
}

export function openTriggerOrder(state: MatchState, context: EngineContext): void {
  while (state.triggers.length > 0) {
    const group = state.triggers[0]!;
    const data = group.data as unknown as { seat: Seat; items: StackItem[] };
    if (data.items.length === 1) {
      state.stack.push(data.items[0]!);
      state.triggers.shift();
      continue;
    }
    state.choice = {
      id: `choice-${state.nextId++}`, seat: data.seat, kind: 'order',
      reason: 'Order your End Phase abilities as they are put on the stack (first selected resolves last).',
      options: data.items.map(item => ({ id: item.id, label: context.catalog[item.lastKnown.card]?.name ?? item.handler, object: item.source })),
      min: data.items.length, max: data.items.length, allocation: null,
      resume: { handler: 'trigger-order', step: 'order', data: { seat: data.seat } },
    };
    state.priority = null;
    return;
  }
  state.priority = state.active;
}

/** Run one End Phase cleanup checkpoint after both players pass. */
export function runEndCheckpoint(state: MatchState, context: EngineContext): RuleEvent[] {
  if (state.phase !== 'end' || state.choice) return [];
  const hand = state.zones[state.active].hand;
  const excess = hand.length - 5;
  if (excess > 0) {
    state.choice = {
      id: `choice-${state.nextId++}`, seat: state.active, kind: 'cards',
      reason: `End Phase: discard ${excess} card${excess === 1 ? '' : 's'} to reach a hand of five.`,
      options: hand.map(instance => ({ id: state.cards[instance]!.object,
        label: context.catalog[state.cards[instance]!.card]?.name ?? state.cards[instance]!.card,
        object: state.cards[instance]!.object })),
      min: excess, max: excess, allocation: null,
      resume: { handler: 'end-phase-discard', step: 'discard', data: { seat: state.active } },
    };
    state.priority = null;
    return [];
  }

  const events: RuleEvent[] = [];
  for (const instance of [...state.field]) state.cards[instance]!.damage = 0;
  expireTurnEffects(state);
  for (const instance of [...state.field]) {
    const card = state.cards[instance]!;
    if (context.catalog[card.card]?.type !== 'Forward' || effectivePower(state, card.object, context) > 0) continue;
    const receipt = requestDeparture(state, instance, 'break', context);
    if (receipt) events.push(event(state, 'forward.broken', { object: receipt.old.object, card: receipt.old.card, destination: 'break' }));
    if (state.choice) break;
  }
  state.passes = 0;
  if (state.choice || state.stack.length > 0 || state.triggers.length > 0) {
    state.priority = state.choice ? null : state.active;
    return events;
  }
  state.active = other(state.active);
  state.turn += 1;
  state.phase = 'active';
  state.priority = null;
  events.push(...advanceTurnStep(state, context));
  return events;
}

/** Pass priority and advance an empty-stack timing window after both players pass. */
export function passPriority(state: MatchState, context: EngineContext): RuleEvent[] {
  if (state.priority === null) throw new Error('There is no player with priority.');
  const events: RuleEvent[] = [event(state, 'priority.passed', { seat: state.priority })];
  state.passes += 1;
  if (state.passes === 1) {
    state.priority = other(state.priority);
    return events;
  }
  state.passes = 0;
  if (state.phase === 'attack' && state.combat) {
    events.push(...resolveCombat(state, context));
    return events;
  }
  if (state.stack.length > 0) {
    const item = state.stack.pop()!;
    if (state.cards[item.lastKnown.instance]?.zone === 'stack' && context.catalog[item.lastKnown.card]?.type === 'Summon') events.push(...resolveSummon(state, item, context));
    else {
      const ability = context.handlers[item.handler];
      if (!ability) throw new Error(`No resolution handler for ${item.handler}.`);
      const result = ability({ state, catalog: context.catalog, handlers: context.handlers, frame: { handler: item.handler, step: 'resolve', data: item.data } });
      events.push(...result.events);
      state.work.push(...result.next);
      if (result.choice) state.choice = result.choice;
    }
    state.priority = state.active;
    events.push(event(state, 'stack.resolved', { item: item.id, handler: item.handler }));
    return events;
  }
  switch (state.phase) {
    case 'main1': state.phase = 'attack'; break;
    case 'attack': state.phase = 'main2'; break;
    case 'main2': {
      state.phase = 'end';
      const grouped: Record<Seat, StackItem[]> = { 0: [], 1: [] };
      const delayed = state.effects.filter(effect => effect.handler === 'undertow-discard' && effect.controller === state.active);
      for (const effect of delayed) {
        const instance = (effect.data as { instance?: unknown } | null)?.instance;
        const source = typeof instance === 'string' ? state.cards[instance] : undefined;
        if (!source || !context.handlers['rising-undertow-end-discard']) continue;
        grouped[effect.controller].push({ id: `stack-${state.nextId++}`, controller: effect.controller, source: source.object,
          lastKnown: { ...source }, handler: 'rising-undertow-end-discard', targets: [], mode: null,
          data: { seat: effect.controller, effect: effect.id } });
      }
      state.effects = state.effects.filter(effect => !delayed.some(item => item.id === effect.id));
      for (const instance of state.field) {
        const source = state.cards[instance]!;
        if (source.controller !== state.active) continue;
        const abilities = context.catalog[source.card]?.abilities.filter(ability =>
          ability.kind === 'auto' && ability.handler === 'mist-caller-activate' && context.handlers[ability.handler]) ?? [];
        for (const ability of abilities) grouped[source.controller].push({
          id: `stack-${state.nextId++}`, controller: source.controller, source: source.object, lastKnown: { ...source },
          handler: ability.handler, targets: [], mode: null,
          data: { source: source.object, seat: source.controller, ability: ability.id },
        });
      }
      for (const seat of [state.active, other(state.active)] as const) {
        if (grouped[seat].length > 0) state.triggers.push({ handler: 'trigger-order', step: 'order',
          data: JSON.parse(JSON.stringify({ seat, items: grouped[seat] })) as import('./types').Json });
      }
      openTriggerOrder(state, context);
      break;
    }
    case 'end':
      events.push(...runEndCheckpoint(state, context));
      return events;
    default: throw new Error('Priority cannot advance during an automatic phase.');
  }
  state.priority = state.choice ? null : state.phase === 'end' ? state.active : state.stack.length > 0 ? other(state.active) : state.active;
  events.push(event(state, 'phase.started', { phase: state.phase, turn: state.turn, active: state.active }));
  return events;
}
