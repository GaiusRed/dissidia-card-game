import { describe, expect, it } from 'vitest';
import { opusPh } from '../../src/content/opus-ph';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { assertInvariants } from '../../src/rules/invariants';
import { nextRandom, shuffle } from '../../src/rules/random';
import { moveCard } from '../../src/rules/zones';
import { fixture } from '../support/harness';

describe('deterministic match state', () => {
  it('uses a repeatable 32-bit random stream', () => {
    expect(nextRandom(1)).toEqual({ seed: 1015568748, value: 0.23645552527159452 });
    expect(shuffle([1,2,3,4,5], 42)).toEqual(shuffle([1,2,3,4,5], 42));
    expect([...shuffle([1,2,3,4,5], 42).items].sort()).toEqual([1,2,3,4,5]);
  });

  it('changes zone-object identity but keeps Commander instance designation', () => {
    const h = fixture({});
    const instance = h.state.commanders[0].instance;
    const oldObject = h.state.cards[instance]!.object;
    const old = moveCard(h.state, instance, 'field');
    expect(old.object).toBe(oldObject);
    expect(h.state.cards[instance]!.instance).toBe(instance);
    expect(h.state.cards[instance]!.object).not.toBe(oldObject);
    expect(h.state.commanders[0].instance).toBe(instance);
    expect(h.state.cards[instance]!.zone).toBe('field');
  });

  it('rejects one instance appearing in two zones', () => {
    const h = fixture({});
    const instance = h.state.cards[h.state.commanders[0].instance]!.instance;
    h.state.zones[0].commander.push(instance);
    expect(() => assertInvariants(h.state, { catalog: opusPh, handlers: {} })).toThrow(/more than one zone/i);
  });
});
