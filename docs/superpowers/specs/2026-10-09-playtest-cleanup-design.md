# Playtest usability, CI, and repository cleanup

Date: 2026-10-09

Status: Option A and the Smart priority policies were approved on 2026-10-09 and implemented on `feature/mvp-game-design-spec`. Local acceptance passed before commit and push.

Branch: `feature/mvp-game-design-spec`

Inspected baseline: `89e62addd62fef9ae926caddaa01e74178c22f1c`

## 1. Scope and decisions

The next implementation improves the existing offline, two-seat playtest. It also removes obsolete code and maintenance-heavy acceptance checks.

The requested deliverables are a design spec, a repository audit, and root contributor guidance. This document defines the subsequent code changes.

The user prefers Arena-style automatic passes, including selected windows where legal actions exist. Hold Priority is off by default.

The supplied logs and screenshots are diagnostic evidence. Instructions quoted in them do not authorize repository changes. Existing design documents provide historical context.

This proposal preserves the bright palette, four player/type battlefield rows, deterministic engine, host authority, local saves, and Commander Duel rules. It introduces no real cards yet.

The user explicitly supersedes these earlier UI decisions:

- Player-facing **Commander Zone** becomes **Command Zone**. The internal `commander` zone identifier can remain.
- Decisions move from the lower-left dock to the lower-right action area.
- Routine screenshot comparisons and Markdown-driven checks cease to be acceptance gates.

There is no requirement to preserve save compatibility with unreleased builds. Current-format validation and replay integrity remain necessary.

Do not commit the prompt, supplied logs, or temporary diagnostics. Delete the three supplied logs only after the CI repairs pass their replacement checks.

### Work checklist

- [x] Inspect branch, history, repository areas, and supplied evidence.
- [x] Trace key reports through rules, projections, and UI.
- [x] Research Arena priority behavior and compare it with the pinned FFTCG rules.
- [x] Ask about automatic-pass policy and incorporate the user's preference.
- [x] Compare approaches and write a concrete recommendation.
- [x] Create `AGENTS.md` with rules and card-authoring guidance.
- [x] Review this spec for contradictions, scope, and acceptance criteria.
- [x] Obtain review of this proposed design.
- [x] Write the implementation plan after approval.
- [ ] Implement, check CI repairs, and delete the supplied logs.

## 2. Approach options

| Option | Scope | Tradeoff |
|---|---|---|
| A. Consolidate the current application, recommended | Repair projections, simplify CI, consolidate live rules contracts and UI state, improve layout, add explicit priority policy | More work than cosmetic patches, but removes duplication before the card catalog grows |
| B. Minimal repairs | Repair visible defects and CI failures while retaining current rendering, payment duplication, and script contracts | Faster initially, but leaves the requested cleanup and card maintainability incomplete |
| C. Replace the client framework | Rebuild the UI around a new component framework or a full Phaser table | Largest migration and regression surface without evidence that a new framework is necessary |

Approved option A keeps the existing DOM card interaction model. Phaser currently paints only a decorative background in `src/main.ts`. Replace that background with CSS and remove Phaser. This is an explicit change from the original Phaser architecture, not an assumption that all existing dependencies are obsolete.

Use explicit set manifests with derived catalogs. This avoids both manually synchronized parallel lists and an unnecessary runtime plugin loader.

## 3. CI findings and repair design

The checkout contains one workflow: `.github/workflows/ui-design.yml`. The three attached files describe failed runs of that workflow at three commits.

| Run | Failure in supplied log | Assessment |
|---|---|---|
| Complete MVP milestones | Inspector `boundingBox()` returned `null` in two projects. 166 cases passed. | A visibility/layout sampling race is plausible. The current source adds a visibility wait, which does not make later detached-node measurements atomic. |
| Close MVP implementation plan | Crowded-board `elementFromPoint()` reported an unreachable center and edge. 167 cases passed. | This can indicate movement, clipping, or obstruction. The log alone does not prove a false positive. |
| Stabilize UI screenshot gate | Legal or illegal target `boundingBox()` returned `null`. 166 cases passed. | The current test still takes one-shot measurements between renders. |

