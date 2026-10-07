import type { AbilityHandler, CardDefinition, Json } from '../../../rules/types';
import { moveCard } from '../../../rules/zones';
import { card as findCard, emit } from '../../shared/legacy';

const archiveKeeperDrawDiscard: AbilityHandler = context => {
  const data = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
    ? context.frame.data as Record<string, Json> : {};
  const seat = data.seat === 1 ? 1 : 0;
  if (context.frame.step === 'choice') {
    const selected = Array.isArray(data.selected) ? data.selected[0] : undefined;
    const target = typeof selected === 'string' ? findCard(context.state, selected) : undefined;
    if (!target || target.zone !== 'hand' || target.owner !== seat) return { events: [], next: [], choice: null };
    const old = moveCard(context.state, target.instance, 'break');
    return { events: [emit(context.state, 'card.discarded', { seat, card: old.card, reason: 'Archive Keeper' })], next: [], choice: null };
  }
  const instance = context.state.zones[seat].deck[0];
  const events = [];
  if (!instance) {
    context.state.work.push({ handler: 'rule-process', step: 'empty-deck', data: { seat } });
    events.push(emit(context.state, 'player.attempted-empty-draw', { seat, source: 'Archive Keeper' }));
  } else {
    const old = moveCard(context.state, instance, 'hand');
    events.push(emit(context.state, 'card.drawn', { seat, card: old.card, source: 'Archive Keeper' }));
  }
  const hand = context.state.zones[seat].hand;
  if (hand.length === 0) return { events, next: [], choice: null };
  return { events, next: [], choice: {
    id: `choice-${context.state.nextId++}`, seat, kind: 'cards', reason: 'Archive Keeper: discard 1 card.',
    options: hand.map(instanceId => ({ id: context.state.cards[instanceId]!.object, label: context.catalog[context.state.cards[instanceId]!.card]!.name,
      object: context.state.cards[instanceId]!.object })), min: 1, max: 1, allocation: null,
    resume: { handler: context.frame.handler, step: 'choice', data: { seat, selected: [] } },
  } };
};

const archiveKeeperExBurst: AbilityHandler = context => {
  const data = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
    ? context.frame.data as Record<string, Json> : {};
  const seat = data.seat === 1 ? 1 : 0;
  const selected = Array.isArray(data.selected) ? data.selected[0] : undefined;
  if (selected !== 'use') return { events: [emit(context.state, 'ex-burst.skipped', { seat, source: data.source ?? '' })], next: [], choice: null };
  return archiveKeeperDrawDiscard({
    ...context,
    frame: { ...context.frame, handler: 'archive-keeper-draw-discard', step: 'resolve', data: { seat } },
  });
};
export const abilityHandlers = { 'archive-keeper-draw-discard': archiveKeeperDrawDiscard, 'archive-keeper-ex-burst': archiveKeeperExBurst };

export const card: CardDefinition = {
  "number": "P-031R",
  "name": "Archive Keeper",
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
      "id": "archive-keeper-enter",
      "kind": "auto",
      "handler": "archive-keeper-draw-discard",
      "text": "EX Burst. When Archive Keeper enters the field, draw 1 card, then discard 1 card.",
      "ex": true,
      "trigger": "enter"
    }
  ],
  "summonHandler": null,
  "ex": true,
  "exHandler": "archive-keeper-ex-burst",
  "text": "EX Burst. When Archive Keeper enters the field, draw 1 card, then discard 1 card."
};
export default card;
