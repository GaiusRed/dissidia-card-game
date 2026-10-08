import { z } from 'zod';
import type {
  Answer, CardObject, Catalog, Choice, Element, Json, Keyword, MatchState, ObjectId, RuleError, RuleEvent, Seat, Zone,
} from '../types';

export type ExecutionMode = 'stack' | 'ex' | 'cost' | 'rule';
export type DeepReadonly<T> = T extends (...args: never[]) => unknown ? T
  : T extends readonly (infer U)[] ? readonly DeepReadonly<U>[]
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;

const jsonSchema: z.ZodType<Json> = z.lazy(() => z.union([
  z.null(), z.boolean(), z.number().finite(), z.string(),
  z.array(jsonSchema), z.record(z.string(), jsonSchema),
]));

export const resumeRefSchema = z.object({
  script: z.string().min(1), version: z.string().min(1), ability: z.string().min(1),
  step: z.string().min(1), payload: jsonSchema,
}).strict();

export interface ResumeRef {
  script: string; version: string; ability: string; step: string; payload: Json;
}
export interface ExecutionFrame {
  id: string; resume: ResumeRef; mode: ExecutionMode; controller: Seat; source: ObjectId;
  lastKnown: CardObject; targets: ObjectId[]; selectedMode: string | null;
  remaining: OperationBatch[]; returnWindow: ReturnWindow;
  operationIndex: number; scriptComplete: boolean;
}
export type ReturnWindow =
  | { kind: 'priority'; seat: Seat }
  | { kind: 'combat'; step: import('../types').CombatState['step']; seat: Seat }
  | { kind: 'end'; step: 'triggers' | 'cleanup' | 'next-turn' };
export interface ChoiceRequest {
  seat: Seat; kind: Choice['kind']; reason: string; options: Choice['options']; min: number; max: number;
  allocation: Choice['allocation']; resume: ResumeRef;
}
export type Operation =
  | { kind: 'move'; object: ObjectId; to: Zone; index: number | null }
  | { kind: 'forward-damage'; source: ObjectId; target: ObjectId; amount: number }
  | { kind: 'player-damage'; source: ObjectId; seat: Seat; amount: number }
  | { kind: 'draw'; seat: Seat; count: number }
  | { kind: 'discard'; seat: Seat; objects: ObjectId[]; reason: 'effect' | 'hand-limit' | 'cost' | 'special-cost' }
  | { kind: 'reveal'; objects: ObjectId[] }
  | { kind: 'shuffle'; seat: Seat }
  | { kind: 'status'; object: ObjectId; dull: boolean | null; freeze: boolean }
  | { kind: 'power'; source: ObjectId; object: ObjectId; mode: 'base' | 'add'; value: number; expiresTurn: number | null }
  | { kind: 'keyword'; source: ObjectId; object: ObjectId; keyword: Keyword; expiresTurn: number | null }
  | { kind: 'control'; source: ObjectId; object: ObjectId; controller: Seat; expiresTurn: number | null }
  | { kind: 'delay'; at: 'controller-end'; controller: Seat; source: ObjectId; resume: ResumeRef }
  | { kind: 'cancel-stack'; item: ObjectId }
  | { kind: 'setup-first-player'; seat: Seat }
  | { kind: 'setup-begin-game'; firstPlayer: Seat }
  | { kind: 'batch-move-replacement'; batch: string; operation: number; object: ObjectId; destination: Zone }
  | { kind: 'trigger-target'; item: ObjectId; target: ObjectId }
  | { kind: 'order-triggers'; seat: Seat; items: ObjectId[] }
  | { kind: 'combat-allocation'; amounts: Record<ObjectId, number> }
  | { kind: 'commander-destination'; instance: string; destination: Zone; selected: string; seat: Seat }
  | { kind: 'end-phase-checkpoint' };
export interface OperationBatch { simultaneous: boolean; operations: Operation[] }
export interface PendingBatch {
  id: string;
  operations: Operation[];
  snapshots: CardObject[];
  observers: CardObject[];
  characteristics: { object: ObjectId; power: number }[];
  replacementIndex: number;
  replacements: { operation: number; replacement: Operation }[];
  phase: 'replacements' | 'apply' | 'events';
}
export interface DelayedExecution {
  id: string; controller: Seat; source: ObjectId; lastKnown: CardObject;
  createdTurn: number; eligibleTurn: number; at: 'controller-end'; resume: ResumeRef;
}
export interface ExecutionState {
  frames: ExecutionFrame[]; batch: PendingBatch | null; returnWindow: ReturnWindow;
  delayed: DelayedExecution[];
}
export interface StepResult { batches: OperationBatch[]; choice: ChoiceRequest | null; next: ResumeRef | null }
export interface ResolutionContext {
  state: DeepReadonly<MatchState>; catalog: Catalog; frame: DeepReadonly<ExecutionFrame>; answer: DeepReadonly<Answer> | null;
}
export interface ResumeStep { payloadSchema: z.ZodType<Json>; run(context: ResolutionContext): StepResult }
export interface SchedulerResult { events: RuleEvent[]; error: RuleError | null }

