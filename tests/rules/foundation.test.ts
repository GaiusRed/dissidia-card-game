import { describe, expect, it } from 'vitest';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { opusPh } from '../../src/content/manifest';
import { applyCommand } from '../../src/rules/engine';
import { mvpFormat } from '../../src/rules/format';
import { createMatch } from '../../src/rules/setup';
import type { Command, MatchState } from '../../src/rules/types';
import { context } from '../support/harness';

function run(commandState: MatchState, command: Command): MatchState {
  const result = applyCommand(commandState, command, context);
  expect(result.ok).toBe(true);
  return result.state;
}

describe('rules foundation transcript', () => {
  it('replays a normal opening, legal Character cast, and concession deterministically', () => {
    let options = { seed: 0, decks: [cinderCompany, tidalAssembly] as [typeof cinderCompany, typeof tidalAssembly], format: mvpFormat };
    let state = createMatch(options, context);
    let candidate: { seat: 0 | 1; character: string; cpCard: string; element: 'Fire' | 'Water'; cost: number } | undefined;
    for (let seed = 0; seed < 256 && !candidate; seed += 1) {
      options = { ...options, seed };
      state = createMatch(options, context);
      const firstChoice = state.choice!;
      state = run(state, { id: 'choose-first', expectedSeq: state.seq, seat: firstChoice.seat, intent: { kind: 'answer', answer: { choice: firstChoice.id, selected: ['first'], amounts: {} } } });
      while (state.choice) {
        const pending = state.choice;
        const selected = pending.kind === 'mulligan' ? ['keep'] : pending.options.map(option => option.id);
        state = run(state, { id: 'keep-' + pending.seat, expectedSeq: state.seq, seat: pending.seat, intent: { kind: 'answer', answer: { choice: pending.id, selected, amounts: {} } } });
      }
      const seat = state.active;
      const hand = state.zones[seat].hand.map(instance => opusPh[state.cards[instance]!.card]!);
      candidate = hand.flatMap(character => hand.flatMap(cpCard => {
        if (character.number === cpCard.number || character.type === 'Summon' ||
            cpCard.elements.some(element => element === 'Light' || element === 'Dark')) return [];
        const common = character.elements.find(element => cpCard.elements.includes(element) &&
          (element === 'Fire' || element === 'Water'));
        if (!common || character.cost > 2) return [];
        return [{ seat, character: character.number, cpCard: cpCard.number, element: common as 'Fire' | 'Water', cost: character.cost }];
      }))[0];
    }
    expect(candidate).toBeDefined();
    if (!candidate) throw new Error('A legal opening cast was not found.');
    const transcript: Command[] = [];
    // Rebuild the selected seed and record each accepted setup answer.
    state = createMatch(options, context);
    const firstChoice = state.choice!;
    const firstCommand: Command = { id: 'choose-first', expectedSeq: state.seq, seat: firstChoice.seat, intent: { kind: 'answer', answer: { choice: firstChoice.id, selected: ['first'], amounts: {} } } };
    transcript.push(firstCommand);
    state = run(state, firstCommand);
    while (state.choice) {
      const pending = state.choice;
      const selected = pending.kind === 'mulligan' ? ['keep'] : pending.options.map(option => option.id);
      const command: Command = { id: 'keep-' + pending.seat, expectedSeq: state.seq, seat: pending.seat, intent: { kind: 'answer', answer: { choice: pending.id, selected, amounts: {} } } };
      transcript.push(command);
      state = run(state, command);
    }
    const char = Object.values(state.cards).find(card => card.card === candidate!.character && card.owner === candidate!.seat)!;
    const resource = Object.values(state.cards).find(card => card.card === candidate!.cpCard && card.owner === candidate!.seat)!;
    const cast: Command = { id: 'cast-one', expectedSeq: state.seq, seat: candidate.seat, intent: {
      kind: 'cast', source: char.object, targets: [], mode: null,
      payment: { discard: [resource.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [resource.object]: candidate.element }, spend: { [candidate.element]: candidate.cost } },
    } };
    transcript.push(cast);
    state = run(state, cast);
    expect(state.cards[char.instance]!.zone).toBe('field');
    expect(state.cards[resource.instance]!.zone).toBe('break');
    const concession: Command = { id: 'concede', expectedSeq: state.seq, seat: candidate.seat === 0 ? 1 : 0, intent: { kind: 'concede' } };
    transcript.push(concession);
    state = run(state, concession);
    const replay = transcript.reduce((current, command) => run(current, command), createMatch(options, context));
    expect(replay).toEqual(state);
  });
});
