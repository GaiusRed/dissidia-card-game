import type { CardDefinition } from '../../../rules/types';
import type { CardScript } from '../../../rules/contracts/card-script';
import { z } from 'zod';

export const card: CardDefinition = {
  "number": "P-034R",
  "name": "Mist Caller",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Backup",
  "elements": [
    "Water"
  ],
  "cost": 2,
  "power": null,
  "jobs": [
    "Support"
  ],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [
    {
      "id": "mist-caller-end",
      "kind": "auto",
      "text": "At the beginning of your End Phase, choose 1 Forward. Activate it.",
      "ex": false,
      "trigger": "end-phase",
      "target": { "zones": ["field"], "types": ["Forward"], "elements": [], "owner": "any", "controller": "any", "dull": null }
    }
  ],
  "ex": false,
  "text": "At the beginning of your End Phase, choose 1 Forward. Activate it."
};
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [{
  id: 'mist-caller-end', kind: 'auto', text: card.abilities[0]!.text, ex: false, zones: ['field'],
  cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 1, max: 1 },
  fieldEffects: [], replacements: [],
  steps: { resolve: { payloadSchema: z.null(), run: ({ frame }) => ({ batches: [{ simultaneous: false, operations: [
    { kind: 'status', object: frame.targets[0]!, dull: false, freeze: false },
  ] }], choice: null, next: null }) } },
}] };
export default card;
