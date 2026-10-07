# MVP branch audit

Date: 2026-10-07

Branch: `feature/mvp-game-design-spec`

Audited revision: `9341328`

Baseline: `main...9341328` (94 changed files). The working tree was clean before this audit.

## Scope and conclusion

This audit compares all branch changes with [the approved MVP design](../specs/2026-10-06-dissidia-mvp-design.md).
The acceptance target is the complete first three milestones.
The supplied [FFTCG Comprehensive Rules v3.3](../../fftcg-comprules-v3.3.pdf) remains the rules authority.

The branch provides a useful foundation, but none of the three milestone exit gates is fully established.
Milestone 1 lacks complete rule checkpoints and some foundation guarantees.
Milestone 2 has reproducible interaction defects and missing combat systems.
Milestone 3 lacks required interactions and complete offline acceptance evidence.

The requested light theme is a new design adjustment, rather than a violation of the original visual direction.
Independent card scripts strengthen the original typed-handler architecture.
The present distribution of card behavior contradicts that architecture's separation of responsibilities.

## Verification evidence

| Check | Result at the audited revision | Limit |
|---|---|---|
| `npm test` | 101 tests passed across 28 files | Passing assertions include incomplete or incorrect rules behavior |
| `npm run build` | Passed, including both TypeScript checks and service-worker generation | Build success does not establish rules or release acceptance |
| `npm run check:boundaries` | Passed | Checks platform imports, rather than card-specific behavior in rules |
| `npm run check:coverage` | Passed: 40 cards, two 19-card decks, 25 linked test files | Checks structure and file existence, rather than executed behavioral coverage |
| `npm run test:e2e` | 10 browser tests passed | Mostly setup, basic casting, storage, and offline reload |
| Temporary diagnostic probes | 11 probes reproduced suspected defects | Asserted current incorrect behavior, rather than desired acceptance behavior |
| Additional browser probe | Inspect Player 1 still showed Player 2's hand | Confirmed inspection failure during Player 2 authority |
| Local visual inspection | Inspected a 1280 x 720 control-conflict scenario screenshot | Observed dark surfaces, mixed battlefield rows, and overlapping Commander representations |

The temporary probes used the existing fixture builder and command reducer.
They were removed after the audit. No application code changed.
The production build emits a bundle-size warning, but its generated bundle remains within the configured precache limit.
No bundle-size defect was established.

## Findings

Severity meanings: **Critical** blocks a required duel path. **High** changes rules behavior or omits a required feature.
**Medium** weakens recovery, maintainability, or acceptance evidence.
Evidence marked **reproduced** came from an executed diagnostic or browser probe.
Other findings came from source inspection or an explicit gap in the acceptance record.

### F01 - Combat resolves before responses on the stack

**Critical. Milestones 1-2. Reproduced.**

`src/rules/priority.ts:88` checks combat before the stack.
An attacker can deal player damage while a responding Return Tide remains unresolved on the stack.
The same branch can bypass any response ability during combat.
`src/rules/combat.ts:28` also gives the defender immediate priority after attack declaration.
Rule 10.1.2.6 gives the turn player priority before the block declaration step.
Casting and activation also transfer priority immediately (`casting.ts:100`, `activation.ts:51`).
Rules 11.3.8, 11.6, and 11.7 preserve the declaring player's priority.

**Required repair:** Use explicit combat steps and a common priority scheduler. Resolve the stack before advancing the current step.
Assert authority after every declaration, pass, resolution, and decision.

### F02 - End Phase trigger ordering deadlocks

**Critical. Milestone 2. Reproduced.**

`src/rules/engine.ts:76` consumes a trigger group without clearing its answered choice.
`openTriggerOrder` leaves that choice present when the final group finishes (`priority.ts:11`).
The stack receives the ordered abilities, but subsequent passes fail with `DECISION_REQUIRED`.
The existing End Phase test checks stack contents and priority, but never continues the duel.

**Required repair:** Consume choices exactly once. Continue through every ordered ability, cleanup, and the next turn in acceptance tests.

### F03 - Parties and damage allocation are absent

**High. Milestone 2. Source inspection.**

