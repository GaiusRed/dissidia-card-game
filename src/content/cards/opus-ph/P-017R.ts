import type { CardDefinition } from '../../../rules/types';
import { z } from 'zod';
import type { CardScript } from '../../../rules/contracts/card-script';

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
  "summonTarget": { "min": 1, "max": 1, "zones": ["field"], "types": ["Forward"], "controller": "any", "dull": null },
  "ex": false,
  "text": "Choose 1 Forward. It gains 3000 power and Brave until the end of the turn."
};
export const script: CardScript = {
  metadata: card,
  behaviorVersion: '1',
  abilities: [{
    id: 'war-cry', kind: 'summon', text: card.text, ex: false, zones: ['hand'],
    cost: { cp: card.cost, elements: card.elements, dullSource: false, sacrificeSource: false, sameNameDiscard: false },
    modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
    triggers: [], fieldEffects: [], replacements: [],
    steps: { resolve: {
      payloadSchema: z.null(),
      run: ({ state, frame }) => {
        const target = frame.targets[0];
        if (!target) return { batches: [], choice: null, next: null };
        return { batches: [{ simultaneous: false, operations: [
          { kind: 'power', source: frame.source, object: target, mode: 'add', value: 3000, expiresTurn: state.turn },
          { kind: 'keyword', source: frame.source, object: target, keyword: 'Brave', expiresTurn: state.turn },
        ] }], choice: null, next: null };
      },
    } },
  }],
};
export default card;
