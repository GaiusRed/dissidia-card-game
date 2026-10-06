# Arena-Style UI Review

This review records the current desktop presentation against the interaction direction in design section 10. It uses a written checklist instead of copied game artwork. The goal is to preserve the familiar table hierarchy and input patterns while keeping all card art original and placeholder based.

## Reference checklist

| Area | Requested direction | Current implementation | Status |
|---|---|---|---|
| Table | Opposing seat above, own seat below, battlefield between | Phaser playmat with both seats and an accessible HTML battlefield | Partial |
| Hand | Bottom-center fan with playable cards emphasized | Fan at bottom; playable cards glow and can be clicked or dragged | Implemented for tested Character casting |
| Other playable zones | Same card interaction model with source zone visible | Commander is a playable card beside the hand; its badge and tax-inclusive cost follow its actual rules object; Break Zone targets appear in a labeled tray for recovery abilities | Partial; only Commander and two Break Zone abilities use the extension |
| Targeting | Select a source, highlight legal targets, show a source-to-target arrow | Target draft highlights targets and draws a dashed arrow | Partial; supported Summons only |
| Choices | Contextual buttons near the bottom-left | Choice dock is anchored at bottom-left and checked at 1280×720 and 1920×1080 | Implemented for current prompts |
| Combat | Clear attack and block assignment | Attack and block controls expose the current Forward and defender options | Partial; single attacker and blocker only |
| Stack and history | Keep stack and game log visible without obscuring decisions | Center stack and accessible game log are present | Partial |
| Menu and deck editing | Familiar compact controls with readable card list | Local menu, two preset decks, browser, and singleton editor | Partial |
| Cosmetics | No pets or board cosmetics | No pet slot or cosmetic board controls | Implemented |

## Evidence

- Browser tests exercise the bottom-left choice placement at both supported desktop sizes.
- Browser tests drag a playable card from the bottom hand fan at 1280×720 and reflow to 1920×1080.
- Browser tests exercise the visible match controls, deck editor, reload recovery, and offline reload.
- Local board screenshots were inspected at 1280×720 and 1920×1080 after adding the Commander extension. The fan, extension, and footer remain reachable; the Commander badge is visible beside the hand. This is a layout check, not a comparison against captured Arena screens.
- Automated tests do not verify visual similarity to Magic: The Gathering Arena. A human screenshot comparison and an unscripted complete duel remain open release checks.

## Known interaction gaps

- Real-pointer tests do not yet cover every payment choice, Commander casting, every Summon target mode, or all decision panels.
- The board currently supports one attacker and one blocker in an attack sequence.
- Cards outside the hand are not generally offered as playable cards; the Commander presentation is the only extension currently wired to casting.
- Animations, full keyboard navigation, reduced-motion review, and all viewport screenshots remain incomplete.
