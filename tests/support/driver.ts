import { applyCommand } from '../../src/rules/engine';
import { buildFixture } from '../../src/scenarios/fixtures';
import type { Answer, EngineContext, Intent, MatchState, ObjectId, Seat, Transition } from '../../src/rules/types';
import type { Fixture } from '../../src/scenarios/types';
import { context as defaultContext } from './harness';

export interface Driver {
  state: MatchState;
  context: EngineContext;
  object(seat: Seat, number: string): ObjectId;
  send(intent: Intent, seat?: Seat): Transition;
  answer(selected: string[], amounts?: Record<string, number>): Transition;
  passPair(): void;
}

export function driver(input: Fixture = {}, options?: {
  context?: EngineContext;
  apply?: typeof applyCommand;
}): Driver {
  const context = options?.context ?? defaultContext;
  const run = options?.apply ?? applyCommand;
  let state = buildFixture(input, context);
  const result: Driver = {
    get state() { return state; },
    set state(value) { state = value; },
    context,
    object(seat, number) {
      const card = Object.values(state.cards).find(item => item.owner === seat && item.card === number);
      if (!card) throw new Error(`No owned test card ${number} for seat ${seat}`);
      return card.object;
    },
    send(intent, seat) {
      const actor = seat ?? state.choice?.seat ?? state.priority ?? state.active;
      const transition = run(state, {
        id: `test-${state.seq}`,
        expectedSeq: state.seq,
        seat: actor,
        intent,
      }, context);
      if (transition.ok) state = transition.state;
      return transition;
    },
    answer(selected, amounts = {}) {
      const choice = state.choice;
      if (!choice) throw new Error('There is no open choice to answer.');
      const answer: Answer = { choice: choice.id, selected, amounts };
      return result.send({ kind: 'answer', answer }, choice.seat);
    },
    passPair() {
      for (let i = 0; i < 2; i += 1) {
        const actor = state.priority;
        if (actor === null || state.choice) throw new Error('A required decision interrupts priority passes.');
        const transition = result.send({ kind: 'pass' }, actor);
        if (!transition.ok) throw new Error(`${transition.error.code}: ${transition.error.message}`);
        if (state.choice) throw new Error('A required decision interrupts priority passes.');
      }
    },
  };
  return result;
}
