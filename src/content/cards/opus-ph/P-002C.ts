import type { CardDefinition } from '../../../rules/types';
import { vanillaScript } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-002C",
  "name": "Cinder Marshal",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "C",
  "type": "Forward",
  "elements": [
    "Fire"
  ],
  "cost": 2,
  "power": 5000,
  "jobs": [
    "Soldier"
  ],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [],
  "ex": false,
  "text": "No abilities."
};
export const script = vanillaScript(card);
export default card;
