import type { ActionOffer, CardObject, CastAccess, Choice, Command, MatchState, RuleEvent, Seat, Transition } from '../rules/types';

export interface MatchView {
  seq: number;
  turn: number;
  phase: MatchState['phase'];
  active: Seat;
  priority: Seat | null;
  decisionSeat: Seat | null;
  choice: Omit<Choice, 'resume'> | null;
  cards: Record<string, CardObject>;
  zones: MatchState['zones'];
  deckCounts: Record<Seat, number>;
  field: string[];
  stackCards: string[];
  stack: MatchState['stack'];
  commanders: MatchState['commanders'];
  passes: number;
  result: MatchState['result'];
  versions: MatchState['versions'];
  castAccess: CastAccess[];
  actions: ActionOffer[];
  log: RuleEvent[];
}
export interface CommandReply extends Extract<Transition, { ok: true }> { events: RuleEvent[] }
export type SubmitCommand = (command: Command) => Transition;
