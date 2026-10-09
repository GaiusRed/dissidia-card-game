import './styles.css';
import './client/theme.css';
import { CLIENT_BUILD_ID } from './app-build';
import { opusPh, opusPhRegistry } from './content/manifest';
import { LocalHost } from './host/local-host';
import { registerOffline, type OfflineStatus } from './client/offline';
import { homeMenu } from './client/menu';
import { MatchController } from './client/match-controller';
import { chooseSmartPriorityAction, type SmartPriorityReason, type EndTurnRequest } from './client/priority-policy';
import { computeTableLayout } from './client/table/layout';
import { applyEventMotion, eventMotionMarkers, type EventMotionMarker } from './client/table/animation';
import { beginHandGesture, cancelHandGesture, endHandGesture, moveHandGesture, type HandGesture } from './client/table/gestures';
import { choiceAnswer, toggleSelection, validateChoiceDraft } from './client/choice-draft';
import { buildPaymentDraft, declarationIntent, type ActionDraft, type PaymentSourceChoice } from './client/action-draft';
import { renderPaymentPanel } from './client/ui/payment-panel';
import { cinderCompany, tidalAssembly } from './content/decks';
import { addEditorCard, changeEditorCommander, createDeckEditor, editorValidation, removeEditorCard } from './client/deck-editor';
import { loadDecks, saveDeck, type SavedDeck } from './storage/decks';
import type { CardDefinition, DeckList, Element, Intent, ObjectId, Payment, PaymentOffer, Seat } from './rules/types';
import type { MatchView } from './host/protocol';

const host = new LocalHost();
const root = document.querySelector<HTMLElement>('#app')!;
document.documentElement.dataset.clientBuild = CLIENT_BUILD_ID;
function syncTableLayout(): void {
  const layout = computeTableLayout(window.innerWidth, window.innerHeight);
  root.style.setProperty('--header-height', `${layout.header.height}px`);
  root.style.setProperty('--footer-height', `${layout.progress.height}px`);
  root.style.setProperty('--opponent-height', `${layout.opponent.height}px`);
  root.style.setProperty('--current-height', `${layout.current.height}px`);
  root.style.setProperty('--row-height', `${layout.rows.yourForwards.height}px`);
  root.style.setProperty('--hand-height', `${layout.hand.height}px`);
  root.style.setProperty('--hand-left', `${layout.hand.x}px`);
    root.style.setProperty('--choice-height', `${layout.choices.height}px`);
    root.style.setProperty('--choice-width', `${layout.choices.width}px`);
    root.style.setProperty('--field-top-inset', `${Math.min(layout.field.height, 26)}px`);
    root.style.setProperty('--field-bottom-inset', '8px');
}
syncTableLayout();
window.addEventListener('resize', syncTableLayout);
let inspectedSeat: Seat = 0;
let notice = '';
let selectedObject: ObjectId | null = null;
let enlargedObject: ObjectId | null = null;
let openPublicZone: { seat: Seat; zone: 'deck' | 'break' | 'damage' | 'removed' } | null = null;
let orderSelection: string[] = [];
let choiceSelection: string[] = [];
let allocationDraft: Record<string, number> = {};
let partyDraft: ObjectId[] = [];
let castingSource: ObjectId | null = null;
let targetSelection: ObjectId[] = [];
let targetCursor: { x: number; y: number; snapped: boolean } | null = null;
let selectedMode: string | null = null;
let draggingObject: ObjectId | null = null;
let handPointer: { pointerId: number; instance: string; object: ObjectId; owner: Seat; generation: number; seq: number; gesture: HandGesture; element: HTMLButtonElement; preview: HTMLButtonElement | null } | null = null;
let suppressCardClick: ObjectId | null = null;
let suppressCardClickUntil = 0;
const handOrders = new Map<Seat, ObjectId[]>();
const automaticEventIds = new Set<string>();
let autoScheduledKey: string | null = null;
let endTurnRequest: EndTurnRequest | null = null;
let logVisible = true;
let logScrollTop = 0;
let logScrollHeight = 0;
let logFollowing = true;
function restorePriorityHolds(): Record<Seat, boolean> {
  try {
    const value = JSON.parse(localStorage.getItem('dissidia-priority-holds') ?? '{}') as Record<string, unknown>;
    return { 0: value['0'] === true, 1: value['1'] === true };
  } catch { return { 0: false, 1: false }; }
}
const priorityHolds = restorePriorityHolds();
let abilityDraft: { source: ObjectId; abilityId: string } | null = null;
let actionDraft: ActionDraft | null = null;
let paymentChoices: PaymentSourceChoice[] = [];
let selectedSpecialDiscard: ObjectId | null = null;
let screen: 'home' | 'deck-editor' | 'active-menu' = 'home';
let editorSeat: Seat = 0;
let editorDeck = restoreEditorDraft(0) ?? createDeckEditor(cinderCompany);
let editorError = '';
let editorInspection: string | null = null;
const restoredEditorFilters = restoreEditorFilters();
let editorQuery = restoredEditorFilters.query;
let editorType: 'all' | 'Forward' | 'Backup' | 'Summon' = restoredEditorFilters.type;
let editorElement: Element | 'all' = restoredEditorFilters.element;
let savedDecks: SavedDeck[] = [];
let offlineStatus: OfflineStatus = 'installing';
let recoveryWarning: string | null = null;
let restoreComplete = false;
let applyUpdate: () => void = () => {};
let commandPending = false;
let autoBurstCount = 0;
let autoBudgetPaused = false;
let pendingEventMotion: EventMotionMarker[] = [];
let matchController: MatchController | null = null;

function orderedHand(seat: Seat, hand: readonly ObjectId[]): ObjectId[] {
  const available = new Set(hand);
  const prior = handOrders.get(seat) ?? [];
  const next = [...prior.filter(object => available.has(object)), ...hand.filter(object => !prior.includes(object))];
  handOrders.set(seat, next);
  return next;
}

function isPlayableSavedDeck(value: unknown): value is SavedDeck {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SavedDeck>;
  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || !candidate.deck || typeof candidate.deck !== 'object') return false;
  const deck = candidate.deck as Partial<DeckList>;
  if (typeof deck.commander !== 'string' || !Array.isArray(deck.main) || !deck.main.every(number => typeof number === 'string')) return false;
  return editorValidation({ commander: deck.commander, main: deck.main }).length === 0;
}

function editorDraftKey(seat: Seat): string { return `dissidia-editor-draft-${seat}`; }
function restoreEditorFilters(): { query: string; type: 'all' | 'Forward' | 'Backup' | 'Summon'; element: Element | 'all' } {
  try {
    const raw = localStorage.getItem('dissidia-editor-filters');
    if (!raw) return { query: '', type: 'all', element: 'all' };
    const value = JSON.parse(raw) as { query?: unknown; type?: unknown; element?: unknown };
    const types = ['all', 'Forward', 'Backup', 'Summon'];
    const elements = ['all', 'Fire', 'Ice', 'Wind', 'Earth', 'Lightning', 'Water', 'Light', 'Dark'];
    return {
      query: typeof value.query === 'string' ? value.query.slice(0, 120) : '',
      type: types.includes(value.type as string) ? value.type as 'all' | 'Forward' | 'Backup' | 'Summon' : 'all',
      element: elements.includes(value.element as string) ? value.element as Element | 'all' : 'all',
    };
  } catch { return { query: '', type: 'all', element: 'all' }; }
}
function persistEditorFilters(): void {
  try { localStorage.setItem('dissidia-editor-filters', JSON.stringify({ query: editorQuery, type: editorType, element: editorElement })); }
  catch { /* The catalog remains usable when browser storage is disabled. */ }
}
function restoreEditorDraft(seat: Seat): DeckList | null {
  try {
    const raw = localStorage.getItem(editorDraftKey(seat));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<DeckList>;
    if (typeof value.commander !== 'string' || opusPh[value.commander]?.type !== 'Forward' ||
        !Array.isArray(value.main) || value.main.length > 19 || value.main.some(number => typeof number !== 'string' || !opusPh[number]) ||
        new Set(value.main).size !== value.main.length) return null;
    return { commander: value.commander as DeckList['commander'], main: value.main as DeckList['main'] };
  } catch { return null; }
}
function persistEditorDraft(): void {
  try { localStorage.setItem(editorDraftKey(editorSeat), JSON.stringify(editorDeck)); } catch { /* Editing remains available when browser storage is disabled. */ }
}
function clearEditorDraft(seat: Seat): void {
  try { localStorage.removeItem(editorDraftKey(seat)); } catch { /* Saved deck data is already durable in IndexedDB. */ }
}

function reorderHand(seat: Seat, source: ObjectId, target: ObjectId, afterTarget: boolean): void {
  const order = [...(handOrders.get(seat) ?? [])];
  const sourceIndex = order.indexOf(source);
  const targetIndex = order.indexOf(target);
  if (sourceIndex < 0 || targetIndex < 0 || source === target) return;
  order.splice(sourceIndex, 1);
  const adjustedTarget = order.indexOf(target);
  order.splice(adjustedTarget + (afterTarget ? 1 : 0), 0, source);
  handOrders.set(seat, order);
}

function positionHandPreview(preview: HTMLElement, x: number, y: number): void {
  const width = preview.offsetWidth;
  const height = preview.offsetHeight;
  const left = Math.max(6, Math.min(window.innerWidth - width - 6, x - width / 2));
  const top = Math.max(6, Math.min(window.innerHeight - height - 6, y - height / 2));
  preview.style.left = `${left}px`;
  preview.style.top = `${top}px`;
}

function clearHandPointer(): void {
  if (!handPointer) return;
  const active = handPointer;
  handPointer = null;
  active.gesture = cancelHandGesture();
  active.element.classList.remove('gesture-lifted');
  active.preview?.remove();
  if (active.element.hasPointerCapture(active.pointerId)) active.element.releasePointerCapture(active.pointerId);
}

