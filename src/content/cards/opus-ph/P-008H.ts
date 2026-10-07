import type { CardDefinition } from '../../../rules/types';
import type { CardRuntimeEffects } from '../../../rules/types';

export const runtimeEffects: Readonly<Record<string, CardRuntimeEffects>> = {
  'P-008H': { replaceDamage: (_state, _target, amount) => Math.max(0, amount - 1000) },
};

export const card: CardDefinition = {
  "number": "P-008H",
  "name": "Dawn Guardian",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "H",
  "type": "Forward",
  "elements": [
    "Light"
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
      "id": "dawn-guardian-replacement",
      "kind": "replacement",
      "handler": "dawn-guardian-damage",
      "text": "If Dawn Guardian would be dealt damage, reduce that damage by 1000 instead.",
      "ex": false
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "No abilities."
};
export default card;
