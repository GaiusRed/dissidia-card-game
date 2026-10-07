import { commitPayment, validatePayment } from './payment';
import type { AbilityDefinition, CostSpec, EngineContext, MatchState, ObjectId, Payment, RuleError, Seat } from './types';
import type { RuleEvent } from './types';
import { isAbilityTargetLegal } from './targets';
import { hasKeyword } from './continuous';
const fail = (code: string, message: string): RuleError => ({ code, message });
const rejected = (code: string, message: string): ActivationReceipt => ({ errors: [fail(code, message)], events: [] });
const find = (state: MatchState, object: ObjectId) => Object.values(state.cards).find(card => card.object === object);

export function isReadyForDullCost(state: MatchState, source: ObjectId, context: EngineContext): boolean {
  const card = find(state, source);
  return !!card && (card.controlledSinceTurn < state.turn || hasKeyword(state, source, 'Haste', context));
}

export interface ActivationReceipt { errors: RuleError[]; events: RuleEvent[] }
export function activateAbility(state: MatchState, seat: Seat, sourceId: ObjectId, abilityId: string, targets: ObjectId[], payment: Payment, context: EngineContext): ActivationReceipt {
  const source = find(state, sourceId);
  if (!source || source.zone !== 'field' || source.controller !== seat) return rejected('INVALID_ABILITY_SOURCE', 'Activate an ability on a card you control on the field.');
  if (state.choice || state.priority !== seat || state.phase === 'setup' || state.phase === 'active' || state.phase === 'draw' || state.phase === 'end' || state.result) {
    return rejected('WRONG_TIMING', 'Activate an ability only while you have priority.');
  }
  if (state.combat?.step === 'firstStrike' || state.combat?.step === 'normalDamage') {
    return rejected('WRONG_TIMING', 'Abilities cannot be activated during the First Strike checkpoint.');
  }
  const definition = context.catalog[source.card];
  const ability: AbilityDefinition | undefined = definition?.abilities.find(item => item.id === abilityId);
  if (!ability || (ability.kind !== 'action' && ability.kind !== 'special')) return rejected('UNKNOWN_ABILITY', 'That ability cannot be activated.');
  const rule = ability.activation;
  const typed = context.registry?.manifest.cards.some(item => item.number === source.card) && context.registry
    ? context.registry.card(source.card).abilities.some(item => item.id === abilityId) : false;
  if (!rule || (!typed && !context.handlers?.[ability.handler])) return rejected('UNSUPPORTED_ABILITY', 'This placeholder ability is not implemented.');
  if (rule.dullSource && !isReadyForDullCost(state, sourceId, context)) {
    return rejected('UNREADY_ABILITY_SOURCE', 'A character that just entered or changed control needs Haste to pay a dulling cost.');
  }
  if (targets.length !== 1) return rejected('WRONG_TARGET_COUNT', 'Choose one target for this ability.');
  if (!isAbilityTargetLegal(state, seat, targets[0]!, rule.target, context)) return rejected('ILLEGAL_TARGET', 'Choose a card in the correct zone that is legal for this ability.');
  if (rule.specialDiscardName) {
    const discarded = payment.specialDiscard === null ? undefined : find(state, payment.specialDiscard);
    if (!discarded || context.catalog[discarded.card]?.name !== rule.specialDiscardName) return rejected('INVALID_SPECIAL_DISCARD', `Discard another ${rule.specialDiscardName} from your hand.`);
  }
  const costSpec: CostSpec = { amount: rule.cost, elements: rule.elements, dullSource: rule.dullSource,
    sacrificeSource: rule.sacrificeSource, specialDiscardName: rule.specialDiscardName };
  const errors = validatePayment(state, seat, sourceId, payment, costSpec, context);
  if (errors.length) return { errors, events: [] };
  const lastKnown = { ...source };
  const costEvents = commitPayment(state, seat, sourceId, payment, costSpec, context);
  const registered = context.registry?.manifest.cards.find(item => item.number === source.card);
  const typedScript = registered && context.registry
    ? context.registry.card(source.card).abilities.find(item => item.id === abilityId) : undefined;
  state.stack.push({ id: `stack-${state.nextId++}`, controller: seat, source: sourceId, lastKnown,
    handler: ability.handler, targets: [...targets], mode: null, data: { source: sourceId, targets },
    ...(registered && typedScript ? { resume: { script: source.card, version: registered.behaviorVersion, ability: abilityId, step: 'resolve', payload: null } } : {}) });
  state.passes = 0;
  state.priority = seat;
  return { errors: [], events: costEvents };
}
