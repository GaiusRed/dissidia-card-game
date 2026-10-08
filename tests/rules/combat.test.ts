import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/rules/engine';
import { context, fixture } from '../support/harness';
import { effectivePower } from '../../src/rules/continuous';
import { resolveCombat } from '../../src/rules/combat';
import { changeControl } from '../../src/rules/continuous';
import type { EngineContext } from '../../src/rules/types';

function send(state: ReturnType<typeof fixture>['state'], seat: 0 | 1, intent: { kind: 'attack'; members: string[] } | { kind: 'block'; blocker: string | null } | { kind: 'pass' }) {
  return applyCommand(state, { id: `c${state.seq}`, expectedSeq: state.seq, seat, intent: intent as never }, context);
}
function pendingPartyAllocation() {
  let state = fixture({ phase: 'attack', placements: [
    { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 2 },
    { seat: 0, card: 'P-006R', zone: 'field', controlledSinceTurn: 2 },
    { seat: 1, card: 'P-023C', zone: 'field', controlledSinceTurn: 1 },
  ] }).state;
  const first = Object.values(state.cards).find(card => card.card === 'P-005R')!;
  const second = Object.values(state.cards).find(card => card.card === 'P-006R')!;
  const blocker = Object.values(state.cards).find(card => card.card === 'P-023C')!;
  for (const [seat, intent] of [
    [0, { kind: 'attack', members: [first.object, second.object] }], [0, { kind: 'pass' }], [1, { kind: 'pass' }],
    [1, { kind: 'block', blocker: blocker.object }], [0, { kind: 'pass' }], [1, { kind: 'pass' }],
  ] as const) {
    const next = send(state, seat, intent as never);
    if (!next.ok) throw new Error(`${next.error.code}: ${next.error.message}`);
    state = next.state;
  }
  if (state.choice?.kind !== 'allocation') throw new Error('Party combat should request an allocation.');
  return { state, first, second, blocker };
}
describe('sequential combat', () => {
  it('applies Dawn Guardian damage replacement to combat damage', () => {
    let state = fixture({ phase: 'attack', active: 1, placements: [
      { seat: 1, card: 'P-028H', zone: 'field', controlledSinceTurn: 2 },
      { seat: 0, card: 'P-008H', zone: 'field' },
    ] }).state;
    const attacker = Object.values(state.cards).find(card => card.card === 'P-028H')!;
    const guardian = Object.values(state.cards).find(card => card.card === 'P-008H')!;
    const attack = send(state, 1, { kind: 'attack', members: [attacker.object] });
    expect(attack.ok).toBe(true);
    if (!attack.ok) return;
    state = attack.state;
    for (const seat of [1, 0] as const) {
      const passed = send(state, seat, { kind: 'pass' });
      expect(passed.ok).toBe(true);
      if (!passed.ok) return;
      state = passed.state;
    }
    const block = send(state, 0, { kind: 'block', blocker: guardian.object });
    expect(block.ok).toBe(true);
    if (!block.ok) return;
    state = block.state;
    for (const seat of [1, 0] as const) {
      const passed = send(state, seat, { kind: 'pass' });
      expect(passed.ok).toBe(true);
      if (!passed.ok) return;
      state = passed.state;
    }
    expect(state.cards[guardian.instance]!.damage).toBe(6000);
    expect(state.cards[attacker.instance]!.zone).toBe('break');
  });

  it('completes an unblocked attack in one damage window without extra pass windows', () => {
    let state = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 3 },
    ] }).state;
    const attacker = Object.values(state.cards).find(card => card.card === 'P-005R')!;
    const attack = send(state, 0, { kind: 'attack', members: [attacker.object] });
    expect(attack.ok).toBe(true);
    if (!attack.ok) return;
    state = attack.state;
    expect(state.combat?.step).toBe('prepare');
    expect(state.priority).toBe(0);

    const activePass = send(state, 0, { kind: 'pass' });
    expect(activePass.ok).toBe(true);
    if (!activePass.ok) return;
    state = activePass.state;
    expect(state.priority).toBe(1);
    const defenderPass = send(state, 1, { kind: 'pass' });
    expect(defenderPass.ok).toBe(true);
    if (!defenderPass.ok) return;
    state = defenderPass.state;
    expect(state.combat?.step).toBe('block');
    expect(state.priority).toBe(1);

    const noBlock = send(state, 1, { kind: 'block', blocker: null });
    expect(noBlock.ok).toBe(true);
    if (!noBlock.ok) return;
    state = noBlock.state;
    expect(state.combat?.step).toBe('damage');
    expect(state.priority).toBe(0);

    const damagePass = send(state, 0, { kind: 'pass' });
    expect(damagePass.ok).toBe(true);
    if (!damagePass.ok) return;
    const resolve = send(damagePass.state, 1, { kind: 'pass' });
    expect(resolve.ok).toBe(true);
    if (!resolve.ok) return;
    expect(resolve.state.zones[1].damage).toHaveLength(1);
    expect(resolve.state.combat).toBeNull();
    expect(resolve.state.phase).toBe('attack');
    expect(resolve.state.priority).toBe(0);
    expect(resolve.state.passes).toBe(0);
  });

  it('does not grant First Strike to a mixed party', () => {
    const h = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-006R', zone: 'field', controlledSinceTurn: 2 },
      { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 2 },
    ] });
    const first = Object.values(h.state.cards).find(card => card.card === 'P-006R')!;
    const second = Object.values(h.state.cards).find(card => card.card === 'P-005R')!;
    const attack = applyCommand(h.state, { id: 'mixed-first-strike-party', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'attack', members: [first.object, second.object],
    } }, context);
    expect(attack.ok).toBe(true);
    if (!attack.ok) return;
    expect(attack.state.combat?.partyFirstStrike).toBe(false);
    expect(attack.state.cards[first.instance]?.dull).toBe(true);
    expect(attack.state.cards[second.instance]?.dull).toBe(true);
  });

  it('rejects a party whose Forwards do not share an element', () => {
    const h = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 2 },
      { seat: 1, card: 'P-023C', zone: 'field', controlledSinceTurn: 2 },
    ] });
    const fire = Object.values(h.state.cards).find(card => card.card === 'P-005R')!;
    const water = Object.values(h.state.cards).find(card => card.card === 'P-023C')!;
    water.controller = 0;
    const result = send(h.state, 0, { kind: 'attack', members: [fire.object, water.object] });
    expect(result).toMatchObject({ ok: false, error: { code: 'MIXED_PARTY_ELEMENTS' } });
  });

  it('gives an all-First-Strike party a separate damage stage before normal damage', () => {
    const h = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-006R', zone: 'field', controlledSinceTurn: 2 },
      { seat: 1, card: 'P-026R', zone: 'field', controlledSinceTurn: 2 },
      { seat: 1, card: 'P-023C', zone: 'field', controlledSinceTurn: 1 },
    ] });
    const first = Object.values(h.state.cards).find(card => card.card === 'P-006R')!;
    const second = Object.values(h.state.cards).find(card => card.card === 'P-026R')!;
    second.controller = 0;
    const blocker = Object.values(h.state.cards).find(card => card.card === 'P-023C')!;
    const contextWithParty: EngineContext = { ...context, catalog: { ...context.catalog,
      'P-026R': { ...context.catalog['P-026R']!, elements: ['Fire'] } } };
    h.state.combat = { step: 'damage', participants: [{ ...first }, { ...second }, { ...blocker }],
      attackers: [first.object, second.object], blocker: blocker.object,
      wasBlocked: true, partyFirstStrike: true, allocation: { [first.object]: 3000 } };
    resolveCombat(h.state, contextWithParty);
    expect(h.state.combat?.step).toBe('normalDamage');
    expect(h.state.cards[blocker.instance]!.damage).toBe(12000);
    expect(h.state.cards[first.instance]!.damage).toBe(0);
    expect(h.state.cards[second.instance]!.damage).toBe(0);
    resolveCombat(h.state, contextWithParty);
    expect(h.state.combat).toBeNull();
    expect(h.state.cards[first.instance]!.damage).toBe(3000);
    expect(h.state.cards[second.instance]!.damage).toBe(0);
    expect(h.state.cards[blocker.instance]!.damage).toBe(12000);
  });

  it('limits a Brave Forward to one attack in the current turn', () => {
    const h = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-001L', zone: 'field', controlledSinceTurn: 2 },
    ] });
    const attacker = Object.values(h.state.cards).find(card => card.card === 'P-001L')!;
    const first = send(h.state, 0, { kind: 'attack', members: [attacker.object] });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    first.state.combat = null;
    first.state.priority = 0;
    const second = send(first.state, 0, { kind: 'attack', members: [attacker.object] });
    expect(second).toMatchObject({ ok: false, error: { code: 'UNREADY_ATTACKER' } });
  });

  it('runs a First Strike checkpoint before ordinary combat damage', () => {
    let state = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-006R', zone: 'field', controlledSinceTurn: 2 },
      { seat: 0, card: 'P-019H', zone: 'hand' },
      { seat: 1, card: 'P-023C', zone: 'field', controlledSinceTurn: 1 },
    ] }).state;
    const attacker = Object.values(state.cards).find(card => card.card === 'P-006R')!;
    const blocker = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    for (const [seat, intent] of [
      [0, { kind: 'attack', members: [attacker.object] }], [0, { kind: 'pass' }], [1, { kind: 'pass' }],
      [1, { kind: 'block', blocker: blocker.object }], [0, { kind: 'pass' }], [1, { kind: 'pass' }],
    ] as const) {
      const next = send(state, seat, intent as never);
      if (!next.ok) throw new Error(`${next.error.code}: ${next.error.message}`);
      state = next.state;
    }
    expect(state.combat?.step).toBe('normalDamage');
    expect(state.cards[blocker.instance]!.zone).toBe('break');
    expect(state.cards[attacker.instance]!.damage).toBe(0);
    expect(state.priority).toBe(0);
    const summon = Object.values(state.cards).find(card => card.card === 'P-019H')!;
    const forbidden = applyCommand(state, { id: 'during-first-strike-checkpoint', expectedSeq: state.seq, seat: 0, intent: {
      kind: 'cast', source: summon.object, targets: [], mode: null,
      payment: { discard: [], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false, sourceElements: {}, spend: {} },
    } }, context);
    expect(forbidden).toMatchObject({ ok: false, error: { code: 'WRONG_TIMING' } });
    for (const seat of [0, 1] as const) {
      const next = send(state, seat, { kind: 'pass' });
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      state = next.state;
    }
    expect(state.combat).toBeNull();
    expect(state.zones[1].damage).toHaveLength(0);
  });

  it('lets a First Strike blocker damage a normal attacker before the normal damage stage', () => {
    let state = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-001L', zone: 'field', controlledSinceTurn: 2 },
      { seat: 1, card: 'P-026R', zone: 'field', controlledSinceTurn: 2 },
    ] }).state;
    const attacker = Object.values(state.cards).find(card => card.card === 'P-001L')!;
    const blocker = Object.values(state.cards).find(card => card.card === 'P-026R')!;
    for (const [seat, intent] of [
      [0, { kind: 'attack', members: [attacker.object] }], [0, { kind: 'pass' }], [1, { kind: 'pass' }],
      [1, { kind: 'block', blocker: blocker.object }], [0, { kind: 'pass' }], [1, { kind: 'pass' }],
    ] as const) {
      const next = send(state, seat, intent as never);
      if (!next.ok) throw new Error(`${next.error.code}: ${next.error.message}`);
      state = next.state;
    }
    expect(state.combat?.step).toBe('normalDamage');
    expect(state.cards[attacker.instance]!.damage).toBe(6000);
    expect(state.cards[blocker.instance]!.damage).toBe(0);
    for (const seat of [0, 1] as const) {
      const next = send(state, seat, { kind: 'pass' });
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      state = next.state;
    }
    expect(state.cards[attacker.instance]!.damage).toBe(6000);
    expect(state.cards[blocker.instance]!.zone).toBe('break');
    expect(state.combat).toBeNull();
  });

  it('deals only one player damage for an unblocked party and keeps Brave active', () => {
    let state = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-001L', zone: 'field', controlledSinceTurn: 2 },
      { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 2 },
    ] }).state;
    const brave = Object.values(state.cards).find(card => card.card === 'P-001L')!;
    const forward = Object.values(state.cards).find(card => card.card === 'P-005R')!;
    for (const [seat, intent] of [
      [0, { kind: 'attack', members: [brave.object, forward.object] }], [0, { kind: 'pass' }], [1, { kind: 'pass' }],
      [1, { kind: 'block', blocker: null }], [0, { kind: 'pass' }], [1, { kind: 'pass' }],
    ] as const) {
      const next = send(state, seat, intent as never);
      if (!next.ok) throw new Error(`${next.error.code}: ${next.error.message}`);
      state = next.state;
    }
    expect(state.zones[1].damage).toHaveLength(1);
    expect(state.cards[brave.instance]!.dull).toBe(false);
    expect(state.cards[forward.instance]!.dull).toBe(true);
    expect(state.combat).toBeNull();
  });

  it('allows a frozen but otherwise active Forward to block', () => {
    const h = fixture({ phase: 'attack', active: 0, priority: 1, placements: [
      { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 2 },
      { seat: 1, card: 'P-023C', zone: 'field', controlledSinceTurn: 2 },
    ] });
    const attacker = Object.values(h.state.cards).find(card => card.card === 'P-005R')!;
    const blocker = Object.values(h.state.cards).find(card => card.card === 'P-023C')!;
    blocker.frozen = true;
    h.state.combat = { step: 'block', participants: [{ ...attacker }], attackers: [attacker.object],
      blocker: null, wasBlocked: false, partyFirstStrike: false, allocation: {} };
    const declared = send(h.state, 1, { kind: 'block', blocker: blocker.object });
    expect(declared.ok).toBe(true);
    if (!declared.ok) return;
    expect(declared.state.combat?.blocker).toBe(blocker.object);
    expect(declared.state.cards[blocker.instance]!.dull).toBe(false);
    expect(declared.state.cards[blocker.instance]!.frozen).toBe(true);
  });

  it('holds First Strike departure triggers until normal combat damage finishes', () => {
    let state = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-014R', zone: 'field', controlledSinceTurn: 1 },
      { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 2 },
      { seat: 1, card: 'P-026R', zone: 'field', controlledSinceTurn: 1 },
    ] }).state;
    const attacker = Object.values(state.cards).find(card => card.card === 'P-005R')!;
    const blocker = Object.values(state.cards).find(card => card.card === 'P-026R')!;
    const send = (seat: 0 | 1, intent: { kind: 'attack'; members: string[] } | { kind: 'block'; blocker: string | null } | { kind: 'pass' }) =>
      applyCommand(state, { id: `first-strike-trigger-${state.seq}`, expectedSeq: state.seq, seat,
        intent: intent as never }, context);

    for (const [seat, intent] of [
      [0, { kind: 'attack', members: [attacker.object] }], [0, { kind: 'pass' }], [1, { kind: 'pass' }],
      [1, { kind: 'block', blocker: blocker.object }], [0, { kind: 'pass' }], [1, { kind: 'pass' }],
    ] as const) {
      const next = send(seat, intent as never);
      if (!next.ok) throw new Error(`${next.error.code}: ${next.error.message}`);
      state = next.state;
    }

    expect(state.combat?.step).toBe('normalDamage');
    expect(state.cards[attacker.instance]!.zone).toBe('break');
    expect(state.choice).toBeNull();
    expect(state.stack.some(item => item.resume.ability === 'cinder-witness-leave')).toBe(false);
    expect(state.triggers.length).toBeGreaterThan(0);
    state = JSON.parse(JSON.stringify(state)) as typeof state;

    for (const seat of [0, 1] as const) {
      const next = send(seat, { kind: 'pass' });
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      state = next.state;
    }
    expect(state.combat).toBeNull();
    expect(state.cards[blocker.instance]!.damage).toBe(0);
    expect(state.choice?.resume).toMatchObject({ script: 'rules', ability: 'choice-trigger', step: 'target' });
    expect(state.stack.some(item => item.resume.ability === 'cinder-witness-leave')).toBe(true);
  });

  it('deals one damage from an unblocked Haste Forward and lets another attack continue', () => {
    let state = fixture({ phase: 'attack', placements: [{ seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 3 }] }).state;
    const attack = send(state, 0, { kind: 'attack', members: [Object.values(state.cards).find(c => c.card === 'P-005R')!.object] });
    expect(attack.ok).toBe(true);
    if (!attack.ok) return;
    state = attack.state;
    expect(state.priority).toBe(0);
    const pass1 = send(state, 0, { kind: 'pass' });
    expect(pass1.ok).toBe(true);
    if (!pass1.ok) return;
    const pass2 = send(pass1.state, 1, { kind: 'pass' });
    if (!pass2.ok) return;
    const decline = send(pass2.state, 1, { kind: 'block', blocker: null });
    if (!decline.ok) return;
    const damage1 = send(decline.state, 0, { kind: 'pass' });
    if (!damage1.ok) return;
    const damage2 = send(damage1.state, 1, { kind: 'pass' });
    if (!damage2.ok) throw new Error(`${damage2.error.code}: ${damage2.error.message}`);
    expect(damage2.state.zones[1].damage).toHaveLength(1);
    expect(damage2.state.phase).toBe('attack');
    expect(damage2.state.priority).toBe(0);
    expect(damage2.state.combat).toBeNull();
  });

  it('breaks a Forward when battle damage meets its power while preserving the survivor', () => {
    let state = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 3 },
      { seat: 1, card: 'P-023C', zone: 'field', controlledSinceTurn: 1 },
    ] }).state;
    const attacker = Object.values(state.cards).find(c => c.card === 'P-005R')!;
    const blocker = Object.values(state.cards).find(c => c.card === 'P-023C')!;
    const attack = send(state, 0, { kind: 'attack', members: [attacker.object] });
    if (!attack.ok) throw new Error('attack should be legal'); state = attack.state;
    const openBlockers = send(state, 0, { kind: 'pass' }); if (!openBlockers.ok) throw new Error('turn player pass should be legal'); state = openBlockers.state;
    const openBlockers2 = send(state, 1, { kind: 'pass' }); if (!openBlockers2.ok) throw new Error('defender pass should be legal'); state = openBlockers2.state;
    const block = send(state, 1, { kind: 'block', blocker: blocker.object });
    if (!block.ok) throw new Error('block should be legal'); state = block.state;
    const passes = send(state, 0, { kind: 'pass' });
    if (!passes.ok) throw new Error('pass should be legal'); state = passes.state;
    const resolve = send(state, 1, { kind: 'pass' });
    expect(resolve.ok).toBe(true);
    if (resolve.ok) {
      expect(resolve.state.cards[blocker.instance]!.zone).toBe('break');
      expect(resolve.state.cards[attacker.instance]!.zone).toBe('field');
      expect(resolve.state.cards[attacker.instance]!.damage).toBe(3000);
    }
  });

  it('removes attackers and blockers that change control before damage', () => {
    const unblocked = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 2 },
    ] });
    const attacker = Object.values(unblocked.state.cards).find(card => card.card === 'P-005R')!;
    unblocked.state.combat = { step: 'damage', participants: [{ ...attacker }], attackers: [attacker.object],
      blocker: null, wasBlocked: false, partyFirstStrike: false, allocation: {} };
    changeControl(unblocked.state, 'test-control', attacker.object, 1, unblocked.state.turn);
    resolveCombat(unblocked.state, context);
    expect(unblocked.state.zones[1].damage).toHaveLength(0);
    expect(unblocked.state.combat).toBeNull();

    const blocked = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 2 },
      { seat: 1, card: 'P-023C', zone: 'field', controlledSinceTurn: 1 },
    ] });
    const blockedAttacker = Object.values(blocked.state.cards).find(card => card.card === 'P-005R')!;
    const blocker = Object.values(blocked.state.cards).find(card => card.card === 'P-023C')!;
    blocked.state.combat = { step: 'damage', participants: [{ ...blockedAttacker }, { ...blocker }],
      attackers: [blockedAttacker.object], blocker: blocker.object, wasBlocked: true, partyFirstStrike: false, allocation: {} };
    changeControl(blocked.state, 'test-control', blocker.object, 0, blocked.state.turn);
    resolveCombat(blocked.state, context);
    expect(blocked.state.cards[blockedAttacker.instance]!.damage).toBe(0);
    expect(blocked.state.zones[1].damage).toHaveLength(0);
    expect(blocked.state.combat).toBeNull();
  });

  it('validates party damage allocations after save and reload', () => {
    let { state, first, second, blocker } = pendingPartyAllocation();
    const issue = (current: typeof state, seat: 0 | 1, intent: Parameters<typeof send>[2]) => applyCommand(current, {
      id: `allocation-${current.seq}`, expectedSeq: current.seq, seat, intent: intent as never,
    }, context);
    expect(state.choice?.kind).toBe('allocation');
    state = JSON.parse(JSON.stringify(state)) as typeof state;
    const pending = state.choice!;
    const invalid = [
      { [first.object]: 1000 },
      { [first.object]: 1500, [second.object]: 1500 },
      { [first.object]: -1000, [second.object]: 4000 },
      { [first.object]: 2000, [second.object]: 1000, unknown: 0 },
    ];
    const before = JSON.stringify(state);
    for (const [index, amounts] of invalid.entries()) {
      const rejected = issue(state, 1, { kind: 'answer', answer: { choice: pending.id, selected: [], amounts } } as never);
      expect(rejected.ok).toBe(false);
    }
    expect(JSON.stringify(state)).toBe(before);
    const accepted = issue(state, 1, { kind: 'answer', answer: { choice: pending.id, selected: [], amounts: { [first.object]: 1000, [second.object]: 2000 } } } as never);
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.state.cards[first.instance]!.damage).toBe(1000);
    expect(accepted.state.cards[second.instance]!.damage).toBe(2000);
    expect(accepted.state.cards[blocker.instance]!.zone).toBe('break');
    expect(accepted.state.combat).toBeNull();
  });
  it('accepts damage concentrated on either member of an attacking party', () => {
    for (const [assigned, unassigned] of [['first', 'second'], ['second', 'first']] as const) {
      const { state, first, second } = pendingPartyAllocation();
      const target = assigned === 'first' ? first : second;
      const other = unassigned === 'first' ? first : second;
      const result = applyCommand(state, { id: `focused-allocation-${state.seq}`, expectedSeq: state.seq, seat: 1,
        intent: { kind: 'answer', answer: { choice: state.choice!.id, selected: [], amounts: { [target.object]: 3000 } } } }, context);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.state.cards[target.instance]!.damage).toBe(3000);
      expect(result.state.cards[other.instance]!.damage).toBe(0);
      expect(result.state.cards[first.instance]!.zone).toBe('field');
      expect(result.state.cards[second.instance]!.zone).toBe('field');
      expect(result.state.cards[Object.values(result.state.cards).find(card => card.card === 'P-023C')!.instance]!.zone).toBe('break');
      expect(result.state.combat).toBeNull();
    }
  });
});

