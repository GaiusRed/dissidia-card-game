import { effectivePower } from './continuous';
import { requestDeparture } from './commander';
import type { EngineContext, MatchState, RuleEvent } from './types';

function event(state: MatchState, type: string, data: RuleEvent['data']): RuleEvent {
  return { id: `event-${state.nextId++}`, type, data };
}

/** Resolve field Forward rule processes until the field is stable or a replacement asks for a choice. */
export function runRuleCheckpoint(state: MatchState, context: EngineContext): RuleEvent[] {
  const events: RuleEvent[] = [];
  while (!state.choice) {
    const field = state.field.map(instance => state.cards[instance]!);
    let batch = field.filter(card => context.catalog[card.card]?.type === 'Forward' && effectivePower(state, card.object, context) <= 0);
    let reason = 'zero-power';
    if (batch.length === 0) {
      batch = field.filter(card => context.catalog[card.card]?.type === 'Forward' && effectivePower(state, card.object, context) >= 1000 &&
        card.damage >= effectivePower(state, card.object, context));
      reason = 'lethal-damage';
    }
    if (batch.length === 0) {
      const groups = new Map<string, typeof field>();
      for (const card of field) {
        const definition = context.catalog[card.card]!;
        if (definition.type === 'Summon' || definition.generic) continue;
        const key = `${card.controller}/${definition.name}`;
        groups.set(key, [...(groups.get(key) ?? []), card]);
      }
      batch = [...groups.values()].filter(group => group.length > 1).flat();
      reason = 'duplicate-name';
    }
    if (batch.length === 0) {
      for (const seat of [0, 1] as const) {
        const identities = field.filter(card => card.controller === seat && context.catalog[card.card]?.elements.some(element => element === 'Light' || element === 'Dark'));
        if (identities.length > 1) batch.push(...identities);
      }
      reason = 'light-dark-conflict';
    }
    if (batch.length > 0) {
      for (const card of batch) {
        if (card.zone !== 'field' || state.choice) continue;
        const receipt = requestDeparture(state, card.instance, 'break', context);
        if (receipt) events.push(event(state, 'character.broken', {
          object: receipt.old.object, card: receipt.old.card, destination: 'break', reason,
        }));
      }
      continue;
    }

    let excessSeat: 0 | 1 | null = null;
    let excess = 0;
    for (const seat of [0, 1] as const) {
      const backups = field.filter(card => card.controller === seat && context.catalog[card.card]?.type === 'Backup');
      if (backups.length > 5) { excessSeat = seat; excess = backups.length - 5; break; }
    }
    if (excessSeat !== null) {
      const backups = field.filter(card => card.controller === excessSeat && context.catalog[card.card]?.type === 'Backup');
      state.choice = {
        id: `choice-${state.nextId++}`, seat: excessSeat, kind: 'cards',
        reason: `Rule process: choose ${excess} Backup${excess === 1 ? '' : 's'} to put into the Break Zone.`,
        options: backups.map(card => ({ id: card.object, label: context.catalog[card.card]!.name, object: card.object })),
        min: excess, max: excess, allocation: null,
        resume: { handler: 'rule-checkpoint', step: 'excess-backups', data: { seat: excessSeat } },
      };
      state.priority = null;
      break;
    }
    break;
  }
  return events;
}
