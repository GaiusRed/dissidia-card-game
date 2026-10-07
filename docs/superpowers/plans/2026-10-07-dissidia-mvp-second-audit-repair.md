# Dissidia MVP Second-Audit Repair Implementation Plan

> **For agentic workers:** Use the `executing-plans` Superpowers skill to execute this plan task by task, inline. Use `test-driven-development`, `systematic-debugging`, `simple-english`, and `verification-before-completion` where applicable. Track progress with the checkboxes. Do not create worktrees, dispatch subagents, or commit without explicit user instructions.

**Goal:** Close S01–S22 and complete milestones 1–3, including a usable Arena-inspired desktop interface and a monitored Playwright design gate.

**Architecture:** Complete the existing registry and deterministic rules scheduler. Serialize host lifecycle operations and validate saved games against immutable match origins. Render projected views through Phaser cards and accessible HTML controls, with shared geometry and local action drafts.

**Tech Stack:** TypeScript 6.0.3, Phaser 4.2.1, Zod 4.6.5, Vite 8.3.3, Vitest 5.0.3, Playwright 1.63.0, IndexedDB, and vite-plugin-pwa 2.0.0. Retain the pinned dependencies.

**Status:** Implementation in progress. The user approved the design on 2026-10-07; checked items record completed work only, and all milestone gates remain open until their listed acceptance evidence is complete.

## Global Constraints

- Authority: [approved repair design](../specs/2026-10-07-dissidia-mvp-second-audit-repair-design.md), [second audit](../audits/2026-10-07-mvp-second-branch-audit.md), and [original MVP design](../specs/2026-10-06-dissidia-mvp-design.md), in that order for refinements.
- The supplied FFTCG Comprehensive Rules v3.3 and the documented Commander overrides remain authoritative.
- The MVP keeps exactly 40 Opus Placeholder definitions and two supplied 19-plus-one decks.
- The production profile stays 49-plus-one.
- Milestones 4–6, mobile UI, online services, production art, and Light/Dark Commander identity remain deferred.
- The visual target remains desktop Magic Arena, with the approved bright theme and original assets.
- Acceptance sizes are 1280 × 720 and 1920 × 1080 at 100% zoom. Run visual and interaction cases with normal and reduced motion.
- Rules remain deterministic, JSON-serializable, and independent of browser, storage, Phaser, and content imports.
- The client consumes host projections. It does not read authoritative state or implement card-specific legality.
- Preserve the original audit, evidence, and existing user changes. Do not weaken assertions or bless broken screenshots.
- Work in the current checkout. Do not commit, install new dependencies, or deploy as part of this plan.

## Baseline and execution policy

The audited baseline is branch `feature/mvp-game-design-spec`, commit `89828a6`. The previous repair plan remains historical; this plan governs the remaining work.

Observed baseline: 138 unit tests and 11 original browser tests pass. The new UI design suite has 20 failures and 4 passes. Those failures are diagnostic regressions, not expected-failure annotations.

The archived `../audits/2026-10-07-second-audit/rules-probes.test.ts.txt` asserts 17 broken behaviors. Convert each probe to an assertion of correct behavior in the owning task. Do not copy the probes unchanged into the release suite.

Each task follows red → repair → green → diff review. Run focused tests first. Broaden testing at stage gates. During migration, keep the existing production path working until the new path can replace it atomically. Intermediate tasks do not close S09 until Task 10 removes the legacy path.

Test snippets below show the decisive assertions or complete small helpers. Imports come from the paths in each task. Additional cases are listed explicitly. Production snippets define contracts and critical control flow; they do not replace the listed acceptance cases.

## Delivery sequence and file ownership

| Stage | Tasks | Deliverable | Gate |
|---|---|---|---|
| Rules | 1–10 | Live typed registry, resumable execution, correct declarations and combat | Milestone 1 foundation; milestone 2 rules evidence |
| Host and recovery | 11–14 | Validated origins, serialized lifecycle, safe projections and update handling | Reload, import, queue, and update regressions |
| Table and release | 15–24 | Shared layout, gestures, choices, payment, inspection, editor | Monitored four-project UI suite |
| Acceptance | 25–27 | Playable presets, executed coverage, offline duels and release evidence | All three milestone gates |

Execute in numerical order. Tasks 15–16 can be prototyped against labeled projected fixtures after Task 13, but final acceptance must use the production host. The stages stay in one plan because persisted frames, projections, and UI choices share contracts.

| Files to create | Responsibility |
|---|---|
| `src/rules/scheduler.ts`, `src/rules/rule-scripts.ts` | Stable execution loop and registered built-in rule continuations |
| `src/rules/operations.ts`, `src/rules/batches.ts` | Generic operations and frozen simultaneous batches |
| `src/rules/declarations.ts`, `src/rules/loops.ts` | Shared legality and mandatory-loop detection |
| `src/content/context.ts`, `src/content/shared/script-helpers.ts` | Production registry context and pure card operation helpers |
| `src/storage/origin.ts`, `src/storage/semantic-save.ts` | Immutable origin and semantic save validation |
| `src/host/lifecycle.ts` | One serialized lifecycle queue |
| `src/client/match-controller.ts`, `src/client/action-draft.ts`, `src/client/choice-draft.ts` | Projected view subscription and local drafts |
| `src/client/table/{layout,scene,hand-layout,gestures,targets,animation}.ts` | Phaser presentation and shared interaction geometry |
| `src/client/ui/{table-shell,choice-panel,payment-panel,inspector,zone-browser,stack-panel,log-panel}.ts` | HTML controls and accessible card interaction surfaces |
| `src/client/theme.css` | Bright theme tokens and control geometry |
| `tests/support/{assert-stable,script-fixtures}.ts` | Scheduler assertions and synthetic script fixtures |
| `tests/ui-design/{geometry,fixtures}.ts` and focused `*.spec.ts` files | Geometry, production-contract fixtures, and design acceptance |
| `tests/release/update-lifecycle.spec.ts`, `playwright.release.config.ts` | Two-build service-worker acceptance |
| `scripts/serve-update-builds.mjs` | Loopback test server that serves either preserved build |
| `docs/superpowers/audits/2026-10-07-second-audit-repair-verification.md` | Fresh results, visual review, and release evidence index |

Modify existing rule contracts and modules, all 40 existing card modules, host/storage modules, `src/main.ts`, `src/styles.css`, the editor, scenario catalog, boundary/coverage scripts, and their tests. Delete legacy handler files only in Task 10 after callers migrate. New test files are named in their owning tasks below.

## Stage 1: Rules and live content

### Task 1: Define stable execution boundaries and versioned frame state

**Closes:** foundation for S01, S03, S09, S17. **Depends on:** none.

**Files:** Modify `src/rules/contracts/execution.ts`, `src/rules/contracts/card-script.ts`, `src/rules/types.ts`, `src/storage/save.ts`. Create `tests/support/assert-stable.ts`. Extend `tests/rules/contracts.test.ts` and `tests/rules/continuations.test.ts`.

**Interfaces:** Preserve `applyCommand(state: MatchState, command: Command, context: EngineContext): Transition`. Extend execution contracts with the following JSON types. During migration add typed `execution` state alongside legacy `work`; Task 10 removes legacy continuations.

```ts
export type ReturnWindow =
  | { kind: 'priority'; seat: Seat }
  | { kind: 'combat'; step: CombatState['step'] }
  | { kind: 'end'; step: 'triggers' | 'cleanup' | 'next-turn' };
export interface ExecutionState {
  frames: ExecutionFrame[];
  batch: PendingBatch | null;
  returnWindow: ReturnWindow;
  delayed: { id: string; controller: Seat; createdTurn: number; resume: ResumeRef }[];
}
export interface PendingBatch {
  id: string;
  operations: Operation[];
  snapshots: CardObject[];
  observers: CardObject[];
  replacementIndex: number;
  replacements: { operation: number; replacement: Operation }[];
  phase: 'replacements' | 'apply' | 'events';
}
```

Task 3 implements `PendingBatch`. Add `returnWindow: ReturnWindow`, `operationIndex: number`, and `scriptComplete: boolean` to `ExecutionFrame`; replace its `returnPriority` field. Add `execution: ExecutionState` to `MatchState`. Initialize empty frames, null batch, empty delayed work, and the correct setup return window in setup and fixtures. Keep schema and constructors synchronized in every task.

Introduce optional `EngineContext.registry?: CardRegistry` now so Tasks 2–8 can test typed scripts before production migration. Temporarily allow `Choice.resume` to be `Continuation | ResumeRef`, discriminated by `handler` versus `script`; Task 10 removes the legacy alternative. Add `{kind: 'cancel-stack'; item: ObjectId}` to `Operation` for Stillwater. Typed cancellation removes a stack item through generic cleanup and does not require a card-name branch.

- [x] Add the helper and fail a test that passes an actorless live state to it:

```ts
export function assertStable(state: MatchState): void {
  if (state.result) return;
  if (state.choice) {
    expect(state.priority).toBeNull();
    expect([0, 1]).toContain(state.choice.seat);
  } else if (state.priority === null) {
    throw new Error('Live match must have a priority actor or a required choice.');
  }
}
```

- [x] Run `npx vitest run tests/rules/contracts.test.ts tests/rules/continuations.test.ts`; the first run exposed a missing stable-state helper.
- [x] Extend strict schemas and round-trip tests for frames, windows, and operation positions. Reject functions, unknown fields, negative operation positions, and malformed resume payloads. Use `resumeRefSchema` as the base; validate named steps through the registry in Task 10.
- [x] Test JSON round trips during setup, a card choice, combat allocation, and End Phase. Confirm frame targets and source snapshots survive unchanged.
- [x] Run the focused suite and `npm run typecheck`. The focused run passed 37 tests across seven files. Both TypeScript checks passed.

### Task 2: Implement the scheduler and resume every required choice (complete)

**Closes:** S01; contributes S03, S09. **Depends on:** 1.

**Files:** Create `src/rules/scheduler.ts`, `src/rules/rule-scripts.ts`, `src/rules/operations.ts`. Modify `src/rules/engine.ts`, `setup.ts`, `priority.ts`, and `contracts/execution.ts`. Extend `tests/rules/continuations.test.ts` and `tests/rules/engine.test.ts`.

