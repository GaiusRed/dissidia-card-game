# MVP branch audit: second review

Date: 2026-10-07 (Asia/Singapore)

Branch: `feature/mvp-game-design-spec`

Audited revision: `89828a6` (`feat: complete first three MVP milestones`)

Baseline: `main` at `9ad3889`. The complete branch diff contains 155 changed files.
The working tree was clean before this audit.
The previous audit covered `9341328`. The intervening implementation commit changes 97 files.

## Conclusion

**The branch does not complete milestones 1-3.** Several earlier findings remain, including required choices that stop a duel.
The repair adds useful foundations, but its passing tests do not establish the milestone exit gates.

The [original design](../specs/2026-10-06-dissidia-mvp-design.md) remains the acceptance target.
The [previous audit](2026-10-07-mvp-branch-audit.md) and its approved repair design supply additional requirements.
The supplied [comprehensive rules](../../fftcg-comprules-v3.3.pdf) remain the rules authority.
This review includes the approved light theme and independent card modules.

| Milestone | Current result | Main blockers |
|---|---|---|
| 1. Rules foundation | Partial | Priority, payment, conservation, host lifecycle, and incomplete rule checkpoints |
| 2. Rules interactions | Fails acceptance | Choice deadlocks, trigger timing, simultaneous departures, First Strike, and temporary control |
| 3. Offline playable MVP | Fails acceptance | Mandatory UI choices, explicit payment, table hierarchy, inspection, unusable presets, and missing complete offline evidence |

## Method and evidence

The review covers rules, all 40 card definitions, shared handlers, host, storage, scenarios, client, build configuration, tests, and release records.
The changed-file inventory is in [the evidence folder](2026-10-07-second-audit/changed-files.txt).
The lockfile and asset changes were reviewed for their MVP role, not as a dependency vulnerability audit.
Milestones 4-6, production artwork, mobile layouts, and Light/Dark Commander identity remain outside scope.

The review used source inspection, the existing suites, targeted rules probes, real browser input, geometry checks, and screenshot inspection.
It does not claim exhaustive exploration of every possible duel.

| Check | Observed result | What it establishes |
|---|---|---|
| `npm test` before audit additions | 138 passed across 35 files | Existing assertions pass |
| `npm run check:boundaries` | Passed | Platform/import checks pass, not full card or client separation |
| `npm run check:coverage` | Passed | 40 card modules, two 19-card decks, and 25 referenced test paths exist |
| `npm run build` | Passed | Both TypeScript checks and release precaching succeed |
| `npm run test:e2e` | 11 passed | Existing smoke interactions pass |
| Temporary rules probes A01-A17 | All 17 reproduced their asserted current behavior | Concrete defects described below |
| Dedicated UI design suite | 20 failed, 4 passed across 24 cases | Six scenarios at two sizes and two motion modes. No retries or skipped cases |
| Catalog comparison | All 40 identities, names, types, elements, costs, powers, rarities, set/version/provenance, Generic and EX flags match | Printed ability text remains defective on 15 cards |
| Local rules PDF | Relevant setup, CP, priority, trigger, combat, rule-process, and loop sections read | Findings use the supplied rules version |

The build emits a bundle-size warning. It still precaches the generated bundle, so this audit does not classify that warning as a release failure.

The archived [probe source](2026-10-07-second-audit/rules-probes.test.ts.txt) and [output](2026-10-07-second-audit/rules-probes.log) preserve reproducible diagnostics.
Those probes assert the observed defects. They are not acceptance tests and do not remain in the default unit suite.
To repeat them, copy the source to `tests/rules/second-audit-probes.test.ts`, then run Vitest against that file.
Remove that diagnostic copy after the run.

The [UI results](2026-10-07-second-audit/ui-results.json) record the final browser run.
Representative screenshots remain in the evidence folder. Full traces and videos remain in the local Playwright report.
The dedicated suite reports failures normally. It uses no expected-failure annotations or accepted screenshots of the defective layout.

## Recheck of every previous finding

“Partial” means some repair exists, but the finding is not closed.
“Fixed” means the specific defect has source and test evidence. It does not imply broader milestone acceptance.

