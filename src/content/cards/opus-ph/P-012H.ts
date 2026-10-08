import type { CardDefinition, CardObject, MatchState } from '../../../rules/types';
import type { CardScript } from '../../../rules/contracts/card-script';
import type { DeepReadonly } from '../../../rules/contracts/execution';
import { z } from 'zod';

export const card: CardDefinition = {
  "number": "P-012H",
  "name": "Banner Smith",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "H",
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
      "id": "banner-smith-field",
      "kind": "field",
      "text": "Fire Forwards you control gain 1000 power.",
      "ex": false
    }
  ],
  "ex": false,
  "text": "Fire Forwards you control gain 1000 power."
};
export const script: CardScript = { metadata: card, behaviorVersion: '1', abilities: [{
  id: 'banner-smith-field', kind: 'field', text: card.abilities[0]!.text, ex: false, zones: ['field'],
  cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
  modes: [], targets: { min: 0, max: 0, distinct: true, accepts: () => true },
  triggers: [], fieldEffects: [{ effects: (state: DeepReadonly<MatchState>, source: DeepReadonly<CardObject>, catalog) =>
    state.field.map(instance => state.cards[instance]!).filter(target => target.controller === source.controller &&
      catalog[target.card]?.type === 'Forward' && catalog[target.card]!.elements.includes('Fire'))
      .map(target => ({ kind: 'power' as const, source: source.object, object: target.object,
        mode: 'add' as const, value: 1000, expiresTurn: null })) }],
  replacements: [], steps: { resolve: { payloadSchema: z.null(), run: () => ({ batches: [], choice: null, next: null }) } },
}] };
export default card;
