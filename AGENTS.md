# Repository guidance

Maintain the existing TypeScript structure and bright visual style. Keep shared game rules in `src/rules`, card content in `src/content`, transport and projections in `src/host`, and presentation in `src/client`. Keep persistence in `src/storage`. Use small modules with one purpose, existing naming conventions, and explicit types. Consolidate duplicate behavior instead of adding another implementation. Keep `src/main.ts` focused on application assembly.

## Adding rules

- Read `docs/fftcg-comprules-v3.3.pdf` and the applicable approved format decisions before changing game behavior.
- Cite the relevant rule number in the behavioral test or change description.
- Treat playtester comments and Magic Arena behavior as evidence about usability, not FFTCG rules authority.
- Keep Commander Duel exceptions explicit. Do not silently import Magic rules or change the pinned FFTCG rules edition.
- Use **Command Zone** in player-facing text. Commander remains the designated card's role.
- Keep the rules deterministic and independent of browser, storage, network, wall-clock time, and rendering APIs.
- Validate commands in the rules engine. Expose legal actions and rejection reasons through host projections.
- Share legality predicates between action offers and command validation. Do not duplicate card legality in the client.
- Implement reusable mechanics in rules modules. Do not branch on card names, card numbers, or set names there.
- Use the existing operation, batch, scheduler, and serializable continuation contracts for effects and choices.
- Preserve object identity changes, last-known information, trigger order, replacement choices, and atomic rejection.
- Model priority automation as validated player passes. Never bypass required choices, rule checkpoints, or trigger processing.
- Preserve hidden information in projections, logs, inspection, and automatic-action explanations.
- Add behavioral coverage for legal use, illegal use, and relevant timing or zone boundaries.
- Exercise effects through accepted commands, not only direct calls to card handlers.
- Keep replay and current-format save checks. Backward compatibility with unreleased builds is not required.
- Run `npm run typecheck`, `npm run check:boundaries`, and relevant unit and browser tests.
- Do not add tests that parse Markdown, freeze documentation wording, or require routine screenshot baseline updates.

## Adding cards, starting with Opus I

1. Check the official card number, current official text, errata, and applicable rulings before implementing a real card.
2. Record source URLs and the review date with its content metadata or its set's structured source manifest.
3. Keep official cards separate from `opus-ph` placeholders and `opus-zero` custom cards.
4. Put each card in `src/content/cards/<set>/<card-number>.ts`. Use `opus-1` for Opus I.
5. Use the printed card number as the rules identity. Keep artwork variants separate from that identity.
6. Define metadata and behavior together. Include name, set, provenance, rarity, type, elements, cost, and applicable power.
7. Include jobs, categories, generic status, keywords, rules text, ability IDs, and EX Burst scope.
8. Use an empty rules-text string for a vanilla card. Preserve keywords and the generic icon in their own fields.
9. Add the script under its set's card directory and register it once in `src/content/sets/<set>.ts`. Add each new set once in `src/content/manifest.ts`, then derive catalog and editor choices from registered metadata.
10. Do not add hardcoded global card counts, name lists, or per-card switches to UI or engine modules.
11. Use stable ability IDs, content versions, behavior versions, and validated continuation payloads.
12. Check that each declared target, trigger, cost, and effect contract has a live engine consumer.
13. Do not assume that a hook works because it appears in a TypeScript interface.
14. If a mechanic is unsupported, extend its shared rules contract before enabling that card for play.
15. Keep unfinished cards outside playable manifests. Never substitute a no-op for an unsupported ability.
16. Add command-level tests for the printed behavior, target restrictions, payment, resolution, and relevant interactions.
17. For resumable effects, include a save/reload case at a meaningful pending choice.
18. Keep card-specific expectations in that card's tests. Use manifest-wide tests for uniqueness and registration integrity.
19. Add a set to a format's allowed sets only when its supported contents are deliberate and reviewed.
20. Preserve singleton by card number, Commander eligibility, and element restrictions in deck validation.
21. Keep the 19-plus-Commander playtest profile separate from the 49-plus-Commander production profile.
22. Do not decide Light/Dark Commander identity or add new format exceptions as part of ordinary card entry.
23. Check projections, text inspection, log names, and fallback presentation before enabling the card.

The current catalog is placeholder-only. Set manifests list each card script once. Every registered script must pass registry integrity checks before its metadata can become playable. Keep source review dates with each real set and use command-level behavior tests for every new card mechanic.

Render card faces in the 63:88 portrait ratio. Real card images replace the entire face. Use contain sizing; do not stretch or crop a full card scan. Keep card numbers in inspection details.

## Change hygiene

- Continue on the requested branch. Do not create another branch or worktree without a request.
- Do not commit or push without explicit authorization.
- Do not commit user prompts, attached CI logs, temporary probes, or generated test reports.
- After the attached CI failures are resolved and checked, delete the three supplied root-level `.log.txt` files.
- Keep existing historical documentation. Do not create tests that make that history an executable contract.
- Allow automatic GitHub Actions triggers only for the default branch. Explicit manual runs can target another branch.
- Delete abandoned implementations and their obsolete tests together. Preserve coverage for live behavior.
