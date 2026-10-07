import { validateDeck } from './format';
import { catalogVersion } from './catalog-version';
import { nextRandom, shuffle } from './random';
import { moveCard } from './zones';
import { advanceTurnStep } from './turns';
import { runScheduler } from './scheduler';
import { RULE_ENGINE_VERSION } from './rule-scripts';
import './setup-script';
import type { Answer, Choice, Continuation, EngineContext, MatchState, RuleError, Seat, StartOptions } from './types';

type NonFieldZone = 'deck' | 'hand' | 'break' | 'removed' | 'damage' | 'commander';
const zones = (): Record<NonFieldZone, string[]> => ({ deck: [], hand: [], break: [], removed: [], damage: [], commander: [] });
const other = (seat: Seat): Seat => seat === 0 ? 1 : 0;
const newChoiceId = (state: MatchState): string => 'choice-' + state.nextId++;

function choice(state: MatchState, seat: Seat, kind: Choice['kind'], reason: string,
  options: Choice['options'], min: number, max: number, step: string, data: Continuation['data'] = null): void {
  state.choice = {
    id: newChoiceId(state), seat, kind, reason, options, min, max, allocation: null,
    resume: { handler: 'setup', step, data },
  };
}

function askMulligan(state: MatchState, index: number, firstSeat: Seat, context: EngineContext): void {
  if (index > 1) {
    state.choice = null;
    state.turn = 1;
    state.active = firstSeat;
    state.phase = 'active';
    state.priority = null;
    advanceTurnStep(state, context);
    return;
  }
  const seat = index === 0 ? firstSeat : other(firstSeat);
  choice(state, seat, 'mulligan', 'Keep your opening hand or redraw it once.',
    [{ id: 'keep', label: 'Keep', object: null }, { id: 'redraw', label: 'Redraw', object: null }], 1, 1,
    'mulligan-answer', { firstSeat, index });
}

function drawOpening(state: MatchState, seat: Seat): void {
  for (let index = 0; index < 5; index += 1) {
    const instance = state.zones[seat].deck[0];
    if (!instance) throw new Error('The validated opening deck must contain five cards.');
    moveCard(state, instance, 'hand');
  }
}

export function createMatch(options: StartOptions, context: EngineContext): MatchState {
  for (const deck of options.decks) {
    const errors = validateDeck(deck, options.format, context.catalog);
    if (errors.length) throw new Error(errors.map(item => item.message).join(' '));
  }
  const state: MatchState = {
    versions: { schema: '6', engine: '14', format: options.format.id,
      catalog: catalogVersion(context.catalog, context.registry?.manifest) },
    seq: 0, rng: options.seed >>> 0, nextId: 0, format: options.format,
    turn: 0, active: 0, firstPlayer: 0, phase: 'setup', priority: null, passes: 0,
    cards: {}, zones: { 0: zones(), 1: zones() }, field: [], stackCards: [],
    commanders: { 0: { instance: '', casts: 0 }, 1: { instance: '', casts: 0 } },
    stack: [], effects: [], triggers: [], work: [], choice: null, combat: null, result: null,
    execution: { frames: [], batch: null, returnWindow: { kind: 'priority', seat: 0 }, delayed: [] },
  };
  const manifests = options.decks;
  for (const seat of [0, 1] as const) {
    const deck = manifests[seat];
    const numbers = [deck.commander, ...deck.main];
    numbers.forEach((number, index) => {
      const instance = 'i' + seat + '-' + index;
      const card = context.catalog[number]!;
      state.cards[instance] = {
        instance, object: 'object-' + seat + '-' + index, card: number, owner: seat, controller: seat,
        zone: index === 0 ? 'commander' : 'deck', dull: false, damage: 0,
        controlledSinceTurn: 0, attackedTurn: null, frozen: false,
      };
      if (index === 0) {
        state.commanders[seat] = { instance, casts: 0 };
        state.zones[seat].commander.push(instance);
      } else {
        state.zones[seat].deck.push(instance);
      }
      void card;
    });
    const mixed = shuffle(state.zones[seat].deck, state.rng);
    state.rng = mixed.seed;
    state.zones[seat].deck = mixed.items;
  }
  const draw = nextRandom(state.rng);
  state.rng = draw.seed;
  const chooser: Seat = draw.value < 0.5 ? 0 : 1;
  const commander = state.cards[state.commanders[chooser].instance]!;
  const resume = { script: 'rules', version: RULE_ENGINE_VERSION, ability: 'setup', step: 'starting-player', payload: null };
  state.execution.frames.push({
    id: `frame-${state.nextId++}`, resume, mode: 'rule', controller: chooser, source: commander.object,
    lastKnown: { ...commander }, targets: [], selectedMode: null, remaining: [],
    returnWindow: { kind: 'priority', seat: chooser }, operationIndex: 0, scriptComplete: false,
  });
  const scheduled = runScheduler(state, context);
  if (scheduled.error) throw new Error(scheduled.error.message);
  return state;
}

