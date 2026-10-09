# Playtest Cleanup and Smart Priority Implementation Plan

> **For agentic workers:** Use the `executing-plans` skill to implement this plan inline, task by task. Use checkbox steps for tracking. Do not dispatch subagents or create a worktree unless the user requests them. The user authorized committing and pushing the completed changes on this branch.

**Goal:** Repair CI and playtest usability, remove obsolete implementations, and add rules-correct Smart priority with maintainable card-authoring contracts.

**Architecture:** Keep the pure TypeScript rules engine, authoritative local host, DOM card controls, and current persistence boundaries. Derive content from explicit set manifests and share legality contracts. Replace the decorative Phaser canvas with CSS, then add priority automation through ordinary validated commands.

**Tech Stack:** Existing locked TypeScript, Vite, Zod, Vitest, Playwright, IndexedDB, and Workbox dependencies. Remove Phaser. Introduce no new application framework.

**Approved design:** [2026-10-09 playtest cleanup design](../specs/2026-10-09-playtest-cleanup-design.md), Option A and Smart priority approved on 2026-10-09.

**Working branch:** `feature/mvp-game-design-spec`. Planning baseline: `89e62addd62fef9ae926caddaa01e74178c22f1c` plus the uncommitted design and `AGENTS.md`.

## Execution record

Implemented the approved playtest scope on the current branch. The retained changes include default-branch-only Actions, removal of obsolete coverage and diagnostic code, explicit card-set registration, visibility-safe projections and logs, public pile inspection, editable card-based payment, the revised table layout, and Smart Priority with Hold, automatic own-response passes, no-action passes, no-blocker advancement, and a bounded command burst. The repository guidance now covers rule and card authoring through Opus I. The implementation keeps the existing application composition root instead of splitting files without a concrete need.

Local acceptance: `npm ci` completed with zero reported vulnerabilities; typecheck and boundary checks passed; 366 unit tests, 19 E2E tests, and 3 release tests passed. The 156-case UI matrix was covered by a full run (148 passed) and a fresh-build run of the eight corrected cases across all four viewport/motion projects (8 passed). `npm run dev` returned the app shell with HTTP 200. A hosted run was not started because feature-branch pushes are intentionally excluded from automatic triggers.

## Global constraints

- Hold Priority is off by default.
- Player-facing **Commander Zone** becomes **Command Zone**. The internal `commander` zone identifier can remain.
- Decisions move from the lower-left dock to the lower-right action area.
- Routine screenshot comparisons and Markdown-driven checks cease to be acceptance gates.
- There is no requirement to preserve save compatibility with unreleased builds. Current-format validation and replay integrity remain necessary.
- Use `push.branches: [main]` and `workflow_dispatch`. Remove `pull_request` triggers.
- Limit each burst to 32 automatic commands.
- Preserve 1280x720 and 1920x1080 usability in normal and reduced motion.
- Use 16px log body text and at least 14px secondary text. Use at least 12px gaps in button groups.
- Preserve the bright palette, four battlefield rows, deterministic replay, hidden information, local saves, and offline updates.
- Use the pinned `docs/fftcg-comprules-v3.3.pdf`. Do not import Magic timing rules.
- Add no real cards, production deployment, new Commander format exceptions, or general-purpose card language.
- Keep useful historical documentation. Delete the archived diagnostic program identified in Task 4.
- Do not commit prompts, attached logs, screenshots supplied by the user, temporary probes, or generated reports.
- Delete the supplied root logs, attached screenshots, and prompt. Do not stage or commit those artifacts.

## Execution map

This is one ordered plan with three independently reviewable checkpoints. Later stages depend on earlier contracts, so separate concurrent implementations are unnecessary.

| Stage | Tasks | Result |
|---|---|---|
| A. CI and shared contracts | 1-5 | Default-branch CI, maintainable tests, one live content/legality path, dead-code cleanup |
| B. Public information and table | 6-11 | Correct projections and logs, readable cards, public trays, direct choices, CSS table |
| C. Smart priority | 12-15 | Explicit timing context, cancellable automation, replay checks, full acceptance |

Run a focused failing regression before each behavior repair. Pure deletions and reversible document/configuration edits do not need artificial new tests. Review each task's diff before moving on. Record actual command results beside its checkbox when executing.

Do not repeat an entire suite after every small edit. Run focused checks during a task and broader checks at the three stage boundaries.

## File and responsibility map

| Files | Responsibility after implementation |
|---|---|
| `.github/workflows/ui-design.yml` | One validation workflow with core/browser jobs and approved triggers |
| `src/content/sets/opus-ph.ts`, `src/content/manifest.ts`, `src/content/context.ts` | Explicit set scripts, derived catalog, selected runtime context |
| `src/content/registry.ts`, `src/rules/contracts/card-script.ts` | Live behavior registration and supported declaration integrity |
| `src/rules/targets.ts`, `payment.ts`, new `payment-model.ts` | Shared target and payment semantics |
| `src/rules/commander.ts`, `batches.ts`, `scheduler.ts` | One live Commander departure pipeline and shared cost |
| New `src/rules/events.ts`, existing event producers | Event context and correct declaration/resolution/outcome semantics |
| `src/host/protocol.ts`, `views.ts`, new `log-view.ts` | Visibility-safe cards, decisions, stack, logs, and timing context |
| New `src/client/ui/card.ts`, `inspector.ts`, `zone-tray.ts`, `match-log.ts` | Shared card faces, enlargement, zones, log display |
| New `src/client/table/view.ts`, `interactions.ts`, `src/client/deck-editor-view.ts` | Match rendering, delegated card interactions, editor rendering |
| `src/client/match-controller.ts`, `action-draft.ts`, `choice-draft.ts` | Single owners for drafts and view invalidation |
| `src/client/theme.css`, new `src/client/table/table.css`, `src/styles.css` | Tokens, table geometry, application/menu styles |
| New `src/rules/priority-window.ts`, `src/client/priority-policy.ts`, `priority-controller.ts` | Authoritative timing context, pure automatic-pass policy, asynchronous runner |
| `src/storage/save.ts`, `replay.ts`, `src/host/local-host.ts` | Current save schema, ordinary command replay, serialized persistence |
| `src/main.ts` | Bootstrap, screen routing, host subscriptions, and component assembly |

