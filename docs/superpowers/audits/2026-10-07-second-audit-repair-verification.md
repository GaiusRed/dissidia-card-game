# Second Audit Repair Verification

**Status: in progress. This is not the final MVP acceptance audit.**

This evidence tracks work against the [second branch audit](2026-10-07-mvp-second-branch-audit.md), its approved repair plan, and the original MVP design. The repair plan remains authoritative for the complete gate.

## Current verification

| Check | Result |
|---|---|
| `npm test` | Passed: 319 tests across 49 files |
| `npm run typecheck` | Passed, including rules and test TypeScript projects |
| `npm run check:boundaries` | Passed: rules boundary clean |
| `npm run check:coverage` | Passed structural check: 40 cards, two 19-card decks, 36 linked test files; not behavior-complete evidence |
| `npm run build` | Passed; Vite reports the existing bundle-size advisory above 500 KB |
| `npm run test:e2e` | Passed: 13 tests, including incompatible-save recovery, explicit Commander and Summon confirmation, and a dragged Forward that remains in hand until confirmation |
| `npm run test:ui-design` | Passed: 48 tests across 1280×720 and 1920×1080, normal and reduced motion; includes cast and activated-ability payment review and Escape cancellation |
| Task 5 focused declaration suite | Passed: 42 tests across payment, action offers, casting, and targets; includes legal completions for all five offered intent kinds and a same-name special discard plus a separate CP discard |
| Save and import semantic regressions | Passed: 22 tests across save, import-error, and semantic-save suites |
| Host lifecycle focused suite | Passed: 16 tests across lifecycle and update-safety suites; includes delayed-restore and import/start races, persisted reply ledger validation, and exported transcript after failed persistence |
| Choice draft focused suite | Passed: 4 pure validation/copying tests; after integration, 12 monitored UI cases covered choices, mulligan confirmation, and blockers across both sizes and motion settings |
| Preset transcript focused suite | Passed: 14 tests across transcript and scenario-catalog suites; transcripts cover Commander tax, both EX choices, affordable Summons, Backup/name/Light-Dark conflicts, Commander destinations, party allocation, First Strike, and End Phase discard; each command resumes from JSON state |
| Origin reconstruction regression | Passed: normal and registered scenario saves import; a replay-consistent rewrite of both origin and final snapshots is rejected. Save schema pin is 6. |
| Focused scenario browser test | Passed: 1 test |
| UI browser-error monitoring | Passed: all 48 layout and interaction cases completed with no page errors or console errors. Game actions use registered scenarios; synthetic cards are limited to the hand geometry matrix. |
| Durable visual evidence | Four crowded-board captures and four payment-review captures saved for both target sizes and motion preferences; normal-motion payment captures were inspected and linked in `docs/ui-reference.md` |
| `git diff --check` | Passed; Git reports expected LF-to-CRLF working-copy notices |

| Action draft and payment panel tests | Passed: 9 unit tests across declaration, CP calculation, and renderer; cast, cancellation, and activated-ability payment browser tests passed 12 cases across four projects. |
| Final current-tree structural checks | `npm run check:boundaries`, `npm run check:coverage`, and `git diff --check` passed. Coverage output remains structural only. |
| Payment review visual inspection | Four current captures saved at 1280×720 and 1920×1080 with normal and reduced motion. Source choices fit within the 560px panel; Confirm and Cancel have matching dimensions. Activated ability text stays in the card details while the button uses a short label; a browser assertion checks for clipping in all four projects. |
| Payment transaction rollback | Passed: injected post-payment trigger-metadata failure rejected the command with `ENGINE_FAULT`, no accepted events, and byte-identical input/reply state. Sacrifice Commander replacement test checks movement and status events after the choice. |
| Effective battlefield power projection | Passed: host projection and browser tests verify Forge Apprentice's resolved +1000 ability changes Spark Runner's displayed power from 4000 to 5000; its source displays Dull. |
| Stolen-card and departed-source projection | Passed: `tests/host/views.test.ts` verifies owner/controller labels, effective 5000 power and Haste, plus last-known stack data after the source leaves the field. |
| Presentation boundary | Passed: the boundary unit suite rejects `host.getState()` and runtime card handler, legacy, and per-card script imports in `src/main.ts` and `src/client/**`; production `npm run check:boundaries` passes. |
| Save tampering before write | Passed: 24 focused save tests; the new multi-case import regression rejects instance deletion, owner/Commander changes, deck/origin changes, continuation and frame tampering, invalid targets/choice bounds, and combat references without replacing IndexedDB data. |