**Interfaces:** `runScheduler(state: MatchState, context: EngineContext): SchedulerResult`; `resumeChoice(state: MatchState, answer: Answer, context: EngineContext): SchedulerResult`. Built-in rule scripts use `ResumeRef.script = 'rules'` and an engine version; card refs use their card number and behavior version. `resolveStep(ref: ResumeRef, context: EngineContext): ResumeStep` routes those two registered namespaces and rejects all others. `applyOperation(state: MatchState, operation: Operation, context: EngineContext): SchedulerResult` is the generic single-operation dispatcher.

- [x] Convert A02 and A04 to correct-behavior tests. Cover ordinary Archive Keeper discard and excess Backup choice. The shared driver now calls `assertStable` after every accepted answer. Existing rules tests cover Commander return, search, EX choices, ordering, setup, and allocation.
- [x] Run `npx vitest run tests/rules/continuations.test.ts tests/rules/engine.test.ts`; the red run reproduced both actorless states.
- [x] Implement a scheduler loop that resumes the top frame and executes its remaining batches. It yields for a required choice, priority window, result, or error. It validates answer shape before consuming choices and restores the frame return window.

```ts
const step = resolveStep(frame.resume, context);
const result = step.run({ state, frame, answer });
frame.remaining.push(...result.batches);
if (result.next) frame.resume = result.next;
frame.scriptComplete = result.next === null && result.choice === null;
// Store the frame and remaining batches before publishing result.choice.
// A null next finishes the script only after its remaining batches complete.
```

- [x] Route setup choices through registered built-in steps and retain the legacy adapter only for card handlers pending Tasks 9–10. It preserves frame return windows, and save validation continues to reject legacy continuations as v2 frames.
- [x] On scheduler error, return the prior state and no accepted events from `applyCommand`. The typed-choice-without-frame regression asserts the original state remains unchanged.
- [x] Run focused rules tests and the full suite. At this task checkpoint, 224 tests across 41 files, TypeScript checks, the production build, and Playwright suites passed; choice completion requires no extra pass or unrelated command.

### Task 3: Freeze simultaneous batches and delay Summon cleanup

**Closes:** S03; contributes S01, S04. **Depends on:** 2.

**Files:** Create `src/rules/batches.ts`. Modify `operations.ts`, `checkpoints.ts`, `commander.ts`, `damage.ts`, `summons.ts`, `zones.ts`, and execution/save schemas. Extend `tests/rules/{commander,continuations,summon-effects}.test.ts`.

**Interfaces:** `prepareBatch(state: MatchState, batch: OperationBatch, context: EngineContext): PendingBatch`; `applyPreparedBatch(state: MatchState, batch: PendingBatch, context: EngineContext): SchedulerResult`.

```ts
// Preserve every original operation. Apply approved replacements by index.
const finalOperations = batch.operations.map((operation, index) =>
  batch.replacements.find(item => item.operation === index)?.replacement ?? operation);
```

Snapshots include all affected objects and trigger observers before mutation. Compute characteristics needed by the operations at preparation time; store those numeric values in the prepared operations. Replacement selections change destinations, not membership.

- [x] Convert A03. Test Commander-first and ordinary-Forward-first lethal departures, both Commander return options, Twin Embers simultaneous damage, simultaneous defeat, and multiple replacement choices.
- [x] Run the focused Commander, continuation, Summon, batch, checkpoint, and scheduler suites. The new Twin Embers assertion first failed because the second Commander was not damaged before the first replacement choice.
- [ ] Route remaining card-script field departures through operation batches. Keep sequential card instructions as separate batches; migrate the handlers under Tasks 8–10.
- [x] Ability sacrifice costs and engine rule-checkpoint departures now enter the generic batch pipeline. Excess-Backup choices and End Phase zero-power cleanup preserve batch movement, LKI, and departure triggers; `tests/rules/end-phase.test.ts` protects both paths. Card-script departures remain open for Tasks 8–10.
- [x] At ordinary checkpoints settle all applicable rule 12.4 processes: defeat, zero power, lethal damage, excess Backups, duplicate names, and Light/Dark limits. Tests cover simultaneous defeat, Banner Smith leaving and changing a Forward's lethal threshold, and the resulting departure trigger.
- [x] Suspend and JSON-round-trip between two replacement decisions, then answer and verify both original Commander instances reach their selected destinations:

```ts
const restored = JSON.parse(JSON.stringify(paused)) as MatchState;
expect(applyCommand(restored, answerCommand, context))
  .toEqual(applyCommand(paused, answerCommand, context));
```

Here `paused`, `answerCommand`, and `context` are the state, exact answer command, and production context constructed in that test; use the same command ID on each independent copy.
- [x] Hold Twin Embers on the stack through its nested Commander choices; verify its physical card enters the Break Zone only after both choices finish.
- [x] Run focused batch, End Phase, scheduler, payment, trigger-declaration, and priority tests; 34 tests passed. TypeScript checks passed. At this task checkpoint the full suite passed 224 tests across 41 files. Card-script batch callers remain open for Tasks 8–10.

### Task 4: Repair priority windows and declare triggers before responses

**Closes:** S02, S04. **Depends on:** 3.

**Files:** Modify `src/rules/{priority,triggers,casting,activation,actions,engine}.ts` and `types.ts`. Extend `tests/rules/{priority,trigger-declaration,triggers}.test.ts`.

**Interfaces:** Keep public `legalActions(state: MatchState, seat: Seat, context: EngineContext): ActionOffer[]`. Trigger collection produces undeclared trigger records with controller and LKI. Built-in steps declare modes, targets, and order before publishing stack items. Card targeting uses `TargetSpec.accepts(DeclarationContext, ObjectId)`.

- [x] Convert A01, A08, and A13. Test retained declaration priority, two passes resolving one stack item, active-player priority after resolution, attack rejection with a nonempty stack, and target visibility before a response.
- [x] Run `npx vitest run tests/rules/priority.test.ts tests/rules/trigger-declaration.test.ts tests/rules/triggers.test.ts`; all three files passed 18 tests.
- [x] Reset passes on cast, activation, attack, block, and trigger declaration. Retain declaring-player priority and restore active-player priority after stack resolution.

```ts
expect(declaration.ok).toBe(true);
if (declaration.ok) {
  expect(declaration.state.priority).toBe(declaringSeat);
  expect(declaration.state.passes).toBe(0);
}
```

- [x] Collect simultaneous triggers, order active player's group then nonactive player's group, and declare each group's modes/targets before priority. Required targets with no legal option remove that trigger. Optional search/draw choices remain resolution choices.
- [x] Test both players with multiple triggers, invalid order answers, no-longer-legal targets, simultaneous source departure, and reload during declaration. Verify stack order and controller labels match the declared choices. The real batch-path test exposed reversed APNAP grouping and passes after the insertion-order fix.
- [x] Remove required-target triggers with no legal targets before an ordering choice. A simultaneous two-Forward zero-power batch now removes both first; its targetless observer triggers do not create a false order/target prompt. `tests/rules/end-phase.test.ts` covers this case.
- [x] Run `npx vitest run tests/rules/priority.test.ts tests/rules/trigger-declaration.test.ts tests/rules/triggers.test.ts tests/rules/batches.test.ts`; 24 tests passed across four files.

### Task 5: Unify declaration legality and enforce atomic exact costs

**Closes:** S06, S08. **Depends on:** 4.

**Files:** Create `src/rules/declarations.ts`. Modify `payment.ts`, `casting.ts`, `activation.ts`, `actions.ts`, `targets.ts`, `codec.ts`. Extend `tests/rules/{payment,actions,casting,targets}.test.ts`.

**Interfaces:** `validateDeclaration(state: MatchState, seat: Seat, intent: Extract<Intent, {kind: 'cast' | 'activate'}>, context: EngineContext): RuleError[]`. `validatePayment` changes its numeric `cost` parameter to `CostSpec`; all callers supply the declared ability/card cost plus Commander tax. Offer enumeration and command validation use the same predicates. Target validation at resolution reuses the same target specification against current objects.

- [x] Convert A06, A07, and A15. Tests cover foreign-controlled Backups, same-name candidate reservation, duplicate sources, wrong source flags, insufficient element CP, Light/Dark exceptions, legal one-CP discard surplus, and unrelated generated surplus.
- [x] Replace the numeric payment API with `CostSpec` for every cast and activation caller. Ability elements and required components now come from the declaration. `tests/rules/payment.test.ts` covers same-name candidate use and confirms that a rejected cost leaves the full match unchanged.
- [x] Cover Light/Dark cost exceptions, extra cast cost flags, one-CP discard surplus, unrelated CP, and Backup-plus-discard payment alternatives. The focused payment, actions, casting, and target suites pass 33 tests; the wider declaration matrix remains open.
- [x] Filter cast and activation CP offers by controller, readiness, element, and Light/Dark discard rules. `tests/rules/actions.test.ts` submits an offered payment through the reducer; the focused payment/action suites pass 24 tests.
- [x] Commit hand discards, Backup dulling, source dulling, and sacrifice as one pending operation batch. Commander replacement remains in that batch, and an invalid declaration leaves the original match unchanged. Engine save version is now 12 for the new persisted operation values.
- [x] Run `npx vitest run tests/rules/payment.test.ts tests/rules/actions.test.ts tests/rules/casting.test.ts tests/rules/targets.test.ts`; the refreshed four-file suite passes 40 tests, including four-CP surplus, duplicate-source, invalid source-element, reducer rollback, and same-name special-discard/CP cases.
- [x] Keep Backup payment offers aligned with validation: control permits an opponent-owned Backup, but ownership still limits hand discards. A cast offered from that Backup passes through the reducer.
- [x] Validate payment source zones and control, D readiness, sacrifice and special-discard requirements, distinct sources, exact spend, legal CP generation, and ability elements before committing costs. Regressions cover invalid source flags and same-name selection.
- [x] Share D-cost readiness between offers and activation validation. A newly stolen Recovery Clerk is unavailable until Haste is applied; the same payment is accepted after Haste.
- [x] Keep same-name special-discard candidates available until one is selected. A second same-name card can still pay CP; `tests/rules/payment.test.ts` submits that offer through the reducer.
- [x] Share D-cost readiness between offers and activation validation. A newly stolen Recovery Clerk is unavailable until Haste is applied; the same payment is accepted after Haste.

```ts
if (payment.dullSource !== cost.dullSource ||
    payment.sacrificeSource !== cost.sacrificeSource ||
    (payment.specialDiscard !== null) !== cost.sameNameDiscard) {
  return [{ code: 'INVALID_COST_COMPONENTS', message: 'Select exactly the required cost components.' }];
}
```

