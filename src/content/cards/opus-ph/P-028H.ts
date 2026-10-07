import type { CardDefinition } from '../../../rules/types';
import { vanillaScript } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-028H",
  "name": "Dawn Arbiter",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "H",
  "type": "Forward",
  "elements": [
    "Light"
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
  "abilities": [],
  "summonHandler": null,
  "ex": false,
  "text": "No abilities."
};
export const script = vanillaScript(card);
export default card;
