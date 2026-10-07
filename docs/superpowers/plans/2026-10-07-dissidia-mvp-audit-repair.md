# Dissidia MVP Audit Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task, inline. Steps use checkbox syntax. Delegation requires an explicit user request. Commits require explicit consent.

**Goal:** Repair all 25 audit findings and complete MVP milestones 1-3 with independent card scripts and a light default theme.

**Architecture:** An injected card registry supplies typed scripts to a deterministic rules scheduler. An asynchronous local host owns state and persistence. Phaser shows the animated table, while HTML supplies choices, menus, inspection, and deck editing.

**Tech Stack:** Existing TypeScript, Phaser, Zod, Vite, Vitest, Playwright, IndexedDB, and `vite-plugin-pwa`. Keep the current lockfile versions.

**Date:** 2026-10-07. **Branch:** `feature/mvp-game-design-spec`. **Planning baseline:** `9341328`.

**Approved design:** [MVP repair spec](../specs/2026-10-07-dissidia-mvp-audit-repair-design.md).

**Findings:** [Branch audit](../audits/2026-10-07-mvp-branch-audit.md).

## Global Constraints

- Complete milestones 1-3 of [the original MVP spec](../specs/2026-10-06-dissidia-mvp-design.md).
- Use [FFTCG Comprehensive Rules v3.3](../../fftcg-comprules-v3.3.pdf). Card text and documented Commander overrides retain precedence.
- Preserve exactly 40 Opus Placeholder identities, `opus-ph` provenance `placeholder`, and the original card definitions.
- Preserve the two supplied decks, each with exactly 19 main-deck cards and one Commander. Production validation remains 49 plus one.
- Preserve card-number singleton, printed-element deck identity, and Light/Dark inclusion exceptions.
- Commander tax is two CP per previous successful Commander Zone cast. Stable instance identity survives zone changes.
- A Commander owner chooses its optional return replacement, including under opposing control.
- Use one typed TypeScript module per card number and an explicit versioned registry.
- Rules import no concrete card module, Phaser, browser, network, storage, wall-clock, or unseeded random API.
- Card scripts request shared operations. They never mutate arbitrary authoritative state.
- The client renders projections and consumes action offers. It never reads authoritative state or branches on card handlers.
- Use FFTCG sequential attacks, same-element parties, and one ordinary blocker. Do not substitute MTG combat rules.
- Use exact spent CP and immediately expire generated surplus under supplied rule 11.2.
- Save execution frames, choices, RNG, accepted commands, and pinned versions. Reject incompatible old saves with export access.
- Rising Undertow follows its printed "your End Phase" text and approved repair section 6: the controller's next qualifying End Phase.
- Initial theme: bright ivory, pale blue, dark text, and restrained warm metal accents. A theme selector is excluded.
- Use all nine exact color tokens in approved repair section 9. Check 4.5:1 normal-text and 3:1 large-text or functional-boundary contrast.
- Phaser owns animated table cards. HTML owns accessible choices, menus, inspection, deck editing, and the log.
- Support 1280 x 720 and 1920 x 1080, mouse, keyboard, reduced motion, direct click, and direct drag.
- Keep choices at bottom left and progression at bottom right, outside card hit regions.
- Use original geometric artwork and local or system fonts. Cache every release asset for offline use.
- Keep one user in control of both seats. Inspection never transfers authority.
- Exclude full real-card authoring, online services, matchmaking, mobile UI, pets, and cosmetic controls.
- Work in the current branch. Do not create worktrees, commit, push, or publish during planning.

## Delivery Order and Review Points

This repair crosses connected boundaries, so it uses one ordered plan.
The old implementation plan remains a historical record. This plan controls the repair work.

| Stage | Tasks | Reviewable result |
|---|---|---|
| Rules foundation | 1-11 | Script contracts, registry, scheduler, costs, setup, checkpoints, and deterministic outcomes |
| Rules interactions | 12-17 | All placeholder scripts, combat, parties, EX, End Phase, and playable scenario transcripts |
| Offline host and recovery | 18-20 | Checked saves, serialized storage, worker-compatible transport, and filtered views |
| Bright playable client | 21-26 | Light theme, Phaser table, explicit drafts, all choices, gestures, and deck editor |
| Offline release acceptance | 27-28 | Safe updates, complete offline duels, evidence, and final milestone gates |

At each review point, report completed requirements, command output, and unresolved failures.
Do not label a milestone complete while any required exit check remains open.
The milestone 1 gate runs after Task 11. The milestone 2 gate runs after Task 17.
The milestone 3 gate runs after Task 28.

## File Map

| Path | Responsibility and disposition |
|---|---|
| `src/rules/types.ts`, `codec.ts`, `index.ts` | Retain public domain types, command parsing, and package entry. Export new contracts. |
| `src/rules/contracts/card-script.ts` | Card, ability, target, cost, subscription, replacement, and field-effect contracts |
| `src/rules/contracts/execution.ts` | Serializable execution frames, operations, batches, and choices |
| `src/rules/contracts/registry.ts` | Read-only registry interface and version manifest |
| `src/content/cards/opus-ph/` | Forty separate modules using the exact original card numbers as filenames |
| `src/content/manifest.ts`, `registry.ts`, `shared/helpers.ts` | Explicit imports, checked registration, and pure reusable authoring helpers |
| `src/content/opus-ph.ts` | Retain as a metadata export derived from the registry |
| `src/content/handlers.ts`, `src/rules/summons.ts` | Remove after every caller uses the new registry and scheduler |
| `src/rules/scheduler.ts`, `choices.ts`, `checkpoints.ts`, `loops.ts` | Deterministic progression, answers, rule checks, and semantic loop proof |
| `src/rules/operations/zone.ts`, `damage.ts`, `cards.ts`, `effects.ts` | Generic zone, damage, draw/search/discard, and effect operations |
| `src/rules/replacements.ts`, `declarations.ts` | Event replacement ordering and one shared legality service |
| Existing `setup.ts`, `turns.ts`, `priority.ts`, `casting.ts`, `activation.ts`, `payment.ts`, `triggers.ts`, `continuous.ts`, `commander.ts`, `combat.ts`, `damage.ts`, `outcomes.ts` | Convert to generic rules and format functions. Delete card switches. |
| `src/storage/save-schema.ts`, `save.ts`, `replay.ts`, `indexed-db.ts`, `decks.ts` | Complete save checks, replay, ordered writes, raw export, and deck drafts |
| `src/host/protocol.ts`, `local-host.ts`, `views.ts`, `transport.ts`, `worker-host.ts`, `worker-client.ts` | Private authority, public protocol, direct and worker transport |
| `src/client/app.ts`, `connection.ts`, `draft.ts`, `choices.ts`, `inspection.ts`, `log.ts`, `theme.ts` | Split the current client responsibilities |
| `src/client/table/playmat.ts`, `card-view.ts`, `layout.ts`, `hand.ts`, `targeting.ts`, `animations.ts` | Phaser scene, identity-safe cards, field rows, fan, arrows, and motion |
| `src/client/menu.ts`, `deck-editor.ts`, `deck-browser.ts`, `offline.ts` | Existing feature entry points and new card-grid view |
| `src/main.ts`, `src/styles.css`, `vite.config.ts` | Small bootstrap, bright HTML styling, and matching PWA metadata |
| `tests/support/driver.ts`, `tests/fixtures/opus-ph-expected.ts` | Explicit command driver and independent metadata oracle |
| `tests/acceptance/requirements.ts`, `scripts/check-acceptance.mjs` | Executable requirement tracking and failure on missing/skipped scenarios |
| `tests/e2e/*.spec.ts`, `docs/acceptance/`, existing coverage and playtest records | Browser gates, screenshots, transcripts, and evidence |

The card filenames use these exact numbers:

```text
P-001L P-002C P-003C P-004C P-005R P-006R P-007H P-008H
P-009C P-010C P-011R P-012H P-013R P-014R P-015C P-016R
P-017R P-018R P-019H P-020H P-021L P-022C P-023C P-024C
P-025R P-026R P-027H P-028H P-029C P-030C P-031R P-032R
P-033R P-034R P-035C P-036R P-037R P-038R P-039H P-040R
```

## Shared Interfaces

Task 2 creates the following contracts. Later tasks must use these names consistently.
The code shows contract boundaries, rather than a universal card language.
Use Zod schemas to check JSON payloads at registration and resume boundaries.
Use deep read-only views for script inputs, including nested cards, zones, effects, and frames.

```ts
// src/rules/contracts/execution.ts
import type { z } from 'zod';
import type {
  Answer, CardObject, Choice, Element, Json, Keyword, MatchState,
  ObjectId, RuleError, RuleEvent, Seat, Zone,
} from '../types';

export type ExecutionMode = 'stack' | 'ex' | 'cost' | 'rule';
export type DeepReadonly<T> = T extends (...args: never[]) => unknown ? T
  : T extends readonly (infer U)[] ? readonly DeepReadonly<U>[]
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> } : T;
export interface ResumeRef {
  script: string; version: string; ability: string; step: string;
  payload: Json;
}
export interface ExecutionFrame {
  id: string; resume: ResumeRef; mode: ExecutionMode;
  controller: Seat; source: ObjectId; lastKnown: CardObject;
  targets: ObjectId[]; selectedMode: string | null;
  remaining: OperationBatch[]; returnPriority: Seat;
}
export interface ChoiceRequest {
  seat: Seat; kind: Choice['kind']; reason: string;
  options: Choice['options']; min: number; max: number;
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
export interface StepResult {
  batches: OperationBatch[]; choice: ChoiceRequest | null; next: ResumeRef | null;
}
export interface ResolutionContext {
  state: DeepReadonly<MatchState>; frame: DeepReadonly<ExecutionFrame>;
  answer: DeepReadonly<Answer> | null;
}
export interface ResumeStep {
  payloadSchema: z.ZodType<Json>;
  run(context: ResolutionContext): StepResult;
}
export interface SchedulerResult {
  events: RuleEvent[]; error: RuleError | null;
}
```

