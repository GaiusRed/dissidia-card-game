import type { CardDefinition } from '../../../rules/types';
import type { CardScript } from '../../../rules/contracts/card-script';
import type { ResolutionContext, ResumeRef } from '../../../rules/contracts/execution';
import { z } from 'zod';
import { selfEntryTrigger } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-011R",
  "name": "Quartermaster",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Backup",
  "elements": [
    "Fire"
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
      "id": "quartermaster-enter",
      "kind": "auto",
      "text": "When Quartermaster enters the field, you may search for 1 Job Soldier and add it to your hand.",
      "ex": false,
      "trigger": "enter"
    }
  ],
  "ex": false,
  "text": "When Quartermaster enters the field, you may search for 1 Job Soldier and add it to your hand."
};
const quartermasterResume: ResumeRef = { script: 'P-011R', version: '1', ability: 'quartermaster-enter', step: 'apply', payload: null };
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [{
  id: 'quartermaster-enter', kind: 'auto', text: card.abilities[0]!.text, ex: false, zones: ['field'],
  cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 0, max: 0, distinct: true, accepts: () => true },
  triggers: [selfEntryTrigger], fieldEffects: [], replacements: [],
  steps: {
    resolve: { payloadSchema: z.null(), run: ({ state, frame, catalog }: ResolutionContext) => {
      const options = state.zones[frame.controller].deck.map(instance => state.cards[instance]!)
        .filter(target => catalog[target.card]?.jobs.includes('Soldier'))
        .map(target => ({ id: target.object, label: catalog[target.card]!.name, object: target.object }));
      return { batches: [], choice: { seat: frame.controller, kind: 'cards',
        reason: 'Quartermaster: search your deck for a Soldier?',
        options: [...options, { id: 'skip', label: 'Do not search', object: null }],
        min: 1, max: 1, allocation: null, resume: quartermasterResume }, next: null };
    } },
    apply: { payloadSchema: z.null(), run: (context: ResolutionContext) => {
      const selected = context.answer?.selected[0];
      if (!selected || selected === 'skip') return { batches: [], choice: null, next: null };
      const target = Object.values(context.state.cards).find(card => card.object === selected);
      if (!target || target.owner !== context.frame.controller || target.zone !== 'deck' ||
          !context.catalog[target.card]?.jobs.includes('Soldier')) return { batches: [], choice: null, next: null };
      return { batches: [{ simultaneous: false, operations: [
        { kind: 'move', object: target.object, to: 'hand', index: null },
        { kind: 'shuffle', seat: context.frame.controller },
      ] }], choice: null, next: null };
    } },
  },
}] };
export default card;
