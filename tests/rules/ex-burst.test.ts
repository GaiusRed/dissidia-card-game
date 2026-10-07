import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/rules/engine';
import { continueDamageEx, dealPlayerDamage } from '../../src/rules/damage';
import { moveCard } from '../../src/rules/zones';
import { context, fixture } from '../support/harness';
import type { MatchState, Seat } from '../../src/rules/types';

function send(state: MatchState, seat: Seat, intent: Parameters<typeof applyCommand>[1]['intent']): MatchState {
  const result = applyCommand(state, { id: `ex-${state.seq}`, expectedSeq: state.seq, seat, intent }, context);
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.state;
}
function passBoth(state: MatchState, order: [Seat, Seat]): MatchState {
  void order;
  for (let i = 0; i < 2; i += 1) state = send(state, state.priority!, { kind: 'pass' });
  if (state.combat?.step === 'block') state = send(state, state.priority!, { kind: 'block', blocker: null });
  if (state.combat?.step === 'damage') {
    for (let i = 0; i < 2; i += 1) state = send(state, state.priority!, { kind: 'pass' });
  }
  return state;
}

describe('EX Burst', () => {
  it('resolves Scorch from damage and offers a Forward target', () => {
    const h = fixture({ phase: 'attack', active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-023C', zone: 'field' }, { seat: 0, card: 'P-003C', zone: 'field' },
      { seat: 0, card: 'P-004C', zone: 'field' },
    ], deckTop: { 0: ['P-015C'] } });
    let state = h.state;
    const attacker = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-004C')!;
    state = send(state, 1, { kind: 'attack', members: [attacker.object] });
    state = passBoth(state, [0, 1]);
    expect(state.zones[0].damage).toHaveLength(1);
    expect(state.stack).toEqual([]);
    expect(state.priority).toBeNull();
    expect(state.choice?.seat).toBe(0);
    expect(state.choice?.resume.handler).toBe('scorch-ex-burst');
    expect(state.choice?.options.map(option => option.id)).toEqual(['use', 'skip']);
    const attemptedResponse = applyCommand(state, { id: 'ex-response', expectedSeq: state.seq, seat: 1, intent: { kind: 'pass' } }, context);
    expect(attemptedResponse.ok).toBe(false);
    if (!attemptedResponse.ok) expect(attemptedResponse.error.code).toBe('DECISION_REQUIRED');
    state = JSON.parse(JSON.stringify(state)) as MatchState;
    state = send(state, 0, { kind: 'answer', answer: { choice: state.choice!.id, selected: ['use'], amounts: {} } });
    expect(state.choice?.reason).toContain('Scorch EX Burst');
    state = send(state, 0, { kind: 'answer', answer: { choice: state.choice!.id, selected: [target.object], amounts: {} } });
    expect(state.cards[target.instance]!.damage).toBe(4000);
    expect(state.cards[state.zones[0].damage[0]!]!.card).toBe('P-015C');
  });

  it('resolves Archive Keeper from damage with its draw and discard effect', () => {
    const h = fixture({ phase: 'attack', active: 0, priority: 0, placements: [
      { seat: 0, card: 'P-003C', zone: 'field' }, { seat: 1, card: 'P-023C', zone: 'field' },
      { seat: 1, card: 'P-022C', zone: 'hand' },
    ], deckTop: { 1: ['P-031R', 'P-024C'] } });
    let state = h.state;
    const attacker = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    state = send(state, 0, { kind: 'attack', members: [attacker.object] });
    state = passBoth(state, [1, 0]);
    expect(state.stack).toEqual([]);
    expect(state.choice?.resume.handler).toBe('archive-keeper-ex-burst');
    state = send(state, 1, { kind: 'answer', answer: { choice: state.choice!.id, selected: ['use'], amounts: {} } });
    expect(state.choice?.seat).toBe(1);
    expect(state.choice?.reason).toContain('Archive Keeper');
    const discarded = Object.values(state.cards).find(card => card.card === 'P-022C')!;
    state = send(state, 1, { kind: 'answer', answer: { choice: state.choice!.id, selected: [discarded.object], amounts: {} } });
    expect(state.cards[discarded.instance]!.zone).toBe('break');
    expect(Object.values(state.cards).find(card => card.card === 'P-024C')!.zone).toBe('hand');
  });

  it('resolves Return Tide from damage and returns a chosen Forward', () => {
    const h = fixture({ phase: 'attack', active: 0, priority: 0, placements: [
      { seat: 0, card: 'P-003C', zone: 'field' }, { seat: 1, card: 'P-023C', zone: 'field' },
    ], deckTop: { 1: ['P-035C'] } });
    let state = h.state;
    const attacker = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    state = send(state, 0, { kind: 'attack', members: [attacker.object] });
    state = passBoth(state, [1, 0]);
    expect(state.stack).toEqual([]);
    expect(state.choice?.resume.handler).toBe('return-tide-ex-burst');
    state = send(state, 1, { kind: 'answer', answer: { choice: state.choice!.id, selected: ['use'], amounts: {} } });
    expect(state.choice?.seat).toBe(1);
    state = send(state, 1, { kind: 'answer', answer: { choice: state.choice!.id, selected: [target.object], amounts: {} } });
    expect(state.cards[target.instance]!.zone).toBe('hand');
    expect(state.cards[state.zones[1].damage[0]!]!.card).toBe('P-035C');
  });

  it('finishes the damage batch before offering EX Burst cards in damage order', () => {
    const h = fixture({ phase: 'attack', active: 0, priority: 0, placements: [
      { seat: 0, card: 'P-003C', zone: 'field' }, { seat: 1, card: 'P-023C', zone: 'field' },
    ], deckTop: { 1: ['P-031R', 'P-035C', 'P-024C'] } });
    let state = h.state;
    dealPlayerDamage(state, 1, 3, 'batch test', context);
    continueDamageEx(state, context);
    expect(state.zones[1].damage.map(instance => state.cards[instance]!.card)).toEqual(['P-031R', 'P-035C', 'P-024C']);
    expect(state.choice?.seat).toBe(1);
    expect(state.choice?.reason).toContain('Archive Keeper');
    state = send(state, 1, { kind: 'answer', answer: { choice: state.choice!.id, selected: ['skip'], amounts: {} } });
    expect(state.choice?.reason).toContain('Return Tide');
    state = send(state, 1, { kind: 'answer', answer: { choice: state.choice!.id, selected: ['skip'], amounts: {} } });
    expect(state.choice).toBeNull();
    expect(state.priority).toBe(state.active);
    expect(state.stack).toEqual([]);
    expect(state.zones[1].damage).toHaveLength(3);
  });

  it('checks the seven-damage rule process after the complete EX sequence', () => {
    const h = fixture({ phase: 'attack', active: 0, priority: 0, placements: [
      { seat: 0, card: 'P-003C', zone: 'field' }, { seat: 1, card: 'P-023C', zone: 'field' },
    ], deckTop: { 1: ['P-031R', 'P-035C', 'P-024C'] } });
    const existingDamage = h.state.zones[1].deck.slice(2, 8);
    for (const instance of existingDamage) moveCard(h.state, instance, 'damage');
    let state = h.state;
    dealPlayerDamage(state, 1, 2, 'two-point damage batch', context);
    continueDamageEx(state, context);
    expect(state.zones[1].damage).toHaveLength(8);
    expect(state.result).toBeNull();
    expect(state.choice?.reason).toContain('Archive Keeper');
    state = send(state, 1, { kind: 'answer', answer: { choice: state.choice!.id, selected: ['skip'], amounts: {} } });
    expect(state.choice?.reason).toContain('Return Tide');
    state = send(state, 1, { kind: 'answer', answer: { choice: state.choice!.id, selected: ['skip'], amounts: {} } });
    expect(state.result).toEqual({ winner: 0, reason: 'damage' });
  });
});