Define `CostSpec`, `TargetSpec`, `AbilityScript`, `CardScript`, `RegistryManifest`, and `CardRegistry` in Task 2.
Their concrete shapes appear in that task. Retain existing domain types unless a named task changes them.

```ts
// tests/support/driver.ts -- created in Task 1, migrated in Task 3
export interface Driver {
  state: MatchState;
  context: EngineContext;
  object(seat: Seat, number: string): ObjectId;
  send(intent: Intent, seat?: Seat): Transition;
  answer(selected: string[], amounts?: Record<string, number>): Transition;
  passPair(): void;
}
export function driver(
  input?: Fixture,
  options?: { context: EngineContext; apply: typeof applyCommand },
): Driver;
```

`send` uses the supplied seat, or the current choice seat, or priority in that order.
It updates `Driver.state` only after an accepted command.
`answer` requires an open choice and never selects options automatically.
`passPair` sends exactly two current-priority passes and throws if a required decision interrupts them.
The driver never hides a rejected command or mutates state to make an action legal.
It uses `buildFixture(input, options?.context ?? context)` to construct a valid origin.
Its command runner defaults to `applyCommand`. Scheduler tests pass `applyScheduledCommand` explicitly until the public cutover.

## Task 1: Capture Rule-Correct Audit Regressions

**Findings:** F01-F10, F19, F25. **Dependencies:** None.

**Files:** Create `tests/support/driver.ts`, `tests/rules/audit-regressions.test.ts`, `tests/storage/import-errors.test.ts`.
Read the audit, original spec, supplied PDF, and existing harness.

**Interfaces:** Consume existing `fixture`, `applyCommand`, and `EngineContext`. Produce the `Driver` contract above.

- [ ] Write the driver without automatic choices or field edits.

```ts
const result = applyCommand(d.state, {
  id: `test-${d.state.seq}`, expectedSeq: d.state.seq, seat,
  intent,
}, d.context);
if (result.ok) d.state = result.state;
return result;
```

- [ ] Add rule-correct regressions using the audit's reproduced fixtures.

```ts
it('F04: Brave does not dull its attacker', () => {
  const d = driver({ phase: 'attack', placements: [
    { seat: 0, card: 'P-001L', zone: 'field' },
  ] });
  expect(d.send({ kind: 'attack', members: [d.object(0, 'P-001L')] }).ok).toBe(true);
  expect(d.state.cards[d.state.commanders[0].instance]!.dull).toBe(false);
});
```

- [ ] Add assertions for stack-before-combat, answered-choice removal, correct entry events, base-power order, and stolen Backup CP.
- [ ] Add assertions for zero-power departure, new-control readiness, friendly Controlled Burn targets, and malformed import results.
- [ ] Add the setup assertion that neither opening hand exists before the first-or-second choice.
- [ ] Run `npm test -- tests/rules/audit-regressions.test.ts tests/storage/import-errors.test.ts`.

Expected: failures show the audited behavior. Record each failure against its finding ID.
Keep these tests active while later tasks repair them. Do not mark them skipped or rewrite them to expect defects.

## Task 2: Define Typed Card and Execution Contracts

**Findings:** F07, F11. **Dependencies:** Task 1.

**Files:** Create the three contract files in the file map. Modify `src/rules/types.ts`, `src/rules/index.ts`.
Create `tests/rules/contracts.test.ts`.

**Interfaces:** Consume domain types. Produce execution contracts above and the following card contracts.

```ts
export interface CostSpec {
  cp: number; elements: Element[];
  dullSource: boolean; sacrificeSource: boolean; sameNameDiscard: boolean;
}
export interface DeclarationContext {
  state: DeepReadonly<MatchState>; seat: Seat; source: ObjectId;
  ability: string; mode: string | null;
}
export interface TargetSpec {
  min: number; max: number; distinct: boolean;
  accepts(context: DeclarationContext, target: ObjectId): boolean;
}
export interface AbilityScript {
  id: string; kind: 'summon' | 'action' | 'special' | 'auto' | 'field' | 'replacement';
  text: string; ex: boolean; zones: Zone[]; cost: CostSpec;
  modes: ChoiceOption[]; targets: TargetSpec;
  triggers: TriggerSubscription[];
  fieldEffects: FieldProvider[]; replacements: ReplacementProvider[];
  steps: Readonly<Record<string, ResumeStep>>;
}
export interface CardScript {
  metadata: CardDefinition; behaviorVersion: string;
  abilities: readonly AbilityScript[];
}
export interface RegistryManifest {
  id: string;
  cards: readonly { number: string; contentVersion: string; behaviorVersion: string }[];
}
export interface CardRegistry {
  manifest: RegistryManifest; catalog: Catalog;
  card(number: string): CardScript;
  ability(number: string, ability: string): AbilityScript;
  resume(ref: ResumeRef): ResumeStep;
}
```

- [ ] Add registration-shape tests for costs, modes, source zones, targets, and named steps.

```ts
expect(resumeRefSchema.safeParse({
  script: 'P-015C', version: '1', ability: 'scorch', step: 'resolve', payload: null,
}).success).toBe(true);
expect(resumeRefSchema.safeParse({ script: 'P-015C', payload: () => 1 }).success).toBe(false);
```

- [ ] Run `npm test -- tests/rules/contracts.test.ts`. Expected: missing-contract failures.
- [ ] Define `TriggerSubscription.matches(state, event, source)`, `FieldProvider.effects(state, source)`, and `ReplacementProvider.propose(state, event, source)`.

```ts
export interface TriggerSubscription {
  events: readonly string[];
  matches(state: DeepReadonly<MatchState>, event: DeepReadonly<RuleEvent>, source: DeepReadonly<CardObject>): boolean;
}
export interface FieldProvider {
  effects(state: DeepReadonly<MatchState>, source: DeepReadonly<CardObject>): EffectRecord[];
}
export interface ReplacementProposal {
  id: string; controller: Seat; event: RuleEvent;
  choice: ChoiceRequest | null;
}
export interface ReplacementProvider {
  propose(state: DeepReadonly<MatchState>, event: DeepReadonly<RuleEvent>, source: DeepReadonly<CardObject>): ReplacementProposal | null;
}
```

- [ ] Define the `MatchManifest` contract with original deck lists, format profile, and registry manifest.
- [ ] Add the new required state fields and their initializers together in Task 4, rather than breaking existing constructors here.
- [ ] Check all serialized types through Zod. Read-only script inputs must reject direct state writes under TypeScript checks.
- [ ] Export `resumeRefSchema` from `src/rules/contracts/execution.ts` for registration and save parsing.
- [ ] Run `npm run typecheck` and the focused contract tests. Expected: new contracts pass without platform imports.

## Task 3: Create the Explicit Registry and Card Metadata Modules

**Findings:** F11-F12, F19. **Dependencies:** Task 2.

**Files:** Create `src/content/manifest.ts`, `registry.ts`, `shared/helpers.ts`, and all forty card files.
Create `tests/content/registry.test.ts`, `tests/fixtures/opus-ph-expected.ts`.
Modify `src/content/opus-ph.ts`, `tests/support/harness.ts`, `tests/support/driver.ts`, and `src/rules/types.ts`.

**Interfaces:** `createRegistry(scripts: readonly CardScript[], id: string): CardRegistry`.
Extend `EngineContext` with `registry: CardRegistry` and update every concrete context initializer in the same task.
Those initializers are in `src/host/local-host.ts`, `tests/support/harness.ts`, `tests/scenarios/full-duel.test.ts`, and `tests/rules/state.test.ts`.
The existing legacy handler map remains available only until Task 12 replaces every caller.

- [ ] Copy the independent expected metadata from the original card tables, including text and every ability kind.
- [ ] Write registration failures for duplicates, missing steps, missing EX effects, and version mismatch.

```ts
expect(() => createRegistry([scorch, scorch], 'duplicate')).toThrow('Duplicate card number');
expect(registry.card('P-013R').abilities[0]!.kind).toBe('action');
expect(registry.catalog['P-001L']!.text).toContain('Flare Order');
```

- [ ] Run `npm test -- tests/content/registry.test.ts tests/content/catalog.test.ts`. Expected: registry and metadata failures.
- [ ] Export one explicit module per number. Do not parse display text for executable rules.

```ts
import { opusPhScripts } from './manifest';
export const opusPhRegistry = createRegistry(opusPhScripts, 'opus-ph-registry-v2');
export const opusPh = opusPhRegistry.catalog;
```

The manifest imports all forty modules and contains every module in printed card-number order.
Each module supplies full metadata now. Task 12 completes executable steps against the generic runtime.
Provide `checkRegistryCompleteness(registry: CardRegistry): RuleError[]` separately from structural registration.
The interim registry can report incomplete behavior without passing the milestone 2 gate.
Task 12 requires zero completeness errors before deleting legacy handlers.
The release bootstrap calls this check and rejects any printed executable ability without a registered step.

- [ ] Derive `opusPhNumbers` from the manifest. Preserve the original deck exports and card identities.
- [ ] Run metadata comparisons across all fields and `npm run typecheck`. Expected: forty exact records and two unchanged legal decks.

## Task 4: Correct Setup Order and Pin Match Manifests

**Findings:** F19, F25. **Dependencies:** Task 3.

**Files:** Modify `src/rules/setup.ts`, `codec.ts`, `invariants.ts`, `types.ts`, `tests/rules/setup.test.ts`, `foundation.test.ts`.
Create `tests/rules/manifest.test.ts`.

**Interfaces:** Preserve `createMatch(options: StartOptions, context: EngineContext): MatchState`.
Versions come from the registry manifest. `MatchManifest` captures both initial decks and their stable instances.

- [ ] Write setup tests for both randomized choosers and both first-player choices.

```ts
const state = createMatch(options, context);
expect(state.zones[0].hand).toEqual([]);
expect(state.zones[1].hand).toEqual([]);
expect(state.versions.catalog).toBe(context.registry.manifest.id);
expect(state.manifest.decks).toEqual(options.decks);
```

- [ ] Run `npm test -- tests/rules/setup.test.ts tests/rules/manifest.test.ts`. Expected: pre-choice draws and placeholder-specific version failures.
- [ ] Draw both opening hands only after the starting-player answer.

