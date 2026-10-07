# Dissidia MVP: second-audit repair design

Date: 2026-10-07 (Asia/Singapore)

Status: Approved by the user for implementation planning on 2026-10-07. Application repairs are not implemented by this document.

Implementation plan: [Second-audit repair plan](../plans/2026-10-07-dissidia-mvp-second-audit-repair.md).

Branch baseline: `feature/mvp-game-design-spec` at `89828a6`.

## 1. Goal and authority

Complete the first three milestones of the [original MVP design](2026-10-06-dissidia-mvp-design.md).
Close every finding in the [second audit](../audits/2026-10-07-mvp-second-branch-audit.md).
Retain the valid requirements from the [first repair design](2026-10-07-dissidia-mvp-audit-repair-design.md).

The supplied FFTCG Comprehensive Rules v3.3 and the documented Commander overrides remain authoritative.
The MVP keeps exactly 40 Opus Placeholder definitions and two supplied 19-plus-one decks.
The production profile stays 49-plus-one.
Milestones 4-6, mobile UI, online services, production art, and Light/Dark Commander identity remain deferred.

The visual target remains desktop Magic Arena, with the approved bright theme and original assets.
This design adds a repeatable Playwright UI/UX gate with monitored results and visual review.
A passing smoke suite alone cannot close that gate.

## 2. Approach and boundaries

| Approach | Benefit | Limitation |
|---|---|---|
| Complete the existing registry, scheduler, host, and table boundaries | Preserves working rules, data, tests, and build tooling | Requires migration of live execution, not only new types |
| Patch handlers and CSS individually | Small local changes | Leaves lost continuations, repeated legality rules, and layout collisions |
| Rewrite the engine and client | Permits new interfaces throughout | Discards useful work and increases the regression surface |

The recommended approach is the first option.
Deliver it in three dependent stages: rules execution, host recovery, then interactive table and release acceptance.
UI layout work can begin with deterministic projected fixtures while rules repairs proceed.
Final UI acceptance must use the repaired production host.

| Component | Responsibility | Boundary |
|---|---|---|
| Rules scheduler | Commands, operations, checkpoints, choices, authority, outcomes | Pure TypeScript, deterministic inputs, JSON state |
| Card registry | Reviewed metadata, versioned scripts, declaration and resume contracts | Card modules request generic operations |
| Commander extension | Designation, source permission, tax, departure replacement | Uses the same operation and choice pipeline |
| Local host | Match lifecycle, persistence, receipts, projection, update eligibility | Asynchronous serialized requests |
| Presentation controller | Projected view, local drafts, inspection, gestures | No authoritative state or card-handler switches |
| Phaser table | Cards, field layout, movement, arrows, effects | Accepts view and event presentation data |
| HTML controls | Accessible controls, card inspection, choices, menus, editor, log | Uses the same drafts and layout geometry as the table |
| Acceptance tools | Rules scenarios, browser checks, visual records | Results map to requirements and the audited revision |

The implementation removes the legacy execution path after migration.
An unused new interface does not count as a completed repair.

## 3. Deterministic execution and choice recovery

Addresses S01-S04, S09, and S20.

The scheduler runs after every accepted command until it reaches one externally meaningful state:

- A legal priority window with one actor.
- A required choice with one actor and null priority.
- A completed match.
- A reported engine error with the prior accepted state preserved.

A live stable state with no choice, no priority, and no result is invalid.
The scheduler must not depend on a browser animation or a later unrelated command to make progress.

Every execution frame contains the source snapshot, controller, targets, mode, operation position, and return window.
Its continuation identifies the script, behavior version, ability, named step, and schema-checked payload.
Remaining operations and event batches are JSON data.
No function, closure, or unexplained handler string enters a save.

The scheduler suspends the complete frame before it presents a required choice.
An answer consumes that choice exactly once, resumes the frame, and restores authority through the appropriate checkpoint.
This applies to setup, target declaration, search, discard, trigger order, Commander return, EX Burst, and party allocation.

Summon cleanup occurs after its complete resolution frame, including every replacement and nested choice.
The Summon remains in its resolving presentation until cleanup produces the zone-change event.
Independent activated abilities retain their source snapshot after source departure.

