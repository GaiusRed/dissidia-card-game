import { describe, expect, it } from 'vitest';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { answerChoice, createMatch } from '../../src/rules/setup';
import { mvpFormat } from '../../src/rules/format';
import { context } from '../support/harness';
import { advanceTurnStep } from '../../src/rules/turns';

describe('Active and Draw Phases', () => {
  it('activates owned dull cards except Frozen cards, then draws only one on the first turn', () => {
    const state = createMatch({ seed: 42, decks: [cinderCompany, tidalAssembly], format: mvpFormat }, context);
    const chooser = state.choice!.seat;
    const first = chooser;
    answerChoice(state, { choice: state.choice!.id, selected: ['first'], amounts: {} }, chooser, context);
    for (const seat of [first, 1 - first] as const) {
      answerChoice(state, { choice: state.choice!.id, selected: ['keep'], amounts: {} }, seat, context);
    }
    expect(state.phase).toBe('main1');
    expect(state.priority).toBe(first);
    expect(state.zones[first].hand).toHaveLength(6);
    expect(state.zones[first === 0 ? 1 : 0].hand).toHaveLength(5);
  });

  it('respects Freeze once in the next Active Phase and clears that marker afterward', () => {
    const state = createMatch({ seed: 42, decks: [cinderCompany, tidalAssembly], format: mvpFormat }, context);
    const commander = state.commanders[0].instance;
    state.zones[0].commander.splice(0, 1);
    state.cards[commander]!.zone = 'field';
    state.cards[commander]!.dull = true;
    state.cards[commander]!.frozen = true;
    state.field.push(commander);
    state.active = 0;
    state.phase = 'active';
    advanceTurnStep(state, context);
    expect(state.cards[commander]!.dull).toBe(true);
    expect(state.cards[commander]!.frozen).toBe(false);
  });
});
