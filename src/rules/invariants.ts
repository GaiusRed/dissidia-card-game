import type { EngineContext, MatchState, Zone } from './types';

const otherZones: Exclude<Zone, 'field' | 'stack'>[] = ['deck', 'hand', 'break', 'removed', 'damage', 'commander'];
export function assertInvariants(state: MatchState, context: EngineContext): void {
  const locations = new Map<string, Zone>();
  const objectIds = new Set<string>();
  const add = (instance: string, zone: Zone) => {
    if (locations.has(instance)) throw new Error('Card ' + instance + ' appears in more than one zone');
    const card = state.cards[instance];
    if (!card) throw new Error('Zone ' + zone + ' contains unknown card instance ' + instance);
    locations.set(instance, zone);
  };
  for (const instance of state.field) add(instance, 'field');
  for (const instance of state.stackCards) add(instance, 'stack');
  for (const seat of [0, 1] as const) for (const zone of otherZones) {
    for (const instance of state.zones[seat][zone]) {
      const card = state.cards[instance];
      if (card && card.owner !== seat) throw new Error('Card ' + instance + ' is in another owner zone');
      add(instance, zone);
    }
  }
  for (const [instance, card] of Object.entries(state.cards)) {
    if (card.instance !== instance || !locations.has(instance)) throw new Error('Card ' + instance + ' must appear in exactly one zone');
    if (locations.get(instance) !== card.zone) throw new Error('Card ' + instance + ' zone does not match its location');
    if (card.owner !== 0 && card.owner !== 1) throw new Error('Card ' + instance + ' has an invalid owner');
    if (card.controller !== 0 && card.controller !== 1) throw new Error('Card ' + instance + ' has an invalid controller');
    if (card.damage < 0 || card.controlledSinceTurn < 0 || (card.attackedTurn !== null && card.attackedTurn < 0)) {
      throw new Error('Card ' + instance + ' has a negative counter');
    }
    if (objectIds.has(card.object)) throw new Error('Zone object ' + card.object + ' is not unique');
    objectIds.add(card.object);
    if (!context.catalog[card.card]) throw new Error('Card ' + instance + ' has unknown definition ' + card.card);
  }
  for (const seat of [0, 1] as const) {
    const commander = state.commanders[seat];
    const card = state.cards[commander.instance];
    const definition = card ? context.catalog[card.card] : undefined;
    if (!card || card.owner !== seat || !definition || definition.type !== 'Forward' || definition.rarity !== 'L') {
      throw new Error('Player ' + seat + ' has an invalid Commander designation');
    }
    if (commander.casts < 0) throw new Error('Player ' + seat + ' has a negative Commander cast count');
  }
  if (state.seq < 0 || state.turn < 0 || state.passes < 0 || state.nextId < 0) throw new Error('Match counters cannot be negative');
  if (state.choice && state.choice.seat !== 0 && state.choice.seat !== 1) throw new Error('Pending choice has an invalid seat');
  if (state.cards && Object.keys(state.cards).length === 0) throw new Error('Match must contain cards');
}
