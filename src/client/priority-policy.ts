import type { MatchView } from '../host/protocol';
import type { Intent } from '../rules/types';

export type SmartPriorityReason = 'no-action' | 'own-response' | 'no-blockers';
export interface SmartPriorityAction { intent: Intent; reason: SmartPriorityReason }

/** Select a narrow, rules-safe automatic action from the acting seat's current host projection. */
export function chooseSmartPriorityAction(view: MatchView, hold: boolean, paused = false): SmartPriorityAction | null {
  if (paused || hold || view.result || view.choice || view.priority === null || view.decisionSeat !== view.priority) return null;
  if (!view.actions.some(action => action.kind === 'pass')) return null;

  if (view.phase === 'attack' && view.combat?.step === 'block' &&
      !view.actions.some(action => action.kind === 'block')) {
    return { intent: { kind: 'block', blocker: null }, reason: 'no-blockers' };
  }

  const top = view.stack.at(-1);
  if (top?.controller === view.priority && view.passes === 0) {
    return { intent: { kind: 'pass' }, reason: 'own-response' };
  }

  if (view.actions.some(action => action.kind !== 'pass')) return null;
  return { intent: { kind: 'pass' }, reason: 'no-action' };
}
