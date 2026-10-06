import { describe, expect, it } from 'vitest';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { answerChoice, createMatch } from '../../src/rules/setup';
import { mvpFormat } from '../../src/rules/format';
import { context } from '../support/harness';

const options = { seed: 42, decks: [cinderCompany, tidalAssembly] as [typeof cinderCompany, typeof tidalAssembly], format: mvpFormat };
describe('game setup', () => {
  it('draws five for each seat and keeps the Commander outside each main deck', () => {
    const state = createMatch(options, context);
    expect(state.zones[0].hand).toHaveLength(5);
    expect(state.zones[1].hand).toHaveLength(5);
    expect(state.zones[0].deck).toHaveLength(14);
    expect(state.zones[1].deck).toHaveLength(14);
    expect(state.zones[0].commander).toEqual([state.commanders[0].instance]);
    expect(state.zones[1].commander).toEqual([state.commanders[1].instance]);
    expect(state.choice?.kind).toBe('starting-player');
  });
  it('lets the randomly selected player choose who plays first', () => {
    const state = createMatch(options, context);
    const chooser = state.choice!.seat;
    expect(createMatch(options, context).choice?.seat).toBe(chooser);
    answerChoice(state, { choice: state.choice!.id, selected: ['second'], amounts: {} }, chooser, context);
    expect(state.choice?.kind).toBe('mulligan');
    expect(state.choice?.seat).toBe(chooser === 0 ? 1 : 0);
  });
  it('returns a mulligan hand to the bottom in its selected order, then draws five once', () => {
    const state = createMatch(options, context);
    const chooser = state.choice!.seat;
    answerChoice(state, { choice: state.choice!.id, selected: ['first'], amounts: {} }, chooser, context);
    const seat = state.choice!.seat;
    const original = [...state.zones[seat].hand];
    answerChoice(state, { choice: state.choice!.id, selected: ['redraw'], amounts: {} }, seat, context);
    expect(state.choice?.kind).toBe('order');
    const ids = original.map(instance => state.cards[instance]!.object);
    answerChoice(state, { choice: state.choice!.id, selected: [...ids].reverse(), amounts: {} }, seat, context);
    expect(state.zones[seat].hand).toHaveLength(5);
    expect(state.zones[seat].deck.slice(-5)).toEqual([...original].reverse());
  });
});
