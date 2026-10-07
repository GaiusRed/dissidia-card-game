import type { AbilityHandler, CardDefinition, Json, Seat } from '../../../rules/types';
import { moveCard } from '../../../rules/zones';
import { shuffle } from '../../../rules/random';
import { card as findCard, emit } from '../../shared/legacy';
import type { CardScript } from '../../../rules/contracts/card-script';
import type { ResolutionContext, ResumeRef } from '../../../rules/contracts/execution';
import { z } from 'zod';
import { selfEntryTrigger } from '../../shared/script-helpers';

const quartermasterSearch: AbilityHandler = context => {
  const data = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
    ? context.frame.data as Record<string, Json> : {};
  const seat: Seat = data.seat === 1 ? 1 : 0;
  if (context.frame.step === 'choice') {
    const selected = Array.isArray(data.selected) ? data.selected[0] : undefined;
    if (selected === 'skip') return { events: [emit(context.state, 'card.search-skipped', { seat })], next: [], choice: null };
    const target = typeof selected === 'string' ? findCard(context.state, selected) : undefined;
    if (!target || target.owner !== seat || target.zone !== 'deck' || !context.catalog[target.card]?.jobs.includes('Soldier')) {
      return { events: [], next: [], choice: null };
    }
    const old = moveCard(context.state, target.instance, 'hand');
    const result = shuffle(context.state.zones[seat].deck, context.state.rng);
    context.state.zones[seat].deck = result.items;
    context.state.rng = result.seed;
    return { events: [emit(context.state, 'card.searched', { seat, card: old.card })], next: [], choice: null };
  }
  const options = context.state.zones[seat].deck.map(instance => context.state.cards[instance]!)
    .filter(target => context.catalog[target.card]?.jobs.includes('Soldier'))
    .map(target => ({ id: target.object, label: context.catalog[target.card]!.name, object: target.object }));
  return { events: [], next: [], choice: {
    id: `choice-${context.state.nextId++}`, seat, kind: 'cards',
    reason: 'Quartermaster: search your main deck for a Soldier, add it to your hand, then shuffle.',
    options: [...options, { id: 'skip', label: 'Do not search', object: null }],
    min: 1, max: 1, allocation: null,
    resume: { handler: context.frame.handler, step: 'choice', data: { seat, selected: [] } },
  } };
};
export const abilityHandlers = { 'quartermaster-search': quartermasterSearch };

export const card: CardDefinition = {
  "number": "P-011R",
  "name": "Quartermaster",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Backup",
  "elements": [
    "Fire"
  ],
  "cost": 2,
  "power": null,
  "jobs": [
    "Support"
  ],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [
    {
      "id": "quartermaster-enter",
      "kind": "auto",
      "handler": "quartermaster-search",
      "text": "When Quartermaster enters the field, you may search for 1 Job Soldier and add it to your hand.",
      "ex": false,
      "trigger": "enter"
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "When Quartermaster enters the field, you may search for 1 Job Soldier and add it to your hand."
};
const quartermasterResume: ResumeRef = { script: 'P-011R', version: '1', ability: 'quartermaster-enter', step: 'apply', payload: null };
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [{
  id: 'quartermaster-enter', kind: 'auto', text: card.abilities[0]!.text, ex: false, zones: ['field'],
  cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 0, max: 0, distinct: true, accepts: () => true },
  triggers: [selfEntryTrigger], fieldEffects: [], replacements: [],
  steps: {
    resolve: { payloadSchema: z.null(), run: ({ state, frame, catalog }: ResolutionContext) => {
      const options = state.zones[frame.controller].deck.map(instance => state.cards[instance]!)
        .filter(target => catalog[target.card]?.jobs.includes('Soldier'))
        .map(target => ({ id: target.object, label: catalog[target.card]!.name, object: target.object }));
      return { batches: [], choice: { seat: frame.controller, kind: 'cards',
        reason: 'Quartermaster: search your deck for a Soldier?',
        options: [...options, { id: 'skip', label: 'Do not search', object: null }],
        min: 1, max: 1, allocation: null, resume: quartermasterResume }, next: null };
    } },
    apply: { payloadSchema: z.null(), run: (context: ResolutionContext) => {
      const selected = context.answer?.selected[0];
      if (!selected || selected === 'skip') return { batches: [], choice: null, next: null };
      const target = Object.values(context.state.cards).find(card => card.object === selected);
      if (!target || target.owner !== context.frame.controller || target.zone !== 'deck' ||
          !context.catalog[target.card]?.jobs.includes('Soldier')) return { batches: [], choice: null, next: null };
      return { batches: [{ simultaneous: false, operations: [
        { kind: 'move', object: target.object, to: 'hand', index: null },
        { kind: 'shuffle', seat: context.frame.controller },
      ] }], choice: null, next: null };
    } },
  },
}] };
export default card;