Move existing code into these modules only when its task introduces a clear consumer. Do not create empty modules in advance.

## Stage A: CI and shared contracts

### Task 1: Restrict CI triggers and replace brittle browser assertions

**Files:** Modify `.github/workflows/ui-design.yml`, `package.json`, `playwright.ui-design.config.ts`, `tests/ui-design/{layout,payment,choices,battlefield,hand,motion}.spec.ts`, and `tests/e2e/smoke.spec.ts`. Delete `tests/ui-design/*-snapshots/` after removing baseline assertions.

**Interfaces:** Existing Playwright locators and `MatchView.generation/seq` remain the browser synchronization boundary. Preserve `npm run test:ui-design` as a build-and-run convenience command.

- [ ] Confirm the current branch, worktree status, and remote default branch. Read all three supplied failure sections before editing.
- [ ] Restrict workflow triggers using this exact event shape. Keep read-only permissions, locked dependencies, and Node 22.

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
```

- [ ] Split the workflow into core and browser jobs. Core runs `npm ci`, typecheck, boundary checks, and `npm test`. Browser runs `npm ci`, Chromium installation, one normal build, E2E, then retained UI behavior checks.
- [ ] Keep `windows-2022` initially to isolate this repair from platform changes. Retain failure traces/screenshots with `if: always()` uploads.
- [ ] Remove `toHaveScreenshot`, screenshot baseline configuration, decorative canvas checks, exact font measurements, and fixed edge-hit tests. Remove their unused imports and baseline directories.
- [ ] Replace the failed inspector measurement with visible content and interaction assertions. Exercise both catalog and deck-list inspection.

```ts
await page.getByRole('button', { name: 'Inspect Cinder Marshal', exact: true }).first().click();
await expect(page.locator('.editor-inspection')).toBeVisible();
await expect(page.locator('.editor-inspection')).toContainText('Cinder Marshal');
await expect(page.locator('.editor-inspection')).toContainText('Flare Order');
```

- [ ] Replace crowded-board synthetic edge clicks with actual card clicks and the resulting selected-card identity. Keep uniqueness of physical card instances.
- [ ] Replace targeting one-shot measurements with legal-target hover, visible target marker, legal click, and selected-target assertions. Keep cursor geometry only if needed to prove a functional arrow defect, using `expect.poll` around one current DOM sample.
- [ ] Stop browser tests from writing to `docs/ui-captures`. Use `testInfo.outputPath()` for optional artifacts. Set screenshot capture to failure-only for routine runs.
- [ ] Run `npm run test:ui-design`. Then run the three formerly failing behavioral cases across all four projects with `--repeat-each=3`. Do not add retries.
- [ ] Inspect any failure trace before changing a wait. If subtree replacement causes a real interaction failure, patch only that cause here and fold it into Task 9's component ownership.

**Done when:** The new event filter cannot automatically run on feature branches or PRs, and replacement interaction cases pass locally without pixel baselines.

### Task 2: Remove documentation-driven and redundant acceptance tooling

**Files:** Delete `scripts/coverage-evidence.js`, `scripts/coverage-evidence.d.ts`, `scripts/check-test-evidence.mjs`, `scripts/run-coverage-matrix.mjs`, `scripts/check-coverage.mjs`, and `tests/rules/coverage-evidence.test.ts`. Modify `package.json`, `tests/scenarios/coverage.test.ts`, `tests/content/catalog.test.ts`, and current command lists in `README.md`/`docs/playtesting.md`.

**Interfaces:** `npm test` discovers unit tests directly. Browser configs discover their test directories. Markdown is not an input to either runner.

- [ ] Remove `check:coverage` and `test:coverage-matrix` commands and all runtime/test imports of the deleted tooling.
- [ ] Delete the exact scenario roster expectation. Keep uniqueness, invariant checks, serialization, and explicit scenarios' expected behavior.

```ts
const ids = scenarioCatalog.map(scenario => scenario.id);
expect(new Set(ids).size).toBe(ids.length);
for (const scenario of scenarioCatalog) {
  const state = loadScenario(scenario.id, context);
  expect(() => assertInvariants(state, context)).not.toThrow();
  expect(JSON.parse(JSON.stringify(state))).toEqual(state);
}
```

- [ ] Remove redundant copied catalog name/stat tables. Preserve independent card-behavior tests and profile-specific deck-size checks.
- [ ] Retain executable boundary tests. They enforce architecture, not documentation wording.
- [ ] Run `npm test -- --reporter=dot` and `npm run typecheck`. Search `tests` and `scripts` for `.md`, `docs/`, and removed helper names. Inspect each remaining match instead of banning valid test fixtures by substring.

**Done when:** Changing prose or adding a registered scenario does not require editing a roster or evidence parser.

### Task 3: Derive catalogs from explicit set manifests

**Files:** Create `src/content/sets/opus-ph.ts`. Modify `src/content/{manifest,registry,context,decks}.ts`, `src/rules/contracts/card-script.ts`, `src/rules/types.ts`, `src/client/deck-editor.ts`, and `scripts/check-boundaries.mjs`. Update consumers in `src/main.ts`, scenarios, and tests. Delete `src/content/opus-ph.ts` after migration.

**Interfaces:** Keep `createRegistry(scripts, id)` as the registration entry point. Introduce this manifest type in `src/content/manifest.ts`:

```ts
export interface SetManifest {
  id: string;
  version: string;
  scripts: readonly CardScript[];
  sources: readonly { url: string; reviewedOn: string }[];
}
export function buildContent(sets: readonly SetManifest[], id: string): EngineContext;
```

- [ ] Add a registry test that combines two small explicit test sets, rejects duplicate numbers across sets, and derives metadata from their scripts.
- [ ] Run `npx vitest run tests/content/registry.test.ts tests/content/deck-editor.test.ts` and observe the new contract failure.
- [ ] Move the placeholder script imports into its set manifest. Derive the catalog from `registry.catalog`; do not maintain a second list of imported definitions.
- [ ] Replace exported vanilla/action/entry script group arrays with filters in tests that need those categories.
- [ ] Implement `buildContent` by flattening registered set scripts and calling `createRegistry`. Reject a script whose metadata set differs from its containing manifest.

```ts
const scripts = sets.flatMap(set => {
  if (set.scripts.some(script => script.metadata.set !== set.id)) {
    throw new Error(`Card set does not match manifest ${set.id}.`);
  }
  return [...set.scripts];
});
const registry = createRegistry(scripts, id);
return { registry, catalog: registry.catalog };
```

- [ ] Inject `Catalog` and `FormatProfile` into deck-editor helpers instead of importing placeholder content internally. Keep the current MVP profile at its composition root.
- [ ] Make boundary discovery cover every `src/content/cards/<set>` directory. Preserve checks against rules importing content or branching on card identities.
- [ ] Run content, boundary, and deck-editor tests. Check that a synthetic second set requires no UI name list or global count change.

**Done when:** Each playable card is registered once, and future set additions use explicit manifests without engine or UI card-name switches.

### Task 4: Remove proven dead paths and unreleased-save migration

**Files:** Modify `src/main.ts`, `src/rules/{commander,batches,operations,rule-choice-scripts,engine,actions,triggers,turns,damage,outcomes}.ts`, `src/rules/contracts/execution.ts`, `src/storage/save.ts`, `src/host/local-host.ts`, and `tsconfig*.json`. Delete unused `src/rules/index.ts`/`src/scenarios/index.ts` if reference checks still agree. Delete `docs/superpowers/audits/2026-10-07-second-audit/rules-probes.test.ts.txt`.

**Tests:** Adapt `tests/rules/{commander,casting,engine,triggers,batches}.test.ts` and `tests/storage/{save,import-errors,semantic-save}.test.ts` to exercise live paths.

**Interfaces:** Keep `commanderCost(state, instance, context)`. Live departures go through operation batches and scheduler replacements. `MatchSave.clientBuild` becomes required.

- [ ] Confirm that `requestDeparture` has no live application caller. Move useful departure tests to real casts, effects, combat, or prepared batches.
- [ ] Preserve a live regression for accepting Command Zone return, declining it, and a departure trigger's last-known information.
- [ ] Delete `requestDeparture`, its exclusive destination operation/continuation, and unused `selectBatchReplacement` after removing all consumers.
- [ ] Route live cost calculations through `commanderCost`; delete duplicate tax arithmetic used as authority.
- [ ] Delete compiler-reported unused imports, `editorCardRow`, `started`, and unused parameters. Remove unused barrel exports only after reference checks.
- [ ] Require `clientBuild` in the current save schema. Remove fallback assignment and migration re-persistence from restore/import paths.

```ts
const withoutBuild = { ...save } as Partial<MatchSave>;
delete withoutBuild.clientBuild;
expect(matchSaveSchema.safeParse(withoutBuild).success).toBe(false);
expect(matchSaveSchema.safeParse(save).success).toBe(true);
```

- [ ] Keep current-format replay, malformed-save rejection, preservation/export after failed import, and safe update checks. Bump the schema version when the serialized contract changes.
- [ ] Enable `noUnusedLocals` and `noUnusedParameters`. Correct newly exposed unused test symbols rather than disabling the checks.
- [ ] Run typecheck and the affected rules/storage tests. Search for deleted symbols and the diagnostic program's references.

**Done when:** Test-only alternate rule pipelines are gone, current saves still restore, and stricter unused-code checks pass.

### Task 5: Unify target and payment legality before automation

**Files:** Modify `src/rules/{types,targets,actions,payment,casting,activation,triggers,priority}.ts`, `src/rules/contracts/card-script.ts`, `src/content/registry.ts`, `src/content/shared/script-helpers.ts`, and affected `src/content/cards/opus-ph/*.ts`. Create `src/rules/payment-model.ts`. Modify `src/client/action-draft.ts` and payment consumers in `src/main.ts`.

**Tests:** `tests/rules/{actions,payment,targets,trigger-declaration,casting}.test.ts`, `tests/content/{registry,card-behaviors}.test.ts`, and `tests/client/action-draft.test.ts`.

**Interfaces:** Define one metadata `TargetRule` by combining the existing restrictions with `min`, `max`, and `distinct`. Keep mode-specific target restrictions on Summons. Remove script `targets.accepts` and dormant trigger subscriptions after consumers migrate.

```ts
export interface TargetRule extends AbilityTargetRule {
  min: number;
  max: number;
  distinct: boolean;
  maxCost?: number;
}
export interface PaymentSource {
  object: ObjectId;
  kind: 'discard' | 'backup';
  elements: Element[];
  amount: 1 | 2;
}
// Add sources, suggestedPayment, and specialDiscardRequired to PaymentOffer.
export function evaluatePaymentOffer(offer: PaymentOffer, payment: Payment): RuleError[];
export function findPayment(offer: PaymentOffer): Payment | null;
export function legalTargets(state: MatchState, seat: Seat, rule: TargetRule,
  context: EngineContext): CardObject[];
```

- [ ] Add command regressions for zero-target and two-target activated abilities using test card definitions. Include wrong count, duplicate target, stale target, and partial resolution where the rule permits it.
- [ ] Add payment regressions for Light/Dark discard rejection, zero cost, elemental choice, required special discard, and one card attempting two cost roles.
- [ ] Run the focused tests before replacing predicates. Preserve existing FFTCG payment semantics unless a cited rule regression requires correction.
- [ ] Normalize metadata into one target restriction contract. Use it in offers, declarations, and resolution checks. Remove activation's `targets.length !== 1` assumption.
- [ ] Keep the existing live metadata trigger path. Remove `TriggerSubscription`, unused `matches` definitions, helper-only subscription tests, and script target predicates.
- [ ] Extract pure payment arithmetic into `payment-model.ts`. The engine still derives eligible sources from authoritative state. Both draft evaluation and command validation call the same pure arithmetic.
- [ ] Enumerate source subsets, permitted element assignments, and special-discard choices in `findPayment`. Validate each candidate with `evaluatePaymentOffer`; never double-count a multielement source.
- [ ] Replace `actions.ts:hasPayment` and `main.ts:makePayment` with validated offers and their suggested payment. A suggested payment is editable, never automatically submitted.
- [ ] Expose ineligible payment reasons for visible hand cards, including Dark/Light exclusion, without offering illegal sources.
- [ ] Run focused tests, then `npm test`, `npm run typecheck`, and `npm run check:boundaries`.

**Checkpoint A:** Retained checks pass, obsolete contracts have no callers, and action offers agree with command validation. Record unresolved CI reproduction limits separately from actual pass results.

## Stage B: Public information and table

### Task 6: Repair projection counts and decision context

**Files:** Modify `src/host/{protocol,views}.ts` and `src/main.ts`. Tests: `tests/host/{views,card-tray}.test.ts`.

**Interfaces:** Keep `deckCounts`. Add explicit decision presentation, separate from `resolving`:

```ts
export interface DecisionView {
  kind: 'setup' | 'declaration' | 'effect' | 'rule';
  actor: Seat;
  source: VisibleCard | null;
  effectText: string | null;
  requirement: string;
}
// MatchView.decision: DecisionView | null
```

- [ ] Add a setup projection test asserting `resolving === null` during first-player and mulligan decisions. Add nested-resolution tests preserving the parent effect.
- [ ] Add a normal opening-hand test: first player keeps five, draws one, has six in hand and `deckCounts[firstPlayer] === 13`.
- [ ] Run `npx vitest run tests/host/views.test.ts tests/host/card-tray.test.ts` and observe the setup-context failure.
- [ ] Restrict `resolving` to active stack/EX frames. A rule frame by itself cannot identify a resolving card. Resolve declaration source text from its queued stack item.
- [ ] Use `deckCounts` in both table seats. Leave redacted deck arrays empty.
- [ ] Assert projected deck objects and opponent hand identities remain absent. Preserve authorized private choice options only for their actor.

```ts
const view = projectView(state, 0, [], context);
expect(view.zones[0].deck).toEqual([]);
expect(view.deckCounts[0]).toBe(state.zones[0].deck.length);
for (const instance of state.zones[1].deck) expect(view.cards[instance]).toBeUndefined();
```

**Done when:** Setup cannot masquerade as an effect, Dusk's declaration includes its effect text, and visible counts come from the public projection.

### Task 7: Emit accurate events and redact logs at the host

**Files:** Create `src/rules/events.ts` and `src/host/log-view.ts`. Modify `src/rules/{types,engine,turns,priority,scheduler,operations,payment,damage,continuous,casting,activation}.ts`, `src/host/{protocol,views}.ts`, `src/storage/save.ts`, and event consumers in `src/client/table/animation.ts`.

**Tests:** Create `tests/rules/events.test.ts` and `tests/host/log-view.test.ts`. Extend Dusk command coverage in `tests/rules/triggers.test.ts`.

**Interfaces:** Add actor, turn, phase, combat step, and action context to internal events. Centralize event construction. Use a separate public event projection, not raw internal `data`.

```ts
export interface EventContext {
  turn: number;
  phase: Phase;
  step: CombatState['step'] | null;
  actor: Seat | null;
  actionId: string | null;
}
export interface PublicLogEntry {
  id: string;
  context: EventContext;
  kind: string;
  text: string;
  cards: { number: string; name: string; object: ObjectId | null }[];
  groupKey: string | null;
}
export function projectLog(events: readonly RuleEvent[], viewer: Seat | null,
  catalog: Catalog): PublicLogEntry[];
// MatchView.log becomes PublicLogEntry[]. Raw RuleEvent[] stays host-side.
```

- [ ] Add a trace test for Active, Draw, and Main 1 transitions. Assert actor and turn context, not exact prose.
- [ ] Add the Dusk sequence: target chosen at 4000, effect queued, two passes, resolution at 2000, expiration at 4000.
- [ ] Add log privacy tests with distinct secret card names. Opponent draws remain visible as actor/count entries without the secret identity.
- [ ] Run new tests before changing event emission.
- [ ] Introduce `stack.resolution-started` when the scheduler frame starts. Emit `stack.resolved` only after that frame finishes, including nested choices.
- [ ] Emit source/target snapshots and outcomes for casts, costs, target choices, power changes, damage cards, zone moves, EX decisions, and expiration. Record actual discard reasons.
- [ ] Stamp context when each event occurs. Do not attach the final phase of a multi-phase command to earlier events.
- [ ] In `projectLog`, implement explicit cases for supported events. Use a neutral fallback with no raw payload for unknown types.
- [ ] Derive public grouping keys after redaction. Clear them for phase boundaries, decisions, targets, and events with different public identities.
- [ ] Update save schemas and animation consumers. Preserve command replay equality and public historical names after objects change zones.

```ts
const publicLog = projectLog(events, 1, context.catalog);
expect(publicLog.some(entry => entry.kind === 'card.drawn')).toBe(true);
expect(JSON.stringify(publicLog)).not.toContain(secretDrawnCardName);
expect(publicLog.find(entry => entry.kind === 'card.discarded')?.cards)
  .toContainEqual(expect.objectContaining({ number: publiclyDiscardedCardNumber }));
```

The two names in this test come from a draw/discard fixture constructed in `log-view.test.ts`, not arbitrary raw event payloads.

**Done when:** Public action history is complete and actor-specific, without exposing hidden choices or describing queued effects as completed.

### Task 8: Implement shared card faces, inspectors, and zone trays

**Files:** Create `src/client/ui/{card,inspector,zone-tray}.ts`. Modify `src/host/{protocol,views}.ts`, vanilla placeholder card text, and card consumers. Create `tests/client/card.test.ts`, `tests/client/zone-tray.test.ts`, and `tests/ui-design/inspection.spec.ts`.

**Interfaces:** Render only `VisibleCard` or explicit public historical definitions. Keep deck inspection distinct from card trays.

```ts
export type ZoneTrayModel =
  | { kind: 'deck'; seat: Seat; count: number }
  | { kind: 'public'; seat: Seat; zone: 'break' | 'damage' | 'removed' | 'commander'; cards: VisibleCard[] };
export type InspectableZone = 'deck' | 'break' | 'damage' | 'removed' | 'commander';
export function zoneTray(view: MatchView, seat: Seat, zone: InspectableZone): ZoneTrayModel;
export function renderCard(card: VisibleCard, compact: boolean): string;
export function openInspector(card: VisibleCard, restoreFocus: HTMLElement): void;
export function closeInspector(): void;
```

- [ ] Add model tests asserting deck trays contain counts only and public trays preserve projected zone order.
- [ ] Implement shared faces with name, cost, elements, type, short rules text, keywords/generic status, and effective power.
- [ ] Remove `No abilities.` text from vanilla cards. Keep the generic icon and keywords independent of rules prose.
- [ ] Add projected modifier source and duration information to `VisibleCard` for inspection. Show numeric delta plus reduced/increased text, not color alone.
- [ ] Implement a focus-managed overlay using native dialog behavior or equivalent accessible focus handling. Right-click and keyboard Inspect open it without declaring an action.
- [ ] Escape closes inspection and restores focus even while a required game choice exists. The choice itself remains pending.
- [ ] Wire public zone counters for both seats. A deck tray states that remaining contents and order are hidden.
- [ ] Use escaped text or DOM text nodes for card content and log labels. Future official text must not become executable markup.
- [ ] Add browser coverage for right-clicking a public Commander, inspecting Break/Damage, and closing inspection without answering the pending choice.

```ts
await page.locator('[data-card]').filter({ hasText: 'Dusk Reaver' }).first().click({ button: 'right' });
await expect(page.getByRole('dialog', { name: /Inspect Dusk Reaver/ })).toContainText('loses 2000 power');
await page.keyboard.press('Escape');
await expect(page.getByRole('dialog')).toHaveCount(0);
```

**Done when:** Public cards are readable and inspectable, hidden decks stay hidden, and power changes remain distinct from damage.

### Task 9: Give drafts one owner and select cards directly

**Files:** Create `src/client/table/interactions.ts`, `src/client/table/view.ts`, and `src/client/deck-editor-view.ts`. Modify `src/client/{match-controller,action-draft,choice-draft}.ts`, `src/client/ui/payment-panel.ts`, and `src/main.ts`. Tests: existing draft/controller tests plus `tests/ui-design/{payment,choices,hand}.spec.ts`.

**Interfaces:** Move full draft state into `MatchController`. Keep generation, sequence, actor, and choice ID invalidation. Expose one card-selection entry point:

```ts
export type InteractionMode = 'choice' | 'payment' | 'targets' | 'attack' | 'block' | 'select';
export function interactionMode(controller: MatchController): InteractionMode;
export function selectCard(controller: MatchController, object: ObjectId): void;
// MatchController owns actionDraft, choice selections, ordering, party and allocation drafts.
```

- [ ] Add controller tests for stale generation/sequence, actor changes, required-choice precedence, and source removal.
- [ ] Move parallel globals out of `main.ts`. Keep selected mode, payment sources, targets, and selected cards inside their owning draft.
- [ ] Use required choice first, then active draft stage, then combat draft, then ordinary card selection. Context-menu inspection never routes through `selectCard`.
- [ ] Delegate input at stable component roots. Update the log and offline status without replacing the table or active pointer gesture.
- [ ] Split deck-editor rendering from bootstrap while preserving query, caret, filters, and selection through updates.
- [ ] Select payment cards and Backups directly from the table. Show disabled reasons for visible ineligible sources. Require Confirm before submission.
- [ ] Select targets, discard cards, order, attackers, parties, blockers, and allocation participants by clicking cards. Use zone trays for off-table choices.
- [ ] Keep buttons for non-card decisions. Preserve Clear, Cancel, confirmation, and selection-order indicators where relevant.
- [ ] Update browser journeys to interact with cards instead of footer lists. Include the Dark payment exclusion and Dusk effect text before target selection.

```ts
await page.locator('[data-card]').filter({ hasText: 'Spark Runner' }).first().click();
await page.locator('[data-payment-source]').filter({ hasText: 'Ash Recruit' }).click();
await expect(page.getByRole('button', { name: /Confirm cast/ })).toBeEnabled();
await page.getByRole('button', { name: /Confirm cast/ }).click();
await expect(page.locator('.battlefield [data-card]').filter({ hasText: 'Spark Runner' })).toBeVisible();
```

**Done when:** The host remains authoritative, each draft has one owner, and card-based selections survive harmless display updates.

### Task 10: Replace the decorative canvas and consolidate table layout

**Files:** Create `src/client/table/table.css`. Modify `src/client/theme.css`, `src/styles.css`, `src/client/table/view.ts`, `src/client/menu.ts`, `src/main.ts`, and `index.html`. Remove `src/client/table/layout.ts` and its formula-mirroring test after migrating consumers. Remove Phaser from `package.json` and lockfile.

**Interfaces:** CSS owns layout. Components keep stable semantic roots: `.table`, `.battlefield`, `.hand-zone`, `.decision-dock`, `.activity-rail`, and `.match-log`.

- [ ] Remove Phaser imports, `Playmat`, canvas host markup, scale listeners, and geometry synchronization. Run `npm uninstall phaser` and inspect the lockfile diff for unrelated changes.
- [ ] Consolidate bright theme tokens. Delete superseded dark colors and repeated geometry overrides rather than appending another override layer.
- [ ] Implement the reserved rail and decision area with CSS grid. Use this starting structure, then check actual crowded and long-text states:

```css
.match-shell { display: grid; grid-template-columns: minmax(0, 1fr) clamp(300px, 22vw, 360px); height: 100dvh; }
.match-header { grid-column: 1 / -1; }
.play-area { min-width: 0; min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto auto; }
.activity-rail { min-height: 0; display: flex; flex-direction: column; }
.match-log { flex: 1; min-height: 0; overflow: auto; font-size: 16px; line-height: 1.5; }
.decision-dock { justify-self: end; max-width: 100%; }
.button-group { display: flex; flex-wrap: wrap; gap: 12px; }
.damage-counter { white-space: nowrap; font-weight: 600; }
```

- [ ] Compress the opponent strip, keep its hand count visible, and reserve larger card rows. Keep row ownership and Forward/Backup order.
- [ ] Replace selected-card vertical transforms with inset highlights. Keep hover enlargement outside row clipping containers.
- [ ] Put action actor, effect, selections, Confirm/Cancel, and priority controls in the lower-right dock.
- [ ] Change visible terminology to Command Zone. Render damage as one `0 / 7` counter.
- [ ] Give menu/results consistent button groups and separate abandonment controls. Remove Caching and First to 7 Damage from the table header.
- [ ] Keep offline readiness, update availability, and errors in the menu. Avoid indefinite dev-mode caching status when service workers are disabled.
- [ ] Run retained browser behavior cases at both sizes and motion preferences. Inspect temporary screenshots of setup, payment, target choice, attack, crowded board, menu, and results.

**Done when:** No card or primary decision is clipped, log and stack have reserved space, and the application no longer needs Phaser or duplicate layout formulas.

### Task 11: Present a readable, grouped, stable match log

**Files:** Create `src/client/ui/match-log.ts`. Modify `src/client/table/view.ts`, `src/main.ts`, and table styles. Create `tests/client/match-log.test.ts` and `tests/ui-design/match-log.spec.ts`.

**Interfaces:** Consume only `PublicLogEntry[]`. Group without mutating raw entries.

```ts
export interface LogGroup { entries: PublicLogEntry[]; count: number }
export function groupAdjacent(entries: readonly PublicLogEntry[]): LogGroup[];
export function updateMatchLog(root: HTMLElement, entries: readonly PublicLogEntry[]): void;
```

- [ ] Test that five adjacent anonymous draws by one actor group together. Test separation by actor, turn, phase, action context, public card identity, and intervening decision.
- [ ] Implement consecutive grouping only when non-null `groupKey` and visible context match. Expand groups containing individual visible details.
- [ ] Render chronological entries and public-card inspection links. Preserve historic labels after the card leaves the current projection.
- [ ] Before updating, record whether the reader is at the bottom. Follow new entries only in that state. Otherwise retain the visible anchor and show New events.
- [ ] Update only the log subtree. Do not replace drafts or steal focus when new events arrive.
- [ ] Add a browser case that scrolls up, causes another public event, and verifies the reader stays in history until clicking New events.

```ts
expect(groupAdjacent([drawOne, drawTwo])).toHaveLength(1);
expect(groupAdjacent([drawOne, phaseStarted, drawTwo])).toHaveLength(3);
expect(groupAdjacent([discardAsh, discardDusk])).toHaveLength(2);
```

Construct these entries in `match-log.test.ts` using the `PublicLogEntry` contract. Give both draws the same public group key and boundary entries a null key.

**Checkpoint B:** Run core checks, normal build, retained E2E, and UI behavior suites. Inspect visual artifacts. Confirm P01-P14, P17-P18, P20-P24, and P26-P30 outcomes before enabling automation.

## Stage C: Smart priority

### Task 12: Expose explicit timing windows without skipping rules

**Files:** Create `src/rules/priority-window.ts`. Modify `src/rules/{types,priority,combat,engine,casting,activation,triggers,scheduler,setup}.ts`, `src/rules/contracts/execution.ts`, `src/host/{protocol,views}.ts`, save schemas, and fixture construction. Create `tests/rules/priority-window.test.ts`.

**Interfaces:** Persist a timing window in `MatchState`, and project only its safe fields in `MatchView`. Use metadata on declarations to signal a generic response-sensitive window.

```ts
export interface PriorityWindow {
  id: string;
  actor: Seat;
  turn: number;
  phase: Phase;
  step: CombatState['step'] | null;
  kind: 'response' | 'priority' | 'attack-declaration' | 'block-declaration';
  ownDeclaration: { id: string; controller: Seat; responseSensitive: boolean } | null;
}
export function openPriorityWindow(state: MatchState,
  input: Omit<PriorityWindow, 'id' | 'turn' | 'phase' | 'step'>): void;
// MatchState.priorityWindow and MatchView.priorityWindow: PriorityWindow | null
```

- [ ] Add timing regressions for Attack Preparation before declarations, no attackers, no blockers, pre-damage responses, and additional attacks.
- [ ] Run the new tests against current combat behavior. If current states conflate preparation and declaration, split those transitions here.
- [ ] Assign deterministic window IDs through `state.nextId`. Clear the window during required choices, automatic phases, and terminal results.
- [ ] Set `ownDeclaration` only for the declaring actor's immediate initial response window. Preserve it across required declaration choices, then expire it after that actor passes or another action occurs.
- [ ] Distinguish blocker selection from response priority. Use the existing `{ kind: 'block', blocker: null }` intent for no blocks, not an overloaded priority pass.
- [ ] Share attacker/blocker eligibility between offers and validation. Prevent phase advancement while a supported compulsory attack/block obligation remains.
- [ ] Keep Active/Draw automatic, End Phase restrictions, trigger ordering, and EX Burst choices unchanged. Process Preparation and pre-damage windows even when combat participants are absent.
- [ ] Add optional generic `responseSensitive` declaration metadata, defaulting to false. Exercise it with a test script, not a card-name exception.
- [ ] Update save and fixture schemas atomically. Run combat, priority, trigger, end-phase, setup, and replay tests.

**Done when:** The client can identify legal timing windows without reconstructing rules from the visible board or log prose.

### Task 13: Implement the pure Smart priority policy and stops

**Files:** Create `src/client/priority-policy.ts` and `tests/client/priority-policy.test.ts`. Add the shared `AutoReason` type to `src/rules/types.ts`.

**Interfaces:** Consume only the acting seat's fresh projection and per-seat preferences. Define all policy results explicitly:

```ts
// In rules/types.ts; import this type into client policy and command schemas.
export type AutoReason = 'no-action' | 'own-response' | 'no-attackers' | 'no-blockers' | 'end-phase';
export interface PhaseStop { turn: number; phase: Phase; step: CombatState['step'] | null }
export interface PriorityPreferences {
  policy: 'smart' | 'conservative';
  seats: Record<Seat, { hold: boolean; stops: PhaseStop[] }>;
}
export interface AutomationGate {
  paused: boolean;
  draftOpen: boolean;
  inspectorOpen: boolean;
  commandPending: boolean;
  pausedWindowId: string | null;
}
export type PriorityDecision =
  | { kind: 'stop'; reason: string; consumeStop: boolean }
  | { kind: 'submit'; intent: { kind: 'pass' } | { kind: 'block'; blocker: null }; reason: AutoReason };
export function decidePriority(view: MatchView, preferences: PriorityPreferences,
  gate: AutomationGate): PriorityDecision;
```

- [ ] Add table-driven cases for every row in the approved spec's policy table. Construct views from real engine fixtures where legality matters.
- [ ] Include own-response with a legal action, opponent response with the same action, response-sensitive declaration, Hold, one-shot stop, mandatory choice, and terminal state.
- [ ] Run the tests and observe missing policy behavior.
- [ ] Evaluate guards in this order: paused/pending state, required choice/result, actor/window validity, held priority, matching stop, declaration kind, available non-pass actions.
- [ ] Under Smart, auto-pass only the initial own-declaration response unless response-sensitive. Under Conservative, stop if any legal non-pass action exists.
- [ ] Submit no-block only in a blocker declaration window with zero legal blockers. Do not classify a pre-damage response window as blocker selection.
- [ ] Preserve opponent legal responses, Attack Preparation actions, and meaningful Main Phase actions. Never select a target, pay a cost, or declare an attack.
- [ ] Return `consumeStop: true` when a matching one-shot stop is reached. The controller must latch that window as paused until manual progression.

```ts
expect(decidePriority(ownResponseView, smartPreferences, openGate))
  .toEqual({ kind: 'submit', intent: { kind: 'pass' }, reason: 'own-response' });
expect(decidePriority(opponentResponseView, smartPreferences, openGate).kind).toBe('stop');
expect(decidePriority(requiredChoiceView, smartPreferences, openGate).kind).toBe('stop');
```

Define these fixtures in the test file from `PriorityWindow`, `PriorityPreferences`, and `AutomationGate`. A non-pass action must exist in both response views.

**Done when:** Every automated action has a documented policy reason, and Hold/stops preserve legal response opportunities.

### Task 14: Serialize, cancel, persist, and expose automatic passes

**Files:** Create `src/client/priority-controller.ts`. Modify `src/client/match-controller.ts`, `src/client/table/view.ts`, `src/main.ts`, `src/host/{protocol,local-host}.ts`, `src/rules/{types,codec,engine}.ts`, and `src/storage/save.ts`. Create `tests/client/priority-controller.test.ts`, extend `tests/host/lifecycle.test.ts`, and create `tests/ui-design/priority.spec.ts`.

**Interfaces:** Keep `CommandTransport.submit(CommandRequest)` as the command path. Add optional command origin metadata for logs/replay, permitted only on Pass or No blocks.

```ts
// Command.origin?: { kind: 'automatic'; reason: AutoReason }
// Use AutoReason from rules/types.ts, introduced in Task 13.
export interface PriorityRunnerOptions {
  view(): MatchView;
  preferences(): PriorityPreferences;
  gate(): AutomationGate;
  transport: CommandTransport;
  yieldTurn(): Promise<void>;
  onPause(reason: string): void;
  onStop(windowId: string, consumeStop: boolean): void;
}
export class PriorityController {
  constructor(options: PriorityRunnerOptions);
  start(): Promise<void>;
  cancel(): void;
}
```

- [ ] Test cancellation with an injected deferred `yieldTurn`, rather than real-time sleeps. Test that only one submission can be in flight.
- [ ] Before every submission, re-read generation, sequence, policy, and gate. Abort if cancellation revision or the inspected match changes.
- [ ] Generate a unique command ID and submit the ordinary intent with its expected sequence and generation. Await the accepted reply before another policy decision.
- [ ] Yield between commands. Stop after 32 submissions, repeated state without progress, rejected command, or a newly required choice. Show a manual Continue control for a budget pause.
- [ ] Pause on menu, inspection, drafts, restore, or match replacement. Preserve an already accepted command; cancel only unsent work and subsequent automation.
- [ ] On matching stops, consume the preference and latch `pausedWindowId`. Release it only after manual progression or departure from that window.
- [ ] Add per-seat Hold controls, next-window phase stops, and Smart/Conservative selection. Default a new match to Smart with Hold off.
- [ ] Persist preferences separately from rules state under a versioned client storage key. On restore, retain preferences but pause automation until the player resumes the stable decision.
- [ ] Record automatic command origin in the transcript and projected pass log. Treat it as explanatory metadata, never permission to bypass validation.
- [ ] Update command/save schemas. Replay recorded commands without running `PriorityController` and check equal final states/events.
- [ ] Add browser cases for empty Attack/Block prompts disappearing, own-trigger Hold, opponent response preservation, and inspection interrupting automation.

```ts
const running = controller.start();
controller.cancel();
releaseYield();
await running;
expect(transport.submit).not.toHaveBeenCalled();
```

Construct `controller`, the deferred `releaseYield`, and the mocked transport in this test through `PriorityRunnerOptions`. Start in an otherwise auto-passable real projected window.

**Done when:** Automatic passes are ordinary replayable commands, cancellation is reliable, and both seats can retain priority deliberately.

### Task 15: Final acceptance, contributor guidance, and log deletion

**Files:** Update `AGENTS.md`, `README.md`, `docs/playtesting.md`, and the current guidance section of `docs/ui-reference.md`. Update the workflow browser job to include retained release validation. Remove only the three named attached logs when checks pass.

**Interfaces:** Final commands are typecheck, boundaries, unit tests, normal build, E2E, UI behavior, and release lifecycle. Historical documents are not executable acceptance inputs.

- [ ] Remove the obsolete unused-hook warning from `AGENTS.md` after Task 5 removes those hooks. Update exact card-registration paths and authoring commands.
- [ ] Document Hold, Smart own-response passing, one-shot stops, right-click/keyboard inspection, public zones, and direct payment selection.
- [ ] Update current documentation to Command Zone and lower-right decisions. Preserve dated historical decisions as history.
- [ ] Review all tracked source, script, test, dependency, and configuration references for removed implementations. Inspect every remaining unused/dead-code candidate before deleting it.
- [ ] Run the final checks in this order. UI and release suites share port 4174, so run them sequentially.

```powershell
npm run typecheck
npm run check:boundaries
npm test -- --reporter=dot
npm run build
npm run test:e2e
npx playwright test --config playwright.ui-design.config.ts
npm run test:release
git diff --check
```

- [ ] Inspect temporary screenshots for both viewport sizes and motion modes. Check long effect text, large public trays, selected attackers, crowded rows, and menu/results spacing.
- [ ] Run one ordinary seeded match through setup, casting, a triggered effect, combat, damage, save/reload, and completion. Confirm log readability and reduced pass clicks.
- [ ] Check trigger configuration without pushing a feature branch to provoke CI. If manual dispatch is available and separately requested, check its hosted result. Otherwise report local parity and the hosted limitation explicitly.
- [ ] After local CI-equivalent checks and the three replacement failure cases pass, delete the supplied logs with literal paths:

```powershell
Remove-Item -LiteralPath @(
  'C:/MyProjects/DissidiaCardGame/close-mvp-implementation-plan.log.txt',
  'C:/MyProjects/DissidiaCardGame/complete-mvp-milestones-and-coverage-evidence.log.txt',
  'C:/MyProjects/DissidiaCardGame/stabilize-ui-design-screenshot-gate.log.txt'
)
```

- [ ] Keep any temporary probe and generated artifact under ignored `test-results` or the system temporary directory. Delete probes after use.
- [ ] Inspect `git status --short` and the final diff. Ensure prompts, supplied screenshots, and supplied logs are absent from the index; commit and push the remaining work on the current branch as explicitly requested.
- [ ] Report the changed behavior, actual checks, deleted logs, and any remaining limitation. Do not claim hosted CI passed without a hosted result.

**Checkpoint C:** All applicable acceptance rows in the approved design have evidence, and no known required work remains hidden behind passing unit tests.

## Requirement-to-task coverage

| Requirement | Tasks |
|---|---|
| Default-branch-only CI and three failed runs | 1, 15 |
| Repository-wide cleanup, obsolete tests, diagnostics | 2-5, 9-10, 15 |
| Rule/card guardrails and future Opus maintainability | 3, 5, 15 |
| P01 setup stack context | 6 |
| P02-P04 log size, font, discarded identities | 7, 10-11 |
| P05-P06 public zones and counts | 6, 8 |
| P07-P09 phases, actors, grouping | 7, 11 |
| P10-P12 deck zero, Command Zone, damage counter | 6, 10 |
| P13-P14 text and enlarged inspection | 8 |
| P15-P16 Smart priority and researched mapping | 12-14 |
| P17-P18 direct cards and blank vanilla text | 8-9 |
| P19 empty Attack decisions | 12-14 |
| P20-P21 Dark payment and Dusk timing | 5-9 |
| P22-P24 power cues, effects, attacker clipping | 7-8, 10-11 |
| P25 no-blocker decision | 12-14 |
| P26 Damage cards | 7-8 |
| P27-P30 spacing, decisions, board space, diagnostic badge | 10 |
| Replay, hidden information, offline/update safety | 4, 6-7, 12-15 |
| Log deletion after repair, no prompt/log commits | 15 and global constraints |

## Planning review

- [x] Every approved requirement maps to an implementation task.
- [x] Smart priority depends on authoritative legality and explicit timing context.
- [x] Code deletion preserves tests of live behavior rather than test-only alternate implementations.
- [x] Task interfaces name producers and consumers without authorizing hidden-information access.
- [x] Checks use behavior and visibility rather than Markdown wording or screenshot baselines.
- [x] Work stays inline on the current branch; committing and pushing are explicitly authorized after local acceptance.

The execution record above reports verified work; the task bullets preserve the approved design detail for review. Do not infer hosted CI success from local checks.