None of these logs reports a screenshot pixel mismatch. Raising screenshot tolerances does not repair these failures.

`root.innerHTML` replaces UI subtrees. Host updates, offline status, deck loading, and startup restoration can call `render()`. This makes independent visibility and geometry samples vulnerable to replacement between calls. The exact race in each hosted run still needs reproduction or trace inspection.

### Trigger policy

The remote HEAD points to `main`, confirmed with `git ls-remote --symref origin HEAD`.

Use `push.branches: [main]` and `workflow_dispatch`. Remove `pull_request` triggers. A pull-request filter targeting `main` still runs feature-branch changes and violates the requested policy.

Manual dispatch can target the working branch after the workflow exists on the default branch. A job-level condition alone is insufficient: it leaves unwanted workflow runs visible.

Use one validation workflow with independent core and browser jobs. The core job runs type checks, boundary checks, and behavioral unit tests. The browser job builds once and runs retained behavioral browser tests. Keep failure traces and screenshots as generated artifacts. Remove pixel baseline comparisons.

Preserve the lockfile, `npm ci`, explicit Node configuration, and read-only workflow permissions. Do not upgrade dependencies merely to repair these test failures.

### Repair criteria

- A feature-branch push, tag push, or pull request does not automatically start this workflow.
- A push to `main` runs the retained checks.
- An explicit manual run remains possible.
- Inspector and targeting tests exercise visible interactions and resulting state through retrying locators.
- Actual card clicks remain covered. Delete synthetic edge-pixel assertions instead of deleting the requirement that cards are reachable.
- Any essential geometry assertion samples current elements within a retrying operation and waits for accepted state.
- CI does not use retries or larger tolerances to conceal deterministic failures.
- Local replacement checks pass. A hosted run is checked when the workflow can be run without violating the branch policy.
- After repair verification, delete the three attached `.log.txt` files. Do not delete the screenshots or prompt without a separate need.

