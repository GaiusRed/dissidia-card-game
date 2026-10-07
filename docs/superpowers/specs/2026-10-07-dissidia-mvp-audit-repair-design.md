# Dissidia MVP audit repair design

Date: 2026-10-07

Status: Approved for implementation planning on 2026-10-07. Approval covers the design and planning, rather than implementation.

Branch: `feature/mvp-game-design-spec`

Audited revision: `9341328`

## 1. Goal and authority

Complete milestones 1-3 of [the approved MVP design](2026-10-06-dissidia-mvp-design.md).
Repair every finding in [the branch audit](../audits/2026-10-07-mvp-branch-audit.md).
Add a light, bright default theme and independent card scripts.

The original spec remains authoritative except for this document's explicit visual and architecture adjustments.
The supplied `docs/fftcg-comprules-v3.3.pdf` remains the comprehensive rules baseline.
The documented Commander format overrides remain unchanged.
Where an existing test contradicts those rules, replace its expectation after adding the correct regression scenario.

The release includes the exact 40 Opus Placeholder definitions and two 19-plus-one supplied decks.
The complete Opus Zero and Opus I-III catalog remains milestone 4.
Online services, matchmaking, mobile layout, and production art remain outside this repair.
Light/Dark Commander identity remains a separate production-format decision.

## 2. Audit result and design choice

The audited branch passes 101 headless tests and 10 browser tests.
Its build, import boundary check, and coverage structure check also pass.
Eleven diagnostic probes reproduced defects that those checks miss.
The branch therefore does not meet the complete milestone 1-3 acceptance target.

Three architecture approaches were considered:

| Approach | Benefit | Cost and limit |
|---|---|---|
| Independent typed card modules with shared rules operations | One authoring location per card, explicit contracts, isolated scenarios, reusable deterministic rules | Requires registry and scheduler migration |
| Move existing switches into one content handler file | Small initial relocation | Keeps central switches, duplicated declaration rules, and broad card-change impact |
| General card scripting language or interpreter | Can express cards through a separate language | Adds language design, debugging, versioning, and interpreter work before MVP completion |

Use the first approach. Cards use ordinary TypeScript and typed shared operations.
The MVP does not introduce a general scripting language.

The provisional authoring layout uses one module per card number.
Cards with no executable abilities still export their complete metadata through the same interface.
Shared helpers avoid duplicate implementations without joining unrelated card behavior into a central switch.

## 3. Component boundaries

| Component | Responsibility | Permitted dependencies |
|---|---|---|
| Rules contracts | Domain types, card interfaces, commands, events, operations, and continuation schemas | Pure TypeScript and runtime schema library |
| Rules scheduler | Priority, rule checks, stack, combat, effects, choices, outcomes, and deterministic execution | Rules contracts and an injected content registry |
| Commander format extension | Deck profile, designation, casting permission, return replacement, and tax | Rules extension contracts |
| Card modules | Printed metadata, costs, target contracts, trigger subscriptions, field effects, replacements, and resolution steps | Rules contracts and generic card helpers |
| Content registry | Explicit manifest, module lookup, handler versions, and continuation lookup | Card modules and contracts |
| Local host | Command serialization, registry selection, filtered views, replay, and storage coordination | Rules, registry, persistence adapter |
| Client | Local drafts, inspection, menus, table presentation, and event animation | Host protocol and public display metadata |

Rules receive the registry through dependency injection.
Rules never import a concrete card or set module.
Card modules never import Phaser, DOM, IndexedDB, networking, wall-clock time, or an unseeded random generator.
The client never reads the authoritative match snapshot to determine card behavior.

Suggested module paths are `src/content/cards/opus-ph/P-015C.ts` and `src/content/registry.ts`.
Place stable interfaces in `src/rules/contracts/`.
Shared generic operations belong in `src/rules/operations/`.
Pure authoring helpers belong in `src/content/shared/`.
The existing rules entry point continues to expose a renderer-independent package.

## 4. Independent card-script contract

Each card module exports a complete `CardScript` definition.
Its metadata includes the original spec's card number, name, set, provenance, version, rarity, type, elements, cost, and power.
It also includes jobs, categories, generic icon, keywords, full display text, abilities, and EX designations.
The module declares stable ability IDs and behavior versions.

Each ability supplies the following contract:

- Kind: action, special, auto, field, replacement, or Summon effect.
- Allowed source zones and any card-specific timing restriction.
- Typed cost components, including CP elements, dull icon, sacrifice, and same-name discard.
- Mode definitions and target count, uniqueness, zone, type, element, ownership, and control predicates.
- Declaration-time choices and resolution-time choices as separate requirements.
- Event subscriptions for auto abilities, including the event condition and controller.
- Named resolution steps with checked serializable payloads.
- Field-effect or replacement providers when applicable.

Generic timing and keyword behavior remains in rules.
Printed card-specific predicates and values remain in the card module.
For example, Scorch supplies one Forward target and a 4000-damage operation.
The rules scheduler supplies the Summon declaration procedure, payment transaction, priority window, and target recheck.
Banner Smith supplies a field effect for controlled Fire Forwards with a 1000 modifier.
Dawn Guardian supplies a replacement that reduces each applicable damage event by 1000.
Commander designation and tax never enter those card modules.

The registry explicitly maps card number and behavior version to each module.
Adding an ordinary new card requires its module, manifest entry, and scenarios.
It does not require a rules or client switch.
Adding a genuinely new game mechanic can extend generic contracts and operations through a separate reviewed change.

Registration rejects duplicate IDs, unresolved abilities, absent resume steps, and invalid metadata.
EX Burst dispatches the designated ability from the card module, rather than branching on a card number.
The same effect implementation serves ordinary resolution and EX execution, with their distinct timing supplied by rules.

## 5. Shared execution model and continuations

Use one deterministic scheduler for all accepted commands and automatic processing.
The scheduler runs until it reaches a legal priority window, a required choice, an outcome, or an engine error.
Animations never advance this scheduler.

Card resolution steps request typed generic operations.
Operations include zone movement, damage, draw, discard, search, shuffle, power change, keyword change, control change, and delayed triggers.
These operations produce ordered rules events and request replacements before applying their original events.
Card code does not edit arbitrary state or bypass the zone-event pipeline.

Operation batches distinguish simultaneous events from ordered instructions.
A simultaneous batch captures its relevant pre-event characteristics and last-known information once.
All applicable replacements finish before that batch applies.
The scheduler then collects actual-event triggers and runs the next permitted rule checkpoint.

A continuation stores the script ID, behavior version, ability ID, named step, checked payload, and execution mode.
It also stores source object identity, source snapshot, controller, targets, mode, remaining operations, and the priority-restoration checkpoint.
All saved data is JSON. Functions remain in the registry.

A required choice sets priority to null and pauses the entire current execution frame.
Its answer consumes that choice once and resumes exactly the recorded step.
Two Commander departures can therefore request sequential owner decisions without restarting or losing the surrounding effect.
An answered trigger-order choice cannot remain open.

The scheduler checks target object identity and card restrictions again at resolution.
It applies partial legal targets and cancels all effects when every required target is illegal.
Source departure does not delete an independent stack ability.
Source information follows the comprehensive rules' last-known-information procedure.

## 6. Priority, triggers, rule processes, and outcomes

After a legal cast or activation, the declaring player regains priority through the common checkpoint.
After resolution, the turn player gains priority through that checkpoint.
Two consecutive passes resolve one stack item or advance one permitted empty-stack step.
An attack never advances to damage while responses remain on the stack.

During setup, the randomly selected player chooses first or second before either opening hand is drawn.
Then draw both five-card hands and offer the first player's mulligan before the second player's mulligan.

At a checkpoint, the scheduler first resolves all applicable rule processes.
It repeats simultaneous batches until no further rule process remains.
Processes include defeat, zero power, lethal marked damage, duplicate non-Generic names, Light/Dark conflicts, and excess Backups.
The controller chooses excess Backups. Commander owners choose applicable replacement destinations.
Those decisions finish before priority resumes.

Event subscriptions collect triggers when their actual events occur.
Entry, departure, arrival in a destination, and beginning of End Phase are distinct events.
A Commander return can trigger departure without triggering arrival in the replaced destination.
Zone costs use the same event pipeline.

Pending auto abilities wait until the rules permit stack placement.
The turn player orders their triggers, followed by the non-turn player.
Controllers declare required modes and targets before the response window.
An optional effect such as Tide Witness asks whether to use it during resolution.
A trigger with no legal required target follows rule 11.8.4.

EX execution never opens a normal response window or adds the EX ability as a normal stack item.
Finish the complete damage batch, then offer eligible EX abilities in Damage Zone order.
Finish all permitted EX effects and choices before the next normal defeat checkpoint.
Preserve damage ordering, no-response timing, and resumability across reload.