### Simultaneous operations

A simultaneous batch captures affected objects, applicable characteristics, last-known information, and event observers before mutation.
All replacement decisions complete before the batch applies.
The saved batch survives each decision. A later answer must not recompute its original membership from the partially changed field.

The engine applies the final movements and damage as one batch, then collects actual-event triggers.
Destination-specific triggers observe the actual replaced destination.
Departure triggers still observe a Commander that returns to the Commander Zone.
Permutation of field storage order cannot change the result.

Ordered instructions remain separate batches.
“Draw, then discard” therefore preserves its sequence, while Twin Embers uses shared damage and departure semantics.

### Rule checkpoints and loops

Named checkpoints define which rule processes and triggers are permitted.
The ordinary checkpoint handles all applicable defeat, field-limit, power, and lethal-damage processes until the state settles.
Excess-Backup selection uses the common choice scheduler.

Mandatory-loop detection compares semantic states at forced-processing boundaries.
Its signature includes pending operations and choices, but excludes incidental event IDs and counters that do not change legal behavior.
The engine declares a draw only when the same forced cycle repeats and neither player can stop it.
Optional actions and decisions are not mandatory loops.
A processing budget returns a diagnostic engine error unless the mandatory cycle is established.

Synthetic fixtures cover forced loops, optional exits, and budget failures without expanding the playable catalog.

## 4. Priority, triggers, and combat

Addresses S02, S04, S05, and S22.

After a legal declaration, the declaring player regains priority through the common checkpoint.
After a resolved stack object, the turn player gains priority through that checkpoint.
Two consecutive passes resolve one stack object or advance one permitted empty-stack timing window.
Every accepted action resets the pass count as required by its timing contract.

Attack preparation, declaration, block declaration, damage, and finish are explicit windows.
An attack declaration cannot bypass a pending stack or the preparation window.
The turn player keeps priority after declaring an attack.
Normal blocking does not dull the blocker.
Brave avoids attack dulling but does not permit a second attack that turn.
Freeze affects the next Active Phase activation, not an otherwise legal active attack or block.

### Trigger declarations

Card scripts declare their event subscriptions and target contracts.
The engine collects triggered abilities during events and checks rule processes before putting ordinary triggers onto the stack.
The turn player orders their simultaneous triggers first, then the other player orders theirs.
Each group clearly states stack order and resulting resolution order.

Mode and target choices required at declaration complete before opponents receive priority.
An ability with no legal required target leaves under the applicable trigger rule.
Optional draw, search, and similar resolution decisions remain inside the resolution frame.
All target restrictions and object identities are checked again at resolution.

### First Strike and parties

One attack contains either one eligible Forward or a same-element party.
The normal defending action chooses one blocker or no block.
The defender assigns party damage in increments of 1000 under rule 10.1.4.2.1.

First Strike applies to a party only when every member has that trait.
The engine snapshots the relevant damage values, applies First Strike damage, and runs the restricted intermediate checkpoint.
Neither player can cast a Summon or activate an action/special ability in that checkpoint.
Triggered abilities wait until normal battle damage finishes, as rule 15.2.3.3 requires.

Normal damage uses the remaining eligible participants and their applicable characteristics.
Control changes, zone changes, and loss of a blocker update combat participation under the rules.
Blocked status remains distinct from the continued presence of a blocker.
Commander choices and party allocation save and resume the exact combat step.

### Delayed effects

Rising Undertow creates a one-shot trigger for the next End Phase of its controller.
Its controller and pending status persist independently of the source's current zone.
Current-turn cleanup does not expire that trigger during another player's turn.
The engine consumes it once when the matching End Phase begins.

## 5. Costs, continuous effects, and shared legality

Addresses S06-S08.

A declaration contract supplies timing, legal source zones, modes, target restrictions, and exact cost components.
Offers, complete command validation, and resolution rechecks use that contract.
An offer is playable only when at least one complete legal declaration and payment exists.

