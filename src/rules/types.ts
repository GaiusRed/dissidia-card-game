import type { ExecutionState } from './contracts/execution';
import type { CardRegistry } from './contracts/registry';
import type { ResumeRef } from './contracts/execution';

export type Seat = 0 | 1;
export type CardNumber = string;
export type InstanceId = string;
export type ObjectId = string;
export type Element = 'Fire' | 'Ice' | 'Wind' | 'Earth' | 'Lightning' | 'Water' | 'Light' | 'Dark';
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type Zone = 'deck' | 'hand' | 'field' | 'stack' | 'break' | 'removed' | 'damage' | 'commander';
export type Phase = 'setup' | 'active' | 'draw' | 'main1' | 'attack' | 'main2' | 'end';
export type Keyword = 'Brave' | 'Haste' | 'First Strike' | 'Freeze';

export interface Versions { schema: string; engine: string; format: string; catalog: string }
export interface DeckList { commander: CardNumber; main: CardNumber[] }
export interface FormatProfile { id: string; mainSize: 19 | 49; allowedSets: string[]; damageLimit: 7 }
export interface AbilityDefinition {
  id: string; kind: 'action' | 'special' | 'auto' | 'field' | 'replacement';
  handler: string; text: string; ex: boolean;
  trigger?: 'enter' | 'controlled-forward-leaves' | 'self-break' | 'end-phase';
  triggerDestination?: Zone[];
  target?: AbilityTargetRule;
  activation?: {
    cost: number; elements: Element[]; dullSource: boolean; sacrificeSource: boolean; specialDiscardName: string | null;
    target: {
      zones: Zone[]; types: CardDefinition['type'][]; elements: Element[];
      owner: 'you' | 'any'; controller: 'you' | 'opponent' | 'any'; dull: boolean | null;
    };
  };
}
export interface AbilityTargetRule {
  zones: Zone[]; types: CardDefinition['type'][]; elements: Element[];
  owner: 'you' | 'any'; controller: 'you' | 'opponent' | 'any'; dull: boolean | null;
}
export interface SummonTargetRule {
  min: number; max: number; zones: Zone[]; types: CardDefinition['type'][];
  controller: 'you' | 'opponent' | 'any'; dull: boolean | null; maxCost?: number;
  modes?: { id: string; label: string; types: CardDefinition['type'][]; maxCost?: number }[];
}
export interface CardDefinition {
  number: CardNumber; name: string; set: string; provenance: 'placeholder' | 'custom' | 'official';
  version: string; rarity: 'C' | 'R' | 'H' | 'L' | 'S'; type: 'Forward' | 'Backup' | 'Summon';
  elements: Element[]; cost: number; power: number | null; jobs: string[]; categories: string[];
  generic: boolean; keywords: Keyword[]; abilities: AbilityDefinition[]; text: string;
  summonHandler: string | null; summonTarget?: SummonTargetRule; exHandler?: string; ex: boolean;
}
export type Catalog = Readonly<Record<CardNumber, CardDefinition>>;
export interface CardObject {
  instance: InstanceId; object: ObjectId; card: CardNumber; owner: Seat; controller: Seat;
  zone: Zone; dull: boolean; damage: number; controlledSinceTurn: number;
  attackedTurn: number | null; frozen: boolean;
}
export interface Continuation { handler: string; step: string; data: Json }
export interface ChoiceOption { id: string; label: string; object: ObjectId | null }
export interface Choice {
  id: string; seat: Seat;
  kind: 'starting-player' | 'mulligan' | 'cards' | 'targets' | 'mode' | 'order' | 'allocation' | 'confirm';
  reason: string; options: ChoiceOption[]; min: number; max: number;
  allocation: { total: number; increment: number } | null; resume: Continuation | ResumeRef;
}
export interface Answer { choice: string; selected: string[]; amounts: Record<string, number> }
export interface Payment {
  discard: ObjectId[]; dullBackups: ObjectId[]; specialDiscard: ObjectId | null;
  dullSource: boolean; sacrificeSource: boolean; sourceElements: Record<ObjectId, Element>;
  spend: Partial<Record<Element, number>>;
}
export interface CostSpec {
  amount: number;
  elements: Element[];
  dullSource: boolean;
  sacrificeSource: boolean;
  specialDiscardName: string | null;
}
export type Intent =
  | { kind: 'pass' }
  | { kind: 'concede' }
  | { kind: 'answer'; answer: Answer }
  | { kind: 'cast'; source: ObjectId; targets: ObjectId[]; mode: string | null; payment: Payment }
  | { kind: 'activate'; source: ObjectId; ability: string; targets: ObjectId[]; payment: Payment }
  | { kind: 'attack'; members: ObjectId[] }
  | { kind: 'block'; blocker: ObjectId | null };