function nameOf(state: MatchView, instance: string): string {
  const card = state.cards[instance]!;
  return opusPh[card.card]?.name ?? (card.card === 'HIDDEN' ? 'Card back' : card.card);
}
function cardRulesText(card: CardDefinition | null | undefined): string {
  return card?.text.replace(/(?:Generic\.\s*)?No abilities\.\s*/gi, '').trim() ?? '';
}
function phaseName(phase: string): string {
  return ({ main1: 'Main 1', main2: 'Main 2', attack: 'Attack', end: 'End', setup: 'Setup', active: 'Active', draw: 'Draw' } as Record<string, string>)[phase] ?? phase;
}
function eventText(event: import('./rules/types').RuleEvent): string {
  const data = event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data as Record<string, unknown> : {};
  const actor = typeof data.seat === 'number' ? `Player ${data.seat + 1}` : 'The game';
  const objectName = (id: unknown): string => {
    if (typeof id !== 'string') return 'a card';
    const view = host.view(0);
    const card = Object.values(view.cards).find(item => item.object === id);
    return card ? nameOf(view, card.instance) : 'a card';
  };
  if (event.type === 'priority.passed') return `${actor} passed priority${automaticEventIds.has(event.id) ? ' automatically' : ''}.`;
  if (event.type === 'combat.block-declined') return automaticEventIds.has(event.id) ? `${actor} had no legal blocker; combat proceeds.` : `${actor} declined to block.`;
  if (event.type === 'phase.started') return `Turn ${String(data.turn)} | Player ${Number(data.active) + 1} | ${phaseName(String(data.phase))} Phase.`;
  if (event.type === 'character.cast') return `${actor} played ${opusPh[String(data.card)]?.name ?? data.card}.`;
  if (event.type === 'summon.cast') return `${actor} cast ${opusPh[String(data.card)]?.name ?? data.card}.`;
  if (event.type === 'summon.resolved') return `${opusPh[String(data.card)]?.name ?? data.card} resolved.`;
  if (event.type === 'player.damaged') return `${actor} took damage; ${opusPh[String(data.card)]?.name ?? 'a card'} entered their Damage Zone.`;
  if (event.type === 'card.drawn') return `${actor} drew a card.`;
  if (event.type === 'card.discarded' || event.type === 'card.discarded-for-special') return `${actor} discarded ${opusPh[String(data.card)]?.name ?? data.card} to pay a cost.`;
  if (event.type === 'choice.answered') return `${actor} answered a required choice.`;
  if (event.type === 'stack.resolved') return `Player ${Number(data.controller) + 1}'s ${opusPh[String(data.card)]?.name ?? objectName(data.source)} began resolving.`;
  if (event.type === 'stack.effect-completed') {
    const targets = Array.isArray(data.targets) ? data.targets.map(objectName).join(', ') : '';
    return `${opusPh[String(data.card)]?.name ?? objectName(data.source)}'s effect finished${targets ? ` (targets: ${targets})` : ''}.`;
  }
  if (event.type === 'power.changed') return `${objectName(data.source)} changed ${objectName(data.object)}'s power by ${String(data.value)}.`;
  if (event.type === 'forward.damaged') return `${objectName(data.source)} dealt ${String(data.amount)} damage to ${objectName(data.target)}.`;
  if (event.type === 'combat.attack-declared') return `${actor} attacked with ${Array.isArray(data.attackers) ? data.attackers.map(objectName).join(', ') : 'Forwards'}.`;
  if (event.type === 'combat.block-declared') return `${actor} blocked with ${objectName(data.blocker)}.`;
  if (event.type === 'combat.blockers-opened') return `Player ${Number(data.seat) + 1} may block.`;
  if (event.type === 'combat.damage-allocated') return 'Combat damage was assigned.';
  if (event.type === 'card.status-changed') return `${objectName(data.object)} changed status.`;
  if (event.type === 'keyword.granted') return `${objectName(data.object)} gained ${String(data.keyword)}.`;
  if (event.type === 'card.moved') return `${objectName(data.object)} moved from ${String(data.from)} to ${String(data.to)}.`;
  if (event.type === 'card.activated') return `${actor}'s cards became Active.`;
  if (event.type === 'game.conceded') return `${actor} conceded.`;
  if (event.type === 'game.result') return 'The duel ended.';
  return event.type.replaceAll('.', ' ').replaceAll('-', ' ');
}
function findObject(state: MatchView, object: ObjectId) { return Object.values(state.cards).find(card => card.object === object); }
function makePayment(state: MatchView, seat: Seat, source: ObjectId, cost: number, requiredElements?: Element[], excluded: string[] = []): Payment | null {
  const sourceCard = findObject(state, source);
  if (!sourceCard) return null;
  const identity = requiredElements ?? opusPh[sourceCard.card]?.elements ?? [];
  const colorlessCard = identity.some(element => element === 'Light' || element === 'Dark');
  const candidates: { object: string; element: (typeof identity)[number]; amount: number; discard: boolean }[] = [];
  for (const instance of state.field) {
    const card = state.cards[instance]!;
    const def = opusPh[card.card];
    const element = def?.elements.find(e => colorlessCard || identity.includes(e));
    if (card.object !== source && !excluded.includes(card.object) && card.controller === seat && !card.dull && def?.type === 'Backup' && element) {
      candidates.push({ object: card.object, element, amount: 1, discard: false });
    }
  }
  for (const instance of state.zones[seat].hand) {
    const card = state.cards[instance]!;
    const def = opusPh[card.card];
    const element = def?.elements.find(e => identity.includes(e));
    if (card.object !== source && !excluded.includes(card.object) && def && !def.elements.some(e => e === 'Light' || e === 'Dark') && (colorlessCard ? !!def.elements[0] : !!element)) {
      candidates.push({ object: card.object, element: colorlessCard ? def.elements[0]! : element!, amount: 2, discard: true });
    }
  }
  const search = (index: number, total: number, selected: typeof candidates): typeof candidates | null => {
    if (total >= cost && (colorlessCard || selected.some(item => identity.includes(item.element)))) return selected;
    if (index >= candidates.length || total >= cost) return null;
    return search(index + 1, total + candidates[index]!.amount, [...selected, candidates[index]!]) ?? search(index + 1, total, selected);
  };
  const selected = cost === 0 ? [] : search(0, 0, []);
  if (!selected) return null;
  const spend: Payment['spend'] = {};
  let remaining = cost;
  const allocations = [...selected].sort((a, b) => Number(identity.includes(b.element)) - Number(identity.includes(a.element)));
  for (const item of allocations) {
    const amount = Math.min(remaining, item.amount);
    if (amount <= 0) continue;
    spend[item.element] = (spend[item.element] ?? 0) + amount;
    remaining -= amount;
  }
  if (remaining > 0) return null;
  return {
    discard: selected.filter(item => item.discard).map(item => item.object),
    dullBackups: selected.filter(item => !item.discard).map(item => item.object),
    specialDiscard: null, dullSource: false, sacrificeSource: false,
    sourceElements: Object.fromEntries(selected.map(item => [item.object, item.element])), spend,
  };
}
async function command(seat: Seat, intent: Intent, view: MatchView, autoReason: SmartPriorityReason | null = null): Promise<void> {
  if (commandPending) return;
  if (endTurnRequest && intent.kind !== 'pass') endTurnRequest = null;
  if (!autoReason) { autoBurstCount = 0; autoBudgetPaused = false; autoScheduledKey = null; }
  commandPending = true;
  root.inert = true;
  try {
    const reply = await host.submit({ generation: view.generation, command: {
      id: crypto.randomUUID(), expectedSeq: view.seq, seat, intent,
    } });
    notice = reply.ok ? '' : reply.error.message;
    if (reply.ok) {
      if (autoReason) {
        autoBurstCount += 1;
        for (const event of reply.events) automaticEventIds.add(event.id);
      }
      pendingEventMotion = eventMotionMarkers(reply.events);
      selectedObject = null; orderSelection = []; choiceSelection = []; allocationDraft = {}; partyDraft = [];
      castingSource = null; abilityDraft = null; targetSelection = []; selectedMode = null;
      actionDraft = null; paymentChoices = []; selectedSpecialDiscard = null;
      matchController?.clearDraft();
      inspectedSeat = reply.state.choice?.seat ?? reply.state.priority ?? reply.state.active;
    } else { pendingEventMotion = []; endTurnRequest = null; }
  } finally {
    commandPending = false;
    root.inert = false;
    render();
    applyEventMotion(root, pendingEventMotion);
    pendingEventMotion = [];
  }
}
function scheduleSmartPriority(view: MatchView): void {
  if (endTurnRequest && (endTurnRequest.generation !== view.generation || endTurnRequest.turn !== view.turn || view.choice || view.result || priorityHolds[endTurnRequest.seat] || screen !== 'home' || enlargedObject || openPublicZone || actionDraft || handPointer)) endTurnRequest = null;
  const paused = screen !== 'home' || enlargedObject !== null || openPublicZone !== null || actionDraft !== null || handPointer !== null || commandPending;
  if (paused) { autoScheduledKey = null; return; }
  if (autoBudgetPaused) return;
  if (autoBurstCount >= 32) {
    autoBudgetPaused = true;
    notice = 'Smart priority paused after 32 automatic actions.';
    window.setTimeout(render, 0);
    return;
  }
  const seat = view.priority;
  if (seat === null) { autoScheduledKey = null; return; }
  const decision = chooseSmartPriorityAction(view, priorityHolds[seat], false, endTurnRequest);
  if (!decision) { autoScheduledKey = null; return; }
  const key = `${view.generation}:${view.seq}:${seat}:${decision.reason}`;
  if (autoScheduledKey === key) return;
  autoScheduledKey = key;
  window.setTimeout(() => {
    if (commandPending) return;
    let latest: MatchView;
    try { latest = host.view(seat); } catch { return; }
    const current = chooseSmartPriorityAction(latest, priorityHolds[seat], screen !== 'home' || enlargedObject !== null || openPublicZone !== null || actionDraft !== null || handPointer !== null || commandPending, endTurnRequest);
    if (autoScheduledKey !== key || !current || latest.generation !== view.generation || latest.seq !== view.seq || latest.priority !== seat) return;
    void command(seat, current.intent, latest, current.reason);
  }, 180);
}
function startActionDraft(state: MatchView, seat: Seat, offerId: string, source: ObjectId, ability: string | null): boolean {
  const offer = state.actions.find(item => item.id === offerId)?.payment;
  if (!offer) { notice = 'The host has no current payment offer for this action.'; render(); return false; }
  selectedSpecialDiscard = offer.specialOptions[0] ?? null;
  const suggested = makePayment(state, seat, source, offer.cost, offer.elements,
    selectedSpecialDiscard ? [selectedSpecialDiscard] : []);
  if (suggested) suggested.specialDiscard = selectedSpecialDiscard;
  paymentChoices = suggested ? [
    ...suggested.dullBackups.map(object => ({ object, element: suggested.sourceElements[object]!, kind: 'backup' as const })),
    ...suggested.discard.map(object => ({ object, element: suggested.sourceElements[object]!, kind: 'discard' as const })),
  ] : [];
  selectedSpecialDiscard = suggested?.specialDiscard ?? selectedSpecialDiscard;
  const draft: ActionDraft = {
    generation: state.generation, seq: state.seq, seat, offerId, source, ability,
    mode: null, targets: [],
    payment: suggested ?? { discard: [], dullBackups: [], specialDiscard: null, dullSource: offer.dullSource,
      sacrificeSource: offer.sacrificeSource, sourceElements: {}, spend: {} },
    stage: ability === null ? 'payment' : 'targets',
  };
  actionDraft = buildPaymentDraft(draft, offer, paymentChoices, selectedSpecialDiscard).draft;
  if (ability !== null) actionDraft.stage = 'targets';
  matchController?.beginDraft({ kind: 'action', id: offerId });
  return true;
}
function requiredTargets(cardNumber: string): number {
  return opusPh[cardNumber]?.summonTarget?.min ?? 0;
}
function beginCast(state: MatchView, seat: Seat, object: ObjectId): void {
  const card = findObject(state, object);
  if (!card) return;
  const def = opusPh[card.card];
  if (def?.type !== 'Summon') {
    if (!startActionDraft(state, seat, `cast:${object}`, object, null)) return;
    castingSource = object;
    selectedObject = object;
    notice = 'Review the cost and confirm this cast.';
    render();
    return;
  }
  if (!def.summonTarget) {
    notice = 'This placeholder Summon has no implemented effect yet.'; render(); return;
  }
  const needed = requiredTargets(def.number);
  if (!startActionDraft(state, seat, `cast:${object}`, object, null)) return;
  castingSource = object;
  targetCursor = null;
  targetSelection = [];
  selectedMode = null;
  selectedObject = object;
  notice = needed === 0 ? 'Review the cost and confirm this Summon.'
    : def.summonTarget.modes?.length ? 'Choose a mode before selecting targets.' : `Choose ${needed} target${needed > 1 ? 's' : ''} for ${def.name}.`;
  render();
}
function castSummon(state: MatchView, seat: Seat, object: ObjectId, targets: ObjectId[]): void {
  const offer = actionDraft ? state.actions.find(item => item.id === actionDraft!.offerId)?.payment : null;
  const payment = actionDraft && offer ? buildPaymentDraft(actionDraft, offer, paymentChoices, selectedSpecialDiscard) : null;
  if (!actionDraft || actionDraft.source !== object || actionDraft.seat !== seat || actionDraft.generation !== state.generation ||
      actionDraft.seq !== state.seq || !payment?.valid) {
    notice = payment?.reason ?? 'The action draft is stale or its payment is incomplete.'; render(); return;
  }
  const reviewed = { ...payment.draft, targets: [...targets], mode: selectedMode };
  command(seat, declarationIntent(reviewed), state);
}
function beginAbility(state: MatchView, source: ObjectId, abilityId: string): void {
  const sourceCard = findObject(state, source);
  const ability = sourceCard ? opusPh[sourceCard.card]?.abilities.find(item => item.id === abilityId) : undefined;
  if (!sourceCard || !ability?.activation) { notice = 'This placeholder ability is not implemented yet.'; render(); return; }
  abilityDraft = { source, abilityId };
  targetCursor = null;
  startActionDraft(state, sourceCard.controller, `activate:${source}:${abilityId}`, source, abilityId);
  castingSource = null; selectedObject = source; targetSelection = [];
  notice = `Choose a target for ${ability.text}`;
  render();
}
function sendAbility(state: MatchView, seat: Seat, targets: ObjectId[]): void {
  if (!abilityDraft || !actionDraft) return;
  const offer = state.actions.find(item => item.id === actionDraft!.offerId)?.payment;
  const payment = offer ? buildPaymentDraft(actionDraft, offer, paymentChoices, selectedSpecialDiscard) : null;
  if (!offer || !payment?.valid || actionDraft.generation !== state.generation || actionDraft.seq !== state.seq ||
      actionDraft.seat !== seat || actionDraft.source !== abilityDraft.source || actionDraft.ability !== abilityDraft.abilityId) {
    notice = payment?.reason ?? 'The ability draft is stale or its payment is incomplete.'; render(); return;
  }
  command(seat, declarationIntent({ ...payment.draft, targets: [...targets] }), state);
}
function legalDraftTarget(state: MatchView, targetObject: ObjectId): boolean {
  if ((!castingSource && !abilityDraft) || targetSelection.includes(targetObject)) return false;
  const sourceObject = castingSource ?? abilityDraft!.source;
  const offer = state.actions.find(action => action.source === sourceObject &&
    (abilityDraft ? action.kind === 'activate' && action.ability === abilityDraft.abilityId : action.kind === 'cast'));
  const options = selectedMode ? offer?.modeTargetOptions?.[selectedMode] : offer?.targetOptions;
  return options?.some(option => option.object === targetObject) ?? false;
}
function drawTargeting(): void {
  root.querySelector('.targeting-overlay')?.remove();
  const sourceObject = castingSource ?? abilityDraft?.source;
  if (!sourceObject) return;
  const source = root.querySelector<HTMLElement>(`[data-card="${CSS.escape(sourceObject)}"]`);
  if (!source) return;
  const bounds = root.getBoundingClientRect();
  const a = source.getBoundingClientRect();
  const sx = a.left + a.width / 2 - bounds.left;
  const sy = a.top + a.height / 2 - bounds.top;
  const lines = targetSelection.map((id, index) => {
    const target = root.querySelector<HTMLElement>(`[data-card="${CSS.escape(id)}"]`);
    if (!target) return '';
    const b = target.getBoundingClientRect();
    const x = b.left + b.width / 2 - bounds.left;
    const y = b.top + b.height / 2 - bounds.top;
    return `<line class="selected-target-line" x1="${sx}" y1="${sy}" x2="${x}" y2="${y}"/><text class="target-number" x="${x}" y="${y}">${index + 1}</text>`;
  }).join('');
  const current = targetCursor && targetSelection.length < (abilityDraft ? 1 : requiredTargets(findObject(host.view(), sourceObject)?.card ?? ''))
    ? `<line class="cursor-line" x1="${sx}" y1="${sy}" x2="${targetCursor.x - bounds.left}" y2="${targetCursor.y - bounds.top}"/>${targetCursor.snapped ? `<circle class="target-snap" cx="${targetCursor.x - bounds.left}" cy="${targetCursor.y - bounds.top}" r="18"/>` : ''}` : '';
  root.insertAdjacentHTML('beforeend', `<svg class="targeting-overlay" width="${bounds.width}" height="${bounds.height}" aria-hidden="true">${lines}${current}</svg>`);
}

