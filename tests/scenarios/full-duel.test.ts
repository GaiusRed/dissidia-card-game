import { describe, expect, it } from 'vitest';
import { abilityHandlers } from '../../src/content/handlers';
import { opusPh } from '../../src/content/opus-ph';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { applyCommand } from '../../src/rules/engine';
import { createMatch } from '../../src/rules/setup';
import { mvpFormat } from '../../src/rules/format';
import type { Command, EngineContext, Intent, MatchState, Seat } from '../../src/rules/types';

const context: EngineContext = { catalog: opusPh, handlers: abilityHandlers };

function send(state: MatchState, seat: Seat, intent: Intent): MatchState {
  const command: Command = { id: `duel-${state.seq}`, expectedSeq: state.seq, seat, intent };
  const transition = applyCommand(state, command, context);
  if (!transition.ok) throw new Error(`${transition.error.code}: ${transition.error.message}`);
  return transition.state;
}

function passBoth(state: MatchState): MatchState {
  const settleChoices = (): void => {
    while (state.choice && !state.result) {
      const choice = state.choice;
      const selected = choice.kind === 'confirm' && choice.options.some(option => option.id === 'skip')
        ? ['skip'] : choice.kind === 'order' ? choice.options.map(option => option.id)
          : choice.options.slice(0, choice.min).map(option => option.id);
      state = send(state, choice.seat, { kind: 'answer', answer: { choice: choice.id, selected, amounts: {} } });
    }
  };
  settleChoices();
  for (let count = 0; count < 2; count += 1) {
    if (state.result) return state;
    const seat = state.priority;
    if (seat === null) throw new Error('Expected a player with priority.');
    state = send(state, seat, { kind: 'pass' });
    settleChoices();
  }
  return state;
}

function castCheapForward(state: MatchState): MatchState {
  while (true) {
    const candidates = state.zones[0].hand.map(instance => state.cards[instance]!)
      .filter(card => opusPh[card.card]!.type === 'Forward' && opusPh[card.card]!.cost <= 2)
      .sort((a, b) => opusPh[a.card]!.cost - opusPh[b.card]!.cost);
    let casted = false;
    for (const candidate of candidates) {
      const definition = opusPh[candidate.card]!;
      const colorless = definition.elements.some(element => element === 'Light' || element === 'Dark');
      const paymentSource = state.zones[0].hand.map(instance => state.cards[instance]!).find(card => {
        if (card.instance === candidate.instance) return false;
        const sourceDefinition = opusPh[card.card]!;
        if (sourceDefinition.elements.some(element => element === 'Light' || element === 'Dark')) return false;
        return colorless || sourceDefinition.elements.some(element => definition.elements.includes(element));
      });
      if (!paymentSource) continue;
      const paymentElement = opusPh[paymentSource.card]!.elements[0]!;
      const payment = {
        discard: [paymentSource.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [paymentSource.object]: paymentElement }, spend: { [paymentElement]: definition.cost },
      };
      const transition = applyCommand(state, { id: `duel-${state.seq}`, expectedSeq: state.seq, seat: 0,
        intent: { kind: 'cast', source: candidate.object, targets: [], mode: null, payment } }, context);
      if (transition.ok) {
        state = transition.state;
        casted = true;
        break;
      }
    }
    if (!casted) return state;
  }
}

function castFinalSpark(state: MatchState): MatchState {
  const summon = state.zones[0].hand.map(instance => state.cards[instance]!).find(card => card.card === 'P-019H');
  if (!summon) return state;
  const sources = state.zones[0].hand.map(instance => state.cards[instance]!).filter(card => card.instance !== summon.instance &&
    opusPh[card.card]!.elements.includes('Fire') && !opusPh[card.card]!.elements.some(element => element === 'Light' || element === 'Dark')).slice(0, 2);
  if (sources.length < 2) return state;
  const sourceElements = Object.fromEntries(sources.map(card => [card.object, 'Fire' as const]));
  const transition = applyCommand(state, { id: `duel-${state.seq}`, expectedSeq: state.seq, seat: 0, intent: {
    kind: 'cast', source: summon.object, targets: [], mode: null,
    payment: { discard: sources.map(card => card.object), dullBackups: [], specialDiscard: null, dullSource: false,
      sacrificeSource: false, sourceElements, spend: { Fire: 4 } },
  } }, context);
  return transition.ok ? transition.state : state;
}

