import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/rules/engine';
import { declareAttack } from '../../src/rules/combat';
import { addKeyword, addPower, changeControl, effectivePower, expireTurnEffects, setPower } from '../../src/rules/continuous';
import { legalActions } from '../../src/rules/actions';
import { legalAbilityTargets } from '../../src/rules/targets';
import { context, fixture } from '../support/harness';
import { opusPhRegistry } from '../../src/content/manifest';
import type { AbilityTargetRule } from '../../src/rules/types';

describe('continuous control effects', () => {
  it('applies registered field-provider operations without writing a persistent modifier', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-012H', zone: 'field' }, { seat: 0, card: 'P-001L', zone: 'field' },
    ] });
    const engine = { ...context, registry: opusPhRegistry };
    const target = h.object(0, 'P-001L');
    expect(effectivePower(h.state, target, engine)).toBe(8000);
    expect(h.state.effects).toHaveLength(0);
  });

  it('does not let a newly stolen Forward attack before its control interval, unless it has Haste', () => {
    const h = fixture({ active: 1, priority: 1, phase: 'main2', placements: [
      { seat: 1, card: 'P-039H', zone: 'hand' }, { seat: 1, card: 'P-022C', zone: 'hand' },
      { seat: 1, card: 'P-023C', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'field' },
    ] });
    const source = h.object(1, 'P-039H');
    const first = h.object(1, 'P-022C');
    const second = h.object(1, 'P-023C');
    const target = h.object(0, 'P-003C');
    const cast = applyCommand(h.state, { id: 'steal-forward-for-turn', expectedSeq: h.state.seq, seat: 1, intent: {
      kind: 'cast', source, targets: [target], mode: null, payment: {
        discard: [first, second], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [first]: 'Water', [second]: 'Water' }, spend: { Water: 4 },
      },
    } }, context);
    expect(cast.ok).toBe(true);
    if (!cast.ok) return;
    const resolved = applyCommand(cast.state, { id: 'resolve-stolen-forward', expectedSeq: cast.state.seq, seat: 1,
      intent: { kind: 'pass' } }, context);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const opponentPass = applyCommand(resolved.state, { id: 'resolve-stolen-forward-2', expectedSeq: resolved.state.seq, seat: 0,
      intent: { kind: 'pass' } }, context);
    expect(opponentPass.ok).toBe(true);
    if (!opponentPass.ok) return;

    const state = opponentPass.state;
    const stolen = Object.values(state.cards).find(card => card.object === target)!;
    expect(stolen.controller).toBe(1);
    expect(stolen.controlledSinceTurn).toBe(state.turn);
    state.phase = 'attack';
    state.priority = 1;
    expect(legalActions(state, 1, context).some(action => action.kind === 'attack' && action.source === target)).toBe(false);
    expect(declareAttack(state, 1, [target], context).map(error => error.code)).toContain('UNREADY_ATTACKER');

    addKeyword(state, source, target, 'Haste', state.turn);
    expect(legalActions(state, 1, context).some(action => action.kind === 'attack' && action.source === target)).toBe(true);
    expect(declareAttack(state, 1, [target], context)).toEqual([]);
  });

  it('restores the prior controller when an overlapping later control effect expires', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-005R', zone: 'field' }] });
    const card = h.state.cards[h.state.field[0]!]!;
    h.state.turn = 3;
    changeControl(h.state, 'first-control-effect', card.object, 1, 5);
    changeControl(h.state, 'second-control-effect', card.object, 0, 3);
    expireTurnEffects(h.state, context);
    expect(card.controller).toBe(1);
    expect(card.controlledSinceTurn).toBe(3);
  });

  it('blocks a stolen dull-cost ability until Haste allows it and keeps offers in sync', () => {
    const h = fixture({ active: 1, priority: 1, phase: 'main2', placements: [
      { seat: 1, card: 'P-039H', zone: 'hand' }, { seat: 1, card: 'P-022C', zone: 'hand' },
      { seat: 1, card: 'P-023C', zone: 'hand' }, { seat: 1, card: 'P-024C', zone: 'hand' },
      { seat: 1, card: 'P-032R', zone: 'field' },
    ] });
    h.state.cards[h.state.cards[h.state.field.find(instance => h.state.cards[instance]!.card === 'P-032R')!]!.instance]!.controller = 0;
    const cast = applyCommand(h.state, { id: 'steal-recovery-clerk', expectedSeq: h.state.seq, seat: 1, intent: {
      kind: 'cast', source: h.object(1, 'P-039H'), targets: [h.object(1, 'P-032R')], mode: null, payment: {
        discard: [h.object(1, 'P-022C'), h.object(1, 'P-023C')], dullBackups: [], specialDiscard: null,
        dullSource: false, sacrificeSource: false,
        sourceElements: { [h.object(1, 'P-022C')]: 'Water', [h.object(1, 'P-023C')]: 'Water' }, spend: { Water: 4 },
      },
    } }, context);
    expect(cast.ok).toBe(true);
    if (!cast.ok) return;
    const firstPass = applyCommand(cast.state, { id: 'borrowed-banner-pass-1', expectedSeq: cast.state.seq, seat: 1,
      intent: { kind: 'pass' } }, context);
    expect(firstPass.ok).toBe(true);
    if (!firstPass.ok) return;
    const resolved = applyCommand(firstPass.state, { id: 'borrowed-banner-pass-2', expectedSeq: firstPass.state.seq, seat: 0,
      intent: { kind: 'pass' } }, context);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const state = resolved.state;
    const source = Object.values(state.cards).find(card => card.owner === 1 && card.card === 'P-032R')!.object;
    const target = Object.values(state.cards).find(card => card.owner === 1 && card.card === 'P-022C')!.object;
    const discard = Object.values(state.cards).find(card => card.owner === 1 && card.card === 'P-024C')!.object;
    const offer = legalActions(state, 1, context).find(action => action.kind === 'activate' && action.source === source);
    expect(offer).toBeUndefined();
    const activation = applyCommand(state, { id: 'premature-dull-ability', expectedSeq: state.seq, seat: 1, intent: {
      kind: 'activate', source, ability: 'recovery-clerk-action', targets: [target], payment: {
        discard: [discard], dullBackups: [], specialDiscard: null, dullSource: true, sacrificeSource: false,
        sourceElements: { [discard]: 'Water' }, spend: { Water: 1 },
      },
    } }, context);
    expect(activation).toMatchObject({ ok: false, error: { code: 'UNREADY_ABILITY_SOURCE' } });
    addKeyword(state, source, source, 'Haste', state.turn);
    expect(legalActions(state, 1, context).some(action => action.kind === 'activate' && action.source === source)).toBe(true);
    const hastyActivation = applyCommand(state, { id: 'hasty-dull-ability', expectedSeq: state.seq, seat: 1, intent: {
      kind: 'activate', source, ability: 'recovery-clerk-action', targets: [target], payment: {
        discard: [discard], dullBackups: [], specialDiscard: null, dullSource: true, sacrificeSource: false,
        sourceElements: { [discard]: 'Water' }, spend: { Water: 1 },
      },
    } }, context);
    if (!hastyActivation.ok) throw new Error(`${hastyActivation.error.code}: ${hastyActivation.error.message}`);
  });

  it('applies Shape Tide base power before boosts in either effect creation order', () => {
    for (const reverse of [false, true]) {
      const h = fixture({ placements: [
        { seat: 0, card: 'P-012H', zone: 'field' }, { seat: 0, card: 'P-003C', zone: 'field' },
      ] });
      const target = h.object(0, 'P-003C');
      if (reverse) {
        addPower(h.state, target, target, 2000, h.state.turn);
        setPower(h.state, target, target, 4000, h.state.turn);
      } else {
        setPower(h.state, target, target, 4000, h.state.turn);
        addPower(h.state, target, target, 2000, h.state.turn);
      }
      expect(effectivePower(h.state, target, context)).toBe(7000);
    }
  });

  it('recalculates controller-based target legality after a control change', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-003C', zone: 'field' }, { seat: 1, card: 'P-023C', zone: 'field' },
    ] });
    const target = h.object(1, 'P-023C');
    changeControl(h.state, h.object(0, 'P-003C'), target, 0, null);
    const rule: AbilityTargetRule = { zones: ['field'], types: ['Forward'], elements: [], owner: 'any', controller: 'you', dull: null };
    expect(legalAbilityTargets(h.state, 0, rule, context).map(card => card.object)).toContain(target);
    expect(legalAbilityTargets(h.state, 1, rule, context).map(card => card.object)).not.toContain(target);
  });
});
