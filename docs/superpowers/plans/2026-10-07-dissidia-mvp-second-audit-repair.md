# Dissidia MVP Second-Audit Repair Implementation Plan

> **For agentic workers:** Use the `executing-plans` Superpowers skill to execute this plan task by task, inline. Use `test-driven-development`, `systematic-debugging`, `simple-english`, and `verification-before-completion` where applicable. Track progress with the checkboxes. Do not create worktrees, dispatch subagents, or commit without explicit user instructions.

**Goal:** Close S01–S22 and complete milestones 1–3, including a usable Arena-inspired desktop interface and a monitored Playwright design gate.

**Architecture:** Complete the existing registry and deterministic rules scheduler. Serialize host lifecycle operations and validate saved games against immutable match origins. Render projected views through Phaser cards and accessible HTML controls, with shared geometry and local action drafts.

**Tech Stack:** TypeScript 6.0.3, Phaser 4.2.1, Zod 4.6.5, Vite 8.3.3, Vitest 5.0.3, Playwright 1.63.0, IndexedDB, and vite-plugin-pwa 2.0.0. Retain the pinned dependencies.

**Status:** Ready for implementation review. The user approved the design on 2026-10-07. This document does not report application repairs as complete.

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

- [ ] Add the helper and fail a test that passes an actorless live state to it:

```ts
export function assertStable(state: MatchState): void {
  if (state.result) return;
  if (state.choice) {
    expect(state.priority).toBeNull();
    expect([0, 1]).toContain(state.choice.seat);
  } else {
    expect([0, 1]).toContain(state.priority);
  }
}
```

- [ ] Run `npx vitest run tests/rules/contracts.test.ts tests/rules/continuations.test.ts`; record the missing contract or failed boundary assertion.
- [ ] Extend strict schemas and round-trip tests for frames, windows, and operation positions. Reject functions, unknown fields, negative operation positions, and malformed resume payloads. Use `resumeRefSchema` as the base; validate named steps through the registry in Task 11.
- [ ] Test JSON round trips during setup, a card choice, combat allocation, and End Phase. Confirm frame targets and source snapshots survive unchanged.
- [ ] Run the focused tests and `npm run typecheck`. Review serialized fields and constructor coverage before continuing.

### Task 2: Implement the scheduler and resume every required choice

**Closes:** S01; contributes S03, S09. **Depends on:** 1.

**Files:** Create `src/rules/scheduler.ts`, `src/rules/rule-scripts.ts`, `src/rules/operations.ts`. Modify `src/rules/engine.ts`, `setup.ts`, `priority.ts`, and `contracts/execution.ts`. Extend `tests/rules/continuations.test.ts` and `tests/rules/engine.test.ts`.

**Interfaces:** `runScheduler(state: MatchState, context: EngineContext): SchedulerResult`; `resumeChoice(state: MatchState, answer: Answer, context: EngineContext): SchedulerResult`. Built-in rule scripts use `ResumeRef.script = 'rules'` and an engine version; card refs use their card number and behavior version. `resolveStep(ref: ResumeRef, context: EngineContext): ResumeStep` routes those two registered namespaces and rejects all others. `applyOperation(state: MatchState, operation: Operation, context: EngineContext): SchedulerResult` is the generic single-operation dispatcher.

- [ ] Convert A02 and A04 to correct-behavior tests. Cover ordinary Archive Keeper discard, excess Backup choice, Commander return, search, EX decline/accept, ordering, setup, and allocation. After each accepted answer call `assertStable`; repeated answers must reject without state changes.
- [ ] Run `npx vitest run tests/rules/continuations.test.ts tests/rules/engine.test.ts` and capture the actorless failures.
- [ ] Implement a scheduler loop that resumes the top frame, executes its remaining batches, and yields only for a required choice, legal window, result, or error. Validate answers before consuming choices. Save the full frame before yielding. Empty frames return through `returnWindow`; they do not merely clear `choice`.

```ts
const step = resolveStep(frame.resume, context);
const result = step.run({ state, frame, answer });
frame.remaining.push(...result.batches);
if (result.next) frame.resume = result.next;
frame.scriptComplete = result.next === null && result.choice === null;
// Store the frame and remaining batches before publishing result.choice.
// A null next finishes the script only after its remaining batches complete.
```

