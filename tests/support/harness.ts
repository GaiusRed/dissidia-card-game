import { opusPh } from '../../src/content/opus-ph';
import { abilityHandlers } from '../../src/content/handlers';
import { buildFixture } from '../../src/scenarios/fixtures';
import type { EngineContext, MatchState, ObjectId, Seat } from '../../src/rules/types';
import type { Fixture, Placement } from '../../src/scenarios/types';

export type { Fixture, Placement };
export interface Harness {
  state: MatchState;
  object(seat: Seat, card: string): ObjectId;
}
export const context: EngineContext = { catalog: opusPh, handlers: abilityHandlers };

export function fixture(input: Fixture): Harness {
  const state = buildFixture(input, context);
  return {
    state,
    object(seat, number) {
      const found = Object.values(state.cards).find(item => item.owner === seat && item.card === number);
      if (!found) throw new Error(`No owned test card ${number} for seat ${seat}`);
      return found.object;
    },
  };
}
