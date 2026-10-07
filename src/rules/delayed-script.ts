import { z } from 'zod';
import { registerRuleStep, RULE_ENGINE_VERSION } from './rule-scripts';
import type { ResumeRef, ResumeStep, StepResult } from './contracts/execution';
import type { Seat } from './types';

const seatSchema = z.union([z.literal(0), z.literal(1)]);
const payloadSchema = z.object({ seat: seatSchema }).strict();
const resume = (step: string, seat: Seat): ResumeRef => ({
  script: 'rules', version: RULE_ENGINE_VERSION, ability: 'delayed-discard', step, payload: { seat },
});

const resolve: ResumeStep = {
  payloadSchema,
  run: ({ state, catalog, frame }) => {
    const seat = payloadSchema.parse(frame.resume.payload).seat;
    const hand = state.zones[seat].hand;
    if (hand.length === 0) return { batches: [], choice: null, next: null };
    return {
      batches: [], next: null,
      choice: {
        seat, kind: 'cards', reason: 'Rising Undertow: discard 1 card at the beginning of your End Phase.',
        options: hand.map(instance => ({ id: state.cards[instance]!.object,
          label: catalog[state.cards[instance]!.card]?.name ?? state.cards[instance]!.card,
          object: state.cards[instance]!.object })),
        min: 1, max: 1, allocation: null, resume: resume('discard', seat),
      },
    };
  },
};

const discard: ResumeStep = {
  payloadSchema,
  run: ({ frame, answer }): StepResult => {
    const seat = payloadSchema.parse(frame.resume.payload).seat;
    if (!answer || answer.selected.length !== 1) return { batches: [], choice: null, next: null };
    return {
      batches: [{ simultaneous: false, operations: [{
        kind: 'discard', seat, objects: [...answer.selected], reason: 'effect',
      }] }],
      choice: null, next: null,
    };
  },
};

registerRuleStep('delayed-discard', 'resolve', resolve);
registerRuleStep('delayed-discard', 'discard', discard);
