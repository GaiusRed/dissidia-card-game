# Playtest-ready Offline MVP Implementation Plan

> **For agentic workers:** Use the `executing-plans` skill to implement this plan in order. Execute inline unless the user requests delegation. Steps use checkbox syntax for tracking.

**Goal:** Deliver an offline, rules-enforced duel that one user can play with both approved 19-plus-one Opus Placeholder decks.

**Architecture:** A pure TypeScript engine owns all rules and choices. A local host serializes commands, creates views, and saves progress. Phaser renders the table; HTML provides accessible controls, menus, deck editing, and logs.

**Tech Stack:** TypeScript, Phaser, Vite, Vitest, Playwright, IndexedDB, and a service worker generated through `vite-plugin-pwa`.

**Date:** 2026-10-07. **Branch:** `feature/mvp-game-design-spec`.

## Global constraints

- The [approved design](../specs/2026-10-06-dissidia-mvp-design.md) defines the product, format, and exact 40 cards.
- Use [FFTCG Comprehensive Rules v3.3](../../fftcg-comprules-v3.3.pdf), effective August 7, 2026. Record rule references beside rule tests.
- Complete all three milestones in this plan before declaring the MVP ready to playtest.
- MVP decks contain exactly 19 main-deck cards and one Commander. The production profile remains 49 plus one.
- Commander means the designated role. Legend means rarity `L`. Use Commander Zone and Commander tax in all UI text.
- Singleton uses card number. Light/Dark are unrestricted for deck construction but retain their rules during play.
- The initial catalog is exactly 40 `opus-ph` cards, with `P-` numbers, `placeholder` provenance, and version `opus-ph-v1`.
- Both seats are controlled by one user. No AI, account service, matchmaking, or network match server is part of these milestones.
- The rules core imports no browser, Phaser, persistence, network, or wall-clock APIs. All randomness uses stored state.
- Supported browsers are current desktop Chrome and Edge. Check the layout at 1280 × 720 and 1920 × 1080.
- All release assets are local. Complete installation requires an initial download; installed matches must work offline.
- Use original geometric card art. No remote art, fonts, analytics, or runtime CDN dependencies.
- Follow Arena's desktop layout and interaction model closely, as specified in design section 10. Visual fidelity is a milestone 3 gate.
- Require the bottom-center hand fan, playable-card glow, direct click/drag casting, targeting arrows, and bottom-left contextual choice buttons.
- Present cards castable from other zones beside the hand, with source-zone badges and their actual rules identity preserved.
- Exclude pets, pet slots, interactive board decorations, selectable board skins, and cosmetic customization controls.
- Preserve the existing PDF and README. Work on the existing feature branch. Commit or push only when authorized for this work.
- Light/Dark Commander identity remains a future format decision. The MVP deck editor offers the approved Fire and Water Commanders.

## Milestones and order

| Milestone | Tasks | Deliverable | Exit gate |
|---|---|---|---|
| 1. Rules foundation | 1–8 | Headless engine with setup, format, CP, casting, Commander state, and basic outcomes | Foundation scenarios and deterministic command replay pass |
| 2. Rules interactions | 9–18 | All 40 card behaviors, complete combat, effects, EX Burst, and scenarios | Every design coverage row has an executable scenario; headless duels finish |
| 3. Offline playable MVP | 19–27 | Two-seat table, editor, presets, saves, release cache, and playtest guide | Full duels, offline startup, and recovery pass through the actual UI |

Dependencies are sequential across milestone gates. Within milestone 2, effect primitives precede card handlers. Within milestone 3, views and host precede client controls.

Milestone 1 uses a scripted game ending by concession to check the command lifecycle. Combat wins become a gate in milestone 2. A concession-only script never satisfies the final MVP gate.

## File structure and responsibilities

Use one npm package initially. The engine has its own TypeScript configuration and public export file, so it can later become a shared package.

| Files or directory | Responsibility |
|---|---|
| `package.json`, `package-lock.json`, `.npmrc`, `.gitignore` | Pinned dependencies, scripts, and generated-file exclusions |
| `tsconfig.json`, `tsconfig.rules.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts` | Build and verification configuration |
| `index.html`, `src/main.ts`, `src/styles.css` | Application entry and shared layout styles |
| `src/rules/types.ts`, `src/rules/codec.ts`, `src/rules/index.ts` | Domain types, runtime schemas, and engine exports |
| `src/rules/random.ts`, `src/rules/zones.ts`, `src/rules/invariants.ts` | Seeded randomness, object identity, and state integrity |
| `src/rules/format.ts`, `src/rules/setup.ts`, `src/rules/turns.ts` | Deck profiles, opening procedure, and turn transitions |
| `src/rules/payment.ts`, `src/rules/casting.ts`, `src/rules/commander.ts` | Atomic costs, Character casting, and format overrides |
| `src/rules/engine.ts`, `src/rules/priority.ts`, `src/rules/choices.ts` | Command reducer, priority, and serialized decisions |
| `src/rules/effects.ts`, `src/rules/triggers.ts`, `src/rules/continuous.ts`, `src/rules/replacements.ts` | Typed effect operations and scheduling |
| `src/rules/combat.ts`, `src/rules/damage.ts`, `src/rules/outcomes.ts` | Sequential attacks, damage/EX Burst, and game results |
| `src/content/opus-ph.ts`, `src/content/decks.ts`, `src/content/handlers.ts` | Approved metadata, fixed decks, and handler registry |
| `src/content/abilities/fire.ts`, `src/content/abilities/water.ts`, `src/content/abilities/shared.ts` | Named handlers for the complete placeholder catalog |
| `src/scenarios/types.ts`, `src/scenarios/fixtures.ts`, `src/scenarios/catalog.ts` | Validated scenario definitions and playable starting states |
| `src/host/protocol.ts`, `src/host/views.ts`, `src/host/local-host.ts` | Transport-shaped commands, filtered projections, and serialized local authority |
| `src/storage/save.ts`, `src/storage/indexed-db.ts`, `src/storage/replay.ts`, `src/storage/decks.ts` | Version checks, transactions, replay, and saved deck lists |
| `src/client/app.ts`, `src/client/store.ts`, `src/client/menu.ts`, `src/client/deck-editor.ts` | Application navigation and HTML screens |
| `src/client/match-scene.ts`, `src/client/layout.ts`, `src/client/card-view.ts`, `src/client/animation.ts` | Phaser table and presentation |
| `src/client/card-tray.ts`, `src/client/targeting.ts`, `src/client/choice-dock.ts` | Hand fan, playable cards from other zones, targeting arrows, and bottom-left choices |
| `src/client/actions.ts`, `src/client/prompts.ts`, `src/client/match-hud.ts`, `src/client/log.ts` | Legal inputs, every choice type, status, and readable events |
| `src/client/offline.ts`, `public/icons/icon-192.png`, `public/icons/icon-512.png` | Cache/update status and local install icons |
| `tests/rules/`, `tests/content/`, `tests/scenarios/`, `tests/host/`, `tests/storage/` | Node-based behavior tests |
| `tests/support/harness.ts`, `tests/support/cases.ts`, `tests/support/memory-store.ts` | Test helpers and explicit scenario cases |
| `tests/e2e/`, `tests/e2e/helpers.ts` | Browser tests that use real controls |
| `scripts/check-boundaries.mjs`, `scripts/check-coverage.mjs` | Engine dependency and card/scenario coverage gates |
| `docs/rules-coverage.md`, `docs/playtesting.md`, `docs/playtest-results.md` | Traceability, usage, and recorded acceptance results |
| `docs/ui-reference.md`, `tests/e2e/arena-interactions.spec.ts`, `tests/host/card-tray.test.ts` | Arena reference comparison, interaction acceptance, and source-zone projection tests |

## Shared contracts

Task 1 creates these contracts. Later tasks extend discriminated unions in the same files; they must not create competing representations. All persisted values are JSON data. `ObjectId` identifies a card in one zone; `InstanceId` identifies the physical card across zone changes.

```ts
type Seat = 0 | 1;
type CardNumber = string;
type InstanceId = string;
type ObjectId = string;
type Element = 'Fire' | 'Ice' | 'Wind' | 'Earth' | 'Lightning' | 'Water' | 'Light' | 'Dark';
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Zone = 'deck' | 'hand' | 'field' | 'stack' | 'break' | 'removed' | 'damage' | 'commander';
type Phase = 'setup' | 'active' | 'draw' | 'main1' | 'attack' | 'main2' | 'end';
type Keyword = 'Brave' | 'Haste' | 'First Strike' | 'Freeze';
interface Versions { schema: string; engine: string; format: string; catalog: string }
interface DeckList { commander: CardNumber; main: CardNumber[] }
interface FormatProfile {
  id: string; mainSize: 19 | 49; allowedSets: string[]; damageLimit: 7;
}
interface AbilityDefinition {
  id: string; kind: 'action' | 'special' | 'auto' | 'field' | 'replacement';
  handler: string; text: string; ex: boolean;
}
interface CardDefinition {
  number: CardNumber; name: string; set: string;
  provenance: 'placeholder' | 'custom' | 'official'; version: string;
  rarity: 'C' | 'R' | 'H' | 'L' | 'S'; type: 'Forward' | 'Backup' | 'Summon';
  elements: Element[]; cost: number; power: number | null;
  jobs: string[]; categories: string[]; generic: boolean;
  keywords: Keyword[]; abilities: AbilityDefinition[]; text: string;
  summonHandler: string | null; ex: boolean;
}
type Catalog = Readonly<Record<CardNumber, CardDefinition>>;
interface CardObject {
  instance: InstanceId; object: ObjectId; card: CardNumber; owner: Seat;
  controller: Seat; zone: Zone; dull: boolean; damage: number;
  controlledSinceTurn: number; attackedTurn: number | null; frozen: boolean;
}
interface Continuation { handler: string; step: string; data: Json }
interface ChoiceOption { id: string; label: string; object: ObjectId | null }
interface Choice {
  id: string; seat: Seat;
  kind: 'mulligan' | 'cards' | 'targets' | 'mode' | 'order' | 'allocation' | 'confirm';
  reason: string; options: ChoiceOption[]; min: number; max: number;
  // Null means selection, otherwise allocate this total in the stated increments.
  allocation: { total: number; increment: number } | null;
  resume: Continuation;
}
interface Answer { choice: string; selected: string[]; amounts: Record<string, number> }
interface Payment {
  discard: ObjectId[]; dullBackups: ObjectId[]; specialDiscard: ObjectId | null;
  dullSource: boolean; sacrificeSource: boolean;
  // One chosen element for each CP source; spent CP is explicit.
  sourceElements: Record<ObjectId, Element>; spend: Partial<Record<Element, number>>;
}
type Intent =
  | { kind: 'pass' }
  | { kind: 'concede' }
  | { kind: 'answer'; answer: Answer }
  | { kind: 'cast'; source: ObjectId; targets: ObjectId[]; mode: string | null; payment: Payment }
  | { kind: 'activate'; source: ObjectId; ability: string; targets: ObjectId[]; payment: Payment }
  | { kind: 'attack'; members: ObjectId[] }
  | { kind: 'block'; blocker: ObjectId | null };
interface Command { id: string; expectedSeq: number; seat: Seat; intent: Intent }
interface RuleEvent { id: string; type: string; data: Json }
interface StackItem {
  id: ObjectId; controller: Seat; source: ObjectId; lastKnown: CardObject;
  handler: string; targets: ObjectId[]; mode: string | null; data: Json;
}
interface EffectRecord {
  id: string; timestamp: number; controller: Seat; source: ObjectId;
  handler: string; data: Json; expiresTurn: number | null;
}
interface CombatState {
  step: 'prepare' | 'declare' | 'block' | 'firstStrike' | 'damage' | 'finish';
  attackers: ObjectId[]; blocker: ObjectId | null; wasBlocked: boolean;
  allocation: Record<ObjectId, number>;
}
interface Result { winner: Seat | null; reason: 'damage' | 'deckout' | 'concede' | 'simultaneous' | 'loop' }
interface MatchState {
  versions: Versions; seq: number; rng: number; nextId: number;
  format: FormatProfile; turn: number; active: Seat; firstPlayer: Seat;
  phase: Phase; priority: Seat | null; passes: number;
  cards: Record<InstanceId, CardObject>;
  zones: Record<Seat, Record<Exclude<Zone, 'field' | 'stack'>, InstanceId[]>>;
  field: InstanceId[]; stackCards: InstanceId[];
  commanders: Record<Seat, { instance: InstanceId; casts: number }>;
  stack: StackItem[]; effects: EffectRecord[]; triggers: Continuation[];
  work: Continuation[]; choice: Choice | null; combat: CombatState | null;
  result: Result | null;
}
interface StartOptions { seed: number; decks: [DeckList, DeckList]; format: FormatProfile }
interface RuleError { code: string; message: string }
type Transition =
  | { ok: true; state: MatchState; events: RuleEvent[] }
  | { ok: false; state: MatchState; error: RuleError; events: [] };
interface EngineContext { catalog: Catalog; handlers: Readonly<Record<string, AbilityHandler>> }
interface HandlerContext { state: MatchState; catalog: Catalog; frame: Continuation }
type HandlerResult = { events: RuleEvent[]; next: Continuation[]; choice: Choice | null };
type AbilityHandler = (context: HandlerContext) => HandlerResult;
```

