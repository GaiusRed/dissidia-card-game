import type { AbilityHandler, CardDefinition, Json, Seat } from '../../../rules/types';
import { moveCard } from '../../../rules/zones';
import { shuffle } from '../../../rules/random';
import { card as findCard, emit } from '../../shared/legacy';

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
      "text": "When Quartermaster enters the field, you may search your main deck for 1 Job Soldier and add it to your hand.",
      "ex": false,
      "trigger": "enter"
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "No abilities."
};
export default card;
