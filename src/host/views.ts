import type { MatchState, RuleEvent, Seat } from '../rules/types';
import type { MatchView } from './protocol';
import { describeCastAccess, legalActions } from '../rules/actions';
import type { EngineContext } from '../rules/types';

export function projectView(state: MatchState, seat: Seat | null = null, log: RuleEvent[] = [], context?: EngineContext): MatchView {
  const visible = JSON.parse(JSON.stringify(state)) as MatchState;
  const deckCounts: Record<Seat, number> = { 0: state.zones[0].deck.length, 1: state.zones[1].deck.length };
  for (const owner of [0, 1] as const) {
    // Deck order is never part of a client projection, including omniscient table views.
    visible.zones[owner].deck = [];
    const hiddenHand = seat !== null && seat !== owner;
    if (hiddenHand) {
      for (const instance of visible.zones[owner].hand) delete visible.cards[instance];
      visible.zones[owner].hand = visible.zones[owner].hand.map((_, index) => `hidden-hand-${owner}-${index}`);
    }
    for (const instance of state.zones[owner].deck) delete visible.cards[instance];
  }
  const pending = visible.choice;
  const choice = pending && (seat === null || pending.seat === seat)
    ? (({ resume: _resume, ...publicChoice }) => publicChoice)(pending)
    : pending ? { ...(({ resume: _resume, ...publicChoice }) => publicChoice)(pending),
      reason: `Player ${pending.seat + 1} is making a private choice.`, options: [] } : null;
  const safeLog = log.filter(item => {
    if (seat === null) return true;
    if (!['card.drawn', 'card.searched'].includes(item.type)) return true;
    const data = item.data && typeof item.data === 'object' && !Array.isArray(item.data)
      ? item.data as Record<string, unknown> : {};
    return data.seat === seat;
  });
  const traySeat = seat ?? state.choice?.seat ?? state.priority ?? state.active;
  return {
    seq: visible.seq, turn: visible.turn, phase: visible.phase, active: visible.active,
    priority: visible.priority, decisionSeat: visible.choice?.seat ?? visible.priority,
    choice, cards: visible.cards, zones: visible.zones, deckCounts, field: visible.field, log: JSON.parse(JSON.stringify(safeLog)) as RuleEvent[],
    stackCards: visible.stackCards, stack: visible.stack, commanders: visible.commanders,
    passes: visible.passes, result: visible.result, versions: visible.versions,
    castAccess: context ? describeCastAccess(state, traySeat, context) : [],
    actions: context ? legalActions(state, traySeat, context) : [],
  };
}
