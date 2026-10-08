import type { CardDefinition } from '../../../rules/types';
import { z } from 'zod';
import type { CardScript } from '../../../rules/contracts/card-script';
import type { ResolutionContext, StepResult } from '../../../rules/contracts/execution';
import { optionalForwardExAbility } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-015C",
  "name": "Scorch",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "C",
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
  "ex": true,
  "text": "EX Burst. Choose 1 Forward. Deal it 4000 damage."
};
const summonAbility = (id: string, ex: boolean, kind: 'summon' | 'auto', run: (context: ResolutionContext) => StepResult['batches']) => ({
  id, kind, text: card.text, ex, zones: ex ? ['damage' as const] : ['hand' as const],
  cost: { cp: ex ? 0 : card.cost, elements: ex ? [] : card.elements, dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
  triggers: [], fieldEffects: [], replacements: [],
  steps: { resolve: { payloadSchema: z.null(), run: (context: ResolutionContext) => ({ batches: run(context), choice: null, next: null }) } },
});
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [
  summonAbility('scorch', false, 'summon', ({ frame }) => [{ simultaneous: false, operations: [{ kind: 'forward-damage', source: frame.source, target: frame.targets[0]!, amount: 4000 }] }]),
  optionalForwardExAbility(card, 'scorch-ex-burst', (source, target) => ({ kind: 'forward-damage', source, target, amount: 4000 })),
] };
export default card;
