import { describe, expect, it } from 'vitest';
import { addPower, changeControl, effectivePower, expireTurnEffects, recomputeControl, setPower } from '../../src/rules/continuous';
import { opusPh } from '../../src/content/manifest';
import { assertInvariants } from '../../src/rules/invariants';
import { nextRandom, shuffle } from '../../src/rules/random';
import { moveCard } from '../../src/rules/zones';
import { context, fixture } from '../support/harness';

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
    expect(() => assertInvariants(h.state, { ...context, catalog: opusPh })).toThrow(/more than one zone/i);
  });

  it('restores the earlier active control effect when a later effect expires', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-005R', zone: 'field' }] });
    const target = h.state.cards[h.state.field[0]!]!;
    h.state.turn = 4;
    changeControl(h.state, 'effect-source-a', target.object, 1, 5);
    changeControl(h.state, 'effect-source-b', target.object, 0, 3);
    expect(target.controller).toBe(0);
    expireTurnEffects(h.state, context);
    expect(target.controller).toBe(1);
    expect(target.controlledSinceTurn).toBe(4);
  });

  it('recomputes the effective controller from active timestamped layers', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-005R', zone: 'field' }] });
    const target = h.state.cards[h.state.field[0]!]!;
    h.state.turn = 4;
    changeControl(h.state, 'earlier-control', target.object, 1, 5);
    changeControl(h.state, 'expired-control', target.object, 0, 3);
    recomputeControl(h.state, { catalog: opusPh });
    expect(target.controller).toBe(1);
    expect(target.controlledSinceTurn).toBe(4);
  });

  it('does not reset the control interval when an expiring layer leaves the same controller', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-005R', zone: 'field' }] });
    const target = h.state.cards[h.state.field[0]!]!;
    h.state.turn = 4;
    changeControl(h.state, 'effect-source-a', target.object, 1, 6);
    target.controlledSinceTurn = 2;
    changeControl(h.state, 'effect-source-b', target.object, 1, 4);
    expireTurnEffects(h.state, context);
    expect(target.controller).toBe(1);
    expect(target.controlledSinceTurn).toBe(2);
  });

  it('applies the newest base power before every additive modifier', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-005R', zone: 'field' }] });
    const target = h.state.cards[h.state.field[0]!]!;
    setPower(h.state, target.object, target.object, 5000, 3);
    addPower(h.state, target.object, target.object, 1000, 3);
    setPower(h.state, target.object, target.object, 7000, 3);
    addPower(h.state, target.object, target.object, 2000, 3);
    expect(effectivePower(h.state, target.object, { ...context, catalog: opusPh })).toBe(10000);
  });
});