| Previous ID | Status | Current evidence and remaining work |
|---|---|---|
| F01 Combat/priority | Partial | Stack generally precedes combat, and attacks retain turn-player priority. Summons and abilities still transfer priority. See S02, S05. |
| F02 End ordering deadlock | Partial | Answered order choice clears. Later trigger target/discard choices still leave no priority. See S01. |
| F03 Parties/allocation | Partial | Headless same-element parties and allocation exist. Party First Strike and the browser controls remain incomplete. See S05, S11. |
| F04 Combat keywords | Partial | Brave, blocker activation, active frozen attackers, and blocked status improved. First Strike still fails. See S05. |
| F05 Rule processes | Partial | Zero power, lethal damage, duplicates, Light/Dark, and excess Backups exist. Batch continuity and recovery fail. See S01, S03. |
| F06 Trigger events/order | Partial | Explicit entry subscriptions prevent false entry triggers. Declaration targets and general trigger ordering remain wrong. See S04. |
| F07 Resolution continuation | Partial | Twin Embers has a special continuation. There is no general scheduler or reliable return to priority. See S01, S03, S09. |
| F08 Costs/independence | Partial | The validator accepts an opponent-owned controlled Backup. Offers, dull readiness, exact cost components, and zone costs remain incomplete. See S06, S08. |
| F09 Continuous effects | Partial | Base-power changes now precede modifiers. Control readiness and control derivation remain wrong. See S07. |
| F10 Shared legality | Partial | Controlled Burn includes friendly targets and Stillwater declarations use Summon zone/type checks. Offers and resolution remain separate. See S08. |
| F11 Card architecture | Partial | Forty separate files exist. Runtime still bypasses the new registry and operation contracts. See S09. |
| F12 Printed content | Open | Fifteen ability cards display “No abilities.” Ember Medic remains misclassified. See S10. |
| F13 Multi-card choices | Open | Browser still submits one option immediately. Allocation controls are absent. See S11. |
| F14 Payment drafts | Open | Automatic payment and immediate submission remain. See S12. |
| F15 Gestures/animation | Open | Native drag, clipped fan, incomplete arrows, no reorder or reduced-motion handling. See S13. |
| F16 Board/stack/zones | Open | One mixed row, duplicate Commander representations, physical-card-only stack, no public-zone browsers. See S14. |
| F17 Inspection/projection | Open | Inspect does not expose the other hand during priority. Client still reads authoritative state. See S15. |
| F18 Deck editor | Partial | Search and filters exist. Commander changes and Legend visibility improved. Input focus, card grid, inspection, and saved drafts remain incomplete. See S16. |
| F19 Save compatibility | Partial | Strict structural schemas and internal version checks exist. Manifest conservation and semantic continuation validation remain absent. See S17. |
| F20 Host ordering | Partial | Submit/import are asynchronous and serialized. Accepted receipts replay correctly. Start/restore/export/clear remain outside one lifecycle queue. See S18. |
| F21 Update safety | Partial | Host rejects update requests during an unfinished match. Real two-build update and offline-duel acceptance remain unproven. See S21. |
| F22 Presets | Open | Four advertised initial casts still lack payment. The End Phase preset meets S01. See S19. |
| F23 Loops/simultaneity | Open | No mandatory-loop detection. Departures still mutate sequentially. See S03, S20. |
| F24 Acceptance records | Open | Structural coverage and smoke checks still substitute for missing behavior and release evidence. See S21. |
| F25 Starting-player order | Fixed | `createMatch` presents the starting-player choice before opening draws. `answerChoice` then draws both hands and starts ordered mulligans. |

## Findings

Critical findings block required duel paths. High findings change rules or omit required MVP interactions.
Medium findings weaken maintainability or evidence. Each finding distinguishes executed evidence from source inspection.

### S01 - Answered choices can leave the duel without an actor

**Critical. Milestones 1-3. Reproduced: A02, A03, A04. Previous F02, F05, F07.**

`src/rules/engine.ts:113` clears an excess-Backup choice without restoring priority.
The generic handler branch at line 144 also lacks a general continuation or authority-restoration step.
`resolveDeparture` clears a Commander choice, but most callers have no continuation that restores the interrupted window.

An ordinary Archive Keeper entry draws a card and requests a discard.
After the accepted discard, both `choice` and `priority` are null, while `result` is null.
The same state occurs after an excess-Backup choice and an isolated Commander replacement.
Quartermaster, targeted auto abilities, Tide Witness, and End Phase choices use the same incomplete path.
Existing tests usually stop at the immediate effect, or after one pass following trigger ordering.

Repair requires a common scheduler with an explicit return window for every choice.
Every choice test must continue through the next legal command and survive save/reload at the interruption.

