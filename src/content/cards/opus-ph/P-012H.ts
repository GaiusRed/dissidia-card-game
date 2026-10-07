import type { CardDefinition } from '../../../rules/types';
import type { CardRuntimeEffects } from '../../../rules/types';

export const runtimeEffects: Readonly<Record<string, CardRuntimeEffects>> = {
  'P-012H': {
    modifyPower: (_state, target, source, context) =>
      target.controller === source.controller && context.catalog[target.card]?.type === 'Forward' && context.catalog[target.card]!.elements.includes('Fire') ? 1000 : 0,
  },
};

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
      "handler": "banner-smith-buff",
      "text": "Fire Forwards you control gain 1000 power.",
      "ex": false
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "No abilities."
};
export default card;
