import type { Command, MatchState, RuleEvent, Seat, Transition } from '../rules/types';

export interface MatchView {
  seq: number;
  turn: number;
  phase: MatchState['phase'];
  active: Seat;
  priority: Seat | null;
  decisionSeat: Seat | null;
  choice: MatchState['choice'];
  cards: MatchState['cards'];
  zones: MatchState['zones'];
  field: string[];
  stackCards: string[];
  stack: MatchState['stack'];
  commanders: MatchState['commanders'];
  passes: number;
  result: MatchState['result'];
  versions: MatchState['versions'];
  log: RuleEvent[];
}
export interface CommandReply extends Extract<Transition, { ok: true }> { events: RuleEvent[] }
export type SubmitCommand = (command: Command) => Transition;