`src/rules/combat.ts:15` rejects every attack with more than one member.
The protocol has no implemented allocation action or party decision flow.
The party preset cannot exercise its advertised interaction.
Rules 10.1.2.1, 10.1.4.2.1, and 15.1.1.9 require same-element parties and defending-player allocation.

**Required repair:** Support one sequential attack by either a single Forward or a legal party.
Support one ordinary blocker and damage allocation in multiples of 1000.
Do not add MTG-style simultaneous attacks or unrestricted multiple blockers.

### F04 - Brave, Freeze, blocking, and First Strike are incorrect

**High. Milestone 2. Brave and blocker dulling reproduced.**

`src/rules/combat.ts:23` dulls every attacker, including Brave Forwards.
`combat.ts:37` dulls a blocker, although ordinary blocking does not require dulling.
`combat.ts:19,35` rejects frozen active Forwards from attacking or blocking.
Freeze prevents the next Active Phase activation, rather than those declarations (rule 15.2.4).
First Strike uses inline damage calls without the restricted intermediate rule checkpoint (rule 15.2.3.3).
With two First Strike combatants, later power calculation can occur after the first departure removes a field bonus.
`wasBlocked` is recorded but ignored when a blocker leaves.

**Required repair:** Implement these rules within the combat scheduler.
Preserve once-per-turn tracking, blocked status, simultaneous damage, and the restricted First Strike checkpoint.

### F05 - General rule processes are absent

**High. Milestones 1-2. Zero-power and excess-Backup survival reproduced.**

`src/rules/outcomes.ts:3` handles defeat, but no common checkpoint handles all field rules.
Zero-power Forwards survive normal priority checks.
Power reduction can make existing damage lethal without a departure.
Borrowed Banner can leave six Backups, duplicate non-Generic names, or conflicting Light/Dark Characters on the field.
`priority.ts:61` performs only a limited zero-power check at End Phase.

**Required repair:** Resolve rules 12.4.1-12.4.8 at their permitted checkpoints until the state settles.
Collect simultaneous departures together. Ask which excess Backups leave.
Apply Commander replacement decisions before the departures occur.

### F06 - Trigger events, declaration targets, and ordering are incorrect

**High. Milestone 2. Incorrect entry triggers reproduced.**

`src/rules/triggers.ts:12` schedules every auto ability on entry.
Cinder Witness, Tide Witness, Night Regent, and Mist Caller therefore trigger on their own entry without the required event.
Departure triggers go directly onto the stack in field iteration order.
`src/content/handlers.ts:111` chooses auto-ability targets during resolution, after both players passed.
The intended targets therefore remain unknown during the response window.
Only End Phase triggers use the partial ordering mechanism.

**Required repair:** Declare trigger subscriptions in card scripts.
Collect triggers during events, then process rule checks, turn-player ordering, non-turn-player ordering, modes, and targets before priority.
Keep resolution-time choices separate from declaration-time targets.

### F07 - Choices do not preserve a complete resolution continuation

**Critical. Milestone 2. Source inspection.**

Commander departure pauses only that movement (`src/rules/commander.ts:33`).
The caller continues its other effects and can complete combat or Summon resolution.
Twin Embers can request two Commander departures, causing the second request to throw because the first choice remains open.
Battle damage can continue against a Commander that still awaits departure.
`state.work` has no general dispatcher for arbitrary handler continuations.
Resolution choices can also leave non-null priority until a later specialized path restores it.

**Required repair:** Save the complete execution position, remaining operations, event batch, and authority-restoration step.
Pause the scheduler for a choice. Resume its exact next step after the answer.

### F08 - Costs and ability independence have gaps

**High. Milestones 1-2. Stolen-Backup payment rejection reproduced.**

`src/rules/payment.ts:30` requires both ownership and control for a field CP source.
A legally controlled opposing Backup cannot produce CP.
`activation.ts:43` does not enforce continuous control or Haste for the dull icon.
It also accepts an unrequired special discard on an ordinary action ability.
`commitPayment` moves a sacrificed source directly through `moveCard`, bypassing departure triggers and replacements.
Activation saves source information, but lacks one common declaration and resolution contract for independent abilities.

**Required repair:** Derive exact cost components from the declared ability.
Use ownership for hand costs and control for field costs.
Reject unrequired payment fields and duplicate use across every cost component.
Apply zone costs through the event pipeline. Preserve the resulting independent stack object.

