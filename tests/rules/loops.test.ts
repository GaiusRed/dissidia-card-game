import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fixture, context } from '../support/harness';
import { RULE_ENGINE_VERSION, registerRuleStep } from '../../src/rules/rule-scripts';
import { runScheduler } from '../../src/rules/scheduler';
import { mandatoryStateKey } from '../../src/rules/loops';
import { applyCommand } from '../../src/rules/engine';
import type { ResumeRef } from '../../src/rules/contracts/execution';

const looping: ResumeRef = { script: 'rules', version: RULE_ENGINE_VERSION, ability: 'test-forced-loop', step: 'run', payload: null };

function addFrame(state: ReturnType<typeof fixture>['state'], resume: ResumeRef): void {
  const source = state.cards[state.commanders[0].instance]!;
  state.execution.frames.push({ id: 'frame-loop-test', resume, mode: 'rule', controller: 0, source: source.object,
    lastKnown: { ...source }, targets: [], selectedMode: null, remaining: [],
    returnWindow: { kind: 'priority', seat: 0 }, operationIndex: 0, scriptComplete: false });
}

describe('mandatory execution loop detection', () => {
  it('normalizes generated frame labels while preserving the represented state', () => {
    const first = fixture({}).state;
    addFrame(first, looping);
    first.execution.frames[0]!.id = 'frame-72';
    const second = JSON.parse(JSON.stringify(first)) as typeof first;
    second.nextId += 80;
    second.execution.frames[0]!.id = 'frame-900';
    expect(mandatoryStateKey(second)).toBe(mandatoryStateKey(first));
  });

  it('declares a draw for a repeated mandatory state after normalizing incidental IDs', () => {
    registerRuleStep('test-forced-loop', 'run', {
      payloadSchema: z.null(), run: () => ({ batches: [], choice: null, next: looping }),
    });
    const state = fixture({}).state;
    addFrame(state, looping);
    state.nextId = 72;
    const result = runScheduler(state, context);
    expect(result.error).toBeNull();
    expect(state.result).toEqual({ winner: null, reason: 'loop' });
  });

  it('does not call a repeated state a loop when the continuation offers a choice', () => {
    const ref: ResumeRef = { script: 'rules', version: RULE_ENGINE_VERSION, ability: 'test-optional-loop', step: 'run', payload: null };
    registerRuleStep('test-optional-loop', 'run', {
      payloadSchema: z.null(), run: () => ({ batches: [], next: null, choice: {
        seat: 0, kind: 'confirm', reason: 'Choose whether to stop the optional sequence.',
        options: [{ id: 'stop', label: 'Stop', object: null }], min: 1, max: 1, allocation: null, resume: ref,
      } }),
    });
    const state = fixture({}).state;
    addFrame(state, ref);
    const result = runScheduler(state, context);
    expect(result.error).toBeNull();
    expect(state.result).toBeNull();
    expect(state.choice?.options[0]?.id).toBe('stop');
  });

  it('lets a long forced sequence finish when its saved counter changes', () => {
    const ref: ResumeRef = { script: 'rules', version: RULE_ENGINE_VERSION, ability: 'test-countdown', step: 'run', payload: 1400 };
    registerRuleStep('test-countdown', 'run', {
      payloadSchema: z.number().int().nonnegative(), run: ({ frame }) => {
        const remaining = frame.resume.payload as number;
        return { batches: [], choice: null, next: remaining === 0 ? null : { ...frame.resume, payload: remaining - 1 } };
      },
    });
    const state = fixture({}).state;
    addFrame(state, ref);
    const result = runScheduler(state, context);
    expect(result.error).toBeNull();
    expect(state.result).toBeNull();
    expect(state.execution.frames).toEqual([]);
  });

  it('returns an engine error and preserves the input when a unique sequence exceeds its budget', () => {
    const ref: ResumeRef = { script: 'rules', version: RULE_ENGINE_VERSION, ability: 'test-budget-sequence', step: 'run', payload: 11000 };
    registerRuleStep('test-budget-sequence', 'run', {
      payloadSchema: z.number().int().nonnegative(), run: ({ frame }) => {
        const remaining = frame.resume.payload as number;
        return { batches: [], choice: null, next: remaining === 0 ? null : { ...frame.resume, payload: remaining - 1 } };
      },
    });
    const state = fixture({}).state;
    addFrame(state, ref);
    const before = JSON.stringify(state);
    const result = applyCommand(state, { id: 'budget-rollback', expectedSeq: state.seq, seat: 0, intent: { kind: 'pass' } }, context);
    expect(result).toMatchObject({ ok: false, error: { code: 'ENGINE_BUDGET_EXCEEDED' } });
    expect(JSON.stringify(state)).toBe(before);
  });
});
