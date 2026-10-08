import { z } from 'zod';
import type { Operation, ResumeStep } from './contracts/execution';
import { registerRuleStep } from './rule-scripts';

const seat = z.union([z.literal(0), z.literal(1)]);
const targetPayload = z.object({ item: z.string().min(1) }).strict();
const seatPayload = z.object({ seat }).strict();
const combatPayload = z.object({ blocker: z.string().min(1) }).strict();
const commanderPayload = z.object({ instance: z.string().min(1), destination: z.enum(['deck', 'hand', 'field', 'stack', 'break', 'removed', 'damage', 'commander']), seat }).strict();

const triggerTarget: ResumeStep = {
  payloadSchema: targetPayload,
  run: ({ frame, answer }) => {
    const item = targetPayload.parse(frame.resume.payload).item;
    const target = answer?.selected[0];
    if (!target) return { batches: [], choice: null, next: null };
    const operation: Operation = { kind: 'trigger-target', item, target };
    return { batches: [{ simultaneous: false, operations: [operation] }], choice: null, next: null };
  },
};

const orderTriggers: ResumeStep = {
  payloadSchema: seatPayload,
  run: ({ frame, answer }) => {
    if (!answer) return { batches: [], choice: null, next: null };
    const operation: Operation = { kind: 'order-triggers', seat: seatPayload.parse(frame.resume.payload).seat,
      items: [...answer.selected] };
    return { batches: [{ simultaneous: false, operations: [operation] }], choice: null, next: null };
  },
};

const endPhaseDiscard: ResumeStep = {
  payloadSchema: seatPayload,
  run: ({ frame, answer }) => {
    if (!answer) return { batches: [], choice: null, next: null };
    const player = seatPayload.parse(frame.resume.payload).seat;
    return { batches: [{ simultaneous: false, operations: [
      { kind: 'discard', seat: player, objects: [...answer.selected], reason: 'hand-limit' },
      { kind: 'end-phase-checkpoint' },
    ] }], choice: null, next: null };
  },
};

const excessBackups: ResumeStep = {
  payloadSchema: seatPayload,
  run: ({ answer }) => ({ batches: [{ simultaneous: true, operations: (answer?.selected ?? []).map(object => ({
    kind: 'move' as const, object, to: 'break' as const, index: null,
  })) }], choice: null, next: null }),
};

const combatAllocation: ResumeStep = {
  payloadSchema: combatPayload,
  run: ({ answer }) => ({ batches: answer ? [{ simultaneous: false, operations: [{
    kind: 'combat-allocation', amounts: { ...answer.amounts },
  }] }] : [], choice: null, next: null }),
};

const commanderDeparture: ResumeStep = {
  payloadSchema: commanderPayload,
  run: ({ frame, answer }) => {
    const payload = commanderPayload.parse(frame.resume.payload);
    const selected = answer?.selected[0];
    if (!selected) return { batches: [], choice: null, next: null };
    return { batches: [{ simultaneous: false, operations: [{ kind: 'commander-destination', ...payload, selected }] }],
      choice: null, next: null };
  },
};

registerRuleStep('choice-trigger', 'target', triggerTarget);
registerRuleStep('choice-triggers', 'order', orderTriggers);
registerRuleStep('choice-end-phase', 'discard', endPhaseDiscard);
registerRuleStep('choice-checkpoint', 'excess-backups', excessBackups);
registerRuleStep('choice-combat', 'allocation', combatAllocation);
registerRuleStep('choice-commander', 'destination', commanderDeparture);
