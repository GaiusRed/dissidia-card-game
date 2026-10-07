import type { AbilityHandler, CardDefinition } from '../../../rules/types';
import { card as findCard, emit, payload, result } from '../../shared/legacy';
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
      "handler": "wave-apprentice-activate",
      "text": "{D}: Choose 1 Forward. Activate it.",
      "ex": false,
      "activation": { "cost": 0, "elements": [], "dullSource": true, "sacrificeSource": false, "specialDiscardName": null,
        "target": { "zones": ["field"], "types": ["Forward"], "elements": [], "owner": "any", "controller": "any", "dull": null } }
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "{D}: Choose 1 Forward. Activate it."
};

const waveApprenticeActivate: AbilityHandler = context => {
  const target = findCard(context.state, payload(context.frame.data).targets?.[0] ?? '');
  if (!target || target.zone !== 'field') return result([]);
  target.dull = false;
  return result([emit(context.state, 'card.activated', { object: target.object, seat: target.controller })], context.state.choice);
};

export const abilityHandlers: Readonly<Record<string, AbilityHandler>> = {
  'wave-apprentice-activate': waveApprenticeActivate,
};
export const script = singleActivationScript(card, ({ frame }) => [{ simultaneous: false, operations: [
  { kind: 'status', object: frame.targets[0]!, dull: false, freeze: false },
] }]);
export default card;
