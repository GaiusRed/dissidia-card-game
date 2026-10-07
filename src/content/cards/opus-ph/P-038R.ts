import type { CardDefinition } from '../../../rules/types';
import { setPowerSummon } from '../../shared/summon-effects';

export const abilityHandlers = { 'shape-tide': setPowerSummon };

export const card: CardDefinition = {
  "number": "P-038R",
  "name": "Shape Tide",
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
  "summonHandler": "shape-tide",
  "summonTarget": { "min": 1, "max": 1, "zones": ["field"], "types": ["Forward"], "controller": "you", "dull": null },
  "ex": false,
  "text": "Choose 1 Forward. Its power becomes 4000 until the end of the turn."
};
export default card;
