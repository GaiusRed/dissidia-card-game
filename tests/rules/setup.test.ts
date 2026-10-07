import { describe, expect, it } from 'vitest';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { createMatch } from '../../src/rules/setup';
import { mvpFormat } from '../../src/rules/format';
import { context } from '../support/harness';
import { applyCommand } from '../../src/rules/engine';
import { createRegistry } from '../../src/content/registry';
import { opusPhRegisteredScripts } from '../../src/content/manifest';

const options = { seed: 42, decks: [cinderCompany, tidalAssembly] as [typeof cinderCompany, typeof tidalAssembly], format: mvpFormat };
function respond(state: import('../../src/rules/types').MatchState, selected: string[], seat = state.choice!.seat) {
  const transition = applyCommand(state, {
    id: `setup-${state.seq}`, expectedSeq: state.seq, seat,
    intent: { kind: 'answer', answer: { choice: state.choice!.id, selected, amounts: {} } },
  }, context);
  if (!transition.ok) throw new Error(transition.error.message);
  return transition.state;
}
describe('game setup', () => {
  it('starts setup with a registered continuation and resolves all mulligan steps through commands', () => {
    let state = createMatch(options, context);
    expect(state.execution.frames).toHaveLength(1);
    expect(state.choice?.resume).toMatchObject({ script: 'rules', ability: 'setup', step: 'starting-player' });
    const answer = (seat: 0 | 1, selected: string[]) => {
      const transition = applyCommand(state, {
        id: `setup-${state.seq}`, expectedSeq: state.seq, seat,
        intent: { kind: 'answer', answer: { choice: state.choice!.id, selected, amounts: {} } },
      }, context);
      expect(transition.ok).toBe(true);
      if (!transition.ok) throw new Error(transition.error.message);
      state = transition.state;
    };

    const chooser = state.choice!.seat;
    answer(chooser, ['first']);
    expect(state.zones[0].hand).toHaveLength(5);
    expect(state.zones[1].hand).toHaveLength(5);
    answer(state.choice!.seat, ['keep']);
    answer(state.choice!.seat, ['keep']);
    expect(state.phase).toBe('main1');
    expect(state.turn).toBe(1);
    expect(state.priority).toBe(chooser);
    expect(state.zones[chooser].hand).toHaveLength(6);
  });

  it('waits for the starting-player choice before drawing either opening hand', () => {
    const state = createMatch(options, context);
    expect(state.zones[0].hand).toHaveLength(0);
    expect(state.zones[1].hand).toHaveLength(0);
    expect(state.zones[0].deck).toHaveLength(19);
    expect(state.zones[1].deck).toHaveLength(19);
    const chooser = state.choice!.seat;
    const next = respond(state, ['first'], chooser);
    expect(next.zones[0].hand).toHaveLength(5);
    expect(next.zones[1].hand).toHaveLength(5);
    expect(next.zones[0].deck).toHaveLength(14);
    expect(next.zones[1].deck).toHaveLength(14);
    expect(next.zones[0].commander).toEqual([next.commanders[0].instance]);
    expect(next.zones[1].commander).toEqual([next.commanders[1].instance]);
    expect(next.choice?.kind).toBe('mulligan');
  });
  it('resumes the setup choice identically after JSON save and reload', () => {
    const state = createMatch(options, context);
    const restored = JSON.parse(JSON.stringify(state)) as typeof state;
    const selected = ['first'];
    expect(respond(state, selected)).toEqual(respond(restored, selected));
  });
  it('lets the randomly selected player choose who plays first', () => {
    const state = createMatch(options, context);
    const chooser = state.choice!.seat;
    expect(createMatch(options, context).choice?.seat).toBe(chooser);
    const next = respond(state, ['second'], chooser);
    expect(next.choice?.kind).toBe('mulligan');
    expect(next.choice?.seat).toBe(chooser === 0 ? 1 : 0);
  });
  it('draws one card for the first player after both opening hands are kept', () => {
    let state = createMatch(options, context);
    const chooser = state.choice!.seat;
    state = respond(state, ['first'], chooser);
    for (const seat of [chooser, chooser === 0 ? 1 : 0] as const) {
      state = respond(state, ['keep'], seat);
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
  it('includes behavior versions in the match catalog identity', () => {
    const versionOne = createRegistry(opusPhRegisteredScripts, 'opus-ph-test');
    const changedScripts = opusPhRegisteredScripts.map(script => script.metadata.number === 'P-005R'
      ? { ...script, behaviorVersion: '2' } : script);
    const versionTwo = createRegistry(changedScripts, 'opus-ph-test');
    const base = createMatch(options, { ...context, registry: versionOne });
    const changed = createMatch(options, { ...context, registry: versionTwo });
    expect(base.versions.catalog).not.toBe(changed.versions.catalog);
  });
  it('returns a mulligan hand to the bottom in its selected order, then draws five once', () => {
    let state = createMatch(options, context);
    const chooser = state.choice!.seat;
    state = respond(state, ['first'], chooser);
    const seat = state.choice!.seat;
    const original = [...state.zones[seat].hand];
    state = respond(state, ['redraw'], seat);
    expect(state.choice?.kind).toBe('order');
    const ids = original.map(instance => state.cards[instance]!.object);
    state = respond(state, [...ids].reverse(), seat);
    expect(state.zones[seat].hand).toHaveLength(5);
    expect(state.zones[seat].deck.slice(-5)).toEqual([...original].reverse());
  });
});
