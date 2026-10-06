import type { EngineContext, MatchState, Seat } from './types';

const other = (seat: Seat): Seat => seat === 0 ? 1 : 0;

/** Put supported auto abilities triggered by a Character entering on the rules stack. */
export function scheduleEntryAbilities(state: MatchState, instance: string, context: EngineContext): void {
  const source = state.cards[instance];
  const definition = source && context.catalog[source.card];
  if (!source || source.zone !== 'field' || !definition) return;
  const abilities = definition.abilities.filter(ability => ability.kind === 'auto' && context.handlers[ability.handler]);
  for (const ability of abilities) {
    state.stack.push({
      id: `stack-${state.nextId++}`, controller: source.controller, source: source.object, lastKnown: { ...source },
      handler: ability.handler, targets: [], mode: null,
      data: { source: source.object, seat: source.controller, ability: ability.id },
    });
  }
  if (abilities.length > 0) {
    state.passes = 0;
    state.priority = other(source.controller as Seat);
  }
}