### S02 - Declaration priority and attack timing remain incorrect

**High. Milestones 1-2. Reproduced: A01, A08. Previous F01.**

`src/rules/casting.ts:81` and `src/rules/activation.ts:38` give priority to the opponent immediately.
`src/rules/triggers.ts:25` does the same for an entry auto ability.
This contradicts the retained declaration priority in rules 11.3.8, 11.6, and 11.7.

`declareAttack` checks the phase and authority, but does not require an empty stack or a distinct attack-declaration window.
A08 declares an attack while a stack object remains pending.
The attack preparation/declaration sequence therefore lacks a complete timing model.

Repair requires explicit timing windows shared by command validation and action offers.
Assert authority and stack state after declarations, passes, resolutions, and interruptions.

### S03 - Simultaneous departures lose their batch across replacements

**Critical. Milestones 1-2. Reproduced: A03. Source inspection. Previous F05, F07, F23.**

`src/rules/checkpoints.ts:10` computes a batch, then departs each card immediately.
When the first card requests a Commander choice, the remaining batch is not saved.
After the answer, a new checkpoint computes a different batch from the changed field.

Place Cinder Marshal Commander before its same-name variant in `state.field`.
The duplicate-name process requests the Commander destination first.
Return the Commander to its zone. The variant survives because the duplicate no longer exists.
Both cards must depart under rule 12.4.6. The existing regression places the variant first and misses this failure.

Twin Embers also damages and breaks targets sequentially through `dealForward`.
Its special continuation prevents one exception, but does not supply shared pre-event values or atomic departure semantics.
`resolveSummon` moves the Summon to the Break Zone before an interrupted resolution finishes.

Repair requires a saved operation batch, pre-event characteristics, all replacement decisions, then simultaneous application and trigger collection.

### S04 - Auto-ability targets and ordering still occur at the wrong time

**High. Milestone 2. Reproduced: A13. Previous F06.**

`src/rules/triggers.ts:16` pushes entry abilities with empty targets directly onto the stack.
Departure abilities also enter the stack in iteration order.
`src/content/shared/card-helpers.ts:21` asks for targets during resolution.

Frost Binder therefore exposes a response window without a declared target.
Only after both passes does the engine request that target.
This prevents meaningful target-based responses and differs from the declaration rules in section 11.8.
General simultaneous triggers lack turn-player/non-turn-player ordering before priority.

Repair requires trigger collection, legal declaration choices, explicit ordering, and target rechecks at resolution.
Optional draw and search decisions must remain resolution choices.

### S05 - First Strike and combat continuation remain incomplete

**High. Milestone 2. Reproduced: A09, A16. Previous F03, F04.**

`src/rules/combat.ts:84` applies its First Strike branch only when one attacker exists.
A First Strike blocker against a two-Forward party therefore exchanges ordinary simultaneous damage.
In A09, Tide Duelist incorrectly dies against Ash Recruits of 3000 and 5000 power.
Correct allocation kills the smaller attacker first, leaving insufficient party power to kill the blocker.

During single-attacker First Strike, departure triggers enter the stack immediately.
`passPriority` resolves that stack before normal battle damage.
A16 resolves Tide Witness while combat still says `normalDamage`, contrary to rule 15.2.3.3.
Rule 15.2.3.4 also requires every party member to have First Strike for party First Strike damage.

Repair requires a restricted checkpoint, deferred trigger declarations, shared damage values, and resumable party allocation.
Combat must also remove participants when control changes make them ineligible.

### S06 - Payment accepts illegal cost components and excessive CP generation

**High. Milestones 1-2. Reproduced: A06, A07, A15. Previous F08.**

`src/rules/activation.ts:31` overwrites source-cost flags instead of checking the declared payment against exact required components.
`src/rules/payment.ts` does not enforce continuous control for a dull-icon cost.
A freshly controlled Cinder Marshal can therefore use Flare Order immediately without Haste.

A normal Ash Recruit cast also accepts a same-name `specialDiscard` and discards an extra card without a printed special cost.
The validator checks exact spending but permits excessive generated CP.
A15 discards two Fire cards to generate four CP for a one-CP cast.
Rules 11.2.1.1 and 11.2.2.2 permit only the specified discard surplus, not arbitrary waste.

Sacrifice costs still call `moveCard` directly, outside the departure pipeline.
Repair requires exact cost validation, readiness checks, legal generation limits, and common cost operations with atomic rollback.

### S07 - Temporary control does not update readiness or derive remaining control effects