- [ ] Route setup and generic rule choices through registered built-in steps. Keep a temporary adapter for legacy card handlers until Tasks 9–10. The adapter must retain a return window; it must never be accepted as a v2 save continuation.
- [ ] On scheduler error, return the prior state and no accepted events from `applyCommand`. Test `expect(rejected.state).toEqual(before)` and `expect(rejected.events).toEqual([])`.
- [ ] Run the focused tests. Check that choice completion does not require a browser animation, extra pass, or unrelated command.

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

- [ ] Convert A03. Test duplicate departures with Commander first and ordinary variant first; accept and decline return, then compare surviving instances. Add Twin Embers simultaneous damage, simultaneous defeat, and multiple replacement choices.
- [ ] Run `npx vitest run tests/rules/commander.test.ts tests/rules/continuations.test.ts tests/rules/summon-effects.test.ts`; verify the order-dependent case fails.
- [ ] Freeze the batch, collect replacements, apply mutations together, then collect actual-destination events. Route cost sacrifice and rule-action departures through this same pipeline. Keep sequential card instructions as separate batches.
- [ ] At ordinary checkpoints settle all applicable rule 12.4 processes: defeat, zero power, lethal damage, excess Backups, duplicate names, and Light/Dark limits. Test simultaneous defeat, source removal changing power, and field-limit choices that cause further rule processes.
- [ ] Suspend and JSON-round-trip after each replacement, then answer and compare against uninterrupted execution:

```ts
const restored = JSON.parse(JSON.stringify(paused)) as MatchState;
expect(applyCommand(restored, answerCommand, context))
  .toEqual(applyCommand(paused, answerCommand, context));
```

Here `paused`, `answerCommand`, and `context` are the state, exact answer command, and production context constructed in that test; use the same command ID on each independent copy.
- [ ] Hold a resolving Summon until its frame and nested choices finish. Add a test that sees it in `stackCards` during replacement and in the Break Zone only after completion.
- [ ] Run the focused tests and review event ordering, LKI, and conservation.

### Task 4: Repair priority windows and declare triggers before responses

**Closes:** S02, S04. **Depends on:** 3.

**Files:** Modify `src/rules/{priority,triggers,casting,activation,actions,engine}.ts` and `types.ts`. Extend `tests/rules/{priority,trigger-declaration,triggers}.test.ts`.

**Interfaces:** Keep public `legalActions(state: MatchState, seat: Seat, context: EngineContext): ActionOffer[]`. Trigger collection produces undeclared trigger records with controller and LKI. Built-in steps declare modes, targets, and order before publishing stack items. Card targeting uses `TargetSpec.accepts(DeclarationContext, ObjectId)`.

- [ ] Convert A01, A08, and A13. Test retained declaration priority, two passes resolving one stack item, active-player priority after resolution, attack rejection with a nonempty stack, and target visibility before a response.
- [ ] Run `npx vitest run tests/rules/priority.test.ts tests/rules/trigger-declaration.test.ts tests/rules/triggers.test.ts`.
- [ ] Set `passes = 0` on every declaration. Retain the declaring seat's priority. On resolution, checkpoint and open the specified active-player window. A pass pair must not also advance a later window.

```ts
expect(declaration.ok).toBe(true);
if (declaration.ok) {
  expect(declaration.state.priority).toBe(declaringSeat);
  expect(declaration.state.passes).toBe(0);
}
```

- [ ] Collect simultaneous triggers, order active player's group then nonactive player's group, and declare each group's modes/targets before priority. Required targets with no legal option remove that trigger. Optional search/draw choices remain resolution choices.
- [ ] Test both players with two triggers each, invalid order answers, canceled targets, source departure, and reload during declaration. Verify stack order and controller labels match the declared choices.
- [ ] Run the focused tests and inspect command traces for every window transition.

### Task 5: Unify declaration legality and enforce atomic exact costs

**Closes:** S06, S08. **Depends on:** 4.

**Files:** Create `src/rules/declarations.ts`. Modify `payment.ts`, `casting.ts`, `activation.ts`, `actions.ts`, `targets.ts`, `codec.ts`. Extend `tests/rules/{payment,actions,casting,targets}.test.ts`.

