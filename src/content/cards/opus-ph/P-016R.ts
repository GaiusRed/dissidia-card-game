import type { CardDefinition } from '../../../rules/types';
import { z } from 'zod';
import type { CardScript } from '../../../rules/contracts/card-script';

export const card: CardDefinition = {
  "number": "P-016R",
  "name": "Twin Embers",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Summon",
  "elements": [
    "Fire"
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
  "summonTarget": { "min": 2, "max": 2, "zones": ["field"], "types": ["Forward"], "controller": "any", "dull": null },
  "ex": false,
  "text": "Choose 2 Forwards. Deal each of them 3000 damage."
};
export const script: CardScript = {
  metadata: card,
  behaviorVersion: '1',
  abilities: [{
    id: 'twin-embers', kind: 'summon', text: card.text, ex: false, zones: ['hand'],
    cost: { cp: card.cost, elements: card.elements, dullSource: false, sacrificeSource: false, sameNameDiscard: false },
    modes: [], targets: { min: 2, max: 2 },
    fieldEffects: [], replacements: [],
    steps: { resolve: {
      payloadSchema: z.null(),
      run: ({ frame }) => ({ batches: [{ simultaneous: true, operations: frame.targets.map(target => ({
        kind: 'forward-damage' as const, source: frame.source, target, amount: 3000,
      })) }], choice: null, next: null }),
    } },
  }],
};
export default card;
