import { cinderCompany, tidalAssembly } from '../content/decks';
import { opusPh } from '../content/opus-ph';
import { mvpFormat } from '../rules/format';
import { assertInvariants } from '../rules/invariants';
import { createMatch } from '../rules/setup';
import { moveCard } from '../rules/zones';
import type { EngineContext, MatchState, Seat } from '../rules/types';
import type { Fixture } from './types';

const seatSchema = (seat: unknown): seat is Seat => seat === 0 || seat === 1;

/** Build a validated, deterministic test/playtest starting position. */
export function buildFixture(input: Fixture, context: EngineContext): MatchState {
  if (input.active !== undefined && !seatSchema(input.active)) throw new Error('Scenario fixture has an invalid active seat.');
  if (input.priority !== undefined && !seatSchema(input.priority)) throw new Error('Scenario fixture has an invalid priority seat.');
  if (input.turn !== undefined && (!Number.isSafeInteger(input.turn) || input.turn < 1)) throw new Error('Scenario fixture turn must be a positive integer.');
  for (const seat of [0, 1] as const) {
    const count = input.commanderCasts?.[seat];
    if (count !== undefined && (!Number.isSafeInteger(count) || count < 0)) throw new Error('Commander cast count must be a nonnegative integer.');
  }

  const state = createMatch({ seed: 17, decks: [cinderCompany, tidalAssembly], format: mvpFormat }, context);
  for (const seat of [0, 1] as const) {
    for (const instance of [...state.zones[seat].hand]) moveCard(state, instance, 'deck');
  }
  const placed = new Set<string>();
  for (const placement of input.placements ?? []) {
    if (!seatSchema(placement.seat)) throw new Error('Scenario placement has an invalid owner.');
    if (!context.catalog[placement.card] || !opusPh[placement.card]) throw new Error(`Scenario contains unknown card ${placement.card}.`);
    const key = `${placement.seat}/${placement.card}`;
    if (placed.has(key)) throw new Error(`Scenario places ${placement.card} more than once for seat ${placement.seat}.`);
    placed.add(key);
    for (const value of [placement.damage ?? 0, placement.controlledSinceTurn ?? 1, placement.attackedTurn ?? 0]) {
      if (!Number.isSafeInteger(value) || value < 0) throw new Error('Scenario counters must be nonnegative integers.');
    }
    const card = Object.values(state.cards).find(item => item.owner === placement.seat && item.card === placement.card);
    if (!card) throw new Error(`Scenario card ${placement.card} is not in seat ${placement.seat}'s deck.`);
    moveCard(state, card.instance, placement.zone);
    const moved = state.cards[card.instance]!;
    moved.controller = placement.seat;
    moved.dull = placement.dull ?? false;
    moved.damage = placement.damage ?? 0;
    moved.controlledSinceTurn = placement.controlledSinceTurn ?? 1;
    moved.attackedTurn = placement.attackedTurn ?? null;
  }
  for (const seat of [0, 1] as const) {
    const requested = input.deckTop?.[seat] ?? [];
    if (new Set(requested).size !== requested.length) throw new Error(`Scenario deck top repeats a card for seat ${seat}.`);
    for (const number of [...requested].reverse()) {
      const card = Object.values(state.cards).find(item => item.owner === seat && item.card === number && item.zone === 'deck');
      if (!card) throw new Error(`Scenario deck top card ${number} is not in seat ${seat}'s deck.`);
      moveCard(state, card.instance, 'deck', 0);
    }
  }
  for (const seat of [0, 1] as const) state.commanders[seat].casts = input.commanderCasts?.[seat] ?? 0;
  state.turn = input.turn ?? 3;
  state.active = input.active ?? 0;
  state.firstPlayer = state.active;
  state.phase = input.phase ?? 'main1';
  state.priority = input.priority ?? state.active;
  state.passes = 0;
  state.choice = null;
  state.execution.frames = [];
  state.execution.returnWindow = { kind: 'priority', seat: state.priority };
  state.result = null;
  assertInvariants(state, context);
  return state;
}
