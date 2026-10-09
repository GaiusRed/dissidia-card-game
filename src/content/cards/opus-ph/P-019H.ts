import type { CardDefinition } from '../../../rules/types';
import { z } from 'zod';
import type { CardScript } from '../../../rules/contracts/card-script';
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
  "summonTarget": { "min": 0, "max": 0, "zones": [], "types": [], "controller": "any", "dull": null },
  "ex": false,
  "text": "Deal your opponent 2 points of damage."
};
export const script: CardScript = {
  metadata: card,
  behaviorVersion: '1',
  abilities: [{
    id: 'final-spark', kind: 'summon', text: card.text, ex: false, zones: ['hand'],
    cost: { cp: card.cost, elements: card.elements, dullSource: false, sacrificeSource: false, sameNameDiscard: false },
    modes: [], targets: { min: 0, max: 0 },
    fieldEffects: [], replacements: [],
    steps: { resolve: {
      payloadSchema: z.null(),
      run: ({ frame }) => ({ batches: [{ simultaneous: false, operations: [
        { kind: 'player-damage', source: frame.source, seat: frame.controller === 0 ? 1 : 0, amount: 2 },
      ] }], choice: null, next: null }),
    } },
  }],
};
export default card;
