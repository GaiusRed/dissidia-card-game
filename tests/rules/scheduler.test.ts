import { describe, expect, it } from 'vitest';
import { runScheduler } from '../../src/rules/scheduler';
import { context, fixture } from '../support/harness';
import { assertStable } from '../support/assert-stable';
import { z } from 'zod';
import type { CardRegistry } from '../../src/rules/contracts/registry';
import type { ExecutionFrame, ResumeRef, ResumeStep } from '../../src/rules/contracts/execution';
import { resumeChoice } from '../../src/rules/scheduler';
import { moveCard } from '../../src/rules/zones';
import { runRuleCheckpoint } from '../../src/rules/checkpoints';

function frameFor(state: ReturnType<typeof fixture>['state'], resume: ResumeRef): ExecutionFrame {
  const source = Object.values(state.cards)[0]!;
  return {
    id: 'frame-test', resume, mode: 'rule', controller: 1, source: source.object,
    lastKnown: { ...source }, targets: [], selectedMode: null, remaining: [],
    returnWindow: { kind: 'priority', seat: 1 }, operationIndex: 0, scriptComplete: false,
  };
}

function withStep(step: ResumeStep) {
  const registry: CardRegistry = {
    manifest: { id: 'test', cards: [] }, catalog: context.catalog,
    card: () => { throw new Error('Not used by this test.'); },
    ability: () => { throw new Error('Not used by this test.'); },
    resume: () => step,
  };
  return { ...context, registry };
}

