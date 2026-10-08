import { describe, expect, it } from 'vitest';
import { assertInvariants } from '../../src/rules/invariants';
import { context } from '../support/harness';
import { loadScenario, scenarioCatalog } from '../../src/scenarios/catalog';
import { buildFixture } from '../../src/scenarios/fixtures';

describe('focused scenario catalog', () => {
  it('loads every validated scenario as a serializable new match origin', () => {
    expect(scenarioCatalog.map(scenario => scenario.id)).toEqual([
      'commander-third-cast', 'multi-ex', 'control-conflict', 'battlefield-card-status', 'end-phase-two-card-discard', 'end-trigger-order', 'party-first-strike', 'commander-destinations', 'commander-removed-destination', 'commander-break-destination',
      'return-tide-affordable', 'twin-embers-target-selection', 'summon-without-payment', 'duplicate-name-conflict', 'light-dark-conflict', 'commander-entry-target',
    ]);
    for (const scenario of scenarioCatalog) {
      const state = loadScenario(scenario.id, context);
      expect(() => assertInvariants(state, context)).not.toThrow();
      expect(JSON.parse(JSON.stringify(state))).toEqual(state);
      expect(scenario.version).toBeGreaterThan(0);
      expect(scenario.title).not.toBe('');
      expect(scenario.expected.length).toBeGreaterThan(0);
    }
  });

  it('rejects unknown presets and invalid fixture data', () => {
    expect(() => loadScenario('does-not-exist', context)).toThrow('Unknown scenario');
    expect(() => buildFixture({ placements: [{ seat: 0, card: 'unknown', zone: 'field' }] }, context)).toThrow('unknown card');
    expect(() => buildFixture({ placements: [
      { seat: 0, card: 'P-003C', zone: 'field' }, { seat: 0, card: 'P-003C', zone: 'hand' },
    ] }, context)).toThrow('more than once');
    expect(() => buildFixture({ turn: -1 }, context)).toThrow('positive integer');
    expect(() => buildFixture({ deckTop: { 1: ['P-035C', 'P-035C'] } }, context)).toThrow('repeats a card');
  });
});
