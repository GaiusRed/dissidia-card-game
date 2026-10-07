import { addPower } from '../../../rules/continuous';
import type { AbilityHandler, CardDefinition } from '../../../rules/types';
import { chooseForward } from '../../shared/card-helpers';
import { emit } from '../../shared/legacy';

const duskReaverEnter: AbilityHandler = chooseForward('Dusk Reaver', (context, target) => {
  addPower(context.state, context.frame.handler, target.object, -2000, context.state.turn);
  return emit(context.state, 'forward.power-reduced', { object: target.object, amount: 2000 });
});
export const abilityHandlers = { 'dusk-reaver-enter': duskReaverEnter };

export const card: CardDefinition = {
  "number": "P-007H",
  "name": "Dusk Reaver",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "H",
  "type": "Forward",
  "elements": [
    "Dark"
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
      "id": "dusk-reaver-enter",
      "kind": "auto",
      "handler": "dusk-reaver-enter",
      "text": "When Dusk Reaver enters the field, choose 1 Forward. It loses 2000 power until the end of the turn.",
      "ex": false,
      "trigger": "enter"
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "No abilities."
};
export default card;
