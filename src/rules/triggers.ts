import { effectivePower } from './continuous';
import type { CardObject, EngineContext, MatchState, Seat, Zone } from './types';

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

/** Collect triggers that observe a card leaving the field, using its last field values. */
export function scheduleDepartureAbilities(state: MatchState, departed: CardObject, destination: Zone, context: EngineContext, lastPower = 0): void {
  if (context.catalog[departed.card]?.type !== 'Forward') return;
  const pending: Array<{ source: CardObject; handler: string; data: Record<string, string | number> }> = [];
  for (const instance of state.field) {
    const source = state.cards[instance]!;
    if (source.controller !== departed.controller) continue;
    for (const ability of context.catalog[source.card]?.abilities ?? []) {
      if (ability.kind === 'auto' && ability.handler === 'cinder-witness-damage' && destination === 'break') {
        pending.push({ source, handler: ability.handler, data: { seat: source.controller } });
      }
      if (ability.kind === 'auto' && ability.handler === 'tide-witness-draw') {
        pending.push({ source, handler: ability.handler, data: { seat: source.controller } });
      }
    }
  }
  if (destination === 'break' && context.catalog[departed.card]?.abilities.some(ability => ability.handler === 'night-regent-leave')) {
    pending.push({ source: departed, handler: 'night-regent-leave', data: { seat: departed.controller, lastPower } });
  }
  for (const trigger of pending) {
    if (!context.handlers[trigger.handler]) continue;
    state.stack.push({ id: `stack-${state.nextId++}`, controller: trigger.source.controller,
      source: trigger.source.object, lastKnown: { ...trigger.source }, handler: trigger.handler,
      targets: [], mode: null, data: { source: trigger.source.object, ...trigger.data } });
  }
  if (pending.length > 0) {
    state.passes = 0;
    state.priority = other(departed.controller);
  }
}
