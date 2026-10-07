import type { ActionOffer, CardObject, CastAccess, Choice, Command, MatchState, RuleEvent, Seat, Transition } from '../rules/types';
import type { CardNumber, Keyword, Zone } from '../rules/types';

export interface VisibleCard {
  object: string;
  card: CardNumber;
  owner: Seat;
  controller: Seat;
  dull: boolean;
  damage: number;
  power: number | null;
  keywords: Keyword[];
}
export interface TrayCard { instance: string; card: VisibleCard; sourceZone: Zone; cast: CastAccess | null }

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
  cardTray: { hand: TrayCard[]; otherZones: TrayCard[] };
  log: RuleEvent[];
}
export interface CommandReply extends Extract<Transition, { ok: true }> { events: RuleEvent[] }
export type SubmitCommand = (command: Command) => Promise<Transition>;
export interface CommandTransport { submit(command: Command): Promise<Transition> }