**Interfaces:** `validateDeclaration(state: MatchState, seat: Seat, intent: Extract<Intent, {kind: 'cast' | 'activate'}>, context: EngineContext): RuleError[]`. `validatePayment` changes its numeric `cost` parameter to `CostSpec`; all callers supply the declared ability/card cost plus Commander tax. Offer enumeration and command validation use the same predicates. Target validation at resolution reuses the same target specification against current objects.

- [ ] Convert A06, A07, and A15. Add tests for foreign-controlled Backups, same-name candidate reservation, duplicate sources, wrong source flags, insufficient element CP, Light/Dark exceptions, odd-cost legal surplus, and unrelated generated surplus.
- [ ] Run `npx vitest run tests/rules/payment.test.ts tests/rules/actions.test.ts tests/rules/casting.test.ts tests/rules/targets.test.ts`.
- [ ] Validate all components before committing any of them: source identity/zone, controller, D readiness or Haste, required sacrifice, one selected same-name discard, distinct CP sources, exact spend, and permitted generation. Reject extra special discards and extra source flags. Use ability elements for ability costs.

```ts
if (payment.dullSource !== cost.dullSource ||
    payment.sacrificeSource !== cost.sacrificeSource ||
    (payment.specialDiscard !== null) !== cost.sameNameDiscard) {
  return [{ code: 'INVALID_COST_COMPONENTS', message: 'Select exactly the required cost components.' }];
}
```

- [ ] Implement legal surplus using the supplied rules: legal one-CP remainder from a necessary two-CP discard is allowed; removable extra payment sources are rejected. Test four generated CP for a one-CP cost, mixed Backup/discard alternatives, and source-element assignments.
- [ ] Commit costs through operations, including sacrifice events and Commander replacement. On later declaration failure, roll back the entire draft. Test input state and transcript equality after rejection.
- [ ] For every offered action in fixtures, construct a legal target/payment completion and submit it. Test that selected special-discard candidates exclude only the selected card from CP, not all candidates.
- [ ] Run the focused tests and review offers versus command validation for drift.

### Task 6: Derive control and continuous effects correctly

**Closes:** S07; contributes S08. **Depends on:** 5.

**Files:** Modify `src/rules/continuous.ts`, `turns.ts`, `actions.ts`, and effect schemas. Extend `tests/rules/state.test.ts`, `tests/rules/targets.test.ts`; create `tests/rules/continuous-effects.test.ts`.

**Interfaces:** Preserve `effectivePower` and `hasKeyword` public APIs. Add `recomputeControl(state: MatchState, context: EngineContext): void`. Its input is the complete ordered active-effect set; it updates `controlledSinceTurn` only when the effective controller changes.

- [ ] Convert A05. Test a stolen Forward cannot attack or pay D immediately without Haste. Cover overlapping control effects, expiry that exposes an earlier effect, and return to owner.
- [ ] Run `npx vitest run tests/rules/continuous-effects.test.ts tests/rules/state.test.ts tests/rules/targets.test.ts`.
- [ ] Evaluate active control effects in timestamp/dependency order rather than assigning owner when any effect expires. Apply base-power changes before additive modifiers. Re-evaluate after zone, control, and provider changes.

```ts
if (card.controller !== derivedController) {
  card.controller = derivedController;
  card.controlledSinceTurn = state.turn;
}
```

- [ ] Test Shape the Tide plus Banner Smith and temporary boosts in both creation orders. Test removal of a field provider during a checkpoint and target legality after control changes.
- [ ] Run the focused tests; inspect that recalculation alone does not reset an unchanged control interval.

### Task 7: Complete party combat and First Strike sequencing

**Closes:** S05; supports S11. **Depends on:** 6.

**Files:** Modify `src/rules/{combat,priority,checkpoints,actions}.ts`, `CombatState`, and save schemas. Extend `tests/rules/combat.test.ts`; create `tests/rules/first-strike.test.ts`.

**Interfaces:** Retain attack and block intents. `CombatState.step` remains the explicit stage discriminator. Allocation uses existing `Answer.amounts` with 1,000-point increments. Scheduler windows distinguish restricted First Strike processing from normal response windows.

- [ ] Convert A09 and A16. Add all-First-Strike party, mixed party, First Strike blocker, normal blocker, unblocked party, and attacker/blocker control or zone changes.
- [ ] Run `npx vitest run tests/rules/combat.test.ts tests/rules/first-strike.test.ts`.
- [ ] Implement prepare → declaration → block → First Strike → normal damage → finish. A party deals First Strike damage only when all its members qualify. Preserve `wasBlocked` when the blocker departs. Dull non-Brave attackers once.

