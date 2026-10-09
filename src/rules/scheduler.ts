import { executionStateSchema } from './contracts/execution';
import { applyOperation } from './operations';
import { runRuleCheckpoint } from './checkpoints';
import { applyPreparedBatch, nextCommanderReplacement, prepareBatch } from './batches';
import { batchResume } from './batch-script';
import './batch-script';
import './rule-choice-scripts';
import { resolveRuleStep, RULE_ENGINE_VERSION } from './rule-scripts';
import { mandatoryStateKey } from './loops';
import { legalSummonTargets } from './targets';
import { continueDamageEx } from './damage';
import type { Answer, EngineContext, MatchState, RuleError } from './types';
import type { ResumeRef, ResumeStep, SchedulerResult } from './contracts/execution';

const failure = (code: string, message: string): SchedulerResult => ({ events: [], error: { code, message } });

export function resolveStep(ref: ResumeRef, context: EngineContext): ResumeStep {
  if (ref.script === 'rules') {
    if (ref.version !== RULE_ENGINE_VERSION) throw new Error(`Incompatible rule version ${ref.version}.`);
    return resolveRuleStep(ref.ability, ref.step);
  }
  if (!context.registry) throw new Error('No card script registry is available.');
  return context.registry.resume(ref);
}

function choiceActor(state: MatchState): void {
  if (state.result) {
    state.choice = null;
    state.priority = null;
  } else if (state.choice) {
    state.priority = null;
    state.passes = 0;
  } else if (state.priority === null) {
    state.priority = state.active;
    state.passes = 0;
  }
}

function applyReturnWindow(state: MatchState, frame: MatchState['execution']['frames'][number]): void {
  const returnWindow = frame.returnWindow;
  if (returnWindow.kind === 'priority') {
    state.priority = returnWindow.seat;
    state.passes = 0;
  } else if (returnWindow.kind === 'combat') {
    if (state.combat) state.combat.step = returnWindow.step;
    state.priority = returnWindow.seat;
    state.passes = 0;
  } else {
    state.priority = returnWindow.step === 'cleanup' ? null : state.active;
    state.passes = 0;
  }
}

/** Resume saved frames until the match reaches a choice or a legal actor window. */
export function runScheduler(state: MatchState, context: EngineContext): SchedulerResult {
  const events: import('./types').RuleEvent[] = [];
  const mandatoryStates = new Set<string>();
  try {
    for (let count = 0; count < 10000; count += 1) {
      if (state.result) break;
      const frame = state.execution.frames.at(-1);
      if (state.choice && (!frame || frame.remaining.length === 0)) break;
      if (frame || state.execution.batch) {
        const key = mandatoryStateKey(state);
        if (mandatoryStates.has(key)) {
          state.result = { winner: null, reason: 'loop' };
          state.choice = null;
          state.priority = null;
          state.passes = 0;
          state.execution.frames = [];
          state.execution.batch = null;
          break;
        }
        mandatoryStates.add(key);
      }
      if (state.execution.batch && frame?.resume.ability !== 'batch') {
        const pending = state.execution.batch;
        const replacement = pending.phase === 'replacements' ? nextCommanderReplacement(state, pending) : null;
        if (replacement) {
          const snapshot = pending.snapshots.find(card => card.object === replacement.object)!;
          const resume = batchResume(pending.id, replacement.operation, replacement.object, replacement.destination);
          state.execution.frames.push({
            id: `frame-${state.nextId++}`, resume, mode: 'rule', controller: replacement.owner,
            source: snapshot.object, lastKnown: { ...snapshot }, targets: [snapshot.object], selectedMode: null,
            remaining: [], returnWindow: state.execution.returnWindow, operationIndex: 0, scriptComplete: false,
          });
          state.choice = {
            id: `choice-${state.nextId++}`, seat: replacement.owner, kind: 'confirm',
            reason: 'Choose where your Commander goes as it leaves the field.',
            options: [
              { id: 'return', label: 'Return to Command Zone', object: snapshot.object },
              { id: 'destination', label: 'Use normal destination', object: snapshot.object },
            ], min: 1, max: 1, allocation: null, resume,
          };
          continue;
        }
        if (pending.phase === 'replacements') pending.phase = 'apply';
        const applied = applyPreparedBatch(state, pending, context);
        if (applied.error) return applied;
        events.push(...applied.events);
        state.execution.batch = null;
        if (!state.choice) runRuleCheckpoint(state, context);
        continue;
      }
      if (!frame && !state.execution.batch && state.work.some(item => item.kind === 'offer-ex')) {
        continueDamageEx(state, context);
        if (state.choice || state.execution.frames.length > 0) continue;
      }
      if (!frame) break;
      const current = frame.remaining[0];
      if (current) {
        if (current.simultaneous) {
          state.execution.batch = prepareBatch(state, current, context);
          frame.remaining.shift();
          frame.operationIndex = 0;
          continue;
        }
        const operation = current.operations[frame.operationIndex];
        if (operation) {
          if (operation.kind === 'move') {
            state.execution.batch = prepareBatch(state, { simultaneous: false, operations: [operation] }, context);
            frame.operationIndex += 1;
            continue;
          }
          const applied = applyOperation(state, operation, context);
          if (applied.error) return applied;
          events.push(...applied.events);
          frame.operationIndex += 1;
          continue;
        }
        frame.remaining.shift();
        frame.operationIndex = 0;
        continue;
      }
      if (frame.scriptComplete) {
        if (frame.mode === 'stack') {
          events.push({ id: `event-${state.nextId++}`, type: 'stack.effect-completed', data: {
            source: frame.source, card: frame.lastKnown.card, controller: frame.controller, ability: frame.resume.ability, targets: [...frame.targets],
          } });
        }
        const stackSource = state.cards[frame.lastKnown.instance];
        if (frame.mode === 'stack' && stackSource?.zone === 'stack' && context.catalog[stackSource.card]?.type === 'Summon') {
          state.execution.batch = prepareBatch(state, { simultaneous: false, operations: [
            { kind: 'move', object: stackSource.object, to: 'break', index: null },
          ] }, context);
          continue;
        }
        state.execution.frames.pop();
        if (!state.choice) runRuleCheckpoint(state, context);
        applyReturnWindow(state, frame);
        continue;
      }
      if (frame.mode === 'stack' && context.catalog[frame.lastKnown.card]?.type === 'Summon' &&
          frame.targets.some(target => !legalSummonTargets(state, frame.controller,
            context.catalog[frame.lastKnown.card]?.summonTarget, frame.selectedMode, context).some(card => card.object === target))) {
        frame.scriptComplete = true;
        continue;
      }
      const step = resolveStep(frame.resume, context);
      const checked = step.payloadSchema.safeParse(frame.resume.payload);
      if (!checked.success) return failure('INVALID_RESUME_PAYLOAD', 'The continuation data is invalid.');
      const result = step.run({ state, catalog: context.catalog, frame, answer: null });
      if (result.batches.some(batch => batch.operations.length === 0)) {
        return failure('EMPTY_OPERATION_BATCH', 'A rule step returned an empty operation batch.');
      }
      frame.remaining.push(...result.batches);
      if (result.choice) {
        frame.resume = result.choice.resume;
        state.choice = {
          id: `choice-${state.nextId++}`, seat: result.choice.seat, kind: result.choice.kind,
          reason: result.choice.reason, options: [...result.choice.options], min: result.choice.min,
          max: result.choice.max, allocation: result.choice.allocation, resume: result.choice.resume,
        };
      } else if (result.next) {
        frame.resume = result.next;
      } else {
        frame.scriptComplete = true;
      }
    }
    if (state.execution.frames.length > 0 && !state.choice && !state.result) {
      return failure('ENGINE_BUDGET_EXCEEDED', 'The execution budget expired before the match reached a stable boundary.');
    }
    choiceActor(state);
    executionStateSchema.parse(state.execution);
    return { events, error: null };
  } catch (cause) {
    return failure('UNKNOWN_RESUME', cause instanceof Error ? cause.message : 'The continuation could not be resolved.');
  }
}

