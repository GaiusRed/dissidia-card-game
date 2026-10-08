# Playtest Results

## Automated checks completed

| Check | Result |
|---|---|
| Unit and integration tests | Passed; 369 tests across 53 files |
| Strict TypeScript checks | Passed with rules engine version 15 and rules script version 5 |
| Rule import boundary | Passed; rules contain no forbidden platform dependencies |
| Production build and service-worker generation | Passed; app assets are precached locally. The JavaScript bundle remains above Vite's 500 KB advisory size. |
| Playwright setup and phase controls | Passed |
| Playwright mulligan ordering and focused scenario launch/resume | Passed |
| Playwright custom deck edit/save | Passed |
| Playwright reload during an opening choice | Passed |
| Playwright real-pointer cast from the card fan | Passed at 1280 × 720; viewport resized to 1920 × 1080 |
| Playwright Commander tray | Passed; the Commander remains the same rules object, shows its Commander Zone badge, and displays the current tax-inclusive cost |
| Playwright Commander cast | Passed; casting from the extension moves the same instance to the field, removes it from the tray, and does not add it to hand |
| Playwright offline reload | Passed in a new browser context with network disabled |
| Coverage structure check | Passed; exact catalog/deck structure and 42 linked test-file paths checked. This check does not certify behavior coverage. |
| Executed coverage matrix | `npm run test:coverage-matrix` passed: 369 Vitest tests, 20 E2E tests, 168 UI cases, 3 release lifecycle tests, and all 42 linked test files with assertions and no skips. |
| Playwright UI/UX design pass | Passed 42 tests (168 cases) at 1280×720 and 1920×1080 with normal and reduced motion; seven states have 28 Windows screenshot baselines. Hand reachability, row layout, player distinction, action sizing, interaction paths, and browser errors are monitored. Durable captures are saved under `docs/ui-captures/`. |
| Preset transcripts | Third Commander Cast, Final Spark with both EX decisions, Affordable Return Tide, Borrowed Banner forward/Backup control, excess Backup, duplicate-name and Light/Dark conflicts, both Commander destinations, party allocation, First Strike, and Rising Undertow's End Phase discard replay to their accepted states. |
| UI fixture trust | Game-interaction tests now use registered scenarios. Synthetic hand-card clones are used only for the hand geometry matrix; they do not enter rules state. |
| Semantic save authority checks | Passed; actorless states, impossible choice bounds, unknown choice/combat references, mismatched typed choices, and unknown typed continuations are rejected before import. Combat participant snapshots retain LKI across zone changes. |
| Save origin reconstruction | Passed; normal seed/deck and registered scenario origins rebuild on import. A replay-consistent rewrite of both origin and final RNG snapshots is rejected; JSON property order does not affect comparison. Save schema pin is 9. |
| Card projection | Host tray projections include printed definition, effective power/keywords, current zone and Freeze status, owner/controller, and Commander tax; host view/card-tray tests pass. |
| Normal-start rules duels | Passed damage and deckout transcripts from `createMatch`; simultaneous seven-damage and damage/deckout outcomes also have assertions. |
| EX Burst and target checks | Passed for all three placeholder effects, ordered optional choices after the damage batch, no response window, save/restore, and delayed seven-damage outcome |
| End Phase and loop checks | Forced loops draw, optional choices remain open, terminating continuations finish, typed Rising Undertow work survives the opponent End Phase and source departure, then queues and resolves one controller-End discard after reload; excess-Backup departures use the batch scheduler |
| Cascading checkpoint check | Banner Smith's removal lowers a Fire Forward's effective power, starts the lethal departure process, and declares Cinder Witness's resulting trigger before priority. |
| Simultaneous trigger order | Real departure batches collect both players' triggers, put active-player triggers on the stack first, declare targets before priority, and remove required triggers with no legal target. |
| Targetless trigger cleanup | Simultaneous triggers with no remaining legal targets are removed before the controller is asked to order them; 22 end-phase and trigger tests passed. |
| First Strike trigger timing | A blocker departure trigger remains queued across a JSON save/reload and opens only after normal combat damage; the focused combat, trigger-declaration, and batch suites passed 16 tests. |
| Ability sacrifice departure | Cost sacrifice uses the batch pipeline, honors Commander replacement after reload, and declares a synthetic self-break trigger above the paid ability before priority. Payment and trigger-declaration suites pass 13 tests. |
| Payment cost matrix | Cast and activation costs use `CostSpec`; discards, dulling, and sacrifice enter one operation batch. The focused payment/action/casting/target suites pass 39 tests covering same-name special-discard selection, failed-payment immutability, Light/Dark costs, cost flags, CP alternatives, and exact generation. |
| CP source offers | Offers exclude off-element, dull, and Light/Dark discard sources that the validator rejects; the focused payment/action suites pass 24 tests. |
| Host retry receipts | Accepted commands and replies persist with saves and are checked against transcript replay before import. Exact retries survive later commands and import; export retains accepted commands after save failure, and delayed restore cannot overwrite a newer start. Host lifecycle and update-safety suites pass 15 tests. |
| Combat timing offers | Summons are no longer offered during First Strike or normal-damage checkpoints; the focused payment/action/casting/target suite passes 26 tests. |
| Combat control changes | A Forward removed from combat by a control change deals no later damage; a blocker that changes control remains blocked and does not let the attacker damage a player. |
| Temporary control and Haste offers | A Forward cannot attack in the turn it changes controller; a granted Haste keyword makes both the attack offer and reducer accept the attack. |
| Temporary dull-cost readiness | A newly stolen Recovery Clerk cannot activate its dull-cost ability until it has Haste; offers and reducer agree. |
| Continuous power and targeting | Shape Tide base power plus Banner Smith/temporary modifiers is order-independent; control changes immediately update controller-based target lists. |
| Playwright UI design suite | Passed; 42 tests (168 cases) across 1280 × 720 and 1920 × 1080 with normal and reduced motion; seven visual states have platform-specific screenshot baselines |
| Battlefield row layout | Opponent Backups sit above Forwards; player Forwards sit above Backups. The Forward rows face across the center, and the hand remains clear |
| Card roster text | All 40 card-level rules text values match the design roster; each declared ability's text is present, and Ember Medic is an action ability |
| Typed registry migration | All 40 cards export registered typed scripts; registry completeness and the card-to-assertion map pass. |
| Delayed timing metadata | Generic delayed records persist source LKI, creation turn, and next eligible controller End Phase, then queue typed continuations on the stack |
| Arena row spacing (2026-10-08) | Crowded-board geometry checks pass at both target sizes and motion preferences; occupied cards clear their row labels by at least 12 px, stay within their rows, and both Forward rows face the center. The focused four-project run also confirms the painted canvas matches the viewport. |
| Two-build card-choice recovery (2026-10-08) | `npm run test:release` passes all three versioned browser cases. A pending Return Tide Commander destination choice survives reload offline on build A while build B waits, resolves through the UI, and then build B is installed after explicit match abandon. |

