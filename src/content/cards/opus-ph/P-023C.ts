import type { CardDefinition } from '../../../rules/types';
import { vanillaScript } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-023C",
  "name": "River Recruit",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "C",
  "type": "Forward",
  "elements": [
    "Water"
  ],
  "cost": 1,
  "power": 3000,
  "jobs": [
    "Soldier"
  ],
  "categories": [
    "Placeholder"
  ],
  "generic": true,
  "keywords": [],
  "abilities": [],
  "ex": false,
  "text": "No abilities."
};
export const script = vanillaScript(card);
export default card;