Use dedicated tagged schemas for each event and continuation payload when implementing its handler. The boundary accepts `Json`, but each handler validates its own data before use. No closures or executable code go into saves. The reducer owns a draft; handlers can change that draft only through rules operations. A thrown handler fault discards the draft and becomes a diagnostic error, not a game loss.

`stackCards` contains physical Summon instances. `stack` contains resolving Summons and abilities. An ability has no separate physical card. An EX Burst leaves its physical card in the Damage Zone.

Built-in continuations such as `turn`, `damage`, and `trigger` resolve through engine-owned handler tables. `EngineContext.handlers` contains catalog abilities only. Register each built-in handler when its task introduces the operation.

Public engine functions:

```ts
createMatch(options: StartOptions, context: EngineContext): MatchState;
applyCommand(state: MatchState, command: Command, context: EngineContext): Transition;
assertInvariants(state: MatchState, context: EngineContext): void;
validateDeck(deck: DeckList, format: FormatProfile, catalog: Catalog): RuleError[];
```

### Test fixture contract

Task 1 creates `tests/support/harness.ts`. Scenario builders may bypass setup only for an explicitly named test or separate scenario. Normal matches always use `createMatch`.

```ts
interface Placement {
  seat: Seat; card: CardNumber; zone: Zone; dull?: boolean;
  damage?: number; controlledSinceTurn?: number; attackedTurn?: number;
}
interface Fixture {
  phase?: Phase; active?: Seat; priority?: Seat; turn?: number;
  placements?: Placement[]; commanderCasts?: Partial<Record<Seat, number>>;
  deckTop?: Partial<Record<Seat, CardNumber[]>>;
}
interface Harness {
  state: MatchState;
  object(seat: Seat, card: CardNumber): ObjectId;
  send(seat: Seat, intent: Intent): Transition;
  answer(selected: string[], amounts?: Record<string, number>): Transition;
  passBoth(): void;
}
fixture(input: Fixture): Harness;
```

`fixture` constructs a complete state directly from the fixed deck manifests, then relocates existing instances. It does not depend on opening setup. It never duplicates a card. Unmentioned main cards stay in the deck. Both Commanders default to their Commander Zones. Default turn is 3, active/priority seat 0, phase Main 1; field fixtures default to control since turn 1. Reorder `deckTop` cards first. Always validate conservation and zone references. `send` uses the current sequence and updates the harness only for accepted commands. `answer` uses the current choice ID and seat. `passBoth` passes from the actual priority seat twice and asserts acceptance. Helpers must never skip mandatory choices or force resolutions.

Tests below are representative regression anchors. Each task also specifies the complete case list required for its gate. Import Vitest functions, contracts, and the listed modules in each test file.

### Execution and checkpoints

For every task: write the listed tests, run the focused command and confirm a meaningful failure, implement, then repeat the command and typecheck. A missing module is an initial failure; retain behavioral assertions after the module exists. Each numbered task is a review checkpoint. Record changed files and verification output before proceeding. Suggested commit boundaries are the three milestone gates, subject to user authorization.

Do not copy incomplete integration behavior into a release. Early tasks may expose a smaller union of supported commands, but unsupported actions must return a specific error. By Task 18, every catalog handler and required command must be supported.

## Milestone 1 — Rules foundation

### Task 1: Establish the engine boundary and test harness

**Create:** Root configuration files from the file map; `src/rules/types.ts`, `codec.ts`, `index.ts`, `engine.ts`; `tests/support/harness.ts`; `tests/rules/boundaries.test.ts`; `scripts/check-boundaries.mjs`.

**Consumes:** Shared contracts above. **Produces:** Runtime JSON schemas and `applyCommand`, initially supporting explicit unsupported-action rejection. `fixture` starts working once Task 2 supplies content.

- [ ] Create package scripts: `dev` = `vite --host 127.0.0.1`; `typecheck` = `tsc --noEmit && tsc -p tsconfig.rules.json --noEmit`; `test` = `vitest run`; `test:watch` = `vitest`; `build` = `npm run typecheck && vite build`; `preview` = `vite preview --host 127.0.0.1`; `test:e2e` = `playwright test`; `check:boundaries` = `node scripts/check-boundaries.mjs`; `check:coverage` = `node scripts/check-coverage.mjs`.
- [ ] Install pinned compatible versions and create the lockfile. Use Node 24.21.0 and npm 11.19.0, available in this workspace. Registry versions checked for this plan: TypeScript 7.0.2, Phaser 4.2.1, Vite 8.3.3, Vitest/coverage-v8 5.0.3, Playwright 1.63.0, Zod 4.6.5, fake-indexeddb 6.2.5, vite-plugin-pwa 2.0.0. Resolve its Workbox peers from their compatible ranges and pin them. Check engine and peer constraints before installing; record any necessary version change. Do not run a force install.
- [ ] Add strict TypeScript checks and Node-only rule tests. Set the rules config library to `ES2022`, excluding DOM. Define the shared contracts and schemas, including rejection of nonfinite numbers and malformed IDs.
- [ ] Write a boundary test and an import checker. The checker traverses rules imports, including transitive local imports, and rejects paths outside rules except type-only content contracts. Reject Phaser, DOM globals, `Date.now`, `Math.random`, and node built-ins inside the rules core.

```ts
test('malformed command cannot enter the reducer', () => {
  expect(commandSchema.safeParse({ seat: 2, intent: { kind: 'pass' } }).success).toBe(false);
});
```

- [ ] Run `npm test -- tests/rules/boundaries.test.ts`; expect schema assertions to fail before implementation. Implement schema validation with a discriminated `intent` union, then run the test and `npm run check:boundaries`. Expected: pass and zero forbidden imports.

```ts
export const seatSchema = z.union([z.literal(0), z.literal(1)]);
// In codec.ts, build each declared interface from strict object schemas.
export const commandSchema = z.strictObject({
  id: z.string().min(1), expectedSeq: z.number().int().nonnegative(),
  seat: seatSchema, intent: intentSchema,
});
```

`intentSchema` is the schema for every `Intent` alternative in the shared contract. Unknown keys fail validation. Commit no generated `node_modules`, test traces, or build output.

### Task 2: Load the exact catalog and validate both formats

**Create:** `src/content/opus-ph.ts`, `src/content/decks.ts`, `src/rules/format.ts`, `tests/content/catalog.test.ts`, `tests/rules/format.test.ts`.

**Consumes:** `CardDefinition`, `Catalog`, `DeckList`, `FormatProfile`. **Produces:** `opusPh: Catalog`, `cinderCompany: DeckList`, `tidalAssembly: DeckList`, `mvpFormat: FormatProfile`, `productionFormat: FormatProfile`, `validateDeck(...)`.

- [ ] Transcribe all 40 rows from design section 5. Preserve exact numbers, names, power, cost, keywords, Generic flags, EX marking, and ability text. Make table-driven assertions independent of the exported catalog: 40 expected number/name/type/cost/power records in `catalog.test.ts`.
- [ ] Write these deck tests, plus duplicate number, wrong element, wrong rarity/type, and Commander duplicated in main deck cases. Test 18/19/20 and 48/49/50 using explicit synthetic catalog definitions for production length tests.

```ts
expect(validateDeck(cinderCompany, mvpFormat, opusPh)).toEqual([]);
expect(validateDeck(tidalAssembly, mvpFormat, opusPh)).toEqual([]);
expect(Object.keys(opusPh)).toHaveLength(40);
expect(cinderCompany.main).toHaveLength(19);
expect(validateDeck(cinderCompany, productionFormat, opusPh).map(e => e.code))
  .toContain('SET_NOT_ALLOWED');
```

- [ ] Run `npm test -- tests/content/catalog.test.ts tests/rules/format.test.ts`; expect failure before definitions and validation exist.
- [ ] Implement `mvpFormat` with ID `commander-duel-ph-v1`, mainSize 19, allowedSets `['opus-ph']`; production ID `commander-duel-v1`, mainSize 49, allowedSets `['opus-zero','opus-1','opus-2','opus-3']`. Both use damageLimit 7. Validate unknown card numbers before dereferencing them.

```ts
const sharesElement = card.elements.some(element => commander.elements.includes(element));
const universalInclusion = card.elements.some(element => element === 'Light' || element === 'Dark');
const elementLegal = sharesElement || universalInclusion;
```

- [ ] Add synthetic Opus Zero tests: custom staple in main deck, eligible Forward L Commander, invalid element/duplicate rejected, and test fixtures excluded from released catalogs. Re-run both test files; expected: pass.