The scheduler establishes a mandatory loop only after a repeating semantic state and forced execution path are proven.
Semantic comparison excludes sequence numbers and generated event IDs.
A forced loop with no legal exit produces the rules-defined draw.
Synthetic fixtures exercise this behavior even though the placeholder decks do not intentionally create such loops.
A processing budget limit without that proof produces a recoverable engine error, rather than a draw.

End Phase runs beginning triggers, restricted resolution, required discard, marked-damage cleanup, effect expiry, and final rule checkpoints.
Delayed effects wait for the specified controller's next qualifying End Phase.
A delayed discard does not disappear merely because the current opponent's turn ends.
Cleanup repeats when its events create additional work.

## 7. Combat and continuous effects

Keep FFTCG's sequential attacks.
Each attack declares one Forward or a same-element party of eligible Forwards.
Use explicit preparation, attack declaration, block declaration, First Strike, ordinary damage, and finish steps.
Each step supplies the comprehensive rules' priority and trigger checkpoints.

Brave prevents dulling during attack declaration, but does not permit a second attack.
Blocking requires an eligible active Forward and does not itself dull that Forward.
An active frozen Forward can attack or block.
Freeze prevents activation during the next applicable Active Phase, then expires.

The defender can decline to block or select one ordinary blocker.
Blocked status persists after a blocker leaves battle.
Check continued battlefield presence and control when determining participation.
Do not reinterpret a blocked attack as an unblocked attack when its blocker departs.

For a blocked party, the defender assigns the blocker's damage in permitted multiples of 1000.
Require a legal complete allocation before confirmation.
Calculate simultaneous damage from a common pre-damage snapshot.
Apply replacements and departures without changing another participant's already calculated damage.

First Strike damage precedes ordinary damage.
Its intermediate checkpoint permits required rule processes, but prohibits Summons and activated abilities.
Damage triggers wait until the rules permit their stack placement.
A party deals First Strike damage only when all participating members have First Strike.

Power-setting effects change base power, then applicable power modifiers accumulate.
For example, War Cry plus Shape Tide gives a base of 4000 plus 3000, regardless of their resolution order.
Multiple base-setting effects and other supported effect conflicts obey dependencies and timestamps.
Field bonuses cease when their source leaves its applicable zone.

Control follows applicable effects rather than an unconditional assignment to the owner at expiry.
Track continuous control through control changes and reversions.
Use that track for attacks and dull-icon abilities, with Haste exceptions.
Controlled Backups can generate CP regardless of ownership.

## 8. Declaration and payment contract

Use one declaration service for legal offers, draft checks, command checks, and resolution target rechecks.
It combines generic rules with the selected card module.
It returns mode-specific targets, cost components, eligible sources, total CP, Commander tax, and blocked reasons.
Availability means at least one complete legal declaration exists.
Offer calculation does not mutate state or consume randomness.

Payment separates generated CP from exact spent CP under supplied rule 11.2.
Keep the supplied same-color source restrictions and Light/Dark exceptions.
Hand discards require ownership. Field sources require control.
Reserve the chosen special discard and dull-icon source before searching the remaining legal CP combinations.

Reject unrequired cost fields and repeated cards across all cost components.
Do not let a source pay its dull-icon cost and also generate CP in the same declaration.
Do not let the special discard also generate CP.
Check continuous-control restrictions for dull-icon abilities.
Commit every cost and declaration together after complete checks.

An illegal command leaves state, RNG, priority, events, and accepted transcript unchanged.
Rules events report actual payment discards, dulling, sacrifices, source zones, and destinations.
The client uses those events rather than reconstructing the result from catalog switches.

## 9. Light and bright visual direction

The initial theme uses bright ivory surfaces, pale-blue accents, dark text, and restrained warm metal details.
This replaces the current dark background, dark cards, dark overlays, and dark manifest colors.
No theme selector is required for this repair.

| Token | Initial value | Purpose |
|---|---|---|
| `canvas` | `#F7F5EF` | Page and board base |
| `surface` | `#FFFFFF` | Cards, menus, and choice panels |
| `surface-soft` | `#EAF2FA` | Zone panels and selection surfaces |
| `text` | `#172B3A` | Main text |
| `text-muted` | `#4C6272` | Secondary labels |
| `accent` | `#235D88` | Primary buttons and active decisions |
| `metal` | `#9B6A25` | Small Commander and framing accents |
| `border` | `#B8CAD6` | Boundaries and dividers |
| `danger` | `#A52B32` | Errors and destructive action labels |

