import type { CardDefinition } from '../../../rules/types';
import { vanillaScript } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-005R",
  "name": "Spark Runner",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Forward",
  "elements": [
    "Fire"
  ],
  "cost": 2,
  "power": 4000,
  "jobs": [
    "Soldier"
  ],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [
    "Haste"
  ],
  "abilities": [],
  "ex": false,
  "text": "Haste."
};
export const script = vanillaScript(card);
export default card;
