import type { AbilityHandler, CardDefinition, Json, Seat } from '../../../rules/types';
import { moveCard } from '../../../rules/zones';
import { risingUndertowSummon } from '../../shared/summon-effects';
import { card as findCard, emit } from '../../shared/legacy';

const risingUndertowEndDiscard: AbilityHandler = context => {
  const data = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
    ? context.frame.data as Record<string, Json> : {};
  const seat: Seat = data.seat === 1 ? 1 : 0;
  if (context.frame.step === 'choice') {
    const selected = Array.isArray(data.selected) ? data.selected[0] : undefined;
    const target = typeof selected === 'string' ? findCard(context.state, selected) : undefined;
    if (!target || target.zone !== 'hand' || target.owner !== seat) return { events: [], next: [], choice: null };
    const old = moveCard(context.state, target.instance, 'break');
    return { events: [emit(context.state, 'card.discarded', { seat, card: old.card, reason: 'Rising Undertow' })], next: [], choice: null };
  }
  const hand = context.state.zones[seat].hand;
  if (hand.length === 0) return { events: [], next: [], choice: null };
  return { events: [], next: [], choice: {
    id: `choice-${context.state.nextId++}`, seat, kind: 'cards',
    reason: 'Rising Undertow: discard 1 card at the beginning of your End Phase.',
    options: hand.map(instance => ({ id: context.state.cards[instance]!.object, label: context.catalog[context.state.cards[instance]!.card]!.name,
      object: context.state.cards[instance]!.object })),
    min: 1, max: 1, allocation: null,
    resume: { handler: context.frame.handler, step: 'choice', data: { seat, selected: [] } },
  } };
};
export const abilityHandlers = {
  'rising-undertow': risingUndertowSummon,
  'rising-undertow-end-discard': risingUndertowEndDiscard,
};

export const card: CardDefinition = {
  "number": "P-040R",
  "name": "Rising Undertow",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Summon",
  "elements": [
    "Water"
  ],
  "cost": 2,
  "power": null,
  "jobs": [],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [],
  "summonHandler": "rising-undertow",
  "summonTarget": { "min": 0, "max": 0, "zones": [], "types": [], "controller": "any", "dull": null },
  "ex": false,
  "text": "Draw 2 cards. At the beginning of your End Phase, discard 1 card."
};
export default card;
