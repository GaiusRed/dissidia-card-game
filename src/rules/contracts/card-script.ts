import type { CardDefinition, ChoiceOption, Element, MatchState, ObjectId, RuleEvent, Seat, Zone, CardObject } from '../types';
import type { ChoiceRequest, DeepReadonly, Operation, ResumeStep } from './execution';

export interface CostSpec {
  cp: number; elements: Element[]; dullSource: boolean; sacrificeSource: boolean; sameNameDiscard: boolean;
}
export interface DeclarationContext {
  state: DeepReadonly<MatchState>; seat: Seat; source: ObjectId; ability: string; mode: string | null;
}
export interface TargetSpec {
  min: number; max: number; distinct: boolean;
  accepts(context: DeclarationContext, target: ObjectId): boolean;
}
export interface TriggerSubscription {
  events: readonly string[];
  matches(state: DeepReadonly<MatchState>, event: DeepReadonly<RuleEvent>, source: DeepReadonly<CardObject>): boolean;
}
export interface FieldProvider {
  effects(state: DeepReadonly<MatchState>, source: DeepReadonly<CardObject>, catalog: Readonly<Record<string, CardDefinition>>): readonly Extract<Operation, { kind: 'power' | 'keyword' | 'control' }>[];
}
export interface ReplacementProposal { id: string; controller: Seat; operation: Operation; choice: ChoiceRequest | null }
export interface ReplacementProvider {
  propose(state: DeepReadonly<MatchState>, operation: DeepReadonly<Operation>, source: DeepReadonly<CardObject>): ReplacementProposal | null;
}
export interface AbilityScript {
  id: string; kind: 'summon' | 'action' | 'special' | 'auto' | 'field' | 'replacement';
  text: string; ex: boolean; zones: readonly Zone[]; cost: CostSpec;
  modes: readonly ChoiceOption[]; targets: TargetSpec;
  triggers: readonly TriggerSubscription[]; fieldEffects: readonly FieldProvider[];
  replacements: readonly ReplacementProvider[]; steps: Readonly<Record<string, ResumeStep>>;
}
export interface CardScript { metadata: CardDefinition; behaviorVersion: string; abilities: readonly AbilityScript[] }
