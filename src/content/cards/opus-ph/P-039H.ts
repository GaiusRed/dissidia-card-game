import type { CardDefinition } from '../../../rules/types';
import { borrowedBannerSummon } from '../../shared/summon-effects';

export const abilityHandlers = { 'borrowed-banner': borrowedBannerSummon };

export const card: CardDefinition = {
  "number": "P-039H",
  "name": "Borrowed Banner",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "H",
  "type": "Summon",
  "elements": [
    "Water"
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
  "summonHandler": "borrowed-banner",
  "summonTarget": { "min": 1, "max": 1, "zones": ["field"], "types": ["Forward", "Backup"], "controller": "opponent", "dull": null },
  "ex": false,
  "text": "Choose 1 Character your opponent controls. Gain control of it until the end of the turn."
};
export default card;