### Task 3: Make identity, zones, and randomness deterministic

**Create:** `src/rules/random.ts`, `zones.ts`, `invariants.ts`, `tests/rules/state.test.ts`. **Modify:** Test harness.

**Consumes:** `MatchState`, `CardObject`. **Produces:** `nextRandom(seed: number): { value: number; seed: number }`, `shuffle<T>(items: readonly T[], seed: number): { items: T[]; seed: number }`, `moveCard(state: MatchState, instance: InstanceId, zone: Zone, index?: number): CardObject`, `assertInvariants(...)`.

- [ ] Write seeded shuffle repeatability, permutation, zero-seed, zone order, and object identity tests. A move returns the previous object for last-known information. New object IDs use the state's monotonic `nextId`.

```ts
const h = fixture({ placements: [{ seat: 0, card: 'P-001L', zone: 'field' }] });
const before = h.object(0, 'P-001L');
const instance = h.state.commanders[0].instance;
moveCard(h.state, instance, 'break');
expect(h.state.cards[instance].object).not.toBe(before);
expect(h.state.commanders[0].instance).toBe(instance);
assertInvariants(h.state, { catalog: opusPh, handlers: {} });
```

- [ ] Run `npm test -- tests/rules/state.test.ts`; expect failed identity/conservation assertions until implemented.
- [ ] Use a specified 32-bit generator and Fisher–Yates shuffle; retain golden seed/output vectors in tests. Never shuffle the caller's input array. Move nonfield cards to their owner's zone, reset damage/control markers on zone change, and clear references to the old zone object where rules require it.

```ts
export function nextRandom(seed: number) {
  const next = (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
  return { seed: next, value: next / 0x100000000 };
}
```

- [ ] Assert one zone per instance, exactly 40 instances in default matches, valid owner/controller, unique object IDs, valid Commander references, and nonnegative counters. Check pending-choice references without requiring all targets on the stack to remain legal. Re-run tests; expected: pass.

### Task 4: Implement setup, mulligans, and turn structure

**Create:** `src/rules/setup.ts`, `turns.ts`, `choices.ts`, `tests/rules/setup.test.ts`, `tests/rules/turns.test.ts`.

**Consumes:** Valid decks, shuffle, state/choice contracts. **Produces:** `createMatch(...)`, `advanceTurnStep(state: MatchState, context: EngineContext): void`, `answerChoice(state: MatchState, answer: Answer, seat: Seat, context: EngineContext): RuleError[]`.

- [ ] Write tests for both randomly selected starting seats, five-card hands, Commander exclusion, one mulligan each, ordered bottom placement, first draw of one versus later draws of two, and five-card cleanup.

```ts
const a = createMatch({ seed: 12, decks: [cinderCompany, tidalAssembly], format: mvpFormat }, context);
const b = createMatch({ seed: 12, decks: [cinderCompany, tidalAssembly], format: mvpFormat }, context);
expect(a).toEqual(b);
expect(a.zones[0].hand).toHaveLength(5);
expect(a.zones[0].deck).toHaveLength(14);
expect(a.zones[0].commander).toHaveLength(1);
expect(a.choice?.kind).toBe('mulligan');
```

Here and below, `context` is `{ catalog: opusPh, handlers: handlers }` imported from the content registry. Task 4 initializes that registry as empty; later tasks populate it.

- [ ] Run `npm test -- tests/rules/setup.test.ts tests/rules/turns.test.ts`; expect failure on opening choices and phase progression.
- [ ] Implement setup as named continuation steps: choose starting seat, shuffle each deck, draw opening hands, each player's keep/mulligan choice, ordered bottom choice when needed, and first Active Phase. Store completion in continuation data, preventing a second mulligan. Active and Draw phases process without player priority.

```ts
const drawCount = state.turn === 1 && state.active === state.firstPlayer ? 1 : 2;
state.work.push({ handler: 'turn', step: 'draw', data: { seat: state.active, count: drawCount } });
```

- [ ] Implement Active, Draw, Main 1, Attack, Main 2, End transitions and cleanup checkpoints. End choices and delayed-trigger integration are completed in Tasks 9, 11, and 17. Re-run tests; expected: exact phase order, no priority in automatic phases, and serializable choices.

### Task 5: Validate and pay CP atomically

**Create:** `src/rules/payment.ts`, `tests/rules/payment.test.ts`.

**Consumes:** `Payment`, current objects, catalog. **Produces:** `validatePayment(state: MatchState, seat: Seat, source: ObjectId, payment: Payment, cost: number, context: EngineContext): RuleError[]`, `commitPayment(state: MatchState, seat: Seat, source: ObjectId, payment: Payment, context: EngineContext): RuleEvent[]`.

- [ ] Write tests for discard producing two CP, eligible Backup dulling producing one, selected source elements, required element, exact spent CP, surplus expiry under v3.3, and no persistent CP pool. Include Light/Dark CP exceptions and prohibition on discarding them for CP.

```ts
const h = fixture({ placements: [{ seat: 0, card: 'P-008H', zone: 'hand' }] });
const original = structuredClone(h.state);
const payment: Payment = { discard: [h.object(0, 'P-008H')], dullBackups: [],
  specialDiscard: null, dullSource: false, sacrificeSource: false,
  sourceElements: {}, spend: { Fire: 2 } };
expect(validatePayment(h.state, 0, h.object(0, 'P-001L'), payment, 3, context).length).toBeGreaterThan(0);
expect(h.state).toEqual(original);
```

- [ ] Run `npm test -- tests/rules/payment.test.ts`; expect payment validation failures.
- [ ] Separate validation from commitment. Reject duplicate payment sources, wrong controller/zone, already dull Backup, negative CP, underpayment, impossible source element, and reusing `{S}` discard as CP. Treat Backup CP generation and a printed `{D}` action as distinct operations; apply the correct control-duration restriction to each.

```ts
const errors = validatePayment(state, seat, source, payment, cost, context);
if (errors.length !== 0) return errors;
// Caller commits only after timing, targets, modes, and every additional cost also validate.
commitPayment(state, seat, source, payment, context);
```

- [ ] Test `{S}`, `{D}`, source sacrifice, and combined-cost rollback now. Tasks 9 and 14 connect these costs to abilities. Re-run tests; expected: rejected payments change no zone, priority, RNG, or sequence.

### Task 6: Cast Characters and preserve Commander designation

**Create:** `src/rules/casting.ts`, `commander.ts`, `tests/rules/casting.test.ts`, `tests/rules/commander.test.ts`.

**Consumes:** Payment, zone moves, choice continuations. **Produces:** `commanderCost(state: MatchState, instance: InstanceId, context: EngineContext): number`, `castCharacter(state: MatchState, command: Command, context: EngineContext): RuleError[]`, `requestDeparture(state: MatchState, instance: InstanceId, destination: Zone, context: EngineContext): void`.

- [ ] Test owner turn, main phase, empty stack, priority, hand/Commander source permission, Forward active entry, Backup dull entry, five-Backup limit, nongeneric uniqueness, and generic coexistence.

```ts
const h = fixture({ commanderCasts: { 0: 2 } });
expect(commanderCost(h.state, h.state.commanders[0].instance, context)).toBe(7);
expect(h.state.stack).toEqual([]);
```

- [ ] Run `npm test -- tests/rules/casting.test.ts tests/rules/commander.test.ts`; expect cost/timing failures.
- [ ] Implement Commander tax and successful-cast counting. Ordinary Character casting bypasses the stack. Entry events feed Task 10's trigger scheduler. Return decisions suspend departure, asking the owner even under opposing control.

```ts
const record = Object.values(state.commanders).find(c => c.instance === instance);
const card = state.cards[instance];
const tax = card.zone === 'commander' && record ? record.casts * 2 : 0;
const cost = context.catalog[card.card].cost + tax;
```

- [ ] Test costs 3/5/7; rejected casts do not count; effect entry does not count; hand recast has no Commander Zone tax; accept/decline return to hand, Break Zone, removed zone, and deck; no later free recall. Check old object IDs expire while designation persists. Re-run tests; expected: pass. Destination-trigger assertions finish with Task 10.

### Task 7: Reduce commands and handle basic outcomes

**Create:** `src/rules/outcomes.ts`, `tests/rules/engine.test.ts`, `tests/rules/outcomes.test.ts`. **Modify:** `src/rules/engine.ts`.

**Consumes:** Setup, casts, costs, choices, turn functions. **Produces:** Complete transactional `applyCommand(...)`; `checkOutcomes(state: MatchState, context: EngineContext): void`.

- [ ] Test malformed intent, stale sequence, wrong seat, stale choice, invalid target IDs, and post-game command rejection. Concession is permitted by either seat while a game is active, including during a choice. Define result precedence from rules 3 and 12.

```ts
const h = fixture({});
const before = structuredClone(h.state);
const result = applyCommand(h.state, { id: 'stale', expectedSeq: 99, seat: 0, intent: { kind: 'pass' } }, context);
expect(result.ok).toBe(false);
expect(result.state).toEqual(before);
expect(result.events).toEqual([]);
```

- [ ] Run `npm test -- tests/rules/engine.test.ts tests/rules/outcomes.test.ts`; expect rejection/outcome assertions to fail initially.
- [ ] Implement draft-based processing: validate envelope, clone state, dispatch intent, drain automatic work until a decision or legal priority point, assert invariants, increase sequence once, return events. On any rules rejection, return the original state with zero events. Runtime faults return a diagnostic error; do not convert them into wins or draws.

```ts
const draft = structuredClone(state);
// Dispatch the validated intent against draft, then stabilize its work queue.
// Commit this object only after all command validation and invariant checks succeed.
draft.seq = state.seq + 1;
```

- [ ] Add seven-damage, failed-draw, empty-deck rule-process, simultaneous defeat, and concession cases from the PDF. Do not equate an empty deck with only a future failed draw. Task 16 checks outcome timing during damage batches. Re-run tests; expected: exact result reason and no further actions after outcome.

### Task 8: Close the foundation gate

**Create:** `tests/rules/foundation.test.ts`, `docs/rules-coverage.md`. **Modify:** `src/rules/index.ts`.

**Consumes:** Engine exports and existing tests. **Produces:** Stable headless API and foundation coverage evidence.

- [ ] Write a command transcript from opening setup through both seats' decisions, legal casting, a phase change, and concession. Store accepted commands, initial options, and final state in the test; replay without using fixture relocation.

```ts
let replay = createMatch(options, context);
for (const command of commands) {
  const result = applyCommand(replay, command, context);
  expect(result.ok).toBe(true);
  replay = result.state;
}
expect(replay).toEqual(finalState);
```

`options`, `commands`, and `finalState` are the values recorded from the first execution in this test. Record a command only when accepted.

- [ ] Run `npm test -- tests/rules/foundation.test.ts`; any nondeterministic state or premature outcome must fail.
- [ ] Export only the public engine functions and domain types. Add coverage rows with PDF rule number, scenario name, test path, and owning milestone. Mark interaction rows as pending milestone 2, not passing.

