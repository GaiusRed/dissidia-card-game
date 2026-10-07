import { requestDeparture } from '../../rules/commander';
import { addKeyword, addPower, changeControl, effectivePower, setPower } from '../../rules/continuous';
import { dealPlayerDamage, replacementDamage } from '../../rules/damage';
import { moveCard } from '../../rules/zones';
import { applyOperation } from '../../rules/operations';
import { RULE_ENGINE_VERSION } from '../../rules/rule-scripts';
import type { AbilityHandler, HandlerContext, Json, RuleEvent } from '../../rules/types';
import { card, emit, result } from './legacy';

type SummonData = { source: string; targets: string[]; mode: string | null; seat: 0 | 1; startIndex: number; thresholds?: number[] };
function summonData(context: HandlerContext): SummonData {
  const raw = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
    ? context.frame.data as Record<string, Json> : {};
  return {
    source: typeof raw.source === 'string' ? raw.source : '',
    targets: Array.isArray(raw.targets) && raw.targets.every(value => typeof value === 'string') ? raw.targets as string[] : [],
    mode: typeof raw.mode === 'string' ? raw.mode : null,
    seat: raw.seat === 1 ? 1 : 0,
    startIndex: typeof raw.startIndex === 'number' ? raw.startIndex : 0,
    ...(Array.isArray(raw.thresholds) && raw.thresholds.every(value => typeof value === 'number')
      ? { thresholds: raw.thresholds as number[] } : {}),
  };
}

export function dealForward(context: HandlerContext, object: string, amount: number): RuleEvent[] {
  const target = card(context.state, object);
  if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward') return [];
  const applied = replacementDamage(context.state, target.object, amount, context);
  target.damage += applied;
  const events = [emit(context.state, 'forward.damaged', { object: target.object, amount: applied, prevented: amount - applied })];
  if (target.damage >= effectivePower(context.state, target.object, context)) {
    const receipt = requestDeparture(context.state, target.instance, 'break', context);
    if (receipt) events.push(emit(context.state, 'forward.broken', { object: receipt.old.object, card: receipt.old.card, destination: 'break' }));
  }
  return events;
}

export const damageSummon = (amount: number): AbilityHandler => context => {
  const { targets } = summonData(context);
  return result(targets[0] ? dealForward(context, targets[0], amount) : [], context.state.choice);
};

export const twoDamageSummon: AbilityHandler = context => {
  const { targets, startIndex, thresholds: savedThresholds } = summonData(context);
  const events: RuleEvent[] = [];
  const thresholds = savedThresholds ?? targets.map(object => effectivePower(context.state, object, context));
  if (!savedThresholds) {
    for (const object of targets) {
      const target = card(context.state, object);
      if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward') continue;
      const applied = replacementDamage(context.state, target.object, 3000, context);
      target.damage += applied;
      events.push(emit(context.state, 'forward.damaged', { object: target.object, amount: applied, prevented: 3000 - applied }));
    }
  }
  for (let index = startIndex; index < targets.length; index += 1) {
    const target = card(context.state, targets[index]!);
    if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward' ||
        target.damage < thresholds[index]!) continue;
    const receipt = requestDeparture(context.state, target.instance, 'break', context);
    if (receipt) events.push(emit(context.state, 'forward.broken', { object: receipt.old.object, card: receipt.old.card, destination: 'break' }));
    if (context.state.choice) {
      const data = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
        ? context.frame.data as Record<string, Json> : {};
      const continuation = { handler: 'summon-resolution', step: 'resume-handler',
        data: { ...data, script: context.frame.handler, phase: 'departures', thresholds, startIndex: index + 1 } };
      const prior = context.state.work.findIndex(item => item.handler === continuation.handler && item.step === continuation.step);
      if (prior >= 0) context.state.work[prior] = continuation;
      else context.state.work.push(continuation);
      break;
    }
  }
  return result(events, context.state.choice);
};

export const returnForwardSummon: AbilityHandler = context => {
  const target = card(context.state, summonData(context).targets[0] ?? '');
  if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward') return result([]);
  const receipt = requestDeparture(context.state, target.instance, 'hand', context);
  return result(receipt ? [emit(context.state, 'forward.returned', { object: receipt.old.object, card: receipt.old.card, owner: receipt.old.owner })] : [], context.state.choice);
};

