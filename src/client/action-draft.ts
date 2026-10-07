import type { Element, Intent, ObjectId, Payment, PaymentOffer, Seat } from '../rules/types';

/** Local declaration state tied to the projected authority that created it. */
export interface ActionDraft {
  generation: number;
  seq: number;
  seat: Seat;
  offerId: string;
  source: ObjectId;
  ability: string | null;
  mode: string | null;
  targets: ObjectId[];
  payment: Payment;
  stage: 'mode' | 'targets' | 'payment' | 'review';
}

export interface PaymentSourceChoice {
  object: ObjectId;
  element: Element;
  kind: 'backup' | 'discard';
}

export interface PaymentDraftResult {
  draft: ActionDraft;
  generated: Partial<Record<Element, number>>;
  spent: Partial<Record<Element, number>>;
  remainder: number;
  valid: boolean;
  reason: string | null;
}

/** Build an editable payment only from sources the host offered for this action. */
export function buildPaymentDraft(
  draft: ActionDraft,
  offer: PaymentOffer,
  sources: PaymentSourceChoice[],
  specialDiscard: ObjectId | null = null,
): PaymentDraftResult {
  const unique = new Set(sources.map(source => source.object));
  let reason: string | null = null;
  if (unique.size !== sources.length) reason = 'Select each CP source only once.';
  else if (sources.some(source => source.kind === 'backup'
    ? !offer.backupOptions.includes(source.object)
    : !offer.discardOptions.includes(source.object))) reason = 'Choose CP sources offered for this action.';
  else if (specialDiscard !== null && !offer.specialOptions.includes(specialDiscard)) reason = 'Choose an offered card for the special discard.';
  else if (specialDiscard !== null && unique.has(specialDiscard)) reason = 'The same card cannot pay CP and the special discard.';

  const generated: Partial<Record<Element, number>> = {};
  for (const source of sources) generated[source.element] = (generated[source.element] ?? 0) + (source.kind === 'discard' ? 2 : 1);
  const matchesCost = (element: Element) => offer.elements.some(item => item === 'Light' || item === 'Dark' || item === element);
  const ordered = [...sources].sort((a, b) => Number(matchesCost(b.element)) - Number(matchesCost(a.element)));
  const spent: Partial<Record<Element, number>> = {};
  let remaining = offer.cost;
  for (const source of ordered) {
    const amount = Math.min(remaining, source.kind === 'discard' ? 2 : 1);
    if (amount <= 0) continue;
    spent[source.element] = (spent[source.element] ?? 0) + amount;
    remaining -= amount;
  }
  const totalGenerated = Object.values(generated).reduce((sum, amount) => sum + (amount ?? 0), 0);
  const totalSpent = Object.values(spent).reduce((sum, amount) => sum + (amount ?? 0), 0);
  if (!reason && totalSpent < offer.cost) reason = 'Selected sources do not cover the cost.';
  if (!reason && offer.cost > 0 && !offer.elements.some(element => element === 'Light' || element === 'Dark') &&
      !offer.elements.some(element => (spent[element] ?? 0) > 0)) reason = 'Spend at least one CP of a matching element.';
  if (!reason && totalGenerated - totalSpent > 1) reason = 'Unused generated CP cannot exceed one point.';
  if (!reason && sources.some(source => (generated[source.element] ?? 0) - (source.kind === 'discard' ? 2 : 1) >= (spent[source.element] ?? 0))) {
    reason = 'Every selected CP source must be needed for the payment.';
  }
  if (!reason && offer.cost === 0 && sources.length > 0) reason = 'A zero-cost action does not need CP sources.';

  const payment: Payment = {
    discard: sources.filter(source => source.kind === 'discard').map(source => source.object),
    dullBackups: sources.filter(source => source.kind === 'backup').map(source => source.object),
    specialDiscard,
    dullSource: offer.dullSource,
    sacrificeSource: offer.sacrificeSource,
    sourceElements: Object.fromEntries(sources.map(source => [source.object, source.element])),
    spend: { ...spent },
  };
  const nextDraft: ActionDraft = {
    ...draft,
    targets: [...draft.targets],
    payment,
    stage: reason ? 'payment' : 'review',
  };
  return { draft: nextDraft, generated, spent, remainder: totalGenerated - totalSpent, valid: reason === null, reason };
}

/** Convert a reviewed local draft to an isolated command intent. */
export function declarationIntent(draft: ActionDraft): Extract<Intent, { kind: 'cast' | 'activate' }> {
  const payment: Payment = {
    ...draft.payment,
    discard: [...draft.payment.discard],
    dullBackups: [...draft.payment.dullBackups],
    sourceElements: { ...draft.payment.sourceElements },
    spend: { ...draft.payment.spend },
  };
  const targets = [...draft.targets];
  return draft.ability === null
    ? { kind: 'cast', source: draft.source, targets, mode: draft.mode, payment }
    : { kind: 'activate', source: draft.source, ability: draft.ability, targets, payment };
}
