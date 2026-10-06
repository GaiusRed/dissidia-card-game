import { describe, expect, it } from 'vitest';
import { commanderCost } from '../../src/rules/commander';
import { requestDeparture, resolveDeparture } from '../../src/rules/commander';
import { fixture, context } from '../support/harness';

describe('Commander tax', () => {
  it('adds two CP per successful Commander Zone cast and does not tax a hand cast', () => {
    const h = fixture({ commanderCasts: { 0: 2 } });
    const instance = h.state.commanders[0].instance;
    expect(commanderCost(h.state, instance, context)).toBe(7);
    h.state.cards[instance]!.zone = 'hand';
    expect(commanderCost(h.state, instance, context)).toBe(3);
  });
  it('does not tax another card with the same name', () => {
    const h = fixture({ commanderCasts: { 0: 2 } });
    const namesake = Object.values(h.state.cards).find(card => card.card === 'P-002C')!;
    expect(commanderCost(h.state, namesake.instance, context)).toBe(2);
  });
  it('asks the Commander owner when another player controls it as it leaves the field', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-001L', zone: 'field' }] });
    const instance = h.state.commanders[0].instance;
    h.state.cards[instance]!.controller = 1;
    const before = h.state.cards[instance]!.object;
    requestDeparture(h.state, instance, 'break');
    expect(h.state.choice?.seat).toBe(0);
    expect(h.state.cards[instance]!.zone).toBe('field');
    expect(resolveDeparture(h.state, 'return')?.old.object).toBe(before);
    expect(h.state.cards[instance]!.zone).toBe('commander');
    expect(h.state.cards[instance]!.object).not.toBe(before);
    expect(h.state.commanders[0].casts).toBe(0);
  });
  it('uses the normal destination if its owner declines the replacement', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-001L', zone: 'field' }] });
    const instance = h.state.commanders[0].instance;
    requestDeparture(h.state, instance, 'break');
    const receipt = resolveDeparture(h.state, 'destination');
    expect(receipt?.destination).toBe('break');
    expect(h.state.zones[0].break).toEqual([instance]);
  });
});