```ts
// src/rules/index.ts
export { createMatch } from './setup';
export { applyCommand } from './engine';
export { validateDeck } from './format';
export { assertInvariants } from './invariants';
export type * from './types';
```

- [ ] Run `npm run typecheck`, `npm run check:boundaries`, and `npm test`. Expected: all foundation tests pass, both default decks validate, no browser dependencies enter rules. Record the gate before starting milestone 2.

## Milestone 2 — Rules interactions

### Task 9: Implement priority, stack, and complete choice validation

**Create:** `src/rules/priority.ts`, `tests/rules/priority.test.ts`, `tests/rules/choices.test.ts`. **Modify:** Engine, choices, casting, content handler registry.

**Consumes:** Command transaction, work queue, costs. **Produces:** `passPriority(state: MatchState, context: EngineContext): void`, `stabilize(state: MatchState, context: EngineContext): RuleEvent[]`, `pushStack(state: MatchState, item: StackItem): void`.

- [ ] Write two-pass tests for nonempty and empty stacks, action retaining/restoring the correct priority, pass reset after action, wrong-choice seat, duplicate selection, invalid count/order/allocation, canceled local drafts, and save-safe continuation data.

```ts
const h = fixture({});
h.send(0, { kind: 'pass' });
expect(h.state.priority).toBe(1);
expect(h.state.phase).toBe('main1');
h.send(1, { kind: 'pass' });
expect(h.state.phase).toBe('attack');
```

- [ ] Run `npm test -- tests/rules/priority.test.ts tests/rules/choices.test.ts`; expect phase/priority failures until scheduler integration.
- [ ] Resolve one top stack item after consecutive passes. Stabilize rule processes and triggers before granting priority. Keep response permissions explicit for main/attack versus End Phase, EX Burst, and First Strike intermediate processing.

```ts
state.passes += 1;
if (state.passes === 1) state.priority = state.priority === 0 ? 1 : 0;
// At the second pass, reset passes; resolve one item or advance the current step.
```

- [ ] Reject all normal actions while a required choice is open, except concession. Choice continuations preserve outstanding work and never replay already paid costs. Re-run tests; expected: exact stack order and resumable decisions.

### Task 10: Schedule auto-abilities and retain last-known information

**Create:** `src/rules/triggers.ts`, `tests/rules/triggers.test.ts`.

**Consumes:** Events, departures, stack scheduler. **Produces:** `collectTriggers(state: MatchState, events: RuleEvent[], context: EngineContext): void`, `queueTriggers(state: MatchState, context: EngineContext): void`.

- [ ] Test entry, field departure, field-to-Break destination, delayed events, and simultaneous triggers for both players. Preserve active-player/nonactive-player ordering from the rulebook and ask each controller to order their own triggers.

```ts
const h = fixture({ placements: [
  { seat: 0, card: 'P-001L', zone: 'field' },
  { seat: 0, card: 'P-014R', zone: 'field' },
] });
requestDeparture(h.state, h.state.commanders[0].instance, 'break', context);
expect(h.state.choice?.seat).toBe(0);
```

- [ ] Run `npm test -- tests/rules/triggers.test.ts`; expect missing destination distinction.
- [ ] Snapshot source data before departure. Emit field-left and destination events separately after replacements. Put triggers on the stack only at the prescribed checkpoint; choose their targets at the correct time. A source leaving does not cancel its already-created ability.

```ts
const lastKnown = structuredClone(state.cards[instance]);
const trigger: Continuation = {
  handler: 'trigger', step: 'collect-departure',
  data: { source: lastKnown.object, card: lastKnown.card, power: effectivePower, destination },
};
state.triggers.push(trigger);
```

`effectivePower` comes from Task 11's `getPower`; until that task, use the printed-power fixture cases only. `destination` is the actual destination after replacement.

- [ ] Assert Commander return suppresses Cinder Witness's Break Zone trigger, permits Tide Witness's departure trigger, and leaves no spurious enter trigger for a control change. Complete the LKI power case in Task 14. Re-run tests; expected: pass.

### Task 11: Implement effects, layers, replacements, and rule processes

**Create:** `src/rules/effects.ts`, `continuous.ts`, `replacements.ts`, `tests/rules/effects.test.ts`, `tests/rules/rule-processes.test.ts`.

**Consumes:** Work queue, object identities, trigger scheduler. **Produces:** `getPower(state: MatchState, object: ObjectId, context: EngineContext): number`, `getKeywords(state: MatchState, object: ObjectId, context: EngineContext): Keyword[]`, `runRuleProcesses(state: MatchState, context: EngineContext): void`, `dealForwardDamage(state: MatchState, target: ObjectId, amount: number, context: EngineContext): RuleEvent[]`.

- [ ] Test base-setting before additions, live field buffs, lethal marked damage, zero/negative power, timestamp ordering, per-event damage replacement, and zone changes ending object-bound effects.

```ts
const h = fixture({ placements: [{ seat: 0, card: 'P-008H', zone: 'field' }] });
dealForwardDamage(h.state, h.object(0, 'P-008H'), 3000, context);
const card = Object.values(h.state.cards).find(c => c.card === 'P-008H')!;
expect(card.damage).toBe(2000);
```

- [ ] Run `npm test -- tests/rules/effects.test.ts tests/rules/rule-processes.test.ts`; expect replacement/layer failures.
- [ ] Implement named operations for move, draw, discard, search/reveal/shuffle, dull, activate, Freeze, damage, ongoing power/keyword changes, control change, and delayed triggers. Each operation emits tagged events and uses the same departure/outcome machinery.

```ts
const reducedDamage = Math.max(0, amount - 1000);
// Dawn Guardian's applicable replacement changes this one damage event.
// Power reduction uses the continuous-effect path and does not call this replacement.
```

- [ ] Stabilize simultaneous lethal damage, nongeneric duplicate names, combined Light/Dark field conflicts, and excess Backups. Same-name nongeneric and Light/Dark conflicts follow the PDF's all-affected-card processing; excess Backups require the prescribed owner/controller choice. Do not reuse normal casting rejection for effect-created violations.
- [ ] Test replacement applicability and ordering before moves, cleanup repetition when new triggers arise, and that temporary effects reference old objects only. Re-run tests; expected: stable valid state or explicit choice, never a silent half-processed field.

### Task 12: Implement declaration and blocking of sequential attacks

**Create:** `src/rules/combat.ts`, `tests/rules/combat-declaration.test.ts`.

**Consumes:** Priority, effective keywords, control duration. **Produces:** `declareAttack(state: MatchState, seat: Seat, members: ObjectId[], context: EngineContext): RuleError[]`, `declareBlock(state: MatchState, seat: Seat, blocker: ObjectId | null, context: EngineContext): RuleError[]`.

- [ ] Test single attacks, same-element parties, newly controlled Forwards, Haste, Brave, legal active blockers, dull blockers, defender seat, and response windows between attack steps.

```ts
const h = fixture({ phase: 'attack', placements: [
  { seat: 0, card: 'P-001L', zone: 'field', attackedTurn: 3 },
] });
const result = h.send(0, { kind: 'attack', members: [h.object(0, 'P-001L')] });
expect(result.ok).toBe(false);
```

- [ ] Run `npm test -- tests/rules/combat-declaration.test.ts`; expect attack eligibility failures.
- [ ] Implement attack preparation, declaration, block declaration, damage, and finish states. Passes route through the current combat step. Only one attack is in progress; finishing it returns to the next legal attack opportunity.

```ts
state.combat = { step: 'declare', attackers: members.slice(), blocker: null, wasBlocked: false, allocation: {} };
for (const object of members) {
  const card = Object.values(state.cards).find(c => c.object === object)!;
  card.attackedTurn = state.turn;
  if (!getKeywords(state, object, context).includes('Brave')) card.dull = true;
}
```

- [ ] Re-activation does not clear attack history. A removed blocker does not turn a blocked attack into an unblocked attack. Follow combat rules 10 and preserve `wasBlocked`. Re-run tests; expected: exact declaration legality and sequential attacks.

### Task 13: Resolve battle damage and First Strike

**Create:** `tests/rules/combat-damage.test.ts`. **Modify:** Combat, continuous effects, trigger scheduler.

**Consumes:** Combat state, effective power/keywords, damage operation. **Produces:** `resolveCombatDamage(state: MatchState, context: EngineContext): void`.

- [ ] Test ordinary simultaneous damage, unblocked damage, party power, legal blocker damage allocations in 1000-point increments, mixed versus all-First-Strike parties, lethal first-strike damage, and responses changing power before damage.

```ts
const h = fixture({ phase: 'attack', placements: [
  { seat: 0, card: 'P-006R', zone: 'field' },
  { seat: 1, card: 'P-022C', zone: 'field' },
] });
h.state.combat = { step: 'firstStrike', attackers: [h.object(0, 'P-006R')],
  blocker: h.object(1, 'P-022C'), wasBlocked: true, allocation: {} };
resolveCombatDamage(h.state, context);
expect(h.state.zones[1].break.map(id => h.state.cards[id].card)).toContain('P-022C');
expect(h.state.cards[h.state.field.find(id => h.state.cards[id].card === 'P-006R')!].damage).toBe(0);
```

- [ ] Run `npm test -- tests/rules/combat-damage.test.ts`; expect wrong First Strike outcome before implementation.
- [ ] Compute damage from the correct checkpoint and apply simultaneous assignments as a batch. Ask for allocation instead of auto-selecting it. Run the restricted First Strike intermediate rule processing; delay pending auto-ability stacking until the rules permit it. Do not open a normal Summon/action/special response window there.

```ts
const allFirstStrike = state.combat!.attackers.every(object =>
  getKeywords(state, object, context).includes('First Strike'));
```

- [ ] Cover attacks where a member or blocker changes zone or control, and activation of a frozen Forward before blocking. Re-run declaration and damage tests; expected: no extra attacks and correct surviving objects.

### Task 14: Implement all Character abilities

**Create:** `src/content/abilities/fire.ts`, `water.ts`, `shared.ts`, `tests/content/characters.test.ts`. **Modify:** `src/content/handlers.ts`.

**Consumes:** Effect primitives, stack, triggers, choices, payment, layers. **Produces:** `handlers: Readonly<Record<string, AbilityHandler>>` with one named implementation for every nonvanilla Character ability.

- [ ] Write parameterized behavior cases for every row in the Character checklist below, including activated ability rejection and a successful resolution. Assert observable state changes, not only handler registration.

```ts
const h = fixture({ placements: [
  { seat: 0, card: 'P-012H', zone: 'field' },
  { seat: 0, card: 'P-003C', zone: 'field' },
] });
expect(getPower(h.state, h.object(0, 'P-003C'), context)).toBe(4000);
```