## Milestone results (2026-10-08)

The latest verified tree passes `npm test` with 369 tests across 53 files. `npm run build` passes application, rules, tests, and worker TypeScript checks, then produces the production app and service worker. The rules boundary check is clean. The structural coverage check finds 40 registered card modules, two 19-card preset decks, and 42 linked test files. The executed-evidence gate verifies all 42 linked test files ran with passing assertions and no skips. The four-project UI suite passes 168 cases, E2E passes 20 tests, and the two-build release suite passes 3 tests.

## Executed coverage matrix

On 2026-10-08, `npm run test:coverage-matrix` passed with 369 Vitest tests, 20 E2E tests, 168 UI-design cases across four viewport/motion projects, and 3 two-build release lifecycle tests. The gate verified all 42 linked test files ran with passing assertions and no skips. JSON reports are stored in the ignored `.coverage-reports/` directory. The matrix verifies execution; the card, S01–S22, F01–F25, and rule-area maps in `docs/rules-coverage.md` and the verification audit provide the semantic traceability.

Milestones 1–3 meet their approved plan gates. The coverage matrix maps all 40 card behaviors and every rule-area row to assertions; the fresh evidence gate confirms every linked file ran without skips. Broader cross-card combat, replacement, trigger, outcome, and decision combinations remain documented limitations, not missing milestone exit scenarios.

## Remaining review limits

The scripted complete cached offline duel and an unscripted Codex-run exploratory duel are recorded below. The real two-build tests cover active mulligan recovery, a card-driven choice recovered and completed offline, explicit abandon, and update acceptance after a completed outcome. Broader rule combinations and independent human approval remain limits beyond the three milestone gates. Review [the coverage table](rules-coverage.md), [the UI review](ui-reference.md), and [the implementation plan](superpowers/plans/2026-10-07-dissidia-mvp-second-audit-repair.md) for the evidence and limits.

## Scripted complete offline duel (2026-10-08)

Playwright drove a normal match from the UI with the Fire and Water preset decks and seed 1. It kept both opening hands, reloaded offline while the starting-player choice was pending, completed the duel through real controls, and reached a legal deck-out result. Both seats cast and attacked; Player 2 blocked. Each exported save replayed to the same result. Both viewport runs passed without remote requests or browser errors:

- 1280×720: Player 2 wins by deck-out; exported transcript and replay matched.
- 1920×1080: Player 2 wins by deck-out; exported transcript and replay matched.

This is scripted evidence. The separate exploratory session below was performed by Codex and is not independent approval.

## Manual session record

On 2026-10-08, Codex performed an unscripted offline exploratory match through the local UI. It used seed 42, Cinder Company (Commander P-001L) against Tidal Assembly (Commander P-021L), pinned to client build `0c52cef3-5bdc-427a-8f1c-be3d775418c6`, schema 9, engine 15, format `commander-duel-ph-v1`, and catalog `catalog-9763bcc8`. The duel started offline and ran in one browser session without reload or manual rules correction. Both seats cast a Forward and attacked; both seats blocked, and a combat response window and Cinder Witness trigger choice were resolved through the UI. At turn 8, Player 2 conceded; Player 1 won by concession. The export contains 97 transcript/receipt entries. This was an exploratory check by Codex, not independent approval.

- [Exported save and transcript](playtest-results/unscripted-offline-duel-2026-10-08.save.json)
- [Finished-match screenshot](ui-captures/unscripted-offline-duel-2026-10-08.png)

The playtest exposed an unaffordable War Cry review button that opened a draft with no legal targets. The cast control is now disabled with the host's blocker reason, and the draft entry point rejects a missing offer. The focused regression passes in all four UI size/motion projects. Broader cross-card combinations and independent human review remain limitations.
