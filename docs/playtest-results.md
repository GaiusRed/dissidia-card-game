# Playtest Results

## Automated checks completed

| Check | Result |
|---|---|
| Rule, format, setup, payment, combat, stack, storage, host, editor, action-offer, tray, and scenario tests | Passed; 98 tests across 28 files |
| Strict TypeScript checks | Passed with engine version 2 |
| Rule import boundary | Passed; rules contain no forbidden platform dependencies |
| Production build and service-worker generation | Passed; Phaser bundle is precached locally |
| Playwright setup and phase controls | Passed |
| Playwright mulligan ordering and focused scenario launch/resume | Passed |
| Playwright custom deck edit/save | Passed |
| Playwright reload during an opening choice | Passed |
| Playwright real-pointer cast from the card fan | Passed at 1280 × 720; viewport resized to 1920 × 1080 |
| Playwright Commander tray | Passed; the Commander remains the same rules object, shows its Commander Zone badge, and displays the current tax-inclusive cost |
| Playwright offline reload | Passed in a new browser context with network disabled |
| Coverage structure check | Passed; exact catalog/deck structure and 25 linked test-file paths checked. Behavior gaps remain listed in `docs/rules-coverage.md`. |
| Normal-start rules duels | Passed damage and deckout transcripts from `createMatch`; simultaneous defeat and complete card coverage remain open |
| EX Burst and target checks | Passed for all three placeholder effects, ordered optional choices after the damage batch, no response window, save/restore, and delayed seven-damage outcome |
| End Phase checkpoints | Passed trigger ordering, action restrictions, hand-size choice, damage clear, and temporary-effect cleanup |

## Release gate still open

No unscripted complete duel or complete cached offline duel has been recorded. The current engine does not implement every placeholder effect, EX Burst, all triggers, all choice types, or the full combat and damage rules. Automated UI checks cover smoke flows only. Review [the coverage table](rules-coverage.md), [the UI review](ui-reference.md), and [the implementation plan](superpowers/plans/2026-10-07-playtest-ready-mvp.md) before using this build for rules conclusions.

## Manual session record

No manual session is recorded yet.