const seatSchema = z.union([z.literal(0), z.literal(1)]);
const cardObjectSchema = z.object({
  instance: z.string(), object: z.string(), card: z.string(), owner: seatSchema, controller: seatSchema,
  zone: z.enum(['deck', 'hand', 'field', 'stack', 'break', 'removed', 'damage', 'commander']),
  dull: z.boolean(), damage: z.number().int().nonnegative(), controlledSinceTurn: z.number().int().nonnegative(),
  attackedTurn: z.number().int().nonnegative().nullable(), frozen: z.boolean(),
}).strict();
const operationSchema: z.ZodType<Operation> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('move'), object: z.string(), to: z.enum(['deck', 'hand', 'field', 'stack', 'break', 'removed', 'damage', 'commander']), index: z.number().int().nullable() }).strict(),
  z.object({ kind: z.literal('forward-damage'), source: z.string(), target: z.string(), amount: z.number().int().nonnegative() }).strict(),
  z.object({ kind: z.literal('player-damage'), source: z.string(), seat: seatSchema, amount: z.number().int().nonnegative() }).strict(),
  z.object({ kind: z.literal('draw'), seat: seatSchema, count: z.number().int().nonnegative() }).strict(),
  z.object({ kind: z.literal('discard'), seat: seatSchema, objects: z.array(z.string()), reason: z.enum(['effect', 'hand-limit', 'cost', 'special-cost']) }).strict(),
  z.object({ kind: z.literal('reveal'), objects: z.array(z.string()) }).strict(),
  z.object({ kind: z.literal('shuffle'), seat: seatSchema }).strict(),
  z.object({ kind: z.literal('status'), object: z.string(), dull: z.boolean().nullable(), freeze: z.boolean() }).strict(),
  z.object({ kind: z.literal('power'), source: z.string(), object: z.string(), mode: z.enum(['base', 'add']), value: z.number().int(), expiresTurn: z.number().int().nullable() }).strict(),
  z.object({ kind: z.literal('keyword'), source: z.string(), object: z.string(), keyword: z.enum(['Brave', 'Haste', 'First Strike', 'Freeze']), expiresTurn: z.number().int().nullable() }).strict(),
  z.object({ kind: z.literal('control'), source: z.string(), object: z.string(), controller: seatSchema, expiresTurn: z.number().int().nullable() }).strict(),
  z.object({ kind: z.literal('delay'), at: z.literal('controller-end'), controller: seatSchema, source: z.string(), resume: resumeRefSchema }).strict(),
  z.object({ kind: z.literal('cancel-stack'), item: z.string() }).strict(),
  z.object({ kind: z.literal('setup-first-player'), seat: seatSchema }).strict(),
  z.object({ kind: z.literal('setup-begin-game'), firstPlayer: seatSchema }).strict(),
  z.object({ kind: z.literal('batch-move-replacement'), batch: z.string().min(1), operation: z.number().int().nonnegative(), object: z.string(), destination: z.enum(['deck', 'hand', 'field', 'stack', 'break', 'removed', 'damage', 'commander']) }).strict(),
  z.object({ kind: z.literal('trigger-target'), item: z.string(), target: z.string() }).strict(),
  z.object({ kind: z.literal('order-triggers'), seat: seatSchema, items: z.array(z.string()) }).strict(),
  z.object({ kind: z.literal('combat-allocation'), amounts: z.record(z.string(), z.number().int().nonnegative()) }).strict(),
  z.object({ kind: z.literal('commander-destination'), instance: z.string(), destination: z.enum(['deck', 'hand', 'field', 'stack', 'break', 'removed', 'damage', 'commander']), selected: z.string(), seat: seatSchema }).strict(),
  z.object({ kind: z.literal('end-phase-checkpoint') }).strict(),
]);
const operationBatchSchema = z.object({ simultaneous: z.boolean(), operations: z.array(operationSchema) }).strict();
const returnWindowSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('priority'), seat: seatSchema }).strict(),
  z.object({ kind: z.literal('combat'), step: z.enum(['prepare', 'declare', 'block', 'firstStrike', 'damage', 'normalDamage', 'finish']), seat: seatSchema }).strict(),
  z.object({ kind: z.literal('end'), step: z.enum(['triggers', 'cleanup', 'next-turn']) }).strict(),
]);
const executionFrameSchema = z.object({
  id: z.string().min(1), resume: resumeRefSchema, mode: z.enum(['stack', 'ex', 'cost', 'rule']),
  controller: seatSchema, source: z.string(), lastKnown: cardObjectSchema, targets: z.array(z.string()),
  selectedMode: z.string().nullable(), remaining: z.array(operationBatchSchema), returnWindow: returnWindowSchema,
  operationIndex: z.number().int().nonnegative(), scriptComplete: z.boolean(),
}).strict();
const pendingBatchSchema = z.object({
  id: z.string().min(1), operations: z.array(operationSchema), snapshots: z.array(cardObjectSchema),
  observers: z.array(cardObjectSchema),
  characteristics: z.array(z.object({ object: z.string(), power: z.number().int().nonnegative() }).strict()),
  replacementIndex: z.number().int().nonnegative(),
  replacements: z.array(z.object({ operation: z.number().int().nonnegative(), replacement: operationSchema }).strict()),
  phase: z.enum(['replacements', 'apply', 'events']),
}).strict();
const delayedExecutionSchema = z.object({
  id: z.string().min(1), controller: seatSchema, source: z.string(), lastKnown: cardObjectSchema,
  createdTurn: z.number().int().nonnegative(),
  eligibleTurn: z.number().int().nonnegative(), at: z.literal('controller-end'), resume: resumeRefSchema,
}).strict();
export const executionStateSchema: z.ZodType<ExecutionState> = z.object({
  frames: z.array(executionFrameSchema), batch: pendingBatchSchema.nullable(),
  returnWindow: returnWindowSchema, delayed: z.array(delayedExecutionSchema),
}).strict();
