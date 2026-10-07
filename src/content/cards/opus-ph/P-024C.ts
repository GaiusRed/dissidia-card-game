import type { CardDefinition } from '../../../rules/types';
import { vanillaScript } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-024C",
  "name": "River Recruit",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "C",
  "type": "Forward",
  "elements": [
    "Water"
  ],
  "cost": 2,
  "power": 5000,
  "jobs": [
    "Soldier"
  ],
  "categories": [
    "Placeholder"
  ],
  "generic": true,
  "keywords": [],
  "abilities": [],
  "summonHandler": null,
  "ex": false,
  "text": "No abilities."
};
export const script = vanillaScript(card);
export default card;
