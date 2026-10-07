import type { CardDefinition } from '../../../rules/types';
import { buffSummon } from '../../shared/summon-effects';

export const abilityHandlers = { 'war-cry': buffSummon(3000, 'Brave') };

export const card: CardDefinition = {
  "number": "P-017R",
  "name": "War Cry",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Summon",
  "elements": [
    "Fire"
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
  "summonHandler": "war-cry",
  "summonTarget": { "min": 1, "max": 1, "zones": ["field"], "types": ["Forward"], "controller": "you", "dull": null },
  "ex": false,
  "text": "Choose 1 Forward. It gains 3000 power and Brave until the end of the turn."
};
export default card;
