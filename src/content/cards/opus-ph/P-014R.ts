import type { AbilityHandler, CardDefinition } from '../../../rules/types';
import { chooseForward, damageForward } from '../../shared/card-helpers';
import type { CardScript } from '../../../rules/contracts/card-script';
import { z } from 'zod';
import { controlledForwardLeavesTrigger } from '../../shared/script-helpers';

const cinderWitnessDamage: AbilityHandler = chooseForward('Cinder Witness', (context, target) =>
  damageForward(context, target.object, 1000));
export const abilityHandlers = { 'cinder-witness-damage': cinderWitnessDamage };

export const card: CardDefinition = {
  "number": "P-014R",
  "name": "Cinder Witness",
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
      "id": "cinder-witness-leave",
      "kind": "auto",
      "handler": "cinder-witness-damage",
      "text": "When a Forward you control is put from the field into the Break Zone, choose 1 Forward. Deal it 1000 damage.",
      "ex": false,
      "trigger": "controlled-forward-leaves",
      "triggerDestination": ["break"],
      "target": { "zones": ["field"], "types": ["Forward"], "elements": [], "owner": "any", "controller": "any", "dull": null }
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "When a Forward you control is put from the field into the Break Zone, choose 1 Forward. Deal it 1000 damage."
};
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [{
  id: 'cinder-witness-leave', kind: 'auto', text: card.abilities[0]!.text, ex: false, zones: ['field'],
  cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
  triggers: [controlledForwardLeavesTrigger('break')], fieldEffects: [], replacements: [],
  steps: { resolve: { payloadSchema: z.null(), run: ({ frame }) => ({ batches: [{ simultaneous: false, operations: [
    { kind: 'forward-damage', source: frame.source, target: frame.targets[0]!, amount: 1000 },
  ] }], choice: null, next: null }) } },
}] };
export default card;