- [x] Implement legal surplus using the supplied rules: a one-CP remainder from a necessary two-CP discard is allowed; removable extra payment sources are rejected. Tests cover four generated CP for a one-CP cost, mixed Backup/discard payment, and source-element assignments.
- [x] Commit costs through operations, including sacrifice movement/status events and Commander replacement. A controlled post-payment trigger-declaration failure rejects with no accepted events and preserves both input and reply state byte-for-byte.
- [x] Add a reducer-level underpaid cast regression asserting the rejected command emits no accepted events and preserves both the returned state and input state byte-for-byte. Full transcript replay after rejected commands remains open.
- [x] Complete every offer in the main, attack, and block fixtures with a legal target/payment and submit it. The matrix accepts pass, cast (including Summons), activation, attack, and block. The payment suite also proves that choosing one special-discard card leaves the other same-name card available for CP.
- [x] Use the effective keyword evaluator for attack offers so a newly controlled Forward with granted Haste is offered consistently with reducer legality; verified in `tests/rules/continuous-effects.test.ts`.
- [x] Suppress Summon offers during First Strike and normal-damage checkpoints, matching the reducer's `WRONG_TIMING` result. `tests/rules/actions.test.ts` checks both stages.
- [x] Run `npx vitest run tests/rules/payment.test.ts tests/rules/actions.test.ts tests/rules/casting.test.ts tests/rules/targets.test.ts`; 42 tests pass. Offers and command validation share controller, readiness, target, and element constraints for the covered actions, and the offer-completion matrix exercises all five offered intent kinds.

### Task 6: Derive control and continuous effects correctly

**Closes:** S07; contributes S08. **Depends on:** 5.

**Files:** Modify `src/rules/continuous.ts`, `turns.ts`, `actions.ts`, and effect schemas. Extend `tests/rules/state.test.ts`, `tests/rules/targets.test.ts`; create `tests/rules/continuous-effects.test.ts`.

**Interfaces:** Preserve `effectivePower` and `hasKeyword` public APIs. Add `recomputeControl(state: MatchState, context: EngineContext): void`. Its input is the complete ordered active-effect set; it updates `controlledSinceTurn` only when the effective controller changes.

- [x] Convert A05. Test a stolen Forward cannot attack or pay a dull-cost ability immediately without Haste. Cover overlapping control effects, expiry that exposes an earlier effect, and return to owner.
- [x] Verify Borrowed Banner blocks immediate attacks and dull-cost abilities without Haste, and offers them when Haste is present. Existing tests cover overlapping layers, expiry, and owner return.
- [x] Run `npx vitest run tests/rules/continuous-effects.test.ts tests/rules/state.test.ts tests/rules/targets.test.ts`; 14 tests passed across three files, and TypeScript checks passed.
- [x] Evaluate active control effects in timestamp/dependency order rather than assigning owner when any effect expires. Apply base-power changes before additive modifiers. Re-evaluate after zone, control, and provider changes.

```ts
if (card.controller !== derivedController) {
  card.controller = derivedController;
  card.controlledSinceTurn = state.turn;
}
```

- [x] Test Shape Tide base power with Banner Smith and temporary boosts in both creation orders. Test provider removal during a checkpoint and target legality after control changes.
- [x] Run the focused tests; inspect that recalculation alone does not reset an unchanged control interval. `continuous-effects.test.ts`, `state.test.ts`, and `targets.test.ts` passed 14 tests.

### Task 7: Complete party combat and First Strike sequencing

**Closes:** S05; supports S11. **Depends on:** 6.

**Files:** Modify `src/rules/{combat,priority,checkpoints,actions}.ts`, `CombatState`, and save schemas. Extend `tests/rules/combat.test.ts`; create `tests/rules/first-strike.test.ts`.

**Interfaces:** Retain attack and block intents. `CombatState.step` remains the explicit stage discriminator. Allocation uses existing `Answer.amounts` with 1,000-point increments. Scheduler windows distinguish restricted First Strike processing from normal response windows.

- [x] Convert A09 and A16. `combat.test.ts` covers all-First-Strike and mixed parties, First Strike and normal blockers, unblocked parties, and attacker/blocker control changes.
- [x] Run `npx vitest run tests/rules/combat.test.ts tests/rules/trigger-declaration.test.ts tests/rules/batches.test.ts`; 22 tests passed. First Strike regressions live in `combat.test.ts` until the full behavior registry migration.
- [x] Implement prepare → declaration → block → First Strike → normal damage → finish. A party deals First Strike damage only when all its members qualify. Preserve `wasBlocked` when the blocker departs. Dull non-Brave attackers once; the full attack tests verify each timing boundary.

```ts
const partyHasFirstStrike = attackers.length > 0 &&
  attackers.every(object => hasKeyword(state, object, 'First Strike', context));
```

Here `attackers` is the combat record's `ObjectId[]`. Use the existing keyword evaluator.
- [x] During First Strike, run required damage/departure checks, collect triggers, and defer ordinary trigger resolution and action windows until normal damage completes. Remove ineligible participants before each damage stage, including control changes.
- [x] Regression: a First Strike blocker defeats an attacker, but the departure trigger stays queued through a JSON save/reload and opens its target choice only after normal combat damage ends. `tests/rules/combat.test.ts` covers the held-trigger boundary; the refreshed combat, priority, and action suites pass 35 tests.
- [x] Remove an attacker or blocker from combat when its controller changes before damage. `tests/rules/combat.test.ts` checks that a stolen attacker deals no player damage and a stolen blocker does not convert blocked combat into unblocked damage.
- [x] Test allocation totals, increments, negative/extra keys, and save/reload at allocation. The First Strike regression also confirms that a killed attacker deals no later normal damage. Trigger-order cases remain under Task 4.
- [x] Protect normal blocking without dulling, same-element party eligibility, Brave's once-per-turn limit, and Freeze skipping the next activation without forbidding an otherwise active attack or block. `combat.test.ts`, `audit-regressions.test.ts`, and `turn-phases.test.ts` cover these boundaries.
- [x] Run the focused tests and a full attack-phase transcript, verifying no extra damage step or pass window. The unblocked attack transcript asserts the prepare, blocker, and single damage windows, then confirms combat clears directly to the active player's attack priority; `tests/rules/combat.test.ts` now passes 17 tests.

### Task 8: Persist delayed effects and detect mandatory loops

**Closes:** S20, S22. **Depends on:** 7.

**Files:** Create `src/rules/loops.ts`. Modify `scheduler.ts`, `turns.ts`, `priority.ts`, and `src/content/cards/opus-ph/P-040R.ts`. Extend `tests/rules/end-phase.test.ts`; create `tests/rules/loops.test.ts`.

**Interfaces:** `mandatoryStateKey(state: MatchState): string` serializes semantic forced-execution state. Delayed effects use `ExecutionState.delayed` from Task 1; remove a record only when its registered continuation is queued at the next matching controller End Phase.

- [x] Prove A14 timing through normal pass windows. Rising Undertow survives the opponent End Phase, then creates exactly one stack item and discard choice at the caster's End Phase after JSON reload and source departure.
- [x] Run `npx vitest run tests/rules/end-phase.test.ts tests/rules/loops.test.ts`; 11 tests passed.
- [x] Replace Rising Undertow's card-specific effect record with the generic delayed queue. The normal-turn regression in `tests/rules/end-phase.test.ts` shows no early stack item, then one typed controller-end trigger after source departure and JSON reload.
- [x] Retain controller-specific delayed work independently of `expiresTurn`. Typed records persist their source LKI, creation turn, eligible turn, and matching phase. The consumer queues registered continuations on the stack and removes them only after enqueue; a regression checks own-turn, opponent-turn, and already-open End Phase timing.
- [x] Test a synthetic forced cycle, an optional exit, and a long terminating forced sequence. Normalize generated frame IDs while preserving semantic state.
- [x] Add stable mandatory-state keys and repeated-state draw detection. Keep the 10,000-step safety limit as an error; the focused loop and End Phase suites pass 9 tests.

```ts
expect(forcedCycle.result).toEqual({ winner: null, reason: 'loop' });
expect(optionalCycle.result).toBeNull();
expect(optionalCycle.choice).not.toBeNull();
expect(budgetFailure.ok).toBe(false);
if (!budgetFailure.ok) expect(budgetFailure.error.code).toBe('ENGINE_BUDGET_EXCEEDED');
```

Build these three states with explicit test-only scripts in `tests/support/script-fixtures.ts`, not production card-number exceptions. The terminating script decrements a saved payload counter; the forced cycle does not; the optional script yields an exit choice.
- [x] Detect repeated states only while mandatory frames or batches run. Keep the processing budget as a rollback error, and test both outcomes.
- [x] Run the focused tests and round-trip the current Rising Undertow effect plus forced-frame state. The generic delayed queue migration remains open.

### Task 9: Migrate all card scripts and repair printed metadata

**Closes:** S10; prepares S09. **Depends on:** 8.

**Files:** Modify every existing `src/content/cards/opus-ph/P-*.ts` module, `src/content/manifest.ts`, `src/content/registry.ts`, and `src/rules/contracts/card-script.ts`. Create `src/content/shared/script-helpers.ts`, `src/content/context.ts`. Extend `tests/content/{catalog,registry}.test.ts`; create `tests/content/card-behaviors.test.ts`.

**Interfaces:** Each card exports `script: CardScript`. `manifest.ts` exports `opusPhRegistry: CardRegistry`. `context.ts` exports `productionContext: EngineContext`. During migration `EngineContext.registry` was optional; the current type requires it, and production context has no legacy handler or runtime-effect maps. Remaining handler fallbacks are still present in compatibility code. Replace `FieldProvider.effects(): unknown[]` with `readonly Extract<Operation, {kind: 'power' | 'keyword' | 'control'}>[]`. These records are derived providers, not operations repeatedly appended to persistent effects.

Change replacement contracts to `ReplacementProposal = {id: string; controller: Seat; operation: Operation; choice: ChoiceRequest | null}` and `ReplacementProvider.propose(state: DeepReadonly<MatchState>, operation: DeepReadonly<Operation>, source: DeepReadonly<CardObject>): ReplacementProposal | null`. Collect proposals against a pending operation, record selected replacements in `PendingBatch`, and prevent a provider from applying twice to that operation. This covers Dawn Guardian damage reduction and shares the generic mechanism with Commander destination replacement.

