# Playtest Results

## Automated checks completed

| Check | Result |
|---|---|
| Unit and integration tests | Passed; 290 tests across 45 files |
| Strict TypeScript checks | Passed with rules engine version 14 and rules script version 4 |
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
| Coverage structure check | Passed; exact catalog/deck structure and 36 linked test-file paths checked. This check does not certify behavior coverage. |
| Playwright UI/UX design pass | Passed 36 checks at 1280×720 and 1920×1080 with normal and reduced motion; hand reachability, row layout, player distinction, action sizing, interaction paths, and browser errors are monitored. Durable crowded-board screenshots are saved under `docs/ui-captures/`. |
| Preset transcripts | Third Commander Cast, Final Spark with both EX decisions, Affordable Return Tide, Borrowed Banner forward/Backup control, excess Backup, duplicate-name and Light/Dark conflicts, both Commander destinations, party allocation, First Strike, and Rising Undertow's End Phase discard replay to their accepted states. Full acceptance remains open. |
| UI fixture trust | Game-interaction tests now use registered scenarios. Synthetic hand-card clones are used only for the hand geometry matrix; they do not enter rules state. |
| Semantic save authority checks | Passed; actorless states, impossible choice bounds, unknown choice/combat references, mismatched typed choices, and unknown typed continuations are rejected before import. Combat participant snapshots retain LKI across zone changes. |
| Save origin reconstruction | Passed; normal seed/deck and registered scenario origins rebuild on import. A replay-consistent rewrite of both origin and final RNG snapshots is rejected; JSON property order does not affect comparison. Save schema pin is 6. |
| Card projection | Host tray projections include printed definition, effective power/keywords, current zone and Freeze status, owner/controller, and Commander tax; host view/card-tray tests pass. |
| Normal-start rules duels | Passed damage and deckout transcripts from `createMatch`; simultaneous defeat and complete card coverage remain open |
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
| Playwright UI design suite | Passed; 36 tests across 1280 × 720 and 1920 × 1080 with normal and reduced motion |
| Battlefield row layout | Opponent Backups sit above Forwards; player Forwards sit above Backups. The Forward rows face across the center, and the hand remains clear |
| Card roster text | All 40 card-level rules text values match the design roster; each declared ability's text is present, and Ember Medic is an action ability |
| Typed registry migration | The 12 vanilla and keyword-only cards export module-level typed scripts and pass registry completeness checks; remaining card groups are open |
| Delayed timing metadata | Generic delayed records persist source LKI, creation turn, and next eligible controller End Phase, then queue typed continuations on the stack |

## Release gate still open

No unscripted complete duel, complete cached offline duel, or two-build service-worker update test has been recorded. Production card registry migration and full card behavior coverage remain open. Review [the coverage table](rules-coverage.md), [the UI review](ui-reference.md), and [the current implementation plan](superpowers/plans/2026-10-07-dissidia-mvp-second-audit-repair.md) before using this build for rules conclusions.

## Manual session record

No manual session is recorded yet.