```ts
state.firstPlayer = firstSeat;
state.active = firstSeat;
drawOpening(state, 0);
drawOpening(state, 1);
askMulligan(state, 0, firstSeat, context);
```

- [ ] Preserve the ordered bottom-deck mulligan, one redraw, first-turn one-card draw, and Commander exclusion.
- [ ] Derive schema `2`, engine `3`, and registry identity from explicit version constants and the injected registry.
- [ ] Add required `execution: ExecutionFrame[]`, `pendingEvents: RuleEvent[]`, and `manifest: MatchManifest` fields and initialize them atomically.
- [ ] Check manual state constructors in `tests/rules/state.test.ts` and update them with a checked manifest.
- [ ] Run setup, manifest, format, and foundation tests. Expected: original 19/49 size and singleton tests remain correct.

## Task 5: Introduce the Scheduler and Consumable Choices

**Findings:** F01-F02, F07. **Dependencies:** Tasks 2-4.

**Files:** Create `src/rules/scheduler.ts`, `choices.ts`. Modify `engine.ts`, `priority.ts`, `types.ts`.
Create `tests/rules/scheduler.test.ts`, `continuations.test.ts`.

**Interfaces:** `runScheduler(state: MatchState, context: EngineContext): SchedulerResult`.
`answerPendingChoice(state: MatchState, answer: Answer, seat: Seat, context: EngineContext): SchedulerResult`.
`applyCommand` retains its transactional return type.

- [ ] Add tests for one-time consumption, null priority during choices, and JSON round-trip continuation.

```ts
const choiceId = d.state.choice!.id;
expect(d.answer(selected).ok).toBe(true);
expect(d.state.choice?.id).not.toBe(choiceId);
expect(d.send({ kind: 'answer', answer: { choice: choiceId, selected, amounts: {} } }).ok).toBe(false);
```

- [ ] Run focused scheduler tests. Expected: stale-choice and missing-frame failures.
- [ ] Drive command processing through the scheduler, rather than separate handler-specific answer branches.

```ts
const pending = state.choice;
if (!pending || pending.id !== answer.choice || pending.seat !== seat) {
  return { events: [], error: { code: 'STALE_CHOICE', message: 'Use the current decision.' } };
}
state.choice = null;
return runScheduler(state, context);
```

Before clearing the choice, check counts, uniqueness, options, allocation, payload schema, and its execution frame.
Deliver the checked answer to that frame's named step. Do not lose its targets or pending operations.

Keep the existing command reducer behind its current path while the new scheduler passes synthetic-registry tests in Tasks 5-11.
Use `applyScheduledCommand(state: MatchState, command: Command, context: EngineContext): Transition` for that opt-in test path.
It parses and clones state, checks the command, and runs the scheduler before accepting the transition.
Task 12 switches public `applyCommand` to this path after all concrete card modules pass their scenarios.
Both paths must pass the shared foundation tests during the transition. Delete the legacy path in Task 12.
Tasks 6-11 use the scheduled driver option and test-only scripts for each required operation or trigger.
Those scripts use the same placeholder metadata and checked manifests, and remain outside the release registry.

- [ ] Process stack resolution before combat-step advancement. Restore declaration priority to the declaring player.
- [ ] Reset pass history after an accepted declaration, resolution, or interrupted choice.
- [ ] Run scheduler tests and F01/F02 regressions against `applyScheduledCommand` with the synthetic registry.

Expected: no stale answered choice and no combat response bypass in the scheduled path.
The corresponding public-path regressions stay active until the Task 12 cutover.

## Task 6: Apply Zone Events and Commander Replacements Through Batches

**Findings:** F07-F08, F23. **Dependencies:** Task 5.

**Files:** Create `src/rules/operations/zone.ts`, `replacements.ts`. Modify `zones.ts`, `commander.ts`.
Create `tests/rules/operation-batches.test.ts`, `commander-continuations.test.ts`.

**Interfaces:** `applyBatch(state, batch: OperationBatch, frame: ExecutionFrame, context): SchedulerResult`.
`collectReplacements(state, event: RuleEvent, context): ReplacementProposal[]`.
Both signatures use `MatchState` and `EngineContext` from prior tasks.

- [ ] Write a two-Commander Twin Embers execution test that pauses for both owners and survives snapshot/replay.

```ts
expect(d.state.choice!.seat).toBe(0);
expect(d.answer(['return']).ok).toBe(true);
expect(d.state.choice!.seat).toBe(1);
expect(d.answer(['destination']).ok).toBe(true);
expect(d.state.execution).toHaveLength(0);
```

- [ ] Run the focused tests. Expected: interrupted resolution or second-choice failure.
- [ ] Collect pre-event objects and last-known characteristics before a simultaneous batch changes any zone.
- [ ] Apply optional Commander destinations before actual departure and destination events.

```ts
const actualDestination = answer.selected[0] === 'return' ? 'commander' : requestedDestination;
const old = moveCard(state, instance, actualDestination);
state.pendingEvents.push({
  id: `event-${state.nextId++}`, type: 'zone.moved',
  data: { instance, oldObject: old.object, from: old.zone, to: actualDestination },
});
```

- [ ] Preserve stable Commander designation and tax. Return to owner zones after departure.
- [ ] Track replacement IDs applied to an event so one replacement cannot repeat on the same event.
- [ ] Use the same operation path for sacrifices, removal, recovery, combat breaks, and effect-driven movement.
- [ ] Run batch and Commander tests. Expected: correct departure triggers and no arrival in a replaced destination.

## Task 7: Collect Triggers and Declare Their Targets Before Responses

**Findings:** F02, F06. **Dependencies:** Tasks 5-6.

**Files:** Modify `src/rules/triggers.ts`, `priority.ts`, `scheduler.ts`, `choices.ts`.
Create `tests/rules/trigger-declaration.test.ts`. Modify `tests/rules/triggers.test.ts`.

**Interfaces:** `collectTriggers(state: MatchState, events: readonly RuleEvent[], context: EngineContext): void`.
`placePendingTriggers(state: MatchState, context: EngineContext): SchedulerResult`.

- [ ] Write tests that entry creates no departure or End Phase trigger.
- [ ] Assert turn-player then non-turn-player ordering, declaration targets, optional resolution choices, and no-target removal.

```ts
expect(d.state.stack.map(item => item.handler)).not.toContain('mist-caller-activate');
expect(d.state.choice!.kind).toBe('targets');
expect(d.answer([target]).ok).toBe(true);
expect(d.state.stack.at(-1)!.targets).toEqual([target]);
expect(d.state.choice).toBeNull();
```

- [ ] Run trigger-declaration tests. Expected: incorrect entry scheduling or resolution-time targeting failures.
- [ ] Match typed subscriptions against actual events and the relevant pre-event/field snapshots.

```ts
for (const subscription of ability.triggers) {
  if (subscription.events.includes(event.type) && subscription.matches(state, event, source)) {
    enqueueTrigger(state, source, ability, event);
  }
}
```

Define `enqueueTrigger(state: MatchState, source: CardObject, ability: AbilityScript, event: RuleEvent): void` in `triggers.ts`.
It stores a checked execution frame with controller, source snapshot, and trigger event payload.

- [ ] Finish rule processes before placing triggers. Use explicit ordering and target choices with resumable frames.
- [ ] Keep EX and First Strike triggers pending until their permitted checkpoint.
- [ ] Run trigger tests through the subsequent response window. Expected: visible targets and correct authority before either player responds.

## Task 8: Unify Declaration Offers and Atomic Payment

**Findings:** F08, F10. **Dependencies:** Tasks 3, 5-7.

**Files:** Create `src/rules/declarations.ts`. Modify `actions.ts`, `casting.ts`, `activation.ts`, `payment.ts`, `codec.ts`.
Create `tests/rules/declaration-contract.test.ts`. Modify `payment.test.ts`, `actions.test.ts`, `targets.test.ts`.

**Interfaces:** `describeDeclaration(state, seat, source, ability, mode, context): ActionOffer`.
`checkDeclaration(state, seat, intent, context): RuleError[]`.
`recheckTargets(state, frame, context): ObjectId[]`.
`findPayment(state, seat, source, cost: CostSpec, reserved: ObjectId[], context): Payment | null`.
The first three signatures use `MatchState`, `Seat`, `ObjectId`, `Intent`, and `EngineContext`.

- [ ] Add tests for friendly Controlled Burn targets, Stillwater rejecting abilities, source changes, partial targets, and target element changes.
- [ ] Add tests for controlled opposing Backup CP, premature dull-icon use, unrequired special discard, and all duplicate cost combinations.

```ts
const before = structuredClone(d.state);
const rejected = d.send(illegalDeclaration);
expect(rejected.ok).toBe(false);
expect(d.state).toEqual(before);
expect(rejected.events).toEqual([]);
```

- [ ] Run declaration and payment tests. Expected: duplicated card rules and ownership checks fail.
- [ ] Obtain every card-specific cost and target restriction from the selected `AbilityScript`.

```ts
const accepts = ability.targets.accepts;
const legalTargets = targets.filter(target => accepts(declarationContext, target));
const reserved = [source, ...(payment.specialDiscard ? [payment.specialDiscard] : [])];
```

- [ ] Use ownership for hand sources and control for field sources. Keep supplied same-color generation restrictions.
- [ ] Check required cost flags, continuous-control readiness, every elemental requirement, and exact spending.
- [ ] Search complete legal payments after reserving the selected special discard. Do not exclude every same-name card.
- [ ] Generate offers with mode-specific targets and blocked reasons. Require one complete legal declaration for glow.
- [ ] Run payment, offer, target, and rollback tests. Expected: declaration offers agree with accepted commands without state mutation.

## Task 9: Derive Power, Keywords, and Control From Active Effects

**Findings:** F09. **Dependencies:** Tasks 3, 5-8.

**Files:** Create `src/rules/operations/effects.ts`. Modify `continuous.ts`, `turns.ts`, `types.ts`.
Create `tests/rules/effect-order.test.ts`, `control-readiness.test.ts`.