**High. Milestone 2. Reproduced: A05. Previous F09.**

`src/rules/continuous.ts:68` changes the controller without changing `controlledSinceTurn`.
A freshly stolen non-Haste Forward can immediately attack.
`expireTurnEffects` restores the owner directly and does not derive remaining control effects or record the new control interval.

Repair requires timestamped control effects and continuous-control tracking on gains and reversions.
The existing base-power/modifier repair can remain.

### S08 - Action offers, payment, and resolution still have separate legality rules

**High. Milestones 2-3. Source inspection. Previous F08, F10.**

`src/rules/actions.ts:25` still requires ownership and control for all candidate payment sources.
The payment validator now accepts controlled opponent-owned Backups, so the offer can hide a legal payment.
Special-payment offers reserve every same-name candidate instead of one selected discard.
Offer timing also omits the restricted First Strike window checked by casting and activation.

`Forge Apprentice` checks only the target's zone during resolution in `P-010C.ts:40`.
It does not recheck Forward type and Fire element through its declaration contract.
Other handlers repeat their own partial target checks.
`src/main.ts:77` and `legalDraftTarget` duplicate payment and targeting rules again.

Repair requires one declaration contract for offers, complete payment validation, and resolution rechecks.
The client must consume this contract without identifying card handlers.

### S09 - New execution contracts and registry are not the runtime architecture

**High. Milestones 1-3. Source inspection. Previous F07, F11.**

`createRegistry` has no production caller. `ExecutionFrame`, `OperationBatch`, and `ResumeRef` remain unused runtime contracts.
`src/content/manifest.ts` still combines mutable legacy handlers, and the host imports those handlers directly.
Card scripts mutate authoritative state and call rules functions directly.

`src/rules/priority.ts:127` names Rising Undertow behavior explicitly.
`src/rules/summons.ts:36` has a `twin-embers` fallback for a special continuation.
The new file structure therefore does not establish the approved one-card authoring contract.

Repair requires migration of actual matches to the versioned registry and scheduler.
Boundary checks must exercise runtime use, card-specific rules switches, and client state access.

### S10 - Fifteen cards still display false rules text

**High. Milestone 3. Catalog comparison and source inspection. Previous F12.**

The following ability cards retain `text: 'No abilities.'`:

`P-001L`, `P-007H`, `P-008H`, `P-010C`, `P-011R`, `P-012H`, `P-013R`, `P-014R`,
`P-021L`, `P-025R`, `P-027H`, `P-030C`, `P-032R`, `P-033R`, and `P-034R`.

`src/main.ts:417` uses this text for inspection.
Ember Medic remains `kind: 'special'`, despite having no `{S}` cost.
Card faces and inspection omit required metadata and effective field characteristics.

Repair requires a complete printed-text comparison, correct ability classification, and readable full inspection.

### S11 - Required multi-card and allocation decisions remain unusable in the browser

**Critical. Milestone 3. Playwright reproduction and source inspection. Previous F03, F13.**

`src/main.ts:488` submits one selected option for every non-order choice.
An End Phase discard of two cards therefore sends an invalid answer on each button click.
The new UI test imports that exact pending decision and observes the error instead of a local selection draft.
There is no Confirm control for that decision, nor an allocation input for party damage.
The attack handler at line 446 still submits exactly one member.

Repair requires typed choice components, reversible selection, counts, allocation totals, and explicit confirmation.
Mandatory decisions must remain open until a valid answer succeeds.

### S12 - Cast and ability flows still spend automatic payment without review

**High. Milestone 3. Source inspection. Previous F14.**

`makePayment`, `beginCast`, `castSummon`, and `sendAbility` choose sources automatically.
Characters submit directly. Targeted actions submit when the last target is selected.
The user cannot revise payment, review generated/spent CP, or choose a special discard before confirmation.
Escape does not cancel a draft. Click and drag do not provide the specified complete draft flow.

Repair requires one local action draft with mode, targets, costs, source selection, Confirm, and Cancel.
Cancellation must leave the engine sequence, transcript, and stored match unchanged.

### S13 - Hand clipping, gestures, animation, and reduced motion fail the design gate

**High. Milestone 3. Playwright and screenshot reproduction. Previous F15.**

`.hand-fan` combines horizontal scrolling with transformed cards.
The resulting vertical scroll clipping cuts off card names and the lifted hover card at both desktop sizes.
The [1280 hover capture](2026-10-07-second-audit/hand-hover-1280.png) shows the actual clipped result.

