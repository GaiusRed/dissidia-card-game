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
| Persistence | Accepted command replay from a saved origin and choice recovery after reload | `tests/storage/save.test.ts`, `tests/e2e/smoke.spec.ts` | Implemented |

## Current interaction coverage

| Rule area | Scenario | Test | Status |
|---|---|---|---|
| End Phase checkpoints | Trigger ordering, action restrictions, discard to five, marked damage clear, temporary expiry | `tests/rules/end-phase.test.ts` | Partial; loops and all cleanup-trigger cases remain |
| Scenario origins | Six deterministic, validated playtest positions with normal deck instances and invariants | `tests/scenarios/coverage.test.ts`, `tests/e2e/scenarios.spec.ts` | All six load and one launches in the browser; card behavior coverage remains separately partial |
| Turns | Priority handoff, Main 1 → Attack → Main 2 → End, next-turn Active/Draw | `tests/rules/priority.test.ts`, `tests/rules/turn-phases.test.ts` | Partial; stack and End Phase abilities remain |
| Commander | Tax, zone identity, owner-controlled replacement choice | `tests/rules/commander.test.ts`, `tests/rules/engine.test.ts` | Partial; replacement is integrated with combat and supported Summons |
| Combat | One attack at a time, blocking, battle damage, First Strike, Forward break | `tests/rules/combat.test.ts` | Partial; full combat rules and allocation choices remain |
| Stack | Character bypass, Summon stack, priority passes, selected resolution | `tests/rules/combat.test.ts` | Partial; response abilities and every Summon are not complete |
| Triggers and activated abilities | Entry effects, End Phase effects, Cinder Witness, Tide Witness, and Night Regent last-known power; Recovery Clerk and Ember Medic | `tests/rules/triggers.test.ts` | Partial; full trigger ordering and EX Burst remain |
| Summons | War Cry, Return Tide, Controlled Burn, Borrowed Banner, Rising Undertow, and Scorch replacement damage | `tests/rules/summon-effects.test.ts` | Partial; other Summon behavior tests remain |
| Replacements | Dawn Guardian reduces a damage instance by 1000 for Summon damage | `tests/rules/summon-effects.test.ts` | Partial; combat damage and replacement ordering remain |
| EX Burst | Damage batch completes first; ordered optional EX choices; no response window; Scorch, Return Tide, Archive Keeper | `tests/rules/ex-burst.test.ts` | Covered for all three EX cards; damage-limit and EX-trigger interactions remain partial |
| Targets | Resolve-time target revalidation and duplicate target rejection | `tests/rules/targets.test.ts` | Partial; several card-specific target combinations remain |
| Effects | Power changes, keyword additions, control expiry, field power bonus | `tests/rules/combat.test.ts` | Partial; complete rule processes and layers remain |
| Offline | Cache install, offline reload, continued match | `tests/e2e/smoke.spec.ts` | Partial; build-update lifecycle and full offline duel remain |
| Arena interaction | Hand fan, playable card glow, click/drag casting, targets and arrows, bottom-left choice dock | `tests/e2e/smoke.spec.ts` | Partial; every decision path and overflow acceptance remain |

## Pending milestone 2 scenarios

Implementation note: normal-start transcripts cover both a seven-damage win and a deckout. Dusk Reaver, Quartermaster, Frost Binder, Tide Warden, Archive Keeper, Recovery Clerk, Ember Medic, Mist Caller, Cinder Witness, Tide Witness, Night Regent, Rising Undertow, Dawn Guardian, and all three EX cards have executable behavior tests.

- Full trigger ordering, replacement ordering, and behavior coverage for all 40 catalog cards.
- Summon target revalidation, mode choices, cancel effects, delayed abilities, and multi-step resolution.
- Freeze processing, 0-power rule process, control-change restrictions, replacement ordering, and simultaneous effects.
- Full First Strike and non-First Strike combat, multi-Forward damage allocation, multiple blockers, and all defeat timing.
- Simultaneous damage/deckout precedence, full combat coverage, and complete no-fixture UI duels.

## Pending milestone 3 acceptance

- Real pointer tests for casting from hand and Commander Zone, target arrows, payment-source selection, and every mandatory prompt.
- Resume/export/import error recovery, safe service-worker updates, and a complete cached offline duel.
- Visual review at 1280 × 720 and 1920 × 1080, reduced motion, accessible overflow, and a recorded unscripted playtest.