- [ ] Run `npm test -- tests/content/characters.test.ts`; expect missing behavior cases.
- [ ] Implement typed handlers with named resume steps. `{S}` and source sacrifice are paid before stack insertion. Choices such as search/discard suspend with stored continuation data. Never parse display text to decide behavior.

```ts
const flareOrder: AbilityHandler = ({ state, catalog, frame }) => {
  const data = z.strictObject({ target: z.string() }).parse(frame.data);
  const events = dealForwardDamage(state, data.target, 7000, { catalog, handlers });
  return { events, next: [], choice: null };
};
```

Define the damage primitive to return its emitted events as `RuleEvent[]`. Validate target legality before calling this resolution handler. Special-ability payment belongs to command processing, not this handler. Vanilla cards have no handler reference.

| Cards | Required implementation and assertion |
|---|---|
| P-001L, P-021L | Brave or activation entry trigger; special costs include same-name discard, one elemental CP, and dull; 7000 damage or bounce resolves independently of source |
| P-002C, P-022C | Vanilla namesake metadata; special fuel; nongeneric field uniqueness |
| P-003C, P-004C, P-023C, P-024C | Generic coexistence, printed power, party eligibility |
| P-005R, P-006R, P-026R | Haste and First Strike through keyword queries |
| P-007H, P-027H | Entry minus 2000; departure minus last-known effective power, even after source leaves |
| P-008H, P-028H | Per-event damage reduction; Light/Dark limit, and vanilla Light metadata |
| P-009C, P-029C | Vanilla Backup entry and CP generation |
| P-010C, P-030C | Dull-source action; Fire-only +1000 target restriction or activate a Forward |
| P-011R | Optional Soldier search, legal fail-to-find, reveal selected card, shuffle even when no card found as required by search rules |
| P-012H | Continuous +1000 to own Fire Forwards; recompute after control or source changes |
| P-013R | Pay Fire/dull/sacrifice; chosen Break Zone Forward returns despite source leaving as cost |
| P-014R, P-033R | Distinguish actual Break Zone arrival from any field departure; optional draw only for Tide Witness |
| P-025R | Entry dull + Freeze; next Active Phase consumption; explicit activation does not erase Freeze prematurely |
| P-031R | Entry draw then mandatory discard; identical marked effect under EX, without deploying Backup |
| P-032R | Chosen own Break Zone card to bottom of deck, preserving ordering |
| P-034R | Beginning-of-own-End-Phase activation trigger; order with delayed triggers |

- [ ] For every interactive ability test both legal targets and a target that becomes illegal before resolution. Re-run character, effect, and trigger suites; expected: all Character behaviors covered.

### Task 15: Implement every Summon and target-resolution rule

**Create:** `tests/content/summons.test.ts`, `tests/rules/targets.test.ts`. **Modify:** Casting and all three ability files.

**Consumes:** Stack, atomic payment, effect primitives. **Produces:** Summon handlers; `isTargetLegal(state: MatchState, item: StackItem, target: ObjectId, context: EngineContext): boolean` in `src/rules/effects.ts`.

- [ ] Write tests for all 12 Summons, selected mode locked on cast, cancellation, partial target legality, and all targets invalid. Choices made at cast time are part of the command; effect-time decisions use continuations.

```ts
const h = fixture({ placements: [
  { seat: 1, card: 'P-023C', zone: 'field' },
  { seat: 1, card: 'P-024C', zone: 'field' },
] });
const old = h.object(1, 'P-023C');
const id = h.state.field.find(id => h.state.cards[id].object === old)!;
moveCard(h.state, id, 'hand');
moveCard(h.state, id, 'field');
expect(h.object(1, 'P-023C')).not.toBe(old);
```

- [ ] Run `npm test -- tests/content/summons.test.ts tests/rules/targets.test.ts`; expect missing resolution behavior.
- [ ] Register these handlers, each with a full cast/pass/resolve scenario. Preserve physical Summons in `stackCards`, separate from ability stack items. Move the physical card to Break Zone when resolved or canceled. Check conservation through both transitions.

| Cards | Resolution |
|---|---|
| P-015C, P-016R | 4000 to one Forward; 3000 to each of two distinct chosen Forwards, skipping only illegal targets |
| P-017R, P-037R | Temporary +3000/Brave; +2000/First Strike |
| P-018R, P-020H | Break dull Forward; selected Backup cost ≤2 break or Forward removal mode |
| P-019H | Opponent takes two damage through Task 16's batch pipeline |
| P-035C | Return chosen Forward to owner hand, offering Commander replacement |
| P-036R | Choose another Summon on stack, cancel its effect and move its physical card to owner Break Zone; no self or EX target |
| P-038R | Set base power to 4000, preserving ordered other modifications |
| P-039H | Opposing Character control until end of turn; ownership unchanged, no entry trigger, immediate field-limit checks |
| P-040R | Draw two, then schedule current End Phase discard-one auto-ability |

```ts
const validTargets = item.targets.filter(target => isTargetLegal(state, item, target, context));
// If the rules invalidate the entire targeted effect, finish it without applying it.
// Otherwise apply each instruction only to its still-legal targets.
```

- [ ] Test Borrowed Banner against a Backup, Light/Dark conflict, duplicate name, and Commander. Check controller-duration reset, owner return choice, cleanup expiry, and zone-change nontracking. Re-run tests; Final Spark's complete damage assertions are the next task's dependency gate.

### Task 16: Resolve player damage and EX Burst

**Create:** `src/rules/damage.ts`, `tests/rules/damage.test.ts`, `tests/rules/ex-burst.test.ts`.

**Consumes:** Ordered deck zones, outcomes, replacement and continuation pipelines. **Produces:** `dealPlayerDamage(state: MatchState, seat: Seat, amount: number, context: EngineContext): void`.

- [ ] Test one damage, multi-damage batch, two EX cards, accept/decline, invalid EX target, draw/discard EX, seven damage, and insufficient deck cards. Pin defeat/EX timing to rules 6.5, 11.10, and 12.

```ts
const h = fixture({ deckTop: { 1: ['P-031R', 'P-035C'] } });
dealPlayerDamage(h.state, 1, 2, context);
expect(h.state.zones[1].damage.map(id => h.state.cards[id].card)).toEqual(['P-031R', 'P-035C']);
expect(h.state.choice?.seat).toBe(1);
expect(h.state.stack).toEqual([]);
```

- [ ] Run `npm test -- tests/rules/damage.test.ts tests/rules/ex-burst.test.ts`; expect missing ordered EX choices.
- [ ] Place damage cards in order, store eligible EX entries in a serialized continuation, and apply rule-process/defeat checkpoints as specified. Offer each eligible EX in damage order; no normal response window opens. EX cost is not paid and its card stays in Damage Zone.

```ts
state.work.push({ handler: 'damage', step: 'offer-ex',
  data: { seat, remaining: eligibleDamageObjects } });
```

`eligibleDamageObjects` is the ordered list built from this damage batch, excluding ineligible or no-longer-present objects. Do not discover old Damage Zone EX cards again.

- [ ] Wire combat unblocked damage and Final Spark to this pipeline. Assert Commander defeat, triggered abilities from EX, and save/restore while choosing an EX target. Re-run combat, Summon, and damage suites; expected: correct damage and outcome without response exploits.

### Task 17: Complete End Phase, exceptional outcomes, and deterministic recovery

**Create:** `tests/rules/end-phase.test.ts`, `tests/rules/loops.test.ts`, `tests/rules/resume.test.ts`. **Modify:** Turns, effects, outcomes, priority.

**Consumes:** Full engine and handler registry. **Produces:** Complete stabilization and cleanup behavior.

- [ ] Test Mist Caller plus Rising Undertow ordering, End Phase action restrictions, discard down to five, marked-damage cleanup, temporary power/control expiry, and additional triggers during cleanup.

```ts
const h = fixture({ phase: 'end', placements: [{ seat: 0, card: 'P-034R', zone: 'field' }] });
const encoded = JSON.stringify(h.state);
const restored = matchStateSchema.parse(JSON.parse(encoded));
expect(restored).toEqual(h.state);
```

- [ ] Run `npm test -- tests/rules/end-phase.test.ts tests/rules/loops.test.ts tests/rules/resume.test.ts`; expect missing repeated-cleanup or continuation assertions.
- [ ] Implement all rule-defined end checkpoints before advancing turn. Add synthetic test-only mandatory and optional loop handlers: prove repeated complete semantic state with no external choice before declaring a mandatory-loop draw. Exclude monotonic IDs/sequence counters from the comparison but include zones, RNG, continuations, effects, and pending choices.

```ts
// A processing guard reports a fault and preserves the pre-command snapshot.
const processingFault: RuleError = { code: 'PROCESSING_LIMIT', message: 'Rules processing could not finish. Export this match for diagnosis.' };
```

- [ ] An optional loop must stop for the player's rule-defined choice/iteration count. A generic step budget never proves a draw. Restore each choice kind from JSON and compare the resulting command transcript to uninterrupted play. Re-run tests; expected: identical states/events and no fabricated outcomes.

### Task 18: Publish validated scenarios and close the rules gate

**Create:** `src/scenarios/types.ts`, `fixtures.ts`, `catalog.ts`; `tests/support/cases.ts`; `tests/scenarios/coverage.test.ts`; `scripts/check-coverage.mjs`. **Modify:** `docs/rules-coverage.md`.

**Consumes:** All engine operations, approved card catalog. **Produces:** `ScenarioDefinition { id: string; title: string; purpose: string; rules: string[]; cards: CardNumber[]; fixture: Fixture; expected: string[] }`, `scenarioCatalog: ScenarioDefinition[]`, `loadScenario(id: string, context: EngineContext): MatchState`.

- [ ] Move the validated fixture schema/builder into `src/scenarios/fixtures.ts`; the test harness wraps it. Reject unknown cards, duplicate instances, negative counters, missing Commanders, mismatched versions, and invalid pending continuations. Label scenario starts in replay metadata.
- [ ] Create presets with explicit positions and expected outcomes:

| ID | Starting position and actions to exercise |
|---|---|
| `commander-third-cast` | Fire Commander in Commander Zone with casts=2; Coal Tender, Forge Apprentice, Quartermaster active; War Cry and Scorch in hand. Pay seven CP through three Backups and two discards |
| `multi-ex` | Final Spark payable in Fire hand; Water deck begins Archive Keeper then Return Tide; at least one Forward in play and cards available to complete draw/discard. Resolve two damage and both optional EX effects |
| `control-conflict` | Borrowed Banner payable; Water controls five Backups and Dawn Arbiter; Fire has a Backup and Dusk Reaver. Let the player choose which conflict to create through a fresh start |
| `end-trigger-order` | Water turn Main 2, Mist Caller in play and Rising Undertow payable; at least three deck cards and a dull Forward. Draw, enter End, then choose trigger order and discard |
| `party-first-strike` | Water has two active River Recruits plus Tide Duelist; Guarding Current payable; Fire has a blocker. Choose mixed/all-First-Strike parties and allocate damage |
| `commander-destinations` | Commander in play with departure and Break Zone witnesses positioned through each side's legal cards; a payable removal/bounce effect. Compare accept and decline across fresh starts |

