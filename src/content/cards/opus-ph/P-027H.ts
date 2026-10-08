import type { CardDefinition } from '../../../rules/types';
import type { CardScript } from '../../../rules/contracts/card-script';
import { z } from 'zod';
import { selfBreakTrigger } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-027H",
  "name": "Night Regent",
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
      "id": "night-regent-leave",
      "kind": "auto",
      "text": "When Night Regent is put from the field into the Break Zone, choose 1 Forward. It loses power equal to Night Regent's power until the end of the turn.",
      "ex": false,
      "trigger": "self-break",
      "target": { "zones": ["field"], "types": ["Forward"], "elements": [], "owner": "any", "controller": "any", "dull": null }
    }
  ],
  "ex": false,
  "text": "When Night Regent is put from the field into the Break Zone, choose 1 Forward. It loses power equal to Night Regent's power until the end of the turn."
};
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [{
  id: 'night-regent-leave', kind: 'auto', text: card.abilities[0]!.text, ex: false, zones: ['field'],
  cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
  triggers: [selfBreakTrigger], fieldEffects: [], replacements: [],
  steps: { resolve: { payloadSchema: z.number().int().nonnegative(), run: ({ frame, state }) => {
    const power = typeof frame.resume.payload === 'number' ? frame.resume.payload : 0;
    return { batches: [{ simultaneous: false, operations: [{ kind: 'power', source: frame.source, object: frame.targets[0]!,
      mode: 'add', value: -power, expiresTurn: state.turn }] }], choice: null, next: null };
  } } },
}] };
export default card;
