import type { Element, ObjectId } from '../../rules/types';

export interface PaymentPanelSource {
  object: ObjectId;
  label: string;
  element: Element;
  kind: 'backup' | 'discard';
  selected: boolean;
}

export interface PaymentPanelModel {
  cost: number;
  commanderTax: number;
  generated: number;
  spent: number;
  remainder: number;
  dullSource: boolean;
  sacrificeSource: boolean;
  reason: string | null;
  sources: PaymentPanelSource[];
  specialOptions: { object: ObjectId; label: string }[];
  specialDiscard: ObjectId | null;
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export function renderPaymentPanel(model: PaymentPanelModel): string {
  const cost = model.commanderTax
    ? `Cost ${model.cost - model.commanderTax} CP + tax ${model.commanderTax} = ${model.cost} CP`
    : `Cost ${model.cost} CP`;
  const sources = model.sources.map(source => `<button class="${source.selected ? 'primary' : 'soft'} payment-source"
    data-payment-source="${escapeHtml(source.object)}" data-payment-element="${source.element}" data-payment-kind="${source.kind}"
    aria-pressed="${source.selected}">${source.selected ? '✓ ' : ''}${source.kind === 'backup' ? 'Backup' : 'Discard'} · ${escapeHtml(source.label)} · ${source.element}</button>`).join('');
  const specialOptions = model.specialOptions.map(option => `<option value="${escapeHtml(option.object)}" ${model.specialDiscard === option.object ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('');
  return `<section class="payment-draft" role="region" aria-label="Payment draft">
    <div class="payment-summary"><b>${cost}</b>
      <span>Generated ${model.generated} · Spent ${model.spent} · Remainder ${model.remainder}</span>
      ${model.dullSource ? '<span>Dull source</span>' : ''}${model.sacrificeSource ? '<span>Sacrifice source</span>' : ''}
      ${model.reason ? `<span class="payment-error" role="status">${escapeHtml(model.reason)}</span>` : ''}</div>
    <div class="payment-sources" aria-label="CP sources">${sources}</div>
    ${model.specialOptions.length ? `<label class="special-discard">Special discard <select id="special-discard"><option value="">Choose a card</option>${specialOptions}</select></label>` : ''}
  </section>`;
}