**Interfaces:** Retain `effectivePower` and `hasKeyword`, with registry-aware `EngineContext`.
Add `effectiveController(state: MatchState, object: ObjectId, context: EngineContext): Seat`.
Add `applyEffectOperation(state: MatchState, operation: Operation, frame: ExecutionFrame, context: EngineContext): void`.

- [ ] Assert both War Cry/Shape Tide orders produce 7000 before other field modifiers.

```ts
expect(effectivePower(d.state, target, d.context)).toBe(7000);
expect(d.state.cards[instance]!.controlledSinceTurn).toBe(d.state.turn);
expect(legalActions(d.state, newController, d.context).some(a => a.kind === 'attack' && a.source === target)).toBe(false);
```

- [ ] Run effect-order and readiness tests. Expected: insertion-order and unchanged-readiness failures.
- [ ] Separate base setters from additions, then apply relevant categories, dependencies, and timestamps.

```ts
const base = orderedBaseEffects.at(-1)?.value ?? definition.power ?? 0;
const power = base + orderedModifiers.reduce((sum, effect) => sum + effect.value, 0);
```

- [ ] Derive field providers from the registry and active source zone. Remove Banner Smith switches from rules.
- [ ] Store controller history and source snapshots for each control effect. Recompute controller after expiry.
- [ ] Reset continuous-control readiness after gains and reversions. Honor Haste in both attack and dull-icon checks.
- [ ] Keep delayed triggers separate from ordinary turn-expiring modifiers.
- [ ] Run continuous, control, keyword, and expiry tests. Expected: source departure removes only its applicable field contribution.

## Task 10: Resolve General Rule Checkpoints and Simultaneous Outcomes

**Findings:** F05, F23. **Dependencies:** Tasks 5-9.

**Files:** Create `src/rules/checkpoints.ts`. Modify `outcomes.ts`, `invariants.ts`, `scheduler.ts`.
Create `tests/rules/checkpoints.test.ts`, `simultaneous.test.ts`.

**Interfaces:** `runCheckpoint(state: MatchState, context: EngineContext): SchedulerResult`.
It can pause for excess-Backup and Commander decisions.

- [ ] Write all rule 12.4 cases, including zero power, newly lethal marked damage, duplicate names, Light/Dark conflicts, and excess Backups.
- [ ] Assert simultaneous departures share last-known power and produce both players' actual triggers.

```ts
expect(d.state.cards[zeroPowerInstance]!.zone).toBe('break');
expect(d.state.choice!.reason).toContain('five Backups');
expect(d.answer([extraBackup]).ok).toBe(true);
expect(d.state.result).toEqual({ winner: null, reason: 'simultaneous' });
```

- [ ] Run checkpoint tests. Expected: illegal fields survive or only one defeat is recorded.
- [ ] Compute each rule batch from one pre-checkpoint snapshot.

```ts
const defeated = ([0, 1] as const).filter(seat => defeatCondition(state, seat));
if (defeated.length === 2) state.result = { winner: null, reason: 'simultaneous' };
```

Define `defeatCondition(state: MatchState, seat: Seat): boolean` in `outcomes.ts`.
It includes seven damage, attempted empty draw, and damage beyond available deck cards at the permitted checkpoint.

- [ ] Apply all departures through Task 6 batches. Repeat checkpoints until no rule process remains.
- [ ] Check conservation against `MatchManifest`, valid objects, integer counters, and valid execution/choice linkage.
- [ ] Run checkpoint, invariant, Commander, and outcome tests. Expected: no priority in an unsettled illegal field.

## Task 11: Establish Semantic Mandatory-Loop Handling and the Foundation Gate

**Findings:** F23-F24. **Dependencies:** Tasks 4-10.

**Files:** Create `src/rules/loops.ts`, `tests/rules/loops.test.ts`, `tests/scenarios/foundation-replay.test.ts`.
Modify `scheduler.ts`, `tests/rules/priority.test.ts`, `foundation.test.ts`, and `docs/rules-coverage.md`.

**Interfaces:** `semanticStateKey(state: MatchState): string`.
`observeForcedStep(state: MatchState, key: string, hasPlayerExit: boolean): 'continue' | 'mandatory-loop'`.
Loop bookkeeping persists with the execution frame for interrupted saves.

- [ ] Create a synthetic forced trigger cycle with stable semantic state and no legal player exit.
- [ ] Create separate fixtures with a legal exit and a finite long operation sequence.

```ts
expect(forcedResult.state.result).toEqual({ winner: null, reason: 'loop' });
expect(finiteBudgetResult.ok).toBe(false);
if (!finiteBudgetResult.ok) expect(finiteBudgetResult.error.code).toBe('PROCESSING_LIMIT');
expect(exitPossibleResult.state.result?.reason).not.toBe('loop');
```

- [ ] Run loop tests. Expected: no mandatory-loop implementation.
- [ ] Exclude IDs, sequence, and event counters from semantic comparison. Include rules-relevant zones, effects, choices, and execution positions.

```ts
if (repeatedSemanticState && forcedPath && !hasPlayerExit) {
  state.result = { winner: null, reason: 'loop' };
  state.priority = null;
}
```

- [ ] Treat processing-budget exhaustion as a rollback error unless the mandatory-loop proof succeeds.
- [ ] Update priority tests that incorrectly expect automatic opponent priority after a declaration.
- [ ] Run setup-to-concession replay twice from the same seed and accepted commands.
- [ ] Run `npm test -- tests/rules/contracts.test.ts tests/rules/scheduler.test.ts tests/rules/continuations.test.ts tests/rules/checkpoints.test.ts tests/rules/loops.test.ts tests/scenarios/foundation-replay.test.ts`.
- [ ] Run `npm run typecheck` and the existing foundation tests against both execution paths.
- [ ] Run `npm run check:boundaries`. Record the milestone 1 gate against repair section 14.

Expected: the scheduled foundation passes setup, both deck profiles, payment, Commander foundations, checkpoints, outcomes, and deterministic replay.
Public-path interaction regressions remain expected failures until the Task 12 cutover and Tasks 13-16 combat/EX completion.
Card behaviors not yet migrated remain explicit milestone 2 work, rather than a foundation completion claim.

## Task 12: Complete the Forty Independent Placeholder Scripts

**Findings:** F06-F12. **Dependencies:** Tasks 3, 5-11.

**Files:** Complete all forty modules in `src/content/cards/opus-ph/`. Create `src/rules/operations/cards.ts`, `damage.ts`.
Modify `src/content/shared/helpers.ts`, `manifest.ts`, `registry.ts`, and `src/rules/contracts/execution.ts`.
Create `tests/content/card-behavior.test.ts`. Migrate existing Summon and trigger tests.
Remove `src/content/handlers.ts`, `src/rules/summons.ts`, and all imports of those files after the new path passes.

**Interfaces:** `applyCardOperation(state: MatchState, operation: Operation, frame: ExecutionFrame, context: EngineContext): SchedulerResult`.
`CardRegistry.resume` supplies every executable step. Add `{ kind: 'cancel-stack'; item: ObjectId }` to `Operation` for Stillwater.

Complete one card at a time. Each row below has its own red/green test cycle and reviewable module.
Keep shared helpers generic. Do not create Fire/Water aggregate behavior switches.
Task 12 checks each script's contract and emitted operations independently of later combat and EX step completion.
The final column records its full integration scenario, which joins the milestone 2 gate after Tasks 13-16.

| Cards | Required executable contract | Independent expected scenario |
|---|---|---|
| P-001L | Brave keyword. Flare Order costs same-name discard, Fire CP, dull. Deal 7000 to one Forward. | Remains active after attack, cannot attack twice, special discard does not also pay CP. |
| P-002C | No abilities, non-Generic Cinder Marshal | Same-name field restriction, distinct number and Commander identity. |
| P-003C, P-004C | Generic Ash Recruit, no abilities | Both variants can coexist. |
| P-005R | Haste | Attacks during its entry/control-change turn. |
| P-006R, P-026R | First Strike | Deals early damage with the restricted checkpoint. |
| P-007H | Entry trigger. One Forward loses 2000 until turn end. | Target declaration precedes response, zero power triggers departure. |
| P-008H | Damage replacement reduces each damage event by 1000 | Applies to battle and effect damage, rather than power loss. |
| P-009C, P-029C | No abilities, ordinary Backup | Enters dull and supplies one CP when eligible. |
| P-010C | Dull action. One Fire Forward gains 1000 | Recheck Fire restriction at resolution. |
| P-011R | Optional main-deck Soldier search | Decline without shuffle. Search, including failed specified search, reveals a found card and shuffles. |
| P-012H | Controlled Fire Forward field bonus of 1000 | Bonus applies to new Forwards and ends with source departure. |
| P-013R | Fire CP, dull, sacrifice action. Recover one owned Break Zone Forward | Sacrifice emits departure events. Ability survives source departure. |
| P-014R | Controlled Forward field-to-Break trigger. Deal 1000 to one Forward | Does not fire on witness entry or replaced Commander destination. |
| P-015C | One Forward receives 4000. EX designated | One effect path serves stack and EX timing. |
| P-016R | Two distinct Forwards receive 3000 in one simultaneous batch | Partial legal targets survive, two Commander replacements resume. |
| P-017R | One Forward gains 3000 and Brave until turn end | Effective power composes with Shape Tide. |
| P-018R | Break one dull Forward | Activated target becomes illegal after activation. |
| P-019H | Opponent receives two damage as one ordered batch | Both damage cards appear before ordered EX offers. |
| P-020H | Declare Backup/Forward mode. Break cost-at-most-two Backup or remove Forward. | Friendly and opposing legal targets, mode locked at declaration. |
| P-021L | Entry activates one Forward. Undertow costs same-name discard, Water CP, dull. | Entry and special contracts stay separate, return prompts the Commander owner. |
| P-022C | No abilities, non-Generic Tide Warden | Same-name variant pays Undertow without becoming Commander. |
| P-023C, P-024C | Generic River Recruit, no abilities | Legal same-element party. |
| P-025R | Entry dulls and freezes one Forward | Later activation does not remove Freeze. Next Active Phase does. |
| P-027H | Own field-to-Break trigger. One Forward loses last-known power. | Modified last-known power persists after source departure. |
| P-028H | No abilities, Light Forward | Combined Light/Dark limit follows checkpoint rules. |
| P-030C | Dull action activates one Forward | Newly controlled dull-icon restriction and source independence. |
| P-031R | Entry draw then discard. Entry ability is EX designated. | Draw/discard continuation pauses and resumes during normal and EX execution. |
| P-032R | Water CP and dull. Put one owned Break Zone card at main-deck bottom. | Correct owner, object, and ordered deck insertion. |
| P-033R | Controlled Forward departure optionally draws one | Optional decision at resolution, including Commander replacement departure. |
| P-034R | Own End Phase trigger activates one Forward | No entry trigger, target declared before responses. |
| P-035C | Return one Forward to owner's hand. EX designated. | Owner/controller difference and optional Commander destination. |
| P-036R | Cancel one Summon stack item and move its card to owner's Break Zone | Reject ability targets, self-target, and EX response. |
| P-037R | One Forward gains 2000 and First Strike | Temporary keywords participate in party First Strike rules. |
| P-038R | One Forward's base power becomes 4000 | Both War Cry resolution orders yield 7000. |
| P-039H | Gain one opposing Character until turn end | No entry trigger, control readiness, field conflicts, and layered expiry. |
| P-040R | Draw two, schedule discard at controller's next End Phase | Casting during opponent's turn preserves the delayed trigger across that turn. |

