import type { CardDefinition } from '../../../rules/types';
import type { CardScript } from '../../../rules/contracts/card-script';
import type { ResolutionContext, ResumeRef } from '../../../rules/contracts/execution';
import { z } from 'zod';
import { controlledForwardLeavesTrigger } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-033R",
  "name": "Tide Witness",
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
      "id": "tide-witness-leave",
      "kind": "auto",
      "text": "When a Forward you control leaves the field, you may draw 1 card.",
      "ex": false,
      "trigger": "controlled-forward-leaves"
    }
  ],
  "ex": false,
  "text": "When a Forward you control leaves the field, you may draw 1 card."
};
const tideWitnessResume: ResumeRef = { script: 'P-033R', version: '1', ability: 'tide-witness-leave', step: 'decision', payload: null };
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [{
  id: 'tide-witness-leave', kind: 'auto', text: card.abilities[0]!.text, ex: false, zones: ['field'],
  cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 0, max: 0, distinct: true, accepts: () => true },
  triggers: [controlledForwardLeavesTrigger()], fieldEffects: [], replacements: [],
  steps: {
    resolve: { payloadSchema: z.null(), run: ({ frame }) => ({ batches: [], choice: { seat: frame.controller,
      kind: 'confirm', reason: 'Tide Witness: you may draw 1 card.',
      options: [{ id: 'draw', label: 'Draw 1 card', object: null }, { id: 'skip', label: 'Do not draw', object: null }],
      min: 1, max: 1, allocation: null, resume: tideWitnessResume }, next: null }) },
    decision: { payloadSchema: z.null(), run: (context: ResolutionContext) => context.answer?.selected[0] !== 'draw'
      ? { batches: [], choice: null, next: null }
      : { batches: [{ simultaneous: false, operations: [{ kind: 'draw', seat: context.frame.controller, count: 1 }] }],
        choice: null, next: null } },
  },
}] };
export default card;
