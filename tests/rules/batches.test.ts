import { describe, expect, it } from 'vitest';
import { prepareBatch, applyPreparedBatch } from '../../src/rules/batches';
import { fixture, context } from '../support/harness';

describe('simultaneous operation batches', () => {
  it('freezes affected cards and observers before applying any damage', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'field' },
      { seat: 1, card: 'P-029C', zone: 'field' },
    ] });
    const forward = Object.values(h.state.cards).find(card => card.card === 'P-005R')!;
    const observer = Object.values(h.state.cards).find(card => card.card === 'P-029C')!;
    const pending = prepareBatch(h.state, { simultaneous: true, operations: [
      { kind: 'forward-damage', source: observer.object, target: forward.object, amount: 3000 },
    ] }, context);

    expect(pending.phase).toBe('replacements');
    expect(pending.snapshots).toContainEqual(forward);
    expect(pending.observers).toContainEqual(observer);
    expect(h.state.cards[forward.instance]!.damage).toBe(0);

    const result = applyPreparedBatch(h.state, pending, context);
    expect(result.error).toBeNull();
    expect(h.state.cards[forward.instance]!.damage).toBe(3000);
    expect(pending.snapshots.find(card => card.instance === forward.instance)?.damage).toBe(0);
  });

  it('applies a selected destination replacement to its original operation index', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-005R', zone: 'field' }] });
    const forward = Object.values(h.state.cards).find(card => card.card === 'P-005R')!;
    const pending = prepareBatch(h.state, { simultaneous: true, operations: [
      { kind: 'move', object: forward.object, to: 'break', index: null },
    ] }, context);
    pending.replacements.push({ operation: 0, replacement: { kind: 'move', object: forward.object, to: 'removed', index: null } });

    const result = applyPreparedBatch(h.state, pending, context);
    expect(result.error).toBeNull();
    expect(h.state.cards[forward.instance]!.zone).toBe('removed');
  });

  it('freezes damage replacement results before later context changes', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-008H', zone: 'field' },
    ] });
    const target = Object.values(h.state.cards).find(card => card.card === 'P-008H')!;
    const pending = prepareBatch(h.state, { simultaneous: true, operations: [
      { kind: 'forward-damage', source: target.object, target: target.object, amount: 3000 },
    ] }, context);

    expect(applyPreparedBatch(h.state, pending, context).error).toBeNull();
    expect(h.state.cards[target.instance]!.damage).toBe(2000);
  });
});