### F09 - Continuous power and temporary control use incorrect rules

**High. Milestone 2. Modifier erasure and stolen-Forward readiness reproduced.**

`src/rules/continuous.ts:12` applies power changes in insertion order.
War Cry followed by Shape Tide produces 4000 rather than a base of 4000 plus the 3000 modifier (rule 11.3.10).
`changeControl` does not update continuous-control readiness.
`expireTurnEffects` returns control to the owner rather than deriving the remaining control effects.
Field effects use hard-coded Banner Smith handling rather than the general ordering contract.

**Required repair:** Separate base-power changes from modifiers.
Apply supported effect categories, dependencies, and timestamps under rule 11.12.
Derive control from active effects and track continuous control through both gains and reversions.

### F10 - Legal offers, declaration checks, resolution checks, and UI rules disagree

**High. Milestones 2-3. Controlled Burn omission reproduced.**

`src/rules/actions.ts:50` limits Controlled Burn to opposing cards, although its text permits either player's legal target.
Stillwater declaration checks any matching stack source, rather than specifically a Summon (`casting.ts:74`).
Activated abilities recheck only some original restrictions in `src/content/handlers.ts`.
Forge Apprentice can resolve against a Forward that no longer meets its Fire restriction.
The offer generator excludes all same-name special-payment candidates from CP, rather than reserving only the selected special discard.
The client duplicates costs and targeting rules in `src/main.ts:127,167,206`.

**Required repair:** Use one card-provided contract for target enumeration, complete declaration legality, and resolution rechecks.
Calculate availability from at least one complete legal declaration and payment.
The UI consumes offers instead of identifying handlers.

### F11 - Card-specific behavior is embedded throughout rules and client code

**High. Milestones 1-3. Source inspection and requested architecture adjustment.**

Card switches appear in `summons.ts`, `activation.ts`, `targets.ts`, `triggers.ts`, `continuous.ts`, `damage.ts`, `priority.ts`, and `engine.ts`.
The client adds more switches in `main.ts`.
`src/content/handlers.ts` is already a growing shared implementation file.
Adding a card therefore requires changes across multiple layers.

**Required repair:** Use independent typed card modules, a versioned registry, and shared generic operations.
Keep Commander behavior in a format extension. Keep keywords and ordinary timing in rules.

### F12 - Printed content and inspection omit or misclassify abilities

**High. Milestone 3. Source inspection.**

Many cards with abilities retain `text: 'No abilities.'` in `src/content/opus-ph.ts`.
These include Cinder Marshal, Tide Warden, Dusk Reaver, and Banner Smith.
`src/main.ts:400` shows this text in the inspection area rather than the abilities.
Ember Medic has no `{S}` cost, but its catalog ability kind is `special` rather than `action`.
Cards omit most provenance, rarity, keyword, generic, damage, and effective-power information from readable inspection.

**Required repair:** Audit every metadata field and ability against all 40 spec definitions.
Keep display text separate from executable behavior, but require both to agree.
Show full inspection and current effective characteristics.

### F13 - Mandatory multi-card decisions cannot be submitted

**Critical. Milestone 3. Source inspection.**

`src/main.ts:461` submits one option immediately for every non-order choice.
A hand-limit decision requiring two or more discards therefore fails each submission.
Card clicks append selections but have no matching multi-card Confirm action.
Generic allocation controls are absent.

**Required repair:** Implement choice components by selection type, count, order, and allocation contract.
Provide selection revision and explicit confirmation. Required rules decisions cannot be canceled.

### F14 - Casting and abilities lack explicit payment drafts

**High. Milestone 3. Source inspection.**

`src/main.ts:72` chooses CP sources automatically.
Casting submits immediately for Characters or after the final target for Summons.
Special discard selection can collide with the automatically chosen CP discard.
There is no explicit generated/spent CP display, payment-source selection, or final Confirm step.
Escape has no handler. Targets and payment cannot be revised after the automatic submit.

**Required repair:** Use one local draft for click and drag paths.
Let the user choose modes, targets, CP sources, special discards, and spending before confirmation.
Cancel and Escape leave rules state and saved progress unchanged.

### F15 - Hand, targeting, animation, and overflow requirements are incomplete