Payment distinguishes CP discards, Backup dulling, special discards, source dulling, and source sacrifice.
Hand costs use ownership. Field costs use control.
Only one selected same-name card is reserved for each special discard.
Other eligible candidates remain available for other costs when the rules permit them.

The engine rejects extra payment fields and duplicate source use across incompatible cost components.
It does not silently overwrite an invalid declaration.
Dull-icon costs require the correct continuous-control interval or Haste.
Cost validation uses the ability's elemental requirements rather than assuming the source's printed base cost.

Generated and spent CP are separate values.
Spending must equal the locked cost, and generation must obey the surplus limits in the supplied rules.
Tests include a legal odd-cost discard and an illegal four-generated/one-spent payment.
Light/Dark discard prohibition and their casting exceptions remain unchanged.

Payment commits once after all declaration choices and checks succeed.
Zone costs use the common event/replacement pipeline.
An invalid command leaves cards, counters, sequence, transcript, and saved state unchanged.

Continuous effects derive control before dependent characteristics.
Base-power changes precede modifiers. Supported dependencies and timestamps follow rule 11.12.
Control gains and reversions update the continuous-control interval.
Expired control effects reveal the remaining effective controller, rather than assigning the owner unconditionally.

## 6. Live registry and exact content

Addresses S09-S10 and behavior pinning in S17.

Each of the 40 card modules exports metadata, behavior version, declaration contracts, trigger subscriptions, and resumable resolution steps.
Shared helpers contain generic operations and predicates.
The production host constructs the registry and passes it to the rules engine.
Card-specific names and handler branches leave the rules and client modules.

The registry rejects duplicate numbers, duplicate ability IDs, missing handlers, invalid metadata, unknown steps, and incompatible payloads.
Every saved continuation refers to a registered versioned step.
The catalog identity includes metadata and behavior versions.
Behavior changes require a new pinned identity even when printed text stays unchanged.

All 40 printed definitions receive an independent comparison against the original spec table.
That comparison includes rules text, jobs, category, rarity, elements, stats, Generic, keywords, and EX labeling.
Ember Medic becomes an action ability.
The fifteen false “No abilities.” entries receive their complete printed text.

The card inspector shows printed text and metadata separately from current state.
Current state includes owner, controller, zone, effective power, damage, Active/Dull, Freeze, granted keywords, Commander designation, and tax.
Commander is a role, while Legend is a rarity.

A synthetic card using existing operations must work after adding only its card module, registry entry, and scenarios.
This acceptance case detects hidden card switches in rules or client code.

## 7. Host lifecycle, persistence, and offline updates

Addresses S17-S18 and the offline part of S21.

Start, scenario start, submit, import, restore, abandon, clear, and export use one serialized host lifecycle.
Each request carries the match identifier or expected generation where applicable.
Execution rejects a stale generation before applying a command.
Reused sequence or choice IDs cannot make an old command valid in a new match.

The host returns structured-clone-safe replies and projected views through an asynchronous interface.
The client cannot obtain or mutate the authoritative state.
Export waits for preceding accepted operations and reports the matching snapshot and transcript.
Restore cannot overwrite a match started while recovery was pending.

Accepted progress persists before the host reports it as saved.
If storage fails, the host distinguishes accepted in-memory progress from persisted progress.
The UI shows the failure, retry, and export controls.
The host retains exact idempotent receipts across restore and rejects command-ID reuse with a different payload.

### Save contract

The envelope pins schema, engine, format, catalog metadata, and behavior identities.
An immutable match manifest records the two deck lists, every original instance, ownership, designated Commanders, and origin kind.
Conservation checks compare state against that manifest.
Scenario origins use an explicit validated scenario identity and version.

Runtime checks cover choices, target references, counters, stack objects, effect references, combat, continuations, and legal stable authority.
Every continuation payload uses its registry step schema.
Unknown handlers, impossible option counts, missing cards, inconsistent versions, and malformed payloads fail before import writes anything.
Replay must reconstruct the declared final state from the validated origin.

A failed restore preserves the original stored data.
The home screen shows the reason and a raw-export action without requiring an active match.
A later new match requires the existing deliberate replacement flow and cannot silently destroy the rejected recovery data.

