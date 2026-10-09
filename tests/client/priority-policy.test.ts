import { describe, expect, it } from 'vitest';
import { chooseSmartPriorityAction } from '../../src/client/priority-policy';
import type { MatchView } from '../../src/host/protocol';

const view = (overrides: Partial<MatchView> = {}) => ({
  generation: 1, seq: 1, turn: 1, phase: 'main1', active: 0, priority: 0, decisionSeat: 0,
  choice: null, cards: {}, presentations: {}, zones: { 0: {}, 1: {} }, deckCounts: { 0: 10, 1: 10 },
  field: [], stackCards: [], stack: [], resolving: null, combat: null, commanders: { 0: {}, 1: {} },
  passes: 0, result: null, versions: {}, castAccess: [], actions: [
    { id: 'pass', kind: 'pass', source: null, label: 'Pass', ability: null, targetOptions: [], minTargets: 0, maxTargets: 0, modes: [], needsPayment: false, payment: null },
  ], cardTray: { hand: [], otherZones: [] }, log: [], ...overrides,
} as unknown as MatchView);

describe('Smart priority policy', () => {
  it('End Turn passes the requesting player with legal actions but preserves opponent responses', () => {
    const cast = { ...view().actions[0]!, kind: 'cast' as const };
    const request = { generation: 1, turn: 1, seat: 0 as const };
    expect(chooseSmartPriorityAction(view({ actions: [...view().actions, cast] }), false, false, request))
      .toEqual({ intent: { kind: 'pass' }, reason: 'end-turn' });
    expect(chooseSmartPriorityAction(view({ priority: 1, decisionSeat: 1, actions: [...view().actions, cast] }), false, false, request)).toBeNull();
    expect(chooseSmartPriorityAction(view({ actions: [...view().actions, cast], turn: 2 }), false, false, request)).toBeNull();
    expect(chooseSmartPriorityAction(view({ actions: [...view().actions, cast], generation: 2 }), false, false, request)).toBeNull();
    expect(chooseSmartPriorityAction(view(), true, false, request)).toBeNull();
    expect(chooseSmartPriorityAction(view({ choice: {} as MatchView['choice'] }), false, false, request)).toBeNull();
  });
  it('passes through a validated action when no legal action exists', () => {
    expect(chooseSmartPriorityAction(view(), false)).toEqual({ intent: { kind: 'pass' }, reason: 'no-action' });
  });

  it('preserves legal player actions, required choices, terminal states, and Hold Priority', () => {
    const cast: MatchView['actions'][number] = { id: 'cast:one', kind: 'cast', source: 'one', label: 'Cast', ability: null, targetOptions: [], minTargets: 0, maxTargets: 0, modes: [], needsPayment: false, payment: null };
    expect(chooseSmartPriorityAction(view({ actions: [...view().actions, cast] }), false)).toBeNull();
    expect(chooseSmartPriorityAction(view({ choice: {} as MatchView['choice'] }), false)).toBeNull();
    expect(chooseSmartPriorityAction(view({ result: { winner: 0, reason: 'damage' } }), false)).toBeNull();
    expect(chooseSmartPriorityAction(view(), true)).toBeNull();
    expect(chooseSmartPriorityAction(view(), false, true)).toBeNull();
  });

  it('passes the controller’s initial response to their own stack item', () => {
    expect(chooseSmartPriorityAction(view({ stack: [{ controller: 0 } as MatchView['stack'][number]] }), false))
      .toEqual({ intent: { kind: 'pass' }, reason: 'own-response' });
    expect(chooseSmartPriorityAction(view({ priority: 1, decisionSeat: 1, passes: 1,
      stack: [{ controller: 0 } as MatchView['stack'][number]] }), false)?.reason).toBe('no-action');
  });

  it('submits no-block only when the blocker window has no legal blocker', () => {
    const blockerWindow = view({ phase: 'attack', active: 0, priority: 1, decisionSeat: 1,
      combat: { step: 'block' } as MatchView['combat'] });
    expect(chooseSmartPriorityAction(blockerWindow, false)).toEqual({ intent: { kind: 'block', blocker: null }, reason: 'no-blockers' });
    expect(chooseSmartPriorityAction(view({ ...blockerWindow, actions: [...blockerWindow.actions,
      { ...blockerWindow.actions[0]!, kind: 'block' } as typeof blockerWindow.actions[number]] }), false)).toBeNull();
  });
});
