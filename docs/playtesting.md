# Playtesting

## Install and run

Run these commands from the repository root:

```powershell
npm ci
npm run dev
```

Open the localhost address printed by Vite. Run the checks before sharing a build:

```powershell
npm run typecheck
npm run check:boundaries
npm test
npm run build
npm run test:e2e
npm run test:ui-design
npm run test:release
```

The UI behavior suite checks 1280×720 and 1920×1080 with normal and reduced motion. GitHub Actions runs on pushes to `main` and manual dispatch. It retains browser failure traces and screenshots.

For offline startup, run `npm run build` and serve the `dist` directory through localhost or a static host. Open it once while online. Wait for **Ready for offline play** before disabling the network.

## Start a duel

1. Select a deck for each player. The supplied choices are Cinder Company and Tidal Assembly. Saved custom decks appear in the selector.
2. Enter a match seed to repeat a shuffle. Leave it blank for a random seed.
3. Select **New match**. The game asks which player takes the first turn.
4. Each player chooses **Keep** or redraws once. A redraw asks for the order of the five cards placed on the bottom of the deck.
5. Smart Priority is on by default. It passes when a seat has no legal action, passes its owner's initial response to a newly played effect, and removes empty attack or blocker decisions. It preserves legal opponent responses. Turn **Hold Priority** on to require manual passes for that seat.

Use **Focused playtest scenario** to launch a registered position for a specific rules interaction. Each scenario starts a separate match origin and saves like a normal duel.

The local host controls both seats. The player who owns the open choice or priority appears at the bottom. **Inspect Player** changes the viewed seat without changing decision ownership.

## Cards and decisions

- Click a playable card, then choose **Cast**. Dragging a card onto the battlefield uses the same cast path.
- Click eligible Backups or hand cards to select CP sources. Review the amount and confirm the payment. A Backup generates one CP when dulled. Discarding a card generates two CP; unused CP expires. Light and Dark cards cannot be discarded for CP under FFTCG rule 5.2.1.3.
- Click eligible cards for targets and card choices. The interface shows selection order where it applies. Use named controls for choices that do not select cards.
- Right-click a card to inspect it. Keyboard users can select a card and press **I**. Press **Escape** to close inspection.
- Required decisions appear in the lower-right action area. Escape closes inspection but does not cancel a required game choice.
- The Command Zone holds each Commander. A cast from that zone costs two extra CP for each earlier successful cast. When a Commander leaves the field through a supported effect, its owner chooses its destination.
- Click either player's Break, Damage, or Removed counter to inspect its public cards. A deck counter shows its count; remaining card identities and order stay hidden.
- The match log shows the current phase, actor, public effects, and repeated events. Smart passes are marked in the log.

## Save and recover

The host saves after each accepted command. Reloading restores the open choice or priority window. On restore or import, the app checks state invariants and replays accepted commands from the saved origin.

Use **Export save** to download a JSON file. Use **Import** to restore a compatible file. A rejected import leaves the current match active. Include the seed, last action, expected result, actual result, and exported file when reporting a defect.

## Scope

The catalog is synthetic and does not reproduce official FFTCG cards. Some placeholder abilities and rules interactions remain unsupported. Use scenarios to isolate known supported cases and report unexpected outcomes with a seed and exported save. This build is not a complete FFTCG rules authority.
