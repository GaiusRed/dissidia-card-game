import type { CardDefinition } from '../../../rules/types';
import { singleActivationScript } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-030C",
  "name": "Wave Apprentice",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "C",
  "type": "Backup",
  "elements": [
    "Water"
  ],
  "cost": 1,
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
      "id": "wave-apprentice-action",
      "kind": "action",
      "text": "{D}: Choose 1 Forward. Activate it.",
      "ex": false,
      "activation": { "cost": 0, "elements": [], "dullSource": true, "sacrificeSource": false, "specialDiscardName": null,
        "target": { "zones": ["field"], "types": ["Forward"], "elements": [], "owner": "any", "controller": "any", "dull": null } }
    }
  ],
  "ex": false,
  "text": "{D}: Choose 1 Forward. Activate it."
};

export const script = singleActivationScript(card, ({ frame }) => [{ simultaneous: false, operations: [
  { kind: 'status', object: frame.targets[0]!, dull: false, freeze: false },
] }]);
export default card;
