import type { Catalog, MatchState, ObjectId } from './types';

/** Apply simple replacement abilities before adding damage to a Forward. */
export function replacementDamage(state: MatchState, target: ObjectId, amount: number, context: { catalog: Catalog }): number {
  const card = Object.values(state.cards).find(item => item.object === target);
  if (!card || amount <= 0) return Math.max(0, amount);
  const definition = context.catalog[card.card];
  if (definition?.abilities.some(ability => ability.kind === 'replacement' && ability.handler === 'dawn-guardian-damage')) {
    return Math.max(0, amount - 1000);
  }
  return amount;
}