- [ ] Write a passing-path and relevant rejection/response case for the first row under review.

```ts
it('P-015C resolves 4000 damage against the declared object', () => {
  const d = driver({ placements: [
    { seat: 0, card: 'P-015C', zone: 'hand' },
    { seat: 0, card: 'P-009C', zone: 'field' },
    { seat: 1, card: 'P-024C', zone: 'field' },
  ] });
  const source = d.object(0, 'P-015C');
  const cp = d.object(0, 'P-009C');
  const target = d.object(1, 'P-024C');
  expect(d.send({ kind: 'cast', source, targets: [target], mode: null, payment: {
    discard: [], dullBackups: [cp], specialDiscard: null,
    dullSource: false, sacrificeSource: false,
    sourceElements: { [cp]: 'Fire' }, spend: { Fire: 1 },
  } }).ok).toBe(true);
  d.passPair();
  expect(Object.values(d.state.cards).find(card => card.object === target)!.damage).toBe(4000);
});
```

- [ ] Run the selected test by card ID: `npm test -- tests/content/card-behavior.test.ts -t P-015C`.
Expected: the unmigrated script fails to dispatch or produces an incorrect transition.
- [ ] Implement that card's named steps through operations.

```ts
run: ({ frame }) => ({
  batches: [{ simultaneous: true, operations: frame.targets.map(target => ({
    kind: 'forward-damage' as const, source: frame.source, target, amount: 4000,
  })) }],
  choice: null,
  next: null,
})
```

- [ ] For search, draw/discard, and optional effects, add separate checked step payloads and choice continuations.
- [ ] Run the selected card tests through all responses and choices. Then mark that module migrated.
- [ ] Repeat the explicit cycle for each row. Check every listed card number against the forty-module manifest.
- [ ] Require zero `checkRegistryCompleteness` errors and switch public `applyCommand` to `applyScheduledCommand`.
- [ ] Delete the legacy path, handler map, and all card-number and handler switches in rules.
- [ ] Run `npm test -- tests/content/card-behavior.test.ts tests/content/registry.test.ts tests/content/catalog.test.ts` and `npm run check:boundaries`.

Expected: all forty metadata records and card-script operation contracts pass. No legacy card-handler runtime remains.
Combat, EX, and End Phase regressions close through Tasks 13-16 before the full rules-suite gate in Task 17.

## Task 13: Implement Single-Attack Combat Steps and Keyword Rules

**Findings:** F01, F04. **Dependencies:** Tasks 5-12.

**Files:** Modify `src/rules/combat.ts`, `priority.ts`, `scheduler.ts`, `actions.ts`, `types.ts`.
Create `tests/rules/combat-steps.test.ts`. Correct `tests/rules/combat.test.ts`.

**Interfaces:** Preserve `declareAttack`, `declareBlock`, and `resolveCombat` as generic rules entry points.
Add `advanceCombatStep(state: MatchState, context: EngineContext): SchedulerResult`.
Add `blocker: null` as an explicit accepted no-block declaration.

- [ ] Write attack/response/block/response/damage/finish transcripts with asserted priority after each step.
- [ ] Assert Brave stays active, blockers stay active, frozen active cards remain eligible, and removed blockers preserve blocked status.

```ts
expect(d.state.priority).toBe(d.state.active);
expect(d.state.combat!.step).toBe('declare');
expect(d.send({ kind: 'block', blocker: null }, defender).ok).toBe(true);
expect(d.state.combat!.wasBlocked).toBe(false);
```

- [ ] Run combat-step tests. Expected: immediate defender priority and collapsed damage steps fail.
- [ ] Separate each step from stack resolution and restore priority only through the common checkpoint.

```ts
if (state.stack.length > 0) return resolveTopStackItem(state, context);
if (state.combat) return advanceCombatStep(state, context);
```

Define `resolveTopStackItem(state: MatchState, context: EngineContext): SchedulerResult` in `priority.ts`.
It dispatches the top frame through `CardRegistry.resume`, preserving the Task 5 continuation model.

- [ ] Calculate battle participation from current object identity, field location, and controller.
- [ ] Record `wasBlocked` separately from remaining blocker presence. Track one attack per Forward per turn.
- [ ] Run F01/F04 regressions and combat tests. Expected: removal responses resolve before battle damage.

## Task 14: Add Parties, Allocation, and Restricted First Strike Processing

**Findings:** F03-F04, F23. **Dependencies:** Task 13.

**Files:** Modify `combat.ts`, `codec.ts`, `choices.ts`, `actions.ts`, `types.ts`.
Create `tests/rules/parties.test.ts`, `first-strike-checkpoint.test.ts`.

**Interfaces:** Existing attack intent accepts multiple members as one party.
Allocation uses existing `Answer.amounts` with `Choice.kind: 'allocation'` and `{ total, increment: 1000 }`.
Add `checkCombatAllocation(state: MatchState, answer: Answer): RuleError[]`.

- [ ] Write same-element party acceptance, mixed-element rejection, duplicate-member rejection, and incomplete-allocation tests.
- [ ] Add simultaneous damage, two First Strike combatants, and mixed-keyword party cases.

```ts
expect(d.send({ kind: 'attack', members: [riverRecruitA, riverRecruitB] }).ok).toBe(true);
expect(d.state.choice!.seat).toBe(defender);
expect(d.state.choice!.allocation).toEqual({ total: 6000, increment: 1000 });
expect(d.answer([], { [riverRecruitA]: 1000, [riverRecruitB]: 5000 }).ok).toBe(true);
```

- [ ] Run party tests. Expected: `SEQUENTIAL_ATTACK` rejection for a valid party.
- [ ] Check that every member is distinct, eligible, and shares a common element with all other members.
- [ ] Require the defending player's complete allocation before battle processing.

```ts
const values = Object.values(answer.amounts);
const total = values.reduce((sum, amount) => sum + amount, 0);
const legal = total === choice.allocation!.total &&
  values.every(amount => amount >= 1000 && amount % 1000 === 0);
```

- [ ] Snapshot both sides' damage amounts before replacements or departures.
- [ ] Resolve First Strike damage, its restricted checkpoint, then ordinary damage. Hold damage triggers until their permitted stack placement.
- [ ] Prohibit Summons and action/special abilities during the intermediate First Strike step.
- [ ] Run party and First Strike tests to the next attack declaration. Expected: disbanded party and correct once-per-turn tracking.

## Task 15: Run EX Burst Through the Shared Card Steps

**Findings:** F07, F11, F23. **Dependencies:** Tasks 6-14.

**Files:** Modify `src/rules/damage.ts`, `operations/damage.ts`, `scheduler.ts`, `outcomes.ts`.
Create `tests/rules/ex-continuations.test.ts`. Expand `tests/rules/ex-burst.test.ts`.

**Interfaces:** `beginEx(state: MatchState, object: ObjectId, context: EngineContext): SchedulerResult`.
It finds the card's designated EX ability and opens an `ExecutionFrame` with `mode: 'ex'`.

- [ ] Add ordered use/decline tests for all three EX cards after one two-damage batch.
- [ ] Add EX-to-Commander replacement, EX draw/discard, and seven-damage timing with a saved intermediate frame.

```ts
expect(d.state.zones[defender].damage).toHaveLength(2);
expect(d.state.choice!.options[0]!.object).toBe(firstDamageObject);
expect(d.state.priority).toBeNull();
expect(d.send(responseIntent, attacker).ok).toBe(false);
```

- [ ] Run EX continuation tests. Expected: missing shared EX dispatch or incomplete pause/resume behavior.
- [ ] Queue all damage cards in order before EX offers. Process the designated script without stack insertion.

```ts
const frame = {
  ...declaredFrame,
  mode: 'ex' as const,
  resume: { ...declaredFrame.resume, ability: exAbility.id, step: 'resolve' },
};
state.execution.push(frame);
state.priority = null;
```

- [ ] Delay normal defeat and trigger-placement checkpoints until the complete permitted EX sequence finishes.
- [ ] Run EX, damage, and simultaneous tests. Expected: no response window and identical restored resolution.

## Task 16: Finish End Phase, Delayed Triggers, and Cleanup Repetition

**Findings:** F02, F07, F09. **Dependencies:** Tasks 7, 9-15.

**Files:** Modify `src/rules/turns.ts`, `priority.ts`, `scheduler.ts`, `continuous.ts`.
Create `tests/rules/end-phase-completion.test.ts`. Expand `end-phase.test.ts`, `turn-phases.test.ts`.

**Interfaces:** `advanceEndStep(state: MatchState, context: EngineContext): SchedulerResult`.
Track End Phase steps: beginning triggers, restricted resolution, hand limit, damage cleanup, expiry, final checkpoint, next turn.