- [x] Add data assertions for all 40 card definitions against the original roster. Exact roster text, elements, rarity, set/version/provenance, Generic, EX identity, and all 12 Summon target declarations are checked; every ability text must appear in the printed text. Corrected the 15 false “No abilities” entries and other wording/format mismatches, corrected three overly narrow Forward targets, and classified P-013R as an action ability.
- [x] Run `npx vitest run tests/content/catalog.test.ts tests/content/registry.test.ts tests/content/card-behaviors.test.ts`; 37 tests passed across three files, including accepted/declined EX paths, registry providers, entry/departure steps, metadata costs, and the complete 40-card registry.
- [ ] Migrate card groups in this order, running their behavioral tests after each group:
  1. Vanilla cards and printed keywords: P-002C–P-006R, P-009C, P-022C–P-024C, P-026R, P-028H–P-029C.
  2. Targeted Summons: P-015C–P-020H and P-035C–P-040R, including mode, cancel, EX, delayed work, and simultaneous damage.
  3. Actions and specials: P-001L, P-010C, P-013R, P-021L, P-030C, P-032R.
  4. Entry/departure/end triggers and field/replacement providers: P-007H, P-008H, P-011R, P-012H, P-014R, P-025R, P-027H, P-031R, P-033R, P-034R; also the entry ability on P-021L.
- [x] Migrate the vanilla and keyword-only group (12 cards) to module-exported `CardScript` definitions and register the group. `vanillaScript()` rejects cards with abilities, Summon behavior, or EX behavior; `tests/content/registry.test.ts` verifies registry completeness and keyword/Generic metadata.
- [ ] Migrate the action and special group. Typed scripts now exist for all six action/special modules, including Tide Warden. Reducer tests cover Cinder Marshal activation and the existing special/action paths; full effect, invalid-target, and continuation coverage for each remains open.
- [ ] Migrate field and replacement providers. Banner Smith and Dawn Guardian use typed providers, and all entry/departure/end-trigger modules now export typed scripts. Reducer dispatch is wired for representative entry, departure, and End Phase behaviors; full trigger ordering and per-card assertions remain open.
- [ ] Continue the targeted Summon group. All twelve Summons export typed scripts, with reducer-path coverage for Scorch, Return Tide, typed EX Bursts, target revalidation, Commander replacement, and Archive Keeper continuation. Further mode, cancel, delayed, and simultaneous-interaction coverage remains open.
- [x] Route typed player-damage operations into the ordered EX queue after the resolving Summon completes, then defer outcomes until the queued EX decisions finish. Final Spark’s two-decision preset transcript covers the reducer path and exact replay; the rest of the Summon matrix remains open.
- [ ] Emit generic operations with schema-checked named steps. Example draw step:

```ts
resolve: {
  payloadSchema: z.null(),
  run: ({ frame }) => ({
    batches: [{ simultaneous: false, operations: [
      { kind: 'draw', seat: frame.controller, count: 1 },
    ] }],
    choice: null,
    next: null,
  }),
}
```

- [ ] For every non-vanilla ability test its effect, invalid target or boundary, and any continuation. Test all three EX cards' accepted and declined paths: P-015C, P-031R, and P-035C. Compare P-027H against last-known power, P-014R against actual Break destination, and P-033R against any actual field departure.
- [ ] Include behavior versions in the sorted registry manifest and catalog fingerprint. Reject duplicate abilities, unknown step refs, wrong payloads, missing EX implementation, and metadata/script cost mismatch.
- [ ] Run content and rules tests. Review all printed text against the original roster, not the existing possibly incorrect handler metadata.

### Task 10: Switch production to the registry and remove legacy execution

**Closes:** S09 and rules portions of S01–S08. **Depends on:** 9.

**Files:** Modify `src/rules/{types,engine,summons,triggers,priority,continuous,damage,catalog-version}.ts`, `src/host/local-host.ts`, `tests/support/{harness,driver}.ts`, and `scripts/check-boundaries.mjs`. Remove `src/content/handlers.ts`, `src/content/shared/legacy.ts`, and unused legacy handlers/helpers after all imports disappear. Extend `tests/rules/boundaries.test.ts`, `tests/content/registry.test.ts`, and `tests/scenarios/full-duel.test.ts`.

**Interfaces:** Final `EngineContext = { catalog: Catalog; registry: CardRegistry }`. `Choice.resume` and `StackItem.resume` use `ResumeRef`; triggers and work use typed execution records. Delete `Continuation`, `AbilityHandler`, `HandlerContext`, and legacy `handler` dispatch fields after callers and schemas migrate. Keep LKI and targets on stack records.

- [x] Add a synthetic Summon in `tests/support/script-fixtures.ts` using the same module contract and registry builder. Declare and resolve it through `applyCommand`; the reducer executes its draw operation without a rules/client switch.
- [x] Run `npx vitest run tests/content/registry.test.ts tests/rules/boundaries.test.ts tests/scenarios/full-duel.test.ts`; 21 tests passed across three files. The earlier typed-activation reducer regression failed while `StackItem.resume` was absent, then passed after registry dispatch was connected.
- [x] Wire the host, fixtures, full-duel tests, and replay to `productionContext`. The production context now requires a registry and supplies no handler/runtime-effect maps. Rules modules contain no card-number branches; generic rule scripts remain in their separate registry.

```ts
export const productionContext: EngineContext = {
  catalog: opusPhRegistry.catalog,
  registry: opusPhRegistry,
};
```

- [x] Make boundary checks reject card numbers/names and imports of content from rules. Bump engine/schema versions to 14/3 and generic rule-script version to 4; save inspection rejects version mismatches with a clear reason.
- [x] Run `npm test`, `npm run check:boundaries`, and `npm run build`; all pass on the current tree (271 tests, 43 files; clean boundaries; production build succeeds). The suite includes the F25 starting-player-before-opening-hand regression, both deck sizes, Commander tax, conservation, choice, and replay checks; complete card-behavior acceptance remains open.
- [ ] Record Stage 1 results. A passing structural registry test alone does not close S09 or milestone 2.

## Stage 2: Host, persistence, and safe recovery

### Task 11: Validate saves against immutable match origins

**Closes:** S17. **Depends on:** 10.

**Files:** Create `src/storage/origin.ts`, `src/storage/semantic-save.ts`. Modify `src/storage/{save,replay}.ts`, `src/rules/invariants.ts`, and scenario version metadata. Extend `tests/storage/{save,import-errors}.test.ts`; create `tests/storage/semantic-save.test.ts`.

**Interfaces:** Introduce `MatchOrigin` and require it in new saves. Retain a snapshot for replay performance only if it equals reconstruction from this origin.

```ts
export type MatchOrigin =
  | { kind: 'normal'; seed: number; decks: [DeckList, DeckList]; format: FormatProfile }
  | { kind: 'scenario'; id: string; version: string };
export interface InstanceManifestEntry {
  instance: string; card: string; owner: Seat; commander: boolean;
}
export function validateSavedMatch(
  value: unknown, context: EngineContext,
): { ok: true; save: MatchSave } | { ok: false; reason: string };
```

The new save stores origin, immutable instance manifest, versions, state, and transcript. `createSave(state, transcript, origin)` now requires a validated `MatchOrigin`; update all callers, including UI fixtures. Scenario imports require a registered ID/version, not an arbitrary claimed origin state.

- [x] Convert A10 and A11. The import regression matrix deletes a conserved instance and alters owner, Commander role, deck order, origin seed, handler/step/version, typed-frame payload, target ID, choice bounds, and combat references; every rejection preserves the prior IndexedDB record.
- [x] Run `npx vitest run tests/storage/save.test.ts tests/storage/import-errors.test.ts tests/storage/semantic-save.test.ts`; 24 tests passed across the three save suites.
- [x] Validate saved states against the registered format profile and legal Commander deck composition. Tests reject a nonmatching card element and a modified format allow-list before import.
- [x] Add a sorted per-instance card/owner/Commander manifest to saved matches and check it against both snapshots before compatibility succeeds. Regressions now reject deleting a card from both snapshots, replacing it with a different legal card in both snapshots, duplicate manifest entries, and changing the manifest before storage writes. This is a partial identity check; reconstruction from a registered normal/scenario origin remains open.
- [x] Bump the persisted schema pin from 3 to 4 for the required instance-manifest envelope; older saves fail version compatibility without replacing stored data.
- [x] Add a required origin descriptor for normal seed/deck starts and versioned registered scenarios. Rebuild each origin before restore/import, compare canonical JSON so property order is irrelevant, and replay the accepted transcript from the rebuilt origin. Tests accept normal/scenario exports with reordered properties and reject a replay-consistent changed origin.
- [x] Verify owner and Commander-role tampering in both snapshots is rejected before the stored match changes; `tests/storage/import-errors.test.ts` compares IndexedDB before and after each rejected import.
- [x] Bump the persisted schema pin from 4 to 5 for the origin descriptor; older saves fail version compatibility without replacing stored data.
- [x] Check exact card conservation, one-zone membership, owner/Commander identity, and unique object IDs with `assertInvariants`; typed continuations and choice/frame links are schema-checked. Stack, frame, and LKI relationships must also match a replay from the reconstructed origin before import or restore.
- [x] Reject a nonterminal saved state with neither a required choice nor a priority actor, reject completed states that retain either, validate choice bounds and unique option IDs, require choice object references to exist, and require typed choices to match the active frame. The replay-consistent import regressions failed before the invariants and passed after them; the storage/state/continuation/priority focused suite passed 26 tests.
- [x] Validate persisted combat attacker/blocker references and allocation keys before replay or import. A malformed unknown participant is rejected by `tests/storage/import-errors.test.ts`.
- [x] Resolve every persisted typed frame and delayed continuation through the registered step table and validate its payload schema. An unknown continuation is rejected before import; behavior-manifest pins remain open.
- [x] Resolve every saved continuation through `resolveStep`; validate its payload and allowed state/choice relationship. Check outer and inner schema, engine, format, and catalog pins, including the behavior registry fingerprint. Replay the transcript from reconstructed origin and compare the resulting state.

```ts
const checked = validateSavedMatch(candidate, productionContext);
expect(checked.ok).toBe(false);
expect(await loadRecord()).toEqual(previousRecord);
```

- [ ] Test valid recovery at every choice type, pending batch, resolving Summon, delayed effect, and combat stage. Ensure read-only validation never mutates the candidate or current game.
- [x] Run focused origin, host, and storage tests; valid normal and registered-scenario exports import and replay exactly.

### Task 12: Serialize every lifecycle action and reject stale matches

**Closes:** S18. **Depends on:** 11.

**Files:** Create `src/host/lifecycle.ts`. Modify `src/host/local-host.ts`, `src/host/protocol.ts`, and host callers. Create `tests/host/lifecycle.test.ts`; extend `tests/host/update-safety.test.ts`.