describe('normal-start full duel transcript', () => {
  it('wins by seven damage through accepted commands from createMatch', () => {
    const options = Array.from({ length: 1000 }, (_, index) => ({
      seed: index + 1,
      decks: [cinderCompany, tidalAssembly] as [typeof cinderCompany, typeof tidalAssembly],
      format: mvpFormat,
    })).find(candidate => {
      const state = createMatch(candidate, context);
      const hand = state.zones[0].hand.map(instance => state.cards[instance]!.card);
      return hand.includes('P-003C') && hand.some(number => number !== 'P-003C' && opusPh[number]!.elements.includes('Fire'));
    });
    if (!options) throw new Error('No suitable deterministic opening seed was found.');
    let state = createMatch(options, context);

    const initialChoice = state.choice!;
    state = send(state, initialChoice.seat, { kind: 'answer', answer: {
      choice: initialChoice.id, selected: [initialChoice.seat === 0 ? 'first' : 'second'], amounts: {},
    } });
    for (const keep of ['keep', 'keep']) {
      const decision = state.choice!;
      state = send(state, decision.seat, { kind: 'answer', answer: { choice: decision.id, selected: [keep], amounts: {} } });
    }

    const recruit = state.zones[0].hand.map(instance => state.cards[instance]!).find(card => card.card === 'P-003C')!;
    const discard = state.zones[0].hand.map(instance => state.cards[instance]!).find(card => card.instance !== recruit.instance && opusPh[card.card]!.elements.includes('Fire'))!;
    state = send(state, 0, { kind: 'cast', source: recruit.object, targets: [], mode: null, payment: {
      discard: [discard.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
      sourceElements: { [discard.object]: 'Fire' }, spend: { Fire: 1 },
    } });

    for (let turn = 0; turn < 16 && !state.result; turn += 1) {
      const active = state.active;
      if (active === 0) {
        const beforeSpark = state.seq;
        state = castFinalSpark(state);
        if (state.seq !== beforeSpark) state = passBoth(state);
        if (state.result) break;
        state = castCheapForward(state);
      }
      state = passBoth(state); // Main 1 to Attack
      if (active === 0) {
        const attackers = state.field.map(instance => state.cards[instance]!).filter(card => card.controller === 0 &&
          opusPh[card.card]!.type === 'Forward' && !card.dull && card.attackedTurn !== state.turn && card.controlledSinceTurn < state.turn);
        for (const attacker of attackers) {
          state = send(state, 0, { kind: 'attack', members: [state.cards[attacker.instance]!.object] });
          state = passBoth(state); // Resolve this sequential attack
          if (state.result) break;
        }
      }
      if (state.combat) {
        state = passBoth(state); // Resolve combat
      }
      if (state.result) break;
      state = passBoth(state); // Attack to Main 2
      state = passBoth(state); // Main 2 to End
      state = passBoth(state); // End to next Active/Draw/Main 1
    }

    expect(state.result).toEqual({ winner: 0, reason: 'damage' });
    expect(state.zones[1].damage).toHaveLength(7);
  });

  it('records a deckout after normal setup with Player 2 starting', () => {
    let state = createMatch({ seed: 407, decks: [cinderCompany, tidalAssembly], format: mvpFormat }, context);
    const opening = state.choice!;
    state = send(state, opening.seat, { kind: 'answer', answer: {
      choice: opening.id, selected: [opening.seat === 1 ? 'first' : 'second'], amounts: {},
    } });
    for (const keep of ['keep', 'keep']) {
      const decision = state.choice!;
      state = send(state, decision.seat, { kind: 'answer', answer: { choice: decision.id, selected: [keep], amounts: {} } });
    }

    for (let turn = 0; turn < 16 && !state.result; turn += 1) {
      state = passBoth(state); // Main 1 to Attack
      state = passBoth(state); // Attack to Main 2
      state = passBoth(state); // Main 2 to End
      state = passBoth(state); // End to the next turn
    }

    expect(state.result).toEqual({ winner: 0, reason: 'deckout' });
  });
});
