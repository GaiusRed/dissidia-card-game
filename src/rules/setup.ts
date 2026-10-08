import { validateDeck } from './format';
import { catalogVersion } from './catalog-version';
import { nextRandom, shuffle } from './random';
import { runScheduler } from './scheduler';
import { RULE_ENGINE_VERSION } from './rule-scripts';
import './setup-script';
import type { EngineContext, MatchState, Seat, StartOptions } from './types';

type NonFieldZone = 'deck' | 'hand' | 'break' | 'removed' | 'damage' | 'commander';
const zones = (): Record<NonFieldZone, string[]> => ({ deck: [], hand: [], break: [], removed: [], damage: [], commander: [] });

export function createMatch(options: StartOptions, context: EngineContext): MatchState {
  for (const deck of options.decks) {
    const errors = validateDeck(deck, options.format, context.catalog);
    if (errors.length) throw new Error(errors.map(item => item.message).join(' '));
  }
  const state: MatchState = {
    versions: { schema: '9', engine: '15', format: options.format.id,
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
