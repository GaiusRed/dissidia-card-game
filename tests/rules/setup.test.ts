import { describe, expect, it } from 'vitest';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { answerChoice, createMatch } from '../../src/rules/setup';
import { mvpFormat } from '../../src/rules/format';
import { context } from '../support/harness';

const options = { seed: 42, decks: [cinderCompany, tidalAssembly] as [typeof cinderCompany, typeof tidalAssembly], format: mvpFormat };
describe('game setup', () => {
  it('waits for the starting-player choice before drawing either opening hand', () => {
    const state = createMatch(options, context);
    expect(state.zones[0].hand).toHaveLength(0);
    expect(state.zones[1].hand).toHaveLength(0);
    expect(state.zones[0].deck).toHaveLength(19);
    expect(state.zones[1].deck).toHaveLength(19);
    const chooser = state.choice!.seat;
    answerChoice(state, { choice: state.choice!.id, selected: ['first'], amounts: {} }, chooser, context);
    expect(state.zones[0].hand).toHaveLength(5);
    expect(state.zones[1].hand).toHaveLength(5);
    expect(state.zones[0].deck).toHaveLength(14);
    expect(state.zones[1].deck).toHaveLength(14);
    expect(state.zones[0].commander).toEqual([state.commanders[0].instance]);
    expect(state.zones[1].commander).toEqual([state.commanders[1].instance]);
    expect(state.choice?.kind).toBe('mulligan');
  });
  it('lets the randomly selected player choose who plays first', () => {
    const state = createMatch(options, context);
    const chooser = state.choice!.seat;
    expect(createMatch(options, context).choice?.seat).toBe(chooser);
    answerChoice(state, { choice: state.choice!.id, selected: ['second'], amounts: {} }, chooser, context);
    expect(state.choice?.kind).toBe('mulligan');
    expect(state.choice?.seat).toBe(chooser === 0 ? 1 : 0);
  });
  it('draws one card for the first player after both opening hands are kept', () => {
    const state = createMatch(options, context);
    const chooser = state.choice!.seat;
    answerChoice(state, { choice: state.choice!.id, selected: ['first'], amounts: {} }, chooser, context);
    for (const seat of [chooser, chooser === 0 ? 1 : 0] as const) {
      answerChoice(state, { choice: state.choice!.id, selected: ['keep'], amounts: {} }, seat, context);
    }
    expect(state.zones[chooser].hand).toHaveLength(6);
    expect(state.zones[chooser === 0 ? 1 : 0].hand).toHaveLength(5);
  });
  it('pins the complete supplied catalog content instead of one hard-coded card version', () => {
    const base = createMatch(options, context);
    const changedCatalog = { ...context.catalog, 'P-001L': { ...context.catalog['P-001L']!, text: 'changed content' } };
    const changed = createMatch(options, { ...context, catalog: changedCatalog });
    expect(base.versions.catalog).not.toBe(changed.versions.catalog);
    expect(base.versions.catalog).toMatch(/^catalog-[0-9a-f]{8}$/);
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
