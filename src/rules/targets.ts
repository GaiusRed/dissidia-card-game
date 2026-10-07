import type { AbilityDefinition, CardObject, EngineContext, MatchState, Seat, StackItem, SummonTargetRule } from './types';

type AbilityTarget = NonNullable<AbilityDefinition['activation']>['target'];

export function legalAbilityTargets(state: MatchState, seat: Seat, targetRule: AbilityTarget, context: EngineContext): CardObject[] {
  return Object.values(state.cards).filter(target => {
    const definition = context.catalog[target.card];
    if (!definition || !targetRule.zones.includes(target.zone) || !targetRule.types.includes(definition.type)) return false;
    if (targetRule.owner === 'you' && target.owner !== seat) return false;
    if (targetRule.controller === 'you' && target.controller !== seat) return false;
    if (targetRule.controller === 'opponent' && target.controller === seat) return false;
    if (targetRule.dull !== null && target.dull !== targetRule.dull) return false;
    return targetRule.elements.length === 0 || targetRule.elements.some(element => definition.elements.includes(element));
  });
}

export function isAbilityTargetLegal(state: MatchState, seat: Seat, targetId: string, targetRule: AbilityTarget, context: EngineContext): boolean {
  return legalAbilityTargets(state, seat, targetRule, context).some(target => target.object === targetId);
}

export function legalSummonTargets(state: MatchState, seat: Seat, rule: SummonTargetRule | undefined, mode: string | null, context: EngineContext): CardObject[] {
  if (!rule) return [];
  const modeRule = mode === null ? undefined : rule.modes?.find(item => item.id === mode);
  if (mode !== null && !modeRule) return [];
  const types = modeRule?.types ?? rule.types;
  const maxCost = modeRule?.maxCost ?? rule.maxCost;
  return Object.values(state.cards).filter(target => {
    const definition = context.catalog[target.card];
    if (!definition || !rule.zones.includes(target.zone) || !types.includes(definition.type)) return false;
    if (rule.controller === 'you' && target.controller !== seat || rule.controller === 'opponent' && target.controller === seat) return false;
    if (rule.dull !== null && target.dull !== rule.dull) return false;
    return maxCost === undefined || definition.cost <= maxCost;
  });
}

export function isTargetLegal(state: MatchState, item: StackItem, targetObject: string, context: EngineContext): boolean {
  const source = Object.values(state.cards).find(card => card.object === item.source);
  const summon = source ? context.catalog[source.card] : undefined;
  return legalSummonTargets(state, item.controller, summon?.summonTarget, item.mode, context).some(target => target.object === targetObject);
}
