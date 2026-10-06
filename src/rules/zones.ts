import type { CardObject, InstanceId, MatchState, Zone } from './types';

export function zoneCards(state: MatchState, object: CardObject): InstanceId[] {
  if (object.zone === 'field') return state.field;
  if (object.zone === 'stack') return state.stackCards;
  return state.zones[object.owner][object.zone];
}
export function moveCard(state: MatchState, instance: InstanceId, zone: Zone, index?: number): CardObject {
  const card = state.cards[instance];
  if (!card) throw new Error('Unknown card instance ' + instance);
  const old = { ...card };
  const from = zoneCards(state, card);
  const at = from.indexOf(instance);
  if (at < 0) throw new Error('Card ' + instance + ' is missing from its ' + card.zone + ' zone');
  from.splice(at, 1);
  card.zone = zone;
  card.object = 'object-' + state.nextId++;
  card.controller = card.owner;
  card.dull = false;
  card.damage = 0;
  card.controlledSinceTurn = 0;
  card.attackedTurn = null;
  card.frozen = false;
  const to = zoneCards(state, card);
  const position = Math.max(0, Math.min(index ?? to.length, to.length));
  to.splice(position, 0, instance);
  return old;
}
