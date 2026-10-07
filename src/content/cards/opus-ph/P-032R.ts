import { moveCard } from '../../../rules/zones';
import type { AbilityHandler, CardDefinition } from '../../../rules/types';
import { card as findCard, emit, payload, result } from '../../shared/legacy';

export const card: CardDefinition = {
  "number": "P-032R",
  "name": "Recovery Clerk",
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
      "id": "recovery-clerk-action",
      "kind": "action",
      "handler": "recovery-clerk-bottom",
      "text": "{Water}, {D}: Choose 1 card in your Break Zone. Put it on the bottom of your main deck.",
      "ex": false,
      "activation": { "cost": 1, "elements": ["Water"], "dullSource": true, "sacrificeSource": false, "specialDiscardName": null,
        "target": { "zones": ["break"], "types": ["Forward", "Backup", "Summon"], "elements": [], "owner": "you", "controller": "any", "dull": null } }
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "No abilities."
};

const recoveryClerkBottom: AbilityHandler = context => {
  const target = findCard(context.state, payload(context.frame.data).targets?.[0] ?? '');
  if (!target || target.zone !== 'break') return result([]);
  const old = moveCard(context.state, target.instance, 'deck', context.state.zones[target.owner].deck.length);
  return result([emit(context.state, 'card.returned-to-deck', { card: old.card, seat: old.owner })], context.state.choice);
};

export const abilityHandlers: Readonly<Record<string, AbilityHandler>> = {
  'recovery-clerk-bottom': recoveryClerkBottom,
};
export default card;
