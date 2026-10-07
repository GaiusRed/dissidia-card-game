import { requestDeparture } from '../../rules/commander';
import { effectivePower } from '../../rules/continuous';
import { replacementDamage } from '../../rules/damage';
import type { AbilityHandler, CardObject, Json, RuleEvent } from '../../rules/types';
import { card, emit, payload } from './legacy';

export function damageForward(context: Parameters<AbilityHandler>[0], object: string, amount: number): RuleEvent[] {
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

export function chooseForward(
  name: string,
  apply: (context: Parameters<AbilityHandler>[0], target: CardObject) => RuleEvent | RuleEvent[],
): AbilityHandler {
  return context => {
    const data = payload(context.frame.data);
    const extra = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
      ? context.frame.data as Record<string, Json> : {};
    if (context.frame.step === 'choice') {
      const selected = Array.isArray(extra.selected) ? extra.selected[0] : undefined;
      const target = typeof selected === 'string' ? card(context.state, selected) : undefined;
      if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward') {
        return { events: [], next: [], choice: null };
      }
      const result = apply(context, target);
      return { events: Array.isArray(result) ? result : [result], next: [], choice: null };
    }
    const seat = extra.seat === 1 ? 1 : 0;
    const forwards = context.state.field.map(instance => context.state.cards[instance]!)
      .filter(target => context.catalog[target.card]?.type === 'Forward');
    if (forwards.length === 0) return { events: [], next: [], choice: null };
    return {
      events: [], next: [], choice: {
        id: `choice-${context.state.nextId++}`, seat, kind: 'targets',
        reason: `${name}: choose a Forward.`,
        options: forwards.map(target => ({ id: target.object, label: context.catalog[target.card]!.name, object: target.object })),
        min: 1, max: 1, allocation: null,
        resume: { handler: context.frame.handler, step: 'choice', data: {
          ...extra, source: data.source ?? '', seat, selected: [],
          ...(typeof extra.lastPower === 'number' ? { lastPower: extra.lastPower } : {}),
        } },
      },
    };
  };
}