- [ ] Write a full Mist Caller/Undertow ordered resolution through the next Main Phase.
- [ ] Add Undertow cast during the opponent's turn, two-card cleanup discard, cleanup-trigger repetition, and temporary-control expiry.

```ts
expect(d.answer(triggerOrder).ok).toBe(true);
expect(d.state.choice).toBeNull();
expect(d.state.stack).toHaveLength(2);
// Continue both resolutions and the required discard through explicit driver answers.
expect(d.state.phase).toBe('main1');
expect(d.state.turn).toBe(previousTurn + 1);
```

- [ ] Run End Phase completion tests. Expected: answered-choice deadlock or delayed-trigger loss.
- [ ] Store controller-end delayed triggers without an ordinary current-turn expiry.

```ts
const due = delayedTriggers.filter(trigger =>
  trigger.at === 'controller-end' && trigger.controller === state.active);
```

- [ ] Consume due triggers once and run their script steps. Keep Summon/activation restrictions during End Phase.
- [ ] Clear marked damage and expire temporary effects in the required sequence. Repeat final checkpoints for new work.
- [ ] Run End Phase and turn tests. Expected: no discarded continuation, extra turn draw, or retained expired control effect.

## Task 17: Make Presets Reachable and Close the Interaction Gate

**Findings:** F22-F24. **Dependencies:** Tasks 12-16.

**Files:** Modify `src/scenarios/types.ts`, `fixtures.ts`, `catalog.ts`.
Create `tests/scenarios/transcripts.test.ts`, `tests/scenarios/contested-duels.test.ts`.
Expand `coverage.test.ts`, `full-duel.test.ts`. Update `docs/rules-coverage.md`, `docs/playtesting.md`.

**Interfaces:** Add `ScenarioDefinition.transcript: Intent[]` and executable `assertResult(state: MatchState): void` in test-only scenario expectations.
Runtime preset data remains JSON. Assertions stay in tests.
Extend placements with explicit controller and pending-checkpoint state.

- [ ] Write a transcript for each preset and assert its named interaction, rather than only its loaded cards.

```ts
for (const intent of transcript) {
  const result = d.send(intent);
  expect(result.ok).toBe(true);
}
expect(d.state.commanders[0].casts).toBe(3);
expect(d.state.choice).toBeNull();
```

- [ ] Run preset transcripts. Expected: insufficient resources or missing advertised decisions.
- [ ] Give third cast seven available CP: three active Fire Backups and two Fire CP discards.
- [ ] Give Final Spark two Fire CP discards, and place Archive Keeper/Return Tide atop the defender's deck.
- [ ] Give each Borrowed Banner conflict four legal Water CP and an explicit pending checkpoint for transient states.
- [ ] Keep Rising Undertow payable in Main 2, then complete both End Phase triggers.
- [ ] Give Commander destinations two Water CP, opposing Commander control, and witnesses controlled by the departing Commander's controller.
- [ ] Use exact original deck instances and record every preset's origin manifest and transcript.
- [ ] Add normal-start contested duels where both seats cast, respond, attack, block, and answer decisions.
- [ ] Run `npm test -- tests/rules tests/content tests/scenarios` and `npm run typecheck`.
- [ ] Record milestone 2 coverage for every original coverage row, all printed abilities, and repaired F01-F10/F22/F23.

Expected: deterministic complete interactions without manual rules corrections. A passive-opponent damage transcript remains supplemental evidence only.

## Task 18: Check Complete Saves and Preserve Rejected Data for Export

**Findings:** F19. **Dependencies:** Tasks 4-17.

**Files:** Create `src/storage/save-schema.ts`. Modify `save.ts`, `replay.ts`, `indexed-db.ts`.
Create `tests/storage/save-schema.test.ts`, `recovery.test.ts`. Expand `save.test.ts`.

**Interfaces:** `parseSave(value: unknown, context: EngineContext): { ok: true; save: MatchSave } | { ok: false; reason: string }`.
`loadRawRecord(): Promise<unknown | null>` and `exportRawRecord(): Promise<string | null>`.
Use a new `dissidia-save-v2` envelope with schema `2`, engine `3`, and registry-manifest identity.

- [ ] Write malformed JSON, absent versions, truncated choices, missing cards, fractional counters, unknown resume step, and version disagreement tests.
- [ ] Assert old `dissidia-save-v1` saves remain exportable with a readable rejection reason.

```ts
expect(parseSave({ format: 'dissidia-save-v2' }, context)).toMatchObject({ ok: false });
expect(parseSave(oldEngineSave, context)).toMatchObject({ ok: false });
expect(await exportRawRecord()).toBe(JSON.stringify(oldEngineSave, null, 2));
```

- [ ] Run save-schema tests. Expected: trusted casts or missing raw-export failures.
- [ ] Parse the complete envelope before accessing nested metadata. Check origin, state, transcript, manifests, and frame payloads.

```ts
const parsed = matchSaveSchema.safeParse(value);
if (!parsed.success) return { ok: false, reason: 'This match save is incomplete or corrupt.' };
```

- [ ] Check all envelope/origin/snapshot versions and replay to identical state. Compare conservation against the original manifest.
- [ ] Preserve rejected raw records before any replacement. Do not run migrations under new card behavior.
- [ ] Run save, replay, corruption, and continuation-resume tests. Expected: normal failures rather than uncaught exceptions.

## Task 19: Serialize Host Commands, Writes, Imports, and Receipts

**Findings:** F20. **Dependencies:** Task 18.

**Files:** Modify `src/host/local-host.ts`, `protocol.ts`, `src/storage/indexed-db.ts`.
Create `tests/host/serialization.test.ts`, `receipts.test.ts`.
Modify `src/main.ts` and existing `tests/host/views.test.ts`, `card-tray.test.ts`, and `tests/storage/save.test.ts` for asynchronous callers.

**Interfaces:** `LocalHost.submit(command: Command): Promise<HostReply>`.
`HostReply` contains a public projection, events, accepted/rejected status, and persistence state, rather than `MatchState`.
Define `PersistenceState = 'saved' | 'unsaved' | 'saving'`.
Host start/import/restore/clear methods also return promises through one queue.

```ts
export type HostReply =
  | { ok: true; view: MatchView; events: RuleEvent[]; persistence: PersistenceState }
  | { ok: false; view: MatchView; events: []; error: RuleError; persistence: PersistenceState };
```

- [ ] Inject a persistence adapter with a controllable write promise.
- [ ] Test delayed submit followed by import, new match, clear, failed write, and duplicate command after restore.

```ts
const submitPromise = host.submit(command);
const importPromise = host.importSave(importedJson);
releaseWrite();
await submitPromise;
await importPromise;
expect(await storage.load()).toEqual(importedSave);
```

- [ ] Run serialization tests. Expected: stale overwrite or premature saved acknowledgment.
- [ ] Use a single operation queue and match generation token for commands and storage transitions.

```ts
const scheduled = this.queue.then(operation);
this.queue = scheduled.then(() => undefined, () => undefined);
return scheduled;
```

- [ ] Persist accepted progress before sending a saved acknowledgment. On failure, publish unsaved progress with retry/export support.
- [ ] Record original accepted receipts and reconstruct their original command results during replay.
- [ ] Reject reused command IDs with changed payloads. Return prior identical receipts without new events or costs.
- [ ] Await existing submit/start/import callers in the current client and tests. Task 20 then moves them into the transport.
- [ ] Run queue, receipt, storage-error, and replay tests. Expected: deterministic ordering and no fabricated saved status.

## Task 20: Expose Filtered Transport and Split Client Authority From Inspection

**Findings:** F17, F20. **Dependencies:** Task 19.

**Files:** Create `src/host/transport.ts`, `worker-host.ts`, `worker-client.ts`, `src/client/connection.ts`, `app.ts`.
Modify `host/protocol.ts`, `views.ts`, `src/main.ts`. Expand `tests/host/views.test.ts`.
Create `tests/host/transport.test.ts`, `tests/client/authority.test.ts`.

**Interfaces:** `MatchTransport.request(request: HostRequest): Promise<HostResponse>` and `subscribe(listener: (view: MatchView) => void): () => void`.
`HostRequest` supports start, scenario, submit, restore, import, export, retry-save, abandon, and view.
`ViewRequest = { seat: Seat | null; inspectionSeat: Seat | null; concealOpponent: boolean }`.
`MatchView` adds visible inspection cards, effective field characteristics, complete stack displays, zone counts, and persistence status.
Define `MatchView.inspection: { seat: Seat; cards: TrayCard[] } | null`.
Use `{ type: 'view'; view: ViewRequest }` for the view request and `{ type: 'view'; view: MatchView }` for its response.
Concealed mode denies opposing private inspection; omniscient inspection belongs only to the explicit offline view.

- [ ] Test direct and `MessageChannel` adapters with the same JSON request/response transcript.
- [ ] Assert projections omit RNG, deck order, execution payloads, and concealed hands.
- [ ] Test inspection during an opposing priority window and required choice.

```ts
const response = await transport.request({ type: 'view', view: { seat: 1, inspectionSeat: 0, concealOpponent: false } });
if (response.type !== 'view') throw new Error('Expected a view response.');
expect(response.view.decisionSeat).toBe(1);
expect(response.view.inspection!.seat).toBe(0);
expect(JSON.stringify(response.view)).not.toContain('"rng"');
```

- [ ] Run transport and projection tests. Expected: synchronous host contract and missing inspection data.
- [ ] Keep authoritative access private to host code. Use projected counts and public card records in every client view.
- [ ] Use correlation IDs and ordered replies for worker messages. Do not transfer script functions or callbacks across the boundary.
- [ ] Bootstrap `main.ts` with application creation, theme, scene, and connection only.
- [ ] Run direct/worker parity and inspection tests. Expected: identical public results with no authority transfer.

## Task 21: Apply the Bright Theme to HTML, Phaser, and PWA Metadata

**Findings:** Requested light theme, F15-F16. **Dependencies:** Task 20.

