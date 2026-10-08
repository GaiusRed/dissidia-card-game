import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/rules/engine';
import { context, fixture } from '../support/harness';

describe('priority windows', () => {
  it('changes priority after one pass and advances Main 1 after both players pass', () => {
    let state = fixture({}).state;
    const first = applyCommand(state, { id: 'a', expectedSeq: 0, seat: 0, intent: { kind: 'pass' } }, context);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    state = first.state;
    expect(state.priority).toBe(1);
    expect(state.phase).toBe('main1');
    const second = applyCommand(state, { id: 'b', expectedSeq: 1, seat: 1, intent: { kind: 'pass' } }, context);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.state.phase).toBe('attack');
    expect(second.state.priority).toBe(0);
    expect(second.state.passes).toBe(0);
  });

  it('rejects a pass from the player without priority', () => {
    const state = fixture({ priority: 1 }).state;
    const before = JSON.stringify(state);
    const result = applyCommand(state, { id: 'wrong', expectedSeq: 0, seat: 0, intent: { kind: 'pass' } }, context);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('retains priority for a Summon caster until the response pass', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-015C', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 1, card: 'P-024C', zone: 'field' },
    ] });
    const source = h.object(0, 'P-015C');
    const cp = h.object(0, 'P-003C');
    const result = applyCommand(h.state, { id: 'summon-priority', expectedSeq: 0, seat: 0, intent: {
      kind: 'cast', source, targets: [h.object(1, 'P-024C')], mode: null,
      payment: { discard: [cp], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [cp]: 'Fire' }, spend: { Fire: 1 } },
    } }, context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.priority).toBe(0);
      expect(result.state.passes).toBe(0);
    }
  });

  it('rejects an attack declaration while a stack item is pending', () => {
    const h = fixture({ phase: 'attack', active: 0, priority: 0,
      placements: [{ seat: 0, card: 'P-005R', zone: 'field' }] });
    const source = h.state.cards[h.state.commanders[0].instance]!;
    h.state.stack.push({ id: 'pending-stack', controller: 1, source: source.object, lastKnown: { ...source },
      targets: [], mode: null, data: null,
      resume: { script: 'P-014R', version: '1', ability: 'cinder-witness-leave', step: 'resolve', payload: null } });
    const result = applyCommand(h.state, { id: 'attack-over-stack', expectedSeq: 0, seat: 0,
      intent: { kind: 'attack', members: [h.object(0, 'P-005R')] } }, context);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('WRONG_TIMING');
  });

  it('advances through both Main phases and starts the next turn after End Phase passes', () => {
    let state = fixture({ phase: 'main1' }).state;
    const step = (seat: 0 | 1) => {
      const reply = applyCommand(state, { id: `${state.seq}-${seat}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      expect(reply.ok).toBe(true);
      if (reply.ok) state = reply.state;
    };
    step(0); step(1); // Attack
    step(0); step(1); // Main 2
    step(0); step(1); // End
    step(0); step(1); // Next turn
    expect(state.turn).toBe(4);
    expect(state.active).toBe(1);
    expect(state.phase).toBe('main1');
  });
});
