# Arena-Style UI Review

This review records the desktop presentation against design section 10. It uses an interaction checklist instead of copied game artwork. The table keeps familiar card-game patterns while using original placeholder art.

## Reference checklist

| Area | Requested direction | Current implementation | Status |
|---|---|---|---|
| Table | Opponent above, own seat below, battlefield between | Four labeled rows: opponent Backups above Forwards; own Forwards above Backups, with both Forward rows toward the center | Implemented for tested two-seat layouts |
| Hand | Bottom-center fan with playable cards emphasized | Tested sizes 0, 1, 5, 7, 10, and 19. Overflow scrolls horizontally; playable cards glow and can be clicked or dragged | Implemented for tested Character casting and hand sizes |
| Other playable zones | Same interaction model with source zone visible | Commander is a playable card beside the hand; its badge and tax-inclusive cost follow its rules object. Break Zone targets appear in a labeled tray for recovery abilities | Partial; only Commander and two Break Zone abilities use the extension |
| Targeting | Select a source, highlight legal targets, show a source-to-target arrow | Target drafts highlight targets and draw a dashed arrow | Partial; supported Summons only |
| Choices | Contextual buttons near the bottom-left | Choice dock is anchored at bottom-left; tests cover setup, mulligan, two-card discard, and damage allocation | Partial; the full choice-kind matrix remains open |
| Payment | Review costs and CP sources before submission | Editable payment dock shows cost/tax, generated/spent/remainder, required D/sacrifice components, and source selections; Forge Apprentice can be reviewed, targeted, confirmed, and resolved through the UI | Partial; Commander-tax, rejected-activation retention, and every element combination need browser coverage |
| Combat | Clear attack and block assignment | Party selection supports multiple Forwards; the UI exposes blocker options and the allocation editor | Partial; one blocker, First Strike flow, and full combat control review remain open |
| Stack and history | Keep stack and game log visible without obscuring decisions | Center stack and accessible game log are present | Partial |
| Menu and deck editing | Familiar compact controls with readable card list | Local menu, two preset decks, browser, and singleton editor | Partial |
| Cosmetics | No pets or board cosmetics | No pet slot or cosmetic board controls | Implemented |

## Evidence

- The monitored Playwright design suite runs 48 cases across 1280×720 and 1920×1080 with normal and reduced motion. It checks hand reachability, row order, player labels, peer button heights, target selection, choice controls, party selection, allocation, cast and activation payment review, and Escape cancellation.
- Browser tests drag a playable card from the bottom hand fan at both supported desktop sizes. Other tests exercise match controls, the deck editor, reload recovery, and offline reload.
- Durable crowded-board captures are available for all four size/motion projects: [1280 normal](ui-captures/crowded-board-1280-normal.png), [1280 reduced motion](ui-captures/crowded-board-1280-reduced.png), [1920 normal](ui-captures/crowded-board-1920-normal.png), and [1920 reduced motion](ui-captures/crowded-board-1920-reduced.png). The normal-motion captures were inspected: player and row labels are clear, Forward rows face the center, controls stay in the footer, and the hand stays in its reserved area.
- Durable payment-review captures are available for all four projects: [1280 normal](ui-captures/payment-draft-1280-normal.png), [1280 reduced motion](ui-captures/payment-draft-1280-reduced.png), [1920 normal](ui-captures/payment-draft-1920-normal.png), and [1920 reduced motion](ui-captures/payment-draft-1920-reduced.png). The source list stays inside its bounded panel; Confirm and Cancel use matching control dimensions.
- Activated-ability payment captures are available for all four projects: [1280 normal](ui-captures/payment-activation-1280-normal.png), [1280 reduced motion](ui-captures/payment-activation-1280-reduced.png), [1920 normal](ui-captures/payment-activation-1920-normal.png), and [1920 reduced motion](ui-captures/payment-activation-1920-reduced.png). The full ability text stays in the card details; the shorter action label fits without clipping.
- The complete latest test artifacts are in the [Playwright UI design report](../playwright-report/ui-design/index.html). The test keeps the four crowded-board images in `docs/ui-captures` so reruns do not remove the review evidence.
- The capture review checks layout and readability. It does not compare against captured Arena screens or approve all seven design states.

## Known interaction gaps

- Payment UI tests cover editing a standard discard source, incomplete payment, explicit cast confirmation, Escape cancellation, and an activated ability's cost/target review and resolution. Commander tax, rejected-command retention, and the full element/payment matrix remain untested in the browser.
- The rules support Forward parties but only one blocker. First Strike stages have rules tests; the complete combat flow still needs real-pointer review.
- Cards outside the hand are not generally offered as playable cards; Commander presentation is the only extension currently wired to casting.
- Animations and full keyboard navigation remain incomplete. The reduced-motion project runs the current UI cases, but event-motion parity still needs its own acceptance tests.
