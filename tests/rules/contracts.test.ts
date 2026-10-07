import { describe, expect, it } from 'vitest';
import { executionStateSchema, resumeRefSchema } from '../../src/rules/contracts/execution';
import { fixture } from '../support/harness';
import { assertStable } from '../support/assert-stable';

describe('card execution contracts', () => {
  it('accepts a JSON continuation reference and rejects executable payloads', () => {
    expect(resumeRefSchema.safeParse({
      script: 'P-015C', version: '1', ability: 'scorch', step: 'resolve', payload: null,
    }).success).toBe(true);
    expect(resumeRefSchema.safeParse({
      script: 'P-015C', version: '1', ability: 'scorch', step: 'resolve', payload: () => 1,
    }).success).toBe(false);
  });

  it('accepts an empty execution state and rejects an invalid frame position', () => {
    const empty = { frames: [], batch: null, returnWindow: { kind: 'priority', seat: 0 }, delayed: [] };
    expect(executionStateSchema.safeParse(empty).success).toBe(true);
    expect(executionStateSchema.safeParse({
      ...empty,
      frames: [{
        id: 'frame-1', resume: { script: 'P-015C', version: '1', ability: 'scorch', step: 'resolve', payload: null },
        mode: 'stack', controller: 0, source: 'object-0-1', lastKnown: {
          instance: 'i0-1', object: 'object-0-1', card: 'P-015C', owner: 0, controller: 0,
          zone: 'stack', dull: false, damage: 0, controlledSinceTurn: 1, attackedTurn: null, frozen: false,
        },
        targets: [], selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: 0 },
        operationIndex: -1, scriptComplete: false,
      }],
    }).success).toBe(false);
  });

  it('round trips a frame, pending batch, and delayed continuation as JSON', () => {
    const source = {
      instance: 'i0-1', object: 'object-0-1', card: 'P-015C', owner: 0 as const, controller: 0 as const,
      zone: 'stack' as const, dull: false, damage: 0, controlledSinceTurn: 1, attackedTurn: null, frozen: false,
    };
    const resume = { script: 'P-015C', version: '1', ability: 'scorch', step: 'resolve', payload: null };
    const state = {
      frames: [{
        id: 'frame-1', resume, mode: 'stack' as const, controller: 0 as const, source: source.object,
        lastKnown: source, targets: [], selectedMode: null,
        remaining: [{ simultaneous: false, operations: [{ kind: 'draw' as const, seat: 0 as const, count: 1 }] }],
        returnWindow: { kind: 'priority' as const, seat: 0 as const }, operationIndex: 0, scriptComplete: false,
      }],
      batch: {
        id: 'batch-1', operations: [{ kind: 'draw' as const, seat: 0 as const, count: 1 }],
        snapshots: [source], observers: [source], characteristics: [], replacementIndex: 0, replacements: [], phase: 'apply' as const,
      },
      returnWindow: { kind: 'priority' as const, seat: 0 as const },
      delayed: [{ id: 'delay-1', controller: 0 as const, source: source.object, lastKnown: source,
        createdTurn: 1, eligibleTurn: 1, at: 'controller-end' as const, resume }],
    };
    expect(executionStateSchema.parse(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it('rejects unknown frame fields and malformed resume references', () => {
    const frame = {
      id: 'frame-1', resume: { script: 'P-015C', version: '1', ability: 'scorch', step: 'resolve', payload: null },
      mode: 'stack', controller: 0, source: 'object-0-1', lastKnown: {
        instance: 'i0-1', object: 'object-0-1', card: 'P-015C', owner: 0, controller: 0,
        zone: 'stack', dull: false, damage: 0, controlledSinceTurn: 1, attackedTurn: null, frozen: false,
      },
      targets: [], selectedMode: null, remaining: [], returnWindow: { kind: 'priority', seat: 0 },
      operationIndex: 0, scriptComplete: false,
    };
    const empty = { frames: [frame], batch: null, returnWindow: { kind: 'priority', seat: 0 }, delayed: [] };
    expect(executionStateSchema.safeParse({ ...empty, frames: [{ ...frame, unexpected: true }] }).success).toBe(false);
    expect(executionStateSchema.safeParse({ ...empty, frames: [{ ...frame, resume: { ...frame.resume, payload: undefined } }] }).success).toBe(false);
  });

  it('rejects a live match without a choice or priority actor', () => {
    const state = fixture({}).state;
    state.choice = null;
    state.priority = null;
    expect(() => assertStable(state)).toThrow('Live match must have a priority actor or a required choice.');
  });
});
