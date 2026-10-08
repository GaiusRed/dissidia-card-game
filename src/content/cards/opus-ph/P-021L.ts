import type { CardDefinition } from '../../../rules/types';
import type { CardScript } from '../../../rules/contracts/card-script';
import { z } from 'zod';
import { selfEntryTrigger } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-021L",
  "name": "Tide Warden",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "L",
  "type": "Forward",
  "elements": [
    "Water"
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
      "id": "tide-warden-enter",
      "kind": "auto",
      "text": "When Tide Warden enters the field, choose 1 Forward. Activate it.",
      "ex": false,
      "trigger": "enter",
      "target": { "zones": ["field"], "types": ["Forward"], "elements": [], "owner": "any", "controller": "any", "dull": null }
    },
    {
      "id": "undertow",
      "kind": "special",
      "text": "{S}, {Water}, {D}: Choose 1 Forward. Return it to its owner's hand.",
      "ex": false,
      "activation": { "cost": 1, "elements": ["Water"], "dullSource": true, "sacrificeSource": false, "specialDiscardName": "Tide Warden",
        "target": { "zones": ["field"], "types": ["Forward"], "elements": [], "owner": "any", "controller": "any", "dull": null } }
    }
  ],
  "ex": false,
  "text": "When Tide Warden enters the field, choose 1 Forward. Activate it. Undertow — {S}, {Water}, {D}: Choose 1 Forward. Return it to its owner's hand."
};
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [
  {
    id: 'tide-warden-enter', kind: 'auto', text: card.abilities[0]!.text, ex: false, zones: ['field'],
    cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
    modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
    triggers: [selfEntryTrigger], fieldEffects: [], replacements: [],
    steps: { resolve: { payloadSchema: z.null(), run: ({ frame }) => ({ batches: [{ simultaneous: false, operations: [
      { kind: 'status', object: frame.targets[0]!, dull: false, freeze: false },
    ] }], choice: null, next: null }) } },
  },
  {
    id: 'undertow', kind: 'special', text: card.abilities[1]!.text, ex: false, zones: ['field'],
    cost: { cp: 1, elements: ['Water'], dullSource: true, sacrificeSource: false, sameNameDiscard: true },
    modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
    triggers: [], fieldEffects: [], replacements: [],
    steps: { resolve: { payloadSchema: z.null(), run: ({ frame }) => ({ batches: [{ simultaneous: false, operations: [
      { kind: 'move', object: frame.targets[0]!, to: 'hand', index: null },
    ] }], choice: null, next: null }) } },
  },
] };
export default card;
