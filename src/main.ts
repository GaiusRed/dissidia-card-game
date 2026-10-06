import Phaser from 'phaser';
import './styles.css';
import { opusPh } from './content/opus-ph';
import { LocalHost } from './host/local-host';
import { registerOffline, type OfflineStatus } from './client/offline';
import { homeMenu } from './client/menu';
import { cinderCompany, tidalAssembly } from './content/decks';
import { addEditorCard, changeEditorCommander, createDeckEditor, editorValidation, removeEditorCard } from './client/deck-editor';
import { loadDecks, saveDeck, type SavedDeck } from './storage/decks';
import type { MatchState, ObjectId, Payment, Seat } from './rules/types';

class Playmat extends Phaser.Scene {
  constructor() { super('playmat'); }
  create() {
    const paint = () => {
      this.children.removeAll();
      const { width, height } = this.scale;
      const g = this.add.graphics();
      g.fillGradientStyle(0x151923, 0x151923, 0x0d1119, 0x0d1119, 1);
      g.fillRect(0, 0, width, height);
      g.lineStyle(1, 0xc6a66d, 0.11);
      g.strokeRoundedRect(width * 0.1, height * 0.17, width * 0.8, height * 0.58, 80);
      g.lineStyle(1, 0xc6a66d, 0.06);
      g.lineBetween(width * 0.14, height * 0.46, width * 0.86, height * 0.46);
      g.fillStyle(0xc6a66d, 0.06);
      g.fillCircle(width / 2, height / 2, Math.min(width, height) * 0.15);
    };
    paint();
    this.scale.on('resize', paint);
  }
}

const game = new Phaser.Game({ type: Phaser.CANVAS, parent: 'game-canvas', backgroundColor: '#10131c', scene: [Playmat], scale: { mode: Phaser.Scale.RESIZE } });
const host = new LocalHost();
const root = document.querySelector<HTMLElement>('#app')!;
let inspectedSeat: Seat = 0;
let notice = '';
let selectedObject: ObjectId | null = null;
let orderSelection: string[] = [];
let castingSource: ObjectId | null = null;
let targetSelection: ObjectId[] = [];
let selectedMode: string | null = null;
let draggingObject: ObjectId | null = null;
let abilityDraft: { source: ObjectId; abilityId: string } | null = null;
let screen: 'home' | 'deck-editor' | 'active-menu' = 'home';
let editorSeat: Seat = 0;
let editorDeck = createDeckEditor(cinderCompany);
let editorError = '';
let savedDecks: SavedDeck[] = [];
let offlineStatus: OfflineStatus = 'installing';
let applyUpdate: (safeToUpdate: boolean) => void = () => {};

