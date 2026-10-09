import type { CardDefinition } from '../../../rules/types';
import type { CardScript } from '../../../rules/contracts/card-script';
import type { ResumeRef, ResolutionContext } from '../../../rules/contracts/execution';
import { z } from 'zod';

export const card: CardDefinition = {
  "number": "P-031R",
  "name": "Archive Keeper",
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
      "id": "archive-keeper-enter",
      "kind": "auto",
      "text": "EX Burst. When Archive Keeper enters the field, draw 1 card, then discard 1 card.",
      "ex": true,
      "trigger": "enter"
    }
  ],
  "ex": true,
  "text": "EX Burst. When Archive Keeper enters the field, draw 1 card, then discard 1 card."
};
const archiveResume = (step: string): ResumeRef => ({ script: 'P-031R', version: '1', ability: 'archive-keeper-enter', step, payload: null });
const archiveDiscardStep = {
  payloadSchema: z.null(),
  run: ({ state, frame, catalog }: ResolutionContext) => {
    const hand = state.zones[frame.controller].hand.map(instance => state.cards[instance]!)
      .filter(item => item.owner === frame.controller)
      .map(item => ({ id: item.object, label: catalog[item.card]?.name ?? item.card, object: item.object }));
    if (hand.length === 0) return { batches: [], choice: null, next: null };
    return { batches: [], choice: { seat: frame.controller, kind: 'cards' as const,
      reason: 'Archive Keeper: discard 1 card.', options: hand, min: 1, max: 1, allocation: null,
      resume: archiveResume('discard-selected') }, next: null };
  },
};
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [{
  id: 'archive-keeper-enter', kind: 'auto', text: card.abilities[0]!.text, ex: true, zones: ['field', 'damage'],
  cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 0, max: 0 },
  fieldEffects: [], replacements: [],
  steps: {
    resolve: { payloadSchema: z.null(), run: (context: ResolutionContext) => context.frame.mode === 'ex'
      ? { batches: [], choice: { seat: context.frame.controller, kind: 'confirm',
        reason: 'Archive Keeper EX Burst: use this effect?',
        options: [{ id: 'use', label: 'Use effect', object: null }, { id: 'skip', label: 'Skip', object: null }],
        min: 1, max: 1, allocation: null, resume: archiveResume('decision') }, next: null }
      : { batches: [{ simultaneous: false, operations: [{ kind: 'draw', seat: context.frame.controller, count: 1 }] }],
        choice: null, next: archiveResume('discard') } },
    decision: { payloadSchema: z.null(), run: (context: ResolutionContext) => context.answer?.selected[0] !== 'use'
      ? { batches: [], choice: null, next: null }
      : { batches: [{ simultaneous: false, operations: [{ kind: 'draw', seat: context.frame.controller, count: 1 }] }],
        choice: null, next: archiveResume('discard') } },
    discard: archiveDiscardStep,
    'discard-selected': { payloadSchema: z.null(), run: (context: ResolutionContext) => {
      const selected = context.answer?.selected[0];
      const item = typeof selected === 'string' ? Object.values(context.state.cards).find(card => card.object === selected) : undefined;
      if (!item || item.zone !== 'hand' || item.owner !== context.frame.controller) return { batches: [], choice: null, next: null };
      return { batches: [{ simultaneous: false, operations: [{ kind: 'discard', seat: context.frame.controller,
        objects: [item.object], reason: 'effect' }] }], choice: null, next: null };
    } },
  },
}] };
export default card;