Use dark text on bright cards and panels.
Primary buttons use white text on the dark blue accent.
Check normal text contrast of at least 4.5:1 and large text or functional boundaries of at least 3:1.
Element symbols, labels, shapes, and markers supplement element colors.
Do not use color alone for eligibility, payment roles, damage, or selection.

Phaser, HTML, CSS, overlays, startup screens, and the PWA manifest use the same theme tokens.
Original geometric card illustrations remain sufficient for the MVP.
Use bundled fonts or system fonts, with no external font request during offline play.
Arena remains the interaction reference. The bright palette is an intentional visual adaptation.

## 10. Table and interaction design

Phaser owns the animated match table and card presentation.
HTML owns menus, deck editing, accessible choice controls, card inspection, and the readable log.
Split the current `main.ts` responsibilities into host connection, draft controller, table presenter, choices, inspection, and menus.

Arrange each seat's Forwards and Backups in separate opposing rows.
Place the controlled hand in a bottom-center fan and the opponent hand across the top.
Keep contextual choices at bottom left and progression controls at bottom right.
Reserve those areas outside hand and zone hit regions.
Show all stack objects, including abilities, in a readable column.
Expose Damage Zone order, Break Zone contents, removed cards, and the full event log through browsing controls.

A stable card instance has one interactive table representation.
Its Commander Zone representation can extend the hand while the zone shows a summary.
When that Commander leaves the zone, remove the old interactive representation immediately.
Accepted movement animates from its real source zone.
The zone summary never displays a card face at an incorrect location.

Click and upward drag start the same local action draft.
Horizontal hand drag reorders presentation without a rules command.
Invalid release restores the previous presentation order.
Neighbor spreading and horizontal browsing keep every hand card reachable.
Lifted cards must remain visible outside the scroll viewport through a separate presentation layer.

A draft stores authority seat, source object, selected action, mode, targets, payment, and originating view sequence.
The user can revise all declaration choices before Confirm.
Payment selection marks CP discards, special discards, and dulled sources distinctly.
Show base cost, tax, required elements, generated CP, spent CP, and expiring surplus beside the draft.
Automatic payment can offer a proposal only. The user must inspect and confirm it.

Targeting shows a source-to-cursor arrow, valid hover snapping, selected-target arrows, numbered markers, and a count.
Use the same selection language for party members, attackers, blockers, and allocation.
Choice browsers use card rows for search, reveal, discard, and trigger ordering where appropriate.
Multi-card choices collect selections before Confirm.
Cancel and Escape cancel only an unsubmitted draft.
They never dismiss a required rules decision.

Full card inspection shows printed text, keywords, generic icon, element, rarity, provenance, and Commander designation separately.
It also shows current power, marked damage, control, status, and tax when applicable.
Inactive cards explain their blocked reasons on hover or keyboard focus.
The log distinguishes CP discard, normal discard, special cost, damage, departure, and result events.

Separate the authority seat from the inspection seat.
Authority follows the player required by the engine.
An offline inspection overlay can show the other hand without changing authority or canceling a pending choice.
Authority changes finish pointer gestures and clear stale drafts.
Import, scenario start, new match, and source-object changes also invalidate stale drafts.

Reduced motion replaces movement with immediate placement and persistent source, target, damage, and selection markers.
All rules and choices remain identical.
The table must pass interaction checks at both 1280 x 720 and 1920 x 1080.

## 11. Deck editor and scenarios

The editor uses a card grid beside a deck list.
Search, element filters, type filters, and full inspection precede direct add/remove actions.
All supported cards remain available, including legal Legend cards that are not the designated Commander.
Show set, provenance, rarity, and Commander role distinctly.
Ownership and purchase controls remain absent.

Allow incomplete local editing drafts and Commander changes.
Recalculate legality without preventing the user from reconstructing a deck.
Save complete legal decks for match selection. Preserve incomplete drafts separately if the user leaves the editor.
Only valid 19-plus-one MVP decks can start a local match.
Retain production 49-plus-one validation through headless scenarios.