**Files:** Create `src/client/theme.ts`, `tests/client/theme.test.ts`, `tests/e2e/theme.spec.ts`.
Modify `src/styles.css`, `vite.config.ts`, `client/menu.ts`.

**Interfaces:** `lightTheme` supplies exact shared tokens. `toPhaserColor(hex: string): number` converts tokens for scene drawing.

- [ ] Write token and luminance/contrast tests using independently calculated relative luminance.

```ts
expect(lightTheme.canvas).toBe('#F7F5EF');
expect(lightTheme.surface).toBe('#FFFFFF');
expect(contrast(lightTheme.text, lightTheme.surface)).toBeGreaterThanOrEqual(4.5);
expect(contrast('#FFFFFF', lightTheme.accent)).toBeGreaterThanOrEqual(4.5);
```

- [ ] Run theme tests. Expected: no shared bright tokens or incorrect dark values.
- [ ] Define all nine tokens from repair section 9 and use them for Phaser fills, HTML surfaces, and manifest colors.

```ts
export const lightTheme = {
  canvas: '#F7F5EF', surface: '#FFFFFF', surfaceSoft: '#EAF2FA',
  text: '#172B3A', textMuted: '#4C6272', accent: '#235D88',
  metal: '#9B6A25', border: '#B8CAD6', danger: '#A52B32',
} as const;
export const toPhaserColor = (hex: string): number => Number.parseInt(hex.slice(1), 16);
```

- [ ] Add functional dark borders where the soft decorative border does not meet 3:1 contrast.
- [ ] Use labeled symbols and markers for element, eligibility, payment, and error states.
- [ ] Run menu/editor/choice/result screenshot checks at both desktop sizes after their respective tasks.
Expected: bright surfaces, readable text, and consistent install/launch colors without a theme selector.

## Task 22: Build the Identity-Safe Phaser Table and Complete Stack Display

**Findings:** F12, F16-F17. **Dependencies:** Tasks 20-21.

**Files:** Create `src/client/table/playmat.ts`, `card-view.ts`, `layout.ts`, `src/client/log.ts`.
Modify `src/client/app.ts`, `src/styles.css`, `host/views.ts`.
Create `tests/client/layout.test.ts`, `tests/e2e/table.spec.ts`.

**Interfaces:** `TablePresenter.update(view: MatchView): void`, `destroy(): void`.
`layoutTable(width: number, height: number): TableLayout` returns seat/type rows, fan, stack, and reserved control rectangles.
Card presentation keys use stable instance plus current object identity.

- [ ] Write layout tests proving no overlap with bottom-left choices or bottom-right progression.
- [ ] Add browser tests for every ability stack item and one interactive Commander representation.

```ts
expect(await page.getByTestId('commander-interactive-0').count()).toBe(1);
await expect(page.getByLabel('Stack')).toContainText('Flare Order');
await expect(page.getByLabel('Player 1 Backups')).toBeVisible();
await expect(page.getByLabel('Player 2 Forwards')).toBeVisible();
```

- [ ] Run layout and table tests. Expected: merged field rows and absent ability stack items.
- [ ] Render separate Forward and Backup rows for each seat. Keep public card identities consistent across table updates.

```ts
const key = `${visible.instance}:${visible.card.object}`;
const existing = this.cards.get(key);
if (existing) existing.update(visible);
else this.cards.set(key, createCardView(this.scene, visible));
```

Define `createCardView(scene: Phaser.Scene, card: TrayCard): CardView` in `card-view.ts`.
`CardView` exposes `update(card: TrayCard): void`, `setPosition(x: number, y: number): void`, and `destroy(): void`.

- [ ] Retire stale objects immediately. Use a Commander zone summary rather than another selectable physical card.
- [ ] Show stack abilities with source thumbnails and their declared targets. Keep ordering visible.
- [ ] Add full log browsing and correct discard reasons. Expose accessible HTML descriptions for Phaser card controls.
- [ ] Run table tests at both sizes. Expected: reachable controls, no stale Commander face, and no second interactive copy.

## Task 23: Implement One Explicit Draft for Casting and Activation

**Findings:** F10, F14, F17. **Dependencies:** Tasks 8, 20-22.

**Files:** Create `src/client/draft.ts`, `tests/client/draft.test.ts`, `tests/e2e/payment.spec.ts`.
Modify `client/app.ts`, `connection.ts`, `host/protocol.ts`, `client/table/card-view.ts`.

**Interfaces:** `ActionDraft` stores seat, view sequence, source, action ID, ability, mode, targets, and `Payment`.
`DraftController.begin(view, offer): void`, `update(change: Partial<ActionDraft>): void`, `cancel(): void`, `confirm(): Promise<HostReply>`.
Use existing `ActionOffer` and the Task 8 legality service through a host `check-draft` request.

- [ ] Test target revision, payment revision, exact spend, surplus, selected special discard, tax, and cancellation without a command.

```ts
draft.begin(view, offer);
draft.update({ targets: [firstTarget] });
draft.update({ targets: [revisedTarget] });
draft.cancel();
expect(submittedCommands).toEqual([]);
expect(currentView.seq).toBe(view.seq);
```

- [ ] Run draft tests. Expected: absent explicit draft or automatic command submission.
- [ ] Bind hand discards, active Backups, and special-discard selections to separate cost-role markers.
- [ ] Display base cost, tax, required elements, generated/spent CP, and expired surplus before Confirm.

```ts
const totalSpent = Object.values(draft.payment.spend).reduce((sum, amount) => sum + amount, 0);
confirmButton.disabled = draftCheck.errors.length > 0 || totalSpent !== offer.payment!.cost;
```

- [ ] Offer automatic payment as a revisable proposal. Never submit it without confirmation.
- [ ] Use `ActionOffer` rather than card handler names for modes, abilities, targets, and costs.
- [ ] Cancel stale drafts after authority, sequence, match generation, or source-object changes.
- [ ] Run payment browser tests for hand casts, Commander casts, and special abilities. Expected: user-selected resources match actual accepted events.

## Task 24: Support Every Required Choice, Inspection, and Zone Browser

**Findings:** F12-F13, F16-F17. **Dependencies:** Tasks 20, 22-23.

**Files:** Create `src/client/choices.ts`, `inspection.ts`, `tests/client/choices.test.ts`, `tests/e2e/choices.spec.ts`, `inspection.spec.ts`.
Modify `client/app.ts`, `styles.css`, `host/views.ts`.

**Interfaces:** `ChoiceController.set(choice: MatchView['choice']): void`, `select(id: string): void`, `allocate(id: string, amount: number): void`, `answer(): Promise<HostReply>`.
`InspectionPanel.show(card: VisibleCard, metadata: CardDefinition): void`.
Zone browser consumes public ordered zone cards, rather than authoritative snapshots.

- [ ] Write two-discard, target, order, search, reveal, mode, confirm, and allocation component tests.
- [ ] Test keyboard focus, selection revision, explicit Confirm, mandatory-choice Escape, and private inspection overlays.

```ts
await page.getByRole('button', { name: 'Select Ash Recruit P-003C' }).click();
await page.getByRole('button', { name: 'Select Spark Runner P-005R' }).click();
await expect(page.getByText('2 / 2 selected', { exact: true })).toBeVisible();
await page.getByRole('button', { name: 'Confirm discard' }).click();
```

- [ ] Run choice tests. Expected: one-option immediate submits or missing allocation controls.
- [ ] Retain selected IDs until a valid complete answer is submitted.

```ts
const validCount = selected.length >= choice.min && selected.length <= choice.max;
const validOptions = selected.every(id => choice.options.some(option => option.id === id));
confirmButton.disabled = !validCount || !validOptions || !allocationComplete;
```

- [ ] Show card thumbnails for ordering and modes when a source exists. Keep counts and confirmation in the bottom-left area.
- [ ] Show full printed text, ability kind, effective power, damage, control, rarity, provenance, generic icon, and Commander role separately.
- [ ] Add ordered Damage Zone, Break Zone, and removed-card browsers, plus search results and reveals.
- [ ] Bind Escape to local draft cancellation only. Required choices retain authority and state.
- [ ] Run choice/inspection browser tests through reload and next priority. Expected: two-hand inspection without changing authority.

## Task 25: Add Fan Gestures, Target Arrows, Event Animation, and Reduced Motion

**Findings:** F15-F17. **Dependencies:** Tasks 22-24.

**Files:** Create `src/client/table/hand.ts`, `targeting.ts`, `animations.ts`.
Create `tests/client/hand.test.ts`, `tests/e2e/gestures.spec.ts`, `motion.spec.ts`.
Modify `playmat.ts`, `card-view.ts`, `draft.ts`.

**Interfaces:** `HandController.pointerDown/move/up(pointer: Phaser.Input.Pointer): void`.
`TargetingPresenter.update(draft: ActionDraft | null, pointer: { x: number; y: number }, view: MatchView): void`.
`animateEvents(events: readonly RuleEvent[], reducedMotion: boolean): Promise<void>`.

- [ ] Write real-pointer tests for horizontal reorder, upward cast, invalid release, target snapping, and Commander dragging.
- [ ] Test overflow with every card reachable and the hover layer outside the scroll clip.

```ts
await page.emulateMedia({ reducedMotion: 'reduce' });
const before = await page.getByTestId('state-seq').textContent();
await page.keyboard.press('Escape');
await expect(page.getByTestId('state-seq')).toHaveText(before!);
await expect(page.getByLabel('Casting draft')).toHaveCount(0);
```

- [ ] Run gesture tests. Expected: absent reorder, clipped hover, or automatic drag submission.
- [ ] Use one pointer state machine for idle, hand-reorder, and upward-cast intent.

```ts
const dx = pointer.x - origin.x;
const dy = pointer.y - origin.y;
if (dy < -48) gesture = 'cast';
else if (Math.abs(dx) > 12) gesture = 'reorder';
```

- [ ] Snapshot hand presentation order at pointer-down and restore it on canceled drag.
- [ ] Draw cursor arrows, snap to valid hover targets, and retain numbered selected-target arrows until Confirm.
- [ ] Draw party, attack, and block arrows with the same selection markers.
- [ ] Animate accepted events from their actual source zone. Do not wait for animations to run rules or accept a choice.
- [ ] Replace motion with immediate placement and persistent information markers under reduced motion.
- [ ] Run gestures and motion tests at both sizes. Expected: identical rules transcripts for both motion modes.

