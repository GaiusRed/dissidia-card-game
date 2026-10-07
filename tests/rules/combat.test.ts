import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/rules/engine';
import { context, fixture } from '../support/harness';
import { effectivePower } from '../../src/rules/continuous';

function send(state: ReturnType<typeof fixture>['state'], seat: 0 | 1, intent: { kind: 'attack'; members: string[] } | { kind: 'block'; blocker: string | null } | { kind: 'pass' }) {
  return applyCommand(state, { id: `c${state.seq}`, expectedSeq: state.seq, seat, intent: intent as never }, context);
}
describe('sequential combat', () => {
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
      expect(next.ok).toBe(true);
      if (!next.ok) return;
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
    const first = pass(1); expect(first.ok).toBe(true); if (!first.ok) return; state = first.state;
    const second = pass(0); expect(second.ok).toBe(true); if (!second.ok) return; state = second.state;
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
    for (const seat of [1, 0] as const) {
      const pass = applyCommand(state, { id: `a${state.seq}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      expect(pass.ok).toBe(true); if (!pass.ok) return; state = pass.state;
    }
    expect(state.stack).toHaveLength(0);
    expect(state.effects.some(effect => effect.handler === 'power-modifier' && effect.data !== null)).toBe(true);
    expect(effectivePower(state, target.object, context)).toBe(4000);
  });
});
