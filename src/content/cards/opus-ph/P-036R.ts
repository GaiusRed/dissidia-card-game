import type { CardDefinition } from '../../../rules/types';
import { z } from 'zod';
import type { CardScript } from '../../../rules/contracts/card-script';

export const card: CardDefinition = {
  "number": "P-036R",
  "name": "Stillwater",
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
  "summonTarget": { "min": 1, "max": 1, "zones": ["stack"], "types": ["Summon"], "controller": "any", "dull": null },
  "ex": false,
  "text": "Choose 1 Summon on the stack. Cancel its effect and put it into its owner's Break Zone."
};
export const script: CardScript = {
  metadata: card,
  behaviorVersion: '1',
  abilities: [{
    id: 'stillwater', kind: 'summon', text: card.text, ex: false, zones: ['hand'],
    cost: { cp: card.cost, elements: card.elements, dullSource: false, sacrificeSource: false, sameNameDiscard: false },
    modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
    triggers: [], fieldEffects: [], replacements: [],
    steps: { resolve: {
      payloadSchema: z.null(),
      run: ({ state, frame }) => {
        const target = frame.targets[0];
        const item = target ? state.stack.find(candidate => candidate.source === target) : undefined;
        return { batches: item ? [{ simultaneous: false, operations: [{ kind: 'cancel-stack', item: item.id }] }] : [],
          choice: null, next: null };
      },
    } },
  }],
};
export default card;
