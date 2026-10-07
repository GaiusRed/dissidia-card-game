import { describe, expect, it } from 'vitest';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { createMatch } from '../../src/rules/setup';
import { mvpFormat } from '../../src/rules/format';
import { context } from '../support/harness';
import { applyCommand } from '../../src/rules/engine';
import type { MatchState, Seat } from '../../src/rules/types';

function answer(state: MatchState, selected: string[], seat: Seat): MatchState {
  const result = applyCommand(state, { id: `setup-${state.seq}`, expectedSeq: state.seq, seat,
    intent: { kind: 'answer', answer: { choice: state.choice!.id, selected, amounts: {} } } }, context);
  if (!result.ok) throw new Error(result.error.message);
  return result.state;
}

describe('setup completion', () => {
  it('finishes both optional mulligan decisions in player order', () => {
    let state = createMatch({ seed: 42, decks: [cinderCompany, tidalAssembly], format: mvpFormat }, context);
    const chooser = state.choice!.seat;
    const firstSeat = chooser === 0 ? 1 : 0;
    state = answer(state, ['second'], chooser);
    const otherSeat: Seat = firstSeat === 0 ? 1 : 0;
    for (const seat of [firstSeat, otherSeat] as const) {
      expect(state.choice?.seat).toBe(seat);
      state = answer(state, ['keep'], seat);
    }
    expect(state.choice).toBeNull();
    expect(state.turn).toBe(1);
    expect(state.active).toBe(firstSeat);
    expect(state.phase).toBe('main1');
    expect(state.priority).toBe(firstSeat);
  });
});
