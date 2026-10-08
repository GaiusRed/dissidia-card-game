import type { CardDefinition } from '../../../rules/types';
import { z } from 'zod';
import type { CardScript } from '../../../rules/contracts/card-script';
import type { ResolutionContext } from '../../../rules/contracts/execution';
import { optionalForwardExAbility } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-035C",
  "name": "Return Tide",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "C",
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
  "summonTarget": { "min": 1, "max": 1, "zones": ["field"], "types": ["Forward"], "controller": "any", "dull": null },
  "ex": true,
  "text": "EX Burst. Choose 1 Forward. Return it to its owner's hand."
};
const returnAbility = (id: string, ex: boolean) => ({
  id, kind: ex ? 'auto' as const : 'summon' as const, text: card.text, ex, zones: ex ? ['damage' as const] : ['hand' as const],
  cost: { cp: ex ? 0 : card.cost, elements: ex ? [] : card.elements, dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
  triggers: [], fieldEffects: [], replacements: [],
  steps: { resolve: { payloadSchema: z.null(), run: ({ frame }: ResolutionContext) => ({
    batches: [{ simultaneous: false, operations: [{ kind: 'move' as const, object: frame.targets[0]!, to: 'hand' as const, index: null }] }], choice: null, next: null,
  }) } },
});
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [
  returnAbility('return-tide', false),
  optionalForwardExAbility(card, 'return-tide-ex-burst', (_source, target) => ({ kind: 'move', object: target, to: 'hand', index: null })),
] };
export default card;
