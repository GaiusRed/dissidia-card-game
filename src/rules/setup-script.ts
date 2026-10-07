import { z } from 'zod';
import type { ChoiceRequest, Operation, ResumeRef, ResumeStep } from './contracts/execution';
import { RULE_ENGINE_VERSION, registerRuleStep } from './rule-scripts';
import type { Choice, Json, Seat } from './types';

const seatSchema = z.union([z.literal(0), z.literal(1)]);
const startPayload = z.null();
const flowPayload = z.object({ firstSeat: seatSchema, index: z.number().int().nonnegative() }).strict();
const ref = (step: string, payload: Json): ResumeRef => ({
  script: 'rules', version: RULE_ENGINE_VERSION, ability: 'setup', step,
  payload: JSON.parse(JSON.stringify(payload)) as Json,
});
const batch = (operations: Operation[]) => ({ simultaneous: false, operations });
const choice = (seat: Seat, kind: 'starting-player' | 'mulligan' | 'order', reason: string,
  options: Choice['options'], min: number, max: number, resume: ResumeRef): ChoiceRequest =>
  ({ seat, kind, reason, options, min, max, allocation: null, resume });

const startingPlayer: ResumeStep = {
  payloadSchema: startPayload,
  run: ({ frame, answer }) => {
    if (!answer) return { batches: [], next: null, choice: choice(frame.controller, 'starting-player',
      'Choose whether you take the first turn.', [
        { id: 'first', label: 'Take first turn', object: null },
        { id: 'second', label: 'Take second turn', object: null },
      ], 1, 1, ref('starting-player', null)) };
    const firstSeat: Seat = answer.selected[0] === 'first' ? frame.controller : frame.controller === 0 ? 1 : 0;
    const operations: Operation[] = [
      { kind: 'setup-first-player', seat: firstSeat },
      { kind: 'draw', seat: 0, count: 5 },
      { kind: 'draw', seat: 1, count: 5 },
    ];
    return { batches: [batch(operations)], choice: null,
      next: ref('mulligan', { firstSeat, index: 0 }) };
  },
};

const mulligan: ResumeStep = {
  payloadSchema: flowPayload,
  run: ({ state, frame, answer }) => {
    const { firstSeat, index } = frame.resume.payload as { firstSeat: Seat; index: number };
    if (index >= 2) return { batches: [], choice: null, next: ref('finish', { firstSeat, index }) };
    const seat: Seat = index === 0 ? firstSeat : firstSeat === 0 ? 1 : 0;
    if (!answer) return { batches: [], next: null, choice: choice(seat, 'mulligan',
      'Keep your opening hand or redraw it once.', [
        { id: 'keep', label: 'Keep', object: null },
        { id: 'redraw', label: 'Redraw', object: null },
      ], 1, 1, ref('mulligan', { firstSeat, index })) };
    if (answer.selected[0] === 'keep') {
      return { batches: [], choice: null, next: ref('mulligan', { firstSeat, index: index + 1 }) };
    }
    const options = state.zones[seat].hand.map(instance => {
      const card = state.cards[instance]!;
      return { id: card.object, label: card.card, object: card.object };
    });
    return { batches: [], next: null, choice: choice(seat, 'order', 'Order the five cards to place on the bottom of your deck.',
      options, 5, 5, ref('order', { firstSeat, index, seat })) };
  },
};

const orderPayload = z.object({ firstSeat: seatSchema, index: z.number().int().nonnegative(), seat: seatSchema }).strict();
const order: ResumeStep = {
  payloadSchema: orderPayload,
  run: ({ frame, answer }) => {
    const { firstSeat, index, seat } = frame.resume.payload as { firstSeat: Seat; index: number; seat: Seat };
    if (!answer) return { batches: [], choice: null, next: ref('mulligan', { firstSeat, index }) };
    const operations: Operation[] = answer.selected.map(object => ({ kind: 'move', object, to: 'deck', index: null }));
    operations.push({ kind: 'draw', seat, count: 5 });
    return { batches: [batch(operations)], choice: null, next: ref('mulligan', { firstSeat, index: index + 1 }) };
  },
};

const finish: ResumeStep = {
  payloadSchema: flowPayload,
  run: ({ frame }) => {
    const { firstSeat } = frame.resume.payload as { firstSeat: Seat; index: number };
    return { batches: [batch([{ kind: 'setup-begin-game', firstPlayer: firstSeat }])], choice: null, next: null };
  },
};

registerRuleStep('setup', 'starting-player', startingPlayer);
registerRuleStep('setup', 'mulligan', mulligan);
registerRuleStep('setup', 'order', order);
registerRuleStep('setup', 'finish', finish);
