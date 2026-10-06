import { moveCard } from './zones';
import { requestDeparture } from './commander';
import { addKeyword, addPower, changeControl, effectivePower, setPower } from './continuous';
import { replacementDamage } from './damage';
import type { EngineContext, MatchState, RuleEvent, Seat, StackItem } from './types';

function event(state: MatchState, type: string, data: RuleEvent['data']): RuleEvent {
  return { id: 'event-' + state.nextId++, type, data };
}
function getObject(state: MatchState, object: string) { return Object.values(state.cards).find(card => card.object === object); }
function deal(state: MatchState, targetObject: string, amount: number, context: EngineContext, events: RuleEvent[]): void {
  const target = getObject(state, targetObject);
  if (!target || target.zone !== 'field') return;
  const applied = replacementDamage(state, target.object, amount, context);
  target.damage += applied;
  events.push(event(state, 'forward.damaged', { object: target.object, amount: applied, prevented: amount - applied }));
  const power = effectivePower(state, target.object, context);
  if (target.damage >= power) {
    const receipt = requestDeparture(state, target.instance, 'break');
    if (receipt) events.push(event(state, 'forward.broken', { object: receipt.old.object, card: receipt.old.card, destination: 'break' }));
  }
}
function playerDamage(state: MatchState, seat: Seat, count: number, source: string, events: RuleEvent[]): void {
  for (let index = 0; index < count; index += 1) {
    const instance = state.zones[seat].deck[0];
    if (!instance) { state.work.push({ handler: 'rule-process', step: 'empty-deck', data: { seat } }); break; }
    const moved = moveCard(state, instance, 'damage');
    events.push(event(state, 'player.damaged', { seat, card: moved.card, source }));
  }
}

function drawCards(state: MatchState, seat: Seat, count: number, source: string, events: RuleEvent[]): void {
  for (let index = 0; index < count; index += 1) {
    const instance = state.zones[seat].deck[0];
    if (!instance) {
      state.work.push({ handler: 'rule-process', step: 'empty-deck', data: { seat } });
      events.push(event(state, 'player.attempted-empty-draw', { seat, source }));
      break;
    }
    const moved = moveCard(state, instance, 'hand');
    events.push(event(state, 'card.drawn', { seat, card: moved.card, source }));
  }
}

export function resolveSummon(state: MatchState, item: StackItem, context: EngineContext): RuleEvent[] {
  const events: RuleEvent[] = [];
  const handler = item.handler;
  if (handler === 'scorch') deal(state, item.targets[0]!, 4000, context, events);
  else if (handler === 'twin-embers') {
    for (const target of item.targets) deal(state, target, 3000, context, events);
  } else if (handler === 'final-spark') playerDamage(state, item.controller === 0 ? 1 : 0, 2, item.lastKnown.card, events);
  else if (handler === 'rising-undertow') {
    drawCards(state, item.controller, 2, item.lastKnown.card, events);
    const id = `effect-${state.nextId++}`;
    state.effects.push({ id, timestamp: state.nextId, controller: item.controller, source: item.source,
      handler: 'undertow-discard', data: { seat: item.controller, instance: item.lastKnown.instance }, expiresTurn: state.turn });
    events.push(event(state, 'undertow.discard-scheduled', { seat: item.controller }));
  }
  else if (handler === 'return-tide') {
    const target = getObject(state, item.targets[0]!);
    if (target?.zone === 'field' && context.catalog[target.card]?.type === 'Forward') {
      const receipt = requestDeparture(state, target.instance, 'hand');
      if (receipt) events.push(event(state, 'forward.returned', { object: receipt.old.object, card: receipt.old.card, owner: receipt.old.owner }));
    }
  } else if (handler === 'war-cry' || handler === 'guarding-current' || handler === 'shape-tide') {
    const target = getObject(state, item.targets[0]!);
    if (target?.zone === 'field') {
      if (handler === 'war-cry') {
        addPower(state, item.source, target.object, 3000, state.turn);
        addKeyword(state, item.source, target.object, 'Brave', state.turn);
      } else if (handler === 'guarding-current') {
        addPower(state, item.source, target.object, 2000, state.turn);
        addKeyword(state, item.source, target.object, 'First Strike', state.turn);
      } else setPower(state, item.source, target.object, 4000, state.turn);
      events.push(event(state, 'forward.effect-applied', { object: target.object, handler }));
    }
  } else if (handler === 'ashen-verdict' || handler === 'controlled-burn') {
    const target = getObject(state, item.targets[0]!);
    if (target?.zone === 'field') {
      const destination = handler === 'ashen-verdict' || item.mode === 'backup' ? 'break' : 'removed';
      const receipt = requestDeparture(state, target.instance, destination);
      if (receipt) events.push(event(state, 'card.removed-by-summon', { object: receipt.old.object, card: receipt.old.card, destination }));
    }
  } else if (handler === 'borrowed-banner') {
    const target = getObject(state, item.targets[0]!);
    if (target?.zone === 'field') {
      changeControl(state, item.source, target.object, item.controller, state.turn);
      events.push(event(state, 'card.control-changed', { object: target.object, controller: item.controller }));
    }
  } else if (handler === 'stillwater') {
    const index = state.stack.findIndex(candidate => candidate.source === item.targets[0]);
    if (index >= 0) {
      const [cancelled] = state.stack.splice(index, 1);
      if (cancelled) {
        const physical = state.cards[cancelled.lastKnown.instance];
        if (physical?.zone === 'stack') moveCard(state, physical.instance, 'break');
        events.push(event(state, 'summon.cancelled', { item: cancelled.id, card: cancelled.lastKnown.card }));
      }
    }
  }
  const summon = state.cards[item.lastKnown.instance];
  if (summon) {
    const old = moveCard(state, summon.instance, 'break');
    events.push(event(state, 'summon.resolved', { card: old.card, source: old.object }));
  }
  return events;
}
