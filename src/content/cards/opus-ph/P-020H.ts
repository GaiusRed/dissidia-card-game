import type { CardDefinition } from '../../../rules/types';
import { z } from 'zod';
import type { CardScript } from '../../../rules/contracts/card-script';

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
  "summonTarget": { "min": 1, "max": 1, "zones": ["field"], "types": ["Forward", "Backup"], "controller": "any", "dull": null,
    "modes": [
      { "id": "backup", "label": "Break a Backup (cost 2 or less)", "types": ["Backup"], "maxCost": 2 },
      { "id": "forward", "label": "Remove a Forward", "types": ["Forward"] }
    ] },
  "ex": false,
  "text": "Select 1 of the following 2 actions: Choose 1 Backup of cost 2 or less. Break it; or choose 1 Forward. Remove it from the game."
};
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [{
  id: 'controlled-burn', kind: 'summon', text: card.text, ex: false, zones: ['hand'],
  cost: { cp: card.cost, elements: card.elements, dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: card.summonTarget!.modes!.map(mode => ({ id: mode.id, label: mode.label, object: mode.id })),
  targets: { min: 1, max: 1 },
  fieldEffects: [], replacements: [],
  steps: { resolve: { payloadSchema: z.null(), run: ({ frame }) => {
    const target = frame.targets[0];
    if (!target) return { batches: [], choice: null, next: null };
    return { batches: [{ simultaneous: false, operations: [{ kind: 'move', object: target, to: frame.selectedMode === 'backup' ? 'break' : 'removed', index: null }] }], choice: null, next: null };
  } } },
}] };
export default card;