GitHub documents branch filters and manual dispatch in its [workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax) and [manual execution guide](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

## 4. Repository audit and cleanup

The audit inventoried 112 source files, 68 test/support TypeScript files, eight script files, configuration, workflow, public assets, and documentation. Source files contain approximately 8,114 lines. Static references identify candidates. They do not prove that every unreferenced export is safe to delete.

### Concrete findings

| Area | Evidence | Proposed disposition |
|---|---|---|
| Application assembly | `src/main.ts` mixes menus, deck editing, event formatting, payment search, card rendering, input, and table assembly | Extract existing responsibilities into focused client modules. Keep one render path per component and one owner for each draft. |
| Unused code | A compiler pass with `--noUnusedLocals --noUnusedParameters` reports 14 diagnostics | Delete unused `editorCardRow`, `started`, local variables, parameters, and imports. Enable those compiler checks after cleanup. |
| Rendering | Phaser owns a static decorative canvas. DOM buttons own cards. | Replace the canvas with CSS under option A. Delete dependency, initialization, resize plumbing, and canvas-specific tests together. |
| Styles | `src/styles.css` contains dark styling and successive geometry overrides. `src/client/theme.css` overlays the bright theme. | Consolidate tokens and component styles. Remove superseded declarations after checking all UI states and breakpoints. |
| Payment | `main.ts:makePayment`, `rules/actions.ts:hasPayment`, and `rules/payment.ts` each reason about sources and costs | Share engine legality and expose payment offers. Let client drafts select from those offers instead of recreating legality. |
| Targeting | Activation, Summon, and trigger paths have separate predicates. Script `targets.accepts` has no live caller | Use one authoritative target contract for declarations, offers, and resolution checks. Remove the unused alternative after migration. |
| Triggers | Card scripts declare subscriptions, but engine entry/departure scheduling reads metadata. `TriggerSubscription.matches` is exercised directly in tests, not engine dispatch | Select one live declarative trigger path. Remove dormant subscription definitions and helper-only tests. Do not advertise them as extension hooks. |
| Commander departure | `requestDeparture` in `rules/commander.ts` is called by tests, while live effects use batch replacement handling | Move useful tests to live command/batch paths. Delete the alternative departure pipeline and its unused continuation once no caller remains. Share live Commander cost calculation. |
| Batch utilities | `selectBatchReplacement` has no caller | Delete after checking the replacement operation path still covers selection and rejection. |
| Catalog | `manifest.ts` imports definitions and scripts separately, then maintains behavior-group arrays and parallel catalog data | Register each script once in a set manifest. Derive definitions and catalogs from script metadata. Tests filter behavior instead of maintaining another roster. |
| Catalog alias | `content/opus-ph.ts` only re-exports manifest values | Remove the alias while updating imports to the chosen content API. |
| Barrel exports | `rules/index.ts` and `scenarios/index.ts` have no static consumers | Remove unused barrels unless an actual build entry point requires them. Do not retain a hypothetical public API. |
| Saves | `clientBuild` is optional and restore rewrites older saves with a build pin | Require the current schema and remove this migration path. Keep incompatible-save rejection and current save recovery. |
| Scenarios | Fixtures and scenario catalog serve tests and the explicit playtest launcher | Keep useful scenarios. A test fixture is not abandoned code merely because players rarely open it. |
| PWA | Offline caching and update safety are active product features | Keep these modules and behavior tests. Remove the diagnostic-looking in-match badge, not offline functionality. |
| Scripts | Markdown evidence tooling reads `docs/rules-coverage.md` and duplicates test selection | Remove the evidence parser, runners, declarations, and tests that exist only to enforce Markdown references. |
| Boundary checks | Current checker provides real architecture protection but discovers only placeholder identities | Keep it. Make content discovery set-independent and avoid assumptions about JSON quotation style. |
| Public/build assets | Icon, Vite, TypeScript, service worker, and release test server have live consumers | Keep. Remove only configuration made unnecessary by the selected cleanup. |
| Historical documents | Existing specs, audits, captures, and playtest evidence explain earlier decisions | Keep history. Update current entry-point guidance without adding another chronological audit archive. |
| Historical diagnostics | `docs/superpowers/audits/2026-10-07-second-audit/rules-probes.test.ts.txt` is a saved diagnostic program | Delete the diagnostic program under the cleanup request. Keep historical narrative and useful final evidence. |

Do not collapse different rule operations merely because their code looks similar. Zone movement, state-based checks, replacement handling, and effect resolution have different timing obligations.

### Test deletion and retention

Delete `scripts/coverage-evidence.js`, its `.d.ts`, `scripts/check-test-evidence.mjs`, `scripts/run-coverage-matrix.mjs`, and `tests/rules/coverage-evidence.test.ts`. Remove their package commands and references.

Delete or replace `scripts/check-coverage.mjs`. Its Markdown links, source-text patterns, fixed 40-card expectation, and preset-list parser duplicate typed runtime checks.

Delete screenshot baseline comparisons and the `*-snapshots` directories under `tests/ui-design`. Delete tests whose purpose is exact decoration, canvas existence, font geometry, or copied implementation formulas.

Remove the exact scenario roster assertion from `tests/scenarios/coverage.test.ts`. Retain iteration over every registered scenario, invariant checks, uniqueness, and serialization.

Review fixed catalog tables individually. Delete redundant global copies of card metadata. Keep independent card-specific printed behavior expectations and supported-set completeness checks.

Remove test writes to `docs/ui-captures`. Screenshots belong in ignored test artifacts when needed for failures or manual review.

Retain rules, illegal command rejection, hidden-information projection, deterministic replay, current save recovery, PWA update safety, complete-duel behavior, and useful content tests. Consolidate duplicate scenarios by behavior, not by filename similarity.

A copy edit or documentation-only commit must not require a test rewrite. A rules change can legitimately require different behavioral expectations.

## 5. Disposition of every playtester comment

| ID | Report | Finding and action |
|---|---|---|
| P01 | Tide Warden resolving during first-player selection | Confirmed projection defect. `projectView` falls back to a `rule` execution frame whose source is a setup anchor. Show setup decisions outside the stack. |
| P02 | Match log too small | Accept. Reserve a full-height right sidebar with a dedicated log scroll area. |
| P03 | Log font too small | Accept. Use 16px body text and at least 14px secondary text with readable line spacing. |
| P04 | Discard payment does not identify the card | Accept. Name the discarded card, player, generated CP, and associated cast. Discard into Break Zone is public. |
| P05 | Clicking Break or deck pile does nothing | Partly accept. Break opens an ordered public card tray. Deck opens count and hidden-information explanation, not remaining deck identities or order. |
| P06 | Opponent deck and discard counts missing | Accept. Show both seats' deck, hand, Break, and Damage counts. Public counts do not expose hidden card identities. |
| P07 | Phase absent from log | Partly implemented but incomplete. Some transitions emit `phase.started`; automatic Active/Draw/Main 1 progression lacks the same complete history. Emit consistent transitions. |
| P08 | Logs omit actor | Accept. Every action or decision identifies its actor. Use a rules/system label for automatic processes. |
| P09 | Group repeated adjacent logs | Accept with boundaries. Group adjacent equivalent visible events by actor, turn, phase, and action context. Do not merge different public card identities. |
| P10 | Deck displays zero after setup | Confirmed UI defect. The UI reads redacted `zones[seat].deck.length` instead of `deckCounts[seat]`. With six cards in hand and no other moves, 19 minus six equals 13. |
| P11 | Rename Commander Zone | Accept the user's terminology change. Update active UI, errors, and contributor guidance. Preserve historical documents and internal identity if useful. |
| P12 | Damage counter wraps and uses inconsistent weight | Accept. Render `0 / 7` as one nonwrapping counter with consistent baseline and weight. |
| P13 | Placeholder faces omit card text | Confirmed. `cardTile` renders name, cost, type/power, and number only. Add readable rules text, elements, and keyword/generic indicators. |
| P14 | Inspect as a large card above the board | Accept. Right-click opens an overlay inspector. Provide a keyboard equivalent and visible inspect control. Left-click remains contextual selection. |
| P15 | Default auto-pass unless priority held | Accept as a client/host policy. Do not change rules priority ownership or omit rules execution. |
| P16 | Research Arena phase skipping | Completed to the limits of published official evidence. Use the explicit mapping in section 6, not a claimed complete copy of Arena's internal policy. |
| P17 | Select cards directly, not footer button lists | Accept. Use cards for payment, targets, discard, ordering, attack, and block selection. Keep text controls for non-card choices and confirmation. |
| P18 | Blank text for cards with no abilities | Accept. Remove `No abilities.` from content. Preserve actual keywords and the generic icon. |
| P19 | Skip Attack Phase with no attackers | Conditional. Suppress empty decisions, but still process Attack Preparation, triggers, and legal response windows. Lack of attackers alone does not make every Attack window irrelevant. |
| P20 | Cannot discard Dusk Reaver for Spark Runner | Correct rules behavior. Dusk Reaver is Dark. Light/Dark cards cannot generate discard CP. Show the reason on the ineligible source. |
| P21 | Dusk Reaver choice lacks effect text and power stays 4000 | Text defect confirmed. A command-level reproduction yields 4000 after target selection and 2000 after resolution. Do not apply the effect early. Investigate further only if it stays 4000 after resolution. |
| P22 | Highlight effective power changes | Accept. Effective power is bold, red when reduced, green when increased, with a numeric delta and text cue. Color is not the only indicator. |
| P23 | Log effects and targets | Accept. Distinguish declaration, target choice, resolution start, actual outcomes, and expiration. |
| P24 | Selected attacker top is clipped | Plausible layout defect, not a rules issue. Selection transforms and overflow clipping can conflict. Use an inset highlight and check actual selected-card bounds. |
| P25 | Block decision with no legal blockers | Accept removal of an empty blocker decision. Preserve the response window before damage and any legal Summon or ability actions. |
| P26 | Damage card identity invisible | Accept. Show the revealed card in the log and ordered Damage tray, including EX Burst context. |
| P27 | Menu/result buttons too close | Accept. Use common button groups, at least 12px gaps, and a separate destructive-action group. Retain deliberate abandonment confirmation. |
| P28 | Decisions belong lower right | Accept. Put actor, reason, effect, selection summary, Confirm, Cancel, and priority control together in the lower-right area. |
| P29 | Wasted upper space and oversized opponent hand | Accept. Compress the opponent strip and show hand backs as a compact fan with count. Keep public cards inspectable. |
| P30 | Caching control and seven-damage tip are unnecessary | Accept removal from the table header. Offline status remains in the menu with actionable update/error controls. Seven-damage rules belong in format help. |

## 6. Arena reference and FFTCG priority policy

Wizards describes default Arena skips for a player's own upkeep, own end step, and responses to their own triggered abilities. It also documents card-specific smart stops, including precombat and upkeep exceptions. Full control and phase stops override defaults. See [Wizards' Smart Priority explanation](https://magic.wizards.com/en/news/mtg-arena/announcements-october-27-2025).

This source does not publish an exhaustive current phase-by-phase algorithm. Claims that Arena always skips an entire phase are too broad. Right-click inspection also appears in [official Arena release notes](https://magic.wizards.com/en/news/mtg-arena/mtg-arena-digital-release-notes-adventures-forgotten-realms-2021-07).

### Rules boundaries

The pinned local source is `docs/fftcg-comprules-v3.3.pdf`:

- 5.2.1.3 and 11.2.1.1 prohibit discarding Light/Dark cards for CP.
- 7.6 and 7.9 distinguish hidden deck/hand identities from public zones.
- 7.8.3 makes Damage public and preserves its order. Section 7.10 defines the Break Zone.
- 8.2.1 defines five-card hands, the optional mulligan, and the first player's single first-turn draw.
- 9.1.1.2 and 9.2.1.2 give neither player priority during Active and Draw.
- 9.3 governs Main Phases, Character casting, Summons, and activated abilities.
- 9.5 requires End Phase triggers and cleanup, and prohibits Summons and action/special abilities there.
- 10.1.1 preserves Attack Preparation priority even before attacks are declared.
- 10.1.2.7 skips Block Declaration and Damage Resolution when no attackers are declared.
- 10.1.3.6 preserves priority after blocker declaration.
- 11.1.7 resolves a stack item or advances a window after consecutive passes.

FFTCG has no Magic upkeep equivalent. Hold Priority cannot create priority in Active or Draw. A phase stop there can pause presentation only, not authorize a game action.

### Available policies

| Policy | Behavior | Decision |
|---|---|---|
| Smart | Pass when no action exists, pass the acting player's immediate response to their own newly declared stack item, and bypass empty combat decisions | Recommended, matching the user's preference |
| Conservative | Pass only when no legal non-pass action or decision exists | Optional setting for comparison and accessibility |
| Hold Priority | Require a manual pass at each legal priority window | Per-seat toggle, off by default; takes precedence over either automatic policy |

Smart mode must not pass arbitrary opponent windows merely because the stack is empty. In particular, a legal precombat action can prevent a trigger or change attack eligibility.

Use a small explicit policy table. Do not infer strategic usefulness from card names, card values, or whether an action appears beneficial.

The own-Summon and activated-ability shortcuts are proposed project policy. The cited Arena article directly documents own-trigger behavior, not every own-spell case.

| FFTCG context | Smart default |
|---|---|
| Setup, mulligan, ordering, targets, modes, optional EX Burst, replacements, allocations | Always stop for required player input. An optional decision is still a decision. |
| Active and Draw | Run automatic rules work. Record both phases. No priority button, even with Hold enabled. |
| Main 1 and Main 2 with legal actions | Stop for the active player's actions. Stop for the opponent's legal responses. |
| Any legal window with only Pass available | Submit a validated pass unless Hold or a matching stop is enabled. |
| Immediate response to one's own newly declared Summon, activated ability, or auto-ability | After required declarations finish, auto-pass that actor's initial response opportunity. Preserve the opponent's response and all later opportunities after an opponent acts. |
| Own trigger with a declared response-sensitive mechanic | Stop when a legal response exists. Express the exception as generic timing metadata, not a card-name switch. |
| Attack Preparation | Process triggers first. Stop for legal actions and explicit stops. No attackers is not sufficient to discard these windows. |
| Attack Declaration with no eligible attacker | Advance through legal engine transitions. Do not ask the player to select an impossible attack. |
| Block Declaration with no legal blocker | Submit the explicit no-block transition unless Hold or a stop requires manual progression. Preserve pre-damage priority, triggers, and EX Burst decisions. |
| After damage | Process damage, defeats, triggers, and remaining legal attacks before any automatic pass. |
| End Phase | Process triggers, mandatory discards, and repeated cleanup. Auto-pass priority unless held. Never authorize a Summon or activated ability here. |

A smart pass is a voluntary player pass under a visible policy. It is not a finding that no legal response exists.

### Controls and execution

Show **Hold Priority** and clickable stops beside the phase indicator and action area. Store Hold and stop preferences separately for both seats in this local dual-control client.

A stop applies to the next matching legal window for the selected seat and turn context. Consume it once. Hold remains enabled until toggled off. Show both seats' hold state so automatic seat changes are understandable.

The host exposes the actor's legal action offers and a policy context: phase, combat step, declaration owner, declaration identity, and explicit response-sensitive timing. The client policy returns either stop or one ordinary command.

The command queue processes one automatic command at a time. Re-evaluate after every accepted reply using the new sequence and match generation. Persist and record automatic commands exactly like manual commands.

Cancel queued automation on Hold changes, stop changes, menu opening, inspection overlays, or pending drafts. Also cancel on match replacement, restore, required choices, or terminal results. Resume only from a fresh view. Do not automate while a player reads an inspector.

Yield between commands so Hold and menu controls remain usable. Limit each burst to 32 automatic commands. If the burst reaches that limit or repeats a state without progress, pause and offer manual continuation. Never auto-play cards, choose targets, pay costs, attack, or select blockers.

On reload, restore the match to a stable decision before starting automation. Replay applies recorded commands without generating new policy decisions.

Log an automatic-pass reason. Examples include `Player 1 auto-passed: no legal action` and `Player 1 auto-passed their own trigger response. Enable Hold Priority to respond`.

## 7. Layout, inspection, and direct interaction

### Table composition

Use a CSS grid with a compact header, main play area, and right rail. The rail is approximately 300-360px wide at supported desktop sizes. It extends from below the header to the viewport bottom. Its log owns the remaining scrollable height.

Place stack details in the rail above the log with a bounded, independently scrollable section. Place the decision dock at the lower right of the play area, immediately beside the rail. It must not cover cards or require scrolling the log to act.

Compress the opponent strip. Keep four battlefield rows with the two Forward rows nearest the center. Give cards more space by removing unused outer margins and fixed decorative insets.

Use one responsive geometry system. Eliminate separate JavaScript rectangles for a decorative canvas that no longer controls the actual DOM.

At 1280x720 and 1920x1080, keep the hand, full selected card, primary action, and open decision reachable. Crowded rows can scroll within their allocated regions. Do not shrink meaningful text to satisfy a rectangle test.

### Card presentation

Each placeholder face shows name, cost, elements, type, printed rules, keywords, generic status, and effective Forward power. Card number remains secondary information.

Long text can use a readable excerpt on the compact face, with the complete text in inspection. The face must still explain ordinary short effects without selection.

Use one card presentation model across the table, hand, trays, log links, and enlarged inspector. Future images replace the artwork layer. Accessible text and effective characteristics remain available.

Right-click opens an enlarged overlay without selecting or submitting an action. A keyboard Inspect action and explicit inspect control provide equivalent access. Escape closes the overlay and restores focus without canceling a required game choice.

Show printed power, effective power, signed change, modifier source, and duration. A temporary reduction to 2000 from 4000 is distinct from 2000 marked damage.

Selection uses borders or inset highlights that do not move the card outside a clipping container. Hover enlargement can use an overlay rather than a transformed card inside a scroll row.

### Direct choices

The current interaction mode determines what a card click means. Required choice selection takes precedence over payment, targeting, combat, and ordinary inspection/selection.

Click hand cards to select discard payment. Click eligible Backups to select CP sources. Mark selected sources and show the cost summary before confirmation.

Click eligible cards for targets, discard choices, attackers, parties, and blockers. Show selection order or allocation where relevant. Use a public-zone tray when the eligible card is not on the table.

Keep explicit confirmation for payments and destructive multi-card selections. Keep named buttons for non-card answers such as Keep, Redraw, First, Second, Use EX Burst, or No blocks.

Choices show the full source effect, acting player, selection requirement, legal target restriction, and selected cards. Dusk Reaver must explain the temporary -2000 power effect before selection.

## 8. Public zones and logs

### Projection and visibility

Read deck counts only from `MatchView.deckCounts`. Keep hidden deck objects absent from client projections.

Show hand count, deck count, Break count, and Damage count for both seats. Break, Damage, Removed, and Command Zone cards can be inspected when public. Preserve rule-defined ordering in trays.

Deck inspection shows count and an explanation that remaining contents and order are hidden. A revealed card or authorized search is exposed only through its explicit rules permission. Do not derive a remaining deck list from catalog knowledge or a saved deck recipe.

Separate presentation contexts: setup decision, target declaration, queued stack item, resolving stack effect, and resolving EX Burst. A generic `rule` frame does not qualify as a resolving card.

### Event model

Use structured events with stable IDs, turn, phase/step, actor/controller, source, public card identity, targets, and outcome details where applicable. Capture public names and relevant characteristics at event time, since an object can later leave its zone.

Emit phase events for automatic and manual transitions. Log discards with their actual cause: CP payment, ability cost, effect, or hand limit.

Distinguish an effect entering resolution from completion. The current `stack.resolved` event is emitted when the execution frame is created, before its work finishes. Correct that event meaning instead of merely changing its label.

Log target declaration separately from effect application. For the Dusk case, show target selection, the queued ability, the completed power change, and end-turn expiration.

Project logs before formatting. Opponent draws remain visible as counts and actor information, with card identity removed. The current filter drops opponents' draw events entirely. Do not expose private search options, hidden choices, or deck order through generic JSON formatting.

Use typed presentation formatters for supported events. Avoid a fallback that turns event identifiers into player-facing prose. Unknown events receive a neutral, non-sensitive message and developer-side reporting.

### Display and grouping

Display oldest to newest and follow the latest event when already at the bottom. If the player scrolls up, preserve their position and show a **New events** control.

Group only consecutive equivalent visible events. The grouping key includes actor, turn, phase/step, event kind, visibility, and relevant outcome. Five anonymous draws can become `Player 2 drew 5 cards`.

Keep raw events unchanged. Expand grouped entries when individual visible details exist. Never merge events across a decision, phase transition, different target, or different public card identity.

Card names in public events open the inspector. Historic public events remain readable even after the card changes zones.

## 9. Adding rules and future Opus cards

Root `AGENTS.md` supplies the contributor instructions. The implementation must make those instructions practical, not merely aspirational.

The current runtime contains unused trigger subscriptions and target predicates. Consolidate on the live declarative metadata contracts used by the engine. Share their interpretation across offers, validation, and scheduling. Remove unused script subscriptions and `targets.accepts` instead of preserving a second extension mechanism. Card authors must not maintain two descriptions of the same targeting or trigger condition.

Use per-set manifests containing registered card scripts. Build the catalog, available sets, editor filters, and registry integrity checks from those manifests. Preserve explicit format allowlists.

An official card entry needs verified identity, text, source links, errata review date, metadata, stable ability IDs, and executable behavior. Keep artwork variants separate from the physical rules identity.

A newly required mechanic extends the shared engine and receives behavioral tests before its first card becomes playable. Unsupported cards remain outside playable manifests.

Remove registry assumptions that every activated ability has exactly one target. Costs and target cardinality must come from each supported declaration contract. Add concrete mechanics when needed by reviewed cards, rather than claiming support for all FFTCG mechanics now.

Do not build a generic card-language interpreter now. Typed modules, shared operations, and serializable continuations already provide a suitable extension model.

Keep independent tests for actual rule behavior. Catalog-wide checks validate uniqueness, metadata shape, registered handlers, and compatible manifests. They do not freeze the total number of cards or the editor's full name list.

Opus I begins the future official-card work. This change does not automatically enable later sets, Opus Zero content, Monsters, LB mechanics, or an unresolved Light/Dark Commander identity policy.

## 10. Acceptance and implementation boundaries

Implement in three reviewable stages on the same branch:

1. Repair CI policy and tests, remove proven dead paths, consolidate contracts, and make contributor guidance accurate.
2. Repair projections and event semantics, then implement zones, log, cards, inspection, and layout.
3. Add Smart priority on top of accurate legal offers and event contexts, with Hold, stops, persistence, and cancellation.

Do not add automatic priority before action offers and declaration timing are reliable. In particular, remove the payment/target predicate split before using those offers to decide that no action exists.

### Behavioral acceptance matrix

| Area | Required evidence |
|---|---|
| Setup | No stack effect is shown during first-player or mulligan decisions. First player has six cards and deck count 13 after the normal opening draw. |
| Visibility | Both seats see public counts and public trays. Neither projection or log contains unauthorized deck identities, order, or opponent hand names. |
| Dusk payment | Discarding Dark for CP remains illegal and the UI explains why. |
| Dusk timing | Spark Runner is 4000 while the trigger is queued, 2000 after resolution, and 4000 after expiration without another modifier. |
| Stack | Target declaration and setup are not labeled resolution. Nested choices retain the actual resolving parent when one exists. |
| Log | Actor, phase, cost, targets, damage card, effect outcome, and expiration are readable. Grouping preserves event order and visibility. |
| Direct interaction | Payment, targeting, discard, attacks, parties, blocks, and public-zone choices work by card selection and keyboard access. |
| Inspection | Visible cards open an enlarged complete inspector. Inspection never exposes hidden cards or accidentally submits a command. |
| Layout | At both supported sizes, controls and selected attackers remain reachable. Long text, crowded fields, reduced motion, menus, and results remain usable. |
| No-action automation | A window with only Pass advances without a click. Required choices always stop. |
| Smart own response | Own declared stack item can auto-pass with legal actions available. Hold or a matching stop preserves the response opportunity. |
| Opponent response | An opponent action cancels any previously inferred own-response shortcut. Legal responses remain available. |
| Combat | Empty attack/block decisions disappear. Preparation triggers, pre-damage responses, attack eligibility changes, mandatory combat, and subsequent attacks remain correct. |
| End Phase | Mandatory discard, auto-abilities, effect expiration, and repeated cleanup finish in rules order. |
| Replay and interruption | Manual and automatic passes replay identically. Hold, menu, inspection, stale views, reload, and match replacement prevent stale automatic commands. |
| Content extension | A small test set can register through a set manifest without changes to UI card lists or global count assertions. |
| Cleanup | Removed symbols and obsolete paths have no remaining consumers. Current behavior retains meaningful coverage. |
| CI | Default-branch-only automatic trigger policy and retained core/browser checks work without documentation or pixel baselines. |

Use unit tests for rules and policy decisions, host tests for visibility, and a small browser set for user journeys. Use temporary screenshots for visual review. No Markdown assertions, screenshot baselines, or tests that merely reproduce CSS formulas.

### Evidence gathered for this design

- `npm test -- --reporter=dot`: 53 files and 369 tests passed.
- `npm run typecheck`: passed.
- `npm run check:boundaries`: passed.
- Existing `npm run check:coverage`: passed, but enforces the Markdown coupling proposed for removal.
- Additional unused-code compiler pass: 14 diagnostics. These are cleanup findings, not failures of the existing configured typecheck.
- In-memory command probe: Dusk Reaver target selection leaves Spark Runner at 4000. Two valid passes resolve the trigger to 2000, including its projected power.
- Repository and remote branch checks: current branch unchanged, remote default branch `main`.

The Dusk probe uses a controlled equivalent state. The screenshot does not establish which actions followed target selection in the original playtest.

No application, workflow, or test implementation was changed for this design. The hosted failures are not claimed as fixed. Browser reproduction and final layout review belong to implementation acceptance.

## 11. Review decision

The user approved option A and the Smart policy table on 2026-10-09. Implementation removed Phaser and brittle baselines, revised the table and public log, and added validated automatic passes. The supplied logs and screenshots were excluded from version control and deleted after local acceptance.

The implementation plan is [Playtest cleanup and Smart priority](../plans/2026-10-09-playtest-cleanup-and-smart-priority.md). Keep the current branch. Do not commit, push, or delete the supplied CI logs before the agreed repair conditions are met.
