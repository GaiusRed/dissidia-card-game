import type { CardDefinition } from '../../../rules/types';
import { singleActivationScript } from '../../shared/script-helpers';

export const card: CardDefinition = {
  "number": "P-032R",
  "name": "Recovery Clerk",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "R",
  "type": "Backup",
  "elements": [
    "Water"
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
      "id": "recovery-clerk-action",
      "kind": "action",
      "text": "{Water}, {D}: Choose 1 card in your Break Zone. Put it on the bottom of your main deck.",
      "ex": false,
      "activation": { "cost": 1, "elements": ["Water"], "dullSource": true, "sacrificeSource": false, "specialDiscardName": null,
        "target": { "zones": ["break"], "types": ["Forward", "Backup", "Summon"], "elements": [], "owner": "you", "controller": "any", "dull": null } }
    }
  ],
  "ex": false,
  "text": "{Water}, {D}: Choose 1 card in your Break Zone. Put it on the bottom of your main deck."
};

export const script = singleActivationScript(card, ({ frame, state }) => {
  const target = Object.values(state.cards).find(item => item.object === frame.targets[0]);
  if (!target) return [];
  return [{ simultaneous: false, operations: [
    { kind: 'move', object: frame.targets[0]!, to: 'deck', index: state.zones[target.owner].deck.length },
  ] }];
});
export default card;