**High. Milestone 3. Source and visual inspection.**

The HTML drag flow has no horizontal hand reordering or shared threshold gesture model.
The targeting overlay draws selected-target lines, rather than a cursor arrow with snapping and numbered markers.
The final target submits immediately, which removes the arrow before review.
There are no combat arrows, card movement animations, or reduced-motion behavior.
The scrolling fan can clip lifted cards. Neighbor spreading and every overflow interaction lack acceptance evidence.

**Required repair:** Implement the specified gestures, targeting feedback, event animation, overflow browsing, and reduced-motion presentation.
Use Phaser for the animated table, as required by the original architecture.

### F16 - Board hierarchy, stack display, and Commander identity are incomplete

**High. Milestone 3. Source and visual inspection.**

`src/main.ts:392` puts both players' Forwards and Backups in one wrapping battlefield row.
The stack display uses physical `stackCards`, so abilities have no visible stack representation.
The controlled Commander appears both beside the hand and in its zone as a second selectable card representation.
At 1280 x 720, these representations overlap nearby cards in the inspected preset.
The opponent Commander slot renders the physical instance even when it leaves the Commander Zone.
Damage and removed cards lack normal browsing controls. The log shows only the last five entries.

**Required repair:** Separate field rows by seat and type. Show every stack object in a readable column.
Use one interactive representation per card instance, plus a non-interactive zone summary.
Add ordered Damage Zone, Break Zone, and removed-card browsing, and a complete readable log.

### F17 - Inspection is coupled to authority, and the client reads authoritative state

**High. Milestone 3. Inspection failure reproduced.**

`src/main.ts:345` derives the bottom seat from the decision before the inspected seat.
The inspection button therefore cannot display the other hand while priority or a choice exists.
The client frequently reads `host.getState()` and renders authoritative cards instead of its projected view.
Draft state also persists across authority changes and imported or newly started matches.

**Required repair:** Separate control seat, inspection seat, and presentation state.
Render only host projections. Clear stale drafts when their authority or source objects change.
Expose explicit offline inspection through the protocol while preserving concealed-seat tests.

### F18 - Deck editing misses the required browser interaction

**High. Milestone 3. Source inspection.**

`src/main.ts:263` uses two text lists, without a card grid, search, element/type filters, or full card inspection.
It hides every Legend card except the designated Commander, even when another Legend is legal in the main deck.
Changing a Commander fails while the old complete deck remains incompatible, preventing normal reconstruction.
The editor saves only complete legal decks and lacks a practical incomplete editing state.

**Required repair:** Use a card grid and deck list with search, filters, inspection, and available-card labels.
Allow incomplete drafts and Commander changes. Show legality errors and block invalid match starts.

### F19 - Save compatibility and corruption handling are incomplete

**High. Milestones 1 and 3. Malformed import and missing-card invariants reproduced.**

`inspectSave` trusts `versions` after a TypeScript cast and can throw before the import catch block.
Invariants check surviving cards rather than the original match manifest, so a deleted card can pass conservation checks.
Pending choices, continuations, counters, and internal version agreement lack full runtime schemas.
`src/rules/setup.ts:50` derives catalog identity from `P-001L`, rather than the supplied content manifest.
Incompatible restore returns a reason that startup ignores (`main.ts:480`).
The original stored data has no explicit export path after failed compatibility checks.

**Required repair:** Parse and check the complete envelope, manifest, versions, state, transcript, and continuation handlers.
Explain rejected recovery and preserve the original data for export.
Derive catalog and behavior versions from the registry manifest.

### F20 - Host persistence, import, and receipt ordering have gaps

**Medium. Milestone 3. Source inspection.**

`LocalHost.submit` returns and publishes before its queued IndexedDB save completes.
Import writes outside the existing save queue, allowing older pending writes to overwrite imported data.
Restored command receipts all reference the final state, rather than each original result.
The synchronous API does not establish the promised Web Worker-compatible command boundary.

**Required repair:** Serialize commands and storage operations through an asynchronous host interface.
Expose saved and unsaved progress accurately. Preserve idempotent receipts across recovery.
Prevent stale writes after import, clear, restore, or a new match.

### F21 - Service-worker update safety is not enforced

