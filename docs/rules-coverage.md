# Rules and Playtest Coverage

Rule references point to [FFTCG Comprehensive Rules v3.3](fftcg-comprules-v3.3.pdf). A test row is marked implemented only when an executable test covers the stated behavior.

`npm run check:coverage` checks catalog, deck, module, and test-link structure. `npm run test:coverage-matrix` also runs the Vitest, E2E, UI-design, and release suites, then fails if a linked test file is absent, skipped, or has no passing assertions. This file-level execution gate does not replace review of the card-by-card and S/F audit mappings.

## Foundation scenarios

| Rule | Scenario | Test | Status |
|---|---|---|---|
| 8.2.1 | Starting player, opening hands, mulligan, and first Draw Phase; F25 regression confirms the starting-player choice precedes both opening draws | `tests/rules/setup.test.ts` (`F25:`), `tests/rules/foundation.test.ts` | Implemented |
| 11.2.2 | CP generation, element choice, exact spending, unused CP expiry, and atomic payment | `tests/rules/payment.test.ts` | Implemented |
| 7.7 | Backup capacity, duplicate non-Generic names, and Light/Dark field limit | `tests/rules/casting.test.ts` | Implemented |
| 12.4 | Seven damage, deck exhaustion, concession, simultaneous seven-damage defeat, and simultaneous damage/deckout defeat | `tests/rules/outcomes.test.ts`, `tests/rules/combat.test.ts`, `tests/scenarios/full-duel.test.ts`, `tests/scenarios/preset-transcripts.test.ts` | Core outcome combinations are asserted; additional EX-queue and rule-process precedence cases remain partial |
| Format | 19 + Commander singleton validation, colorless Light/Dark, Forward L Commander | `tests/rules/format.test.ts`, `tests/content/deck-editor.test.ts` | Implemented |
| Persistence | Accepted command replay from a reconstructed normal or registered scenario origin, choice recovery, stable actor, typed resume validation, choice bounds and option references, instance manifest checks, plus real-host recovery at starting-player, mulligan/order, trigger-target, allocation, resolving-Summon, Commander-replacement-batch, delayed-effect, delayed discard-card, Commander-confirmation, and stable combat-stage checkpoints; a Return Tide Commander destination choice also survives offline reload on build A while build B waits, then completes before update acceptance; Controlled Burn's selected mode is persisted in its cast command and replayed; a complete normal-start offline duel at two viewports exports and replays | `tests/storage/save.test.ts`, `tests/storage/import-errors.test.ts`, `tests/storage/semantic-save.test.ts`, `tests/scenarios/preset-transcripts.test.ts`, `tests/e2e/smoke.spec.ts`, `tests/e2e/complete-duel.spec.ts`, `tests/release/update-lifecycle.spec.ts` | Core recovery and the scripted duel pass; additional recovery permutations and manual play remain open |

## Current interaction coverage

