import { addPower } from '../../../rules/continuous';
import type { AbilityHandler, CardDefinition } from '../../../rules/types';
import { card as findCard, emit, payload, result } from '../../shared/legacy';
import { singleActivationScript } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-010C",
  "name": "Forge Apprentice",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "C",
  "type": "Backup",
  "elements": [
    "Fire"
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
      "id": "forge-apprentice-action",
      "kind": "action",
      "handler": "forge-apprentice-buff",
      "text": "{D}: Choose 1 Fire Forward. It gains 1000 power until the end of the turn.",
      "ex": false,
      "activation": { "cost": 0, "elements": [], "dullSource": true, "sacrificeSource": false, "specialDiscardName": null,
        "target": { "zones": ["field"], "types": ["Forward"], "elements": ["Fire"], "owner": "any", "controller": "any", "dull": null } }
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "{D}: Choose 1 Fire Forward. It gains 1000 power until the end of the turn."
};

const forgeApprenticeBuff: AbilityHandler = context => {
  const data = payload(context.frame.data);
  const target = findCard(context.state, data.targets?.[0] ?? '');
  if (!target || target.zone !== 'field') return result([]);
  addPower(context.state, data.source ?? '', target.object, 1000, context.state.turn);
  return result([emit(context.state, 'forward.power-increased', { object: target.object, amount: 1000 })], context.state.choice);
};

export const abilityHandlers: Readonly<Record<string, AbilityHandler>> = {
  'forge-apprentice-buff': forgeApprenticeBuff,
};
export const script = singleActivationScript(card, ({ frame, state }) => [{ simultaneous: false, operations: [
  { kind: 'power', source: frame.source, object: frame.targets[0]!, mode: 'add', value: 1000, expiresTurn: state.turn },
] }]);
export default card;
