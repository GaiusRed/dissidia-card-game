import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/rules/engine';
import { fixture, context } from '../support/harness';
import type { MatchState, Seat } from '../../src/rules/types';
import { addPower } from '../../src/rules/continuous';
import type { EngineContext } from '../../src/rules/types';
import { runEndCheckpoint } from '../../src/rules/priority';
import { runScheduler } from '../../src/rules/scheduler';
import { opusPhRegistry } from '../../src/content/manifest';

function send(state: MatchState, seat: Seat, engine: EngineContext = context): MatchState {
  const result = applyCommand(state, { id: `end-${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, engine);
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.state;
}

describe('End Phase checkpoints', () => {
  it('batches all simultaneous zero-power departures before exposing their triggers', () => {
    const h = fixture({ phase: 'end', active: 0, priority: 0, placements: [
      { seat: 0, card: 'P-014R', zone: 'field' },
      { seat: 0, card: 'P-003C', zone: 'field' }, { seat: 0, card: 'P-004C', zone: 'field' },
    ] });
    const contextWithZeroPower: EngineContext = { ...context, catalog: { ...context.catalog,
      'P-003C': { ...context.catalog['P-003C']!, power: 0 },
      'P-004C': { ...context.catalog['P-004C']!, power: 0 },
    } };
    runEndCheckpoint(h.state, contextWithZeroPower);
    expect(h.state.execution.batch?.operations).toHaveLength(2);
    const scheduled = runScheduler(h.state, contextWithZeroPower);
    expect(scheduled.error).toBeNull();
    const state = h.state;
    expect(state.cards[Object.values(state.cards).find(card => card.card === 'P-003C')!.instance]!.zone).toBe('break');
    expect(state.cards[Object.values(state.cards).find(card => card.card === 'P-004C')!.instance]!.zone).toBe('break');
    expect(state.choice).toBeNull();
    expect(state.stack.some(item => item.handler === 'cinder-witness-damage')).toBe(false);
  });

  it('lets the turn player order simultaneous Mist Caller and Rising Undertow triggers', () => {
    const engine = { ...context, registry: opusPhRegistry };
    const h = fixture({ phase: 'main2', active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-034R', zone: 'field' }, { seat: 1, card: 'P-023C', zone: 'field', dull: true },
      { seat: 1, card: 'P-040R', zone: 'break' },
    ] });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-040R')!;
    h.state.execution.delayed.push({ id: 'delayed-undertow', controller: 1, source: source.object, lastKnown: { ...source },
      createdTurn: h.state.turn, eligibleTurn: h.state.turn, at: 'controller-end',
      resume: { script: 'rules', version: '4', ability: 'delayed-discard', step: 'resolve', payload: { seat: 1 } } });
    let state = send(h.state, 1, engine);
    state = send(state, 0, engine);
    expect(state.phase).toBe('end');
    expect(state.choice?.kind).toBe('order');
    expect(state.choice?.seat).toBe(1);
    expect(state.choice?.options.map(option => option.label)).toEqual(expect.arrayContaining([
      expect.stringContaining('Rising Undertow'), expect.stringContaining('Mist Caller'),
    ]));
    const order = state.choice!.options.map(option => option.id);
    const answered = applyCommand(state, { id: `end-${state.seq}`, expectedSeq: state.seq, seat: 1,
      intent: { kind: 'answer', answer: { choice: state.choice!.id, selected: order, amounts: {} } } }, engine);
    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    expect(answered.state.choice?.kind).toBe('targets');
    const target = answered.state.choice!.options[0]!.id;
    const declared = applyCommand(answered.state, { id: `end-${answered.state.seq}`, expectedSeq: answered.state.seq, seat: 1,
      intent: { kind: 'answer', answer: { choice: answered.state.choice!.id, selected: [target], amounts: {} } } }, engine);
    expect(declared.ok).toBe(true);
    if (!declared.ok) return;
    expect(declared.state.stack.find(item => item.lastKnown.card === 'P-034R')?.resume)
      .toMatchObject({ script: 'P-034R', ability: 'mist-caller-end' });
    expect(declared.state.stack.map(item => item.handler)).toEqual(['delayed', 'mist-caller-activate']);
    expect(declared.state.priority).toBe(1);
    expect(declared.state.choice).toBeNull();
    const next = applyCommand(declared.state, { id: `end-${declared.state.seq}`, expectedSeq: declared.state.seq,
      seat: declared.state.priority!, intent: { kind: 'pass' } }, engine);
    expect(next.ok).toBe(true);
  });

  it('keeps Rising Undertow until its controller End Phase after reload and source departure', () => {
    const h = fixture({ phase: 'main1', active: 0, priority: 1, placements: [
      { seat: 1, card: 'P-040R', zone: 'hand' }, { seat: 1, card: 'P-022C', zone: 'hand' },
    ], deckTop: { 1: ['P-024C', 'P-025R'] } });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-040R')!;
    const discard = Object.values(h.state.cards).find(card => card.card === 'P-022C')!;
    const cast = applyCommand(h.state, { id: 'undertow-opponent-turn', expectedSeq: h.state.seq, seat: 1, intent: {
      kind: 'cast', source: source.object, targets: [], mode: null, payment: {
        discard: [discard.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [discard.object]: 'Water' }, spend: { Water: 2 },
      },
    } }, context);
    expect(cast.ok).toBe(true);
    if (!cast.ok) return;
    let state = cast.state;
    const passPair = () => {
      for (let index = 0; index < 2; index += 1) {
        const seat = state.priority;
        if (seat === null) throw new Error('A priority actor is required for this pass pair.');
        state = send(state, seat);
      }
    };
    passPair(); // Resolve Rising Undertow from the stack.
    for (let index = 0; index < 3; index += 1) passPair(); // Opponent Main 1, Attack, and Main 2.
    expect(state.phase).toBe('end');
    expect(state.active).toBe(0);
    expect(state.execution.delayed).toHaveLength(1);
    expect(state.execution.delayed[0]?.eligibleTurn).toBe(state.turn + 1);
    passPair(); // Finish the opponent End Phase.
    expect(state.active).toBe(1);
    expect(state.phase).toBe('main1');
    expect(state.stack.filter(item => item.resume?.ability === 'delayed-discard')).toHaveLength(0);
    state = JSON.parse(JSON.stringify(state)) as typeof state;
    for (let index = 0; index < 3; index += 1) passPair(); // Caster Main 1, Attack, and Main 2.
    expect(state.phase).toBe('end');
    expect(state.active).toBe(1);
    expect(state.stack.filter(item => item.resume?.ability === 'delayed-discard')).toHaveLength(1);
    passPair(); // Resolve the delayed ability.
    expect(state.choice?.seat).toBe(1);
    expect(state.choice?.reason).toContain('Rising Undertow');
    expect(state.choice?.options.map(option => option.label)).toEqual(expect.arrayContaining(['River Recruit', 'Frost Binder']));
    expect(state.stack.filter(item => item.resume?.ability === 'delayed-discard')).toHaveLength(0);
    const discarded = state.choice!.options[0]!;
    const discardedInstance = Object.values(state.cards).find(card => card.object === discarded.id)!.instance;
    const answered = applyCommand(state, { id: `undertow-discard-${state.seq}`, expectedSeq: state.seq, seat: 1,
      intent: { kind: 'answer', answer: { choice: state.choice!.id, selected: [discarded.id], amounts: {} } } }, context);
    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    expect(answered.state.cards[discardedInstance]?.zone).toBe('break');
    expect(answered.state.choice).toBeNull();
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
    expect((JSON.parse(JSON.stringify(state)) as typeof state).execution).toEqual(state.execution);
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

  it('routes chosen excess Backups through the departure batch pipeline', () => {
    const h = fixture({ phase: 'end', active: 0, priority: 0, placements: [
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-010C', zone: 'field' },
      { seat: 0, card: 'P-011R', zone: 'field' }, { seat: 0, card: 'P-012H', zone: 'field' },
      { seat: 0, card: 'P-013R', zone: 'field' }, { seat: 0, card: 'P-014R', zone: 'field' },
    ] });
    const before = runEndCheckpoint(h.state, context);
    expect(before).toEqual([]);
    expect(h.state.choice?.resume).toEqual({ handler: 'rule-checkpoint', step: 'excess-backups', data: { seat: 0 } });
    const choice = h.state.choice!;
    const selected = choice.options[0]!;
    const selectedCard = Object.values(h.state.cards).find(card => card.object === selected.id)!;
    const answered = applyCommand(h.state, { id: `end-${h.state.seq}`, expectedSeq: h.state.seq, seat: 0,
      intent: { kind: 'answer', answer: { choice: choice.id, selected: [selected.id], amounts: {} } } }, context);
    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    const moved = answered.state.cards[selectedCard.instance]!;
    expect(moved.zone).toBe('break');
    expect(answered.events.some(item => item.type === 'card.moved')).toBe(true);
    expect(answered.state.execution.batch).toBeNull();
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
