import type { MatchState, RuleEvent, Seat } from '../rules/types';
import type { MatchView } from './protocol';

export function projectView(state: MatchState, seat: Seat | null = null, log: RuleEvent[] = []): MatchView {
  const visible = JSON.parse(JSON.stringify(state)) as MatchState;
  if (seat !== null) {
    for (const owner of [0, 1] as const) {
      if (owner === seat) continue;
      // Keep counts and object identity for layout, while withholding concealed card identities.
      for (const instance of visible.zones[owner].hand) visible.cards[instance]!.card = 'HIDDEN';
      for (const instance of visible.zones[owner].deck) visible.cards[instance]!.card = 'HIDDEN';
    }
  }
  return {
    seq: visible.seq, turn: visible.turn, phase: visible.phase, active: visible.active,
    priority: visible.priority, decisionSeat: visible.choice?.seat ?? visible.priority,
    choice: visible.choice, cards: visible.cards, zones: visible.zones, field: visible.field, log: JSON.parse(JSON.stringify(log)) as RuleEvent[],
    stackCards: visible.stackCards, stack: visible.stack, commanders: visible.commanders,
    passes: visible.passes, result: visible.result, versions: visible.versions,
  };
}