Each focused preset supplies the required resources, authority, effects, and card positions for its named interaction.
Each also supplies an accepted command transcript from its validated origin through that interaction.
The third-cast preset reaches and pays seven CP.
The multi-EX preset casts Final Spark and resolves both ordered EX choices.
The control-conflict presets separately exercise excess Backups and Light/Dark conflicts.
The End Phase preset casts Rising Undertow, orders its trigger with Mist Caller, then reaches the next turn.
The party preset forms a legal party and completes allocation and First Strike processing.
The Commander destination preset includes opponent control and correctly controlled departure witnesses.

Scenarios use only the exact supplied deck instances.
Separate transient conflict states from settled states through an explicit pending checkpoint.
A preset cannot claim a settled illegal field as a valid initial position.

## 12. Persistence and offline delivery

Expose an asynchronous command and view interface that also works through a Web Worker adapter.
Serialize commands, save writes, imports, restores, clearing, and match replacement.
Keep the authoritative snapshot private to the host.

Every accepted command creates a snapshot and accepted transcript entry.
The host attempts persistence before publishing a saved acknowledgment.
If persistence fails, it exposes a visible unsaved state and preserves the current in-memory match for retry or export.
It never presents a failed write as saved progress.
An import or new match invalidates older queued writes and receipts.
Duplicate command IDs return their original result without paying twice, including after restore.

Use runtime schemas for the complete save envelope, origin, snapshot, transcript, deck manifest, and pending execution data.
Check integral counters, card conservation against the origin manifest, unique locations, legal identities, and valid pending decisions.
Check envelope, origin, and snapshot version agreement.
Replay accepted commands and compare the resulting authoritative state with the snapshot.

The registry manifest defines catalog identity and every behavior version used by the match.
Schema, engine, format, and registry versions remain pinned until completion.
Incompatible or corrupt data produces a readable recovery explanation.
The original stored data remains available for export before replacement.
Malformed JSON or absent metadata returns a normal import failure, rather than an uncaught exception.

The repair changes rules behavior and saved execution frames.
Bump engine and schema versions as required, and update the registry manifest version.
Do not silently load old engine-2 saves under repaired behavior.
The MVP can reject those saves with an explanation and export path instead of implementing a migration.

Service-worker activation checks actual host match state.
An unfinished normal match or scenario prevents activation.
Offer update activation after outcome, or after an explicit abandon-and-return-to-menu action.
Ordinary menu inspection does not end the match.
An offline reload retains the matching cached bundle and catalog for the ongoing save.

## 13. Finding-to-repair traceability

| Finding | Design sections | Required acceptance scenario |
|---|---|---|
| F01 | 5-7 | Respond to an attack with Return Tide and Scorch. Resolve responses before battle and assert priority after each action. |
| F02 | 5-6 | Order Mist Caller and delayed Undertow, resolve both, finish cleanup, and reach the next turn. |
| F03 | 7, 10 | Form legal parties, reject mixed-element parties, block, allocate damage, and continue sequential attacks. |
| F04 | 7 | Brave stays active, blockers stay active, active frozen cards remain eligible, removed blockers preserve blocked status, and First Strike checkpoints apply. |
| F05 | 5-6 | Resolve zero power, reduced-power lethal damage, duplicate names, Light/Dark conflicts, and excess Backups before priority. |
| F06 | 4-6 | Wrong events create no triggers. Both players order simultaneous triggers and declare targets before responses. |
| F07 | 5 | Twin Embers affects two Commanders. Complete both owner decisions and resume remaining resolution once, including after reload. |
| F08 | 4, 8 | Use stolen Backup CP, reject premature dull-icon activation and duplicate cost sources, and observe sacrifice departure triggers. |
| F09 | 7 | Resolve both War Cry/Shape Tide orders, field-source departure, overlapping control effects, and control-readiness changes. |
| F10 | 4, 8 | Controlled Burn offers friendly targets. Stillwater rejects abilities. Every offered declaration has a legal completion and targets recheck. |
| F11 | 3-4 | Add a synthetic card through a module and registry only. Assert no card-specific switches remain in rules or client. |
| F12 | 4, 10-11 | Independently compare all 40 metadata and ability definitions with the approved card tables. Inspect every printed ability. |
| F13 | 10 | Confirm two or more hand discards, search selections, orders, and party allocations through real browser controls. |
| F14 | 8, 10 | Select and revise payment, reserve special discards, inspect surplus and tax, then Confirm or cancel without mutation. |
| F15 | 10 | Reorder the fan, target with cursor snapping, cancel invalid drags, browse overflow, and repeat with reduced motion. |
| F16 | 10 | Inspect seat/type rows, ability stack items, ordered damage, zone browsers, and single Commander representation at both desktop sizes. |
| F17 | 3, 10 | Inspect either hand during priority and choices without changing authority. Clear stale drafts after transitions and import. |
| F18 | 11 | Search and filter the grid, inspect cards, change Commander in an incomplete draft, and start only legal saved decks. |
| F19 | 4, 12 | Reject malformed, truncated, incompatible, and missing-card saves. Explain recovery and export the original data. |
| F20 | 12 | Delay storage writes, then import or start a new match. Assert no stale overwrite and preserve duplicate-command receipts. |
| F21 | 12 | Queue a new release during a duel. Reload offline with pinned versions, then activate the update after outcome. |
| F22 | 11 | Run each preset's advertised transcript to its expected decision and settled outcome. |
| F23 | 5-7 | Establish a mandatory-loop draw, reject a budget-only draw, and settle simultaneous damage, departures, and defeats. |
| F24 | 14 | Execute behavioral coverage, contested full duels, offline recovery, and recorded Arena comparisons before release. |
| F25 | 6, 14 | Neither opening hand exists before the first-or-second choice. Complete ordered draws and mulligans for both starting seats. |