- [ ] Add test cases for every design coverage row and every card number. Cases list rule references, initial fixture, literal command steps, and final assertions in `tests/support/cases.ts`. Link each row in `docs/rules-coverage.md` to its actual test. Metadata alone does not count as behavior coverage.

```ts
for (const scenario of scenarioCatalog) {
  test(`valid preset: ${scenario.id}`, () => {
    const state = loadScenario(scenario.id, context);
    assertInvariants(state, context);
    expect(matchStateSchema.parse(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
}
```

- [ ] Run `npm test -- tests/scenarios/coverage.test.ts`; expect missing/invalid preset failures. Implement `loadScenario` as a new match origin, never a live-match mutation. Offer no card-spawn controls in normal matches.

```ts
const definition = scenarioCatalog.find(item => item.id === id);
if (!definition) throw new Error(`Unknown scenario: ${id}`);
const state = buildFixture(definition.fixture, context);
assertInvariants(state, context);
return state;
```

`buildFixture(input: Fixture, context: EngineContext): MatchState` is the extracted validated builder. Move `Fixture` and `Placement` into scenario types to keep production code from importing tests.

- [ ] Add full headless duels from normal shuffled setup: one damage win and one deckout, with both possible starting seats represented. Use literal verified transcripts; a random legal-action walker is supplementary, not the acceptance oracle.
- [ ] Run `npm run typecheck`, `npm run check:boundaries`, `npm run check:coverage`, and `npm test`. Expected: all 40 definitions and every handler covered; no unimplemented handler references; all coverage rows linked; every rules scenario passes. Record milestone 2 gate.

## Milestone 3 — Offline playable MVP

### Task 19: Build the local host, protocol, and seat projections

**Create:** `src/host/protocol.ts`, `views.ts`, `local-host.ts`, `tests/host/host.test.ts`, `tests/host/views.test.ts`.

**Consumes:** Engine public API and scenario origins. **Produces:** `LocalHost`, `projectView(state: MatchState, viewer: Seat | 'omniscient', context: EngineContext): MatchView`.

```ts
interface ActionOffer {
  id: string; kind: Intent['kind']; source: ObjectId | null; label: string;
  ability: string | null;
  targetOptions: ChoiceOption[]; minTargets: number; maxTargets: number;
  modes: ChoiceOption[]; needsPayment: boolean; payment: PaymentOffer | null;
}
interface PaymentOffer {
  cost: number; commanderTax: number; elements: Element[];
  discardOptions: ObjectId[]; backupOptions: ObjectId[]; specialOptions: ObjectId[];
  dullSource: boolean; sacrificeSource: boolean;
}
interface VisibleCard { object: ObjectId; card: CardNumber; owner: Seat; controller: Seat;
  dull: boolean; damage: number; power: number | null; keywords: Keyword[] }
interface ZoneView { seat: Seat; zone: Zone; count: number; cards: VisibleCard[] }
interface StackView { id: ObjectId; controller: Seat; label: string; targets: ObjectId[] }
interface CommanderView { seat: Seat; instance: InstanceId; card: CardNumber;
  zone: Zone; previousCasts: number; nextZoneCastCost: number }
interface CastAccess {
  source: ObjectId; sourceZone: Zone; canDeclare: boolean;
  blockedReasons: RuleError[]; displayedCost: number; commanderTax: number;
}
interface TrayCard {
  card: VisibleCard; sourceZone: Zone; cast: CastAccess | null;
}
interface MatchView {
  seq: number; viewer: Seat | 'omniscient'; active: Seat; priority: Seat | null;
  decisionSeat: Seat | null; phase: Phase; turn: number; result: Result | null;
  zones: ZoneView[]; stack: StackView[]; commanders: CommanderView[];
  choice: Omit<Choice, 'resume'> | null;
  traySeat: Seat; cardTray: { hand: TrayCard[]; otherZones: TrayCard[] };
  actions: ActionOffer[]; log: RuleEvent[];
}
interface HostReply {
  accepted: boolean; view: MatchView; error: RuleError | null;
  persistence: 'saved' | 'unsaved';
}
interface LocalHost {
  submit(command: Command): Promise<HostReply>;
  view(viewer: Seat | 'omniscient'): MatchView;
  subscribe(listener: (reply: HostReply) => void): () => void;
}
```

Define `ActionOffer` and `PaymentOffer` in rules types. Export `legalActions(state: MatchState, seat: Seat, context: EngineContext): ActionOffer[]` from the engine. Keep view types in host protocol. Hidden zones contain counts and an empty `cards` list. Foreign private choices expose no options. Even omniscient inspection keeps deck order hidden; exported diagnostics retain authoritative order.

Define `CastAccess` in rules types. Export `describeCastAccess(state: MatchState, seat: Seat, context: EngineContext): CastAccess[]`. Include cards with casting permission from their present zone. Report current timing, payment, field-limit, and target restrictions through `canDeclare` and `blockedReasons`. A legal declaration must have a complete valid payment and target combination available. This query changes no state.

The host builds the tray for `traySeat`. An omniscient view follows the decision seat, or active seat when no decision is pending. A filtered seat view uses its own seat. All actual hand cards appear in `hand`. Other-zone entries require explicit casting permission and visible identity. The Commander remains visible but inactive when it cannot currently be cast. Recovery targets do not become castable cards. Presentation entries never enter the engine's hand zone.

- [ ] Test serialized simultaneous submissions, duplicate command IDs, stale sequences, wrong choice actor, and failure retaining state/log. Add projection snapshots with secret marker card numbers in the opponent hand, deck order, RNG, and choice continuation; none may leak into a seat view or its event log.

```ts
const text = JSON.stringify(projectView(state, 0, context));
expect(text).not.toContain(secretOpponentCardNumber);
expect(text).not.toContain('"rng"');
expect(text).not.toContain('"resume"');
```

`state` is a fixture with the marked card only in seat 1's hand; `secretOpponentCardNumber` is that card's number. The global catalog is public; the projection must not identify which secret card is present.

- [ ] Run `npm test -- tests/host`; expect projection and serialization failures.
- [ ] Add `tests/host/card-tray.test.ts`. Test Commander tray visibility, disabled reasons, tax updates, real hand counts, and stale object removal. Test hidden-card exclusion, expired casting permission, and recovery-only cards. Use test-only permission fixtures for non-Commander zones; add no new production card behavior.

```ts
const h = fixture({ commanderCasts: { 0: 2 } });
const view = projectView(h.state, 0, context);
const commander = view.cardTray.otherZones.find(item => item.card.card === 'P-001L')!;
expect(commander.sourceZone).toBe('commander');
expect(commander.cast?.displayedCost).toBe(7);
expect(view.cardTray.hand).toHaveLength(h.state.zones[0].hand.length);
expect(h.state.zones[0].hand).not.toContain(h.state.commanders[0].instance);
```
- [ ] Implement `createLocalHost(initial: MatchState, context: EngineContext, save: (state: MatchState, command: Command) => Promise<void>): LocalHost`. Queue each complete command/save sequence. Deduplicate by command ID and payload; conflicting reuse returns an error. The host derives legal action offers from engine legality checks, not a separate UI rules implementation.

```ts
let queue = Promise.resolve();
const schedule = <T>(work: () => Promise<T>): Promise<T> => {
  const next = queue.then(work);
  queue = next.then(() => undefined, () => undefined);
  return next;
};
```

- [ ] Derive decisionSeat from pending choice, combat declaration, or priority. View switching never changes the authorized actor. Filter draw/discard/search events before publishing seat logs. Supply a memory save adapter for tests until Task 20. Re-run tests; expected: no secret markers and exactly one payment per accepted ID.

### Task 20: Save, resume, replay, and export complete matches

**Create:** `src/storage/save.ts`, `indexed-db.ts`, `replay.ts`; `tests/support/memory-store.ts`; `tests/storage/save.test.ts`, `tests/storage/replay.test.ts`.

**Consumes:** Accepted commands and authoritative state. **Produces:** `SaveEnvelope`, `SaveStore`, `loadSave`, `exportSave`, `importSave`, `replaySave`.

```ts
interface SaveEnvelope {
  versions: Versions; origin: { kind: 'normal'; options: StartOptions } | { kind: 'scenario'; id: string; initial: MatchState };
  snapshot: MatchState; commands: Command[];
}
interface SaveStore {
  read(): Promise<SaveEnvelope | null>;
  write(save: SaveEnvelope): Promise<void>;
}
loadSave(text: string, context: EngineContext): SaveEnvelope;
exportSave(save: SaveEnvelope): string;
importSave(text: string, store: SaveStore, context: EngineContext): Promise<SaveEnvelope>;
replaySave(save: SaveEnvelope, context: EngineContext): MatchState;
```

- [ ] Test every pending choice, stack/EX continuation, ordered zones, timestamps, tax, RNG, and command sequence through save/resume. Inject quota/transaction errors. Test malformed JSON, unsupported versions, tampered replay, and snapshot/log disagreement.

```ts
const encoded = exportSave(save);
const decoded = loadSave(encoded, context);
expect(replaySave(decoded, context)).toEqual(save.snapshot);
```

Here `save` comes from an accepted transcript ending at a pending EX choice; also run the assertion for each choice kind.

- [ ] Run `npm test -- tests/storage`; expect persistence/replay failures.
- [ ] Use one IndexedDB transaction for snapshot and command history. Persist before reporting `saved`. On failure, keep the accepted in-memory state and full command log, report `unsaved`, offer retry and export, and never pretend the previous disk snapshot is current. Retrying saves must not reapply commands.

```ts
const compatible = Object.entries(expectedVersions)
  .every(([key, value]) => save.versions[key as keyof Versions] === value);
if (!compatible) throw new Error('This match needs a different app or rules version. Export it before starting another match.');
```

`expectedVersions: Versions` is the current engine/catalog/profile compatibility tuple. Support exact version matches initially; no automatic migration is required.

- [ ] Compare replayed state to the snapshot on import, then save it transactionally. Keep incompatible raw data available for export and preserve the existing match if import fails. Use fake-indexeddb for unit tests and real IndexedDB in browser tests. Re-run tests; expected: deterministic recovery and visible failure status.

### Task 21: Build menus, card browser, and deck editor

**Create:** `index.html`, `src/main.ts`, `src/styles.css`; `src/client/app.ts`, `store.ts`, `menu.ts`, `deck-editor.ts`; `src/storage/decks.ts`; `tests/e2e/decks.spec.ts`.

**Consumes:** Catalog, format validation, LocalHost, SaveStore, scenarios. **Produces:** `mountApp(root: HTMLElement): () => void`, `mountDeckEditor(root: HTMLElement, deck: DeckList, onSave: (deck: DeckList) => void): () => void`.

