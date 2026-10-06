import { advanceTurnStep } from './turns';
import { resolveCombat } from './combat';
import { resolveSummon } from './summons';
import { expireTurnEffects } from './continuous';
import type { EngineContext, MatchState, RuleEvent, Seat } from './types';

const other = (seat: Seat): Seat => seat === 0 ? 1 : 0;
function event(state: MatchState, type: string, data: RuleEvent['data']): RuleEvent {
  return { id: 'event-' + state.nextId++, type, data };
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
      const result = ability({ state, catalog: context.catalog, frame: { handler: item.handler, step: 'resolve', data: item.data } });
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
      const delayed = state.effects.filter(effect => effect.handler === 'undertow-discard' && effect.controller === state.active);
      for (const effect of delayed) {
        const instance = (effect.data as { instance?: unknown } | null)?.instance;
        const source = typeof instance === 'string' ? state.cards[instance] : undefined;
        if (!source || !context.handlers['rising-undertow-end-discard']) continue;
        state.stack.push({ id: `stack-${state.nextId++}`, controller: effect.controller, source: source.object,
          lastKnown: { ...source }, handler: 'rising-undertow-end-discard', targets: [], mode: null,
          data: { seat: effect.controller, effect: effect.id } });
      }
      state.effects = state.effects.filter(effect => !delayed.some(item => item.id === effect.id));
      for (const instance of state.field) {
        const source = state.cards[instance]!;
        if (source.controller !== state.active) continue;
        const abilities = context.catalog[source.card]?.abilities.filter(ability =>
          ability.kind === 'auto' && ability.handler === 'mist-caller-activate' && context.handlers[ability.handler]) ?? [];
        for (const ability of abilities) state.stack.push({
          id: `stack-${state.nextId++}`, controller: source.controller, source: source.object, lastKnown: { ...source },
          handler: ability.handler, targets: [], mode: null,
          data: { source: source.object, seat: source.controller, ability: ability.id },
        });
      }
      break;
    }
    case 'end':
      expireTurnEffects(state);
      state.active = other(state.active);
      state.turn += 1;
      state.phase = 'active';
      state.priority = null;
      events.push(...advanceTurnStep(state, context));
      return events;
    default: throw new Error('Priority cannot advance during an automatic phase.');
  }
  state.priority = state.stack.length > 0 ? other(state.active) : state.active;
  events.push(event(state, 'phase.started', { phase: state.phase, turn: state.turn, active: state.active }));
  return events;
}
