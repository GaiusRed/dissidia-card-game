import { opusPh } from '../../src/content/opus-ph';
import { abilityHandlers } from '../../src/content/handlers';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import type { CardObject, EngineContext, MatchState, ObjectId, Phase, Seat, Zone } from '../../src/rules/types';

export interface Placement {
  seat: Seat; card: string; zone: Zone; dull?: boolean; damage?: number;
  controlledSinceTurn?: number; attackedTurn?: number;
}
export interface Fixture {
  phase?: Phase; active?: Seat; priority?: Seat; turn?: number;
  placements?: Placement[]; commanderCasts?: Partial<Record<Seat, number>>;
  deckTop?: Partial<Record<Seat, string[]>>;
}
export interface Harness {
  state: MatchState;
  object(seat: Seat, card: string): ObjectId;
}
export const context: EngineContext = { catalog: opusPh, handlers: abilityHandlers };

export function fixture(input: Fixture): Harness {
  const state: MatchState = {
    versions: { schema: '1', engine: '2', format: 'commander-duel-ph-v1', catalog: 'opus-ph-v1' },
    seq: 0, rng: 17, nextId: 41, format: { id: 'commander-duel-ph-v1', mainSize: 19, allowedSets: ['opus-ph'], damageLimit: 7 },
    turn: input.turn ?? 3, active: input.active ?? 0, firstPlayer: 0, phase: input.phase ?? 'main1',
    priority: input.priority ?? input.active ?? 0, passes: 0, cards: {},
    zones: {
      0: { deck: [], hand: [], break: [], removed: [], damage: [], commander: [] },
      1: { deck: [], hand: [], break: [], removed: [], damage: [], commander: [] },
    },
    field: [], stackCards: [], commanders: { 0: { instance: '', casts: 0 }, 1: { instance: '', casts: 0 } },
    stack: [], effects: [], triggers: [], work: [], choice: null, combat: null, result: null,
  };
  const manifests = [cinderCompany, tidalAssembly];
  for (const seat of [0, 1] as const) {
    const deck = manifests[seat]!;
    const all = [deck.commander, ...deck.main];
    all.forEach((number, index) => {
      const instance = `i${seat}-${index}`;
      const card: CardObject = {
        instance, object: `o${seat}-${index}`, card: number, owner: seat, controller: seat,
        zone: number === deck.commander ? 'commander' : 'deck', dull: false, damage: 0,
        controlledSinceTurn: 0, attackedTurn: null, frozen: false,
      };
      state.cards[instance] = card;
      if (number === deck.commander) {
        state.commanders[seat] = { instance, casts: input.commanderCasts?.[seat] ?? 0 };
        state.zones[seat].commander.push(instance);
      }
      else state.zones[seat].deck.push(instance);
    });
  }
  for (const placement of input.placements ?? []) {
    const instance = Object.values(state.cards).find(card => card.owner === placement.seat && card.card === placement.card)?.instance;
    if (!instance) throw new Error(`No owned test card ${placement.card} for seat ${placement.seat}`);
    const object = state.cards[instance]!;
    const location = object.zone === 'field' ? state.field : object.zone === 'stack' ? state.stackCards : state.zones[object.owner][object.zone];
    const index = location.indexOf(instance);
    if (index >= 0) location.splice(index, 1);
    object.zone = placement.zone;
    object.controller = placement.seat;
    object.dull = placement.dull ?? false;
    object.damage = placement.damage ?? 0;
    object.controlledSinceTurn = placement.controlledSinceTurn ?? 1;
    object.attackedTurn = placement.attackedTurn ?? null;
    const target = placement.zone === 'field' ? state.field : placement.zone === 'stack' ? state.stackCards : state.zones[placement.seat][placement.zone];
    target.push(instance);
  }
  for (const seat of [0, 1] as const) {
    const top = input.deckTop?.[seat] ?? [];
    for (const number of [...top].reverse()) {
      const instance = state.zones[seat].deck.find(id => state.cards[id]!.card === number);
      if (instance) {
        state.zones[seat].deck.splice(state.zones[seat].deck.indexOf(instance), 1);
        state.zones[seat].deck.unshift(instance);
      }
    }
  }
  return {
    state,
    object(seat, card) {
      const found = Object.values(state.cards).find(item => item.owner === seat && item.card === card);
      if (!found) throw new Error(`No owned test card ${card} for seat ${seat}`);
      return found.object;
    },
  };
}