function validateAnswer(choice: NonNullable<MatchState['choice']>, answer: Answer): RuleError | null {
  if (choice.id !== answer.choice) return { code: 'STALE_CHOICE', message: 'That decision is no longer open.' };
  if (answer.selected.length < choice.min || answer.selected.length > choice.max ||
      new Set(answer.selected).size !== answer.selected.length ||
      answer.selected.some(id => !choice.options.some(option => option.id === id))) {
    return { code: 'INVALID_SELECTION', message: 'Choose the required options shown for this decision.' };
  }
  if (choice.kind !== 'allocation') {
    if (Object.keys(answer.amounts).length > 0) return { code: 'INVALID_ALLOCATION', message: 'This decision does not accept allocation amounts.' };
    return null;
  }
  const allocation = choice.allocation;
  if (!allocation || Object.keys(answer.amounts).some(id => !choice.options.some(option => option.id === id)) ||
      Object.values(answer.amounts).some(amount => !Number.isSafeInteger(amount) || amount < 0 || amount % allocation.increment !== 0) ||
      Object.values(answer.amounts).reduce((sum, amount) => sum + amount, 0) !== allocation.total) {
    return { code: 'INVALID_ALLOCATION', message: 'Assign the full amount in the allowed increments.' };
  }
  return null;
}

export function resumeChoice(state: MatchState, answer: Answer, context: EngineContext): SchedulerResult {
  const choice = state.choice;
  if (!choice) return failure('STALE_CHOICE', 'That decision is no longer open.');
  const invalid = validateAnswer(choice, answer);
  if (invalid) return { events: [], error: invalid };
  const frame = state.execution.frames.at(-1);
  if (!frame) return failure('MISSING_FRAME', 'The saved choice has no execution frame.');
  if (frame.resume.script !== choice.resume.script || frame.resume.version !== choice.resume.version ||
      frame.resume.ability !== choice.resume.ability || frame.resume.step !== choice.resume.step ||
      JSON.stringify(frame.resume.payload) !== JSON.stringify(choice.resume.payload)) {
    return failure('FRAME_MISMATCH', 'The saved choice does not match the active frame.');
  }
  try {
    const step = resolveStep(choice.resume, context);
    const checked = step.payloadSchema.safeParse(choice.resume.payload);
    if (!checked.success) return failure('INVALID_RESUME_PAYLOAD', 'The continuation data is invalid.');
    state.choice = null;
    frame.resume = choice.resume;
    const result = step.run({ state, catalog: context.catalog, frame, answer });
    frame.remaining.push(...result.batches);
    if (result.choice) {
      frame.resume = result.choice.resume;
      state.choice = {
        id: `choice-${state.nextId++}`, seat: result.choice.seat, kind: result.choice.kind,
        reason: result.choice.reason, options: [...result.choice.options], min: result.choice.min,
        max: result.choice.max, allocation: result.choice.allocation, resume: result.choice.resume,
      };
    } else if (result.next) {
      frame.resume = result.next;
    } else {
      frame.scriptComplete = true;
    }
    return runScheduler(state, context);
  } catch (cause) {
    return failure('UNKNOWN_RESUME', cause instanceof Error ? cause.message : 'The continuation could not be resolved.');
  }
}
