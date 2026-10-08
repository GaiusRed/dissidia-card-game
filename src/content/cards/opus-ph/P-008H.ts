import type { CardDefinition } from '../../../rules/types';
import type { CardScript } from '../../../rules/contracts/card-script';
import { z } from 'zod';

export const card: CardDefinition = {
  "number": "P-008H",
  "name": "Dawn Guardian",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "H",
  "type": "Forward",
  "elements": [
    "Light"
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
      "id": "dawn-guardian-replacement",
      "kind": "replacement",
      "text": "If Dawn Guardian would be dealt damage, reduce that damage by 1000 instead.",
      "ex": false
    }
  ],
  "ex": false,
  "text": "If Dawn Guardian would be dealt damage, reduce that damage by 1000 instead."
};
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [{
  id: 'dawn-guardian-replacement', kind: 'replacement', text: card.abilities[0]!.text, ex: false, zones: ['field'],
  cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 0, max: 0, distinct: true, accepts: () => true },
  triggers: [], fieldEffects: [], replacements: [{
    propose: (_state, operation, source) => {
      if (operation.kind !== 'forward-damage' || operation.target !== source.object) return null;
      return { id: 'dawn-guardian-reduce-damage', controller: source.controller,
        operation: { ...operation, amount: Math.max(0, operation.amount - 1000) }, choice: null };
    },
  }],
  steps: { resolve: { payloadSchema: z.null(), run: () => ({ batches: [], choice: null, next: null }) } },
}] };
export default card;
