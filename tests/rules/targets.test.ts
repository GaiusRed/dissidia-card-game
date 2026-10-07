import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/rules/engine';
import { context, fixture } from '../support/harness';
import type { MatchState, Seat } from '../../src/rules/types';
import { legalActions } from '../../src/rules/actions';
import { effectivePower, hasKeyword } from '../../src/rules/continuous';

function send(state: MatchState, seat: Seat, intent: Parameters<typeof applyCommand>[1]['intent']): MatchState {
  const result = applyCommand(state, { id: `target-${state.seq}`, expectedSeq: state.seq, seat, intent }, context);
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.state;
}
function passBoth(state: MatchState): MatchState {
  const first = state.priority;
  if (first === null) throw new Error('Priority was not assigned.');
  const second: Seat = first === 0 ? 1 : 0;
  return send(send(state, first, { kind: 'pass' }), second, { kind: 'pass' });
}

describe('target revalidation', () => {
  it('offers and resolves War Cry on an opponent Forward', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-017R', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 1, card: 'P-026R', zone: 'field' },
    ] });
    let state = h.state;
    const summon = Object.values(state.cards).find(card => card.card === 'P-017R')!;
    const paymentCard = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const opponentForward = Object.values(state.cards).find(card => card.card === 'P-026R')!;
    const offer = legalActions(state, 0, context).find(action => action.source === summon.object);
    expect(offer?.targetOptions.map(option => option.id)).toContain(opponentForward.object);
    state = send(state, 0, { kind: 'cast', source: summon.object, targets: [opponentForward.object], mode: null,
      payment: { discard: [paymentCard.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [paymentCard.object]: 'Fire' }, spend: { Fire: 1 } } });
    state = passBoth(state);
    expect(effectivePower(state, opponentForward.object, context)).toBe(9000);
    expect(hasKeyword(state, opponentForward.object, 'Brave', context)).toBe(true);
  });

  it('does not break an Ashen Verdict target that becomes active before resolution', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-018R', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-004C', zone: 'hand' }, { seat: 1, card: 'P-030C', zone: 'field' },
      { seat: 1, card: 'P-023C', zone: 'field', dull: true },
    ] });
    let state = h.state;
    const summon = Object.values(state.cards).find(card => card.card === 'P-018R')!;
    const first = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const second = Object.values(state.cards).find(card => card.card === 'P-004C')!;
    const wave = Object.values(state.cards).find(card => card.card === 'P-030C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    state = send(state, 0, { kind: 'cast', source: summon.object, targets: [target.object], mode: null, payment: {
      discard: [first.object, second.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
      sourceElements: { [first.object]: 'Fire', [second.object]: 'Fire' }, spend: { Fire: 3 },
    } });
    state = send(state, 0, { kind: 'pass' });
    state = send(state, 1, { kind: 'activate', source: wave.object, ability: 'wave-apprentice-action', targets: [target.object], payment: {
      discard: [], dullBackups: [], specialDiscard: null, dullSource: true, sacrificeSource: false, sourceElements: {}, spend: {},
    } });
    state = passBoth(state); // Wave Apprentice resolves first.
    expect(state.cards[target.instance]!.dull).toBe(false);
    state = passBoth(state); // Ashen Verdict must fizzle.
    expect(state.cards[target.instance]!.zone).toBe('field');
  });

  it('rejects duplicate objects as Twin Embers targets', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-016R', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-004C', zone: 'field' },
    ] });
    const state = h.state;
    const summon = Object.values(state.cards).find(card => card.card === 'P-016R')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-004C')!;
    const result = applyCommand(state, { id: 'twin-same-target', expectedSeq: state.seq, seat: 0, intent: {
      kind: 'cast', source: summon.object, targets: [target.object, target.object], mode: null, payment: {
        discard: [Object.values(state.cards).find(card => card.card === 'P-003C')!.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [Object.values(state.cards).find(card => card.card === 'P-003C')!.object]: 'Fire' }, spend: { Fire: 2 },
      },
    } }, context);
    expect(result.ok).toBe(false);
  });
});