## Task 26: Build the Card Grid and Preserve Incomplete Deck Drafts

**Findings:** F18. **Dependencies:** Tasks 3, 20-24.

**Files:** Create `src/client/deck-browser.ts`, `tests/e2e/deck-browser.spec.ts`.
Modify `client/deck-editor.ts`, `storage/decks.ts`, `client/menu.ts`, `styles.css`, `tests/content/deck-editor.test.ts`.

**Interfaces:** `DeckDraft = { id: string; commander: string; main: string[]; errors: RuleError[] }`.
`saveDeckDraft(draft: DeckDraft): Promise<void>` keeps incomplete drafts separate from playable saved decks.
`filterCatalog(catalog: Catalog, query: string, elements: Element[], types: CardDefinition['type'][]): CardDefinition[]`.

- [ ] Write searches by name/number, element/type filters, inspection, Legend inclusion, Commander change, and invalid-start rejection.

```ts
const errors = changeEditorCommander(deck, 'P-021L');
expect(deck.commander).toBe('P-021L');
expect(errors.some(error => error.code === 'ELEMENT_MISMATCH')).toBe(true);
expect(editorValidation(deck)).not.toEqual([]);
```

- [ ] Run editor tests. Expected: Commander change blocked or legal Legend cards hidden.
- [ ] Retain the new Commander in an incomplete draft and recalculate errors.
- [ ] Show all supported available cards in the grid, with legal-for-draft information rather than rarity-based hiding.

```ts
const matching = Object.values(catalog).filter(card =>
  `${card.name} ${card.number}`.toLowerCase().includes(query.toLowerCase()) &&
  (types.length === 0 || types.includes(card.type)) &&
  (elements.length === 0 || card.elements.some(element => elements.includes(element))));
```

- [ ] Keep direct add/remove actions and full card inspection. Add distinct labels for set, provenance, rarity, and Commander role.
- [ ] Preserve incomplete drafts after leaving the editor. Save playable decks only after complete format checks.
- [ ] Run editor browser tests and both profile validation tests. Expected: only valid 19-plus-one decks can start the MVP match.

## Task 27: Enforce Safe Updates and Exercise Offline Recovery

**Findings:** F19-F21. **Dependencies:** Tasks 18-26.

**Files:** Modify `src/client/offline.ts`, `menu.ts`, `host/protocol.ts`, `local-host.ts`, `vite.config.ts`.
Create `tests/e2e/offline-duel.spec.ts`, `update-lifecycle.spec.ts`, `recovery-errors.spec.ts`.
Modify `playwright.config.ts` for a second release fixture and controlled service-worker update tests.

**Interfaces:** `host.requestUpdate(): Promise<{ allowed: boolean; reason: string | null }>`.
`host.abandon(): Promise<void>` records deliberate abandonment before clearing active-match authority.
The service-worker callback cannot accept an arbitrary client `safeToUpdate` boolean as authorization.

- [ ] Write an active-match update rejection test, including a match viewed from its menu.
- [ ] Test queued update, offline reload, pinned save resume, explicit abandonment, and activation after outcome.

```ts
expect(await host.requestUpdate()).toEqual({ allowed: false, reason: 'Finish or abandon the current match before updating.' });
await host.abandon();
expect((await host.requestUpdate()).allowed).toBe(true);
```

- [ ] Run update-lifecycle tests. Expected: menu-based unconditional activation fails the gate.
- [ ] Derive update eligibility from host state and pending execution, rather than the current screen.

```ts
const allowed = this.state === null || this.state.result !== null || this.abandoned;
return { allowed, reason: allowed ? null : 'Finish or abandon the current match before updating.' };
```

- [ ] Precache all bundles, original card assets, fonts, and manifests. Check requests for remote dependencies.
- [ ] Install a release, disable network, complete a contested duel, reload during priority and choices, and resume.
- [ ] Show failed restore/import reasons and raw export controls before replacement.
- [ ] Inject storage failures and show unsaved progress, retry, and export without claiming persistence.
- [ ] Run `npm run build` before `npm run test:e2e -- tests/e2e/offline-duel.spec.ts tests/e2e/update-lifecycle.spec.ts tests/e2e/recovery-errors.spec.ts`.

Expected: cached version remains consistent throughout the unfinished match. Update activation succeeds only at a permitted boundary.

## Task 28: Enforce Behavioral Coverage and Record Final Acceptance

**Findings:** F11, F24 and every milestone exit gate. **Dependencies:** Tasks 1-27.

**Files:** Create `tests/acceptance/requirements.ts`, `scripts/check-acceptance.mjs`, `tests/content/extensibility.test.ts`.
Modify `scripts/check-boundaries.mjs`, `check-coverage.mjs`, `package.json`, `vitest.config.ts`.
Update `README.md`, `docs/rules-coverage.md`, `playtest-results.md`, `playtesting.md`, `ui-reference.md`.
Create `docs/acceptance/2026-10-07-mvp-repair.md` and screenshot/transcript artifacts under `docs/acceptance/mvp-repair/`.

**Interfaces:** `RequirementRecord = { id: string; milestone: 1 | 2 | 3; finding: string | null; tests: string[] }`.
Add `npm run check:acceptance`, which consumes fresh structured headless and browser results and the requirement manifest.
Checks fail for missing, skipped, failing, or unexecuted required cases.

- [ ] Add a synthetic card module and registry entry using an existing operation, with no rules/client edits.

```ts
const custom = createRegistry([...opusPhScripts, syntheticCard], 'extensibility-test');
expect(custom.card(syntheticCard.metadata.number)).toBe(syntheticCard);
expect(custom.resume({ script: syntheticCard.metadata.number, version: '1', ability: 'draw', step: 'resolve', payload: null })).toBeDefined();
```

- [ ] Add negative boundary cases for card-specific rule switches, forbidden script imports, and client authoritative-state access.
- [ ] Run extensibility/boundary tests. Expected: existing source checks miss these violations before expansion.
- [ ] Extend the boundary checker using the TypeScript AST. Check rules, card modules, and client imports and behavior access.
- [ ] Replace coverage allowlist parsing with registry structure checks plus requirement-to-executed-test evidence.

```js
for (const requirement of requirements) {
  const cases = requirement.tests.map(name => executedCases.get(name));
  if (cases.length === 0 || cases.some(item => !item || item.status !== 'passed')) {
    failures.push(requirement.id);
  }
}
```

Define the result adapter inside `check-acceptance.mjs` for the pinned Vitest JSON and Playwright JSON report formats.
Record report run IDs and audited source revision to reject stale result files.
Keep synthetic test cards out of the production registry.

- [ ] Run the full commands listed under final checks. Preserve their fresh structured output for acceptance mapping.
- [ ] Capture both viewport sizes for idle, hover, cast, targets, choice, stack, and editor, including reduced motion.
- [ ] Compare those captures with desktop Arena reference frames. Record bright-theme and FFTCG adaptations explicitly.
- [ ] Record one unscripted complete offline duel with seed, deck profiles, versions, outcome, exported transcript, and recovery points.
- [ ] List any unfinished gate as open in the evidence document. Do not substitute smoke tests for the manual reference comparison.
- [ ] Update documentation to describe the final card authoring path, offline install, recovery, and verified MVP behavior.

Expected: every original milestone requirement and F01-F25 maps to current passing evidence or an explicit open gate.
The MVP is complete only after all required gates close.

## Audit Finding Coverage

| Finding | Primary tasks |
|---|---|
| F01 | 1, 5, 13 |
| F02 | 1, 5, 7, 16 |
| F03 | 14, 17, 24 |
| F04 | 1, 13-14, 25 |
| F05 | 1, 10, 17 |
| F06 | 1, 7, 12 |
| F07 | 2, 5-6, 12, 15-16, 18 |
| F08 | 1, 6, 8, 12 |
| F09 | 1, 9, 16 |
| F10 | 1, 8, 12, 23 |
| F11 | 2-3, 12, 20, 23, 28 |
| F12 | 3, 12, 22, 24 |
| F13 | 24 |
| F14 | 23, 25 |
| F15 | 21-22, 25, 28 |
| F16 | 22, 24 |
| F17 | 20, 23-25 |
| F18 | 26 |
| F19 | 1, 3-4, 18, 27 |
| F20 | 19-20 |
| F21 | 27 |
| F22 | 17 |
| F23 | 6, 10-11, 14-15 |
| F24 | 11, 17, 28 |
| F25 | 1, 4 |

## Final Checks and Evidence

Run these commands against the repaired source, after the preceding tasks pass their focused checks.

```powershell
npm run typecheck
npm test
npm run check:boundaries
npm run check:coverage
npm run build
npm run test:e2e
npm run check:acceptance
git diff --check
git status --short
```

The acceptance script reads the fresh structured results produced by the configured reporters during the preceding test commands.
The documentation review additionally checks every original coverage row and every requirement in repair section 14.
Manual Arena comparisons and the unscripted offline playtest remain required evidence alongside automated results.

At the milestone 1 gate, record setup, both format profiles, costs, Commander foundations, checkpoints, loop proof, and replay.
At the milestone 2 gate, record every printed behavior, parties, combat timing, choices, EX, End Phase, and preset transcripts.
At the milestone 3 gate, record real input paths, bright visuals, both seats, all choices, save recovery, offline duels, and update safety.
Record those checks separately for each required viewport and motion mode.

Do not commit, publish, or deploy as part of these commands.
Use `executing-plans` for inline execution after the user requests implementation.

## Plan Self-Review

- [x] All 25 findings map to primary tasks and acceptance scenarios.
- [x] All approved repair sections have named implementation tasks.
- [x] The forty exact card paths and behavioral responsibilities are explicit.
- [x] Shared contracts and dependencies precede their consumers.
- [x] Rules, client, persistence, and card authoring boundaries are explicit.
- [x] No implementation action accompanies this plan.
