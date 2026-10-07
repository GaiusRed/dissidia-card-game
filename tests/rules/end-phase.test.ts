import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/rules/engine';
import { fixture, context } from '../support/harness';
import type { MatchState, Seat } from '../../src/rules/types';
import { addPower } from '../../src/rules/continuous';

function send(state: MatchState, seat: Seat): MatchState {
  const result = applyCommand(state, { id: `end-${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.state;
}

describe('End Phase checkpoints', () => {
  it('lets the turn player order simultaneous Mist Caller and Rising Undertow triggers', () => {
    const h = fixture({ phase: 'main2', active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-034R', zone: 'field' }, { seat: 1, card: 'P-040R', zone: 'break' },
    ] });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-040R')!;
    h.state.effects.push({ id: 'delayed-undertow', timestamp: 1, controller: 1, source: source.object,
      handler: 'undertow-discard', data: { seat: 1, instance: source.instance }, expiresTurn: h.state.turn });
    let state = send(h.state, 1);
    state = send(state, 0);
    expect(state.phase).toBe('end');
    expect(state.choice?.kind).toBe('order');
    expect(state.choice?.seat).toBe(1);
    expect(state.choice?.options.map(option => option.label)).toEqual(expect.arrayContaining([
      expect.stringContaining('Rising Undertow'), expect.stringContaining('Mist Caller'),
    ]));
    const order = state.choice!.options.map(option => option.id);
    const answered = applyCommand(state, { id: `end-${state.seq}`, expectedSeq: state.seq, seat: 1,
      intent: { kind: 'answer', answer: { choice: state.choice!.id, selected: order, amounts: {} } } }, context);
    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    expect(answered.state.stack.map(item => item.handler)).toEqual(['rising-undertow-end-discard', 'mist-caller-activate']);
    expect(answered.state.priority).toBe(1);
    expect(answered.state.choice).toBeNull();
    const next = applyCommand(answered.state, { id: `end-${answered.state.seq}`, expectedSeq: answered.state.seq,
      seat: answered.state.priority!, intent: { kind: 'pass' } }, context);
    expect(next.ok).toBe(true);
  });

  it('requires hand-limit discard, clears marked damage and turn effects, then advances', () => {
    const h = fixture({ phase: 'end', active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-029C', zone: 'hand' }, { seat: 1, card: 'P-030C', zone: 'hand' },
      { seat: 1, card: 'P-031R', zone: 'hand' }, { seat: 1, card: 'P-032R', zone: 'hand' },
      { seat: 1, card: 'P-033R', zone: 'hand' }, { seat: 1, card: 'P-035C', zone: 'hand' },
      { seat: 1, card: 'P-023C', zone: 'field', damage: 2000 },
    ] });
    const forward = Object.values(h.state.cards).find(card => card.card === 'P-023C')!;
    addPower(h.state, 'temporary-source', forward.object, 1000, h.state.turn);
    const initialTurn = h.state.turn;
    let state = send(h.state, 1);
    state = send(state, 0);
    expect(state.choice?.seat).toBe(1);
    expect(state.choice?.reason).toContain('discard 1 card');
    const selected = state.choice!.options[0]!.id;
    const answered = applyCommand(state, { id: `end-${state.seq}`, expectedSeq: state.seq, seat: 1,
      intent: { kind: 'answer', answer: { choice: state.choice!.id, selected: [selected], amounts: {} } } }, context);
    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    expect(answered.state.zones[1].hand).toHaveLength(5);
    expect(answered.state.cards[forward.instance]!.damage).toBe(0);
    expect(answered.state.effects).toHaveLength(0);
    expect(answered.state.phase).toBe('main1');
    expect(answered.state.active).toBe(0);
    expect(answered.state.turn).toBe(initialTurn + 1);
  });

  it('rejects Summons and action abilities during the End Phase', () => {
    const h = fixture({ phase: 'end', active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-035C', zone: 'hand' }, { seat: 1, card: 'P-032R', zone: 'field' },
      { seat: 1, card: 'P-023C', zone: 'field' }, { seat: 0, card: 'P-003C', zone: 'field' },
      { seat: 1, card: 'P-024C', zone: 'break' },
    ] });
    const summon = Object.values(h.state.cards).find(card => card.card === 'P-035C')!;
    const recovery = Object.values(h.state.cards).find(card => card.card === 'P-032R')!;
    const target = Object.values(h.state.cards).find(card => card.card === 'P-003C')!;
    const payment = { discard: [], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false, sourceElements: {}, spend: {} };
    const cast = applyCommand(h.state, { id: 'end-summon', expectedSeq: h.state.seq, seat: 1, intent: {
      kind: 'cast', source: summon.object, targets: [target.object], mode: null, payment,
    } }, context);
    expect(cast.ok).toBe(false);
    if (!cast.ok) expect(cast.error.code).toBe('WRONG_TIMING');
    const activate = applyCommand(h.state, { id: 'end-action', expectedSeq: h.state.seq, seat: 1, intent: {
      kind: 'activate', source: recovery.object, ability: 'recovery-clerk-bottom', targets: [Object.values(h.state.cards).find(card => card.card === 'P-024C')!.object], payment,
    } }, context);
    expect(activate.ok).toBe(false);
    if (!activate.ok) expect(activate.error.code).toBe('WRONG_TIMING');
  });
});