- [ ] Write browser tests for New Match, both default decks, seed display, random start, keep/mulligan, resume, import/export, and scenario selection. Test deck search by name/number/element/type/set, Commander selection, add/remove, singleton errors, deck-size errors, and saved deck persistence.

```ts
await page.goto('/');
await page.getByRole('button', { name: 'Deck editor' }).click();
await expect(page.getByText('19 / 19 main-deck cards')).toBeVisible();
await expect(page.getByText('Commander: Cinder Marshal')).toBeVisible();
```

- [ ] Run `npm run test:e2e -- tests/e2e/decks.spec.ts`; expect missing screen/control failures. Configure Playwright to build and serve a localhost preview; keep each test's browser storage isolated.
- [ ] Implement DOM controls with visible labels. Let the user create/edit a deck even when incomplete, but prevent starting it until `validateDeck` returns no errors. Preserve immutable supplied defaults and store copies separately. The small catalog naturally limits legal alternatives; do not generate extra cards to fill an edited deck.

```ts
const errors = validateDeck(deck, mvpFormat, opusPh);
startButton.disabled = errors.length !== 0;
errorList.replaceChildren(...errors.map(error => {
  const item = document.createElement('li'); item.textContent = error.message; return item;
}));
```

`startButton` and `errorList` are the created menu elements. Set card and imported names with text content, not HTML parsing.

- [ ] Display set/provenance and rarity separately from Commander role. Persist chosen seed, decks, and versions. Re-run browser tests; expected: invalid decks cannot start and both defaults can.
- [ ] Match Arena's card-grid and adjacent deck-list workflow. Keep filters, hover inspection, and direct add/remove controls prominent. Display every supported card as available. Include this screen in the Task 22 reference comparison.

### Task 22: Render the Phaser table and accessible match status

**Create:** `src/client/match-scene.ts`, `layout.ts`, `card-view.ts`, `card-tray.ts`, `choice-dock.ts`, `match-hud.ts`, `log.ts`; `tests/e2e/table.spec.ts`; `docs/ui-reference.md`.

**Consumes:** `MatchView` only. **Produces:** `mountTable(container: HTMLElement, onCard: (object: ObjectId) => void): { render(view: MatchView): void; destroy(): void }`, `renderHud(root: HTMLElement, view: MatchView): void`.

Also produce `renderCardTray(view: MatchView): void` and `layoutHand(count: number, width: number): { x: number; y: number; rotation: number }[]` in `card-tray.ts`. Render actual hand and other-zone groups separately. Both groups use the same card gestures. Use separate presentation keys for the Commander slot and its tray representation, bound to one engine object.

- [ ] Record desktop Arena reference frames or linked images for idle board, hand hover, casting, targeting, choices, stack, and deck editing. Use official material where available. Describe the exact pattern to match and each FFTCG adaptation in `docs/ui-reference.md`. Include the user's bottom-left choice placement as an explicit requirement. Keep reference images outside the shipped assets.

- [ ] Write assertions at both target resolutions for both hands, Forward/Backup rows, Commander slots and next cost, seven Damage Zone slots, deck count, Break/removed browser, stack, turn, priority, and result display. Use semantic HTML labels alongside canvas graphics.

```ts
await page.setViewportSize({ width: 1280, height: 720 });
await expect(page.getByRole('region', { name: 'Commander Zone — Player 1' })).toBeVisible();
await expect(page.getByRole('status', { name: 'Priority' })).toBeVisible();
await expect(page.getByRole('button', { name: 'Inspect Player 2 hand' })).toBeEnabled();
```

- [ ] Run `npm run test:e2e -- tests/e2e/table.spec.ts`; expect missing table/status regions.
- [ ] Render original geometric card faces with number, name, element icon+label, cost, power, role/rarity, and readable enlarged text. Use fixed logical table coordinates scaled to the available canvas, with HTML panels outside the canvas. Bound hand fan overlap and allow scrolling large zones.
- [ ] Match Arena's bottom-center curved hand fan, hover lift, enlarged preview, neighboring-card spread, and playable-card glow. Put the opponent's hand at the top, player markers near each hand, and the stack at the side. Keep zone access at the board edges and the log collapsed by default.
- [ ] Keep local hand presentation order separate from zone order. Distinguish horizontal hand reordering from an upward play gesture. Cancel restores the prior order. Test that reordering changes no engine sequence or rules-defined ordering.
- [ ] Reserve the bottom-left choice dock and bottom-right progression control before calculating hand width. HTML controls can overlay reserved table regions; they must not displace the hand into a dashboard layout. Center instruction text above the hand.
- [ ] Add a separated other-zone group beside the hand. Show a persistent zone badge and Commander cost. Keep the same engine object at both the Commander slot and tray. Use bounded fan compression, horizontal browsing, and collapsible zone groups so every card remains reachable.

```ts
const scale = Math.min(containerWidth / 1280, containerHeight / 720);
const offsetX = (containerWidth - 1280 * scale) / 2;
const offsetY = (containerHeight - 720 * scale) / 2;
```

Those values define `computeLayout(width: number, height: number): { scale: number; offsetX: number; offsetY: number }` in `layout.ts`.

- [ ] Manual visual check: 1920×1080 readable card inspection; 1280×720 all required buttons reachable; no hover panel blocks confirmation; Light/Dark and active/dull states distinguishable without color. Re-run tests; expected: all regions and labels available.
- [ ] Compare screenshots with the reference record at both sizes. Check hand placement, fan proportions, preview prominence, choice dock, stack, and field hierarchy. Record deviations with reasons. Reject pets, decorative board controls, and selectable board cosmetics.

### Task 23: Implement every legal action and decision prompt

**Create:** `src/client/actions.ts`, `prompts.ts`, `targeting.ts`; `tests/e2e/actions.spec.ts`, `tests/e2e/choices.spec.ts`, `tests/e2e/arena-interactions.spec.ts`. **Modify:** Match HUD, card tray, choice dock, and store.

**Consumes:** Action offers, choices, host replies. **Produces:** `buildIntent(offer: ActionOffer, draft: ActionDraft): Intent`, `renderPrompt(root: HTMLElement, choice: MatchView['choice'], submit: (answer: Answer) => void): void`.

Define `ActionDraft` in `actions.ts`: `{ source: ObjectId | null; targets: ObjectId[]; mode: string | null; payment: Payment; members: ObjectId[]; blocker: ObjectId | null; ability: string | null }`. Use the ability ID and cost requirements from the selected `ActionOffer`.

Add `DraftStage = 'idle' | 'mode' | 'targets' | 'payment' | 'review' | 'submitting'` to the client store. Produce `beginCardAction(source: ObjectId, gesture: 'click' | 'drag'): void` in `actions.ts`. Both gestures select the same offer and enter the same draft stages. Produce `renderTargeting(source: ObjectId, selected: ObjectId[], hovered: ObjectId | null): void` in `targeting.ts`. Arrows use visible objects from the current view; stale object IDs clear the draft.

- [ ] Write browser scenarios for casting from hand/Commander Zone, explicit CP and `{S}` costs, source dull/sacrifice, mode/target selection, party formation, blocking, damage allocation, trigger order, search, discard, Commander return, and EX choices. Include wrong actor and stale reply recovery.

```ts
await page.getByRole('button', { name: 'Pass priority' }).click();
await expect(page.getByRole('status', { name: 'Decision player' })).toHaveText('Player 2');
await expect(page.getByRole('button', { name: 'Pass priority' })).toBeEnabled();
```

- [ ] Run `npm run test:e2e -- tests/e2e/actions.spec.ts tests/e2e/choices.spec.ts`; expect missing input/choice paths.
- [ ] Implement a local selection draft. Show generated/spent/unused CP, required element, Commander tax, and each cost source. Cancel discards the draft without sending a command. Submit only complete declarations; engine validation remains authoritative.
- [ ] Implement both click-to-play and drag-to-play. Lift the source into a casting position. Offer a compact mode/ability selector only when multiple actions need a choice. Highlight legal targets and draw a source-to-cursor arrow that snaps to hovered targets. Keep arrows to selected targets and show target-count progress.
- [ ] Select payment directly on actual hand cards and Backups. Display distinct markers for CP discard, special discard, and dulling. Non-hand tray cards are never hand-payment candidates. Release on an invalid area or press Escape to cancel the draft without an engine command.
- [ ] Route hand and other-zone cards through the same interaction code. Submit the real source object, with no presentation-only move to hand. Keep the Commander slot and tray synchronized. After return, update its tax; after a move to hand, render one actual hand entry.

```ts
const command: Command = { id: crypto.randomUUID(), expectedSeq: view.seq,
  seat: view.decisionSeat!, intent: buildIntent(offer, draft) };
const reply = await host.submit(command);
```

Random command IDs are host/UI metadata; they must not feed rules randomness. Each displayed action is bound to the view sequence that created it.

- [ ] All choice kinds get a working UI: keep/order mulligan; select cards/targets/mode; reorder triggers; allocate fixed increments; accept/decline. Switch active controls to choice owner, including a stolen Commander's owner. View inspection remains independent.
- [ ] Render contextual Confirm, Cancel, Decline, and selection counts at bottom left. Keep ordinary priority/phase controls at bottom right and disable them during choices. Choose battlefield targets directly on the board. Use card-row overlays for search, reveal, mulligan, discard, and ordering. Mandatory decisions cannot be dismissed with Escape or a fake Cancel button.
- [ ] Reorient the board when the decision seat changes, placing that seat's tray at the bottom. Preserve selected objects through the view transition. Clear stale drafts, release pointer capture, and prevent pointer-up from submitting against the new seat. Inspecting another hand must not transfer command authority.
- [ ] Disable duplicate submission while pending; rejected command keeps the authoritative view and displays its reason. Passing and ending a turn are distinct; no shortcut skips opponent priority. Run tests plus a manual payment/cancel check; expected: no manual state adjustment needed for any prompt.

- [ ] Add real-pointer E2E cases for both casting gestures, targeted Summons, multiple targets, and Commander casts from the extension. Assert that illegal drops and Escape leave sequence, zones, CP sources, and tax unchanged. Confirm that every overflow card remains reachable.

```ts
const dock = page.getByRole('region', { name: 'Choices' });
const bounds = await dock.boundingBox();
const viewport = page.viewportSize()!;
expect(bounds).not.toBeNull();
expect(bounds!.x + bounds!.width).toBeLessThan(viewport.width * 0.30);
expect(bounds!.y).toBeGreaterThan(viewport.height * 0.60);
```

Run this placement assertion during Commander return and EX Burst choices at both supported resolutions. Give card hit regions stable `data-testid` values tied to presentation key and object ID. Use their bounding boxes with `page.mouse.move`, `down`, and `up` to exercise Phaser input. Semantic mirror controls alone do not prove that canvas dragging works.

### Task 24: Add presentation feedback and playable scenario guidance

