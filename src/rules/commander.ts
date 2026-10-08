import type { CardObject, EngineContext, InstanceId, MatchState, Zone } from './types';
import { moveCard } from './zones';
import { scheduleDepartureAbilities } from './triggers';
import { effectivePower } from './continuous';
import { openRuleChoice } from './rule-choice';
import { RULE_ENGINE_VERSION } from './rule-scripts';

export interface DepartureReceipt { old: CardObject; destination: Zone }
export function commanderCost(state: MatchState, instance: InstanceId, context: EngineContext): number {
  const card = state.cards[instance];
  if (!card) return 0;
  const definition = context.catalog[card.card];
  if (!definition) return 0;
  const commander = state.commanders[card.owner];
  const tax = commander.instance === instance && card.zone === 'commander' ? commander.casts * 2 : 0;
  return definition.cost + tax;
}

export function requestDeparture(state: MatchState, instance: InstanceId, destination: Zone, context?: EngineContext): DepartureReceipt | null {
  const card = state.cards[instance];
  if (!card) throw new Error('A card cannot leave from an unknown instance.');
  if (card.zone !== 'field') return { old: moveCard(state, instance, destination), destination };
  const commander = state.commanders[card.owner];
  if (commander.instance !== instance) {
    const lastPower = context ? effectivePower(state, card.object, context) : 0;
    const old = moveCard(state, instance, destination);
    if (context) scheduleDepartureAbilities(state, old, destination, context, lastPower);
    return { old, destination };
  }
  if (state.choice) throw new Error('Finish the current decision before starting a departure.');
  openRuleChoice(state, { seat: card.owner, kind: 'confirm',
    reason: 'Choose where your Commander goes as it leaves the field.',
    options: [
      { id: 'return', label: 'Return to Commander Zone', object: card.object },
      { id: 'destination', label: 'Use normal destination', object: card.object },
    ],
    min: 1, max: 1, allocation: null,
    resume: { script: 'rules', version: RULE_ENGINE_VERSION, ability: 'choice-commander', step: 'destination',
      payload: { instance, destination, seat: card.owner } } }, card);
  return null;
}
