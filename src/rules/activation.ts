import { commitPayment, validatePayment } from './payment';
import type { AbilityDefinition, EngineContext, MatchState, ObjectId, Payment, RuleError, Seat } from './types';
import type { RuleEvent } from './types';

interface CostRule { cost: number; element: 'Fire' | 'Water' | null; dull: boolean; sacrifice: boolean; specialName: string | null }
const costs: Readonly<Record<string, CostRule>> = {
  'forge-apprentice-buff': { cost: 0, element: null, dull: true, sacrifice: false, specialName: null },
  'wave-apprentice-activate': { cost: 0, element: null, dull: true, sacrifice: false, specialName: null },
  'recovery-clerk-bottom': { cost: 1, element: 'Water', dull: true, sacrifice: false, specialName: null },
  'ember-medic-recover': { cost: 1, element: 'Fire', dull: true, sacrifice: true, specialName: null },
  'cinder-marshal-special': { cost: 1, element: 'Fire', dull: true, sacrifice: false, specialName: 'Cinder Marshal' },
  'tide-warden-special': { cost: 1, element: 'Water', dull: true, sacrifice: false, specialName: 'Tide Warden' },
};
export function getActivationCost(handler: string): CostRule | null { return costs[handler] ?? null; }
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
  const definition = context.catalog[source.card];
  const ability: AbilityDefinition | undefined = definition?.abilities.find(item => item.id === abilityId);
  if (!ability || (ability.kind !== 'action' && ability.kind !== 'special')) return rejected('UNKNOWN_ABILITY', 'That ability cannot be activated.');
  const rule = costs[ability.handler];
  if (!rule || !context.handlers[ability.handler]) return rejected('UNSUPPORTED_ABILITY', 'This placeholder ability is not implemented.');
  if (targets.length !== 1) return rejected('WRONG_TARGET_COUNT', 'Choose one target for this ability.');
  const target = find(state, targets[0]!);
  const requiresBreak = ability.handler === 'recovery-clerk-bottom' || ability.handler === 'ember-medic-recover';
  if (!target || (requiresBreak ? target.zone !== 'break' || target.owner !== seat : target.zone !== 'field')) return rejected('ILLEGAL_TARGET', 'Choose a card in the correct zone that is legal for this ability.');
  if (ability.handler !== 'recovery-clerk-bottom' && context.catalog[target.card]?.type !== 'Forward') {
    return rejected('ILLEGAL_TARGET', 'Choose a Forward for this ability.');
  }
  if (ability.handler === 'forge-apprentice-buff' && !context.catalog[target.card]!.elements.includes('Fire')) return rejected('ILLEGAL_TARGET', 'Forge Apprentice requires a Fire Forward.');
  if (rule.specialName) {
    const discarded = payment.specialDiscard === null ? undefined : find(state, payment.specialDiscard);
    if (!discarded || context.catalog[discarded.card]?.name !== rule.specialName) return rejected('INVALID_SPECIAL_DISCARD', `Discard another ${rule.specialName} from your hand.`);
  }
  const checkedPayment: Payment = { ...payment, dullSource: rule.dull, sacrificeSource: rule.sacrifice };
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
