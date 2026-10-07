import type { CardDefinition } from '../../../rules/types';
import { finalSparkSummon } from '../../shared/summon-effects';

export const abilityHandlers = { 'final-spark': finalSparkSummon };

export const card: CardDefinition = {
  "number": "P-019H",
  "name": "Final Spark",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "H",
  "type": "Summon",
  "elements": [
    "Fire"
  ],
  "cost": 4,
  "power": null,
  "jobs": [],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [],
  "summonHandler": "final-spark",
  "summonTarget": { "min": 0, "max": 0, "zones": [], "types": [], "controller": "any", "dull": null },
  "ex": false,
  "text": "Deal your opponent 2 points of damage."
};
export default card;
