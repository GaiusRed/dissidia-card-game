import type { Command, DeckList, MatchState, Transition, Versions } from '../rules/types';
import { z } from 'zod';
import { commandSchema } from '../rules/codec';
import { executionStateSchema, resumeRefSchema } from '../rules/contracts/execution';

const jsonSchema: z.ZodType<import('../rules/types').Json> = z.lazy(() => z.union([
  z.null(), z.boolean(), z.number().finite(), z.string(), z.array(jsonSchema), z.record(z.string(), jsonSchema),
]));
const seatSchema = z.union([z.literal(0), z.literal(1)]);
const zoneSchema = z.enum(['deck', 'hand', 'field', 'stack', 'break', 'removed', 'damage', 'commander']);
const cardSchema = z.strictObject({
  instance: z.string().min(1), object: z.string().min(1), card: z.string().min(1), owner: seatSchema, controller: seatSchema,
  zone: zoneSchema, dull: z.boolean(), damage: z.number().int().nonnegative(), controlledSinceTurn: z.number().int().nonnegative(),
  attackedTurn: z.number().int().nonnegative().nullable(), frozen: z.boolean(),
});
const continuationSchema = z.strictObject({ handler: z.string().min(1), step: z.string().min(1), data: jsonSchema });
const choiceSchema = z.strictObject({
  id: z.string().min(1), seat: seatSchema, kind: z.enum(['starting-player', 'mulligan', 'cards', 'targets', 'mode', 'order', 'allocation', 'confirm']),
  reason: z.string(), options: z.array(z.strictObject({ id: z.string(), label: z.string(), object: z.string().nullable() })),
  min: z.number().int().nonnegative(), max: z.number().int().nonnegative(),
  allocation: z.strictObject({ total: z.number().int().nonnegative(), increment: z.number().int().positive() }).nullable(),
  resume: z.union([continuationSchema, z.object({
    script: z.string().min(1), version: z.string().min(1), ability: z.string().min(1), step: z.string().min(1), payload: jsonSchema,
  }).strict()]),
});
const combatSchema = z.strictObject({
  step: z.enum(['prepare', 'declare', 'block', 'firstStrike', 'damage', 'normalDamage', 'finish']),
  participants: z.array(cardSchema), attackers: z.array(z.string()), blocker: z.string().nullable(),
  wasBlocked: z.boolean(), partyFirstStrike: z.boolean(),
  allocation: z.record(z.string(), z.number().int().nonnegative()),
});
const resultSchema = z.strictObject({ winner: seatSchema.nullable(), reason: z.enum(['damage', 'deckout', 'concede', 'simultaneous', 'loop']) });
const ruleEventSchema = z.strictObject({ id: z.string(), type: z.string(), data: jsonSchema });
const versionsSchema = z.strictObject({ schema: z.string(), engine: z.string(), format: z.string(), catalog: z.string() });
const instanceManifestSchema = z.array(z.strictObject({
  instance: z.string().min(1), card: z.string().min(1), owner: seatSchema, commander: z.boolean(),
}));
const deckListSchema = z.strictObject({ commander: z.string().min(1), main: z.array(z.string().min(1)) });
export const matchOriginDescriptorSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('normal'), seed: z.number().int(), decks: z.tuple([deckListSchema, deckListSchema]) }),
  z.strictObject({ kind: z.literal('scenario'), id: z.string().min(1), version: z.number().int().positive() }),
  z.strictObject({ kind: z.literal('snapshot') }),
]);
export type MatchOriginDescriptor =
  | { kind: 'normal'; seed: number; decks: [DeckList, DeckList] }
  | { kind: 'scenario'; id: string; version: number }
  | { kind: 'snapshot' };