describe('execution scheduler', () => {
  it('returns active-player priority after a decision completes', () => {
    const state = fixture({ active: 1 }).state;
    state.choice = null;
    state.priority = null;
    const result = runScheduler(state, context);
    expect(result).toEqual({ events: [], error: null });
    assertStable(state);
    expect(state.priority).toBe(1);
  });

  it('keeps priority closed while a required choice remains open', () => {
    let state = fixture({}).state;
    state.priority = 0;
    state.choice = {
      id: 'choice-open', seat: 1, kind: 'confirm', reason: 'Choose.',
      options: [{ id: 'yes', label: 'Yes', object: null }], min: 1, max: 1, allocation: null,
      resume: { handler: 'test', step: 'resolve', data: null },
    };
    const result = runScheduler(state, context);
    expect(result.error).toBeNull();
    expect(state.priority).toBeNull();
  });

  it('runs registered operations before restoring the frame return window', () => {
    let state = fixture({}).state;
    const resume = { script: 'P-003C', version: '1', ability: 'draw-test', step: 'resolve', payload: null };
    const step: ResumeStep = {
      payloadSchema: z.null(),
      run: ({ frame }) => ({ batches: [{ simultaneous: false, operations: [{ kind: 'draw', seat: frame.controller, count: 1 }] }], choice: null, next: null }),
    };
    const before = state.zones[1].hand.length;
    state.execution.frames.push(frameFor(state, resume));
    const result = runScheduler(state, withStep(step));
    expect(result.error).toBeNull();
    expect(state.zones[1].hand).toHaveLength(before + 1);
    expect(state.execution.frames).toHaveLength(0);
    expect(state.priority).toBe(1);
  });

  it('prepares and applies a simultaneous batch before completing its frame', () => {
    const state = fixture({ placements: [{ seat: 0, card: 'P-005R', zone: 'field' }] }).state;
    const source = Object.values(state.cards).find(card => card.card === 'P-029C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-005R')!;
    const resume = { script: 'P-003C', version: '1', ability: 'batch-test', step: 'resolve', payload: null };
    const step: ResumeStep = {
      payloadSchema: z.null(),
      run: () => ({ batches: [{ simultaneous: true, operations: [
        { kind: 'forward-damage', source: source.object, target: target.object, amount: 3000 },
      ] }], choice: null, next: null }),
    };
    state.execution.frames.push(frameFor(state, resume));
    expect(runScheduler(state, withStep(step)).error).toBeNull();
    expect(state.cards[target.instance]!.damage).toBe(3000);
    expect(state.execution.batch).toBeNull();
    expect(state.execution.frames).toHaveLength(0);
  });

  it('collects both Commander replacements before applying either frozen departure', () => {
    let state = fixture({}).state;
    const left = state.commanders[0].instance;
    const right = state.commanders[1].instance;
    moveCard(state, left, 'field');
    moveCard(state, right, 'field');
    const resume = { script: 'P-003C', version: '1', ability: 'two-departures', step: 'resolve', payload: null };
    const step: ResumeStep = {
      payloadSchema: z.null(),
      run: () => ({ batches: [{ simultaneous: true, operations: [
        { kind: 'move', object: state.cards[left]!.object, to: 'break', index: null },
        { kind: 'move', object: state.cards[right]!.object, to: 'break', index: null },
      ] }], choice: null, next: null }),
    };
    const scriptContext = withStep(step);
    state.execution.frames.push(frameFor(state, resume));
    expect(runScheduler(state, scriptContext).error).toBeNull();
    expect(state.choice?.seat).toBe(0);
    expect(state.cards[left]!.zone).toBe('field');
    expect(state.cards[right]!.zone).toBe('field');

    const firstChoice = state.choice!;
    expect(resumeChoice(state, { choice: firstChoice.id, selected: ['return'], amounts: {} }, scriptContext).error).toBeNull();
    expect(state.choice?.seat).toBe(1);
    expect(state.cards[left]!.zone).toBe('field');
    expect(state.cards[right]!.zone).toBe('field');

    state = JSON.parse(JSON.stringify(state)) as typeof state;
    const secondChoice = state.choice!;
    expect(resumeChoice(state, { choice: secondChoice.id, selected: ['destination'], amounts: {} }, scriptContext).error).toBeNull();
    expect(state.cards[left]!.zone).toBe('commander');
    expect(state.cards[right]!.zone).toBe('break');
    expect(state.execution.batch).toBeNull();
  });

  it('settles lethal Commander and ordinary Forward departures independent of field order', () => {
    for (const commanderFirst of [true, false]) {
      const state = fixture({ placements: [
        { seat: 0, card: 'P-001L', zone: 'field' },
        { seat: 0, card: 'P-005R', zone: 'field' },
      ] }).state;
      const commander = state.commanders[0].instance;
      const forward = Object.values(state.cards).find(card => card.card === 'P-005R')!.instance;
      if (commanderFirst) state.field = [commander, forward];
      else state.field = [forward, commander];
      state.cards[commander]!.damage = 99_000;
      state.cards[forward]!.damage = 99_000;
      runRuleCheckpoint(state, context);
      expect(runScheduler(state, context).error).toBeNull();
      expect(state.cards[commander]!.zone).toBe('field');
      expect(state.cards[forward]!.zone).toBe('field');
      const pending = state.choice!;
      expect(pending.seat).toBe(0);
      const restored = JSON.parse(JSON.stringify(state)) as typeof state;
      expect(resumeChoice(restored, { choice: pending.id, selected: ['destination'], amounts: {} }, context).error).toBeNull();
      expect(restored.cards[commander]!.zone).toBe('break');
      expect(restored.cards[forward]!.zone).toBe('break');
      expect(restored.execution.batch).toBeNull();
    }
  });

  it('saves a typed choice and resumes its frame exactly once', () => {
    let state = fixture({}).state;
    const resume = { script: 'P-003C', version: '1', ability: 'choice-test', step: 'choose', payload: null };
    const step: ResumeStep = {
      payloadSchema: z.null(),
      run: ({ frame, answer }) => answer === null
        ? { batches: [{ simultaneous: false, operations: [{ kind: 'draw', seat: frame.controller, count: 1 }] }], choice: { seat: 1, kind: 'confirm', reason: 'Choose.', options: [
          { id: 'draw', label: 'Draw', object: null },
        ], min: 1, max: 1, allocation: null, resume }, next: null }
        : { batches: [{ simultaneous: false, operations: [{ kind: 'draw', seat: frame.controller, count: 1 }] }], choice: null, next: null },
    };
    state.execution.frames.push(frameFor(state, resume));
    const initialHandSize = state.zones[1].hand.length;
    expect(runScheduler(state, withStep(step)).error).toBeNull();
    const pending = state.choice!;
    const before = state.zones[1].hand.length;
    expect(before).toBe(initialHandSize + 1);
    state = JSON.parse(JSON.stringify(state)) as typeof state;
    const result = resumeChoice(state, { choice: pending.id, selected: ['draw'], amounts: {} }, withStep(step));
    expect(result.error).toBeNull();
    expect(state.zones[1].hand).toHaveLength(before + 1);
    expect(state.execution.frames).toHaveLength(0);
    expect(state.priority).toBe(1);
    const acceptedState = JSON.parse(JSON.stringify(state)) as typeof state;
    const repeated = resumeChoice(state, { choice: pending.id, selected: ['draw'], amounts: {} }, withStep(step));
    expect(repeated.error?.code).toBe('STALE_CHOICE');
    expect(state).toEqual(acceptedState);
  });
});
