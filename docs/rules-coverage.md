# Rules and Playtest Coverage

Rule references point to [FFTCG Comprehensive Rules v3.3](fftcg-comprules-v3.3.pdf). A test row is marked implemented only when an executable test covers the stated behavior.

## Foundation scenarios

| Rule | Scenario | Test | Status |
|---|---|---|---|
| 8.2.1 | Starting player, opening hands, mulligan, and first Draw Phase | `tests/rules/setup.test.ts`, `tests/rules/foundation.test.ts` | Implemented |
| 11.2.2 | CP generation, element choice, exact spending, unused CP expiry, and atomic payment | `tests/rules/payment.test.ts` | Implemented |
| 7.7 | Backup capacity, duplicate non-Generic names, and Light/Dark field limit | `tests/rules/casting.test.ts` | Implemented |
| 12.4 | Seven damage, deck exhaustion, concession, and simultaneous defeat | `tests/rules/outcomes.test.ts`, `tests/rules/combat.test.ts`, `tests/scenarios/full-duel.test.ts` | Damage and deckout wins have normal-start transcripts; simultaneous defeat remains partial |
| Format | 19 + Commander singleton validation, colorless Light/Dark, Forward L Commander | `tests/rules/format.test.ts`, `tests/content/deck-editor.test.ts` | Implemented |
| Persistence | Accepted command replay from a saved origin, choice recovery, stable actor, choice bounds, option references, typed-frame checks, and an instance/owner/Commander manifest checked against both snapshots | `tests/storage/save.test.ts`, `tests/storage/import-errors.test.ts`, `tests/e2e/smoke.spec.ts` | Partial; registered origin reconstruction and full semantic validation remain |

## Current interaction coverage

