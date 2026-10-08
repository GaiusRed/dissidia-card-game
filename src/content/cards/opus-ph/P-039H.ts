import type { CardDefinition } from '../../../rules/types';
import { z } from 'zod';
import type { CardScript } from '../../../rules/contracts/card-script';

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
  "summonTarget": { "min": 1, "max": 1, "zones": ["field"], "types": ["Forward", "Backup"], "controller": "opponent", "dull": null },
  "ex": false,
  "text": "Choose 1 Character your opponent controls on the field. Gain control of it until the end of the turn."
};
export const script: CardScript = {
  metadata: card,
  behaviorVersion: '1',
  abilities: [{
    id: 'borrowed-banner', kind: 'summon', text: card.text, ex: false, zones: ['hand'],
    cost: { cp: card.cost, elements: card.elements, dullSource: false, sacrificeSource: false, sameNameDiscard: false },
    modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
    triggers: [], fieldEffects: [], replacements: [],
    steps: { resolve: {
      payloadSchema: z.null(),
      run: ({ state, frame }) => {
        const target = frame.targets[0];
        if (!target) return { batches: [], choice: null, next: null };
        return { batches: [{ simultaneous: false, operations: [
          { kind: 'control', source: frame.source, object: target, controller: frame.controller, expiresTurn: state.turn },
        ] }], choice: null, next: null };
      },
    } },
  }],
};
export default card;
