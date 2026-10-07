import type { CardDefinition } from '../../../rules/types';
import { vanillaScript } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-026R",
  "name": "Tide Duelist",
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
  "keywords": [
    "First Strike"
  ],
  "abilities": [],
  "summonHandler": null,
  "ex": false,
  "text": "First Strike."
};
export const script = vanillaScript(card);
export default card;