**Interfaces:** Use one queue for start, scenario start, submit, restore, import, abandon, clear, export, and update eligibility. `start(seed?: number, decks?: [DeckList, DeckList]): Promise<void>` and `startScenario(id: string): Promise<void>` become asynchronous. Add `CommandRequest = {generation: number; command: Command}` and change the presentation transport to `submit(request: CommandRequest): Promise<Transition>`. The client supplies the generation from the view that created the action, rather than the host attaching its current generation. Rules and replay still consume plain `Command` objects. Match-replacing operations advance generation in queue order.

```ts
export class LifecycleQueue {
  private tail: Promise<void> = Promise.resolve();
  run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation);
    this.tail = result.then(() => undefined, () => undefined);
    return result;
  }
}
```

- [ ] Convert A17. Queue old-match commands across start, scenario, import, and abandon. Use controlled storage promises, not sleeps. Test a command racing a queued replacement even when object IDs and sequence numbers match.
- [x] Include the match generation in each projected view and send it with rendered UI commands. Reject a stale projected request after replacement. Test a real transient save failure followed by a successful retry.
- [x] Run `npx vitest run tests/host/lifecycle.test.ts tests/host/update-safety.test.ts`; 14 tests passed across the two files after adding a controlled delayed-restore race.
- [x] Return `STALE_MATCH` for replaced requests before applying rules. Export waits for accepted commands, delayed restore cannot overwrite a newer start, match replacement clears receipts, and replies are cloned.
- [x] Persist each accepted command and reply with the save. Before import/restore, rebuild every reply from the transcript and compare state and events; malformed, reordered, incomplete, or modified ledgers fail before storage writes. Rejected and stale commands are not recorded.
- [x] Code-review regression: when `start()` supersedes an import during its storage write, persist the current match again before rejecting the import. A controlled write test makes the superseding save fail once and verifies the reconciliation write leaves the current match in storage.
- [x] Keep exact retries after later commands and import; `tests/host/lifecycle.test.ts` verifies the original reply is returned without changing the later state.
- [x] Bump the persisted schema pin from 5 to 6 for accepted receipt ledgers; older saves fail validation without replacing stored data.
- [x] Test accepted-but-unsaved commands under storage failure: state advances once, duplicate request returns the same reply, retry persistence does not replay the command, and both saved and exported transcripts contain the accepted command.
- [x] Test external mutation of returned state/view/reply cannot change host state. The test-only authoritative snapshot accessor returns a clone and is absent from the presentation transport.
- [x] Run `npx vitest run tests/host/lifecycle.test.ts tests/storage tests/scenarios/preset-transcripts.test.ts`; 49 tests passed. The full host/storage public-method queue review remains open.

### Task 13: Expose presentation projections and separate inspection from authority

**Closes:** S15; supports S08, S10, S14. **Depends on:** 12.

**Files:** Modify `src/host/{protocol,views,local-host}.ts`. Create `src/client/match-controller.ts`. Extend `tests/host/{views,card-tray}.test.ts`; create `tests/client/match-controller.test.ts`.

**Interfaces:** Extend `MatchView` with `generation: number`, projected visible card metadata/effective characteristics, complete stack descriptions, and persistence status. `view(seat: Seat | null): MatchView` remains read-only. Add `inspectHand(seat: Seat): Promise<readonly VisibleCard[]>` for this explicitly open-hand local mode; it does not change `decisionSeat`. No deck order is exposed.

`MatchController` exposes `readonly view: MatchView` and owns an optional inspected seat and drafts. `acceptView(view: MatchView): void` clears drafts when generation, sequence, actor, or choice identity changes. `inspectSeat(seat: Seat | null): void` changes only inspection state. Extend `VisibleCard` with `printed: CardDefinition`, `zone: Zone`, `frozen: boolean`, `commander: boolean`, and `commanderTax: number`. Its existing power/keywords fields describe current effective values; `printed` contains base values.

- [x] Add tests that inspect the other hand during a mandatory choice, then answer as the original actor. The host projection suite now verifies that flow plus a stolen Forward's owner/controller, effective power/haste, and its last-known stack source after departure.
- [x] Add a host projection regression that inspects the other seat during a required mulligan, confirms the original `decisionSeat` and private choice stay intact, then answers as that actor; `tests/host/views.test.ts` now includes ten projection tests.
- [x] Add a projected `MatchController` for inspection and draft state. A view authority change clears a pending local choice/action draft and exposes an explanation; inspection alone leaves the decision actor unchanged.
- [x] Project printed card definitions, current zone, Freeze status, effective power/keywords, owner/controller, and Commander tax for hand and Commander-tray cards; field cards also receive host-computed characteristics. The focused host-view suite passes ten tests, including a +1000 effect and a stolen-card projection.
- [x] Code-review regression: a seatless projection hides both hands, private choice options/reason, card-only logs, trays, and legal action offers; deck counts and public match data remain projected.
- [x] Run `npx vitest run tests/host/views.test.ts tests/host/card-tray.test.ts tests/client/match-controller.test.ts`; all 14 tests passed.
- [x] Build projection data in the host using registry metadata and rule-derived characteristics. Presentation reads projected views; the boundary check now rejects `host.getState()` and runtime handler/legacy/card-script imports from `src/main.ts` and `src/client/**`.

```ts
const before = controller.view.decisionSeat;
controller.inspectSeat(before === 0 ? 1 : 0);
expect(controller.view.decisionSeat).toBe(before);
expect(controller.view.choice?.id).toBe(choiceId);
```

- [x] Test sequence/actor changes clear local drafts with a visible explanation. The controller test also proves inspection alone keeps the draft and required actor intact; the inspect control only reorients after its click completes, after card-pointer capture has ended.
- [x] Run focused tests plus `npm run check:boundaries`; the focused projection/controller/boundary suites passed 23 tests and the production boundary check passed.

### Task 14: Preserve incompatible saves and pin updates across restart

**Closes:** recovery/update parts of S17, S21. **Depends on:** 13.

**Files:** Modify `src/client/{menu,offline}.ts`, `src/host/local-host.ts`, `src/storage/indexed-db.ts`, `vite.config.ts`, and `src/main.ts`. Extend `tests/storage/import-errors.test.ts`, `tests/host/update-safety.test.ts`; create `tests/e2e/recovery.spec.ts`.

**Interfaces:** `restore(): Promise<{ restored: boolean; reason: string | null }>` retains its caller-facing shape. Add `exportStoredRecord(): Promise<string | null>` for raw export even with no active match. Do not overwrite an incompatible record on failed restore. Update eligibility comes from the serialized host after restore, not a client boolean.

- [x] Test incompatible restore displays a reason and raw-export control, leaves stored bytes intact, and requires deliberate replacement before a new match overwrites them. `recovery.spec.ts` compares the stored serialized record before and after raw export.
- [x] Run focused storage/host tests, build, then `npx playwright test tests/e2e/recovery.spec.ts`; the targeted recovery test passed.
- [x] Implement startup restore gating and explicit persistence status. Separate accepted in-memory state from saved state. Provide retry-save and export paths after write failure; host lifecycle tests cover retry after a failed write.
- [x] Expose Retry save when the host reports a persistence error. Keep match export available, and test an accepted command remains in the save once after a failed write and retry.
- [ ] Keep the active match's client/rules/content version usable while a new worker waits, including closing every tab and reopening offline. Persist the active-version pin; retain its caches until the match ends or is deliberately abandoned. Avoid unconditional `skipWaiting` or cache deletion during activation.

```ts
const restored = await host.restore();
const eligibility = await host.requestUpdate();
// Render restore errors and use eligibility.allowed for update activation.
// Never infer update safety from whether this page created the match.
```

- [x] Verify focused recovery cases now; the real two-build lifecycle proof remains open under Task 26.

## Stage 3: Table, controls, and monitored UI design

### Task 15: Build the shared layout and bright-theme control system

**Closes:** layout portion of S13, S14. **Depends on:** 13; production acceptance follows 14.

**Files:** Create `src/client/table/layout.ts`, `src/client/ui/table-shell.ts`, `src/client/theme.css`, `tests/client/layout.test.ts`, and `tests/ui-design/geometry.ts`. Modify `src/main.ts`, `src/styles.css`, and `tests/ui-design/layout.spec.ts`.

**Interfaces:** Export the following shared geometry; both Phaser and HTML consume it.

```ts
export interface Rect { x: number; y: number; width: number; height: number }
export interface TableLayout {
  header: Rect; hand: Rect; choices: Rect; progress: Rect; stack: Rect;
  rows: Record<'opponentBackups' | 'opponentForwards' | 'yourForwards' | 'yourBackups', Rect>;
}
export function computeTableLayout(width: number, height: number): TableLayout;
```

- [ ] Keep the existing crowded-field, selected-actions, and choice-control failures. Add pure rectangle tests at both target sizes: reserved regions do not overlap, all rectangles are nonnegative and inside the viewport.
- [ ] Run `npx vitest run tests/client/layout.test.ts`, then the focused UI suite with `npm run test:ui-design -- --grep 'crowded|contextual|selected'`.
- [ ] Reserve roughly 48px header, 200px hand/action area, 208px stack rail, and a phase rail. Derive the four field rows from remaining space. Use compact overflow browsers for crowded rows, not smaller unreadable cards. Give the choice and progress docks disjoint rectangles.
- [ ] Replace conflicting dark/light overrides with shared tokens:

```css
:root {
  --surface: #f6f3ec; --panel: #fffdf8; --ink: #202735;
  --seat-one: #245caa; --seat-two: #9b413c;
  --control-height: 40px; --nav-height: 32px;
  --text-primary: 16px; --text-secondary: 14px;
}
button { min-height: var(--control-height); padding: 8px 16px; }
```

- [ ] Use equal peer heights, wrapping inside bounded containers, short action labels, and full ability details in inspection. Keep controls outside card hit regions. Preserve keyboard focus when updating a panel.
- [ ] Run focused tests. Open captured screenshots and traces at both sizes and motion settings; record ownership, readability, spacing, and remaining failures before the next task.

### Task 16: Render four player rows and unique physical card identities

**Closes:** main battlefield portion of S14. **Depends on:** 15.

**Files:** Create `src/client/table/scene.ts`. Modify `table-shell.ts`, `match-controller.ts`, and `src/main.ts`. Extend `tests/ui-design/layout.spec.ts`; create `tests/ui-design/battlefield.spec.ts`.

