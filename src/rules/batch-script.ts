import { z } from 'zod';
import type { ResumeRef, ResumeStep } from './contracts/execution';
import { registerRuleStep, RULE_ENGINE_VERSION } from './rule-scripts';
import type { Json } from './types';

const payloadSchema = z.object({
  batch: z.string().min(1), operation: z.number().int().nonnegative(), object: z.string().min(1),
  destination: z.enum(['deck', 'hand', 'field', 'stack', 'break', 'removed', 'damage', 'commander']),
}).strict();

const batchDeparture: ResumeStep = {
  payloadSchema,
  run: ({ frame, answer }) => {
    const payload = frame.resume.payload as { batch: string; operation: number; object: string; destination: import('./types').Zone };
    const resume = batchResume(payload.batch, payload.operation, payload.object, payload.destination);
    if (!answer) return { batches: [], next: null, choice: {
      seat: frame.controller, kind: 'confirm', reason: 'Choose where your Commander goes as it leaves the field.',
      options: [
        { id: 'return', label: 'Return to Commander Zone', object: payload.object },
        { id: 'destination', label: 'Use normal destination', object: payload.object },
      ], min: 1, max: 1, allocation: null, resume,
    } };
    const selected = answer.selected[0];
    const destination = selected === 'return' ? 'commander' : payload.destination;
    return { batches: [{ simultaneous: false, operations: [{
      kind: 'batch-move-replacement', batch: payload.batch, operation: payload.operation,
      object: payload.object, destination,
    }] }], choice: null, next: null };
  },
};

registerRuleStep('batch', 'commander-departure', batchDeparture);

export function batchResume(batch: string, operation: number, object: string, destination: import('./types').Zone): ResumeRef {
  return {
    script: 'rules', version: RULE_ENGINE_VERSION, ability: 'batch', step: 'commander-departure',
    payload: JSON.parse(JSON.stringify({ batch, operation, object, destination })) as Json,
  };
}