**High. Milestone 3. Source inspection.**

The active-match menu offers Install update and calls `applyUpdate(true)` (`src/main.ts:335`).
The boolean bypasses any host check for an unfinished match.
A resumed client can therefore use a new bundle against a pinned old engine or catalog.
Offline reload is tested, but full offline duel, pending-choice resume, and update transitions are not.

**Required repair:** Enforce update eligibility from match state at the host boundary.
Defer activation until the match ends or the user explicitly abandons it.
Keep the cached rules and content version consistent during every reload.

### F22 - Focused presets do not reach their advertised decisions

**High. Milestones 2-3. Source inspection.**

The third-cast preset supplies only four immediately available CP against a seven-CP cast and three dull Backups.
The multi-EX preset gives Final Spark no payment sources.
The control-conflict preset also lacks CP to cast Borrowed Banner.
The Commander destination preset lacks payment for Return Tide, does not transfer Commander control, and puts witnesses under different controllers.
The End Phase preset can pay for Rising Undertow, but its resulting two-trigger sequence encounters F02.
Tests load presets and assert card placement, rather than complete their advertised command sequences.

**Required repair:** Give each preset a deterministic accepted transcript to its expected decision and outcome.
Use the exact supplied deck instances and validated reachable state.
Include replacement, opponent control, trigger order, and recovery during those transcripts.

### F23 - Mandatory-loop handling and simultaneous acceptance are incomplete

**High. Milestones 1-2. Source inspection and acceptance gap.**

The result type includes `loop`, but no implementation establishes a mandatory loop and declares its draw.
The suite lacks complete simultaneous-rule-process, damage, departure, and defeat scenarios.
Sequential mutation can change field effects and triggers before other simultaneous results occur.

**Required repair:** Add semantic loop detection for forced repeating processes and synthetic headless fixtures.
A processing budget failure remains an engine error unless a mandatory loop is established.
Batch simultaneous events and check their shared pre-event information.

### F24 - Coverage and release records do not prove milestone completion

**Medium. Milestones 1-3. Acceptance gap.**

The coverage script checks paths and allowlists, rather than successful behavior scenarios.
Some tests stop before the state settles. Some assert immediate opponent priority after casting.
Metadata tests check only part of the printed catalog.
Normal-start damage victory gives Player 2 no meaningful actions, so it does not exercise a contested duel.
There is no recorded complete cached offline duel or unscripted full duel.
`docs/ui-reference.md` explicitly lacks Arena frame comparisons.
Reduced motion, targeting, cancellation, overflow, and all mandatory choices lack browser acceptance coverage.

**Required repair:** Track each original requirement and each card behavior with executable scenario IDs and expected transitions.
Complete all milestone exit gates and record evidence. Keep unproven items open.

### F25 - Starting-player choice occurs after opening hands are drawn

**High. Milestone 1. Source inspection.**

`src/rules/setup.ts:91` draws both opening hands before presenting the randomized player's first-or-second choice.
The UI can therefore expose opening-card information before that choice.
Rule 8.2.1.2 requires the choice before opening draws under rule 8.2.1.3.

**Required repair:** Choose the starting player before drawing either opening hand.
Then draw both hands and offer mulligans in the required order.
Assert the visible setup sequence, rather than only its final card counts.

## Positive coverage and scope limits

The branch supplies the 40 placeholder identities and both 19-plus-one decks.
Deck-size profiles, singleton validation, seeded setup, mulligan ordering, and first-turn draw have useful tests.
Stable Commander identity, tax history, basic return choices, exact CP spending, and rejected-command rollback have useful foundations.
Ordered EX offers, no EX response window, save snapshots, transcript replay, and seat projections exist.
The host displays persistence errors and the release precaches its local bundle.
These foundations can remain while the interaction scheduler and contracts change.

The audit does not require the full real-card catalog, online hosting, matchmaking, mobile UI, or production art.
Light/Dark Commander identity remains the original deferred format decision.
The audit does not claim that every possible rules interaction was exhaustively explored.
It covers the changed components, original milestone requirements, and the reproduced defects listed here.

## Repair design

The companion [repair design](../specs/2026-10-07-dissidia-mvp-audit-repair-design.md) maps every finding to implementation requirements and acceptance gates.
