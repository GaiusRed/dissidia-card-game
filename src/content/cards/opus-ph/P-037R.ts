import type { CardDefinition } from '../../../rules/types';
import { buffSummon } from '../../shared/summon-effects';

export const abilityHandlers = { 'guarding-current': buffSummon(2000, 'First Strike') };

export const card: CardDefinition = {
  "number": "P-037R",
  "name": "Guarding Current",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Summon",
  "elements": [
    "Water"
  ],
  "cost": 1,
  "power": null,
  "jobs": [],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [],
  "summonHandler": "guarding-current",
  "summonTarget": { "min": 1, "max": 1, "zones": ["field"], "types": ["Forward"], "controller": "you", "dull": null },
  "ex": false,
  "text": "Choose 1 Forward. It gains 2000 power and First Strike until the end of the turn."
};
export default card;
