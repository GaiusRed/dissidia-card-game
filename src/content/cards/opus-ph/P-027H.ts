import { addPower } from '../../../rules/continuous';
import type { AbilityHandler, CardDefinition, Json } from '../../../rules/types';
import { chooseForward } from '../../shared/card-helpers';
import { emit } from '../../shared/legacy';

const nightRegentLeave: AbilityHandler = chooseForward('Night Regent', (context, target) => {
  const raw = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
    ? context.frame.data as Record<string, Json> : {};
  const amount = typeof raw.lastPower === 'number' ? raw.lastPower : 0;
  addPower(context.state, String(raw.source ?? ''), target.object, -amount, context.state.turn);
  return emit(context.state, 'forward.power-reduced', { object: target.object, amount });
});
export const abilityHandlers = { 'night-regent-leave': nightRegentLeave };

export const card: CardDefinition = {
  "number": "P-027H",
  "name": "Night Regent",
  "set": "opus-ph",
  "provenance": "placeholder",
  "version": "opus-ph-v1",
  "rarity": "H",
  "type": "Forward",
  "elements": [
    "Dark"
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
      "id": "night-regent-leave",
      "kind": "auto",
      "handler": "night-regent-leave",
      "text": "When Night Regent is put from the field into the Break Zone, choose 1 Forward. It loses power equal to Night Regent’s power until the end of the turn.",
      "ex": false,
      "trigger": "self-break"
    }
  ],
  "summonHandler": null,
  "ex": false,
  "text": "No abilities."
};
export default card;