```ts
const partyHasFirstStrike = attackers.length > 0 &&
  attackers.every(object => hasKeyword(state, object, 'First Strike', context));
```

Here `attackers` is the combat record's `ObjectId[]`. Use the existing keyword evaluator.
- [ ] During First Strike, run required damage/departure checks, collect triggers, and defer ordinary trigger resolution and action windows until normal damage completes. Remove ineligible participants before each damage stage.
- [ ] Test allocation totals, increments, ordering, negative/extra keys, and reload at allocation. Test a killed normal-damage participant deals no later damage.
- [ ] Protect normal blocking without dulling, same-element party eligibility, Brave's once-per-turn limit, and Freeze skipping the next activation without forbidding an otherwise active attack or block.
- [ ] Run the focused tests and a full attack-phase transcript, verifying no extra damage step or pass window.

### Task 8: Persist delayed effects and detect mandatory loops

**Closes:** S20, S22. **Depends on:** 7.

**Files:** Create `src/rules/loops.ts`. Modify `scheduler.ts`, `turns.ts`, `priority.ts`, and `src/content/cards/opus-ph/P-040R.ts`. Extend `tests/rules/end-phase.test.ts`; create `tests/rules/loops.test.ts`.

**Interfaces:** `mandatoryStateKey(state: MatchState): string` serializes semantic forced-execution state. Delayed effects use `ExecutionState.delayed` from Task 1; remove a record only when its registered continuation is queued at the next matching controller End Phase.

- [ ] Convert A14. Cast Rising Undertow during the opponent's turn, pass that End Phase, then reach the caster's End Phase. Assert one discard choice, including after save/reload and source departure.
- [ ] Run `npx vitest run tests/rules/end-phase.test.ts tests/rules/loops.test.ts`.
- [ ] Retain controller-specific delayed work independently of `expiresTurn`. Record creation turn and next eligible phase; do not trigger a newly created delay retroactively in an already processed End Phase.
- [ ] Test a synthetic forced cycle, a cycle with an optional exit, and a long terminating forced sequence. Normalize incidental event/frame IDs in loop keys while preserving object relationships, counters, RNG, pending operations, and choices.

```ts
expect(forcedCycle.result).toEqual({ winner: null, reason: 'loop' });
expect(optionalCycle.result).toBeNull();
expect(optionalCycle.choice).not.toBeNull();
expect(budgetFailure.ok).toBe(false);
if (!budgetFailure.ok) expect(budgetFailure.error.code).toBe('ENGINE_BUDGET_EXCEEDED');
```

Build these three states with explicit test-only scripts in `tests/support/script-fixtures.ts`, not production card-number exceptions. The terminating script decrements a saved payload counter; the forced cycle does not; the optional script yields an exit choice.
- [ ] Use cycle detection only across mandatory execution boundaries. A processing budget is an engine error with rollback, never proof of a draw.
- [ ] Run the focused tests and round-trip delayed effects and forced-frame state.

### Task 9: Migrate all card scripts and repair printed metadata

**Closes:** S10; prepares S09. **Depends on:** 8.

**Files:** Modify every existing `src/content/cards/opus-ph/P-*.ts` module, `src/content/manifest.ts`, `src/content/registry.ts`, and `src/rules/contracts/card-script.ts`. Create `src/content/shared/script-helpers.ts`, `src/content/context.ts`. Extend `tests/content/{catalog,registry}.test.ts`; create `tests/content/card-behaviors.test.ts`.

**Interfaces:** Each card exports `script: CardScript`. `manifest.ts` exports `opusPhRegistry: CardRegistry`. `context.ts` exports `productionContext: EngineContext`. During migration `EngineContext.registry` is optional; Task 10 makes it required and removes `handlers`/`cardEffects`. Replace `FieldProvider.effects(): unknown[]` with `readonly Extract<Operation, {kind: 'power' | 'keyword' | 'control'}>[]`. These records are derived providers, not operations repeatedly appended to persistent effects.

Change replacement contracts to `ReplacementProposal = {id: string; controller: Seat; operation: Operation; choice: ChoiceRequest | null}` and `ReplacementProvider.propose(state: DeepReadonly<MatchState>, operation: DeepReadonly<Operation>, source: DeepReadonly<CardObject>): ReplacementProposal | null`. Collect proposals against a pending operation, record selected replacements in `PendingBatch`, and prevent a provider from applying twice to that operation. This covers Dawn Guardian damage reduction and shares the generic mechanism with Commander destination replacement.

