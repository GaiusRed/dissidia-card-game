import { effectivePower } from './continuous';
import { prepareBatch } from './batches';
import { openRuleChoice } from './rule-choice';
import { RULE_ENGINE_VERSION } from './rule-scripts';
import type { EngineContext, MatchState, RuleEvent } from './types';

/** Freeze field departures into a batch before any movement or replacement choice occurs. */
export function runRuleCheckpoint(state: MatchState, context: EngineContext): RuleEvent[] {
  const events: RuleEvent[] = [];
  if (state.execution.batch) return events;
  while (!state.choice) {
    const field = state.field.map(instance => state.cards[instance]!);
    let batch = field.filter(card => context.catalog[card.card]?.type === 'Forward' && effectivePower(state, card.object, context) <= 0);
    if (batch.length === 0) {
      batch = field.filter(card => context.catalog[card.card]?.type === 'Forward' && effectivePower(state, card.object, context) >= 1000 &&
        card.damage >= effectivePower(state, card.object, context));
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
    }
    if (batch.length === 0) {
      for (const seat of [0, 1] as const) {
        const identities = field.filter(card => card.controller === seat && context.catalog[card.card]?.elements.some(element => element === 'Light' || element === 'Dark'));
        if (identities.length > 1) batch.push(...identities);
      }
    }
    if (batch.length > 0) {
      const operations = batch.filter(card => card.zone === 'field').map(card => ({
        kind: 'move' as const, object: card.object, to: 'break' as const, index: null,
      }));
      if (operations.length > 0) state.execution.batch = prepareBatch(state, { simultaneous: true, operations }, context);
      return events;
    }

    let excessSeat: 0 | 1 | null = null;
    let excess = 0;
    for (const seat of [0, 1] as const) {
      const backups = field.filter(card => card.controller === seat && context.catalog[card.card]?.type === 'Backup');
      if (backups.length > 5) { excessSeat = seat; excess = backups.length - 5; break; }
    }
    if (excessSeat !== null) {
      const backups = field.filter(card => card.controller === excessSeat && context.catalog[card.card]?.type === 'Backup');
      openRuleChoice(state, { seat: excessSeat, kind: 'cards',
        reason: `Rule process: choose ${excess} Backup${excess === 1 ? '' : 's'} to put into the Break Zone.`,
        options: backups.map(card => ({ id: card.object, label: context.catalog[card.card]!.name, object: card.object })),
        min: excess, max: excess, allocation: null,
        resume: { script: 'rules', version: RULE_ENGINE_VERSION, ability: 'choice-checkpoint', step: 'excess-backups',
          payload: { seat: excessSeat } } }, backups[0]!);
      break;
    }
    break;
  }
  return events;
}