describe('Summon stack', () => {
  it('keeps Scorch on the stack until both players pass, then applies its target effect', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-015C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 1, card: 'P-023C', zone: 'field' },
    ] });
    let state = h.state;
    const scorch = Object.values(state.cards).find(card => card.card === 'P-015C')!;
    const backup = Object.values(state.cards).find(card => card.card === 'P-009C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    const cast = applyCommand(state, { id: 'summon', expectedSeq: 0, seat: 0, intent: { kind: 'cast', source: scorch.object, targets: [target.object], mode: null,
      payment: { discard: [], dullBackups: [backup.object], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [backup.object]: 'Fire' }, spend: { Fire: 1 } } } }, context);
    expect(cast.ok).toBe(true);
    if (!cast.ok) return;
    state = cast.state;
    expect(state.stack).toHaveLength(1);
    expect(state.cards[scorch.instance]!.zone).toBe('stack');
    const pass = (seat: 0 | 1) => applyCommand(state, { id: `s${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
    const first = pass(0); expect(first.ok).toBe(true); if (!first.ok) return; state = first.state;
    const second = pass(1); expect(second.ok).toBe(true); if (!second.ok) return; state = second.state;
    expect(state.stack).toHaveLength(0);
    expect(state.cards[target.instance]!.zone).toBe('break');
    expect(state.cards[scorch.instance]!.zone).toBe('break');
  });
});

describe('damage outcome acceptance', () => {
  it('ends a duel on the seventh point of damage from a Forward attack', () => {
    const h = fixture({ phase: 'attack', placements: [
      { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 3 },
      { seat: 1, card: 'P-022C', zone: 'damage' }, { seat: 1, card: 'P-023C', zone: 'damage' },
      { seat: 1, card: 'P-024C', zone: 'damage' }, { seat: 1, card: 'P-025R', zone: 'damage' },
      { seat: 1, card: 'P-026R', zone: 'damage' }, { seat: 1, card: 'P-027H', zone: 'damage' },
    ] });
    let state = h.state;
    const attacker = Object.values(state.cards).find(card => card.card === 'P-005R')!;
    const attack = send(state, 0, { kind: 'attack', members: [attacker.object] });
    if (!attack.ok) throw new Error('attack should be legal'); state = attack.state;
    const first = send(state, 0, { kind: 'pass' });
    if (!first.ok) throw new Error('pass should be legal'); state = first.state;
    const second = send(state, 1, { kind: 'pass' }); if (!second.ok) throw new Error('pass should be legal'); state = second.state;
    const decline = send(state, 1, { kind: 'block', blocker: null }); if (!decline.ok) throw new Error('no-block choice should be legal'); state = decline.state;
    const damagePass = send(state, 0, { kind: 'pass' }); if (!damagePass.ok) throw new Error('damage pass should be legal'); state = damagePass.state;
    const resolve = send(state, 1, { kind: 'pass' });
    if (!resolve.ok) throw new Error(`${resolve.error.code}: ${resolve.error.message}`);
    expect(resolve.state.result).toEqual({ winner: 0, reason: 'damage' });
  });
});

describe('activated ability stack', () => {
  it('pays a Backup activation once and resolves its temporary Forward effect after priority passes', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-010C', zone: 'field' }, { seat: 0, card: 'P-003C', zone: 'field' },
    ] });
    let state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-010C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const activation = applyCommand(state, { id: 'ability', expectedSeq: 0, seat: 0, intent: { kind: 'activate', source: source.object,
      ability: 'forge-apprentice-action', targets: [target.object], payment: { discard: [], dullBackups: [], specialDiscard: null,
        dullSource: true, sacrificeSource: false, sourceElements: {}, spend: {} } } }, context);
    expect(activation.ok).toBe(true);
    if (!activation.ok) return;
    state = activation.state;
    expect(state.stack).toHaveLength(1);
    expect(state.cards[source.instance]!.dull).toBe(true);
    for (const seat of [0, 1] as const) {
      const pass = applyCommand(state, { id: `a${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      expect(pass.ok).toBe(true); if (!pass.ok) return; state = pass.state;
    }
    expect(state.stack).toHaveLength(0);
    expect(state.effects.some(effect => effect.kind === 'power-modifier' && effect.amount > 0)).toBe(true);
    expect(effectivePower(state, target.object, context)).toBe(4000);
  });
});
