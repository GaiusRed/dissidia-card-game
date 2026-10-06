import { describe, expect, it } from 'vitest';
import { checkOutcomes } from '../../src/rules/outcomes';
import { fixture, context } from '../support/harness';

describe('game outcomes', () => {
  it('ends at seven damage and draws if both seats meet the defeat limit together', () => {
    const h = fixture({});
    h.state.zones[1].damage = h.state.zones[1].deck.splice(0, 7);
    checkOutcomes(h.state, context);
    expect(h.state.result).toEqual({ winner: 0, reason: 'damage' });
    const both = fixture({});
    both.state.zones[0].damage = both.state.zones[0].deck.splice(0, 7);
    both.state.zones[1].damage = both.state.zones[1].deck.splice(0, 7);
    checkOutcomes(both.state, context);
    expect(both.state.result).toEqual({ winner: null, reason: 'simultaneous' });
  });
  it('does not lose merely because a main deck has become empty', () => {
    const h = fixture({});
    h.state.zones[0].deck.length = 0;
    checkOutcomes(h.state, context);
    expect(h.state.result).toBeNull();
  });
});