export interface Command { id: string; expectedSeq: number; seat: Seat; intent: Intent }
export interface RuleEvent { id: string; type: string; data: Json }
export interface StackItem {
  id: ObjectId; controller: Seat; source: ObjectId; lastKnown: CardObject;
  handler: string; targets: ObjectId[]; mode: string | null; data: Json; resume?: import('./contracts/execution').ResumeRef;
}
export interface EffectRecord {
  id: string; timestamp: number; controller: Seat; source: ObjectId;
  handler: string; data: Json; expiresTurn: number | null;
}
export interface CombatState {
  step: 'prepare' | 'declare' | 'block' | 'firstStrike' | 'damage' | 'normalDamage' | 'finish';
  participants: CardObject[];
  attackers: ObjectId[]; blocker: ObjectId | null; wasBlocked: boolean; partyFirstStrike: boolean;
  allocation: Record<ObjectId, number>;
}
export interface Result { winner: Seat | null; reason: 'damage' | 'deckout' | 'concede' | 'simultaneous' | 'loop' }
export interface MatchState {
  versions: Versions; seq: number; rng: number; nextId: number; format: FormatProfile;
  turn: number; active: Seat; firstPlayer: Seat; phase: Phase; priority: Seat | null; passes: number;
  cards: Record<InstanceId, CardObject>;
  zones: Record<Seat, Record<Exclude<Zone, 'field' | 'stack'>, InstanceId[]>>;
  field: InstanceId[]; stackCards: InstanceId[];
  commanders: Record<Seat, { instance: InstanceId; casts: number }>;
  stack: StackItem[]; effects: EffectRecord[]; triggers: Continuation[];
  work: Continuation[]; choice: Choice | null; combat: CombatState | null; result: Result | null;
  execution: ExecutionState;
}
export interface StartOptions { seed: number; decks: [DeckList, DeckList]; format: FormatProfile }
export interface RuleError { code: string; message: string }
export type Transition =
  | { ok: true; state: MatchState; events: RuleEvent[] }
  | { ok: false; state: MatchState; error: RuleError; events: [] };
export interface ActionOffer {
  id: string; kind: Intent['kind']; source: ObjectId | null; label: string; ability: string | null;
  targetOptions: ChoiceOption[]; minTargets: number; maxTargets: number;
  modes: ChoiceOption[]; modeTargetOptions?: Record<string, ChoiceOption[]>; needsPayment: boolean; payment: PaymentOffer | null;
}
export interface PaymentOffer {
  cost: number; commanderTax: number; elements: Element[];
  discardOptions: ObjectId[]; backupOptions: ObjectId[]; specialOptions: ObjectId[];
  dullSource: boolean; sacrificeSource: boolean;
}
export interface CastAccess {
  source: ObjectId; sourceZone: Zone; canDeclare: boolean;
  blockedReasons: RuleError[]; displayedCost: number; commanderTax: number;
}
export interface EngineContext {
  catalog: Catalog;
  registry: CardRegistry;
  handlers?: Readonly<Record<string, AbilityHandler>>;
}
export interface HandlerContext {
  state: MatchState; catalog: Catalog; handlers: Readonly<Record<string, AbilityHandler>>;
  registry: CardRegistry; frame: Continuation;
}
export interface HandlerResult { events: RuleEvent[]; next: Continuation[]; choice: Choice | null }
export type AbilityHandler = (context: HandlerContext) => HandlerResult;