function nameOf(state: MatchState, instance: string): string {
  const card = state.cards[instance]!;
  return opusPh[card.card]?.name ?? (card.card === 'HIDDEN' ? 'Card back' : card.card);
}
function eventText(event: import('./rules/types').RuleEvent): string {
  const data = event.data && typeof event.data === 'object' && !Array.isArray(event.data) ? event.data as Record<string, unknown> : {};
  if (event.type === 'priority.passed') return `Player ${Number(data.seat) + 1} passed priority.`;
  if (event.type === 'phase.started') return `${String(data.phase)} Phase started.`;
  if (event.type === 'character.cast') return `${opusPh[String(data.card)]?.name ?? data.card} entered the field.`;
  if (event.type === 'summon.cast') return `${opusPh[String(data.card)]?.name ?? data.card} was cast.`;
  if (event.type === 'summon.resolved') return `${opusPh[String(data.card)]?.name ?? data.card} resolved.`;
  if (event.type === 'player.damaged') return `Player ${Number(data.seat) + 1} took damage.`;
  if (event.type === 'forward.broken') return `${opusPh[String(data.card)]?.name ?? 'Forward'} was broken.`;
  if (event.type === 'card.activated') return 'A card became Active.';
  if (event.type === 'card.discarded') return 'A card was discarded for CP.';
  if (event.type === 'game.conceded') return `Player ${Number(data.seat) + 1} conceded.`;
  if (event.type === 'game.result') return 'The duel ended.';
  return event.type.replaceAll('.', ' ').replaceAll('-', ' ');
}
function findObject(state: MatchState, object: ObjectId) { return Object.values(state.cards).find(card => card.object === object); }
function makePayment(state: MatchState, seat: Seat, source: ObjectId, cost: number): Payment | null {
  const sourceCard = findObject(state, source);
  if (!sourceCard) return null;
  const identity = opusPh[sourceCard.card]?.elements ?? [];
  const colorlessCard = identity.some(element => element === 'Light' || element === 'Dark');
  const candidates: { object: string; element: (typeof identity)[number]; amount: number; discard: boolean }[] = [];
  for (const instance of state.field) {
    const card = state.cards[instance]!;
    const def = opusPh[card.card];
    const element = def?.elements.find(e => colorlessCard || identity.includes(e));
    if (card.object !== source && card.controller === seat && !card.dull && def?.type === 'Backup' && element) {
      candidates.push({ object: card.object, element, amount: 1, discard: false });
    }
  }
  for (const instance of state.zones[seat].hand) {
    const card = state.cards[instance]!;
    const def = opusPh[card.card];
    const element = def?.elements.find(e => identity.includes(e));
    if (card.object !== source && def && !def.elements.some(e => e === 'Light' || e === 'Dark') && (colorlessCard ? !!def.elements[0] : !!element)) {
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
function command(seat: Seat, intent: Parameters<LocalHost['submit']>[0]['intent']): void {
  const state = host.getState();
  const reply = host.submit({ id: crypto.randomUUID(), expectedSeq: state.seq, seat, intent });
  notice = reply.ok ? '' : reply.error.message;
  if (reply.ok) { selectedObject = null; orderSelection = []; }
}
function cast(state: MatchState, seat: Seat, object: ObjectId): void {
  const card = findObject(state, object);
  if (!card) return;
  const definition = opusPh[card.card];
  const commanderCast = card.zone === 'commander';
  const cost = (definition?.cost ?? 0) + (commanderCast ? state.commanders[seat].casts * 2 : 0);
  const payment = makePayment(state, seat, object, cost);
  if (!payment) { notice = `Not enough eligible CP to pay ${cost}. Select active Backups or discard matching cards.`; render(); return; }
  command(seat, { kind: 'cast', source: object, targets: [], mode: null, payment });
}
function requiredTargets(handler: string | null): number {
  if (['scorch', 'return-tide', 'war-cry', 'ashen-verdict', 'guarding-current', 'shape-tide', 'borrowed-banner', 'controlled-burn', 'stillwater'].includes(handler ?? '')) return 1;
  if (handler === 'twin-embers') return 2;
  return 0;
}
function beginCast(state: MatchState, seat: Seat, object: ObjectId): void {
  const card = findObject(state, object);
  if (!card) return;
  const def = opusPh[card.card];
  if (def?.type !== 'Summon') { cast(state, seat, object); return; }
  if (!new Set(['scorch', 'twin-embers', 'war-cry', 'ashen-verdict', 'final-spark', 'controlled-burn', 'return-tide', 'stillwater', 'guarding-current', 'shape-tide', 'borrowed-banner', 'rising-undertow']).has(def.summonHandler ?? '')) {
    notice = 'This placeholder Summon has no implemented effect yet.'; render(); return;
  }
  const needed = requiredTargets(def.summonHandler);
  if (needed === 0) { castSummon(state, seat, object, []); return; }
  castingSource = object;
  targetSelection = [];
  selectedMode = null;
  selectedObject = object;
  notice = def.summonHandler === 'controlled-burn' ? 'Choose a mode: break a Backup of cost 2 or less, or remove a Forward.' : `Choose ${needed} target${needed > 1 ? 's' : ''} for ${def.name}.`;
  render();
}
function castSummon(state: MatchState, seat: Seat, object: ObjectId, targets: ObjectId[]): void {
  const card = findObject(state, object);
  const def = card ? opusPh[card.card] : undefined;
  if (!card || !def) return;
  const payment = makePayment(state, seat, object, def.cost);
  if (!payment) { notice = `Not enough eligible CP to pay ${def.cost}.`; render(); return; }
  const mode = selectedMode;
  castingSource = null; targetSelection = []; selectedMode = null;
  command(seat, { kind: 'cast', source: object, targets, mode, payment });
}
function abilityCost(handler: string): { cost: number; element: 'Fire' | 'Water' | null; special: string | null; sacrifice: boolean } | null {
  const values: Record<string, { cost: number; element: 'Fire' | 'Water' | null; special: string | null; sacrifice: boolean }> = {
    'forge-apprentice-buff': { cost: 0, element: null, special: null, sacrifice: false },
    'wave-apprentice-activate': { cost: 0, element: null, special: null, sacrifice: false },
    'recovery-clerk-bottom': { cost: 1, element: 'Water', special: null, sacrifice: false },
    'ember-medic-recover': { cost: 1, element: 'Fire', special: null, sacrifice: true },
    'cinder-marshal-special': { cost: 1, element: 'Fire', special: 'Cinder Marshal', sacrifice: false },
    'tide-warden-special': { cost: 1, element: 'Water', special: 'Tide Warden', sacrifice: false },
  };
  return values[handler] ?? null;
}
function beginAbility(state: MatchState, source: ObjectId, abilityId: string): void {
  const sourceCard = findObject(state, source);
  const ability = sourceCard ? opusPh[sourceCard.card]?.abilities.find(item => item.id === abilityId) : undefined;
  if (!sourceCard || !ability || !abilityCost(ability.handler)) { notice = 'This placeholder ability is not implemented yet.'; render(); return; }
  abilityDraft = { source, abilityId };
  castingSource = null; selectedObject = source; targetSelection = [];
  notice = `Choose a target for ${ability.text}`;
  render();
}
function sendAbility(state: MatchState, seat: Seat, targets: ObjectId[]): void {
  if (!abilityDraft) return;
  const source = findObject(state, abilityDraft.source);
  const ability = source ? opusPh[source.card]?.abilities.find(item => item.id === abilityDraft!.abilityId) : undefined;
  const cost = ability ? abilityCost(ability.handler) : null;
  if (!source || !ability || !cost) return;
  const payment = makePayment(state, seat, source.object, cost.cost);
  if (!payment) { notice = `Not enough matching CP to pay ${cost.cost}.`; render(); return; }
  payment.dullSource = true;
  payment.sacrificeSource = cost.sacrifice;
  if (cost.special) {
    const special = state.zones[seat].hand.map(instance => state.cards[instance]!).find(card => card.object !== source.object && opusPh[card.card]?.name === cost.special);
    if (!special) { notice = `A second ${cost.special} in hand is required for this Special Ability.`; render(); return; }
    payment.specialDiscard = special.object;
  }
  const draft = abilityDraft;
  abilityDraft = null; targetSelection = [];
  command(seat, { kind: 'activate', source: draft.source, ability: draft.abilityId, targets, payment });
}
function legalDraftTarget(state: MatchState, targetObject: ObjectId): boolean {
  if ((!castingSource && !abilityDraft) || targetSelection.includes(targetObject)) return false;
  const sourceObject = castingSource ?? abilityDraft!.source;
  const source = findObject(state, sourceObject);
  const target = findObject(state, targetObject);
  const handler = source ? opusPh[source.card]?.summonHandler : null;
  if (!source || !target) return false;
  if (abilityDraft) {
    const definition = opusPh[source.card]!;
    const ability = definition.abilities.find(item => item.id === abilityDraft!.abilityId);
    if (!ability) return false;
    const abilityHandler = ability.handler;
    if (abilityHandler === 'recovery-clerk-bottom' || abilityHandler === 'ember-medic-recover') {
      return target.zone === 'break' && target.owner === source.owner &&
        (abilityHandler === 'recovery-clerk-bottom' || opusPh[target.card]?.type === 'Forward');
    }
    if (target.zone !== 'field' || opusPh[target.card]?.type !== 'Forward') return false;
    return abilityHandler !== 'forge-apprentice-buff' || opusPh[target.card]!.elements.includes('Fire');
  }
  if (handler === 'stillwater') return target.zone === 'stack' && state.stack.some(item => item.source === targetObject);
  if (target.zone !== 'field') return false;
  const definition = opusPh[target.card];
  if (!definition) return false;
  if (handler === 'borrowed-banner') return target.controller !== source.owner && (definition.type === 'Forward' || definition.type === 'Backup');
  if (handler === 'controlled-burn') return selectedMode === 'backup'
    ? definition.type === 'Backup' && definition.cost <= 2
    : selectedMode === 'forward' && definition.type === 'Forward';
  if (handler === 'ashen-verdict') return definition.type === 'Forward' && target.dull;
  return definition.type === 'Forward';
}
function drawTargeting(): void {
  root.querySelector('.targeting-overlay')?.remove();
  const sourceObject = castingSource ?? abilityDraft?.source;
  if (!sourceObject || targetSelection.length === 0) return;
  const source = root.querySelector<HTMLElement>(`[data-card="${CSS.escape(sourceObject)}"]`);
  if (!source) return;
  const bounds = root.getBoundingClientRect();
  const a = source.getBoundingClientRect();
  const sx = a.left + a.width / 2 - bounds.left;
  const sy = a.top + a.height / 2 - bounds.top;
  const lines = targetSelection.map(id => {
    const target = root.querySelector<HTMLElement>(`[data-card="${CSS.escape(id)}"]`);
    if (!target) return '';
    const b = target.getBoundingClientRect();
    return `<line x1="${sx}" y1="${sy}" x2="${b.left + b.width / 2 - bounds.left}" y2="${b.top + b.height / 2 - bounds.top}"/>`;
  }).join('');
  root.insertAdjacentHTML('beforeend', `<svg class="targeting-overlay" width="${bounds.width}" height="${bounds.height}" aria-hidden="true">${lines}</svg>`);
}

function renderDeckEditor(): void {
  const chosenCommander = opusPh[editorDeck.commander]!;
  const pool = Object.values(opusPh).filter(card => card.type !== 'Summon' || card.summonHandler !== null)
    .filter(card => card.rarity !== 'L' || card.number === editorDeck.commander)
    .filter(card => !card.elements.some(element => element !== 'Light' && element !== 'Dark') ||
      card.elements.some(element => chosenCommander.elements.includes(element)));
  const commanderOptions = Object.values(opusPh).filter(card => card.type === 'Forward' && card.rarity === 'L');
  const errors = editorValidation(editorDeck);
  root.innerHTML = `<section class="editor-page"><header class="editor-header"><button class="top-button" id="editor-back">← Menu</button><div><p class="eyebrow">COMMANDER DUEL · OPUS PLACEHOLDER</p><h2>Deck editor</h2></div><span class="deck-count">${editorDeck.main.length} / 19</span></header><div class="editor-toolbar"><label>PLAYER <select id="editor-seat"><option value="0" ${editorSeat === 0 ? 'selected' : ''}>1</option><option value="1" ${editorSeat === 1 ? 'selected' : ''}>2</option></select></label><label>COMMANDER <select id="editor-commander">${commanderOptions.map(card => `<option value="${card.number}" ${editorDeck.commander === card.number ? 'selected' : ''}>${card.name} · ${card.elements.join('/')}</option>`).join('')}</select></label><button class="primary small" id="save-deck" ${errors.length ? 'disabled' : ''}>Save for Player ${editorSeat + 1}</button></div><p class="editor-error" role="status">${editorError || errors.map(error => error.message).join(' ')}</p><div class="editor-columns"><section><h3>Main deck <small>${editorDeck.main.length}/19</small></h3><div class="editor-list">${editorDeck.main.map(number => { const card = opusPh[number]!; return `<div class="editor-row"><span class="element-mark">${card.elements[0]}</span><strong>${card.name}</strong><small>${number} · ${card.type} · ${card.cost}</small><button data-remove="${number}" aria-label="Remove ${card.name}">−</button></div>`; }).join('') || '<p class="subtle">Add cards from the catalog.</p>'}</div></section><section><h3>Card catalog <small>${pool.length} legal cards</small></h3><div class="editor-list">${pool.map(card => `<div class="editor-row"><span class="element-mark">${card.elements[0]}</span><strong>${card.name}</strong><small>${card.number} · ${card.type} · ${card.cost}</small><button data-add="${card.number}" aria-label="Add ${card.name}" ${editorDeck.main.includes(card.number) || editorDeck.main.length >= 19 ? 'disabled' : ''}>+</button></div>`).join('')}</div></section></div></section>`;
  root.querySelector('#editor-back')?.addEventListener('click', () => { screen = 'home'; render(); });
  root.querySelector('#editor-seat')?.addEventListener('change', event => {
    editorSeat = Number((event.currentTarget as HTMLSelectElement).value) as Seat;
    editorDeck = createDeckEditor(savedDecks.find(deck => deck.id === `custom-${editorSeat}`)?.deck ?? (editorSeat === 0 ? cinderCompany : tidalAssembly));
    editorError = ''; renderDeckEditor();
  });
  root.querySelector('#editor-commander')?.addEventListener('change', event => {
    const number = (event.currentTarget as HTMLSelectElement).value;
    const issues = changeEditorCommander(editorDeck, number);
    if (issues.length) editorError = issues.map(error => error.message).join(' ');
    else { editorDeck.commander = number; editorError = ''; }
    renderDeckEditor();
  });
  root.querySelectorAll<HTMLElement>('[data-add]').forEach(button => button.addEventListener('click', () => {
    const number = button.dataset.add!;
    const issues = addEditorCard(editorDeck, number);
    if (issues.length) editorError = issues.map(error => error.message).join(' ');
    else { editorDeck = { ...editorDeck, main: [...editorDeck.main, number] }; editorError = ''; }
    renderDeckEditor();
  }));
  root.querySelectorAll<HTMLElement>('[data-remove]').forEach(button => button.addEventListener('click', () => {
    editorDeck = removeEditorCard(editorDeck, button.dataset.remove!); editorError = ''; renderDeckEditor();
  }));
  root.querySelector('#save-deck')?.addEventListener('click', () => {
    const record = { id: `custom-${editorSeat}`, name: `Custom Player ${editorSeat + 1}`, deck: editorDeck };
    void saveDeck(record).then(() => { savedDecks = [...savedDecks.filter(deck => deck.id !== record.id), record]; screen = 'home'; render(); })
      .catch(error => { editorError = error instanceof Error ? error.message : 'Could not save this deck.'; renderDeckEditor(); });
  });
}

function cardTile(state: MatchState, instance: string, selectable = true, playable = false, targetable = false): string {
  const card = state.cards[instance]!;
  const def = opusPh[card.card];
  const selected = selectedObject === card.object || orderSelection.includes(card.object);
  return `<button class="card ${card.dull ? 'dull' : ''} ${selected ? 'selected' : ''} ${playable ? 'playable' : ''} ${targetable ? 'targetable' : ''}" data-card="${card.object}" data-testid="card-${card.object}" ${selectable ? '' : 'disabled'}>
    <span class="card-cost">${def?.cost ?? '·'}</span><strong>${nameOf(state, instance)}</strong><small>${def?.type ?? 'Card back'} · ${def?.power ? `${def.power} power` : def?.elements.join(' / ') ?? ''}</small>
    <span class="card-number">${card.card}</span></button>`;
}
function render(): void {
  if (!hostStarted() || screen === 'active-menu') {
    if (screen === 'deck-editor') { renderDeckEditor(); return; }
    const priorScenario = root.querySelector<HTMLSelectElement>('#scenario-select')?.value;
    const priorDeckOne = root.querySelector<HTMLSelectElement>('#deck-one')?.value;
    const priorDeckTwo = root.querySelector<HTMLSelectElement>('#deck-two')?.value;
    const priorSeed = root.querySelector<HTMLInputElement>('#match-seed')?.value;
    root.innerHTML = homeMenu([savedDecks.some(deck => deck.id === 'custom-0'), savedDecks.some(deck => deck.id === 'custom-1')], hostStarted());
    if (priorScenario && root.querySelector(`#scenario-select option[value="${priorScenario}"]`)) root.querySelector<HTMLSelectElement>('#scenario-select')!.value = priorScenario;
    if (priorDeckOne && root.querySelector(`#deck-one option[value="${priorDeckOne}"]`)) root.querySelector<HTMLSelectElement>('#deck-one')!.value = priorDeckOne;
    if (priorDeckTwo && root.querySelector(`#deck-two option[value="${priorDeckTwo}"]`)) root.querySelector<HTMLSelectElement>('#deck-two')!.value = priorDeckTwo;
    if (priorSeed !== undefined) root.querySelector<HTMLInputElement>('#match-seed')!.value = priorSeed;
    root.querySelector('#offline-status')!.textContent = offlineStatus === 'ready' ? 'Ready for offline play' : offlineStatus === 'error' ? 'Offline setup failed' : offlineStatus === 'update' ? 'An update is ready' : 'Preparing offline play';
    root.querySelector('#new-match')?.addEventListener('click', () => {
      const one = root.querySelector<HTMLSelectElement>('#deck-one')?.value;
      const two = root.querySelector<HTMLSelectElement>('#deck-two')?.value;
      const supplied = Number(root.querySelector<HTMLInputElement>('#match-seed')?.value);
      const bytes = new Uint32Array(1); crypto.getRandomValues(bytes);
      const deckOne = one === 'custom-one' ? savedDecks.find(deck => deck.id === 'custom-0')?.deck : one === 'water' ? tidalAssembly : cinderCompany;
      const deckTwo = two === 'custom-two' ? savedDecks.find(deck => deck.id === 'custom-1')?.deck : two === 'fire' ? cinderCompany : tidalAssembly;
      host.start(Number.isSafeInteger(supplied) && supplied > 0 ? supplied : bytes[0]!, [deckOne ?? cinderCompany, deckTwo ?? tidalAssembly]);
      inspectedSeat = 0; screen = 'home'; render();
    });
    root.querySelector('#start-scenario')?.addEventListener('click', () => {
      const id = root.querySelector<HTMLSelectElement>('#scenario-select')?.value;
      if (!id) return;
      host.startScenario(id);
      inspectedSeat = 0; selectedObject = null; screen = 'home'; render();
    });
    root.querySelector('#resume-match')?.addEventListener('click', () => { screen = 'home'; render(); });
    root.querySelector('#edit-decks')?.addEventListener('click', () => {
      editorSeat = 0;
      editorDeck = createDeckEditor(savedDecks.find(deck => deck.id === 'custom-0')?.deck ?? cinderCompany);
      editorError = ''; screen = 'deck-editor'; renderDeckEditor();
    });
    if (offlineStatus === 'update') {
      root.querySelector('#new-match')?.insertAdjacentHTML('afterend', '<button class="soft" id="apply-update">Install update</button>');
      root.querySelector('#apply-update')?.addEventListener('click', () => applyUpdate(true));
    }
    return;
  }
  const state = host.getState();
  const view = host.view(inspectedSeat);
  const decision = view.decisionSeat;
  const bottomSeat = decision ?? inspectedSeat;
  const other: Seat = bottomSeat === 0 ? 1 : 0;
  const bottom = state.zones[bottomSeat];
  const top = state.zones[other];
  const choice = state.choice;
  const selected = selectedObject ? findObject(state, selectedObject) : null;
  const selectedDef = selected ? opusPh[selected.card] : null;
  const logItems = view.log.slice(-5).reverse().map(event => `<li>${eventText(event)}</li>`).join('');
  const commander = state.cards[state.commanders[bottomSeat].instance]!;
  const commanderSlot = commander.zone === 'commander'
    ? cardTile(state, commander.instance, true, state.priority === bottomSeat && (state.phase === 'main1' || state.phase === 'main2') && !!makePayment(state, bottomSeat, commander.object, opusPh[commander.card]!.cost + state.commanders[bottomSeat].casts * 2))
    : `<div class="commander-status"><span>COMMANDER</span><b>${opusPh[commander.card]!.name}</b><small>Tax · ${state.commanders[bottomSeat].casts * 2} CP</small></div>`;
  const draftedAbility = abilityDraft && findObject(state, abilityDraft.source)
    ? opusPh[findObject(state, abilityDraft.source)!.card]?.abilities.find(ability => ability.id === abilityDraft!.abilityId) : undefined;
  const breakTargets = draftedAbility && ['recovery-clerk-bottom', 'ember-medic-recover'].includes(draftedAbility.handler)
    ? `<section class="break-targets" aria-label="Break Zone targets"><span class="zone-label">CHOOSE FROM BREAK ZONE</span>${bottom.break.map(instance => cardTile(state, instance, true, false, legalDraftTarget(state, state.cards[instance]!.object))).join('')}</section>` : '';
  const selectedActions = selected && selectedDef ? [
    (selected.zone === 'hand' || selected.zone === 'commander') && (selected.controller === bottomSeat || selected.owner === bottomSeat) && selectedDef.type !== 'Summon'
      ? `<button class="primary small" id="play-card">${selected.zone === 'commander' ? `Cast Commander · ${selectedDef.cost + state.commanders[bottomSeat].casts * 2} CP` : `Cast · ${selectedDef.cost} CP`}</button>` : '',
    (selected.zone === 'hand') && selectedDef.type === 'Summon' && new Set(['scorch', 'twin-embers', 'war-cry', 'ashen-verdict', 'final-spark', 'controlled-burn', 'return-tide', 'stillwater', 'guarding-current', 'shape-tide', 'borrowed-banner', 'rising-undertow']).has(selectedDef.summonHandler ?? '')
      ? `<button class="primary small" id="play-summon">Cast Summon · ${selectedDef.cost} CP</button>` : '',
    castingSource === selected.object && selectedDef.summonHandler === 'controlled-burn' && !selectedMode
      ? '<button class="soft small" data-mode="backup">Break Backup</button><button class="soft small" data-mode="forward">Remove Forward</button>' : '',
    selected.zone === 'field' && selected.controller === bottomSeat ? selectedDef.abilities.filter(ability => abilityCost(ability.handler) && ability.kind !== 'auto')
      .map(ability => `<button class="soft small" data-ability="${ability.id}" ${selected.dull ? 'disabled' : ''}>${ability.kind === 'special' ? 'Special · ' : ''}${ability.id.includes('forge') ? 'Boost Forward' : ability.id.includes('wave') ? 'Activate Forward' : 'Special Ability'}</button>`).join('') : '',
    selected.zone === 'field' && selected.controller === bottomSeat && selectedDef.type === 'Forward' && state.phase === 'attack' && state.active === bottomSeat && state.priority === bottomSeat && !state.combat
      ? '<button class="primary small" id="attack-card">Attack with this Forward</button>' : '',
    selected.zone === 'field' && selected.controller === bottomSeat && selectedDef.type === 'Forward' && state.phase === 'attack' && state.active !== bottomSeat && state.combat?.step === 'block' && state.priority === bottomSeat && !state.combat.blocker
      ? '<button class="primary small" id="block-card">Block this attack</button>' : '',
  ].join('') : '';
  const prompt = choice ? `<section class="choice-panel" aria-label="Choices"><div class="choice-copy"><span class="eyebrow">PLAYER ${choice.seat + 1} DECISION</span><strong>${choice.reason}</strong><small>${choice.kind === 'order' ? `Choose order ${orderSelection.length}/${choice.max}` : ''}</small></div><div class="choice-actions">${choice.kind === 'order' ? `${choice.options.map((option, index) => {
    const selectedIndex = orderSelection.indexOf(option.id);
    return `<button class="${selectedIndex >= 0 ? 'primary small' : 'soft'}" data-order-choice="${option.id}">${selectedIndex >= 0 ? `${selectedIndex + 1}. ` : ''}${option.label}</button>`;
  }).join('')}<button class="soft" id="clear-order">Clear</button><button class="primary small" id="confirm-order" ${orderSelection.length !== choice.min ? 'disabled' : ''}>Confirm order</button>` : choice.options.map(option => `<button class="${option.id === 'redraw' || option.id === 'second' ? 'soft' : 'primary small'}" data-choice="${option.id}">${option.label}</button>`).join('')}</div></section>` : '';
  root.innerHTML = `<header class="topbar"><a class="brand" href="#"><span class="brand-mark">D</span> DISSIDIA <small>PLAYTEST</small></a><div class="match-meta"><span>TURN ${state.turn || 'SETUP'}</span><b>·</b><span>${state.phase.toUpperCase()}</span><b>·</b><span>FIRST TO 7 DAMAGE</span><span class="offline-pill" id="offline-status">${offlineStatus === 'ready' ? 'OFFLINE READY' : offlineStatus === 'update' ? 'UPDATE READY' : offlineStatus === 'error' ? 'OFFLINE ERROR' : 'CACHING'}</span></div><div class="top-actions"><button class="top-button" id="inspect">Inspect Player ${other + 1}</button><button class="top-button" id="concede">Concede</button></div></header>
    <section class="table" aria-label="Game table"><div class="player-row opponent"><div class="player-info"><span class="avatar blue">${other + 1}</span><div><strong>Player ${other + 1}</strong><small>${state.active === other ? 'ACTIVE PLAYER' : 'WAITING'}</small></div><span class="damage">${top.damage.length}<small> / 7</small></span></div><div class="opponent-zones"><div class="zone-label">COMMANDER ZONE</div>${cardTile(state, state.commanders[other].instance, false)}<div class="opponent-hand" aria-label="Player ${other + 1} hand">${Array.from({length: top.hand.length}, () => '<span class="back"></span>').join('')}</div><span class="pile-count">${top.deck.length} DECK</span></div></div>
    <div class="center-table" id="battlefield-drop"><div class="center-caption">${state.stack.length ? `STACK · ${state.stack.length}` : 'BATTLEFIELD'}</div><div class="battlefield" aria-label="Battlefield">${state.field.length ? state.field.map(instance => { const card = state.cards[instance]!; const targetable = legalDraftTarget(state, card.object); return cardTile(state, instance, true, false, targetable); }).join('') : '<span class="empty-field">Summon a Forward or build your Backup line</span>'}</div><div class="stack-row">${state.stackCards.map(instance => { const card = state.cards[instance]!; return cardTile(state, instance, true, false, legalDraftTarget(state, card.object)); }).join('')}</div></div>
    <div class="player-row current"><div class="player-info"><span class="avatar red">${bottomSeat + 1}</span><div><strong>Player ${bottomSeat + 1}</strong><small>${state.priority === bottomSeat ? 'YOUR PRIORITY' : `PLAYER ${state.active + 1} TURN`}</small></div><span class="damage">${bottom.damage.length}<small> / 7</small></span></div><div class="own-zones"><div class="zone-label">COMMANDER ZONE</div>${commanderSlot}<div class="deck-pile"><span>DECK</span><b>${bottom.deck.length}</b></div><div class="break-pile"><span>BREAK</span><b>${bottom.break.length}</b></div></div><div class="hand-zone"><div class="zone-label">PLAYER ${bottomSeat + 1} · HAND <span>${bottom.hand.length}</span></div><div class="hand-fan" aria-label="Player ${bottomSeat + 1} hand">${bottom.hand.map(instance => { const card = state.cards[instance]!; const def = opusPh[card.card]!; const cost = def.cost; const supportedSummon = new Set(['scorch', 'twin-embers', 'war-cry', 'ashen-verdict', 'final-spark', 'controlled-burn', 'return-tide', 'stillwater', 'guarding-current', 'shape-tide', 'borrowed-banner', 'rising-undertow']).has(def.summonHandler ?? ''); return cardTile(state, instance, true, state.priority === bottomSeat && state.active === bottomSeat && (state.phase === 'main1' || state.phase === 'main2' || state.phase === 'attack' || state.phase === 'end') && (def.type !== 'Summon' || supportedSummon) && !!makePayment(state, bottomSeat, card.object, cost)); }).join('')}</div></div></div></section>
    ${breakTargets}${prompt}
    <aside class="event-log" role="log" aria-label="Game log"><div class="eyebrow">MATCH LOG</div><ul>${logItems || '<li>Accepted actions will appear here.</li>'}</ul></aside>
    <footer class="bottom-bar"><div class="selection-area">${selected && selectedDef ? `<div class="selected-preview"><span class="eyebrow">${selectedDef.type} · ${selectedDef.elements.join(' / ')}</span><strong>${selectedDef.name}</strong><small>${castingSource || abilityDraft ? notice : selectedDef.text}</small>${selectedActions}${castingSource || abilityDraft ? '<button class="soft small" id="cancel-draft">Cancel</button>' : ''}</div>` : `<div class="empty-selection"><span class="eyebrow">CHOICE</span><strong>${choice ? choice.reason : 'Select a card to inspect'}</strong><small>${choice ? 'Use the decision controls above to continue.' : notice || 'Cards glow when an action is available.'}</small></div>`}</div><div class="phase-controls"><span class="seat-label">DECISION · PLAYER ${(decision ?? bottomSeat) + 1}</span>${!choice && state.priority === bottomSeat ? '<button class="primary" id="pass">Pass priority</button>' : '<button class="soft" disabled>Await decision</button>'}<button class="top-button" id="main-menu">Menu</button></div></footer>
    ${state.result ? `<div class="result-overlay"><h2>${state.result.winner === null ? 'Draw game' : `Player ${state.result.winner + 1} wins`}</h2><p>${state.result.reason === 'damage' ? 'Seven damage' : state.result.reason}</p><button class="primary" id="new-match">New match</button></div>` : ''}<div class="toast" role="status">${notice || host.persistenceError || ''}</div>`;

  root.querySelector('.top-actions')?.insertAdjacentHTML('beforeend', '<button class="top-button" id="export-save">Export save</button><label class="top-button import-button" for="import-save">Import</label><input id="import-save" type="file" accept="application/json,.json" hidden />');
  root.querySelector('#inspect')?.addEventListener('click', () => { inspectedSeat = other; render(); });
  root.querySelector('#main-menu')?.addEventListener('click', () => { selectedObject = null; screen = 'active-menu'; render(); });
  root.querySelector('#new-match')?.addEventListener('click', () => { host.start(1); notice = ''; screen = 'home'; render(); });
  root.querySelector('#concede')?.addEventListener('click', () => command(bottomSeat, { kind: 'concede' }));
  root.querySelector('#export-save')?.addEventListener('click', () => {
    void host.exportSave().then(contents => {
      const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = `dissidia-turn-${state.turn}-seq-${state.seq}.json`; link.click(); URL.revokeObjectURL(url);
    });
  });
  root.querySelector<HTMLInputElement>('#import-save')?.addEventListener('change', event => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    void file.text().then(contents => host.importSave(contents)).then(result => {
      notice = result.reason ?? '';
      if (result.imported) screen = 'home';
      render();
    });
  });
  root.querySelector('#pass')?.addEventListener('click', () => command(bottomSeat, { kind: 'pass' }));
  root.querySelector('#play-card')?.addEventListener('click', () => selected && beginCast(state, bottomSeat, selected.object));
  root.querySelector('#play-summon')?.addEventListener('click', () => selected && beginCast(state, bottomSeat, selected.object));
  root.querySelector('#cancel-draft')?.addEventListener('click', () => { castingSource = null; abilityDraft = null; targetSelection = []; selectedMode = null; notice = ''; render(); });
  root.querySelectorAll<HTMLElement>('[data-mode]').forEach(button => button.addEventListener('click', () => { selectedMode = button.dataset.mode!; notice = `Choose a ${selectedMode === 'backup' ? 'Backup' : 'Forward'} for Controlled Burn.`; render(); }));
  root.querySelectorAll<HTMLElement>('[data-ability]').forEach(button => button.addEventListener('click', () => beginAbility(state, selected!.object, button.dataset.ability!)));
  root.querySelector('#attack-card')?.addEventListener('click', () => selected && command(bottomSeat, { kind: 'attack', members: [selected.object] }));
  root.querySelector('#block-card')?.addEventListener('click', () => selected && command(bottomSeat, { kind: 'block', blocker: selected.object }));
  root.querySelectorAll<HTMLElement>('[data-card]').forEach(button => button.addEventListener('click', () => {
    const object = button.dataset.card!;
    const target = findObject(state, object);
    if ((castingSource || abilityDraft) && legalDraftTarget(state, object)) {
      const sourceId = castingSource ?? abilityDraft!.source;
      const source = findObject(state, sourceId)!;
      targetSelection = [...targetSelection, object];
      const needed = abilityDraft ? 1 : requiredTargets(opusPh[source.card]!.summonHandler);
      if (targetSelection.length >= needed) {
        if (abilityDraft) sendAbility(state, bottomSeat, targetSelection);
        else castSummon(state, bottomSeat, sourceId, targetSelection);
      } else { selectedObject = sourceId; notice = `Choose one more target for ${opusPh[source.card]!.name}.`; render(); }
      return;
    }
    if (choice?.kind === 'order') {
      orderSelection = orderSelection.includes(object) ? orderSelection.filter(id => id !== object) : [...orderSelection, object].slice(0, choice.max);
    } else if (choice && choice.options.some(option => option.id === object)) {
      orderSelection = [...orderSelection, object];
    } else selectedObject = object;
    render();
  }));
  root.querySelectorAll<HTMLElement>('[data-card]').forEach(button => {
    button.draggable = true;
    button.addEventListener('dragstart', event => {
      const object = button.dataset.card!;
      const card = findObject(state, object);
      if (card && (card.zone === 'hand' || card.zone === 'commander')) {
        draggingObject = object;
        (event as DragEvent).dataTransfer?.setData('text/plain', object);
      } else (event as DragEvent).preventDefault();
    });
  });
  const drop = root.querySelector<HTMLElement>('#battlefield-drop');
  drop?.addEventListener('dragover', event => event.preventDefault());
  drop?.addEventListener('drop', event => {
    event.preventDefault();
    const object = draggingObject ?? (event as DragEvent).dataTransfer?.getData('text/plain') ?? '';
    draggingObject = null;
    if (object && (state.priority === bottomSeat)) beginCast(state, bottomSeat, object);
  });
  root.querySelectorAll<HTMLElement>('[data-choice]').forEach(button => button.addEventListener('click', () => command(choice!.seat, { kind: 'answer', answer: { choice: choice!.id, selected: [button.dataset.choice!], amounts: {} } })));
  root.querySelectorAll<HTMLElement>('[data-order-choice]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.orderChoice!;
    orderSelection = orderSelection.includes(id) ? orderSelection.filter(value => value !== id) : [...orderSelection, id].slice(0, choice!.max);
    render();
  }));
  root.querySelector('#clear-order')?.addEventListener('click', () => { orderSelection = []; render(); });
  root.querySelector('#confirm-order')?.addEventListener('click', () => command(choice!.seat, { kind: 'answer', answer: { choice: choice!.id, selected: orderSelection, amounts: {} } }));
  drawTargeting();
  void top;
}
let started = false;
function hostStarted() { try { host.getState(); return true; } catch { return false; } }
host.subscribe(render);
applyUpdate = registerOffline(status => { offlineStatus = status; render(); });
render();
void host.restore().then(() => render());
void loadDecks().then(decks => { savedDecks = decks; render(); });
window.addEventListener('resize', () => game.scale.refresh());
