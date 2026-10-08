import type { ChoiceRequest } from './contracts/execution';
import type { MatchState } from './types';

/** Attach a typed rules choice to a serializable scheduler frame. */
export function openRuleChoice(state: MatchState, request: ChoiceRequest,
  source: import('./types').CardObject): void {
  const parent = state.execution.frames.at(-1);
  state.execution.frames.push({
    id: `frame-${state.nextId++}`, resume: request.resume, mode: 'rule', controller: request.seat,
    source: source.object, lastKnown: { ...source }, targets: [], selectedMode: null, remaining: [],
    returnWindow: parent?.returnWindow ?? state.execution.returnWindow,
    operationIndex: 0, scriptComplete: false,
  });
  state.choice = {
    id: `choice-${state.nextId++}`, seat: request.seat, kind: request.kind, reason: request.reason,
    options: [...request.options], min: request.min, max: request.max, allocation: request.allocation,
    resume: request.resume,
  };
  state.priority = null;
  state.passes = 0;
}
