import type { MatchState, RuleEvent, Seat } from '../rules/types';
import type { MatchView } from './protocol';
import type { TrayCard } from './protocol';
import { describeCastAccess, legalActions } from '../rules/actions';
import { effectivePower, hasKeyword } from '../rules/continuous';
import type { EngineContext } from '../rules/types';

export function projectView(state: MatchState, seat: Seat | null = null, log: RuleEvent[] = [], context?: EngineContext, generation = 0): MatchView {
  const visible = JSON.parse(JSON.stringify(state)) as MatchState;
  const deckCounts: Record<Seat, number> = { 0: state.zones[0].deck.length, 1: state.zones[1].deck.length };
  for (const owner of [0, 1] as const) {
    // Deck order is never part of a client projection, including omniscient table views.
    visible.zones[owner].deck = [];
    const hiddenHand = seat === null || seat !== owner;
    if (hiddenHand) {
      for (const instance of visible.zones[owner].hand) delete visible.cards[instance];
      visible.zones[owner].hand = visible.zones[owner].hand.map((_, index) => `hidden-hand-${owner}-${index}`);
    }
    for (const instance of state.zones[owner].deck) delete visible.cards[instance];
  }
  const pending = visible.choice;
  const choice = pending && seat !== null && pending.seat === seat
    ? (({ resume: _resume, ...publicChoice }) => publicChoice)(pending)
    : pending ? { ...(({ resume: _resume, ...publicChoice }) => publicChoice)(pending),
      reason: `Player ${pending.seat + 1} is making a private choice.`, options: [] } : null;
  const safeLog = seat === null ? [] : log.map(item => {
    const data = item.data && typeof item.data === 'object' && !Array.isArray(item.data)
      ? item.data as Record<string, unknown> : {};
    const eventSeat = typeof data.seat === 'number' ? data.seat
      : typeof data.owner === 'number' ? data.owner : typeof data.controller === 'number' ? data.controller : undefined;
    const isOpponent = eventSeat !== undefined && eventSeat !== seat;
    if (!isOpponent) return item;
    if (['card.drawn', 'card.searched'].includes(item.type)) return { ...item, data: { seat: data.seat } };
    if (item.type === 'card.moved' && (data.to === 'hand' || data.to === 'deck')) {
      return { ...item, data: { owner: data.owner, controller: data.controller, from: data.from, to: data.to } };
    }
    return item;
  });
  const traySeat = seat ?? state.choice?.seat ?? state.priority ?? state.active;
  const castAccess = context && seat !== null ? describeCastAccess(state, traySeat, context) : [];
  const presentations: Record<string, import('./protocol').VisibleCard> = {};
  if (context) {
    for (const card of Object.values(visible.cards)) {
      const definition = context.catalog[card.card];
      if (!definition) continue;
      presentations[card.object] = { object: card.object, card: card.card, owner: card.owner, controller: card.controller,
        zone: card.zone, dull: card.dull, frozen: card.frozen, damage: card.damage,
        power: definition.power === null ? null : effectivePower(state, card.object, context),
        keywords: definition.power === null ? [] : (['Brave', 'Haste', 'First Strike', 'Freeze'] as const)
          .filter(keyword => hasKeyword(state, card.object, keyword, context)),
        printed: JSON.parse(JSON.stringify(definition)) as typeof definition,
        commander: state.commanders[card.owner].instance === card.instance,
        commanderTax: state.commanders[card.owner].instance === card.instance ? state.commanders[card.owner].casts * 2 : 0 };
    }
  }
  const visibleTrayCard = (instance: string, sourceZone: import('../rules/types').Zone): TrayCard | null => {
    const card = state.cards[instance];
    if (!card || !context || !presentations[card.object]) return null;
    return { instance, sourceZone, cast: castAccess.find(access => access.source === card.object) ?? null,
      card: presentations[card.object]! };
  };
  const handTray = context && seat !== null ? state.zones[traySeat].hand.map(instance => visibleTrayCard(instance, 'hand'))
    .filter((item): item is TrayCard => item !== null) : [];
  const commanderInstance = state.commanders[traySeat].instance;
  const resolvingFrame = [...state.execution.frames].reverse().find(frame => frame.mode === 'stack');
  const resolvingCard = !resolvingFrame ? state.stackCards.map(instance => state.cards[instance])
    .find(card => card?.zone === 'stack' && !state.stack.some(item => item.source === card.object)) : undefined;
  const commanderTray = seat !== null && state.cards[commanderInstance]?.zone === 'commander'
    ? visibleTrayCard(commanderInstance, 'commander') : null;
  return {
    generation, seq: visible.seq, turn: visible.turn, phase: visible.phase, active: visible.active,
    priority: visible.priority, decisionSeat: visible.choice?.seat ?? visible.priority,
    choice, cards: visible.cards, presentations, zones: visible.zones, deckCounts, field: visible.field, log: JSON.parse(JSON.stringify(safeLog)) as RuleEvent[],
    stackCards: visible.stackCards, stack: visible.stack.map(item => ({ id: item.id, controller: item.controller,
      source: item.source, lastKnown: item.lastKnown, targets: [...item.targets], mode: item.mode, ability: item.resume.ability })),
    resolving: resolvingFrame ? { source: resolvingFrame.source, controller: resolvingFrame.controller, ability: resolvingFrame.resume.ability,
      lastKnown: resolvingFrame.lastKnown, targets: resolvingFrame.targets }
      : resolvingCard ? { source: resolvingCard.object, controller: resolvingCard.controller, ability: 'Effect in progress',
        lastKnown: resolvingCard, targets: [] } : null,
    commanders: visible.commanders,
    passes: visible.passes, result: visible.result, versions: visible.versions, combat: visible.combat,
    castAccess,
    actions: context && seat !== null ? legalActions(state, traySeat, context) : [],
    cardTray: { hand: handTray, otherZones: commanderTray ? [commanderTray] : [] },
  };
}
