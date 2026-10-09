import type { CardDefinition } from '../../../rules/types';
import { z } from 'zod';
import type { CardScript } from '../../../rules/contracts/card-script';
import { RULE_ENGINE_VERSION } from '../../../rules/rule-scripts';

export const card: CardDefinition = {
  "number": "P-040R",
  "name": "Rising Undertow",
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
  "summonTarget": { "min": 0, "max": 0, "zones": [], "types": [], "controller": "any", "dull": null },
  "ex": false,
  "text": "Draw 2 cards. At the beginning of your End Phase, discard 1 card."
};
export const script: CardScript = {
  metadata: card,
  behaviorVersion: '1',
  abilities: [{
    id: 'rising-undertow', kind: 'summon', text: card.text, ex: false, zones: ['hand'],
    cost: { cp: card.cost, elements: card.elements, dullSource: false, sacrificeSource: false, sameNameDiscard: false },
    modes: [], targets: { min: 0, max: 0 },
    fieldEffects: [], replacements: [],
    steps: { resolve: {
      payloadSchema: z.null(),
      run: ({ frame }) => ({ batches: [{ simultaneous: false, operations: [
        { kind: 'draw', seat: frame.controller, count: 2 },
        { kind: 'delay', at: 'controller-end', controller: frame.controller, source: frame.source,
          resume: { script: 'rules', version: RULE_ENGINE_VERSION, ability: 'delayed-discard', step: 'resolve',
            payload: { seat: frame.controller } } },
      ] }], choice: null, next: null }),
    } },
  }],
};
export default card;