The client uses native HTML dragging without horizontal reorder or a shared gesture threshold.
The target overlay draws only selected lines, with no cursor arrow or snap feedback.
Final target submission removes the draft before review.
There are no event-driven card animations, combat arrows, or reduced-motion styles.
Phaser paints a static background only (`src/main.ts:12`).

Repair requires a separate hover layer, reachable overflow, shared pointer gestures, and a Phaser table driven by accepted events.

### S14 - Table hierarchy, stack, public zones, and control layout remain incomplete

**High. Milestone 3. Playwright, screenshots, and source inspection. Previous F16.**

`src/main.ts:413` places both players' Forwards and Backups in one wrapping row.
Controller identity is not visible on each card.
The [crowded board](2026-10-07-second-audit/crowded-board-1280.png) has no spatial distinction between the players' fields.

The Commander renders in both `commanderSlot` and `commanderTray` with the same interactive object ID.
Their rectangles visibly overlap. The opponent slot also renders the physical Commander after it leaves that zone.
The stack uses `stackCards`, so stack abilities have no card representation.
Damage, Break, and removed cards lack normal browsing. The log truncates to five events.

The selected-card actions extend beyond the footer at both sizes and use unequal peer heights.
At 1280 x 720, an action also fails pointer hit testing.
The [selected-action capture](2026-10-07-second-audit/selected-actions-1280.png) records this failure.
Starting-choice controls passed their height check, so unequal sizing is not a universal button defect.

Repair requires four controller/type rows, one interactive Commander representation, every stack object, zone browsers, and a complete log.

### S15 - Inspection remains coupled to decision authority

**High. Milestone 3. Playwright reproduction and source inspection. Previous F17.**

`src/main.ts:371` chooses `decision ?? inspectedSeat` for the visible hand.
Clicking Inspect during normal priority therefore leaves the same hand visible.
The renderer still consumes `host.getState()` rather than only projected views.
Import, new match, and authority changes do not consistently clear all draft variables.

Repair requires separate decision, inspection, and presentation state, plus projection-only rendering.
Inspection must expose the requested hand without changing rules authority or dismissing a mandatory choice.

### S16 - Deck search loses focus, and the editor remains a text-list interface

**High. Milestone 3. Playwright reproduction and source inspection. Previous F18.**

The input handler at `src/main.ts:267` replaces the complete editor DOM on each character.
Real sequential typing of `Tide` leaves only `T` in the input and loses focus.
The existing test uses `fill`, which does not expose the lost-focus sequence.

The catalog remains an `.editor-list` of text rows, without the required card grid or full inspection.
Incomplete drafts do not persist when the user leaves and reopens the editor.
Search, filters, Commander replacement, and unrestricted Legend visibility are useful partial repairs.

Repair requires stable input components, a card grid, full inspection, persistent incomplete drafts, and legal-deck start checks.

### S17 - Save schemas do not enforce conservation or valid continuation semantics

**High. Milestones 1 and 3. Reproduced: A10, A11. Previous F19.**

`src/storage/save.ts` now rejects malformed shapes and inconsistent version headers.
However, continuation payloads are arbitrary JSON and their handler/step strings need only be nonempty.
A save with an unknown choice handler imports successfully, then cannot answer that choice.

`assertInvariants` checks surviving cards against zones, not against an immutable match manifest.
Removing an ordinary card from both the deck and `cards` passes conservation and schema checks.
An empty transcript with the same altered origin and final state also defeats replay-based consistency checks.

Catalog hashing includes metadata, not executable behavior versions.
Startup ignores incompatible-restore reasons, and the home screen lacks raw-save export after failed restore.
Repair requires manifest conservation, semantic reference/payload checks, behavior pinning, and visible recovery with original-data export.

### S18 - Match lifecycle operations are not serialized with commands

**High. Milestone 3. Reproduced: A17. Previous F20.**

`submit` and `importSave` use `commandQueue`, but `start` and `startScenario` mutate state immediately.
A17 queues an opening answer, starts another match, then observes the old command accepted into the new match.
Both matches reuse sequence and choice IDs. Commands carry no match identity.

`restore`, `exportSave`, and `clearSave` also lack one shared lifecycle ordering contract.
The existing revisions and save queue improve some races but do not fence old-match commands.
Repair requires a serialized lifecycle and a match identifier/generation checked at execution time.

### S19 - Focused scenarios still cannot reach their advertised interactions

