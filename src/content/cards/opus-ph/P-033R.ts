import type { AbilityHandler, CardDefinition, Json, Seat } from '../../../rules/types';
import { moveCard } from '../../../rules/zones';
import { emit } from '../../shared/legacy';

const tideWitnessDraw: AbilityHandler = context => {
  const data = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
    ? context.frame.data as Record<string, Json> : {};
  const seat: Seat = data.seat === 1 ? 1 : 0;
  if (context.frame.step === 'choice') {
    const selected = Array.isArray(data.selected) ? data.selected[0] : undefined;
    if (selected !== 'draw') return { events: [emit(context.state, 'trigger.declined', { seat, ability: 'tide-witness-draw' })], next: [], choice: null };
    const instance = context.state.zones[seat].deck[0];
    if (!instance) {
      context.state.work.push({ handler: 'rule-process', step: 'empty-deck', data: { seat } });
      return { events: [emit(context.state, 'player.attempted-empty-draw', { seat, source: 'Tide Witness' })], next: [], choice: null };
    }
    const old = moveCard(context.state, instance, 'hand');
    return { events: [emit(context.state, 'card.drawn', { seat, card: old.card, source: 'Tide Witness' })], next: [], choice: null };
  }
  return { events: [], next: [], choice: {
    id: `choice-${context.state.nextId++}`, seat, kind: 'confirm',
    reason: 'Tide Witness: you may draw 1 card.',
    options: [{ id: 'draw', label: 'Draw 1 card', object: null }, { id: 'skip', label: 'Do not draw', object: null }],
    min: 1, max: 1, allocation: null,
    resume: { handler: context.frame.handler, step: 'choice', data: { seat, selected: [] } },
  } };
};
export const abilityHandlers = { 'tide-witness-draw': tideWitnessDraw };

export const card: CardDefinition = {
  "number": "P-033R",
  "name": "Tide Witness",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Backup",
  "elements": [
    "Water"
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
      "id": "tide-witness-leave",
      "kind": "auto",
      "handler": "tide-witness-draw",
      "text": "When a Forward you control leaves the field, you may draw 1 card.",
      "ex": false,
      "trigger": "controlled-forward-leaves"
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "No abilities."
};
export default card;
