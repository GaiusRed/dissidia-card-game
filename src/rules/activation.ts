import { commitPayment, validatePayment } from './payment';
import type { AbilityDefinition, EngineContext, MatchState, ObjectId, Payment, RuleError, Seat } from './types';
import type { RuleEvent } from './types';
import { isAbilityTargetLegal } from './targets';
const fail = (code: string, message: string): RuleError => ({ code, message });
const rejected = (code: string, message: string): ActivationReceipt => ({ errors: [fail(code, message)], events: [] });
const find = (state: MatchState, object: ObjectId) => Object.values(state.cards).find(card => card.object === object);

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
  if (!rule || !context.handlers[ability.handler]) return rejected('UNSUPPORTED_ABILITY', 'This placeholder ability is not implemented.');
  if (targets.length !== 1) return rejected('WRONG_TARGET_COUNT', 'Choose one target for this ability.');
  if (!isAbilityTargetLegal(state, seat, targets[0]!, rule.target, context)) return rejected('ILLEGAL_TARGET', 'Choose a card in the correct zone that is legal for this ability.');
  if (rule.specialDiscardName) {
    const discarded = payment.specialDiscard === null ? undefined : find(state, payment.specialDiscard);
    if (!discarded || context.catalog[discarded.card]?.name !== rule.specialDiscardName) return rejected('INVALID_SPECIAL_DISCARD', `Discard another ${rule.specialDiscardName} from your hand.`);
  }
  const checkedPayment: Payment = { ...payment, dullSource: rule.dullSource, sacrificeSource: rule.sacrificeSource };
  const errors = validatePayment(state, seat, sourceId, checkedPayment, rule.cost, context);
  if (errors.length) return { errors, events: [] };
  const lastKnown = { ...source };
  const costEvents = commitPayment(state, seat, sourceId, checkedPayment, rule.cost, context);
  state.stack.push({ id: `stack-${state.nextId++}`, controller: seat, source: sourceId, lastKnown,
    handler: ability.handler, targets: [...targets], mode: null, data: { source: sourceId, targets } });
  state.passes = 0;
  state.priority = seat === 0 ? 1 : 0;
  return { errors: [], events: costEvents };
}
