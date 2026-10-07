import type { CardDefinition } from '../../../rules/types';
import { breakDullForwardSummon } from '../../shared/summon-effects';
import { z } from 'zod';
import type { CardScript } from '../../../rules/contracts/card-script';

export const abilityHandlers = { 'ashen-verdict': breakDullForwardSummon };

export const card: CardDefinition = {
  "number": "P-018R",
  "name": "Ashen Verdict",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Summon",
  "elements": [
    "Fire"
  ],
  "cost": 3,
  "power": null,
  "jobs": [],
  "categories": [
    "Placeholder"
  ],
  "generic": false,
  "keywords": [],
  "abilities": [],
  "summonHandler": "ashen-verdict",
  "summonTarget": { "min": 1, "max": 1, "zones": ["field"], "types": ["Forward"], "controller": "any", "dull": true },
  "ex": false,
  "text": "Choose 1 dull Forward. Break it."
};
export const script: CardScript = {
  metadata: card,
  behaviorVersion: '1',
  abilities: [{
    id: 'ashen-verdict', kind: 'summon', text: card.text, ex: false, zones: ['hand'],
    cost: { cp: card.cost, elements: card.elements, dullSource: false, sacrificeSource: false, sameNameDiscard: false },
    modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
    triggers: [], fieldEffects: [], replacements: [],
    steps: { resolve: {
      payloadSchema: z.null(),
      run: ({ frame }) => {
        const target = frame.targets[0];
        if (!target) return { batches: [], choice: null, next: null };
        return { batches: [{ simultaneous: true, operations: [
          { kind: 'move', object: target, to: 'break', index: null },
        ] }], choice: null, next: null };
      },
    } },
  }],
};
export default card;