**Interfaces:** `TableScene.setView(view: MatchView, layout: TableLayout): void` renders only projected data. Maintain one interactive table object per physical instance. A noninteractive Commander designation badge is distinct from its physical card.

- [ ] Test `Player 1 Forwards`, `Player 1 Backups`, `Player 2 Forwards`, and `Player 2 Backups` regions. Cover own, stolen, Dull, damaged, and empty rows with the active viewpoint at both seats.
- [ ] Run `npm run test:ui-design -- --grep 'battlefield|Commander|crowded'` and inspect failures.
- [ ] Position by controller and type, with persistent labels and seat accents. Show owner separately in inspection. Move the physical Commander among hand, field, damage, Break, removed, and Commander zones; never show a second clickable copy.

```ts
const instances = await page.locator('[data-table-instance]').evaluateAll(nodes =>
  nodes.map(node => (node as HTMLElement).dataset.tableInstance));
expect(new Set(instances).size).toBe(instances.length);
```

- [ ] Pair canvas cards with one accessible interaction surface using shared bounds; prevent an independent DOM duplicate from receiving input. Verify center and edge hit points, rotated Dull bounds, and row overflow access.
- [ ] Run focused tests and inspect screenshots. Do not accept color alone as player identification.

### Task 17: Make every hand card reachable and support reorder/cast gestures

**Closes:** hand and gesture portion of S13. **Depends on:** 16.

**Files:** Create `src/client/table/hand-layout.ts`, `src/client/table/gestures.ts`, `tests/client/hand-layout.test.ts`, and `tests/ui-design/hand.spec.ts`. Modify `scene.ts` and the existing hover diagnostic.

**Interfaces:** `layoutHand(count: number, area: Rect, hoveredIndex: number | null): Rect[]`. `HandGesture = { kind: 'idle' } | { kind: 'pressed'; instance: string; x: number; y: number } | { kind: 'reorder'; instance: string } | { kind: 'cast'; instance: string }`. Reorder changes presentation order only. A cast gesture requests an action draft from Task 19.

- [ ] Add cases for 0, 1, 5, 7, 10, and 19 cards at both sizes. Hover and keyboard-focus each card; require full card visibility and a valid hit target.
- [ ] Run `npx vitest run tests/client/hand-layout.test.ts` and `npm run test:ui-design -- --grep 'hand|hover'`.
- [ ] Render the lifted card in an overlay outside clipped hand containers. Spread neighbors and clamp the entire painted card to the viewport. Provide scrolling or a browse control when the fan cannot expose every card.
- [ ] Distinguish horizontal reorder from upward cast after a measured drag threshold. Handle pointer capture, pointer cancellation, invalid drop, Escape, and view changes. Restore original order and clear capture on canceled casts.

```ts
await page.keyboard.press('Escape');
await expect(page.getByRole('button', { name: 'Confirm cast', exact: true })).toHaveCount(0);
expect(await page.locator('[data-view-seq]').getAttribute('data-view-seq')).toBe(seqBefore);
```

- [ ] Test real pointer movement and release, keyboard alternatives, and no command during reorder. Inspect hovered first/last cards and maximum-hand captures in all four projects.

### Task 18: Implement choice drafts with explicit confirmation

**Closes:** S11. **Depends on:** 16; consumes typed choices from 10 and projections from 13.

**Files:** Create `src/client/choice-draft.ts`, `src/client/ui/choice-panel.ts`, `tests/client/choice-draft.test.ts`, and `tests/ui-design/choices.spec.ts`. Modify `match-controller.ts` and `src/main.ts`.

**Interfaces:**

```ts
export interface ChoiceDraft {
  choiceId: string; selected: string[]; amounts: Record<string, number>;
}
export function validateChoiceDraft(
  choice: MatchView['choice'], draft: ChoiceDraft,
): string[];
export function choiceAnswer(draft: ChoiceDraft): Answer;
```

- [ ] Preserve the two-card discard regression. Cover min/max cards, optional zero selections, ordered triggers, mode, confirmation, EX, Commander destination, and allocation total/increments.
- [x] Run `npx vitest run tests/client/choice-draft.test.ts` and the monitored choice UI matrix; four pure-draft tests and 12 UI cases passed across both desktop sizes and motion settings.
- [ ] Toggle local selections without submitting. Enable Confirm only when valid. Number ordered selections and show allocation remaining. Answer once with the current choice ID. Retain selections on a same-choice rejection; clear them when choice identity changes.

```ts
export function choiceAnswer(draft: ChoiceDraft): Answer {
  return { choice: draft.choiceId, selected: [...draft.selected], amounts: { ...draft.amounts } };
}
```

- [ ] Mandatory choices cannot be dismissed by Escape. Escape may close inspection or cancel an unrelated uncommitted action draft. Keep reason, actor, progress, and Confirm visible without covering required cards.
- [ ] Test one-card selection sends no command, second selection enables Confirm, deselection works, then exactly one accepted answer advances the sequence. Repeat after reload and both motion settings.
- [ ] Inspect screenshots/traces for all choice categories, including long lists and allocations.

### Task 19: Add editable declaration and payment drafts

**Closes:** S12; supports S08, S15. **Depends on:** 17–18.

**Files:** Create `src/client/action-draft.ts`, `src/client/ui/payment-panel.ts`, `tests/client/action-draft.test.ts`, and `tests/ui-design/payment.spec.ts`. Modify `match-controller.ts`, `scene.ts`, and `src/main.ts`.

**Interfaces:**

```ts
export interface ActionDraft {
  generation: number; seq: number; seat: Seat; offerId: string;
  source: ObjectId; ability: string | null; mode: string | null;
  targets: ObjectId[]; payment: Payment;
  stage: 'mode' | 'targets' | 'payment' | 'review';
}
export function declarationIntent(draft: ActionDraft): Extract<Intent, {kind: 'cast' | 'activate'}>;
```

`declarationIntent` emits `cast` when `ability === null`, otherwise `activate`; targets and payments are copied. The host validates the result through Task 5. The client uses projected offers for local guidance, never a parallel rule implementation.

- [x] Require an explicit review/confirm step before a Character, Summon, or activated ability is submitted. A target click now stages the target and leaves the command sequence unchanged; the targeted Summon browser regression verifies the stack is populated only after Confirm.
- [x] Add the typed `ActionDraft` contract and `declarationIntent` copier. Unit tests verify cast/activation intent construction and isolate targets/payment from later local edits; payment editing and UI integration remain open.
- [x] Run the focused payment UI cases after implementing the payment panel. Cast review, Escape cancellation, and activated-ability payment passed all four viewport/motion projects.

- [x] Start equivalent payment drafts from a hand click or drag. Tests verify target/source choices do not submit, suggested CP can be revised, same-name special discard leaves other CP candidates available, invalid/underfunded payment blocks Review, and Escape or Cancel leaves the card in hand. Stale drafts are cleared by the host-driven controller tests.
- [x] Run `npx vitest run tests/client/action-draft.test.ts tests/client/payment-panel.test.ts`; nine pure draft and renderer tests pass. The monitored payment UI cases pass in all four projects.
- [x] Show action cost, Commander tax, CP generated/spent/remainder, and D/sacrifice components. Select actual hand cards and controlled Backups from host-offered choices; an automatic suggestion remains editable until Confirm.
- [x] Keep Review and Confirm as the only submit path. `commandPending` prevents duplicate submits; Cancel and Escape clear local drafts. A four-project browser case now reviews Forge Apprentice's activation cost and target, confirms it, resolves the stack item through both priority passes, and verifies the effective power and Dull state.
- [ ] Add a browser regression for a rejected command retaining its draft when authority is unchanged. Also verify a new projected sequence clears stale drafts with an explanation; existing controller unit tests cover sequence clearing, but browser-level rejection coverage remains open.

```ts
expect(hostSubmit).not.toHaveBeenCalled(); // after target and CP selection
await confirmButton.click();
expect(hostSubmit).toHaveBeenCalledTimes(1);
```

In component tests `hostSubmit` is a Vitest spy supplied as the transport callback and `confirmButton` is the rendered button. Browser tests independently assert sequence changes through the real host.
- [x] Run focused tests; inspect payment markers and action dock captures at both sizes. Four payment captures are saved under `docs/ui-captures`. The activated ability uses a short control label, keeps its full rules text in the selected-card details and tooltip, and passes a no-clipped-text assertion in all four projects.

### Task 20: Add targeting arrows, party selection, and combat controls

**Closes:** targeting portion of S13 and remaining S11. **Depends on:** 19.

**Files:** Create `src/client/table/targets.ts`, `tests/ui-design/targeting.spec.ts`, and `tests/ui-design/combat.spec.ts`. Modify `action-draft.ts`, `choice-panel.ts`, `scene.ts`, and `match-controller.ts`.

**Interfaces:** `TargetPresentation = { source: ObjectId; selected: ObjectId[]; legal: ObjectId[]; cursor: {x: number; y: number} | null }`. Arrows and snap indicators consume this presentation. Attack uses the existing `{kind: 'attack', members}` intent; blocking uses `{kind: 'block', blocker}`.

- [ ] Test legal hover snap, illegal hover, moving cursor endpoint, selected-target numbering, target removal, and second-target selection. Test one/multiple attackers, party revision, block/no-block, and allocation through real controls.
- [ ] Run `npm run test:ui-design -- --grep 'target|party|block|allocation'`.
- [ ] Draw source-to-cursor arrows during selection and stable arrows to selected targets. Display target count and legal highlighting. Keep previous selections visible until revised or confirmed.

```ts
await page.getByRole('button', { name: 'Add to party', exact: true }).click();
await expect(page.getByRole('status', { name: 'Attack selection' })).toContainText('2');
await page.getByRole('button', { name: 'Confirm attack', exact: true }).click();
```

- [ ] Share selection mechanics with card choices, but preserve separate authority and confirmation semantics. Clear drafts on source departure, generation/sequence changes, or loss of actor permission.
- [ ] Run First Strike party and blocker scenarios through actual UI controls. Inspect normal/reduced captures and ensure arrows do not intercept card/control pointer events.

### Task 21: Complete inspection, stack, public zones, and event log

**Closes:** remaining S10, S14, S15. **Depends on:** 20.

**Files:** Create `src/client/ui/{inspector,zone-browser,stack-panel,log-panel}.ts` and `tests/ui-design/inspection.spec.ts`. Modify host projections if presentation fields are missing; add projection tests for every added field.