- [ ] Add data assertions for all 40 card definitions against the original roster. Explicitly cover false “No abilities” text on P-001L, P-007H, P-008H, P-010C–P-014R, P-021L, P-025R, P-027H, P-030C, P-032R–P-034R. P-013R is an action ability, not a special ability.
- [ ] Run `npx vitest run tests/content/catalog.test.ts tests/content/registry.test.ts tests/content/card-behaviors.test.ts`.
- [ ] Migrate card groups in this order, running their behavioral tests after each group:
  1. Vanilla cards and printed keywords: P-002C–P-006R, P-009C, P-022C–P-024C, P-026R, P-028H–P-029C.
  2. Targeted Summons: P-015C–P-020H and P-035C–P-040R, including mode, cancel, EX, delayed work, and simultaneous damage.
  3. Actions and specials: P-001L, P-010C, P-013R, P-021L, P-030C, P-032R.
  4. Entry/departure/end triggers and field/replacement providers: P-007H, P-008H, P-011R, P-012H, P-014R, P-025R, P-027H, P-031R, P-033R, P-034R; also the entry ability on P-021L.
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

- [ ] Add a synthetic card in `tests/support/script-fixtures.ts` using the same module contract and registry builder. Declare and resolve it through `applyCommand`; require no changes to rules/client switches.
- [ ] Run `npx vitest run tests/content/registry.test.ts tests/rules/boundaries.test.ts tests/scenarios/full-duel.test.ts`; confirm the production-path assertion fails before switching.
- [ ] Wire the host, fixtures, full-duel tests, and replay to `productionContext`. Remove card-name/number branches from engine modules. Keep generic rule scripts registered separately from content.

```ts
export const productionContext: EngineContext = {
  catalog: opusPhRegistry.catalog,
  registry: opusPhRegistry,
};
```

- [ ] Make boundary checks reject card numbers/names and imports of content from rules. Bump engine and schema versions for the incompatible execution representation. Reject old saves with a clear reason; do not silently interpret their legacy continuations.
- [ ] Run `npm test`, `npm run check:boundaries`, and `npm run build`. Recheck F25 starting-player-before-opening-hand behavior, both deck sizes, Commander tax, conservation, all choice categories, and deterministic replay.
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

- [ ] Convert A10 and A11. Delete the same card from both origin and final state; alter owner, Commander, deck, handler/step/version, frame payload, target ID, choice bounds, or combat references. Require rejection before IndexedDB writes.
- [ ] Run `npx vitest run tests/storage/save.test.ts tests/storage/import-errors.test.ts tests/storage/semantic-save.test.ts`.
- [ ] Reconstruct normal setup from seed/decks/format or a registered scenario. Derive the manifest once from that reconstruction. Check exact card conservation, one-zone membership, owner/Commander identity, object IDs, stack/frame relationships, and stable authority. Allow departed sources only through valid LKI fields.
- [ ] Resolve every saved continuation through `resolveStep`; validate its payload and allowed state/choice relationship. Check outer and inner version pins, including behavior manifest. Replay the transcript from reconstructed origin and compare the resulting state.

```ts
const checked = validateSavedMatch(candidate, productionContext);
expect(checked.ok).toBe(false);
expect(await loadRecord()).toEqual(previousRecord);
```

- [ ] Test valid recovery at every choice type, pending batch, resolving Summon, delayed effect, and combat stage. Ensure read-only validation never mutates the candidate or current game.
- [ ] Run the focused tests and verify exported valid saves still replay exactly.

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
- [ ] Run `npx vitest run tests/host/lifecycle.test.ts tests/host/update-safety.test.ts`.
- [ ] Return `STALE_MATCH` for the old request before applying rules. Make export wait for all prior accepted commands. Make delayed restore unable to overwrite a newer start. Scope exact-retry receipts to generation and clone replies.
- [ ] Persist the accepted command/reply receipt ledger with each save and restore it after semantic validation. Reject reuse of an ID with changed payload; return the exact original reply for a retry even after later accepted commands or reload. Validate ledger entries against replay, including the original events, rather than trusting arbitrary saved replies. Do not persist transient stale-generation or invalid-command rejections as accepted transcript entries.
- [ ] Test accepted-but-unsaved commands under storage failure: state advances once, duplicate request returns the same reply, retry persistence does not replay the command, and export includes the accepted command.
- [ ] Test external mutation of returned state/view/reply cannot change host state. Keep any test-only snapshot accessor clone-safe; remove it from the presentation transport.
- [ ] Run focused host/storage tests and review all public methods for queue bypasses.