function renderDeckEditor(): void {
  const priorSearch = root.querySelector<HTMLInputElement>('#editor-search');
  const restoreSearchFocus = priorSearch === document.activeElement;
  const selectionStart = restoreSearchFocus ? priorSearch?.selectionStart ?? null : null;
  const selectionEnd = restoreSearchFocus ? priorSearch?.selectionEnd ?? null : null;
  const matchingPool = () => Object.values(opusPh).filter(card => card.type !== 'Summon' ||
    opusPhRegistry.card(card.number).abilities.some(ability => ability.kind === 'summon'))
    .filter(card => editorQuery.trim() === '' || `${card.name} ${card.number}`.toLowerCase().includes(editorQuery.trim().toLowerCase()))
    .filter(card => editorType === 'all' || card.type === editorType)
    .filter(card => editorElement === 'all' || card.elements.includes(editorElement));
  const pool = matchingPool();
  const commanderOptions = Object.values(opusPh).filter(card => card.type === 'Forward' && card.rarity === 'L');
  const errors = editorValidation(editorDeck);
  const inspectCard = editorInspection ? opusPh[editorInspection] : undefined;
  const inspectionText = cardRulesText(inspectCard);
  root.innerHTML = `<section class="editor-page"><header class="editor-header"><button class="top-button" id="editor-back">← Menu</button><div><p class="eyebrow">COMMANDER DUEL · OPUS PLACEHOLDER</p><h2>Deck editor</h2></div><span class="deck-count">${editorDeck.main.length} / 19</span></header><div class="editor-toolbar"><label>PLAYER <select id="editor-seat"><option value="0" ${editorSeat === 0 ? 'selected' : ''}>1</option><option value="1" ${editorSeat === 1 ? 'selected' : ''}>2</option></select></label><label>COMMANDER <select id="editor-commander">${commanderOptions.map(card => `<option value="${card.number}" ${editorDeck.commander === card.number ? 'selected' : ''}>${card.name} · ${card.elements.join('/')}</option>`).join('')}</select></label><button class="primary small" id="save-deck" ${errors.length ? 'disabled' : ''}>Save for Player ${editorSeat + 1}</button></div><p class="editor-error" role="status">${editorError || errors.map(error => error.message).join(' ')}</p><div class="editor-toolbar editor-filters"><label>SEARCH <input id="editor-search" value="${editorQuery.replaceAll('"', '&quot;')}" placeholder="Card name or number" /></label><label>TYPE <select id="editor-type"><option value="all">All types</option><option>Forward</option><option>Backup</option><option>Summon</option></select></label><label>ELEMENT <select id="editor-element"><option value="all">All elements</option><option>Fire</option><option>Ice</option><option>Wind</option><option>Earth</option><option>Lightning</option><option>Water</option><option>Light</option><option>Dark</option></select></label></div><div class="editor-columns"><section><h3>Main deck <small>${editorDeck.main.length}/19</small></h3><div class="editor-list">${editorDeck.main.map(number => { const card = opusPh[number]!; return `<div class="editor-row"><span class="element-mark">${card.elements[0]}</span><strong class="editor-inspect" tabindex="0" role="button" aria-label="Inspect ${card.name}">${card.name}</strong><small>${number} · ${card.type} · ${card.cost}</small><button data-remove="${number}" aria-label="Remove ${card.name}">−</button></div>`; }).join('') || '<p class="subtle">Add cards from the catalog.</p>'}</div></section><section><h3>Card catalog <small>${pool.length} matching cards</small></h3><div class="editor-list">${pool.map(card => `<div class="editor-row"><span class="element-mark">${card.elements[0]}</span><strong class="editor-inspect" tabindex="0" role="button" aria-label="Inspect ${card.name}">${card.name}</strong><small>${card.number} · ${card.type} · ${card.cost}</small><button data-add="${card.number}" aria-label="Add ${card.name}" ${editorDeck.main.includes(card.number) || editorDeck.main.length >= 19 ? 'disabled' : ''}>+</button></div>`).join('')}</div></section></div>${inspectCard ? `<aside class="editor-inspection" role="region" aria-label="Card inspection"><div><p class="eyebrow">${inspectCard.number} · ${inspectCard.type} · ${inspectCard.elements.join(' / ')} · COST ${inspectCard.cost}${inspectCard.power === null ? '' : ` · ${inspectCard.power} POWER`}</p><h3>${inspectCard.name}</h3><p>${inspectionText}</p><small>${inspectCard.jobs.join(' · ')}${inspectCard.keywords.length ? ` · ${inspectCard.keywords.join(' · ')}` : ''}</small></div><button class="top-button" id="close-editor-inspection" aria-label="Close card inspection">Close</button></aside>` : ''}</section>`;
  const typeControl = root.querySelector<HTMLSelectElement>('#editor-type');
  if (typeControl) typeControl.value = editorType;
  const elementControl = root.querySelector<HTMLSelectElement>('#editor-element');
  if (elementControl) elementControl.value = editorElement;
  const catalogSection = root.querySelector<HTMLElement>('.editor-columns section:last-child');
  const catalogCount = catalogSection?.querySelector<HTMLElement>('h3 small');
  const catalogList = catalogSection?.querySelector<HTMLElement>('.editor-list');
  const updateCatalog = () => {
    const cards = matchingPool();
    if (catalogCount) catalogCount.textContent = `${cards.length} matching cards`;
    if (catalogList) catalogList.innerHTML = cards.map(card => `<div class="editor-row"><span class="element-mark">${card.elements[0]}</span><strong class="editor-inspect" tabindex="0" role="button" aria-label="Inspect ${card.name}">${card.name}</strong><small>${card.number} · ${card.type} · ${card.cost}</small><button data-add="${card.number}" aria-label="Add ${card.name}" ${editorDeck.main.includes(card.number) || editorDeck.main.length >= 19 ? 'disabled' : ''}>+</button></div>`).join('');
  };
  root.querySelector<HTMLInputElement>('#editor-search')?.addEventListener('input', event => {
    editorQuery = (event.currentTarget as HTMLInputElement).value;
    persistEditorFilters();
    updateCatalog();
  });
  root.querySelector<HTMLSelectElement>('#editor-type')?.addEventListener('change', event => {
    editorType = (event.currentTarget as HTMLSelectElement).value as typeof editorType;
    persistEditorFilters();
    updateCatalog();
  });
  root.querySelector<HTMLSelectElement>('#editor-element')?.addEventListener('change', event => {
    editorElement = (event.currentTarget as HTMLSelectElement).value as typeof editorElement;
    persistEditorFilters();
    updateCatalog();
  });
  root.querySelector('#editor-back')?.addEventListener('click', () => { screen = 'home'; render(); });
  const inspectEditorRow = (target: HTMLElement) => {
    if (!target.closest('.editor-inspect')) return false;
    const row = target.closest<HTMLElement>('.editor-row');
    const number = row?.querySelector('small')?.textContent?.split('·')[0]?.trim();
    if (!number || !opusPh[number]) return false;
    editorInspection = number;
    renderDeckEditor();
    return true;
  };
  root.addEventListener('click', event => {
    if (inspectEditorRow(event.target as HTMLElement)) return;
    if ((event.target as HTMLElement).closest('#close-editor-inspection')) {
      editorInspection = null;
      renderDeckEditor();
    }
  });
  root.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && inspectEditorRow(event.target as HTMLElement)) event.preventDefault();
  });
  root.querySelector('#editor-seat')?.addEventListener('change', event => {
    editorSeat = Number((event.currentTarget as HTMLSelectElement).value) as Seat;
    editorDeck = restoreEditorDraft(editorSeat) ?? createDeckEditor(savedDecks.find(deck => deck.id === `custom-${editorSeat}`)?.deck ?? (editorSeat === 0 ? cinderCompany : tidalAssembly));
    editorError = ''; renderDeckEditor();
  });
  root.querySelector('#editor-commander')?.addEventListener('change', event => {
    const number = (event.currentTarget as HTMLSelectElement).value;
    const issues = changeEditorCommander(editorDeck, number);
    editorDeck = { ...editorDeck, commander: number };
    persistEditorDraft();
    editorError = issues.map(error => error.message).join(' ');
    renderDeckEditor();
  });
  catalogList?.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-add]');
    if (!button) return;
    const number = button.dataset.add!;
    const issues = addEditorCard(editorDeck, number);
    if (issues.length) editorError = issues.map(error => error.message).join(' ');
    else { editorDeck = { ...editorDeck, main: [...editorDeck.main, number] }; editorError = ''; persistEditorDraft(); }
    renderDeckEditor();
  });
  root.querySelectorAll<HTMLElement>('[data-remove]').forEach(button => button.addEventListener('click', () => {
    editorDeck = removeEditorCard(editorDeck, button.dataset.remove!); editorError = ''; persistEditorDraft(); renderDeckEditor();
  }));
  root.querySelector('#save-deck')?.addEventListener('click', () => {
    const record = { id: `custom-${editorSeat}`, name: `Custom Player ${editorSeat + 1}`, deck: editorDeck };
    void saveDeck(record).then(() => { savedDecks = [...savedDecks.filter(deck => deck.id !== record.id), record]; clearEditorDraft(editorSeat); notice = ''; screen = 'home'; render(); })
      .catch(error => { editorError = error instanceof Error ? error.message : 'Could not save this deck.'; renderDeckEditor(); });
  });
  if (restoreSearchFocus) {
    const search = root.querySelector<HTMLInputElement>('#editor-search');
    search?.focus({ preventScroll: true });
    if (search && selectionStart !== null && selectionEnd !== null) search.setSelectionRange(selectionStart, selectionEnd);
  }
}

