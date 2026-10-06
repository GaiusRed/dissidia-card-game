import { describe, expect, it } from 'vitest';
import { assertInvariants } from '../../src/rules/invariants';
import { validatePayment, commitPayment } from '../../src/rules/payment';
import { fixture, context } from '../support/harness';
import type { Payment } from '../../src/rules/types';

const payment = (changes: Partial<Payment> = {}): Payment => ({
  discard: [], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
  sourceElements: {}, spend: {}, ...changes,
});
describe('CP payment', () => {
  it('generates two CP per discard and one per dull Backup, while spending the exact cost', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' },
    ] });
    const selected = payment({
      discard: [h.object(0, 'P-003C')], dullBackups: [h.object(0, 'P-009C')],
      sourceElements: { [h.object(0, 'P-003C')]: 'Fire', [h.object(0, 'P-009C')]: 'Fire' },
      spend: { Fire: 3 },
    });
    expect(validatePayment(h.state, 0, h.object(0, 'P-005R'), selected, 3, context)).toEqual([]);
    commitPayment(h.state, 0, h.object(0, 'P-005R'), selected, 3, context);
    expect(h.state.zones[0].break.map(id => h.state.cards[id]!.card)).toContain('P-003C');
    expect(h.state.cards[Object.keys(h.state.cards).find(id => h.state.cards[id]!.card === 'P-009C')!]!.dull).toBe(true);
    assertInvariants(h.state, context);
  });
  it('expires unused generated CP when a discard pays a one-CP cost', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-002C', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
    ] });
    const selected = payment({ discard: [h.object(0, 'P-003C')], sourceElements: { [h.object(0, 'P-003C')]: 'Fire' }, spend: { Fire: 1 } });
    expect(validatePayment(h.state, 0, h.object(0, 'P-002C'), selected, 1, context)).toEqual([]);
  });
  it('rejects Dark CP discards, a missing matching element and underpayment', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'hand' },
      { seat: 0, card: 'P-008H', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'hand' },
    ] });
    const source = h.object(0, 'P-005R');
    const darkDiscard = payment({ discard: [h.object(0, 'P-008H')], sourceElements: { [h.object(0, 'P-008H')]: 'Light' }, spend: { Fire: 2 } });
    expect(validatePayment(h.state, 0, source, darkDiscard, 2, context).map(e => e.code)).toContain('INVALID_CP_SOURCE');
    const noFire = payment({ discard: [h.object(0, 'P-003C')], sourceElements: { [h.object(0, 'P-003C')]: 'Fire' }, spend: { Water: 2 } });
    expect(validatePayment(h.state, 0, source, noFire, 2, context).map(e => e.code)).toEqual(expect.arrayContaining(['UNGENERATED_CP', 'ELEMENT_REQUIREMENT']));
    expect(validatePayment(h.state, 0, source, noFire, 3, context).map(e => e.code)).toContain('UNDERPAYMENT');
  });
  it('does not let a special-discard card also produce CP', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-001L', zone: 'field' },
      { seat: 0, card: 'P-002C', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'hand' },
    ] });
    const selected = payment({
      discard: [h.object(0, 'P-002C'), h.object(0, 'P-003C')],
      specialDiscard: h.object(0, 'P-002C'),
      sourceElements: { [h.object(0, 'P-002C')]: 'Fire', [h.object(0, 'P-003C')]: 'Fire' },
      spend: { Fire: 4 },
    });
    expect(validatePayment(h.state, 0, h.object(0, 'P-001L'), selected, 3, context).map(e => e.code)).toContain('DUPLICATE_COST_SOURCE');
  });
});
