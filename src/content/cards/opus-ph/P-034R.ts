import type { AbilityHandler, CardDefinition } from '../../../rules/types';
import { chooseForward } from '../../shared/card-helpers';
import { emit } from '../../shared/legacy';

const mistCallerActivate: AbilityHandler = chooseForward('Mist Caller', (context, target) => {
  target.dull = false;
  return emit(context.state, 'card.activated', { object: target.object, seat: target.controller });
});
export const abilityHandlers = { 'mist-caller-activate': mistCallerActivate };

export const card: CardDefinition = {
  "number": "P-034R",
  "name": "Mist Caller",
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
      "id": "mist-caller-end",
      "kind": "auto",
      "handler": "mist-caller-activate",
      "text": "At the beginning of your End Phase, choose 1 Forward. Activate it.",
      "ex": false,
      "trigger": "end-phase"
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "No abilities."
};
export default card;
