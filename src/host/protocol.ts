import type { ActionOffer, CardDefinition, CardObject, CastAccess, Choice, Command, MatchState, RuleEvent, Seat, Transition } from '../rules/types';
import type { CardNumber, Keyword, Zone } from '../rules/types';

export interface VisibleCard {
  object: string;
  card: CardNumber;
  owner: Seat;
  controller: Seat;
  zone: Zone;
  dull: boolean;
  frozen: boolean;
  damage: number;
  power: number | null;
  keywords: Keyword[];
  printed: CardDefinition;
  commander: boolean;
  commanderTax: number;
}
export interface TrayCard { instance: string; card: VisibleCard; sourceZone: Zone; cast: CastAccess | null }

export interface MatchView {
  generation: number;
  seq: number;
  turn: number;
  phase: MatchState['phase'];
  active: Seat;
  priority: Seat | null;
  decisionSeat: Seat | null;
  choice: Omit<Choice, 'resume'> | null;
  cards: Record<string, CardObject>;
  presentations: Record<string, VisibleCard>;
  zones: MatchState['zones'];
  deckCounts: Record<Seat, number>;
  field: string[];
  stackCards: string[];
  stack: MatchState['stack'];
  combat: MatchState['combat'];
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
export interface CommandRequest { generation: number; command: Command }
export interface CommandTransport { submit(request: CommandRequest): Promise<Transition> }
