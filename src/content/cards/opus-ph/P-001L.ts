import type { CardDefinition } from '../../../rules/types';
import { singleActivationScript } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-001L",
  "name": "Cinder Marshal",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "L",
  "type": "Forward",
  "elements": [
    "Fire"
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
  "keywords": [
    "Brave"
  ],
  "abilities": [
    {
      "id": "flare-order",
      "kind": "special",
      "text": "{S}, {Fire}, {D}: Choose 1 Forward. Deal it 7000 damage.",
      "ex": false,
      "activation": { "cost": 1, "elements": ["Fire"], "dullSource": true, "sacrificeSource": false, "specialDiscardName": "Cinder Marshal",
        "target": { "zones": ["field"], "types": ["Forward"], "elements": [], "owner": "any", "controller": "any", "dull": null } }
    }
  ],
  "ex": false,
  "text": "Brave. Flare Order — {S}, {Fire}, {D}: Choose 1 Forward. Deal it 7000 damage."
};
export const script = singleActivationScript(card, ({ frame }) => [{ simultaneous: false, operations: [
  { kind: 'forward-damage', source: frame.source, target: frame.targets[0]!, amount: 7000 },
] }]);
export default card;
