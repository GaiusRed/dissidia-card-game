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

The MVP is still under implementation. See [the implementation plan](docs/superpowers/plans/2026-10-07-playtest-ready-mvp.md) and [rules coverage](docs/rules-coverage.md) for implemented behavior and pending acceptance cases. Do not use the current build as a complete FFTCG rules authority.

## Verify

```powershell
npm run typecheck
npm run check:boundaries
npm run check:coverage
npm test
npm run build
npm run test:e2e
```

For offline installation, run `npm run build` and serve the `dist` folder. Open it once while online, wait for **Ready for offline play**, then reload with network disabled. The service worker caches this build locally.

Read [playtesting instructions](docs/playtesting.md) for control details, saves, and known gaps.