**Interfaces:** `renderInspector(root: HTMLElement, card: VisibleCard): void` consumes Task 13's complete projected card type. Zone browsers consume projected cards for hand, Break, removed, and damage. Stack entries use stack-item IDs, not only physical card IDs.

- [ ] Test readable full rules text, printed/effective power, keywords, damage, active/Dull/Freeze, owner/controller, source zone, and Commander cost. Test stack abilities whose sources have left the field and a Summon paused in resolution.
- [ ] Run `npm run test:ui-design -- --grep 'inspect|stack|public zone|log'`.
- [ ] Keep inspector inside the viewport with scrolling and keyboard close. Show every stack entry with order, controller, source snapshot, targets, and resolving state. Browsers preserve damage order and never expose deck order.

```ts
await page.getByRole('button', { name: 'Open event log', exact: true }).click();
await expect(page.getByRole('log', { name: 'Match events' })).toContainText(firstEventLabel);
await expect(page.getByRole('log', { name: 'Match events' })).toContainText(latestEventLabel);
```

Use event labels from the deterministic scenario's first and last public events. The browser must retain more than the old last-five-event subset.
- [ ] Test other-hand inspection during a choice, then return and complete that same choice. Verify inspection does not change actor, selected payment, or saved progress.
- [ ] Inspect all seven required design states as they become available: idle, hover, casting, targeting, choice, stack, and editor.

### Task 22: Animate accepted events with equivalent reduced-motion behavior

**Closes:** animation portion of S13. **Depends on:** 21.

**Files:** Create `src/client/table/animation.ts`, `tests/client/animation.test.ts`, and `tests/ui-design/motion.spec.ts`. Modify `scene.ts`, `match-controller.ts`, and theme styles.

**Interfaces:** `presentEvents(events: readonly RuleEvent[], reducedMotion: boolean): Promise<void>` is presentation-only. It must never submit commands or hold rules progression. `setView` remains authoritative for the latest projected state; cancellation fast-forwards presentation to that view.

- [ ] Test draw, cast, target selection, damage, departure, and Commander return. Repeat the exact command transcript with motion on/off; compare exported rules state and transcript.
- [ ] Run `npx vitest run tests/client/animation.test.ts` and `npm run test:ui-design -- --grep 'motion'`.
- [ ] Animate accepted events after the host reply. Use stable markers for damage, target, and selection state. Reduced motion removes travel/rotation transitions and shows the same final markers immediately.

```css
@media (prefers-reduced-motion: reduce) {
  .table-control, .card-overlay, .target-marker {
    animation-duration: 0s;
    transition-duration: 0s;
  }
}
```

- [ ] Set Phaser animation durations from the same preference; CSS alone cannot cover canvas motion. Cancel safely on import, resize, rapid view changes, and destroyed scene. Test pointer capture is released and no stale overlay blocks actions.
- [ ] Run focused tests and inspect animation traces; no rules result may depend on waiting for an animation.

### Task 23: Repair the card-grid editor and persist incomplete drafts

**Closes:** S16. **Depends on:** 21.

**Files:** Modify `src/client/deck-editor.ts`, `src/storage/decks.ts`, `src/client/menu.ts`, and editor styles. Extend `tests/content/deck-editor.test.ts`; create `tests/ui-design/deck-editor.spec.ts`.

**Interfaces:** Add `DeckDraft = { id: string; name: string; deck: DeckList; query: string; filters: Record<string, string> }` and `saveDeckDraft(draft: DeckDraft): Promise<void>`, `loadDeckDraft(id: string): Promise<DeckDraft | null>`. Keep draft storage separate from validated playable decks.

- [ ] Retain the sequential typing diagnostic. Test search/caret/focus, filters, grid inspection, counts, every legal Legendary Commander, validation reasons, Commander replacement, navigation, and reload of an incomplete draft.
- [ ] Run `npx vitest run tests/content/deck-editor.test.ts` and `npm run test:ui-design -- --grep 'editor|search'`.
- [ ] Update the grid and deck list without replacing the active search input. Persist incomplete edits and restore them on navigation/reload. Explain illegal deck reasons while preserving editable cards. Enable match start only for a legal 19-plus-one deck.

```ts
await search.pressSequentially('Tide');
await expect(search).toHaveValue('Tide');
await expect(search).toBeFocused();
await expect(page.getByRole('region', { name: 'Card catalog' })).toBeVisible();
```

- [ ] Test invalid-to-valid repair after changing Commander and full inspection from both catalog and deck list. Verify saved playable decks still validate on load.
- [ ] Inspect editor screenshots at both sizes and record visual review against the Arena deck-building reference.

### Task 24: Turn UI diagnostics into a monitored design acceptance suite

**Closes:** browser evidence portions of S11–S16, S21. **Depends on:** 15–23.

**Files:** Modify `playwright.ui-design.config.ts`, `tests/ui-design/layout.spec.ts`, `package.json`, and `README.md`. Create `tsconfig.tests.json`. Complete `tests/ui-design/{geometry,fixtures}.ts`. Create `docs/superpowers/audits/2026-10-07-second-audit-repair-verification.md`.

**Interfaces:** Geometry helpers use Playwright `Locator`, `Page`, and `TestInfo`, not rules internals. Export `expectUnclipped(locator: Locator): Promise<void>`, `expectHittable(locator: Locator): Promise<void>`, and `captureDesign(page: Page, info: TestInfo, name: string): Promise<void>`. Fixture builders create valid registered scenario saves through the production origin/registry contract; never patch live browser state.

- [ ] Preserve the six original diagnostic intents when replacing DOM selectors for Phaser. Assert painted canvas bounds as well as accessible overlay bounds. Cover viewport/ancestor clipping, rotated cards, reserved-area overlap, edge/center hit testing, controller labels, peer button heights, and overflow access.
- [ ] Use this matrix in every implementation review:

| Group | Required states |
|---|---|
| Table | Empty/crowded rows, stolen cards, Dull cards, both seat orientations |
| Hand | 0/1/5/7/10/19 cards, first/last hover, overflow, keyboard reachability |
| Gestures | Click, horizontal reorder, upward cast, invalid drop, Escape/cancel |
| Declaration | Modes, multiple targets, illegal targets, CP alternatives, special cost, tax, review/confirm |
| Choices | Every kind, two-card discard, ordering, allocation, EX and Commander |
| Stack/combat | Source gone, resolving Summon, party, First Strike, blocked-object departure |
| Recovery | Every choice category after reload, persistence failure, stale draft |
| Editor | Sequential input, grid inspection, incomplete draft recovery, legal start |

- [x] Add `tsconfig.tests.json` extending `tsconfig.json`, with `include: ["tests", "playwright*.config.ts"]` and `compilerOptions.types: ["node", "vite/client"]`. Append `tsc -p tsconfig.tests.json --noEmit` to `typecheck`. Run `npm run test:ui-design` with all four projects and `npm run test:ui-design:report`; the latest design run passed 36 tests, and the HTML report was served for review.
- [ ] Inspect each failed scenario's screenshot and trace during repair. Record finding ID, viewport, motion, expected/actual behavior, artifact path, and disposition. Rerun the focused case after a fix, then the complete suite after related changes settle. Monitoring is part of active implementation, not an unattended schedule.
- [x] Persist crowded-board screenshots from all four viewport/motion projects under `docs/ui-captures/`; inspect normal-motion captures at both target sizes and link them from `docs/ui-reference.md`.
- [ ] Establish snapshots only after geometry passes and the seven-state visual review approves the layout. Pin Playwright/browser/platform; separate platform baselines if fonts differ. Review every changed baseline.

```ts
await expect(page).toHaveScreenshot('idle-table.png', {
  animations: 'disabled',
  fullPage: true,
});
```

- [ ] Attach Arena reference links from the approved spec alongside local idle, hover, cast, target, choice, stack, and editor captures. For each, judge ownership clarity, readability, hierarchy, spacing, feedback, and overflow. Explain intentional FFTCG/bright-theme differences.
- [x] Require zero failed design assertions and zero unexplained browser errors. The four-project suite now fails on page errors or browser console errors as well as layout/interaction assertions; the latest run passed all 36 cases. A screenshot assertion alone cannot certify visual quality. Keep the original red audit evidence unchanged.

## Stage 4: Presets and milestone acceptance

### Task 25: Repair every advertised preset and execute the behavior matrix

**Closes:** S19; rules/content evidence for S21. **Depends on:** 10, 18–24.

**Files:** Modify `src/scenarios/{catalog,fixtures,types}.ts`, `tests/scenarios/{coverage,full-duel}.test.ts`, `tests/e2e/scenarios.spec.ts`, `scripts/check-coverage.mjs`, and `docs/rules-coverage.md`. Create `tests/scenarios/preset-transcripts.test.ts`.

**Interfaces:** Extend `ScenarioDefinition` with a version and explicit acceptance IDs. Store deterministic `Command[]` transcripts and expected checkpoints in tests. Coverage records map requirement/card behavior IDs to executed test IDs and fresh results, not merely source filenames.

- [x] Convert A12. All nine registered presets now reach their targeted result: third Commander cast with seven legally payable CP; Final Spark reaching both EX decisions; affordable Borrowed Banner and Return Tide; excess Backup, duplicate-name, and Light/Dark conflicts; stolen Commander accepted/declined destinations with a departure observer; party allocation and First Strike; End Phase through the next controller End Phase.
- [x] Run `npx vitest run tests/scenarios/preset-transcripts.test.ts tests/scenarios/coverage.test.ts`; 14 tests passed across the transcript and catalog suites after adding conflict and combat transcripts. The focused scenario browser test also passed. Remaining preset interactions and the full behavior matrix remain open.
- [x] Repair the `commander-third-cast` fixture so its three Backups are active and record a production-reducer transcript that pays seven exact Fire CP for the third Commander cast and replays to the same final state. Other advertised preset transcripts remain open.
- [x] Add two Fire discard sources to the Final Spark preset and test its accepted production path through both Archive Keeper and Return Tide EX skip decisions. The scheduler now drains queued typed EX frames after the resolving Summon exits the stack, then checks outcomes after the full EX queue; a seven-damage transcript confirms the result waits for both decisions. The transcript replays to the same state; other preset transcripts remain open.
- [x] Add a validated Affordable Return Tide scenario with a Water CP source and an opposing Forward, then record and replay the exact two-CP cast and return effect. Borrowed Banner and the conflict/observer presets remain open.
- [x] Add Water CP sources and an eligible Forward to the Borrowed Banner conflict preset, then record and replay its exact four-CP cast and temporary control change. The other Backup/Light-Dark conflict outcomes and remaining presets still need transcripts.
- [x] Add an affordable Return Tide source to the Commander Destinations preset and record both owner choices, Return to Commander Zone and normal destination. In both transcripts, the field departure reaches Tide Witness's observer and the replay matches; additional save/reload-at-each-choice evidence remains open.
- [x] Record the End Trigger preset through Rising Undertow's cast in Main 2, the End Phase trigger order, and its discard. This exposed stale source objects in trigger-order choice metadata after the Summon left the stack; order choices now omit a departed source object while retaining the LKI label. The transcript and replay pass; full save/reload checkpoints remain open.
- [x] Add versioned Duplicate Name and Light/Dark conflict presets, record their cleanup decisions, and replay both transcripts. The Commander owner can select its replacement destination during the duplicate-name conflict.
- [x] Extend Borrowed Banner coverage to steal a Backup, answer the resulting over-limit choice, and replay the accepted transcript.
- [x] Record a blocked party's exact damage allocation and a separate First Strike blocker departure through combat completion. Each command is applied after JSON save/reload and the final transcript replays.
- [x] Add monotonically versioned fixture origins, bump versions on the changed tax, EX, conflict, and Commander-destination presets, and round-trip state through JSON before every accepted command in the transcript suite.
- [x] Fix preset fixture resources/placement, version all registered scenario origins, and record accepted commands for each advertised interaction. Replay every transcript using `productionContext`; apply each command after a JSON state round-trip. Additional database-level save/import checks at every checkpoint remain part of Task 11.