| Rule area | Scenario | Test | Status |
|---|---|---|---|
| End Phase checkpoints | Trigger ordering, action restrictions, discard to five, marked damage clear, temporary expiry, excess-Backup departure batching, forced-loop detection, typed controller-End delays, and a Rising Undertow turn-cycle transcript | `tests/rules/end-phase.test.ts`, `tests/rules/loops.test.ts`, `tests/rules/operations.test.ts`, `tests/scenarios/preset-transcripts.test.ts` | Partial; other cleanup-trigger and delayed-effect combinations remain |
| Scenario origins | Fifteen deterministic, versioned, validated playtest positions with normal deck instances and invariants; transcripts cover Third Commander Cast, Final Spark/EX, affordable Return Tide, Borrowed Banner forward/Backup control, excess Backup, duplicate-name and Light/Dark conflicts, both Commander destinations, party allocation, First Strike, Rising Undertow's next controller End Phase discard, and the Tide Warden Commander entry-target UI choice | `tests/scenarios/coverage.test.ts`, `tests/scenarios/preset-transcripts.test.ts`, `tests/e2e/scenarios.spec.ts`, `tests/ui-design/choices.spec.ts` | Registered origins and advertised interactions are validated and replayed; database recovery at every checkpoint and full card behavior coverage remain partial |
| Turns | Priority handoff, Main 1 → Attack → Main 2 → End, next-turn Active/Draw | `tests/rules/priority.test.ts`, `tests/rules/turn-phases.test.ts` | Partial; stack and End Phase abilities remain |
| Commander | Tax, zone identity, owner-controlled replacement choice, and Return Tide accepted/declined destinations with a departure observer | `tests/rules/commander.test.ts`, `tests/rules/engine.test.ts`, `tests/scenarios/preset-transcripts.test.ts` | Partial; replacement is integrated with combat and supported Summons |
| Combat | One attack at a time, a single blocker for an attack or party, battle damage, First Strike, Forward break, removal after control changes, Brave use, Freeze boundaries, element matching, save/reload allocation validation for a split and full-damage-to-either-attacker extremes, and an unblocked attack transcript | `tests/rules/combat.test.ts`, `tests/rules/trigger-declaration.test.ts`, `tests/rules/batches.test.ts`, `tests/rules/audit-regressions.test.ts`, `tests/rules/turn-phases.test.ts` | Partial; broader party/defeat timing combinations remain. FFTCG permits only one Forward to block another; a blocker can block a party when it can legally block one member ([official FFTCG FAQ](https://fftcg.square-enix-games.com/en/play-article/faq), [official keyword rules](https://fftcg.square-enix-games.com/na/play-article/keywords)). |
| Cost departures | CP discards, Backup dulling, source dulling, and sacrifice commit as one pending batch; same-name special-discard selection, excess-Backup choices, End Phase zero-power departures, and typed card-script moves use validated paths; Commander replacement survives save/reload | `tests/rules/payment.test.ts`, `tests/rules/trigger-declaration.test.ts`, `tests/rules/end-phase.test.ts`, `tests/rules/summon-effects.test.ts` | Generic batches are implemented; complete per-card departure assertions remain partial |
| Combat action windows | Summons are not offered during First Strike or normal-damage checkpoints | `tests/rules/actions.test.ts`, `tests/rules/combat.test.ts` | Offers match reducer timing; wider combat matrix remains partial |
| Stack | Character bypass, ordered source/controller/target projections, stack priority and resolution, paused Summon detail, and departed-source snapshot | `tests/rules/combat.test.ts`, `tests/host/views.test.ts`, `tests/ui-design/layout.spec.ts` | Partial; response abilities, all Summons, and remaining paused-resolution combinations are not complete |
| Triggers and activated abilities | Entry effects, End Phase effects, simultaneous departure triggers in APNAP order, pre-response target declaration, Commander return observed by Tide Witness but excluded from Cinder Witness's Break-only condition, typed entry/departure/End Phase resolvers, Night Regent last-known power, production Tide Warden Undertow cost/target/return, and Ember Medic wrong-owner target rollback before costs | `tests/rules/triggers.test.ts`, `tests/rules/trigger-declaration.test.ts`, `tests/rules/end-phase.test.ts`, `tests/rules/payment.test.ts`, `tests/content/card-behaviors.test.ts` | Current placeholder trigger behaviors are assertion-backed; broader rules interactions remain partial |
| Summons | Accepted production-path effects for all twelve Summons; Scorch replacement handling; Twin Embers simultaneous damage and duplicate-target rejection; both Controlled Burn modes; Ashen Verdict accepted dull-target and rejected active-target cases; Return Tide Commander replacement; Stillwater cancellation and rejected-target atomicity; EX decisions/continuations; Borrowed Banner expiry; Rising Undertow with simultaneous Mist Caller End Phase triggers | `tests/rules/summon-effects.test.ts`, `tests/rules/end-phase.test.ts`, `tests/rules/targets.test.ts`, `tests/scenarios/preset-transcripts.test.ts`, `tests/rules/combat.test.ts` | Targeted card acceptance is covered; broader cross-card and rules-matrix combinations remain partial |
| Replacements | Dawn Guardian reduces each Summon and combat damage instance by 1000, to a zero floor; Commander return is checked against both destination and leave-field trigger behavior | `tests/rules/summon-effects.test.ts`, `tests/rules/combat.test.ts`, `tests/rules/commander.test.ts`, `tests/rules/triggers.test.ts` | Current placeholder replacements are assertion-backed; overlapping replacement combinations beyond the card pool remain partial |
| EX Burst | Damage batch completes first; ordered optional EX choices; no response window; registry-backed Scorch, Return Tide, and Archive Keeper accept/decline continuations; Final Spark reaches both EX decisions through the production reducer | `tests/rules/ex-burst.test.ts`, `tests/content/card-behaviors.test.ts`, `tests/scenarios/preset-transcripts.test.ts` | All three EX cards use typed continuations in production context; full damage-limit and interaction coverage remain partial |
| Targets | Resolve-time target revalidation, duplicate target rejection, printed target declarations that allow War Cry to affect an opponent Forward, and Ashen Verdict's active-target rejection before CP payment | `tests/rules/targets.test.ts`, `tests/content/catalog.test.ts` | Partial; several card-specific target combinations remain |
| Effects | Timestamped control recomputation, power changes, keyword additions, control expiry, Banner Smith registry field provider, Dawn Guardian registry replacement provider, stolen Forward readiness, effective Haste offers, and control-based target lists | `tests/rules/continuous-effects.test.ts`, `tests/rules/state.test.ts`, `tests/rules/combat.test.ts`, `tests/content/card-behaviors.test.ts` | Registry-backed production context is exercised; complete rule processes and replacement ordering remain partial |
| Offline | Cache install, no-remote-request offline reload at a pending starting-player choice, complete normal-start duel, save export and deterministic transcript replay at 1280×720 and 1920×1080, active-mulligan build pin and all-tabs-closed recovery, card-driven pending-choice recovery while build B waits, completed-match update acceptance | `tests/e2e/complete-duel.spec.ts`, `tests/e2e/smoke.spec.ts`, `tests/release/update-lifecycle.spec.ts` | Scripted two-size offline duel and three real two-build lifecycle cases pass; unscripted play and additional update permutations remain open |
| Arena interaction | Hand fan, playable card glow, click/drag casting, targets and arrows, bottom-left choice dock | `tests/e2e/smoke.spec.ts` | Partial; every decision path and overflow acceptance remain |
| Action availability | Read-only cast and supported activated ability legality, CP sufficiency, target presence, Commander tax, opposing-turn Summon windows, host action projection, and Commander tray | `tests/rules/actions.test.ts`, `tests/host/card-tray.test.ts`, `tests/host/views.test.ts` | Partial; exhaustive payment combinations and all target rules are not yet represented in offers |

## Milestone 2 exit evidence

The original design spec sets the Milestone 2 exit condition as executable scenarios in the coverage table. Every rule-area row and all 40 card behaviors now map to assertions below. The full executed-evidence gate passed all 42 linked test files with assertions and no skips. Normal-start transcripts cover a seven-damage win and a deckout.

## Broader rules limitations

The scenario-backed Milestone 2 exit is met. These additional combinations remain documented for future coverage and do not erase the current acceptance evidence:

- Cross-card trigger and replacement combinations beyond the production card pool and the recorded APNAP/Commander scenarios.
- Broader First Strike and non-First Strike combat/departure/outcome timing. A two-attacker allocation covers a 1000/2000 split, full 3000 damage assigned to either attacker, and malformed answers rejected after save/reload. FFTCG permits only one Forward to block another; one blocker may block a party if it can legally block a member (see the official rule links in the Combat row above).
- Further EX-queue and rule-process precedence combinations, plus additional no-fixture UI duel seeds and decks. Existing tests cover exact seven-damage EX deferral and simultaneous seven-damage/deckout draw.
- Additional save/recovery and service-worker timing permutations beyond the tested decision categories and three two-build lifecycle cases.

## Card-to-assertion map

Every catalog entry is checked for exact metadata and printed rules text by `tests/content/catalog.test.ts`; every card has a registered typed module checked by `tests/content/registry.test.ts`. The table below maps each card's executable behavior. “No abilities” cards are checked as such in the catalog and exercised by shared format/casting rules. The executed-evidence gate runs every listed test file.

| Card | Behavior assertion |
|---|---|
| P-001L Cinder Marshal | `tests/rules/audit-regressions.test.ts`, `tests/rules/payment.test.ts` — Flare Order accepted damage, rejected target/cost, and lethal checkpoint. |
| P-002C Cinder Marshal | No abilities; exact catalog assertion plus shared casting/format tests. |
| P-003C Ash Recruit | No abilities; exact catalog assertion plus shared casting/format tests. |
| P-004C Ash Recruit | No abilities; exact catalog assertion plus shared casting/format tests. |
| P-005R Spark Runner | `tests/rules/combat.test.ts`, `tests/rules/actions.test.ts` — Haste readiness and legal attack. |
| P-006R Ember Duelist | `tests/rules/combat.test.ts` — First Strike damage and departure timing. |
| P-007H Dusk Reaver | `tests/content/card-behaviors.test.ts`, `tests/rules/triggers.test.ts` — entry trigger and temporary power reduction. |
| P-008H Dawn Guardian | `tests/content/card-behaviors.test.ts`, `tests/rules/combat.test.ts`, `tests/rules/summon-effects.test.ts` — per-instance damage replacement and zero floor. |
| P-009C Coal Tender | No abilities; exact catalog assertion plus shared Backup capacity and payment tests. |
| P-010C Forge Apprentice | `tests/rules/audit-regressions.test.ts`, `tests/rules/continuous-effects.test.ts` — Fire-only target, dull cost, and +1000 effect. |
| P-011R Quartermaster | `tests/content/card-behaviors.test.ts`, `tests/rules/triggers.test.ts` — Soldier search and empty-match boundary. |
| P-012H Banner Smith | `tests/content/card-behaviors.test.ts`, `tests/rules/continuous-effects.test.ts` — controlled Fire Forward field provider. |
| P-013R Ember Medic | `tests/rules/payment.test.ts`, `tests/rules/trigger-declaration.test.ts` — owner-zone target, exact cost, sacrifice, and rollback. |
| P-014R Cinder Witness | `tests/content/card-behaviors.test.ts`, `tests/rules/triggers.test.ts` — Break-only trigger condition and damage effect. |
| P-015C Scorch | `tests/content/card-behaviors.test.ts`, `tests/rules/ex-burst.test.ts`, `tests/rules/summon-effects.test.ts` — accepted/declined EX and normal Summon damage. |
| P-016R Twin Embers | `tests/rules/summon-effects.test.ts`, `tests/rules/targets.test.ts` — simultaneous two-target damage and duplicate-target rejection. |
| P-017R War Cry | `tests/rules/summon-effects.test.ts`, `tests/rules/targets.test.ts` — Brave/power effect and opposing-Forward target declaration. |
| P-018R Ashen Verdict | `tests/rules/summon-effects.test.ts`, `tests/rules/targets.test.ts` — accepted dull target and rejected active target before payment. |
| P-019H Final Spark | `tests/rules/summon-effects.test.ts`, `tests/rules/outcomes.test.ts` — two-point damage and outcome processing. |
| P-020H Controlled Burn | `tests/rules/summon-effects.test.ts`, `tests/scenarios/preset-transcripts.test.ts` — both modes, target boundaries, and persisted mode. |
| P-021L Tide Warden | `tests/rules/payment.test.ts`, `tests/rules/triggers.test.ts`, `tests/ui-design/choices.spec.ts` — Undertow exact cost/return plus Commander entry target choice. |
| P-022C Tide Warden | No abilities; exact catalog assertion plus shared casting/format tests. |
| P-023C River Recruit | No abilities; exact catalog assertion plus shared casting/combat tests. |
| P-024C River Recruit | No abilities; exact catalog assertion plus shared casting/combat tests. |
| P-025R Frost Binder | `tests/content/card-behaviors.test.ts`, `tests/rules/triggers.test.ts` — entry dull and Freeze effect. |
| P-026R Tide Duelist | `tests/rules/combat.test.ts` — First Strike damage and departure timing. |
| P-027H Night Regent | `tests/content/card-behaviors.test.ts`, `tests/rules/triggers.test.ts` — last-known power after departure. |
| P-028H Dawn Arbiter | No abilities; exact catalog assertion plus shared casting/combat tests. |
| P-029C Brook Tender | No abilities; exact catalog assertion plus shared Backup capacity and payment tests. |
| P-030C Wave Apprentice | `tests/rules/audit-regressions.test.ts`, `tests/rules/actions.test.ts` — activation cost, accepted Forward target, and pre-cost rejection. |
| P-031R Archive Keeper | `tests/content/card-behaviors.test.ts`, `tests/rules/ex-burst.test.ts` — entry and EX draw/discard continuations. |
| P-032R Recovery Clerk | `tests/rules/payment.test.ts`, `tests/rules/targets.test.ts` — Water/dull cost, owner-zone target, and deck-bottom move. |
| P-033R Tide Witness | `tests/rules/triggers.test.ts`, `tests/rules/end-phase.test.ts` — qualifying leave-field/Commander return observation. |
| P-034R Mist Caller | `tests/rules/triggers.test.ts`, `tests/rules/end-phase.test.ts` — controller End Phase activation and simultaneous trigger ordering. |
| P-035C Return Tide | `tests/content/card-behaviors.test.ts`, `tests/rules/ex-burst.test.ts`, `tests/rules/summon-effects.test.ts` — normal/EX return and Commander replacement. |
| P-036R Stillwater | `tests/rules/summon-effects.test.ts`, `tests/rules/targets.test.ts` — accepted cancellation and rejected-target atomicity. |
| P-037R Guarding Current | `tests/rules/summon-effects.test.ts` — temporary power and First Strike keywords. |
| P-038R Shape Tide | `tests/rules/summon-effects.test.ts`, `tests/rules/continuous-effects.test.ts` — set-power operation and effective power. |
| P-039H Borrowed Banner | `tests/rules/summon-effects.test.ts`, `tests/rules/continuous-effects.test.ts`, `tests/scenarios/preset-transcripts.test.ts` — temporary control, owner/controller distinction, and expiry. |
| P-040R Rising Undertow | `tests/rules/end-phase.test.ts`, `tests/rules/loops.test.ts`, `tests/scenarios/preset-transcripts.test.ts` — delayed controller-End discard across save/reload and source departure. |

The map establishes at least one executed assertion per card behavior; it does not claim that every cross-card permutation has been tested. Those broader combinations remain explicit limitations in the rule-area table above.

## Milestone 3 exit evidence and remaining permutations

Milestone 3 meets the approved plan gate: real-pointer hand and Commander casts, target preview, editable payment, multi-card choices, four viewport/motion projects, cached offline full duels, preset/editor flows, recovery, the two-build update lifecycle, and an unscripted offline session are covered. Durable captures and the unscripted session record are linked from `docs/playtest-results.md` and `docs/ui-reference.md`. Additional recovery and update permutations remain broader coverage limitations.