function cardTile(state: MatchView, instance: string, selectable = true, playable = false, targetable = false, costOverride?: number, activePaymentOffer?: PaymentOffer | null): string {
  const card = state.cards[instance]!;
  const def = opusPh[card.card];
  const presentation = state.presentations[card.object];
  const selected = selectedObject === card.object || orderSelection.includes(card.object);
  const paymentOffer = activePaymentOffer ?? (actionDraft && (actionDraft.stage === 'payment' || actionDraft.stage === 'review')
    ? state.actions.find(action => action.id === actionDraft!.offerId)?.payment : undefined);
  const paymentKind = paymentOffer?.backupOptions.includes(card.object) ? 'backup'
    : paymentOffer?.discardOptions.includes(card.object) ? 'discard' : null;
  const paymentSelected = paymentChoices.some(choice => choice.object === card.object);
  const rulesText = cardRulesText(def);
  const powerDelta = typeof def?.power === 'number' && typeof presentation?.power === 'number' ? presentation.power - def.power : 0;
  return `<button class="card ${card.dull ? 'dull' : ''} ${selected ? 'selected' : ''} ${playable ? 'playable' : ''} ${targetable ? 'targetable' : ''} ${paymentKind ? 'payment-candidate' : ''} ${paymentSelected ? 'payment-selected' : ''}" data-card="${card.object}" data-table-instance="${instance}" data-zone="${card.zone}" ${paymentKind ? `data-payment-option="${paymentKind}"` : ''} data-testid="card-${card.object}" aria-label="${nameOf(state, instance)}${targetable ? ', legal target' : ''}${paymentKind ? `, ${paymentKind} for CP` : ''}" ${selectable ? '' : 'disabled'}>
    <span class="card-cost">${costOverride ?? def?.cost ?? '·'}</span><strong>${nameOf(state, instance)}</strong><small>${def?.type ?? 'Card back'} · ${presentation?.power !== null && presentation?.power !== undefined ? `${presentation.power} power` : def?.elements.join(' / ') ?? ''}</small>
    ${rulesText ? `<span class="card-rules">${rulesText}</span>` : ''}${powerDelta ? `<span class="card-power-change ${powerDelta < 0 ? 'reduced' : 'increased'}">${powerDelta > 0 ? '+' : ''}${powerDelta}</span>` : ''}
    ${paymentSelected ? `<span class="payment-marker" aria-label="Selected for payment">${card.zone === 'field' ? 'Pay CP' : 'Selected for payment'}</span>` : ''}</button>`;
}
function render(): void {
  if (screen !== 'home' || enlargedObject || openPublicZone || actionDraft || handPointer) endTurnRequest = null;
  const previousLog = root.querySelector<HTMLElement>('.event-log [role="log"]');
  if (previousLog) {
    logScrollTop = previousLog.scrollTop;
    logScrollHeight = previousLog.scrollHeight;
    logFollowing = previousLog.scrollTop < 24;
  }
  root.classList.toggle('log-hidden', !logVisible);
  root.classList.toggle('targeting-active', castingSource !== null || abilityDraft !== null);
  if (handPointer) {
    let current: MatchView | null = null;
    try { current = host.view(handPointer.owner); } catch { /* No active match can retain a hand gesture. */ }
    const source = current ? findObject(current, handPointer.object) : null;
    if (screen !== 'home' || !current || current.generation !== handPointer.generation || current.seq !== handPointer.seq || source?.zone !== 'hand') {
      clearHandPointer();
    }
  }
  if (!hostStarted() || screen === 'active-menu') {
    if (screen === 'deck-editor') { renderDeckEditor(); return; }
    const priorScenario = root.querySelector<HTMLSelectElement>('#scenario-select')?.value;
    const priorDeckOne = root.querySelector<HTMLSelectElement>('#deck-one')?.value;
    const priorDeckTwo = root.querySelector<HTMLSelectElement>('#deck-two')?.value;
    const priorSeed = root.querySelector<HTMLInputElement>('#match-seed')?.value;
    root.innerHTML = homeMenu([savedDecks.some(deck => deck.id === 'custom-0'), savedDecks.some(deck => deck.id === 'custom-1')], hostStarted(), recoveryWarning, restoreComplete);
    if (notice) {
      const message = document.createElement('p');
      message.className = 'menu-notice';
      message.setAttribute('role', 'status');
      message.textContent = notice;
      root.querySelector('.splash')?.prepend(message);
    }
    if (priorScenario && root.querySelector(`#scenario-select option[value="${priorScenario}"]`)) root.querySelector<HTMLSelectElement>('#scenario-select')!.value = priorScenario;
    if (priorDeckOne && root.querySelector(`#deck-one option[value="${priorDeckOne}"]`)) root.querySelector<HTMLSelectElement>('#deck-one')!.value = priorDeckOne;
    if (priorDeckTwo && root.querySelector(`#deck-two option[value="${priorDeckTwo}"]`)) root.querySelector<HTMLSelectElement>('#deck-two')!.value = priorDeckTwo;
    if (priorSeed !== undefined) root.querySelector<HTMLInputElement>('#match-seed')!.value = priorSeed;
    root.querySelector('#offline-status')!.textContent = offlineStatus === 'ready' ? 'Ready for offline play' : offlineStatus === 'error' ? 'Offline setup failed' : offlineStatus === 'update' ? 'An update is ready' : 'Preparing offline play';
    root.querySelector('#export-stored-save')?.addEventListener('click', () => {
      void host.exportStoredRecord().then(contents => {
        if (!contents) { notice = 'There is no saved match record to export.'; render(); return; }
        const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = 'dissidia-preserved-save.json'; link.click(); URL.revokeObjectURL(url);
      }).catch(error => { notice = error instanceof Error ? error.message : 'Could not export the saved match.'; render(); });
    });
    root.querySelector('#discard-stored-save')?.addEventListener('click', () => {
      void host.clearSave().then(() => { recoveryWarning = null; notice = ''; render(); })
        .catch(error => { notice = error instanceof Error ? error.message : 'Could not clear the saved match.'; render(); });
    });
    root.querySelector('#new-match')?.addEventListener('click', () => {
      const one = root.querySelector<HTMLSelectElement>('#deck-one')?.value;
      const two = root.querySelector<HTMLSelectElement>('#deck-two')?.value;
      const supplied = Number(root.querySelector<HTMLInputElement>('#match-seed')?.value);
      const bytes = new Uint32Array(1); crypto.getRandomValues(bytes);
      const deckOne = one === 'custom-one' ? savedDecks.find(deck => deck.id === 'custom-0')?.deck : one === 'water' ? tidalAssembly : cinderCompany;
      const deckTwo = two === 'custom-two' ? savedDecks.find(deck => deck.id === 'custom-1')?.deck : two === 'fire' ? cinderCompany : tidalAssembly;
      handOrders.clear();
      host.start(Number.isSafeInteger(supplied) && supplied > 0 ? supplied : bytes[0]!, [deckOne ?? cinderCompany, deckTwo ?? tidalAssembly]);
      const view = host.view(); inspectedSeat = view.decisionSeat ?? view.priority ?? view.active; screen = 'home'; render();
    });
    root.querySelector('#start-scenario')?.addEventListener('click', () => {
      const id = root.querySelector<HTMLSelectElement>('#scenario-select')?.value;
      if (!id) return;
      host.startScenario(id);
      const view = host.view(); inspectedSeat = view.decisionSeat ?? view.priority ?? view.active; selectedObject = null; screen = 'home'; render();
    });
    root.querySelector('#resume-match')?.addEventListener('click', () => { screen = 'home'; render(); });
    root.querySelector('#abandon-match')?.addEventListener('click', () => {
      if (!window.confirm('Abandon this match and remove its saved progress?')) return;
      void host.abandon().then(() => { screen = 'home'; notice = ''; render(); });
    });
    root.querySelector('#edit-decks')?.addEventListener('click', () => {
      editorSeat = 0;
      editorDeck = restoreEditorDraft(editorSeat) ?? createDeckEditor(savedDecks.find(deck => deck.id === 'custom-0')?.deck ?? cinderCompany);
      editorError = ''; screen = 'deck-editor'; renderDeckEditor();
    });
    if (offlineStatus === 'update') {
      root.querySelector('#new-match')?.insertAdjacentHTML('afterend', `<button class="soft" id="apply-update" ${restoreComplete ? '' : 'disabled'}>Install update</button>`);
      root.querySelector('#apply-update')?.addEventListener('click', () => {
        void host.requestUpdate().then(result => {
          if (!result.allowed) { notice = result.reason ?? 'Update is not available yet.'; render(); return; }
          applyUpdate();
        });
      });
    }
    return;
  }
  const inspectedView = host.view(inspectedSeat);
  if (matchController) {
    const hadDraft = matchController.draft !== null;
    matchController.acceptView(inspectedView);
    if (hadDraft && matchController.draft === null) {
      castingSource = null; abilityDraft = null; actionDraft = null; paymentChoices = []; selectedSpecialDiscard = null;
      targetSelection = []; selectedMode = null; choiceSelection = [];
      notice = matchController.explanation ?? notice;
    }
    matchController.inspectSeat(inspectedSeat);
  } else {
    matchController = new MatchController(inspectedView);
  }
  const decision = inspectedView.decisionSeat;
  const bottomSeat = inspectedSeat;
  const state = host.view(bottomSeat);
  const view = state;
  const actionView = state;
  const choice = state.choice;
  const choiceSelectionInvalid = validateChoiceDraft(choice, { choiceId: choice?.id ?? '', selected: choiceSelection, amounts: allocationDraft }).length > 0;
  const orderSelectionInvalid = validateChoiceDraft(choice, { choiceId: choice?.id ?? '', selected: orderSelection, amounts: {} }).length > 0;
  const other: Seat = bottomSeat === 0 ? 1 : 0;
  const bottom = state.zones[bottomSeat];
  const top = state.zones[other];
  const selected = selectedObject ? findObject(state, selectedObject) : null;
  const selectedDef = selected ? opusPh[selected.card] : null;
  const selectedRulesText = cardRulesText(selectedDef);
  const groupedLog: { event: import('./rules/types').RuleEvent; text: string; count: number; autoSeats: number[] }[] = [];
  for (const event of view.log) {
    const text = eventText(event);
    const previous = groupedLog.at(-1);
    const automaticPass = event.type === 'priority.passed' && automaticEventIds.has(event.id);
    const seat = automaticPass ? Number((event.data as Record<string, unknown>).seat) + 1 : null;
    if (previous && (previous.text === text || (automaticPass && previous.autoSeats.length > 0))) {
      previous.count += 1;
      if (seat !== null && !previous.autoSeats.includes(seat)) previous.autoSeats.push(seat);
      if (automaticPass) previous.text = `${previous.autoSeats.map(value => `Player ${value}`).join(' and ')} passed priority automatically.`;
    } else groupedLog.push({ event, text, count: 1, autoSeats: seat === null ? [] : [seat] });
  }
  const logItems = groupedLog.reverse().map(({ event, text, count }) => `<li data-rule-event="${event.id}">${text}${count > 1 ? ` × ${count}` : ''}</li>`).join('');
  const stackEntries = state.stack.map((item, index) => {
    const definition = opusPh[item.lastKnown.card];
    const ability = definition?.abilities.find(candidate => candidate.id === item.ability);
    const targets = item.targets.map(object => {
      const target = findObject(state, object);
      return target ? opusPh[target.card]?.name ?? target.card : 'Hidden card';
    });
    return `<li data-stack-entry="${item.id}" data-resolving="false"><strong>${state.stack.length - index}. ${definition?.name ?? item.lastKnown.card}</strong><span>Player ${item.controller + 1} · ${ability?.text ?? item.ability}</span><small>Targets: ${targets.length ? targets.join(', ') : 'None'}</small></li>`;
  });
  if (state.resolving) {
    const definition = opusPh[state.resolving.lastKnown.card];
    const ability = definition?.abilities.find(candidate => candidate.id === state.resolving!.ability);
    const targets = state.resolving.targets.map(object => {
      const target = findObject(state, object);
      return target ? opusPh[target.card]?.name ?? target.card : 'Hidden card';
    });
    stackEntries.unshift(`<li data-stack-entry="resolving-${state.resolving.source}" data-resolving="true"><strong>Resolving ${definition?.name ?? state.resolving.lastKnown.card}</strong><span>Player ${state.resolving.controller + 1} · ${ability?.text ?? state.resolving.ability}</span><small>Targets: ${targets.length ? targets.join(', ') : 'None'}</small></li>`);
  }
  const zoneButtons = (seat: Seat) => `<div class="public-piles" aria-label="Player ${seat + 1} public zones"><button class="zone-pile deck-pile" data-open-zone="deck" data-zone-seat="${seat}" aria-label="Inspect Player ${seat + 1} deck"><span>DECK</span><b>${state.deckCounts[seat]}</b></button>${(['break', 'damage', 'removed'] as const).map(zone => `<button class="zone-pile ${zone}-pile" data-open-zone="${zone}" data-zone-seat="${seat}" aria-label="Inspect Player ${seat + 1} ${zone} zone"><span>${zone.toUpperCase()}</span><b>${state.zones[seat][zone].length}</b></button>`).join('')}</div>`;
  const publicCards = openPublicZone && openPublicZone.zone !== 'deck'
    ? state.zones[openPublicZone.seat][openPublicZone.zone].map(instance => cardTile(state, instance, true)).join('') : '';
  const publicZoneDialog = openPublicZone ? `<section class="zone-inspection" role="dialog" aria-modal="true" aria-label="Player ${openPublicZone.seat + 1} ${openPublicZone.zone} zone"><button class="zone-inspection-close" data-close-zone aria-label="Close zone">×</button><h2>Player ${openPublicZone.seat + 1} ${openPublicZone.zone === 'deck' ? 'Deck' : openPublicZone.zone === 'break' ? 'Break Zone' : openPublicZone.zone === 'damage' ? 'Damage Zone' : 'Removed Zone'}</h2>${openPublicZone.zone === 'deck' ? `<p>${state.deckCounts[openPublicZone.seat]} cards remain. Their identities and order are hidden.</p>` : `<div class="zone-inspection-cards">${publicCards || '<p>No cards in this zone.</p>'}</div>`}</section>` : '';
  const enlargedCard = enlargedObject ? findObject(state, enlargedObject) : null;
  const enlargedDefinition = enlargedCard ? opusPh[enlargedCard.card] : null;
  const enlargedPresentation = enlargedCard ? state.presentations[enlargedCard.object] : null;
  const inspectorDialog = enlargedCard && enlargedDefinition ? `<section class="card-inspector" role="dialog" aria-modal="true" aria-label="Inspect ${enlargedDefinition.name}"><header class="inspector-header"><h2>${enlargedDefinition.name}</h2><button class="inspector-close" data-close-inspector aria-label="Close card inspection">&times;</button></header><div class="inspector-columns"><article class="inspector-face" aria-label="Card face"><span class="card-cost">${enlargedDefinition.cost}</span><h3>${enlargedDefinition.name}</h3><p>${enlargedDefinition.type} | ${enlargedDefinition.elements.join(' / ')}</p>${cardRulesText(enlargedDefinition) ? `<p>${cardRulesText(enlargedDefinition)}</p>` : ''}</article><article class="inspector-details"><p>Cost ${enlargedDefinition.cost} CP | ${enlargedDefinition.type} | ${enlargedDefinition.elements.join(' / ')}</p><p>${enlargedDefinition.number} | ${enlargedDefinition.jobs.join(' / ')}</p>${cardRulesText(enlargedDefinition) ? `<p>${cardRulesText(enlargedDefinition)}</p>` : ''}<p>${typeof enlargedDefinition.power === 'number' ? `Printed ${enlargedDefinition.power} | <strong class="effective-power ${(enlargedPresentation?.power ?? enlargedDefinition.power) < enlargedDefinition.power ? 'reduced' : (enlargedPresentation?.power ?? enlargedDefinition.power) > enlargedDefinition.power ? 'increased' : ''}">Effective ${enlargedPresentation?.power ?? enlargedDefinition.power}</strong>` : ''}</p><p>Owner Player ${enlargedCard.owner + 1} | Controller Player ${enlargedCard.controller + 1} | ${enlargedCard.zone}</p></article></div></section>` : '';
  const commander = state.cards[state.commanders[bottomSeat].instance]!;
  const opponentCommander = state.cards[state.commanders[other].instance]!;
  const playableObjects = new Set(actionView.castAccess.filter(access => access.canDeclare).map(access => access.source));
  const selectedCastAccess = selected ? actionView.castAccess.find(access => access.source === selected.object) : undefined;
  const castUnavailableReason = selectedCastAccess?.blockedReasons[0]?.message ?? 'This card cannot be cast now.';
  const bottomCommanderIdentity = ['field', 'hand', 'stack'].includes(commander.zone) ? '' : `data-table-instance="${commander.instance}"`;
  const opponentCommanderIdentity = ['field', 'stack'].includes(opponentCommander.zone) ? '' : `data-table-instance="${opponentCommander.instance}"`;
  const commanderSlot = commander.zone === 'commander'
    ? cardTile(state, commander.instance, true, playableObjects.has(commander.object) && !!makePayment(state, bottomSeat, commander.object, opusPh[commander.card]!.cost + state.commanders[bottomSeat].casts * 2), false, opusPh[commander.card]!.cost + state.commanders[bottomSeat].casts * 2)
    : `<div class="commander-status" ${bottomCommanderIdentity} data-zone="${commander.zone}"><span>COMMANDER</span><b>${opusPh[commander.card]!.name}</b><small>Tax · ${state.commanders[bottomSeat].casts * 2} CP · ${commander.zone === 'field' ? 'In play' : `In ${commander.zone}`}</small></div>`;
  const opponentCommanderSlot = opponentCommander.zone === 'commander'
    ? cardTile(state, opponentCommander.instance, false)
    : `<div class="commander-status" ${opponentCommanderIdentity} data-zone="${opponentCommander.zone}"><span>COMMANDER</span><b>${opusPh[opponentCommander.card]!.name}</b><small>${opponentCommander.zone === 'field' ? 'In play' : `In ${opponentCommander.zone}`}</small></div>`;
  const commanderTray = actionView.cardTray.otherZones.map(item => {
    const cast = item.cast;
    const card = findObject(state, item.card.object);
    return card && card.zone !== 'commander' ? `<div class="other-zone-card"><span class="other-zone-badge">${card.zone.toUpperCase()}</span>${cardTile(state, card.instance, true, !!cast?.canDeclare && !!makePayment(state, bottomSeat, item.card.object, cast.displayedCost), false, cast?.displayedCost)}</div>` : '';
  }).join('');
  const draftedAbility = abilityDraft && findObject(state, abilityDraft.source)
    ? opusPh[findObject(state, abilityDraft.source)!.card]?.abilities.find(ability => ability.id === abilityDraft!.abilityId) : undefined;
  const paymentOffer: PaymentOffer | null = actionDraft
    ? state.actions.find(item => item.id === actionDraft!.offerId)?.payment ?? null : null;
  const paymentState = actionDraft && paymentOffer
    ? buildPaymentDraft(actionDraft, paymentOffer, paymentChoices, selectedSpecialDiscard) : null;
  const paymentPanel = actionDraft && paymentOffer && paymentState ? renderPaymentPanel({
    cost: paymentOffer.cost, commanderTax: paymentOffer.commanderTax,
    generated: Object.values(paymentState.generated).reduce((sum, amount) => sum + (amount ?? 0), 0),
    spent: Object.values(paymentState.spent).reduce((sum, amount) => sum + (amount ?? 0), 0),
    remainder: paymentState.remainder, dullSource: paymentOffer.dullSource,
    sacrificeSource: paymentOffer.sacrificeSource, reason: paymentState.reason,
    excludedPaymentCards: state.zones[bottomSeat].hand.flatMap(instance => {
      const card = state.cards[instance]!;
      const definition = opusPh[card.card];
      return definition?.elements.some(element => element === 'Light' || element === 'Dark') ? [definition.name] : [];
    }),
    sources: [
      ...paymentOffer.backupOptions.map(object => ({ object, kind: 'backup' as const })),
      ...paymentOffer.discardOptions.map(object => ({ object, kind: 'discard' as const })),
    ].flatMap(({ object, kind }) => {
      const card = findObject(state, object);
      const definition = card ? opusPh[card.card] : null;
      if (!card || !definition) return [];
      const colorless = paymentOffer.elements.some(element => element === 'Light' || element === 'Dark');
      return definition.elements.filter(element => colorless || paymentOffer.elements.includes(element)).map(element => ({
        object, label: definition.name, element, kind,
        selected: paymentChoices.some(choice => choice.object === object && choice.element === element),
      }));
    }),
    specialOptions: paymentOffer.specialOptions.flatMap(object => {
      const card = findObject(state, object);
      return card ? [{ object, label: opusPh[card.card]?.name ?? card.card }] : [];
    }),
    specialDiscard: selectedSpecialDiscard,
  }) : '';
  const breakTargets = draftedAbility?.activation?.target.zones.includes('break')
    ? `<section class="break-targets" aria-label="Break Zone targets"><span class="zone-label">CHOOSE FROM BREAK ZONE</span>${bottom.break.map(instance => cardTile(state, instance, true, false, legalDraftTarget(state, state.cards[instance]!.object))).join('')}</section>` : '';
  const selectedActions = selected && selectedDef ? [
    (selected.zone === 'hand' || selected.zone === 'commander') && (selected.controller === bottomSeat || selected.owner === bottomSeat) && selectedDef.type !== 'Summon'
      ? castingSource === selected.object
        ? `<button class="primary small" id="confirm-cast" ${!paymentState?.valid ? 'disabled' : ''}>${selected.zone === 'commander' ? 'Confirm Commander cast' : 'Confirm cast'} · ${selected.zone === 'commander' ? selectedDef.cost + state.commanders[bottomSeat].casts * 2 : selectedDef.cost} CP</button>`
        : `<button class="primary small" id="play-card" ${!playableObjects.has(selected.object) ? `disabled title="${castUnavailableReason}" aria-label="${selectedDef.name} unavailable: ${castUnavailableReason}"` : ''}>${playableObjects.has(selected.object) ? `${selected.zone === 'commander' ? 'Review Cast Commander' : 'Review cast'} · ${selected.zone === 'commander' ? selectedDef.cost + state.commanders[bottomSeat].casts * 2 : selectedDef.cost} CP` : `Unavailable · ${selected.zone === 'commander' ? selectedDef.cost + state.commanders[bottomSeat].casts * 2 : selectedDef.cost} CP`}</button>` : '',
    (selected.zone === 'hand') && selectedDef.type === 'Summon' && !!selectedDef.summonTarget
      ? castingSource === selected.object && targetSelection.length >= requiredTargets(selectedDef.number) &&
        (!selectedDef.summonTarget.modes?.length || selectedMode !== null)
        ? `<button class="primary small" id="confirm-summon" ${!paymentState?.valid ? 'disabled' : ''}>Confirm Summon · ${selectedDef.cost} CP</button>`
        : `<button class="primary small" id="play-summon" ${!playableObjects.has(selected.object) ? `disabled title="${castUnavailableReason}" aria-label="${selectedDef.name} unavailable: ${castUnavailableReason}"` : ''}>${playableObjects.has(selected.object) ? `Review Summon · ${selectedDef.cost} CP` : `Unavailable · ${selectedDef.cost} CP`}</button>` : '',
    castingSource === selected.object && !!selectedDef.summonTarget?.modes?.length && !selectedMode
      ? selectedDef.summonTarget.modes.map(mode => `<button class="soft small" data-mode="${mode.id}">${mode.label}</button>`).join('') : '',
    selected.zone === 'field' && selected.controller === bottomSeat ? selectedDef.abilities.filter(ability => ability.activation && ability.kind !== 'auto' && actionView.actions.some(action => action.kind === 'activate' && action.source === selected.object && action.ability === ability.id))
      .map(ability => `<button class="soft small" data-ability="${ability.id}" aria-label="${ability.kind === 'special' ? 'Use special ability' : 'Activate ability'}" title="${ability.text}" ${selected.dull ? 'disabled' : ''}>${ability.kind === 'special' ? 'Special ability' : 'Activate ability'}</button>`).join('') : '',
    abilityDraft?.source === selected.object && targetSelection.length === 1
      ? `<button class="primary small" id="confirm-ability" ${!paymentState?.valid ? 'disabled' : ''}>Confirm ability</button>` : '',
    selected.zone === 'field' && selected.controller === bottomSeat && selectedDef.type === 'Forward' && state.phase === 'attack' && state.active === bottomSeat && state.priority === bottomSeat && !state.combat && actionView.actions.some(action => action.kind === 'attack' && action.source === selected.object)
      ? `<button class="primary small" id="toggle-party-member">${partyDraft.includes(selected.object) ? 'Remove from attack party' : 'Add to attack party'}</button>` : '',
    selected.zone === 'field' && selected.controller === bottomSeat && selectedDef.type === 'Forward' && state.phase === 'attack' && state.active !== bottomSeat && state.combat?.step === 'block' && state.priority === bottomSeat && !state.combat.blocker
      ? '<button class="primary small" id="block-card">Block this attack</button>' : '',
  ].join('') : '';
  const choiceActions = choice?.kind === 'order'
    ? `<div class="choice-options">${choice.options.map(option => { const selectedIndex = orderSelection.indexOf(option.id); return `<button class="${selectedIndex >= 0 ? 'primary' : 'soft'} choice-peer" data-order-choice="${option.id}">${selectedIndex >= 0 ? `${selectedIndex + 1}. ` : ''}${option.label}</button>`; }).join('')}</div><button class="soft choice-peer" id="clear-order">Clear</button><button class="primary choice-peer" id="confirm-order" ${orderSelection.length !== choice.min ? 'disabled' : ''}>Confirm order</button>`
    : choice?.kind === 'allocation'
      ? `<div class="choice-options">${choice.options.map(option => `<label class="allocation-option">${option.label}<input type="number" data-allocation="${option.id}" min="0" step="${choice.allocation?.increment ?? 1}" value="${allocationDraft[option.id] ?? 0}" /></label>`).join('')}<span id="allocation-total">${Object.values(allocationDraft).reduce((sum, amount) => sum + amount, 0)} / ${choice.allocation?.total ?? 0}</span></div><button class="primary choice-peer" id="confirm-allocation" ${Object.values(allocationDraft).reduce((sum, amount) => sum + amount, 0) !== (choice.allocation?.total ?? 0) ? 'disabled' : ''}>Confirm allocation</button>`
      : choice
        ? `<div class="choice-options">${choice.options.map(option => `<button class="${choiceSelection.includes(option.id) ? 'primary' : 'soft'} choice-peer" data-choice="${option.id}" aria-pressed="${choiceSelection.includes(option.id)}">${option.label}</button>`).join('')}</div>${choice.max > 1 ? `<button class="primary choice-peer" id="confirm-choice" ${choiceSelection.length < choice.min || choiceSelection.length > choice.max ? 'disabled' : ''}>Confirm choice</button>` : ''}`
        : '';
  const prompt = choice ? `<section class="choice-panel" role="region" aria-label="Required choice"><div class="choice-copy"><span class="eyebrow">PLAYER ${choice.seat + 1} DECISION</span><strong>${choice.reason}</strong><small>${choice.kind === 'order' ? `Choose order ${orderSelection.length}/${choice.max}` : choice.kind === 'allocation' ? `Assign ${choice.allocation?.total ?? 0} in steps of ${choice.allocation?.increment ?? 1}` : choice.max > 1 ? `Choose ${choice.min}–${choice.max} · ${choiceSelection.length} selected` : ''}</small></div><div class="choice-actions">${choiceActions}</div></section>` : '';
  const fieldRows = ([other, bottomSeat] as Seat[]).map(owner => {
    const controlled = state.field.filter(instance => state.cards[instance]!.controller === owner);
    const cardsOfType = (type: 'Forward' | 'Backup') => controlled.filter(instance => opusPh[state.cards[instance]!.card]!.type === type);
    const row = (type: 'Forward' | 'Backup') => cardsOfType(type)
      .map(instance => cardTile(state, instance, true, false, legalDraftTarget(state, state.cards[instance]!.object), undefined, paymentOffer)).join('') || `<span class="row-empty">No ${type.toLowerCase()}s</span>`;
    const centerRow = owner === other ? 'Backup' : 'Forward';
    const edgeRow = centerRow === 'Forward' ? 'Backup' : 'Forward';
    const markup = (type: 'Forward' | 'Backup') => `<div class="field-row ${type === 'Backup' ? 'backups' : ''} ${cardsOfType(type).length ? '' : 'empty'}" role="region" aria-label="Player ${owner + 1} ${type}s">${row(type)}</div>`;
    return `<div class="field-seat" data-seat="${owner}"><div class="field-seat-label">PLAYER ${owner + 1}</div>${markup(centerRow)}${markup(edgeRow)}</div>`;
  }).join('');
  const partyControl = state.phase === 'attack' && state.active === bottomSeat && state.priority === bottomSeat && !state.combat && partyDraft.length > 0
    ? `<button class="primary" id="attack-party">Attack with ${partyDraft.length} Forward${partyDraft.length === 1 ? '' : 's'}</button>`
    : '';
  root.innerHTML = `<header class="topbar"><a class="brand" href="#"><span class="brand-mark">D</span> DISSIDIA <small>PLAYTEST</small></a>${!logVisible ? `<div class="match-meta">Turn ${state.turn || 'Setup'} | ${phaseName(state.phase)}</div>` : ''}<div class="top-actions"><button class="top-button" id="toggle-log" aria-expanded="${logVisible}">${logVisible ? 'Hide log' : 'Show log'}</button><button class="top-button" id="inspect">Inspect Player ${other + 1}</button><button class="top-button" id="concede">Concede</button></div></header>
    <section class="table" aria-label="Game table" data-turn="${state.turn}" data-phase="${state.phase}" data-view-seq="${state.seq}" data-generation="${state.generation}"><div class="player-row opponent"><div class="player-info"><span class="avatar blue">${other + 1}</span><div><strong>Player ${other + 1}</strong><small>${state.active === other ? 'ACTIVE PLAYER' : 'WAITING'}</small></div><span class="damage"><b>${top.damage.length}</b><small> / 7</small></span></div><div class="opponent-zones"><div class="zone-label">COMMAND ZONE</div>${opponentCommanderSlot}<div class="opponent-hand" aria-label="Player ${other + 1} hand">${Array.from({length: top.hand.length}, () => '<span class="back"></span>').join('')}</div>${zoneButtons(other)}</div></div>
    <div class="center-table" id="battlefield-drop"><div class="center-caption">${state.stack.length ? `STACK · ${state.stack.length}` : 'BATTLEFIELD'}</div><div class="battlefield" aria-label="Battlefield">${fieldRows}</div><div class="stack-row">${state.stackCards.map(instance => { const card = state.cards[instance]!; return cardTile(state, instance, true, false, legalDraftTarget(state, card.object)); }).join('')}</div></div>
    <div class="player-row current" data-seat="${bottomSeat}"><div class="player-info"><span class="avatar red">${bottomSeat + 1}</span><div><strong>Player ${bottomSeat + 1}</strong><small>${state.priority === bottomSeat ? 'YOUR PRIORITY' : `PLAYER ${state.active + 1} TURN`}</small></div><span class="damage"><b>${bottom.damage.length}</b><small> / 7</small></span></div><div class="own-zones"><div class="zone-label">COMMAND ZONE</div>${commanderSlot}${zoneButtons(bottomSeat)}</div><div class="hand-zone"><div class="zone-label">PLAYER ${bottomSeat + 1} · HAND <span>${bottom.hand.length}</span></div><div class="other-zone-tray" aria-label="Playable cards from other zones">${commanderTray}</div><div class="hand-fan${bottom.hand.length <= 7 ? ' hand-fan-spread' : ''}" data-seat="${bottomSeat}" aria-label="Player ${bottomSeat + 1} hand">${orderedHand(bottomSeat, bottom.hand).map(instance => { const card = state.cards[instance]!; return cardTile(state, instance, true, playableObjects.has(card.object) && !!makePayment(state, bottomSeat, card.object, opusPh[card.card]!.cost), false, undefined, paymentOffer); }).join('')}</div></div></div></section>
    ${breakTargets}${prompt}
    ${logVisible ? `<aside class="event-log" role="region" aria-label="Game activity"><header class="log-header"><strong>MATCH LOG</strong><div>Turn ${state.turn || 'Setup'} | Player ${state.active + 1} | ${phaseName(state.phase)}</div></header>${stackEntries.length ? `<section class="stack-details" role="region" aria-label="Stack details"><div class="eyebrow">STACK DETAILS</div><ol aria-label="Stack entries">${stackEntries.join('')}</ol></section>` : ''}<ul role="log" aria-label="Game log">${logItems || '<li>Accepted actions will appear here.</li>'}</ul></aside>` : ''}${publicZoneDialog}${inspectorDialog}
    <footer class="bottom-bar"><div class="selection-area">${selected && selectedDef ? `<div class="selected-preview"><span class="eyebrow">${selectedDef.type} · ${selectedDef.elements.join(' / ')}</span><strong>${selectedDef.name}</strong><small class="selection-detail">${selectedRulesText}</small>${selectedActions}${paymentPanel}${castingSource || abilityDraft ? '<button class="soft small" id="cancel-draft" aria-label="Cancel action">Cancel</button>' : !choice ? '<button class="soft small" id="clear-selection">Clear selection</button>' : ''}</div>` : `<div class="empty-selection"><span class="eyebrow">CHOICE</span><strong>${choice ? choice.reason : 'Select a card to inspect'}</strong><small>${choice ? 'Use the decision controls above to continue.' : notice || 'Cards glow when an action is available.'}</small></div>`}</div><div class="phase-controls"><span class="seat-label">DECISION · PLAYER ${(decision ?? bottomSeat) + 1}</span>${partyControl}${endTurnRequest ? '<button class="soft" id="cancel-end-turn">Cancel End Turn</button>' : ''}${autoBudgetPaused ? '<button class="soft" id="continue-auto">Continue Smart Priority</button>' : ''}${!choice && state.priority === bottomSeat ? `<button class="soft" id="toggle-hold" aria-pressed="${priorityHolds[bottomSeat]}">Hold Priority: ${priorityHolds[bottomSeat] ? 'On' : 'Off'}</button><button class="primary" id="pass">Pass priority</button>${state.active === bottomSeat && !state.combat && !actionDraft ? `<button class="soft" id="end-turn" ${priorityHolds[bottomSeat] ? 'disabled title="Turn off Hold Priority to use End Turn"' : ''}>End Turn</button>` : ''}` : '<button class="soft" disabled>Await decision</button>'}<button class="top-button" id="main-menu">Menu</button></div></footer>
    ${state.result ? `<div class="result-overlay"><h2>${state.result.winner === null ? 'Draw game' : `Player ${state.result.winner + 1} wins`}</h2><p>${state.result.reason === 'damage' ? 'Seven damage' : state.result.reason}</p><button class="primary" id="new-match">New match</button><button class="top-button" id="result-export-save">Export save</button><button class="soft" id="result-menu">Return to menu</button></div>` : ''}<div class="toast" role="status">${notice || host.persistenceError || ''}${host.persistenceError ? '<button class="soft small" id="retry-save">Retry save</button>' : ''}</div>`;

  const logScroller = root.querySelector<HTMLElement>('.event-log [role="log"]');
  if (logScroller) logScroller.scrollTop = logFollowing ? 0 : logScrollTop + logScroller.scrollHeight - logScrollHeight;
  root.querySelector('#toggle-log')?.addEventListener('click', () => { logVisible = !logVisible; render(); });
  root.querySelector('#clear-selection')?.addEventListener('click', () => { selectedObject = null; render(); });
  root.querySelector('#cancel-end-turn')?.addEventListener('click', () => { endTurnRequest = null; autoScheduledKey = null; render(); });
  root.querySelector('#end-turn')?.addEventListener('click', () => {
    endTurnRequest = endTurnRequest ? null : { generation: state.generation, turn: state.turn, seat: bottomSeat };
    selectedObject = null; autoScheduledKey = null; autoBurstCount = 0; autoBudgetPaused = false; render();
  });

  if (selected && selectedDef) {
    const status = [selected.dull ? 'Dull' : '', selected.frozen ? 'Freeze' : '', selected.damage ? `${selected.damage} damage` : '']
      .filter(Boolean).join(' · ') || 'Ready';
    const presentation = state.presentations[selected.object];
    const keywords = presentation?.keywords.length ? `Keywords: ${presentation.keywords.join(', ')}` : '';
    const effectivePower = typeof selectedDef.power === 'number'
      ? state.presentations[selected.object]?.power ?? selectedDef.power : null;
    const powerDelta = effectivePower === null ? 0 : effectivePower - selectedDef.power!;
    const power = typeof selectedDef.power === 'number'
      ? ` · Printed ${selectedDef.power} · <strong class="effective-power ${powerDelta < 0 ? 'reduced' : powerDelta > 0 ? 'increased' : ''}">Effective ${effectivePower}${powerDelta ? ` (${powerDelta > 0 ? '+' : ''}${powerDelta})` : ''}</strong>` : '';
    const commanderTax = presentation?.commander ? ` · Commander tax ${presentation.commanderTax} CP` : '';
    root.querySelector('.selection-detail')?.insertAdjacentHTML('afterend',
      `<small class="card-inspection-meta">Owner Player ${selected.owner + 1} · Controller Player ${selected.controller + 1} · ${selected.zone} · ${status}${keywords ? ` · ${keywords}` : ''}${power}${commanderTax}</small>`);
  }
  root.querySelector('.top-actions')?.insertAdjacentHTML('beforeend', '<button class="top-button" id="export-save">Export save</button><label class="top-button import-button" for="import-save">Import</label><input id="import-save" type="file" accept="application/json,.json" hidden />');
  root.querySelector('#inspect')?.addEventListener('click', () => { endTurnRequest = null; inspectedSeat = other; matchController?.inspectSeat(other); render(); });
  root.querySelector('#toggle-hold')?.addEventListener('click', () => {
    endTurnRequest = null;
    priorityHolds[bottomSeat] = !priorityHolds[bottomSeat];
    try { localStorage.setItem('dissidia-priority-holds', JSON.stringify(priorityHolds)); } catch { /* Hold remains available until reload when storage is disabled. */ }
    autoScheduledKey = null;
    render();
  });
  root.querySelector('#continue-auto')?.addEventListener('click', () => {
    autoBurstCount = 0; autoBudgetPaused = false; autoScheduledKey = null; notice = ''; render();
  });
  const confirmChoice = root.querySelector<HTMLButtonElement>('#confirm-choice');
  if (confirmChoice) confirmChoice.disabled = choiceSelectionInvalid;
  const confirmOrder = root.querySelector<HTMLButtonElement>('#confirm-order');
  if (confirmOrder) confirmOrder.disabled = orderSelectionInvalid;
  const confirmAllocation = root.querySelector<HTMLButtonElement>('#confirm-allocation');
  if (confirmAllocation) confirmAllocation.disabled = validateChoiceDraft(choice, {
    choiceId: choice?.id ?? '', selected: [], amounts: allocationDraft,
  }).length > 0;
  root.querySelector('#retry-save')?.addEventListener('click', () => {
    void host.retrySave().then(saved => {
      notice = saved ? 'Match save restored.' : host.persistenceError ?? 'Could not save the match.';
      render();
    });
  });
  root.querySelector('#main-menu')?.addEventListener('click', () => { selectedObject = null; screen = 'active-menu'; render(); });
  root.querySelector('#result-menu')?.addEventListener('click', () => { selectedObject = null; screen = 'active-menu'; render(); });
  root.querySelector('#new-match')?.addEventListener('click', () => {
    host.start(1); const view = host.view(); inspectedSeat = view.decisionSeat ?? view.active; notice = ''; screen = 'home'; render();
  });
  root.querySelector('#concede')?.addEventListener('click', () => command(bottomSeat, { kind: 'concede' }, state));
  root.querySelectorAll<HTMLButtonElement>('#export-save, #result-export-save').forEach(button => button.addEventListener('click', () => {
    void host.exportSave().then(contents => {
      const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `dissidia-turn-${state.turn}-seq-${state.seq}.json`; link.click(); URL.revokeObjectURL(url);
    });
  }));
  root.querySelector<HTMLInputElement>('#import-save')?.addEventListener('change', event => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    void file.text().then(contents => host.importSave(contents)).then(result => {
      notice = result.reason ?? '';
      if (result.imported) { const view = host.view(); inspectedSeat = view.decisionSeat ?? view.priority ?? view.active; screen = 'home'; }
      render();
    });
  });
  root.querySelector('#pass')?.addEventListener('click', () => command(bottomSeat, { kind: 'pass' }, state));
  root.querySelector('#toggle-party-member')?.addEventListener('click', () => {
    if (!selected || selected.zone !== 'field') return;
    partyDraft = toggleSelection(partyDraft, selected.object);
    render();
  });
  root.querySelector('#attack-party')?.addEventListener('click', () => {
    if (partyDraft.length === 0) return;
    command(bottomSeat, { kind: 'attack', members: [...partyDraft] }, state);
  });
  root.querySelector('#play-card')?.addEventListener('click', () => selected && beginCast(state, bottomSeat, selected.object));
  root.querySelector('#confirm-cast')?.addEventListener('click', () => {
    if (!actionDraft || !paymentState?.valid || actionDraft.generation !== state.generation || actionDraft.seq !== state.seq ||
        actionDraft.seat !== bottomSeat || actionDraft.source !== selected?.object) return;
    command(bottomSeat, declarationIntent(paymentState.draft), state);
  });
  root.querySelector('#play-summon')?.addEventListener('click', () => selected && beginCast(state, bottomSeat, selected.object));
  root.querySelector('#confirm-summon')?.addEventListener('click', () => castingSource && castSummon(state, bottomSeat, castingSource, targetSelection));
  root.querySelector('#confirm-ability')?.addEventListener('click', () => sendAbility(state, bottomSeat, targetSelection));
  root.querySelector('#cancel-draft')?.addEventListener('click', () => {
    selectedObject = null; castingSource = null; abilityDraft = null; actionDraft = null; paymentChoices = []; selectedSpecialDiscard = null; targetCursor = null;
    targetSelection = []; selectedMode = null; matchController?.clearDraft(); notice = ''; render();
  });
  root.querySelectorAll<HTMLElement>('[data-mode]').forEach(button => button.addEventListener('click', () => {
    selectedMode = button.dataset.mode!;
    if (actionDraft) actionDraft = { ...actionDraft, mode: selectedMode, stage: 'targets' };
    notice = 'Choose a legal target for this mode.'; render();
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-payment-source]').forEach(button => button.addEventListener('click', () => {
    if (!actionDraft || !paymentOffer) return;
    const object = button.dataset.paymentSource!;
    const element = button.dataset.paymentElement as Element;
    const kind = button.dataset.paymentKind as 'backup' | 'discard';
    const existing = paymentChoices.find(choice => choice.object === object);
    paymentChoices = existing
      ? existing.element === element
        ? paymentChoices.filter(choice => choice.object !== object)
        : paymentChoices.map(choice => choice.object === object ? { object, element, kind } : choice)
      : [...paymentChoices, { object, element, kind }];
    actionDraft = buildPaymentDraft(actionDraft, paymentOffer, paymentChoices, selectedSpecialDiscard).draft;
    render();
  }));
  root.querySelector<HTMLSelectElement>('#special-discard')?.addEventListener('change', event => {
    if (!actionDraft || !paymentOffer) return;
    selectedSpecialDiscard = (event.currentTarget as HTMLSelectElement).value || null;
    actionDraft = buildPaymentDraft(actionDraft, paymentOffer, paymentChoices, selectedSpecialDiscard).draft;
    render();
  });
  root.querySelectorAll<HTMLElement>('[data-ability]').forEach(button => button.addEventListener('click', () => beginAbility(state, selected!.object, button.dataset.ability!)));
  root.querySelectorAll<HTMLElement>('[data-open-zone]').forEach(button => button.addEventListener('click', () => {
    openPublicZone = { seat: Number(button.dataset.zoneSeat) as Seat, zone: button.dataset.openZone as 'deck' | 'break' | 'damage' | 'removed' };
    render();
  }));
  root.querySelector('[data-close-zone]')?.addEventListener('click', () => { openPublicZone = null; render(); });
  root.querySelector('[data-close-inspector]')?.addEventListener('click', () => { enlargedObject = null; render(); });
  root.querySelector('#attack-card')?.addEventListener('click', () => selected && command(bottomSeat, { kind: 'attack', members: [selected.object] }, state));
  root.querySelector('#block-card')?.addEventListener('click', () => selected && command(bottomSeat, { kind: 'block', blocker: selected.object }, state));
  root.querySelectorAll<HTMLElement>('[data-card]').forEach(button => button.addEventListener('click', () => {
    endTurnRequest = null;
    const object = button.dataset.card!;
    if (suppressCardClick === object && Date.now() <= suppressCardClickUntil) { suppressCardClick = null; return; }
    const target = findObject(state, object);
    if (actionDraft && (actionDraft.stage === 'payment' || actionDraft.stage === 'review') && paymentOffer) {
      const kind = paymentOffer.backupOptions.includes(object) ? 'backup'
        : paymentOffer.discardOptions.includes(object) ? 'discard' : null;
      if (kind && target) {
        const current = paymentChoices.find(choice => choice.object === object);
        paymentChoices = current ? paymentChoices.filter(choice => choice.object !== object)
          : [...paymentChoices, { object, element: opusPh[target.card]!.elements.find(element => paymentOffer.elements.includes(element) || paymentOffer.elements.some(required => required === 'Light' || required === 'Dark')) ?? opusPh[target.card]!.elements[0]!, kind }];
        actionDraft = buildPaymentDraft(actionDraft, paymentOffer, paymentChoices, selectedSpecialDiscard).draft;
        render();
        return;
      }
    }
    if ((castingSource || abilityDraft) && targetSelection.includes(object)) {
      const source = findObject(state, castingSource ?? abilityDraft!.source)!;
      targetSelection = toggleSelection(targetSelection, object, abilityDraft ? 1 : requiredTargets(source.card));
      if (actionDraft) actionDraft = { ...actionDraft, targets: [...targetSelection], stage: 'targets' };
      selectedObject = castingSource ?? abilityDraft!.source;
      targetCursor = null;
      notice = 'Target removed. Select a replacement or cancel the draft.';
      render();
      return;
    }
    if ((castingSource || abilityDraft) && legalDraftTarget(state, object)) {
      const sourceId = castingSource ?? abilityDraft!.source;
      const source = findObject(state, sourceId)!;
      targetSelection = toggleSelection(targetSelection, object, abilityDraft ? 1 : requiredTargets(source.card));
      targetCursor = null;
      const needed = abilityDraft ? 1 : requiredTargets(source.card);
      if (actionDraft) actionDraft = { ...actionDraft, targets: [...targetSelection], stage: targetSelection.length >= (abilityDraft ? 1 : needed) ? 'payment' : 'targets' };
      if (targetSelection.length >= needed) {
        selectedObject = sourceId;
        notice = 'Target selected. Review the cost and confirm to submit.';
        render();
      } else { selectedObject = sourceId; notice = `Choose one more target for ${opusPh[source.card]!.name}.`; render(); }
      return;
    }
    // A draft owns selection until it is confirmed or cancelled.
    if (actionDraft) return;
    if (choice?.kind === 'order') {
      orderSelection = toggleSelection(orderSelection, object, choice.max);
    } else if (choice && choice.options.some(option => option.id === object)) {
      orderSelection = [...orderSelection, object];
    } else selectedObject = object;
    render();
  }));
  root.querySelectorAll<HTMLElement>('[data-card]').forEach(button => button.addEventListener('contextmenu', event => {
    event.preventDefault();
    enlargedObject = button.dataset.card!;
    render();
  }));
  root.querySelectorAll<HTMLElement>('[data-card]').forEach(button => {
    button.draggable = button.dataset.zone !== 'hand';
    if (button.dataset.zone === 'hand') {
      const cardElement = button as HTMLButtonElement;
      cardElement.addEventListener('pointerdown', event => {
        const card = findObject(state, cardElement.dataset.card!);
        if (!card || event.button !== 0) return;
        handPointer = {
          pointerId: event.pointerId, instance: card.instance, object: card.object, owner: card.owner,
          generation: state.generation, seq: state.seq,
          gesture: beginHandGesture(event.pointerId, event.clientX, event.clientY), element: cardElement, preview: null,
        };
        cardElement.setPointerCapture(event.pointerId);
      });
      cardElement.addEventListener('pointermove', event => {
        if (!handPointer || handPointer.pointerId !== event.pointerId) return;
        handPointer.gesture = moveHandGesture(handPointer.gesture, event.clientX, event.clientY);
        if (handPointer.gesture.kind === 'reorder' || handPointer.gesture.kind === 'cast') {
          handPointer.element.classList.add('gesture-lifted');
          if (!handPointer.preview) {
            const preview = handPointer.element.cloneNode(true) as HTMLButtonElement;
            preview.classList.remove('gesture-lifted');
            preview.classList.add('gesture-preview');
            preview.removeAttribute('data-card');
            preview.removeAttribute('data-testid');
            preview.disabled = true;
            preview.tabIndex = -1;
            preview.setAttribute('aria-hidden', 'true');
            const bounds = handPointer.element.getBoundingClientRect();
            preview.style.width = `${bounds.width}px`;
            preview.style.height = `${bounds.height}px`;
            document.body.append(preview);
            handPointer.preview = preview;
          }
          positionHandPreview(handPointer.preview, event.clientX, event.clientY);
        }
      });
      const finishPointer = (event: PointerEvent, canceled: boolean) => {
        if (!handPointer || handPointer.pointerId !== event.pointerId) return;
        const active = handPointer;
        const gesture = canceled ? null : endHandGesture(active.gesture);
        if (gesture) { suppressCardClick = active.object; suppressCardClickUntil = Date.now() + 300; }
        const destination = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-card], #battlefield-drop');
        active.element.classList.remove('gesture-lifted');
        active.preview?.remove();
        handPointer = null;
        if (canceled) return;
        if (gesture === 'reorder' && destination?.dataset.zone === 'hand') {
          const target = findObject(state, destination.dataset.card!);
          if (target?.owner === active.owner) {
            const bounds = destination.getBoundingClientRect();
            reorderHand(active.owner, active.instance, target.instance, event.clientX >= bounds.left + bounds.width / 2);
            render();
          }
          return;
        }
        if (gesture === 'cast' && destination?.closest('#battlefield-drop') && active.owner === bottomSeat && state.priority === bottomSeat) {
          beginCast(state, bottomSeat, active.object);
        }
      };
      cardElement.addEventListener('pointerup', event => finishPointer(event, false));
      cardElement.addEventListener('pointercancel', event => finishPointer(event, true));
    }
    button.addEventListener('dragstart', event => {
      endTurnRequest = null;
      const object = button.dataset.card!;
      const card = findObject(state, object);
      if (card && (card.zone === 'hand' || card.zone === 'commander')) {
        draggingObject = object;
        (event as DragEvent).dataTransfer?.setData('text/plain', object);
      } else (event as DragEvent).preventDefault();
    });
    button.addEventListener('dragend', () => { draggingObject = null; });
    if (button.dataset.zone === 'hand') {
      button.addEventListener('dragover', event => {
        const source = draggingObject ? findObject(state, draggingObject) : null;
        const target = findObject(state, button.dataset.card!);
        if (source?.zone === 'hand' && target?.zone === 'hand' && source.owner === target.owner) event.preventDefault();
      });
      button.addEventListener('drop', event => {
        const source = draggingObject ? findObject(state, draggingObject) : null;
        const target = findObject(state, button.dataset.card!);
        if (source?.zone !== 'hand' || target?.zone !== 'hand' || source.owner !== target.owner) return;
        event.preventDefault();
        event.stopPropagation();
        const bounds = button.getBoundingClientRect();
        reorderHand(target.owner, source.instance, target.instance, event.clientX >= bounds.left + bounds.width / 2);
        draggingObject = null;
        render();
      });
    }
  });
  const drop = root.querySelector<HTMLElement>('#battlefield-drop');
  drop?.addEventListener('dragover', event => event.preventDefault());
  drop?.addEventListener('drop', event => {
    event.preventDefault();
    const object = draggingObject ?? (event as DragEvent).dataTransfer?.getData('text/plain') ?? '';
    draggingObject = null;
    if (object && (state.priority === bottomSeat)) beginCast(state, bottomSeat, object);
  });
  root.querySelectorAll<HTMLElement>('[data-choice]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.choice!;
    if (choice!.max === 1) { void command(choice!.seat, { kind: 'answer', answer: choiceAnswer({ choiceId: choice!.id, selected: [id], amounts: {} }) }, state); return; }
    matchController?.beginDraft({ kind: 'choice', id: choice!.id });
    choiceSelection = toggleSelection(choiceSelection, id, choice!.max);
    render();
  }));
  root.querySelectorAll<HTMLElement>('[data-order-choice]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.orderChoice!;
    matchController?.beginDraft({ kind: 'choice', id: choice!.id });
    orderSelection = toggleSelection(orderSelection, id, choice!.max);
    render();
  }));
  root.querySelector('#clear-order')?.addEventListener('click', () => { orderSelection = []; render(); });
  root.querySelector('#confirm-order')?.addEventListener('click', () => command(choice!.seat, { kind: 'answer', answer: choiceAnswer({ choiceId: choice!.id, selected: orderSelection, amounts: {} }) }, state));
  root.querySelector('#confirm-choice')?.addEventListener('click', () => command(choice!.seat, { kind: 'answer', answer: choiceAnswer({ choiceId: choice!.id, selected: choiceSelection, amounts: {} }) }, state));
  root.querySelectorAll<HTMLInputElement>('[data-allocation]').forEach(input => input.addEventListener('input', () => {
    matchController?.beginDraft({ kind: 'choice', id: choice!.id });
    const amount = input.valueAsNumber;
    allocationDraft[input.dataset.allocation!] = Number.isFinite(amount) && amount >= 0 ? amount : 0;
    const total = Object.values(allocationDraft).reduce((sum, value) => sum + value, 0);
    const required = choice?.allocation?.total ?? 0;
    root.querySelector<HTMLElement>('#allocation-total')!.textContent = `${total} / ${required}`;
    root.querySelector<HTMLButtonElement>('#confirm-allocation')!.disabled = validateChoiceDraft(choice, {
      choiceId: choice?.id ?? '', selected: [], amounts: allocationDraft,
    }).length > 0;
  }));
  root.querySelector('#confirm-allocation')?.addEventListener('click', () => command(choice!.seat, { kind: 'answer',
    answer: choiceAnswer({ choiceId: choice!.id, selected: [], amounts: allocationDraft }) }, state));
  root.onpointermove = event => {
    if (!castingSource && !abilityDraft) return;
    const candidate = (event.target as HTMLElement).closest<HTMLElement>('[data-card]');
    const candidateId = candidate?.dataset.card;
    if (candidateId && legalDraftTarget(state, candidateId)) {
      const bounds = candidate!.getBoundingClientRect();
      targetCursor = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2, snapped: true };
    } else targetCursor = { x: event.clientX, y: event.clientY, snapped: false };
    drawTargeting();
  };
  root.onpointerleave = () => { targetCursor = null; drawTargeting(); };
  drawTargeting();
  scheduleSmartPriority(state);
}
function hostStarted() { try { host.view(); return true; } catch { return false; } }
host.subscribe(render);
applyUpdate = registerOffline(status => { offlineStatus = status; render(); });
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && (enlargedObject || openPublicZone)) {
    enlargedObject = null; openPublicZone = null; render(); event.preventDefault(); return;
  }
  if (event.key.toLowerCase() === 'i' && selectedObject && !event.ctrlKey && !event.metaKey && !actionDraft) {
    enlargedObject = selectedObject; render(); event.preventDefault(); return;
  }
  if (event.key === 'Escape' && handPointer) {
    clearHandPointer();
    event.preventDefault();
    return;
  }
  if (event.key === 'Escape' && draggingObject) {
    draggingObject = null;
    return;
  }
  if (event.key !== 'Escape' || commandPending) return;
  const view = host.view(inspectedSeat);
  if (view.choice) return;
  if (!actionDraft) {
    if (!selectedObject) return;
    event.preventDefault();
    selectedObject = null;
    render();
    return;
  }
  event.preventDefault();
  castingSource = null; abilityDraft = null; actionDraft = null; paymentChoices = []; selectedSpecialDiscard = null;
  targetSelection = []; selectedMode = null;
  matchController?.clearDraft();
  notice = 'Action draft canceled.';
  render();
});
render();
void host.restore().then(result => {
  if (result.restored) { const view = host.view(); inspectedSeat = view.choice?.seat ?? view.priority ?? view.active; }
  recoveryWarning = result.reason;
  restoreComplete = true;
  render();
});
void loadDecks().then(decks => {
  savedDecks = decks.filter(isPlayableSavedDeck);
  if (savedDecks.length !== decks.length) notice = 'An invalid saved deck was excluded from the match menu. Edit the deck before using it.';
  render();
});
