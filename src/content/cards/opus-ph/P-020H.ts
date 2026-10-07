import type { CardDefinition } from '../../../rules/types';
import { controlledBurnSummon } from '../../shared/summon-effects';

export const abilityHandlers = { 'controlled-burn': controlledBurnSummon };

export const card: CardDefinition = {
  "number": "P-020H",
  "name": "Controlled Burn",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "H",
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
  "summonHandler": "controlled-burn",
  "summonTarget": { "min": 1, "max": 1, "zones": ["field"], "types": ["Forward", "Backup"], "controller": "any", "dull": null,
    "modes": [
      { "id": "backup", "label": "Break a Backup (cost 2 or less)", "types": ["Backup"], "maxCost": 2 },
      { "id": "forward", "label": "Remove a Forward", "types": ["Forward"] }
    ] },
  "ex": false,
  "text": "Choose a Backup of cost 2 or less to break, or choose a Forward to remove from the game."
};
export default card;
