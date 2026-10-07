import type { AbilityHandler, CardDefinition } from '../../../rules/types';
import { chooseForward } from '../../shared/card-helpers';
import { emit } from '../../shared/legacy';

const frostBinderEnter: AbilityHandler = chooseForward('Frost Binder', (context, target) => {
  target.dull = true;
  target.frozen = true;
  return emit(context.state, 'forward.dulled-and-frozen', { object: target.object });
});
export const abilityHandlers = { 'frost-binder-enter': frostBinderEnter };

export const card: CardDefinition = {
  "number": "P-025R",
  "name": "Frost Binder",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Forward",
  "elements": [
    "Water"
  ],
  "cost": 3,
  "power": 6000,
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
      "id": "frost-binder-enter",
      "kind": "auto",
      "handler": "frost-binder-enter",
      "text": "When Frost Binder enters the field, choose 1 Forward. Dull and Freeze it.",
      "ex": false,
      "trigger": "enter"
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "No abilities."
};
export default card;