export function answerChoice(state: MatchState, answer: Answer, seat: Seat, context: EngineContext): RuleError[] {
  const pending = state.choice;
  if (!pending || pending.id !== answer.choice) return [{ code: 'STALE_CHOICE', message: 'That decision is no longer open.' }];
  if ('script' in pending.resume) return [{ code: 'UNKNOWN_RESUME', message: 'The saved choice has no registered resolver.' }];
  if (pending.seat !== seat) return [{ code: 'WRONG_ACTOR', message: 'The other player must make this decision.' }];
  if (answer.selected.length < pending.min || answer.selected.length > pending.max) {
    return [{ code: 'WRONG_SELECTION_COUNT', message: 'Select the required number of options.' }];
  }
  const allowed = pending.options.map(option => option.id);
  if (answer.selected.some(id => !allowed.includes(id)) || new Set(answer.selected).size !== answer.selected.length) {
    return [{ code: 'INVALID_SELECTION', message: 'The selection contains an invalid or repeated option.' }];
  }
  const data = pending.resume.data as Record<string, number>;
  if (pending.resume.step === 'starting-player') {
    const firstSeat = answer.selected[0] === 'first' ? seat : other(seat);
    state.firstPlayer = firstSeat;
    state.active = firstSeat;
    drawOpening(state, 0);
    drawOpening(state, 1);
    askMulligan(state, 0, firstSeat, context);
    return [];
  }
  if (pending.resume.step === 'mulligan-answer') {
    const index = data.index!;
    const firstSeat = data.firstSeat as Seat;
    if (answer.selected[0] === 'keep') {
      askMulligan(state, index + 1, firstSeat, context);
    } else {
      const hand = state.zones[seat].hand;
      const options = hand.map(instance => ({ id: state.cards[instance]!.object, label: context.catalog[state.cards[instance]!.card]!.name, object: state.cards[instance]!.object }));
      choice(state, seat, 'order', 'Order the five cards to place on the bottom of your deck.',
        options, 5, 5, 'mulligan-order', { firstSeat, index });
    }
    return [];
  }
  if (pending.resume.step === 'mulligan-order') {
    if (answer.selected.length !== 5 || allowed.length !== 5) return [{ code: 'INVALID_ORDER', message: 'Order all five cards in your hand.' }];
    const ordered = answer.selected.map(object => state.zones[seat].hand.find(instance => state.cards[instance]!.object === object));
    if (ordered.some(instance => !instance)) return [{ code: 'STALE_CHOICE', message: 'A card in this decision has changed zones.' }];
    for (const instance of ordered) moveCard(state, instance!, 'deck');
    drawOpening(state, seat);
    askMulligan(state, data.index! + 1, data.firstSeat as Seat, context);
    return [];
  }
  return [{ code: 'UNSUPPORTED_CHOICE', message: 'This decision is not available during setup.' }];
}
