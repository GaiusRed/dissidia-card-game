import { z } from 'zod';

const seatSchema = z.union([z.literal(0), z.literal(1)]);
const elementSchema = z.enum(['Fire', 'Ice', 'Wind', 'Earth', 'Lightning', 'Water', 'Light', 'Dark']);
const objectId = z.string().min(1);
const paymentSchema = z.strictObject({
  discard: z.array(objectId), dullBackups: z.array(objectId), specialDiscard: objectId.nullable(),
  dullSource: z.boolean(), sacrificeSource: z.boolean(),
  sourceElements: z.record(objectId, elementSchema),
  spend: z.partialRecord(elementSchema, z.number().int().nonnegative()),
});
const answerSchema = z.strictObject({
  choice: z.string().min(1), selected: z.array(z.string()),
  amounts: z.record(z.string(), z.number().int()),
});
export const intentSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('pass') }),
  z.strictObject({ kind: z.literal('concede') }),
  z.strictObject({ kind: z.literal('answer'), answer: answerSchema }),
  z.strictObject({ kind: z.literal('cast'), source: objectId, targets: z.array(objectId), mode: z.string().nullable(), payment: paymentSchema }),
  z.strictObject({ kind: z.literal('activate'), source: objectId, ability: z.string().min(1), targets: z.array(objectId), payment: paymentSchema }),
  z.strictObject({ kind: z.literal('attack'), members: z.array(objectId).min(1) }),
  z.strictObject({ kind: z.literal('block'), blocker: objectId.nullable() }),
]);
export const commandSchema = z.strictObject({
  id: z.string().min(1), expectedSeq: z.number().int().nonnegative(), seat: seatSchema, intent: intentSchema,
});
