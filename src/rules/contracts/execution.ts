import { z } from 'zod';
import type {
  Answer, CardObject, Choice, Element, Json, Keyword, MatchState, ObjectId, RuleError, RuleEvent, Seat, Zone,
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
  remaining: OperationBatch[]; returnPriority: Seat;
}
export interface ChoiceRequest {
  seat: Seat; kind: Choice['kind']; reason: string; options: Choice['options']; min: number; max: number;
  allocation: Choice['allocation']; resume: ResumeRef;
}
export type Operation =
  | { kind: 'move'; object: ObjectId; to: Zone; index: number | null }
  | { kind: 'forward-damage'; source: ObjectId; target: ObjectId; amount: number }
  | { kind: 'player-damage'; source: ObjectId; seat: Seat; amount: number }
  | { kind: 'draw'; seat: Seat; count: number }
  | { kind: 'discard'; seat: Seat; objects: ObjectId[]; reason: 'effect' | 'hand-limit' }
  | { kind: 'reveal'; objects: ObjectId[] }
  | { kind: 'shuffle'; seat: Seat }
  | { kind: 'status'; object: ObjectId; dull: boolean | null; freeze: boolean }
  | { kind: 'power'; source: ObjectId; object: ObjectId; mode: 'base' | 'add'; value: number; expiresTurn: number | null }
  | { kind: 'keyword'; source: ObjectId; object: ObjectId; keyword: Keyword; expiresTurn: number | null }
  | { kind: 'control'; source: ObjectId; object: ObjectId; controller: Seat; expiresTurn: number | null }
  | { kind: 'delay'; at: 'controller-end'; controller: Seat; resume: ResumeRef };
export interface OperationBatch { simultaneous: boolean; operations: Operation[] }
export interface StepResult { batches: OperationBatch[]; choice: ChoiceRequest | null; next: ResumeRef | null }
export interface ResolutionContext { state: DeepReadonly<MatchState>; frame: DeepReadonly<ExecutionFrame>; answer: DeepReadonly<Answer> | null }
export interface ResumeStep { payloadSchema: z.ZodType<Json>; run(context: ResolutionContext): StepResult }
export interface SchedulerResult { events: RuleEvent[]; error: RuleError | null }
