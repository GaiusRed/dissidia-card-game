import { describe, expect, it } from 'vitest';
import { buildPaymentDraft, declarationIntent, type ActionDraft } from '../../src/client/action-draft';
import type { PaymentOffer } from '../../src/rules/types';

const payment = () => ({
  discard: ['discard-1'], dullBackups: ['backup-1'], specialDiscard: null,
  dullSource: false, sacrificeSource: false,
  sourceElements: { 'discard-1': 'Fire' as const, 'backup-1': 'Fire' as const }, spend: { Fire: 3 },
});

function draft(overrides: Partial<ActionDraft> = {}): ActionDraft {
  return {
    generation: 2, seq: 7, seat: 0, offerId: 'cast:source-1', source: 'source-1', ability: null,
    mode: null, targets: ['target-1'], payment: payment(), stage: 'review', ...overrides,
  };
}

describe('action declaration draft', () => {
  it('copies cast targets and payment into a cast intent', () => {
    const input = draft();
    const intent = declarationIntent(input);
    input.targets.push('later-target');
    input.payment.discard.push('later-card');
    expect(intent).toEqual({
      kind: 'cast', source: 'source-1', targets: ['target-1'], mode: null,
      payment: {
        discard: ['discard-1'], dullBackups: ['backup-1'], specialDiscard: null,
        dullSource: false, sacrificeSource: false,
        sourceElements: { 'discard-1': 'Fire', 'backup-1': 'Fire' }, spend: { Fire: 3 },
      },
    });
  });

  it('emits an activation intent with its ability id', () => {
    expect(declarationIntent(draft({ ability: 'special', mode: 'choose', targets: ['enemy'] }))).toMatchObject({
      kind: 'activate', source: 'source-1', ability: 'special', targets: ['enemy'], payment: payment(),
    });
  });
});

describe('editable CP payment draft', () => {
  const offer: PaymentOffer = {
    cost: 1, commanderTax: 2, elements: ['Fire'], discardOptions: ['hand-source', 'special-source'],
    backupOptions: ['backup-source'], specialOptions: ['special-source'],
    dullSource: true, sacrificeSource: false,
  };

  it('proposes exact CP from an offered Backup without submitting a command', () => {
    const result = buildPaymentDraft(draft(), offer, [{ object: 'backup-source', element: 'Fire', kind: 'backup' }]);
    expect(result).toMatchObject({ valid: true, generated: { Fire: 1 }, spent: { Fire: 1 }, remainder: 0 });
    expect(result.draft.payment.dullBackups).toEqual(['backup-source']);
    expect(result.draft.payment.dullSource).toBe(true);
  });

  it('allows one unused CP from an offered discard source', () => {
    const result = buildPaymentDraft(draft(), offer, [{ object: 'hand-source', element: 'Fire', kind: 'discard' }]);
    expect(result).toMatchObject({ valid: true, generated: { Fire: 2 }, spent: { Fire: 1 }, remainder: 1 });
  });

  it('keeps an underfunded selection editable and prevents it from reaching Review', () => {
    const result = buildPaymentDraft(draft(), offer, []);
    expect(result.valid).toBe(false);
    expect(result.draft.stage).toBe('payment');
    expect(result.reason).toMatch(/cover/i);
  });

  it('does not reuse a special-discard card as a CP source', () => {
    const result = buildPaymentDraft(draft(), offer,
      [{ object: 'special-source', element: 'Fire', kind: 'discard' }], 'special-source');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/same card/i);
  });

  it('keeps other same-name discard candidates available for CP', () => {
    const result = buildPaymentDraft(draft(), offer,
      [{ object: 'hand-source', element: 'Fire', kind: 'discard' }], 'special-source');
    expect(result.valid).toBe(true);
    expect(result.draft.payment.specialDiscard).toBe('special-source');
    expect(result.draft.payment.discard).toEqual(['hand-source']);
  });
});
