import type { EngineContext, MatchState, StackItem } from './types';

export function isTargetLegal(state: MatchState, item: StackItem, targetObject: string, context: EngineContext): boolean {
  if (item.handler === 'stillwater') {
    return state.stack.some(candidate => candidate.source === targetObject && candidate.id !== item.id &&
      state.cards[candidate.lastKnown.instance]?.zone === 'stack' && context.catalog[candidate.lastKnown.card]?.type === 'Summon');
  }
  const target = Object.values(state.cards).find(card => card.object === targetObject);
  if (!target || target.zone !== 'field') return false;
  const definition = context.catalog[target.card];
  if (!definition) return false;
  if (item.handler === 'borrowed-banner') return target.controller !== item.controller &&
    (definition.type === 'Forward' || definition.type === 'Backup');
  if (item.handler === 'controlled-burn') {
    if (item.mode === 'backup') return definition.type === 'Backup' && definition.cost <= 2;
    if (item.mode === 'forward') return definition.type === 'Forward';
    return false;
  }
  if (definition.type !== 'Forward') return false;
  if (item.handler === 'ashen-verdict') return target.dull;
  return ['scorch', 'twin-embers', 'war-cry', 'return-tide', 'guarding-current', 'shape-tide'].includes(item.handler);
}
