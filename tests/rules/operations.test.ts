import { describe, expect, it } from 'vitest';
import { applyOperation } from '../../src/rules/operations';
import { addPower } from '../../src/rules/continuous';
import { context, fixture } from '../support/harness';

describe('generic rule operations', () => {
  it('draws the requested cards from the top of the selected deck', () => {
    const state = fixture({ deckTop: { 0: ['P-002C', 'P-003C'] } }).state;
    const beforeHand = state.zones[0].hand.length;
    const result = applyOperation(state, { kind: 'draw', seat: 0, count: 2 }, context);
    expect(result.error).toBeNull();
    expect(state.zones[0].hand).toHaveLength(beforeHand + 2);
    expect(state.cards[state.zones[0].hand.at(-1)!]!.card).toBe('P-003C');
    expect(result.events.map(event => event.type)).toEqual(['card.drawn', 'card.drawn']);
  });

  it('reports unknown move targets without changing the state', () => {
    const state = fixture({}).state;
    const before = JSON.parse(JSON.stringify(state)) as typeof state;
    const result = applyOperation(state, { kind: 'move', object: 'missing', to: 'break', index: null }, context);
    expect(result.error?.code).toBe('UNKNOWN_OBJECT');
    expect(state).toEqual(before);
  });

  it('publishes last-known type and controller when a card changes zones', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-005R', zone: 'field' }] });
    const forward = h.state.cards[h.state.field[0]!]!;
    const object = forward.object;
    const result = applyOperation(h.state, { kind: 'move', object, to: 'break', index: null }, context);
    expect(result.events[0]?.data).toMatchObject({ object, card: 'P-005R', type: 'Forward', controller: 0,
      from: 'field', to: 'break' });
  });

  it('publishes effective last-known power for a Forward that leaves the field', () => {
    const h = fixture({ placements: [{ seat: 1, card: 'P-027H', zone: 'field' }] });
    const forward = h.state.cards[h.state.field[0]!]!;
    addPower(h.state, forward.object, forward.object, 1000, h.state.turn);
    const result = applyOperation(h.state, { kind: 'move', object: forward.object, to: 'break', index: null }, context);
    expect(result.events[0]?.data).toMatchObject({ card: 'P-027H', from: 'field', to: 'break', power: 8000 });
  });

  it('persists the next matching controller End Phase without retroactive eligibility', () => {
    const state = fixture({}).state;
    state.turn = 5;
    state.active = 0;
    state.phase = 'main1';
    const resume = { script: 'rules', version: '5', ability: 'test-delayed', step: 'resolve', payload: null } as const;
    const source = Object.values(state.cards).find(card => card.card === 'P-001L')!;
    applyOperation(state, { kind: 'delay', at: 'controller-end', controller: 0, source: source.object, resume }, context);
    applyOperation(state, { kind: 'delay', at: 'controller-end', controller: 1, source: source.object, resume }, context);
    state.phase = 'end';
    applyOperation(state, { kind: 'delay', at: 'controller-end', controller: 0, source: source.object, resume }, context);
    expect(state.execution.delayed.map(item => [item.controller, item.createdTurn, item.eligibleTurn]))
      .toEqual([[0, 5, 5], [1, 5, 6], [0, 5, 7]]);
    expect(JSON.parse(JSON.stringify(state.execution.delayed))).toEqual(state.execution.delayed);
  });
});