**High. Milestones 2-3. Reproduced: A12. Previous F22.**

`src/scenarios/catalog.ts` retains the previous unaffordable positions:

| Scenario | Immediate blocker |
|---|---|
| Third Commander Cast | Seven CP required, four available from hand, three dull Backups |
| Two EX Bursts | Final Spark has no payment sources |
| Borrowed Banner Conflict | Borrowed Banner has no payment sources |
| Commander Destinations | Return Tide has no payment, and the position does not supply the advertised stolen Commander interaction |

The party preset also lacks a way to declare its party through the UI.
The End Phase preset can begin, but later choices encounter S01.
Loading a fixture and checking card placement does not establish its advertised transcript.

Repair requires a complete accepted command sequence for every preset, including decisions, outcome expectations, and recovery points.

### S20 - Mandatory-loop handling remains absent

**High. Milestones 1-2. Source inspection and acceptance gap. Previous F23.**

The result type contains `loop`, but no runtime path establishes a forced repeating state and returns that draw.
There is no corresponding complete executable scenario.
The original acceptance table explicitly requires mandatory-loop handling even though the placeholder cards do not naturally cover it.

Repair requires synthetic headless fixtures and semantic repetition detection at legal scheduler boundaries.
A processing budget must remain an engine error unless the engine establishes a mandatory loop.

### S21 - Coverage and release evidence still do not establish completion

**High. Milestones 1-3. Source inspection and acceptance gap. Previous F21, F24.**

`scripts/check-coverage.mjs` checks strings, module counts, and existing paths.
It does not require successful executed scenarios for each behavior.
The damage-victory transcript gives Player 2 no meaningful card play.
That test context also omits the runtime power/replacement providers used by the host.

The release records still report 101 tests and acknowledge missing full offline and unscripted duels.
No complete cached contested duel, real two-build update transition, or full seven-state Arena comparison is recorded.
The new visual audit supplies failure evidence, not release approval.

Repair requires behavior-to-test mapping, production-equivalent context, completed offline/recovery transcripts, and reviewed visual evidence.
The service-worker update guard must remain, with real browser lifecycle acceptance added.

### S22 - Opponent-turn Rising Undertow loses its delayed discard

**High. Milestone 2. Reproduced: A14. Related F06, F09.**

`risingUndertowSummon` schedules its delayed effect with `expiresTurn` equal to the current turn.
End Phase processing collects only effects controlled by the active player.
If Player 2 casts it during Player 1's turn, Player 1's cleanup deletes the effect before Player 2's End Phase.
The required discard never occurs.

Repair requires a one-shot delay keyed to the next End Phase of its controller.
Its lifetime must not use the current turn's temporary-effect expiry.

## Visual reference review

The review inspected two official Arena frames from [Dev Diary: Sylvan Library](https://magic.wizards.com/en/news/mtg-arena/dev-diary-sylvan-library).
The [selection frame](https://media.wizards.com/2026/images/daily/uV4gKhqzHC.webp) shows separated fields, a right-side ability, and readable selection context.
The [ordering frame](https://media.wizards.com/2026/images/daily/iQyNSyMtC5.webp) shows large card choices, explicit order, and final confirmation.

The current Dissidia captures lack that spatial ownership and card-focused choice hierarchy.
Intentional adaptations remain the light theme, FFTCG terminology, seven damage, Commander zones, and bottom-left contextual controls.
Arena's partly tucked idle hand does not justify clipping a lifted card's name or blocking its hit area.
No Arena artwork is added to the application.

This is a limited comparison of choice/ordering references.
Idle, hover, casting, targeting, choice, stack, and deck-editor comparisons still require a complete release review.

## Changes made during this audit

This audit adds the report, its evidence, and a [repair design](../specs/2026-10-07-dissidia-mvp-second-audit-repair-design.md).
It also adds `playwright.ui-design.config.ts`, `tests/ui-design/layout.spec.ts`, and two npm commands.
The dedicated command builds a fresh release and uses an isolated preview port.
The application and rules implementation remain unchanged.

Run `npm run test:ui-design` for the focused design pass.
Run `npm run test:ui-design:report` to inspect screenshots, errors, traces, and videos.
Failures remain visible until the corresponding implementation changes pass their acceptance checks.

The [repair design](../specs/2026-10-07-dissidia-mvp-second-audit-repair-design.md) maps S01-S22 and every previous finding to concrete repair and acceptance requirements.