const zoneListsSchema = z.strictObject({
  deck: z.array(z.string()), hand: z.array(z.string()), break: z.array(z.string()), removed: z.array(z.string()),
  damage: z.array(z.string()), commander: z.array(z.string()),
});
const matchStateSchema = z.strictObject({
  versions: versionsSchema, seq: z.number().int().nonnegative(), rng: z.number().int(), nextId: z.number().int().nonnegative(),
  format: z.strictObject({ id: z.string(), mainSize: z.union([z.literal(19), z.literal(49)]), allowedSets: z.array(z.string()), damageLimit: z.number().int().positive() }),
  turn: z.number().int().nonnegative(), active: seatSchema, firstPlayer: seatSchema,
  phase: z.enum(['setup', 'active', 'draw', 'main1', 'attack', 'main2', 'end']), priority: z.nullable(seatSchema), passes: z.number().int().nonnegative(),
  cards: z.record(z.string(), cardSchema), zones: z.strictObject({ '0': zoneListsSchema, '1': zoneListsSchema }),
  field: z.array(z.string()), stackCards: z.array(z.string()),
  commanders: z.strictObject({ '0': z.strictObject({ instance: z.string(), casts: z.number().int().nonnegative() }), '1': z.strictObject({ instance: z.string(), casts: z.number().int().nonnegative() }) }),
  stack: z.array(z.strictObject({ id: z.string(), controller: seatSchema, source: z.string(), lastKnown: cardSchema,
    handler: z.string(), targets: z.array(z.string()), mode: z.string().nullable(), data: jsonSchema,
    resume: resumeRefSchema.optional() })),
  effects: z.array(z.strictObject({ id: z.string(), timestamp: z.number().int(), controller: seatSchema, source: z.string(),
    handler: z.string(), data: jsonSchema, expiresTurn: z.number().int().nullable() })),
  triggers: z.array(continuationSchema), work: z.array(continuationSchema), choice: z.nullable(choiceSchema), combat: z.nullable(combatSchema), result: z.nullable(resultSchema),
  execution: executionStateSchema,
});
const acceptedReplySchema = z.strictObject({ ok: z.literal(true), state: matchStateSchema, events: z.array(ruleEventSchema) });
export const savedReceiptSchema = z.strictObject({ command: commandSchema, reply: acceptedReplySchema });
export const matchSaveSchema = z.strictObject({
  format: z.literal('dissidia-save-v1'), versions: versionsSchema, savedAt: z.string().datetime(),
  originDescriptor: matchOriginDescriptorSchema, origin: matchStateSchema, manifest: instanceManifestSchema,
  state: matchStateSchema, transcript: z.array(commandSchema), receipts: z.array(savedReceiptSchema),
});

export interface InstanceManifestEntry {
  instance: string;
  card: string;
  owner: import('../rules/types').Seat;
  commander: boolean;
}

export interface MatchSave {
  format: 'dissidia-save-v1';
  versions: Versions;
  savedAt: string;
  originDescriptor: MatchOriginDescriptor;
  origin: MatchState;
  manifest: InstanceManifestEntry[];
  state: MatchState;
  transcript: Command[];
  receipts: { command: Command; reply: Extract<Transition, { ok: true }> }[];
}
export function createSave(state: MatchState, transcript: Command[], origin: MatchState = state,
  originDescriptor: MatchOriginDescriptor = { kind: 'snapshot' },
  receipts: MatchSave['receipts'] = []): MatchSave {
  const commanders = new Set([origin.commanders[0].instance, origin.commanders[1].instance]);
  const manifest = Object.values(origin.cards).map(card => ({ instance: card.instance, card: card.card,
    owner: card.owner, commander: commanders.has(card.instance) })).sort((left, right) => left.instance.localeCompare(right.instance));
  return { format: 'dissidia-save-v1', versions: { ...state.versions }, savedAt: new Date().toISOString(),
    originDescriptor: JSON.parse(JSON.stringify(originDescriptor)) as MatchOriginDescriptor,
    origin: JSON.parse(JSON.stringify(origin)) as MatchState, manifest,
    state: JSON.parse(JSON.stringify(state)) as MatchState,
    transcript: JSON.parse(JSON.stringify(transcript)) as Command[],
    receipts: JSON.parse(JSON.stringify(receipts)) as MatchSave['receipts'] };
}
export function inspectSave(value: unknown, current: Versions): { compatible: boolean; reason: string | null } {
  if (!value || typeof value !== 'object') {
    return { compatible: false, reason: 'This file is not a supported Dissidia match save.' };
  }
  const parsed = matchSaveSchema.safeParse(value);
  if (!parsed.success) return { compatible: false, reason: 'This save has invalid or incomplete match data.' };
  const save = parsed.data;
  const manifestByInstance = new Map<string, InstanceManifestEntry>();
  for (const entry of save.manifest) {
    if (manifestByInstance.has(entry.instance)) return { compatible: false, reason: 'The saved instance manifest contains duplicate identities.' };
    manifestByInstance.set(entry.instance, entry);
  }
  for (const snapshot of [save.origin, save.state]) {
    const commanderInstances = new Set([snapshot.commanders[0].instance, snapshot.commanders[1].instance]);
    const instances = Object.values(snapshot.cards);
    if (instances.length !== save.manifest.length) return { compatible: false, reason: 'The saved card set does not match its instance manifest.' };
    for (const card of instances) {
      const entry = manifestByInstance.get(card.instance);
      if (!entry || entry.card !== card.card || entry.owner !== card.owner ||
          entry.commander !== commanderInstances.has(card.instance)) {
        return { compatible: false, reason: 'A saved card identity, owner, or Commander role does not match its instance manifest.' };
      }
    }
  }
  for (const key of ['schema', 'engine', 'format', 'catalog'] as const) {
    if (save.versions[key] !== current[key]) return { compatible: false, reason: `Save ${key} version ${save.versions[key]} does not match this app (${current[key]}).` };
    if (save.state.versions[key] !== save.versions[key] || save.origin.versions[key] !== save.versions[key]) {
      return { compatible: false, reason: `The saved ${key} version metadata is inconsistent.` };
    }
  }
  return { compatible: true, reason: null };
}
