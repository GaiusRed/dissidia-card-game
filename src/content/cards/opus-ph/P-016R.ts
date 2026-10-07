import type { CardDefinition } from '../../../rules/types';
import { twoDamageSummon } from '../../shared/summon-effects';

export const abilityHandlers = { 'twin-embers': twoDamageSummon };

export const card: CardDefinition = {
  "number": "P-016R",
  "name": "Twin Embers",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Summon",
  "elements": [
    "Fire"
  ],
  "cost": 2,
  "power": null,
  "jobs": [],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [],
  "summonHandler": "twin-embers",
  "summonTarget": { "min": 2, "max": 2, "zones": ["field"], "types": ["Forward"], "controller": "any", "dull": null },
  "ex": false,
  "text": "Choose 2 Forwards. Deal each of them 3000 damage."
};
export default card;
