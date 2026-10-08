import type { Phase, Seat, Zone } from '../rules/types';

export interface Placement {
  seat: Seat;
  card: string;
  zone: Exclude<Zone, 'stack' | 'commander'>;
  dull?: boolean;
  frozen?: boolean;
  damage?: number;
  controlledSinceTurn?: number;
  attackedTurn?: number;
}
export interface Fixture {
  phase?: Exclude<Phase, 'setup' | 'active' | 'draw'>;
  active?: Seat;
  priority?: Seat;
  turn?: number;
  placements?: Placement[];
  commanderCasts?: Partial<Record<Seat, number>>;
  deckTop?: Partial<Record<Seat, string[]>>;
}
export interface ScenarioDefinition {
  id: string;
  /** Bump whenever the deterministic origin changes. */
  version: number;
  title: string;
  purpose: string;
  rules: string[];
  cards: string[];
  fixture: Fixture;
  expected: string[];
}
