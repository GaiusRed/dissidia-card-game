import type { AbilityHandler, CardDefinition } from '../../../rules/types';
import { damageForward } from '../../shared/card-helpers';
import { payload } from '../../shared/legacy';
import { singleActivationScript } from '../../shared/script-helpers';

const cinderMarshalSpecial: AbilityHandler = context => ({
  events: damageForward(context, payload(context.frame.data).targets?.[0] ?? '', 7000),
  next: [], choice: context.state.choice,
});
export const abilityHandlers = { 'cinder-marshal-special': cinderMarshalSpecial };

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
      "handler": "cinder-marshal-special",
      "text": "{S}, {Fire}, {D}: Choose 1 Forward. Deal it 7000 damage.",
      "ex": false,
      "activation": { "cost": 1, "elements": ["Fire"], "dullSource": true, "sacrificeSource": false, "specialDiscardName": "Cinder Marshal",
        "target": { "zones": ["field"], "types": ["Forward"], "elements": [], "owner": "any", "controller": "any", "dull": null } }
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "Brave. Flare Order — {S}, {Fire}, {D}: Choose 1 Forward. Deal it 7000 damage."
};
export const script = singleActivationScript(card, ({ frame }) => [{ simultaneous: false, operations: [
  { kind: 'forward-damage', source: frame.source, target: frame.targets[0]!, amount: 7000 },
] }]);
export default card;
