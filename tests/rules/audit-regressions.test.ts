import { describe, expect, it } from 'vitest';
import { driver } from '../support/driver';
import { addPower, effectivePower, setPower } from '../../src/rules/continuous';
import { legalActions } from '../../src/rules/actions';
import { context } from '../support/harness';
import { validatePayment } from '../../src/rules/payment';
import { moveCard } from '../../src/rules/zones';

describe('audit rule regressions', () => {
  it('F01: gives the turn player priority after an attack declaration', () => {
    const d = driver({ phase: 'attack', placements: [
      { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 1 },
    ] });
    expect(d.send({ kind: 'attack', members: [d.object(0, 'P-005R')] }).ok).toBe(true);
    expect(d.state.priority).toBe(0);
  });

  it('F04: Brave does not dull its attacker', () => {
    const d = driver({ phase: 'attack', placements: [
      { seat: 0, card: 'P-001L', zone: 'field', controlledSinceTurn: 1 },
    ] });
    expect(d.send({ kind: 'attack', members: [d.object(0, 'P-001L')] }).ok).toBe(true);
    const attacker = Object.values(d.state.cards).find(item => item.object === d.object(0, 'P-001L'))!;
    expect(attacker.dull).toBe(false);
  });

  it('F04: declaring a block does not dull the blocker', () => {
    const d = driver({ phase: 'attack', placements: [
      { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 1 },
      { seat: 1, card: 'P-023C', zone: 'field', controlledSinceTurn: 1 },
    ] });
    expect(d.send({ kind: 'attack', members: [d.object(0, 'P-005R')] }, 0).ok).toBe(true);
    expect(d.send({ kind: 'pass' }, 0).ok).toBe(true);
    expect(d.send({ kind: 'pass' }, 1).ok).toBe(true);
    const block = d.send({ kind: 'block', blocker: d.object(1, 'P-023C') }, 1);
    expect(block.ok).toBe(true);
    expect(Object.values(d.state.cards).find(item => item.object === d.object(1, 'P-023C'))!.dull).toBe(false);
  });

  it('F04: Freeze does not prevent a ready Forward from attacking', () => {
    const d = driver({ phase: 'attack', placements: [
      { seat: 0, card: 'P-005R', zone: 'field', controlledSinceTurn: 1 },
    ] });
    const attacker = Object.values(d.state.cards).find(item => item.object === d.object(0, 'P-005R'))!;
    attacker.frozen = true;
    expect(d.send({ kind: 'attack', members: [attacker.object] }).ok).toBe(true);
  });

  it('F09: a base-power change applies before a power modifier', () => {
    const d = driver({ placements: [{ seat: 0, card: 'P-003C', zone: 'field' }] });
    const target = d.object(0, 'P-003C');
    addPower(d.state, target, target, 3000, d.state.turn);
    setPower(d.state, target, target, 4000, d.state.turn);
    expect(effectivePower(d.state, target, context)).toBe(7000);
  });

  it('uses the Banner Smith module as the Fire Forward field-effect provider', () => {
    const d = driver({ placements: [
      { seat: 0, card: 'P-012H', zone: 'field' }, { seat: 0, card: 'P-003C', zone: 'field' },
      { seat: 1, card: 'P-023C', zone: 'field' },
    ] });
    expect(effectivePower(d.state, d.object(0, 'P-003C'), context)).toBe(4000);
    expect(effectivePower(d.state, d.object(1, 'P-023C'), context)).toBe(3000);
  });

  it('F10: Controlled Burn offers legal friendly Forward targets', () => {
    const d = driver({ placements: [
      { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-020H', zone: 'hand' },
      { seat: 0, card: 'P-005R', zone: 'hand' },
      { seat: 0, card: 'P-006R', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'field' },
      { seat: 1, card: 'P-023C', zone: 'field' },
    ] });
    const offer = legalActions(d.state, 0, context).find(action => action.source === d.object(0, 'P-020H'))!;
    expect(offer.targetOptions.map(option => option.id)).toContain(d.object(0, 'P-003C'));
    expect(offer.targetOptions.map(option => option.id)).toContain(d.object(1, 'P-023C'));
  });

  it('F08: a controlled Backup can pay CP while the opponent owns it', () => {
    const d = driver({ placements: [
      { seat: 0, card: 'P-005R', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' },
    ] });
    const source = d.object(0, 'P-005R');
    const backup = d.object(0, 'P-009C');
    const card = Object.values(d.state.cards).find(item => item.object === backup)!;
    card.owner = 1;
    expect(validatePayment(d.state, 0, source, {
      discard: [], dullBackups: [backup], specialDiscard: null, dullSource: false, sacrificeSource: false,
      sourceElements: { [backup]: 'Fire' }, spend: { Fire: 1 },
    }, 1, context)).toEqual([]);
  });

  it('F05: a Forward with zero effective power leaves at the next rule checkpoint', () => {
    const d = driver({ placements: [{ seat: 0, card: 'P-003C', zone: 'field' }] });
    const forward = d.object(0, 'P-003C');
    const instance = Object.values(d.state.cards).find(item => item.object === forward)!.instance;
    addPower(d.state, forward, forward, -3000, d.state.turn);
    d.passPair();
    expect(d.state.cards[instance]!.zone).toBe('break');
  });

  it('F05: duplicate non-Generic names leave together at a rule checkpoint', () => {
    const d = driver({ placements: [{ seat: 0, card: 'P-002C', zone: 'field' }] });
    const commander = d.state.cards[d.state.commanders[0].instance]!;
    moveCard(d.state, commander.instance, 'field');
    d.send({ kind: 'pass' }, 0);
    expect(d.state.choice?.resume.handler).toBe('departure');
    expect(d.answer(['destination']).ok).toBe(true);
    expect(d.state.cards[commander.instance]!.zone).toBe('break');
    expect(d.state.cards[Object.values(d.state.cards).find(item => item.owner === 0 && item.card === 'P-002C')!.instance]!.zone).toBe('break');
  });

  it('F05: controlling Light and Dark Characters breaks both at a rule checkpoint', () => {
    const d = driver({ placements: [
      { seat: 0, card: 'P-007H', zone: 'field' }, { seat: 0, card: 'P-008H', zone: 'field' },
    ] });
    d.passPair();
    expect(d.state.cards[Object.values(d.state.cards).find(item => item.owner === 0 && item.card === 'P-007H')!.instance]!.zone).toBe('break');
    expect(d.state.cards[Object.values(d.state.cards).find(item => item.owner === 0 && item.card === 'P-008H')!.instance]!.zone).toBe('break');
  });

  it('F05: six controlled Backups require the controller to choose one departure', () => {
    const d = driver({ placements: [
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-010C', zone: 'field' },
      { seat: 0, card: 'P-011R', zone: 'field' }, { seat: 0, card: 'P-012H', zone: 'field' },
      { seat: 0, card: 'P-013R', zone: 'field' }, { seat: 0, card: 'P-014R', zone: 'field' },
    ] });
    d.send({ kind: 'pass' }, 0);
    expect(d.state.choice?.seat).toBe(0);
    expect(d.state.choice?.min).toBe(1);
    const selected = d.state.choice!.options[0]!.id;
    expect(d.answer([selected]).ok).toBe(true);
    expect(d.state.field.map(instance => d.state.cards[instance]!).filter(card => card.controller === 0 && context.catalog[card.card]?.type === 'Backup')).toHaveLength(5);
  });

  it('F03: two ready Forwards with a shared element form one party attack', () => {
    const d = driver({ phase: 'attack', placements: [
      { seat: 0, card: 'P-003C', zone: 'field', controlledSinceTurn: 1 },
      { seat: 0, card: 'P-004C', zone: 'field', controlledSinceTurn: 1 },
    ] });
    expect(d.send({ kind: 'attack', members: [d.object(0, 'P-003C'), d.object(0, 'P-004C')] }).ok).toBe(true);
    expect(d.state.combat?.attackers).toEqual([d.object(0, 'P-003C'), d.object(0, 'P-004C')]);
  });

  it('F03: a mixed-element party is rejected', () => {
    const d = driver({ phase: 'attack', placements: [
      { seat: 0, card: 'P-003C', zone: 'field', controlledSinceTurn: 1 },
      { seat: 1, card: 'P-023C', zone: 'field', controlledSinceTurn: 1 },
    ] });
    Object.values(d.state.cards).find(card => card.object === d.object(1, 'P-023C'))!.controller = 0;
    const result = d.send({ kind: 'attack', members: [d.object(0, 'P-003C'), d.object(1, 'P-023C')] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MIXED_PARTY_ELEMENTS');
  });

  it('F03: a blocker assigns its battle damage among party members', () => {
    const d = driver({ phase: 'attack', placements: [
      { seat: 0, card: 'P-003C', zone: 'field', controlledSinceTurn: 1 },
      { seat: 0, card: 'P-004C', zone: 'field', controlledSinceTurn: 1 },
      { seat: 1, card: 'P-023C', zone: 'field', controlledSinceTurn: 1 },
    ] });
    const first = d.object(0, 'P-003C');
    const second = d.object(0, 'P-004C');
    expect(d.send({ kind: 'attack', members: [first, second] }).ok).toBe(true);
    d.send({ kind: 'pass' }, 0); d.send({ kind: 'pass' }, 1);
    expect(d.send({ kind: 'block', blocker: d.object(1, 'P-023C') }, 1).ok).toBe(true);
    d.send({ kind: 'pass' }, 0); d.send({ kind: 'pass' }, 1);
    expect(d.state.choice?.kind).toBe('allocation');
    expect(d.state.choice?.allocation).toEqual({ total: 3000, increment: 1000 });
    expect(d.answer([], { [first]: 1000, [second]: 2000 }).ok).toBe(true);
    expect(Object.values(d.state.cards).find(card => card.object === first)!.damage).toBe(1000);
    expect(Object.values(d.state.cards).find(card => card.object === second)!.damage).toBe(2000);
  });
});
