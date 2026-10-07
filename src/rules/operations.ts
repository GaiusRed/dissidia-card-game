import { addEffect, changeControl, effectivePower } from './continuous';
import { dealPlayerDamage, replacementDamage } from './damage';
import { scheduleDepartureAbilities } from './triggers';
import { moveCard } from './zones';
import { shuffle } from './random';
import { advanceTurnStep } from './turns';
import type { Operation, SchedulerResult } from './contracts/execution';
import type { CardObject, EngineContext, MatchState, RuleError, RuleEvent, Seat } from './types';

const other = (seat: Seat): Seat => seat === 0 ? 1 : 0;
const error = (code: string, message: string): SchedulerResult => ({ events: [], error: { code, message } });
const object = (state: MatchState, id: string): CardObject | undefined =>
  Object.values(state.cards).find(card => card.object === id);
function event(state: MatchState, type: string, data: RuleEvent['data']): RuleEvent {
  return { id: `event-${state.nextId++}`, type, data };
}

export function applyOperation(state: MatchState, operation: Operation, context: EngineContext,
  prepared: { simultaneous?: boolean; lastPower?: number; observers?: readonly CardObject[]; deferDepartureTriggers?: boolean } = {}): SchedulerResult {
  const events: RuleEvent[] = [];
  try {
    switch (operation.kind) {
      case 'move': {
        const card = object(state, operation.object);
        if (!card) return error('UNKNOWN_OBJECT', 'The operation refers to a card that has left its zone.');
        const power = card.zone === 'field' ? prepared.lastPower ?? effectivePower(state, card.object, context) : 0;
        const old = moveCard(state, card.instance, operation.to, operation.index ?? undefined);
        if (old.zone === 'field' && !prepared.deferDepartureTriggers) {
          scheduleDepartureAbilities(state, old, operation.to, context, power, prepared.observers);
        }
        events.push(event(state, 'card.moved', { object: old.object, card: old.card, type: context.catalog[old.card]?.type ?? null,
          controller: old.controller, owner: old.owner, power: old.zone === 'field' ? power : null,
          from: old.zone, to: operation.to }));
        break;
      }
      case 'forward-damage': {
        const target = object(state, operation.target);
        if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward') {
          return error('ILLEGAL_TARGET', 'Damage requires a Forward on the field.');
        }
        const amount = prepared.simultaneous ? operation.amount : replacementDamage(state, target.object, operation.amount, context);
        target.damage += amount;
        events.push(event(state, 'forward.damaged', { source: operation.source, target: target.object, amount }));
        break;
      }
      case 'player-damage':
        events.push(...dealPlayerDamage(state, operation.seat, operation.amount, operation.source, context));
        break;
      case 'draw': {
        for (let index = 0; index < operation.count; index += 1) {
          const instance = state.zones[operation.seat].deck[0];
          if (!instance) {
            state.result = { winner: other(operation.seat), reason: 'deckout' };
            state.priority = null;
            events.push(event(state, 'player.decked-out', { seat: operation.seat }));
            break;
          }
          const old = moveCard(state, instance, 'hand');
          events.push(event(state, 'card.drawn', { seat: operation.seat, card: old.card }));
        }
        break;
      }
      case 'discard': {
        const cards = operation.objects.map(id => object(state, id));
        if (cards.some(card => !card || card.zone !== 'hand' || card.owner !== operation.seat)) {
          return error('ILLEGAL_COST', 'Discarded cards must be in the selected player\'s hand.');
        }
        for (const card of cards as CardObject[]) {
          const old = moveCard(state, card.instance, 'break');
          events.push(event(state, operation.reason === 'special-cost' ? 'card.discarded-for-special' : 'card.discarded',
            { seat: operation.seat, card: old.card, reason: operation.reason }));
        }
        break;
      }
      case 'reveal': {
        const cards = operation.objects.map(id => object(state, id));
        if (cards.some(card => !card)) return error('UNKNOWN_OBJECT', 'The reveal operation contains an unknown card.');
        events.push(event(state, 'cards.revealed', { objects: (cards as CardObject[]).map(card => card.object) }));
        break;
      }
      case 'shuffle': {
        const result = shuffle(state.zones[operation.seat].deck, state.rng);
        state.zones[operation.seat].deck = result.items;
        state.rng = result.seed;
        events.push(event(state, 'deck.shuffled', { seat: operation.seat }));
        break;
      }
      case 'status': {
        const card = object(state, operation.object);
        if (!card || card.zone !== 'field') return error('UNKNOWN_OBJECT', 'The status operation requires a card on the field.');
        if (operation.dull !== null) card.dull = operation.dull;
        card.frozen = operation.freeze;
        events.push(event(state, 'card.status-changed', { object: card.object, dull: card.dull, frozen: card.frozen }));
        break;
      }
      case 'power': {
        const target = object(state, operation.object);
        if (!target || target.zone !== 'field') return error('UNKNOWN_OBJECT', 'The power operation requires a card on the field.');
        addEffect(state, operation.mode === 'base' ? 'power-set' : 'power-modifier', operation.source, target.object,
          operation.mode === 'base' ? { value: operation.value } : { amount: operation.value }, operation.expiresTurn);
        events.push(event(state, 'power.changed', { object: target.object, mode: operation.mode, value: operation.value }));
        break;
      }
      case 'keyword': {
        const target = object(state, operation.object);
        if (!target || target.zone !== 'field') return error('UNKNOWN_OBJECT', 'The keyword operation requires a card on the field.');
        addEffect(state, 'keyword-add', operation.source, target.object, { keyword: operation.keyword }, operation.expiresTurn);
        events.push(event(state, 'keyword.granted', { object: target.object, keyword: operation.keyword }));
        break;
      }
      case 'control': {
        const target = object(state, operation.object);
        if (!target || target.zone !== 'field') return error('UNKNOWN_OBJECT', 'The control operation requires a card on the field.');
        changeControl(state, operation.source, target.object, operation.controller, operation.expiresTurn);
        events.push(event(state, 'card.control-changed', { object: target.object, controller: operation.controller }));
        break;
      }
      case 'delay':
        {
        const source = object(state, operation.source);
        if (!source) return error('UNKNOWN_OBJECT', 'A delayed effect requires its source object.');
        state.execution.delayed.push({
          id: `delay-${state.nextId++}`, controller: operation.controller, source: source.object, lastKnown: { ...source }, createdTurn: state.turn,
          eligibleTurn: state.turn + (state.active !== operation.controller ? 1 : state.phase === 'end' ? 2 : 0),
          at: operation.at, resume: operation.resume,
        });
        events.push(event(state, 'effect.delayed', { controller: operation.controller, at: operation.at }));
        break;
        }
      case 'cancel-stack': {
        const index = state.stack.findIndex(item => item.id === operation.item);
        if (index < 0) return error('UNKNOWN_STACK_ITEM', 'The stack item is no longer present.');
        const [item] = state.stack.splice(index, 1);
        if (item && state.cards[item.lastKnown.instance]?.zone === 'stack') {
          moveCard(state, item.lastKnown.instance, 'break');
        }
        events.push(event(state, 'stack.cancelled', { item: operation.item }));
        break;
      }
      case 'setup-first-player':
        state.firstPlayer = operation.seat;
        state.active = operation.seat;
        break;
      case 'setup-begin-game': {
        state.turn = 1;
        state.firstPlayer = operation.firstPlayer;
        state.active = operation.firstPlayer;
        state.phase = 'active';
        state.priority = null;
        state.execution.frames.at(-1)!.returnWindow = { kind: 'priority', seat: operation.firstPlayer };
        events.push(...advanceTurnStep(state, context));
        break;
      }
      case 'batch-move-replacement': {
        const batch = state.execution.batch;
        if (!batch || batch.id !== operation.batch || batch.phase !== 'replacements') {
          return error('STALE_BATCH', 'The simultaneous batch is no longer awaiting replacement decisions.');
        }
        const original = batch.operations[operation.operation];
        if (!original || original.kind !== 'move' || original.object !== operation.object) {
          return error('STALE_BATCH', 'The replacement does not match its original movement.');
        }
        if (batch.replacements.some(item => item.operation === operation.operation)) {
          return error('STALE_BATCH', 'That movement already has a replacement decision.');
        }
        batch.replacements.push({ operation: operation.operation, replacement: {
          kind: 'move', object: operation.object, to: operation.destination, index: null,
        } });
        break;
      }
    }
    return { events, error: null };
  } catch (cause) {
    const failure: RuleError = {
      code: 'OPERATION_FAILED',
      message: cause instanceof Error ? cause.message : 'The operation could not be applied.',
    };
    return { events: [], error: failure };
  }
}