## 14. Verification and milestone exit gates

Use independent expected outcomes from the original spec and supplied rules.
Do not infer expected behavior from the implementation under test.
Every audit regression must first fail against the audited behavior before its repair passes.
Follow each decision test through its continuation and the next legal priority window or result.

Behavior coverage uses scenario IDs mapped to requirements and card ability IDs.
The acceptance check fails when a required scenario is missing, skipped, or failing.
Metadata checks compare every required field for all 40 cards against an independently maintained expected manifest.
Keep structural catalog checks, but distinguish them from behavioral acceptance.

### Milestone 1 exit gate

- Both deck profiles pass their full boundary and legality scenarios.
- Setup, mulligan order, first-turn draw, CP, ordinary casting, Commander tax, and rollback scenarios pass.
- Rule checkpoints, card conservation, simultaneous outcomes, and mandatory-loop fixtures pass.
- A normal setup-to-concession transcript replays identically from pinned versions.
- The rules package remains independent of browser and storage APIs.

### Milestone 2 exit gate

- Every original placeholder coverage row has executable passing scenarios.
- Every printed ability and keyword has positive and relevant negative behavior coverage.
- Stack responses, declaration targets, trigger order, partial target legality, replacements, and source departure pass.
- Sequential combat, parties, allocation, First Strike, Brave, Freeze, and control changes pass.
- EX and End Phase continuations finish correctly, including save/reload at intermediate decisions.
- All findings F01-F10, F22, and F23 pass their repair scenarios.

### Milestone 3 exit gate

- Both supplied decks complete contested browser duels through legal commands without manual state corrections.
- At least one complete duel runs after cache installation with the browser network disabled.
- Reload and resume work during priority, multi-card choices, Commander replacements, and EX resolution.
- Export/import, malformed data, incompatible versions, storage failures, and update deferral pass.
- Click and drag share the same explicit payment and target draft at both viewport sizes.
- Required choice types, hand reordering, overflow, inspection, ability stack display, and reduced motion pass browser checks.
- Light theme screenshots and contrast checks pass for menus, table, editor, prompts, and results.
- Record Arena reference comparisons for idle board, hover, casting, targeting, choice, stack, and deck editing.
- Record intentional FFTCG and bright-theme adaptations, plus one unscripted complete offline playtest.
- Update coverage and playtest records to show actual evidence and any remaining open gate.

The initial audit screenshot does not satisfy the Arena comparison gate.
The original smoke tests remain useful, but they do not replace these exit checks.

## 15. Repair sequence and review

First, capture rule-correct regressions for the audit findings.
Then introduce card contracts, registry versions, generic operations, and the common scheduler together.
Migrate all 40 placeholder modules before deleting the old card-specific switches.
Repair priority, triggers, rule checks, combat, payment, effects, and continuations against those regressions.

Next, establish the asynchronous host, complete save checks, and version-safe recovery.
Build the bright table presentation, shared drafts, choice components, inspection, and deck browser against projected views.
Complete every preset transcript and the three milestone exit gates.

This sequence is a design dependency order, rather than a task-level implementation plan.
Review this written spec before creating that plan, as required by Superpowers brainstorming.
No commit, implementation, or publication accompanies this design approval.
