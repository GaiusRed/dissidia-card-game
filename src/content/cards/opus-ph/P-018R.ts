import type { CardDefinition } from '../../../rules/types';
import { breakDullForwardSummon } from '../../shared/summon-effects';

export const abilityHandlers = { 'ashen-verdict': breakDullForwardSummon };

export const card: CardDefinition = {
  "number": "P-018R",
  "name": "Ashen Verdict",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Summon",
  "elements": [
    "Fire"
  ],
  "cost": 3,
  "power": null,
  "jobs": [],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [],
  "summonHandler": "ashen-verdict",
  "summonTarget": { "min": 1, "max": 1, "zones": ["field"], "types": ["Forward"], "controller": "any", "dull": true },
  "ex": false,
  "text": "Choose 1 dull Forward. Break it."
};
export default card;