**Create:** `src/client/animation.ts`, `tests/e2e/presentation.spec.ts`. **Modify:** Card view, HUD, log, menu.

**Consumes:** Ordered view events and scenario purposes. **Produces:** `animateEvents(events: RuleEvent[], reducedMotion: boolean): Promise<void>` with no authority over state.

- [ ] Test target highlights, dull rotation, card movements, damage feedback, stack resolution, result panel, and reduced-motion equivalence. Render log entries for rejected actions, accepted payments, Commander decisions, EX, control change, and outcomes in plain FFTCG terms.

```ts
await page.emulateMedia({ reducedMotion: 'reduce' });
await expect(page.getByRole('button', { name: 'Pass priority' })).toBeEnabled();
await expect(page.getByRole('log', { name: 'Game log' })).toBeVisible();
```

- [ ] Run `npm run test:e2e -- tests/e2e/presentation.spec.ts`; expect missing feedback/accessible log behavior.
- [ ] Consume events after authoritative updates. Cancel animations on scene teardown; new views can supersede visual work without dropping decisions. Include keyboard focus, Enter confirmation, Escape draft cancellation, readable card inspection, and explicit element labels.
- [ ] Add Arena-style card lift, hover spread, source-to-target arrows, selected-card emphasis, and combat assignment arrows. Animate accepted movement from the actual source zone. Character casts enter the field directly. Preserve all targeting and selection information with reduced motion.
- [ ] Apply the same visual hierarchy to opening-hand selection, pause/settings, confirmation overlays, and match results. Keep contextual overlays above the visible board. Cover these states in the reference comparison without adding progression or cosmetic features.

```ts
const duration = reducedMotion ? 0 : 180;
// Phaser tweens consume duration; host.submit never awaits tween completion.
```

- [ ] Scenario menu shows title, purpose, steps to try, and expected observations from Task 18. Restarting a scenario creates a separate origin and offers to export unsaved progress. Re-run tests and inspect screenshots at both resolutions; expected: clear feedback with animations enabled or disabled.

### Task 25: Package a complete offline release and safe updates

**Create:** `src/client/offline.ts`, local icons, `tests/e2e/offline.spec.ts`. **Modify:** Vite config, menu, package scripts.

**Consumes:** Built static assets and save compatibility. **Produces:** Complete cached release in `dist/`; `registerOffline(onStatus: (status: 'installing' | 'ready' | 'update' | 'error') => void): void`.

- [ ] Write an offline test against the production build: open once online, wait for cache-ready status and service-worker control, disable network, close/reopen the page, start a match, act, reload during a choice, and finish the match.

```ts
await page.goto('/');
await expect(page.getByText('Ready for offline play')).toBeVisible();
await context.setOffline(true);
await page.reload();
await expect(page.getByRole('button', { name: 'New match' })).toBeEnabled();
```

- [ ] Run `npm run test:e2e -- tests/e2e/offline.spec.ts`; expect reload failure before caching exists. Configure service workers as allowed in Playwright.
- [ ] Configure the PWA plugin with prompt-based updates, full precache coverage of application chunks/catalog/icons, and no runtime CDN routes. Inspect generated asset sizes and set the cache limit to include the actual Phaser bundle. An install error must never display ready status.

```ts
VitePWA({
  registerType: 'prompt',
  workbox: { globPatterns: ['**/*.{js,css,html,json,png,svg,woff2}'] },
  manifest: { name: 'Dissidia Card Game Playtest', short_name: 'Dissidia',
    start_url: '/', display: 'standalone', background_color: '#10131c', theme_color: '#10131c',
    icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }] },
});
```

- [ ] Show update availability during a match but allow activation only at a safe menu after saving/ending it. Test build A running with build B waiting: A finishes with its original rules; B activates between matches; incompatible saves explain/export instead of silently loading. Do not force service-worker activation or reload during play.
- [ ] Re-run offline tests with a new browser context and browser-console/network error checks. Expected: no external requests required, no missing chunks, cached launch works after origin server becomes unavailable. Document localhost serving and hosted installation; do not deploy as part of this plan.

### Task 26: Run complete UI duels and recovery acceptance

**Create:** `tests/e2e/duel.spec.ts`, `tests/e2e/recovery.spec.ts`, `tests/e2e/helpers.ts`, `docs/playtest-results.md`.

**Consumes:** Complete app, engine coverage, release build. **Produces:** Repeatable acceptance suite and recorded manual results.

- [ ] Write `playTranscript(page: Page, transcript: UiStep[]): Promise<void>` in E2E helpers. Define `UiStep` as `{ role: 'button' | 'option'; name: string } | { label: string; value: string }`; drive accessible clicks/fills only. Convert the verified headless duel transcripts into literal UI steps and confirm their expected outcomes. Do not inject final states to pass a full-duel test.

```ts
await playTranscript(page, damageWinSteps);
await expect(page.getByRole('heading', { name: 'Player 1 wins' })).toBeVisible();
await expect(page.getByText('Seven damage')).toBeVisible();
```

`damageWinSteps: UiStep[]` is the complete action list in `duel.spec.ts`, starting at New Match with a fixed seed and both supplied decks. Also provide a deckout transcript with the other starting seat.

- [ ] Run `npm run test:e2e -- tests/e2e/duel.spec.ts tests/e2e/recovery.spec.ts`; expect any missing UI path or recovery mismatch to fail.
- [ ] Exercise both default decks from mulligan to outcome, including responses and Commander use. Cover all focused presets through UI. Reload during payment drafting, priority, Commander replacement, trigger ordering, allocation, and EX; unpaid drafts may reset, accepted decisions may not.

```ts
await page.reload();
await page.getByRole('button', { name: 'Resume match' }).click();
await expect(page.getByRole('dialog', { name: 'Commander return' })).toBeVisible();
```

- [ ] Test failed-save banner/retry/export, rejected import preserving current save, exact compatible import, and filtered-seat inspection mode. Test keyboard-only core actions, reduced motion, and both viewport sizes. Verify the table uses latest host state after tab suspension.
- [ ] Run `tests/e2e/arena-interactions.spec.ts` with real canvas gestures at both resolutions. Cover insufficient CP, invalid targets, canceled drags, modal choices, tray overflow, and seat transitions. Verify a cast from Commander Zone never increases hand count or exposes the Commander as a discard source.
- [ ] Complete the screenshot comparison in `docs/ui-reference.md`. Inspect idle board, hovered hand, targeting, payment, non-hand playable cards, bottom-left choices, stack, and deck editor. Record outcomes in `docs/playtest-results.md`. A menu-only cast flow or a generic dashboard layout fails the milestone.
- [ ] Perform one unscripted normal duel online and one installed/cached duel with network disabled. Record seed, app versions, starting seat, outcome, defects, browser, and viewport in `docs/playtest-results.md`. Any need for manual rule correction blocks the gate.
- [ ] Run `npm run typecheck`, `npm run check:boundaries`, `npm run check:coverage`, `npm test`, `npm run build`, and `npm run test:e2e`. Expected: all pass; screenshots manually reviewed; no unresolved defect that prevents a legal action, decision, outcome, or recovery.

### Task 27: Deliver the playtest guide and final milestone gate

**Create:** `docs/playtesting.md`. **Modify:** `README.md`, `docs/rules-coverage.md`, `docs/playtest-results.md`.

**Consumes:** Verified release and recorded evidence. **Produces:** Reproducible installation/run instructions and completed acceptance checklist.

- [ ] Document exact commands: `npm ci`, `npm run dev`, `npm run build`, `npm run preview`, and the verification commands from Task 26. Explain initial installation versus offline startup and the visible ready indicator.
- [ ] Document starting a normal duel, choosing both decks, seed capture, keep/mulligan, inspecting both hands, priority versus turn, payment, Commander return/tax, and finishing a match.
- [ ] Document hand and non-hand tray badges, click/drag casting, targeting arrows, bottom-left choice buttons, and overflow browsing. Explain that tray presentation never changes a card's rules zone.
- [ ] Document each preset's purpose, deckout expectations for 19-card decks, resume/export/import, failed saves, version incompatibility, and safe updates. Include bug-report fields: seed, versions, last action, expected/actual result, and exported diagnostic file.
- [ ] Run the README instructions in a clean install or clean temporary copy. Verify local Markdown links and that no documented control name differs from the UI. Record the commands and result in `docs/playtest-results.md`.
- [ ] Complete the following final checklist with evidence paths and results:

| Acceptance item | Evidence |
|---|---|
| Exact 40-card catalog and both 19-plus-one decks | Catalog tests, deck tests, coverage report |
| All design playtest coverage rows | `docs/rules-coverage.md` with executable test links |
| Rules-correct full duels, damage and deckout outcomes | Headless transcripts and UI duel tests |
| Every legal action and mandatory choice available | UI action/choice/preset tests |
| Owner-controlled Commander replacement and costs 3/5/7 | Commander tests and third-cast preset |
| Save/replay/import consistency, including pending decisions | Storage and recovery tests |
| Complete cached offline launch and duel | Offline test plus recorded manual session |
| Readable desktop presentation and reduced motion | Both viewport screenshots and manual review |
| Arena layout and interactions, including bottom-left choices | `docs/ui-reference.md` comparison and real-pointer E2E tests |
| Cards castable from other zones use the hand interaction model | Tray projection tests, Commander cast/return tests, and source-zone assertions |
| No pets or cosmetic board controls | Screenshot and menu review |
| Match updates cannot replace ongoing rules | Two-build update test |
| New user can start and play from instructions | Clean-install guide verification |

Mark milestone 3 complete only when every row passes. At that point, the MVP is ready for user playtesting with no additional implementation milestone.

## Scope after this plan

The next work is driven by playtest findings. Full Opus Zero and Opus I–III card authoring is milestone 4. Cloudflare authority, private matches, and matchmaking remain milestones 5 and 6. Keep their engine/protocol boundaries intact without creating these services during MVP implementation.

## Technical references checked for planning

- [Phaser browser/TypeScript overview](https://docs.phaser.io/phaser/getting-started/what-is-phaser): use bundled 2D rendering with a separate rules core.
- [Vitest guide](https://vitest.dev/guide/): Node rule tests and focused test runs.
- [Playwright offline control](https://playwright.dev/docs/api/class-browsercontext#browser-context-set-offline): disable network in production-build acceptance tests.
- [PWA prompt updates](https://vite-pwa-org.netlify.app/guide/prompt-for-update): request activation between matches.
- [PWA service-worker registration](https://vite-pwa-org.netlify.app/guide/register-service-worker): report offline-ready and update state through application controls.

## Plan review record

The plan maps design sections 3–5 to Tasks 2, 6, 14–18; section 7 to Tasks 3–18; sections 8–9 to Tasks 1, 7, 19–20; section 10 to Tasks 21–24; section 11 to Tasks 20 and 25–27; and section 13 to milestone gates. Section 12 is deferred online architecture with preserved boundaries. All three requested milestones have implementation tasks and release gates.
