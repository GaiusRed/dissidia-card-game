import type { CardDefinition } from '../../../rules/types';
import { stillwaterSummon } from '../../shared/summon-effects';

export const abilityHandlers = { stillwater: stillwaterSummon };

export const card: CardDefinition = {
  "number": "P-036R",
  "name": "Stillwater",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Summon",
  "elements": [
    "Water"
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
  "summonHandler": "stillwater",
  "summonTarget": { "min": 1, "max": 1, "zones": ["stack"], "types": ["Summon"], "controller": "any", "dull": null },
  "ex": false,
  "text": "Choose 1 Summon on the stack. Cancel its effect and put it into its owner’s Break Zone."
};
export default card;