export const buffSummon = (amount: number, keyword?: 'Brave' | 'First Strike'): AbilityHandler => context => {
  const { source, targets } = summonData(context);
  const target = card(context.state, targets[0] ?? '');
  if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward') return result([]);
  addPower(context.state, source, target.object, amount, context.state.turn);
  if (keyword) addKeyword(context.state, source, target.object, keyword, context.state.turn);
  return result([emit(context.state, 'forward.effect-applied', { object: target.object, amount, keyword: keyword ?? null })]);
};

export const setPowerSummon: AbilityHandler = context => {
  const { source, targets } = summonData(context);
  const target = card(context.state, targets[0] ?? '');
  if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward') return result([]);
  setPower(context.state, source, target.object, 4000, context.state.turn);
  return result([emit(context.state, 'forward.effect-applied', { object: target.object, value: 4000 })]);
};

export const breakDullForwardSummon: AbilityHandler = context => {
  const target = card(context.state, summonData(context).targets[0] ?? '');
  if (!target || target.zone !== 'field' || !target.dull || context.catalog[target.card]?.type !== 'Forward') return result([]);
  const receipt = requestDeparture(context.state, target.instance, 'break', context);
  return result(receipt ? [emit(context.state, 'forward.broken', { object: receipt.old.object, card: receipt.old.card, destination: 'break' })] : [], context.state.choice);
};

export const controlledBurnSummon: AbilityHandler = context => {
  const { targets, mode } = summonData(context);
  const target = card(context.state, targets[0] ?? '');
  if (!target || target.zone !== 'field') return result([]);
  const destination = mode === 'backup' ? 'break' : 'removed';
  const receipt = requestDeparture(context.state, target.instance, destination, context);
  return result(receipt ? [emit(context.state, 'card.removed-by-summon', { object: receipt.old.object, card: receipt.old.card, destination })] : [], context.state.choice);
};

export const finalSparkSummon: AbilityHandler = context => {
  const { seat, source } = summonData(context);
  return result(dealPlayerDamage(context.state, seat === 0 ? 1 : 0, 2, source, context), context.state.choice);
};

export const stillwaterSummon: AbilityHandler = context => {
  const target = summonData(context).targets[0];
  const index = context.state.stack.findIndex(candidate => candidate.source === target);
  if (index < 0) return result([]);
  const [cancelled] = context.state.stack.splice(index, 1);
  if (!cancelled) return result([]);
  const physical = context.state.cards[cancelled.lastKnown.instance];
  if (physical?.zone === 'stack') moveCard(context.state, physical.instance, 'break');
  return result([emit(context.state, 'summon.cancelled', { item: cancelled.id, card: cancelled.lastKnown.card })]);
};

export const borrowedBannerSummon: AbilityHandler = context => {
  const { source, seat, targets } = summonData(context);
  const target = card(context.state, targets[0] ?? '');
  if (!target || target.zone !== 'field') return result([]);
  changeControl(context.state, source, target.object, seat, context.state.turn);
  return result([emit(context.state, 'card.control-changed', { object: target.object, controller: seat })]);
};

export const risingUndertowSummon: AbilityHandler = context => {
  const { seat, source } = summonData(context);
  const events: RuleEvent[] = [];
  for (let index = 0; index < 2; index += 1) {
    const instance = context.state.zones[seat].deck[0];
    if (!instance) {
      context.state.work.push({ handler: 'rule-process', step: 'empty-deck', data: { seat } });
      events.push(emit(context.state, 'player.attempted-empty-draw', { seat, source }));
      break;
    }
    const old = moveCard(context.state, instance, 'hand');
    events.push(emit(context.state, 'card.drawn', { seat, card: old.card, source }));
  }
  const delayed = applyOperation(context.state, {
    kind: 'delay', at: 'controller-end', controller: seat, source,
    resume: { script: 'rules', version: RULE_ENGINE_VERSION, ability: 'delayed-discard', step: 'resolve', payload: { seat } },
  }, context);
  if (delayed.error) return result(events);
  events.push(...delayed.events, emit(context.state, 'undertow.discard-scheduled', { seat }));
  return result(events);
};