### Task 13: Expose presentation projections and separate inspection from authority

**Closes:** S15; supports S08, S10, S14. **Depends on:** 12.

**Files:** Modify `src/host/{protocol,views,local-host}.ts`. Create `src/client/match-controller.ts`. Extend `tests/host/{views,card-tray}.test.ts`; create `tests/client/match-controller.test.ts`.

**Interfaces:** Extend `MatchView` with `generation: number`, projected visible card metadata/effective characteristics, complete stack descriptions, and persistence status. `view(seat: Seat | null): MatchView` remains read-only. Add `inspectHand(seat: Seat): Promise<readonly VisibleCard[]>` for this explicitly open-hand local mode; it does not change `decisionSeat`. No deck order is exposed.

`MatchController` exposes `readonly view: MatchView` and owns an optional inspected seat and drafts. `acceptView(view: MatchView): void` clears drafts when generation, sequence, actor, or choice identity changes. `inspectSeat(seat: Seat | null): void` changes only inspection state. Extend `VisibleCard` with `printed: CardDefinition`, `zone: Zone`, `frozen: boolean`, `commander: boolean`, and `commanderTax: number`. Its existing power/keywords fields describe current effective values; `printed` contains base values.

- [ ] Add tests that inspect the other hand during a mandatory choice, then answer as the original actor. Check projected controller/owner, effective power/keywords, and source-gone stack entries.
- [ ] Run `npx vitest run tests/host/views.test.ts tests/host/card-tray.test.ts tests/client/match-controller.test.ts`.
- [ ] Build projection data in the host using registry metadata and rule-derived characteristics. Remove `host.getState()` and content-handler imports from client rendering. Extend boundary checks to enforce that boundary.

```ts
const before = controller.view.decisionSeat;
controller.inspectSeat(before === 0 ? 1 : 0);
expect(controller.view.decisionSeat).toBe(before);
expect(controller.view.choice?.id).toBe(choiceId);
```

- [ ] Test sequence/actor changes clear local drafts with a visible explanation. Defer table reorientation until pointer capture ends; do not alter command authority while waiting.
- [ ] Run focused tests plus `npm run check:boundaries`.

### Task 14: Preserve incompatible saves and pin updates across restart

**Closes:** recovery/update parts of S17, S21. **Depends on:** 13.

**Files:** Modify `src/client/{menu,offline}.ts`, `src/host/local-host.ts`, `src/storage/indexed-db.ts`, `vite.config.ts`, and `src/main.ts`. Extend `tests/storage/import-errors.test.ts`, `tests/host/update-safety.test.ts`; create `tests/e2e/recovery.spec.ts`.

**Interfaces:** `restore(): Promise<{ restored: boolean; reason: string | null }>` retains its caller-facing shape. Add `exportStoredRecord(): Promise<string | null>` for raw export even with no active match. Do not overwrite an incompatible record on failed restore. Update eligibility comes from the serialized host after restore, not a client boolean.

- [ ] Test incompatible restore displays a reason and raw-export control, leaves stored bytes intact, and requires deliberate replacement before a new match overwrites them.
- [ ] Run focused storage/host tests, build, then `npx playwright test tests/e2e/recovery.spec.ts`.
- [ ] Implement awaited startup restore and explicit persistence status. Separate accepted in-memory state from saved state. Provide retry-save and export paths after write failure.
- [ ] Keep the active match's client/rules/content version usable while a new worker waits, including closing every tab and reopening offline. Persist the active-version pin; retain its caches until the match ends or is deliberately abandoned. Avoid unconditional `skipWaiting` or cache deletion during activation.

```ts
const restored = await host.restore();
const eligibility = await host.requestUpdate();
// Render restore errors and use eligibility.allowed for update activation.
// Never infer update safety from whether this page created the match.
```