```ts
for (const command of transcript) {
  const transition = applyCommand(state, command, productionContext);
  expect(transition.ok).toBe(true);
  if (!transition.ok) throw new Error(transition.error.message);
  state = transition.state;
  assertStable(state);
}
```

- [ ] Execute the original spec coverage matrix, all 40 card behaviors, S01–S22, and the prior audit F01–F25 mappings. Include F25 setup ordering as a protected regression. Require assertion-backed results for each row; fail coverage if a referenced test was skipped or absent from the fresh run.
- [ ] Run `npm test`, `npm run check:coverage`, `npm run check:boundaries`, `npm run build`, and `npm run test:e2e`. Record exact commands/results and remaining gaps.

### Task 26: Prove complete contested offline play and the two-build update lifecycle

**Closes:** release behavior of S21. **Depends on:** 14, 24–25.

**Files:** Create `tests/e2e/complete-duel.spec.ts`, `tests/release/update-lifecycle.spec.ts`, `playwright.release.config.ts`, and `scripts/serve-update-builds.mjs`. Modify `package.json` and the repair verification record.

**Interfaces:** Add `test:release` to build two version-distinct outputs into `test-results/release-build-a` and `test-results/release-build-b`, serve them on one loopback origin, and run the release config. The test server switches the served directory through a loopback-only test endpoint and retains immutable build assets. Browser tests must observe an actual waiting service worker; a mocked `requestUpdate` response is insufficient.

- [ ] Write a normal-setup contested duel through real UI controls: choose seed/decks, mulligan, both seats cast/respond/attack/block, make choices, and reach a legal outcome. Do not import a fixture or mutate state. Record the deterministic transcript and verify replay.
- [ ] Run that duel at both target sizes. Warm the app, switch Playwright offline, reload at a real pending choice, finish the duel, export, and replay. Run visual/interaction variants in both motion modes through the UI suite where applicable.

```ts
await context.setOffline(true);
await page.reload();
await expect(page.getByRole('region', { name: 'Required choice' })).toBeVisible();
await page.getByRole('button', { name: 'Confirm choice', exact: true }).click();
```

This excerpt assumes the duel has reached a valid selected choice; selection after reload must be recreated through UI controls before Confirm becomes enabled.
- [ ] Implement two-build cases: active match, open choice, reload, all tabs closed/reopened, offline reopening, completed outcome, and explicit abandon. A waiting update must not replace pinned client/rules/content during the match. After outcome or abandon, accept the update and verify build B actually controls the page.
- [ ] Assert cached play needs no remote fonts, images, scripts, or APIs. Capture console errors, requests, worker state, version identifiers, trace, save, and transcript.
- [ ] Conduct one unscripted complete offline duel without manual rule corrections. Record revision, seed, decks, pinned versions, recovery points, outcome, transcript, and defects. Do not substitute the scripted duel for this playtest. If no independent human is available, label who performed the exploratory playtest; do not claim independent approval.
- [ ] Run `npm run test:release` and the complete UI design suite. Investigate every unexplained failure before marking milestone 3 complete.

### Task 27: Close findings with fresh evidence and update milestone status

**Closes:** final S01–S22 acceptance. **Depends on:** 26.

**Files:** Update `README.md`, `docs/rules-coverage.md`, `docs/playtesting.md`, `docs/playtest-results.md`, and `docs/superpowers/audits/2026-10-07-second-audit-repair-verification.md`. Add a resolution link to the second audit without rewriting its original findings or evidence.

**Interfaces:** The evidence record has one row per finding: ID, repaired behavior, tests/scenarios, executed result, artifact, and any remaining limitation. Preserve a separate F01–F25 regression status table.

- [ ] Run the final gate on the final working tree:

```text
npm test
npm run check:boundaries
npm run check:coverage
npm run build
npm run test:e2e
npm run test:ui-design
npm run test:release
git diff --check
```

- [ ] Review the diff for disabled tests, weakened assertions, card-specific engine branches, raw-state client access, silent save replacement, and unjustified snapshot updates. Re-run only affected checks if review leads to edits, then refresh the evidence record.
- [ ] Mark milestone 1 complete only with normal setup/concession, legal costs/format, Commander foundation, conservation, stable actors, and replay evidence.
- [ ] Mark milestone 2 complete only when every card behavior and rules coverage row has an executed assertion, including batches, choices, combat, effects, and loops.
- [ ] Mark milestone 3 complete only with normal contested duels, presets, editor, cached offline completion, recovery, real update lifecycle, the four-project design gate, and the unscripted playtest.
- [ ] Replace stale test counts and claims with measured current results. State any remaining limitation plainly. Leave a milestone open if any required gate is missing.
- [ ] Deliver a concise summary with repaired behavior, test results, visual evidence links, and remaining risks. Leave all changes uncommitted unless the user has separately authorized a commit.

## Traceability and review checkpoints

| Finding | Implementation tasks | Required closing evidence |
|---|---|---|
| S01 | 1–3, 10 | Every choice resumes to a valid stable boundary |
| S02 | 4 | Retained priority, one resolution per pass pair, stack attack rejected |
| S03 | 3 | Frozen duplicate/damage batches, replacement reload, deferred cleanup |
| S04 | 4, 9 | APNAP order and declared targets before responses |
| S05 | 7, 20 | Party First Strike, restricted timing, allocations and departures |
| S06 | 5 | Exact cost components, readiness, legal surplus, atomic rollback |
| S07 | 6 | Control interval, layered expiry, base/additive effect ordering |
| S08 | 5, 13, 19 | Offers and submitted declarations agree; resolution rechecks targets |
| S09 | 1–4, 9–10 | Production registry and synthetic extension with no engine switch |
| S10 | 9, 13, 21 | Forty reviewed definitions and effective inspection |
| S11 | 18, 20, 24 | Multi-card choices, party and allocation through actual controls |
| S12 | 19, 24 | Editable payment/targets; one explicit confirm; safe cancel |
| S13 | 15, 17, 20, 22, 24 | Unclipped hands, gestures, arrows, motion parity |
| S14 | 15–16, 21, 24 | Rows, identity, stack, zones, log, nonoverlapping controls |
| S15 | 13, 19, 21 | Projection-only client, independent inspection, stale-draft clearing |
| S16 | 23–24 | Stable typing, grid, all legal Commanders, draft recovery |
| S17 | 11, 14, 26 | Semantic rejection before write, raw export, choice recovery |
| S18 | 12 | Serialized lifecycle, stale generation rejection, ordered export |
| S19 | 25 | All advertised preset transcripts and recovery points |
| S20 | 8 | Forced draw versus optional exit and budget error |
| S21 | 14, 24–27 | Executed matrix, visual review, offline duels, real update lifecycle |
| S22 | 8–9 | One discard at next controller End Phase, surviving reload |

Review checkpoints occur after Tasks 10, 14, 24, and 27. They are verification gates, not requests for permission to continue already authorized execution.

## Plan self-review

- [x] Mapped approved design sections 1–6 to Tasks 1–10, section 7 to Tasks 11–14 and 26, sections 8–11 to Tasks 15–24, and sections 12–14 to Tasks 25–27.
- [x] Mapped all 22 second-audit findings and retained the first audit's F01–F25 regression requirements.
- [x] Defined migration ordering and the final live registry boundary; temporary adapters cannot pass final acceptance.
- [x] Included concrete file ownership, shared interfaces, test commands, red/green steps, and final release gates.
- [x] Included active Playwright monitoring, four viewport/motion projects, screenshots/traces, reviewed baselines, and Arena design judgment.
- [x] Kept implementation, commits, subagents, deployment, and worktree creation outside this planning turn.

## Additional adjustment: mirror resource and Forward rows

**Requested:** 2026-10-07. Match the Arena field hierarchy while preserving FFTCG ownership and control labels.

- [x] Stack each player's two field rows vertically. Put the opponent's Backups at the top and Forwards below them, facing the center. Put the current player's Forwards above their Backups, with Backups toward the hand and bottom edge.
- [x] Keep the existing player labels, accessible row names, card controls, and overflow behavior.
- [x] Extend the crowded-board Playwright case to assert both row orders, the center-facing Forward rows, and clear space from player zones and hand.
- [x] Run the focused layout assertion at 1280 × 720 and 1920 × 1080 with normal and reduced motion. All four cases passed.
- [x] Run the complete four-project design suite after the additional adjustment. The current full suite passes all 48 tests.

## Additional adjustment: Arena-style opposing Forward rows

Use the same clear field hierarchy as Magic Arena: the player's resource row sits below their creature row. In this game, show the player's Backups along the bottom edge and their Forwards above them. Reverse that order for the opponent: their Backups sit at the top edge, with their Forwards below them. This places both Forward rows opposite each other across the center of the field.

- [x] Keep player ownership clear and preserve the existing card interaction and overflow behavior in both rows.
- [x] Verify the opposing Forward-row arrangement at 1280 × 720 and 1920 × 1080 in normal and reduced-motion modes; all four layout cases passed.
