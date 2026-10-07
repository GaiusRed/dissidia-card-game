import type { AbilityHandler, CardDefinition } from '../../../rules/types';
import { chooseForward, damageForward } from '../../shared/card-helpers';

const cinderWitnessDamage: AbilityHandler = chooseForward('Cinder Witness', (context, target) =>
  damageForward(context, target.object, 1000));
export const abilityHandlers = { 'cinder-witness-damage': cinderWitnessDamage };

export const card: CardDefinition = {
  "number": "P-014R",
  "name": "Cinder Witness",
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
      "id": "cinder-witness-leave",
      "kind": "auto",
      "handler": "cinder-witness-damage",
      "text": "When a Forward you control is put from the field into the Break Zone, choose 1 Forward. Deal it 1000 damage.",
      "ex": false,
      "trigger": "controlled-forward-leaves",
      "triggerDestination": ["break"]
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "No abilities."
};
export default card;