### Release updates

The host decides update eligibility from restored match state and pending work.
An unfinished match keeps its pinned client/rules/content version until completion or explicit abandonment.
Reload and browser restart must preserve that compatibility, including service-worker activation when the last tab closes.

A real two-build browser scenario covers a waiting update, active match, pending choice, reload, abandonment, and completed outcome.
No new bundle can silently reinterpret an old match.
The offline package contains all application assets and does not request remote fonts, card art, or executable dependencies.

## 8. Arena-style table layout

Addresses S13-S15. This is the requested UI/UX design pass.

The design preserves the light palette from the approved repair.
Use one set of color, spacing, type, control-height, card-size, and layer tokens.
Remove stacked legacy overrides once the new layout owns those values.

The official [Arena selection frame](https://media.wizards.com/2026/images/daily/uV4gKhqzHC.webp) informs field ownership, hand emphasis, and visible ability context.
The [ordering frame](https://media.wizards.com/2026/images/daily/iQyNSyMtC5.webp) informs card choices and explicit confirmation.
These references appear in [the Arena developer article](https://magic.wizards.com/en/news/mtg-arena/dev-diary-sylvan-library).
They are interaction references, not application assets or permission to replace FFTCG rules with Magic rules.

### Regions and orientation

The normal match uses these regions, from top to bottom:

1. A compact match header with Menu and recovery status.
2. The opponent identity and public-zone summaries.
3. Opponent Backups, then opponent Forwards.
4. A central combat boundary with source/target arrows.
5. Decision-player Forwards, then decision-player Backups.
6. The decision-player identity, Commander extension, and bottom-center hand.
7. Bottom-left contextual actions and bottom-right progression controls.

The stack occupies a reserved right column. The phase/priority rail stays readable without covering the field.
The full log opens in a drawer with history preserved.
Player rows use labels and controller markers as well as subtle seat colors.
Controlled opposing cards occupy their controller's row and show their original owner in inspection.

The decision seat owns normal bottom orientation.
Inspect opens a labeled, read-only card browser for the other hand without moving decision authority.
It preserves the open mandatory choice and provides a clear return to the decision area.
An accepted authority change reorients the board after pointer capture ends and clears stale unsubmitted action drafts.

### Layout constraints

Required desktop viewports remain 1280 x 720 and 1920 x 1080 at 100% browser zoom.
The implementation uses shared layout geometry for Phaser visuals, HTML hit areas, and browser assertions.
It must not independently position duplicated visual and interactive cards.

At 1280 x 720, reserve approximately 48 pixels for the header and 200 pixels for the bottom interaction region.
The remaining table area uses four compact card rows and a reserved stack column of approximately 208 pixels.
Exact row sizes adapt to card count and current prompts within the no-overlap constraints.
At 1920 x 1080, increase field and hand card sizes rather than leaving most of the playmat empty.

The contextual dock, hand, Commander extension, and progression controls receive disjoint input rectangles.
Large choices expand into a card browser with visible battlefield access rather than overlapping the hand.
Field rows and zone browsers support overflow without hiding a required card.
Dull rotation uses the card's painted bounds when allocating space.

Board cards expose readable identity, cost, power, and state at their compact size.
Full inspection uses at least 16-pixel body text. Primary controls use at least 14-pixel text.
Secondary labels use at least 12-pixel text. Card identity remains available through a readable hover or keyboard focus view.
Seat color never carries information alone.

### Controls

Peer buttons share a height token, padding, label baseline, and minimum hit area.
Normal contextual controls use a 40-pixel height. Compact navigation can use 32 pixels.
Different width is allowed when labels need it. Width differences must not alter peer height.
Long ability text belongs in inspection, while action buttons use short labels such as “Flare Order”.

Buttons wrap within their assigned panel. They cannot overlap another action or leave the viewport.
The selected-card area uses a bounded inspector and action row rather than stacking unbounded content inside a fixed footer.
Visible focus, pointer hit testing, and readable disabled reasons are required.

### Commander, stack, and zones

Each card instance has one interactive table representation.
While the Commander is in its zone, the extension contains that representation and a persistent source-zone badge.
The zone summary is non-interactive metadata, not another card button.
A field or hand Commander appears only in that actual zone, with the correct cost and tax history.

The stack renders every stack object, including abilities whose source left the field.
Each item shows source, controller, mode, targets, and resolution order.
The resolving item remains readable through its pending choice.

Damage Zone browsing preserves order. Break and removed-zone browsing support readable cards and legal selection when requested.
Deck counts remain public, while hidden order remains absent from projections.
Search and reveal use explicit engine-provided options.

## 9. Hand gestures and action drafts

Addresses S12-S13 and the combat controls in S11.

The hand uses a bottom-center fan with a separate lifted-card layer outside scroll clipping.
Hover and focus show the complete selected card, including its name and playable-state reason.
Neighbor spacing exposes selection targets without changing authoritative hand order.
The fan supports 0, 1, 5, 7, 10, and 19 cards with every card reachable.

One pointer state machine distinguishes click, horizontal reorder, and upward cast intent.
Horizontal drag changes presentation order only.
Upward drag beyond a defined threshold starts the same draft as a click.
Invalid release and Escape restore presentation order and clear the unsubmitted draft.

An action draft contains source identity, authority sequence, mode, ordered targets, payment components, and the current validation result.
It never mutates rules state.
Selecting the last target does not submit the command.

The cast flow is:

1. Select the source and, when applicable, its cast or ability action.
2. Select a mode and legal targets.
3. Select CP sources and other costs directly on eligible cards.
4. Review total cost, Commander tax, required elements, generated/spent CP, and all committed sources.
5. Select Confirm, or revise the draft or cancel it.

CP discards, special discards, and dulling use different markers and text labels.
A payment suggestion can preselect legal sources, but it cannot commit them without confirmation.
An invalid or stale draft displays a useful reason and cannot submit.

Targeting starts with a source-to-cursor arrow and snaps to legal hovered targets.
Selected targets keep visible arrows, numbered markers, and a count such as `1 / 2 targets`.
Selection supports deselection and revision before confirmation.
Party members, attackers, blockers, and allocations use the same direct-card selection language with FFTCG timing.

Accepted rules events drive card movement and combat feedback.
Reduced motion uses immediate placement with persistent state markers and arrows.
It preserves information and the identical command transcript.
Animation completion never advances a phase, resolves an ability, or grants priority.

## 10. Required choices and deck editor

Addresses S11 and S16.

Choice components follow the projected contract rather than a generic “one option equals one command” handler.
Their shared state includes selected IDs, ordering, allocation, min/max constraints, and the choice ID.

| Choice | Required presentation |
|---|---|
| Confirm or mode | Clear alternatives and relevant source card |
| Cards or targets | Eligible cards, selection count, deselection, disabled-until-valid Confirm |
| Order | Numbered cards, first/last resolution explanation, reorder and reset |
| Allocation | Per-target amounts, 1000-point controls, assigned/remaining totals, exact-total Confirm |
| Commander return | Actual normal destination and explicit Commander Zone alternative |
| EX Burst | Revealed damage card, Use/Decline, and no response action |

Mandatory choices have no cancel action that dismisses the engine decision.
Escape cancels only an unsubmitted action draft or closes read-only inspection.
Choice identity changes clear local selection. Rejected answers retain useful editable selection and show the rejection reason.

The deck editor uses a card grid beside a deck list, with stable search and element/type filters.
Real typing preserves focus, caret position, and all characters.
Each card supports full inspection and direct add/remove actions.
The grid shows all supported cards as available, including eligible Legend cards, with legality reasons for the current draft.

Commander changes retain an editable draft and refresh validation errors.
Incomplete drafts persist across menu navigation and reload.
Playable saved decks remain distinct from incomplete drafts.
Only a fully legal 19-plus-one deck can start this local profile.

## 11. Playwright UI/UX monitoring

Addresses S11-S16 and S21.

The audit adds a separate suite now:

```powershell
npm run test:ui-design
npm run test:ui-design:report
```

`test:ui-design` builds the release, then runs Chromium at both required sizes with normal and reduced motion.
It uses `playwright.ui-design.config.ts` and preview port 4174, with server reuse disabled.
The suite retains screenshots, failing traces, videos, an HTML report, and JSON results.
The reporter does not hide failures with retries or expected-failure annotations.

Current checks cover hand clipping, Commander identity, inspection, player rows, choice/control geometry, search focus, and multi-card discard.
These checks are a diagnostic starting point. They do not yet implement the full acceptance matrix below.
Their current failures remain open until implementation closes the corresponding findings.

### Required final browser matrix

| Scenario group | Required assertions and visual states |
|---|---|
| Table | Empty, normal, crowded, stolen-card, Dull-card, and both-seat orientation states |
| Hand | Each required hand count, hover/focus, neighbor spread, overflow access, and Commander extension |
| Gestures | Click cast, drag cast, horizontal reorder, invalid release, Escape, and cancellation with unchanged save |
| Targeting | Cursor arrow, snap, legal/illegal targets, multiple targets, numbered order, revision, and source identity |
| Payment | Alternative payments, special discard separation, tax, exact spending, legal surplus, and final confirmation |
| Choices | Starting order, both mulligans, two-card discard, search, trigger order, allocation, return, and ordered EX |
| Stack and combat | Visible Summons and abilities, source departure, party, block, First Strike, and a response before damage |
| Recovery | Priority reload, every choice family reload, export/import, rejected save, and storage failure |
| Editor | Real sequential typing, filters, inspection, add/remove, Commander change, draft reload, and invalid start |
| Release | Cached offline duel, two-build update lifecycle, and post-outcome recovery |

Every group runs at 1280 x 720 and 1920 x 1080.
Visual and interaction groups run in both motion modes.
Dedicated fixtures use production contracts and are labeled as fixtures.
At least one complete contested duel uses normal setup and real UI controls without fixture imports or state mutation.

### Assertions and monitoring workflow

Geometry checks include viewport containment, ancestor clipping, rotated painted bounds, reserved-region overlap, and pointer hit testing.
Intentional idle fan overlap is allowed. Covering a lifted card, decision target, or action control is not.
Semantic checks require controller/type row labels and clear action ownership.
Interaction checks use actual pointer and keyboard input rather than only DOM event dispatch or `fill` shortcuts.

During each UI repair, run the focused scenario and inspect its screenshots and trace.
After related changes settle, run the complete four-project design suite.
Record each failure with its finding ID, viewport, motion mode, screenshot, expected behavior, and actual behavior.
Keep the latest report accessible through the report command.
This monitoring occurs during implementation and review. It does not create an unattended recurring schedule.

After the layout passes geometry and human review, establish reviewed visual snapshots in a pinned browser environment.
Separate platform baselines when font rasterization differs.
Never update snapshots merely to silence a regression.
The final release gate requires zero unexplained browser errors, zero failed design assertions, and reviewed snapshot differences.

### Visual review rubric

The reviewer compares idle, hover, casting, targeting, choice, stack, and deck-editor captures with Arena reference frames.
The record includes frame links, local captures, and intentional FFTCG/light-theme adaptations.
Each capture must pass ownership clarity, readability, action hierarchy, spacing, selection feedback, and overflow access.
Passing a geometry assertion cannot substitute for this design judgment.

## 12. Presets, coverage, and milestone exit gates

Addresses S19-S21 and guards the fixes to all other findings.

Every focused preset gets sufficient legal payment and a deterministic command transcript to its advertised interaction.
Third cast starts with seven payable CP.
The multiple-EX preset reaches both EX decisions.
Control-conflict cases cover excess Backups, duplicate names, and Light/Dark separately.
Commander destinations include opponent control and correctly placed observers for both accepted and declined return.
The party preset reaches allocation and First Strike through real controls.
End Phase ordering continues through all triggers, cleanup, and the next turn.

The coverage record maps requirement IDs and card behaviors to executed scenario IDs, meaningful assertions, and fresh run results.
File existence, handler registration, or test count alone cannot mark a behavior complete.
Production and full-duel tests use the same registry and runtime effect providers as the host.

| Exit gate | Required evidence |
|---|---|
| Milestone 1 | Normal setup-to-concession transcript, deterministic replay, format checks, legal payment, conservation, Commander foundation, and no stable actorless state |
| Milestone 2 | Every coverage row and card behavior has an executed scenario, including simultaneous processes, all choice continuations, full combat, delayed effects, and mandatory loops |
| Milestone 3 | Two-seat normal duels through outcome, working presets and editor, complete offline duel, choice recovery, safe update lifecycle, and the full UI design gate |

The final playtest record includes revision, seed, decks, pinned versions, outcome, transcript, recovery points, and any defects.
It includes one unscripted complete offline duel without manual rule corrections.
All prior release records receive current evidence and truthful remaining gaps.
No milestone is marked complete while its required gate remains open.

## 13. Finding-to-repair and acceptance map

| Finding | Primary sections | Minimum closing scenario |
|---|---|---|
| S01 | 3 | Every answered choice reaches another legal action, including ordinary Archive Keeper and excess Backups |
| S02 | 4 | Declaration retains priority, responses resolve before window advancement, nonempty-stack attack rejected |
| S03 | 3 | Commander-first and variant-first duplicate batches produce the same departures, including reload between replacements |
| S04 | 4 | Targets and both players' trigger order are visible before responses |
| S05 | 4 | First Strike blocker versus party, all-First-Strike party, deferred triggers, allocation, and blocked-object departure |
| S06 | 5 | Fresh dull-icon source rejected, extra special discard rejected, illegal generated surplus rejected |
| S07 | 5 | Stolen Forward cannot attack immediately, layered control and reversion derive correctly |
| S08 | 5 | Every offered declaration has a legal payment, and target changes invalidate the same restrictions at resolution |
| S09 | 2, 3, 6 | Live matches use the registry, synthetic card needs no rules/client switches |
| S10 | 6 | All 40 metadata/text records match the spec, readable inspection reflects effects |
| S11 | 9, 10, 11 | Two-card discard, party selection, and allocation complete through real controls |
| S12 | 9 | Click/drag share editable payment drafts, Confirm submits once, Cancel/Escape leave saved progress unchanged |
| S13 | 8, 9, 11 | Complete hover visibility, reachable overflow, reorder, arrows, animation, and equivalent reduced-motion behavior |
| S14 | 8, 11 | Four labeled field rows, unique Commander, every stack object, public-zone browsing, full log, nonoverlapping controls |
| S15 | 7, 8 | Other-hand inspection preserves authority/choice, client uses only projections, stale drafts clear |
| S16 | 10, 11 | Sequential typing, card grid, full inspection, and incomplete-draft recovery |
| S17 | 6, 7 | Missing card and unknown continuation rejected before write, incompatible restore offers raw export |
| S18 | 7 | Queued old-match command rejected after start/import/abandon, export and restore obey lifecycle ordering |
| S19 | 12 | Every preset completes its advertised transcript and recovery point |
| S20 | 3, 12 | Forced loop draws, optional loop permits exit, processing budget reports an engine error |
| S21 | 7, 11, 12 | Fresh executed behavior matrix, complete cached contested duel, real update lifecycle, reviewed visuals |
| S22 | 4 | Opponent-turn Rising Undertow persists to its controller's next End Phase and triggers once |

The previous findings map through the second audit's F01-F25 table.
The fixed F25 setup sequence remains a regression requirement.
The partial fixes listed there remain protected while their missing acceptance cases are completed.

## 14. Delivery and review

Stage 1 migrates the live registry and scheduler, then repairs priority, batches, triggers, costs, combat, and effects.
Stage 2 completes semantic saves, lifecycle serialization, projections, and recovery.
Stage 3 completes the Phaser table, choice/draft components, editor, presets, and monitored browser acceptance.
Each stage includes focused regressions before broader milestone checks.

The user approved this design, with all S01-S22 findings mapped to explicit behavior and acceptance requirements.
The audit's browser instrumentation is already present and records current failures.
The linked implementation plan defines the repair sequence and verification gates.
