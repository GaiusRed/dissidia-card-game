import { describe, expect, it } from 'vitest';
import { renderPaymentPanel, type PaymentPanelModel } from '../../src/client/ui/payment-panel';

const model: PaymentPanelModel = {
  cost: 3, commanderTax: 2, generated: 4, spent: 3, remainder: 1,
  dullSource: true, sacrificeSource: true, reason: null,
  sources: [
    { object: 'backup-1', label: 'Banner & Guard', element: 'Fire', kind: 'backup', selected: true },
    { object: 'discard-1', label: 'Coal Tender', element: 'Fire', kind: 'discard', selected: false },
  ],
  specialOptions: [{ object: 'special-1', label: 'Cinder Marshal' }], specialDiscard: 'special-1',
};

describe('payment panel renderer', () => {
  it('shows cost breakdown, CP totals, required components, and selected source state', () => {
    const html = renderPaymentPanel(model);
    expect(html).toContain('Cost 1 CP + tax 2 = 3 CP');
    expect(html).toContain('Generated 4 · Spent 3 · Remainder 1');
    expect(html).toContain('Dull source');
    expect(html).toContain('Sacrifice source');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('escapes catalog labels and explains an incomplete payment', () => {
    const html = renderPaymentPanel({ ...model, reason: '<select CP>' });
    expect(html).toContain('Banner &amp; Guard');
    expect(html).toContain('&lt;select CP&gt;');
  });
});
