# Dissidia Card Game

An offline, one-user FFTCG Commander Duel playtest. The current build uses the 40-card Opus Placeholder catalog and two 19-card-plus-Commander decks.

## Run locally

```powershell
npm ci
npm run dev
```

Open the localhost address printed by Vite. Choose a deck for each player. Enter a seed to repeat a match, or leave it blank for a random seed.

## Playtest status

The table supports opening choices, priority, Character casting, the Commander Zone, Commander tax, Forward attacks, blocking, a set of stack effects, saved decks, match recovery, JSON save export/import, and offline reload. The current interaction follows Arena's bottom hand fan, playable-card highlights, click/drag casting, target arrows, and bottom-left choice dock.

The first three MVP milestones are still under implementation. See the [second audit repair plan](docs/superpowers/plans/2026-10-07-dissidia-mvp-second-audit-repair.md), [second branch audit](docs/superpowers/audits/2026-10-07-mvp-second-branch-audit.md), and [rules coverage](docs/rules-coverage.md) for completed behavior and open acceptance cases. Do not use the current build as a complete FFTCG rules authority.

## Verify

```powershell
npm run typecheck
npm run check:boundaries
npm run check:coverage
npm test
npm run build
npm run test:e2e
```

The monitored UI design gate captures both desktop sizes in normal and reduced motion. It checks hand reachability, player/type battlefield rows, control overlap and size, choice layout, and deck search focus:

```powershell
npm run test:ui-design
npm run test:ui-design:report
```

The suite writes screenshots, traces, and an HTML report under `test-results/ui-design` and `playwright-report/ui-design`. Keep the browser failures as repair evidence; do not update snapshots to hide a layout regression. See the [second audit](docs/superpowers/audits/2026-10-07-mvp-second-branch-audit.md) and [repair design](docs/superpowers/specs/2026-10-07-dissidia-mvp-second-audit-repair-design.md).

For offline installation, run `npm run build` and serve the `dist` folder. Open it once while online, wait for **Ready for offline play**, then reload with network disabled. The service worker caches this build locally.

Read [playtesting instructions](docs/playtesting.md) for control details, saves, and known gaps.
