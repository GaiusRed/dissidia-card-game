import { moveCard } from './zones';
import type { EngineContext, MatchState, RuleEvent, Seat } from './types';

function event(state: MatchState, type: string, data: RuleEvent['data']): RuleEvent {
  return { id: 'event-' + state.nextId++, type, data };
}

export function advanceTurnStep(state: MatchState, _context: EngineContext): RuleEvent[] {
  if (state.phase !== 'active' && state.phase !== 'draw') {
    throw new Error('Only the automatic Active and Draw Phases advance without priority.');
  }
  if (state.phase === 'active') {
    const events: RuleEvent[] = [];
    for (const instance of [...state.field]) {
      const card = state.cards[instance]!;
      if (card.controller !== state.active) continue;
      if (card.frozen) {
        card.frozen = false;
      } else if (card.dull) {
        card.dull = false;
        events.push(event(state, 'card.activated', { object: card.object, seat: card.controller }));
      }
    }
    state.phase = 'draw';
    events.push(...advanceTurnStep(state, _context));
    return events;
  }

  const count = state.turn === 1 && state.active === state.firstPlayer ? 1 : 2;
  const events: RuleEvent[] = [];
  for (let index = 0; index < count; index += 1) {
    const instance = state.zones[state.active].deck[0];
    if (!instance) {
      state.work.push({ kind: 'empty-deck', seat: state.active });
      events.push(event(state, 'player.attempted-empty-draw', { seat: state.active }));
      break;
    }
    const old = moveCard(state, instance, 'hand');
    events.push(event(state, 'card.drawn', { seat: state.active, card: old.card }));
  }
  if (!state.result) {
    state.phase = 'main1';
    state.priority = state.active;
  }
  return events;
}
