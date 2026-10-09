import type { CardDefinition, ChoiceOption, Element, MatchState, Seat, Zone, CardObject } from '../types';
import type { ChoiceRequest, DeepReadonly, Operation, ResumeStep } from './execution';

export interface CostSpec {
  cp: number; elements: Element[]; dullSource: boolean; sacrificeSource: boolean; sameNameDiscard: boolean;
}
export interface TargetSpec {
  min: number; max: number;
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
  fieldEffects: readonly FieldProvider[];
  replacements: readonly ReplacementProvider[]; steps: Readonly<Record<string, ResumeStep>>;
}
export interface CardScript { metadata: CardDefinition; behaviorVersion: string; abilities: readonly AbilityScript[] }
