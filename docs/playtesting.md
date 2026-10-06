# Playtesting the Offline Build

## Install and run

Run these commands from the repository root:

```powershell
npm ci
npm run dev
npm run typecheck
npm run check:boundaries
npm test
npm run build
npm run test:e2e
```

The Vite development server supports local matches. For offline startup, run `npm run build` and serve the `dist` directory through localhost or a static host. Open the release once while online. Wait for **Ready for offline play** before disabling the network. A new computer needs the initial release download.

## Start a duel

1. Select a deck for Player 1 and Player 2. The supplied choices are Cinder Company and Tidal Assembly. Saved custom decks appear in the selector.
2. Enter a match seed to repeat a shuffle. Leave the field blank to choose a random seed.
3. Select **New match**. The game chooses which player decides turn order.
4. Each player chooses **Keep** or redraws once. A redraw asks for the order of all five cards going to the bottom of the deck.
5. Use the priority button during each decision window. Passing priority and advancing the turn are separate steps.

Use **Focused playtest scenario** to launch one of the six prepared positions for Commander tax, multiple EX Bursts, control limits, End Phase triggers, party/First Strike combat, or Commander destinations. Each scenario starts a separate match origin and saves like a normal duel.

The local host controls both seats. The seat that owns the open choice or priority appears at the bottom for that action. **Inspect Player** changes the viewed seat without changing decision ownership.

## Play cards and make choices

- The bottom of the screen shows a fan of hand cards. A gold border marks cards with an available cast payment.
- Click a playable card, inspect it in the lower-left panel, then choose **Cast**. Drag a card onto the battlefield to use the same cast path.
- The engine selects matching CP sources automatically. A Backup generates one CP when dulled. Discarding a card generates two CP; unused CP expires. The current interface does not yet let the player choose among multiple valid payment combinations.
- Click a target on the battlefield after selecting a targeted Summon or supported ability. The source-to-target arrow shows the draft. **Cancel** clears it without submitting a command.
- The Commander stays in its own Commander Zone tray. Casts from that zone cost two extra CP for each earlier successful Commander Zone cast. When a Commander leaves the field through a supported effect, its owner chooses its destination.
- The contextual choice panel appears at the bottom left. Confirm mandatory choices there. The panel cannot be dismissed by Escape.
- Rising Undertow's delayed discard appears as a card choice at the start of its controller's End Phase.

## Save and recover

The host saves after each accepted command. Reloading restores the open choice or priority window. On restore or import, the app checks versions, state invariants, and replays accepted commands from the saved origin.

Use **Export save** to download a JSON diagnostic file. Use **Import** to restore a compatible file. A rejected import leaves the current match active. Include the seed, displayed app versions, last action, expected result, actual result, and exported file when reporting a defect.

## Scope and known gaps

The card set is synthetic. It represents rules interactions and does not reproduce official FFTCG cards. The rules engine and table are not complete yet. The current build does not support every placeholder ability, Summon, trigger, EX Burst, choice, effect layer, or combat allocation rule. Check [the coverage table](rules-coverage.md) before a playtest and record any manual workaround. Engine version 2 changes EX Burst and End Phase timing; older saves require export for reference and cannot resume in this version.

Pets, board cosmetics, card collections, pack opening, matchmaking, and online accounts are outside this MVP.
