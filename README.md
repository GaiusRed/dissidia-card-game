# Dissidia Card Game

An offline, one-user FFTCG Commander Duel playtest. The current build uses the 40-card Opus Placeholder catalog and two 19-card-plus-Commander decks.

## Run locally

```powershell
npm ci
npm run dev
```

Open the localhost address printed by Vite. Choose a deck for each player. Enter a seed to repeat a match, or leave it blank for a random seed.

## Playtest status

The table supports opening choices, Character casting, Command Zone tax, Forward attacks, a supported set of effects, saves, and offline reload. Smart Priority passes when no action is available, skips its owner's initial response to a newly played effect, and removes empty combat decisions. Use **Hold Priority** to retain a response window. Click cards to choose payment sources; right-click or select a card and press **I** to inspect it.

The catalog remains placeholder-only and does not reproduce official FFTCG cards. See [playtesting instructions](docs/playtesting.md) for current controls and limitations. Historical audits and rules references remain in `docs/`.

## Verify

```powershell
npm run typecheck
npm run check:boundaries
npm test
npm run build
npm run test:e2e
npm run test:ui-design
npm run test:release
```

The UI behavior suite checks 1280×720 and 1920×1080 with normal and reduced motion. It relies on interaction and accessibility behavior, not screenshot baselines:

```powershell
npm run test:ui-design
npm run test:ui-design:report
```

GitHub Actions runs on pushes to `main` and manual dispatch. Browser failure traces and screenshots are retained as test artifacts.

For offline installation, run `npm run build` and serve the `dist` folder. Open it once while online, wait for **Ready for offline play**, then reload with network disabled. The service worker caches this build locally.

Read [playtesting instructions](docs/playtesting.md) for control details, saves, and known gaps.
