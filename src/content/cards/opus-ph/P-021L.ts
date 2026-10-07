import { requestDeparture } from '../../../rules/commander';
import type { AbilityHandler, CardDefinition } from '../../../rules/types';
import { chooseForward } from '../../shared/card-helpers';
import { emit, payload } from '../../shared/legacy';

const tideWardenSpecial: AbilityHandler = context => {
  const target = Object.values(context.state.cards).find(card => card.object === (payload(context.frame.data).targets?.[0] ?? ''));
  if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward') return { events: [], next: [], choice: context.state.choice };
  const receipt = requestDeparture(context.state, target.instance, 'hand', context);
  return { events: receipt ? [emit(context.state, 'forward.returned', { card: receipt.old.card, owner: receipt.old.owner })] : [], next: [], choice: context.state.choice };
};
const tideWardenActivate: AbilityHandler = chooseForward('Tide Warden', (context, target) => {
  target.dull = false;
  return emit(context.state, 'card.activated', { object: target.object, seat: target.controller });
});
export const abilityHandlers = { 'tide-warden-special': tideWardenSpecial, 'tide-warden-activate': tideWardenActivate };

export const card: CardDefinition = {
  "number": "P-021L",
  "name": "Tide Warden",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "L",
  "type": "Forward",
  "elements": [
    "Water"
  ],
  "cost": 3,
  "power": 7000,
  "jobs": [
    "Soldier"
  ],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [
    {
      "id": "tide-warden-enter",
      "kind": "auto",
      "handler": "tide-warden-activate",
      "text": "When Tide Warden enters the field, choose 1 Forward. Activate it.",
      "ex": false,
      "trigger": "enter"
    },
    {
      "id": "undertow",
      "kind": "special",
      "handler": "tide-warden-special",
      "text": "{S}, {Water}, {D}: Choose 1 Forward. Return it to its owner’s hand.",
      "ex": false,
      "activation": { "cost": 1, "elements": ["Water"], "dullSource": true, "sacrificeSource": false, "specialDiscardName": "Tide Warden",
        "target": { "zones": ["field"], "types": ["Forward"], "elements": [], "owner": "any", "controller": "any", "dull": null } }
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "No abilities."
};
export default card;
