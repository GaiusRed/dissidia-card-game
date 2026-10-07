import { moveCard } from '../../../rules/zones';
import type { AbilityHandler, CardDefinition } from '../../../rules/types';
import { card as findCard, emit, payload, result } from '../../shared/legacy';
import { singleActivationScript } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-013R",
  "name": "Ember Medic",
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
      "id": "ember-medic-special",
      "kind": "action",
      "handler": "ember-medic-recover",
      "text": "{Fire}, {D}, put Ember Medic into the Break Zone: Choose 1 Forward in your Break Zone. Add it to your hand.",
      "ex": false,
      "activation": { "cost": 1, "elements": ["Fire"], "dullSource": true, "sacrificeSource": true, "specialDiscardName": null,
        "target": { "zones": ["break"], "types": ["Forward"], "elements": [], "owner": "you", "controller": "any", "dull": null } }
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "{Fire}, {D}, put Ember Medic into the Break Zone: Choose 1 Forward in your Break Zone. Add it to your hand."
};

const emberMedicRecover: AbilityHandler = context => {
  const target = findCard(context.state, payload(context.frame.data).targets?.[0] ?? '');
  if (!target || target.zone !== 'break') return result([]);
  const old = moveCard(context.state, target.instance, 'hand');
  return result([emit(context.state, 'card.recovered', { card: old.card, seat: old.owner })], context.state.choice);
};

export const abilityHandlers: Readonly<Record<string, AbilityHandler>> = {
  'ember-medic-recover': emberMedicRecover,
};
export const script = singleActivationScript(card, ({ frame }) => [{ simultaneous: false, operations: [
  { kind: 'move', object: frame.targets[0]!, to: 'hand', index: null },
] }]);
export default card;
