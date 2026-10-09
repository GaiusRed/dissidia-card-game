import type { CardDefinition } from '../../../rules/types';
import type { CardScript } from '../../../rules/contracts/card-script';
import { z } from 'zod';

export const card: CardDefinition = {
  "number": "P-007H",
  "name": "Dusk Reaver",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "H",
  "type": "Forward",
  "elements": [
    "Dark"
  ],
  "cost": 3,
  "power": 7000,
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
      "id": "dusk-reaver-enter",
      "kind": "auto",
      "text": "When Dusk Reaver enters the field, choose 1 Forward. It loses 2000 power until the end of the turn.",
      "ex": false,
      "trigger": "enter",
      "target": { "zones": ["field"], "types": ["Forward"], "elements": [], "owner": "any", "controller": "any", "dull": null }
    }
  ],
  "ex": false,
  "text": "When Dusk Reaver enters the field, choose 1 Forward. It loses 2000 power until the end of the turn."
};
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [{
  id: 'dusk-reaver-enter', kind: 'auto', text: card.abilities[0]!.text, ex: false, zones: ['field'],
  cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 1, max: 1 },
  fieldEffects: [], replacements: [],
  steps: { resolve: { payloadSchema: z.null(), run: ({ frame, state }) => ({ batches: [{ simultaneous: false, operations: [
    { kind: 'power', source: frame.source, object: frame.targets[0]!, mode: 'add', value: -2000, expiresTurn: state.turn },
  ] }], choice: null, next: null }) } },
}] };
export default card;
