import { describe, expect, it } from 'vitest';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { answerChoice, createMatch } from '../../src/rules/setup';
import { mvpFormat } from '../../src/rules/format';
import { context } from '../support/harness';

describe('setup completion', () => {
  it('finishes both optional mulligan decisions in player order', () => {
    const state = createMatch({ seed: 42, decks: [cinderCompany, tidalAssembly], format: mvpFormat }, context);
    const chooser = state.choice!.seat;
    const firstSeat = chooser === 0 ? 1 : 0;
    answerChoice(state, { choice: state.choice!.id, selected: ['second'], amounts: {} }, chooser, context);
    for (const seat of [firstSeat, 1 - firstSeat] as const) {
      expect(state.choice?.seat).toBe(seat);
      answerChoice(state, { choice: state.choice!.id, selected: ['keep'], amounts: {} }, seat, context);
    }
    expect(state.choice).toBeNull();
    expect(state.turn).toBe(1);
    expect(state.active).toBe(firstSeat);
    expect(state.phase).toBe('main1');
    expect(state.priority).toBe(firstSeat);
  });
});