| Rule area | Scenario | Test | Status |
|---|---|---|---|
| End Phase checkpoints | Trigger ordering, action restrictions, discard to five, marked damage clear, temporary expiry, excess-Backup departure batching, forced-loop detection, typed controller-End delays, and a Rising Undertow turn-cycle transcript | `tests/rules/end-phase.test.ts`, `tests/rules/loops.test.ts`, `tests/rules/operations.test.ts`, `tests/scenarios/preset-transcripts.test.ts` | Partial; other cleanup-trigger and delayed-effect combinations remain |
| Scenario origins | Nine deterministic, versioned, validated playtest positions with normal deck instances and invariants; transcripts cover Third Commander Cast, Final Spark/EX, affordable Return Tide, Borrowed Banner forward/Backup control, excess Backup, duplicate-name and Light/Dark conflicts, both Commander destinations, party allocation, First Strike, and Rising Undertow's next controller End Phase discard | `tests/scenarios/coverage.test.ts`, `tests/scenarios/preset-transcripts.test.ts`, `tests/e2e/scenarios.spec.ts` | All advertised preset interactions replay from JSON-round-tripped commands; database recovery at every checkpoint and full card behavior coverage remain partial |
| Turns | Priority handoff, Main 1 → Attack → Main 2 → End, next-turn Active/Draw | `tests/rules/priority.test.ts`, `tests/rules/turn-phases.test.ts` | Partial; stack and End Phase abilities remain |
| Commander | Tax, zone identity, owner-controlled replacement choice, and Return Tide accepted/declined destinations with a departure observer | `tests/rules/commander.test.ts`, `tests/rules/engine.test.ts`, `tests/scenarios/preset-transcripts.test.ts` | Partial; replacement is integrated with combat and supported Summons |
| Combat | One attack at a time, blocking, battle damage, First Strike, Forward break, removal after control changes, Brave use, Freeze boundaries, element matching, save/reload allocation validation, and an unblocked attack transcript | `tests/rules/combat.test.ts`, `tests/rules/trigger-declaration.test.ts`, `tests/rules/batches.test.ts`, `tests/rules/audit-regressions.test.ts`, `tests/rules/turn-phases.test.ts` | Partial; First Strike triggers wait through normal damage and participant snapshots preserve LKI. Multi-blocker, defeat-precedence, and full allocation acceptance remain |
| Cost departures | CP discards, Backup dulling, source dulling, and sacrifice commit as one pending batch; same-name special-discard selection, excess-Backup choices, and End Phase zero-power departures use validated paths; Commander replacement survives save/reload | `tests/rules/payment.test.ts`, `tests/rules/trigger-declaration.test.ts`, `tests/rules/end-phase.test.ts` | Engine departures covered; card-script departures remain partial |
| Combat action windows | Summons are not offered during First Strike or normal-damage checkpoints | `tests/rules/actions.test.ts`, `tests/rules/combat.test.ts` | Offers match reducer timing; wider combat matrix remains partial |
| Stack | Character bypass, Summon stack, priority passes, selected resolution | `tests/rules/combat.test.ts` | Partial; response abilities and every Summon are not complete |
| Triggers and activated abilities | Entry effects, End Phase effects, simultaneous departure triggers in APNAP order, pre-response target declaration, typed entry/departure/End Phase resolvers, and Night Regent last-known power | `tests/rules/triggers.test.ts`, `tests/rules/trigger-declaration.test.ts`, `tests/rules/end-phase.test.ts`, `tests/content/card-behaviors.test.ts` | Registry-backed command path is exercised; full trigger ordering and card matrix remain partial |
| Summons | War Cry, Return Tide, Controlled Burn, Borrowed Banner, typed delayed Rising Undertow, and Scorch replacement damage | `tests/rules/summon-effects.test.ts`, `tests/rules/end-phase.test.ts` | Partial; other Summon behavior tests remain |
| Replacements | Dawn Guardian reduces a damage instance by 1000 for Summon damage | `tests/rules/summon-effects.test.ts` | Partial; combat damage and replacement ordering remain |
| EX Burst | Damage batch completes first; ordered optional EX choices; no response window; registry-backed Scorch, Return Tide, and Archive Keeper accept/decline continuations; Final Spark reaches both EX decisions through the production reducer | `tests/rules/ex-burst.test.ts`, `tests/content/card-behaviors.test.ts`, `tests/scenarios/preset-transcripts.test.ts` | All three EX cards use typed continuations in production context; full damage-limit and interaction coverage remain partial |
| Targets | Resolve-time target revalidation, duplicate target rejection, and printed target declarations that allow War Cry to affect an opponent Forward | `tests/rules/targets.test.ts`, `tests/content/catalog.test.ts` | Partial; several card-specific target combinations remain |
| Effects | Timestamped control recomputation, power changes, keyword additions, control expiry, Banner Smith registry field provider, Dawn Guardian registry replacement provider, stolen Forward readiness, effective Haste offers, and control-based target lists | `tests/rules/continuous-effects.test.ts`, `tests/rules/state.test.ts`, `tests/rules/combat.test.ts`, `tests/content/card-behaviors.test.ts` | Registry-backed production context is exercised; complete rule processes and replacement ordering remain partial |
| Offline | Cache install, offline reload, continued match | `tests/e2e/smoke.spec.ts` | Partial; build-update lifecycle and full offline duel remain |
| Arena interaction | Hand fan, playable card glow, click/drag casting, targets and arrows, bottom-left choice dock | `tests/e2e/smoke.spec.ts` | Partial; every decision path and overflow acceptance remain |
| Action availability | Read-only cast and supported activated ability legality, CP sufficiency, target presence, Commander tax, opposing-turn Summon windows, host action projection, and Commander tray | `tests/rules/actions.test.ts`, `tests/host/card-tray.test.ts`, `tests/host/views.test.ts` | Partial; exhaustive payment combinations and all target rules are not yet represented in offers |

## Pending milestone 2 scenarios

Implementation note: normal-start transcripts cover both a seven-damage win and a deckout. Dusk Reaver, Quartermaster, Frost Binder, Tide Warden, Archive Keeper, Recovery Clerk, Ember Medic, Mist Caller, Cinder Witness, Tide Witness, Night Regent, Rising Undertow, Dawn Guardian, and all three EX cards have executable behavior tests.

- Full trigger ordering, replacement ordering, and behavior coverage for all 40 catalog cards.
- Summon target revalidation, mode choices, cancel effects, delayed abilities, and multi-step resolution.
- Freeze processing, 0-power rule process, control-change restrictions, replacement ordering, and simultaneous effects.
- Full First Strike and non-First Strike combat, multi-Forward damage allocation, multiple blockers, and all defeat timing. A focused regression covers deferred First Strike departure triggers; it does not close the combat matrix.
- Simultaneous damage/deckout precedence, full combat coverage, and complete no-fixture UI duels.
- Typed module scripts and registry entries for all 40 cards, with behavior-version entries in the catalog fingerprint. Production reducer tests cover typed Summons, activated abilities, EX, entry/departure/End Phase triggers, field providers, replacements, and a synthetic script; complete assertion-backed behavior coverage for every card remains open.

## Pending milestone 3 acceptance

- Real pointer tests for casting from hand and Commander Zone, target arrows, payment-source selection, and every mandatory prompt.
- Resume/export/import error recovery, safe service-worker updates, and a complete cached offline duel.
- Visual review at 1280 × 720 and 1920 × 1080, reduced motion, accessible overflow, and a recorded unscripted playtest.
