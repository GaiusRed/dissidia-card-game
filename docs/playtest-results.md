# Playtest Results

## Automated checks completed

| Check | Result |
|---|---|
| Rule, format, setup, payment, combat, stack, storage, host, editor, and scenario tests | Passed; 72 tests across 22 files |
| Strict TypeScript checks | Passed after the latest engine and host changes |
| Rule import boundary | Passed; rules contain no forbidden platform dependencies |
| Production build and service-worker generation | Passed; Phaser bundle is precached locally |
| Playwright setup and phase controls | Passed |
| Playwright custom deck edit/save | Passed |
| Playwright reload during an opening choice | Passed |
| Playwright real-pointer cast from the card fan | Passed at 1280 × 720; viewport resized to 1920 × 1080 |
| Playwright offline reload | Passed in a new browser context with network disabled |
| Coverage structure check | Passed; exact catalog/deck structure and linked test-file paths checked. Behavior gaps remain listed in `docs/rules-coverage.md`. |
| Normal-start rules duels | Passed damage and deckout transcripts from `createMatch`; simultaneous defeat and complete card coverage remain open |

## Release gate still open

No unscripted complete duel or complete cached offline duel has been recorded. The current engine does not implement every placeholder effect, EX Burst, all triggers, all choice types, or the full combat and damage rules. Automated UI checks cover smoke flows only. Review [the coverage table](rules-coverage.md), [the UI review](ui-reference.md), and [the implementation plan](superpowers/plans/2026-10-07-playtest-ready-mvp.md) before using this build for rules conclusions.

## Manual session record

No manual session is recorded yet.
