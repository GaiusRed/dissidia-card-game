import type { CardDefinition } from '../../../rules/types';
import type { CardScript } from '../../../rules/contracts/card-script';
import { z } from 'zod';
import { selfEntryTrigger } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-025R",
  "name": "Frost Binder",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Forward",
  "elements": [
    "Water"
  ],
  "cost": 3,
  "power": 6000,
  "jobs": [
    "Soldier"
  ],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [
    {
      "id": "frost-binder-enter",
      "kind": "auto",
      "text": "When Frost Binder enters the field, choose 1 Forward. Dull it and Freeze it.",
      "ex": false,
      "trigger": "enter",
      "target": { "zones": ["field"], "types": ["Forward"], "elements": [], "owner": "any", "controller": "any", "dull": null }
    }
  ],
  "ex": false,
  "text": "When Frost Binder enters the field, choose 1 Forward. Dull it and Freeze it."
};
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [{
  id: 'frost-binder-enter', kind: 'auto', text: card.abilities[0]!.text, ex: false, zones: ['field'],
  cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
  triggers: [selfEntryTrigger], fieldEffects: [], replacements: [],
  steps: { resolve: { payloadSchema: z.null(), run: ({ frame }) => ({ batches: [{ simultaneous: false, operations: [
    { kind: 'status', object: frame.targets[0]!, dull: true, freeze: true },
  ] }], choice: null, next: null }) } },
}] };
export default card;