- [ ] Verify focused recovery cases now; reserve the real two-build lifecycle proof for Task 26. Record this remaining release gate explicitly.

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
- [ ] Run `npx vitest run tests/client/choice-draft.test.ts` and `npm run test:ui-design -- --grep 'choice|discard|allocation'`.
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

- [ ] Test click and drag start equivalent drafts. Selecting the final target or a CP source must not submit. Test cost/tax, D, sacrifice, same-name discard, element choices, insufficient payment, revision, cancellation, and stale views.
- [ ] Run `npx vitest run tests/client/action-draft.test.ts` and `npm run test:ui-design -- --grep 'payment|cast draft'`.
- [ ] Show card/ability cost plus Commander tax, CP generated/spent/remainder, and required cost components. Select actual hand cards and controlled Backups. A suggestion may populate an editable draft but cannot commit it.
- [ ] Add Review and Confirm. Prevent double-submit while awaiting the host. Cancel/Escape clears only the local draft; rejection shows the reason and leaves a revisable draft if authority is unchanged.

```ts
expect(hostSubmit).not.toHaveBeenCalled(); // after target and CP selection
await confirmButton.click();
expect(hostSubmit).toHaveBeenCalledTimes(1);
```

In component tests `hostSubmit` is a Vitest spy supplied as the transport callback and `confirmButton` is the rendered button. Browser tests independently assert sequence changes through the real host.
- [ ] Run focused tests; inspect payment markers and action dock captures at both sizes. Confirm no control overflows with a long ability name.

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

- [ ] Add `tsconfig.tests.json` extending `tsconfig.json`, with `include: ["tests", "playwright*.config.ts"]` and `compilerOptions.types: ["node", "vite/client"]`. Append `tsc -p tsconfig.tests.json --noEmit` to `typecheck`. Run `npm run test:ui-design` with all four projects and `npm run test:ui-design:report`.
- [ ] Inspect each failed scenario's screenshot and trace during repair. Record finding ID, viewport, motion, expected/actual behavior, artifact path, and disposition. Rerun the focused case after a fix, then the complete suite after related changes settle. Monitoring is part of active implementation, not an unattended schedule.
- [ ] Establish snapshots only after geometry passes and the seven-state visual review approves the layout. Pin Playwright/browser/platform; separate platform baselines if fonts differ. Review every changed baseline.

```ts
await expect(page).toHaveScreenshot('idle-table.png', {
  animations: 'disabled',
  fullPage: true,
});
```

- [ ] Attach Arena reference links from the approved spec alongside local idle, hover, cast, target, choice, stack, and editor captures. For each, judge ownership clarity, readability, hierarchy, spacing, feedback, and overflow. Explain intentional FFTCG/bright-theme differences.
- [ ] Require zero failed design assertions and zero unexplained browser errors. A screenshot assertion alone cannot certify visual quality. Keep the original red audit evidence unchanged.

## Stage 4: Presets and milestone acceptance

### Task 25: Repair every advertised preset and execute the behavior matrix

**Closes:** S19; rules/content evidence for S21. **Depends on:** 10, 18–24.

**Files:** Modify `src/scenarios/{catalog,fixtures,types}.ts`, `tests/scenarios/{coverage,full-duel}.test.ts`, `tests/e2e/scenarios.spec.ts`, `scripts/check-coverage.mjs`, and `docs/rules-coverage.md`. Create `tests/scenarios/preset-transcripts.test.ts`.

**Interfaces:** Extend `ScenarioDefinition` with a version and explicit acceptance IDs. Store deterministic `Command[]` transcripts and expected checkpoints in tests. Coverage records map requirement/card behavior IDs to executed test IDs and fresh results, not merely source filenames.

- [ ] Convert A12. Run each preset to its advertised result: third Commander cast with seven legally payable CP; Final Spark reaching both EX decisions; affordable Borrowed Banner and Return Tide; separate excess Backup, duplicate-name, and Light/Dark conflicts; stolen Commander accepted/declined destinations with relevant observers; party/First Strike/allocation; End Phase through next turn.
- [ ] Run `npx vitest run tests/scenarios/preset-transcripts.test.ts tests/scenarios/coverage.test.ts` and the focused scenario browser suite.
- [ ] Fix fixture resources and placement, increment scenario versions when origins change, and record legal commands for each interaction. Replay every transcript using `productionContext`. Save/reload at each advertised decision.

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