## Repairs verified so far

- All 40 card definitions are asserted against the original roster for rules text, element, rarity, set/version/provenance, Generic, and EX identity. All twelve Summon target declarations are checked, and War Cry can target an opponent Forward. The 15 false “No abilities.” entries and other wording/format mismatches were corrected. Ember Medic is classified as an action ability.
- All 40 card modules export typed scripts and are present in the behavior-versioned registry. The host, test harness, full-duel tests, and app use `productionContext`, which contains the registry without legacy handler or runtime-effect maps. Reducer tests cover typed Summons, activated abilities, EX Burst, entry/departure/End Phase triggers, field providers, and a synthetic Summon script without a rules-engine switch. Assertion-backed behavior coverage for every printed ability and broader rules matrices remains open.
- Typed Scorch, Return Tide, and Archive Keeper EX paths run through the reducer, including accepted/declined decisions and Archive Keeper's draw/discard continuation. Typed move operations now pass through Commander replacement batches, and Summon targets are revalidated before resolution.
- Banner Smith's field provider emits power operations without persistent modifiers. Dawn Guardian's replacement provider is registry-backed. Night Regent keeps last-known power in its typed continuation; Cinder Witness and Mist Caller use typed departure and End Phase continuations.
- Rising Undertow now uses the generic delayed execution queue. Delayed records preserve the source snapshot and next eligible controller End Phase, and queue a typed continuation on the stack. The regression checks opponent-turn timing, source departure, save/reload, and the resulting discard.
- Combat tests cover a complete unblocked attack timing transcript, First Strike, control changes, allocations, and blocking without dulling.
- The Arena-inspired field layout places the player’s Backups toward the bottom edge and Forwards above them; the opponent’s rows are reversed so the Forward rows face across the center. The monitored UI suite checks both player areas and card-hand access at both target sizes.
- A seatless host projection now fails closed for both hands, private choices, card-only draw/search log entries, trays, and legal action offers. A current-match write is queued after an import is superseded during its storage write, including recovery from a transient failure of the first newer-match save.
- A host-driven `MatchController` now owns inspection and local action/choice drafts. Unit tests cover inspection without authority changes and draft clearing with an explanation after sequence, generation, or choice changes.
- Combat acceptance includes full-command First Strike blocker and unblocked-party tests; the focused combat, priority, and action suite passed 35 tests.
- Cast, Summon, and activation drafts now use host-offered CP choices. The payment panel reports cost and tax, CP generated/spent/remainder, D/sacrifice components, and supports source/special-discard edits. Confirm is explicit and pending while a command is submitted; Escape and Cancel clear uncommitted drafts. Pure tests cover costs, an unused CP point, same-name CP/special discard separation, incomplete payment, and renderer escaping. Browser coverage now resolves a Forge Apprentice activation after cost/target review; rejected-command retention and browser-level revision clearing remain open.
- Host projections now provide effective public-card characteristics to the renderer. The browser checks effective power after a resolved effect, but complete inspection details and projection-only rendering remain open.
- Offer completion is tested for every action in three production-rule fixtures: Main Phase casts/Summons/activation, attack declarations, and blocking. A post-payment trigger failure verifies atomic rollback and no event transcript leak. Wider fixture/preset and complete behavior-matrix coverage remain open.

## Remaining acceptance work

The implementation plan is still open. Remaining work includes removing legacy continuation types and fallback dispatch, completing payment/combat/card-behavior coverage, semantic save/origin validation, queued host lifecycle operations, expanded interaction and independent visual review, preset transcripts, full duels, and two-build offline update acceptance. Do not interpret the structural coverage check or browser design suite as milestone completion.

Update this file after each final verification stage. Record the revision and exact commands again after the working tree stops changing; do not mark the MVP audit closed until the final plan gates pass.
