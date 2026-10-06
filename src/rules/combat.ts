import { requestDeparture } from './commander';
import { effectivePower, hasKeyword } from './continuous';
import { dealPlayerDamage, replacementDamage } from './damage';
import type { EngineContext, MatchState, ObjectId, RuleError, RuleEvent, Seat } from './types';

const err = (code: string, message: string): RuleError => ({ code, message });
const other = (seat: Seat): Seat => seat === 0 ? 1 : 0;
function event(state: MatchState, type: string, data: RuleEvent['data']): RuleEvent {
  return { id: 'event-' + state.nextId++, type, data };
}
function object(state: MatchState, id: ObjectId) { return Object.values(state.cards).find(card => card.object === id); }

export function declareAttack(state: MatchState, seat: Seat, members: ObjectId[], context: EngineContext): RuleError[] {
  if (state.phase !== 'attack' || state.active !== seat || state.priority !== seat || state.combat) return [err('WRONG_TIMING', 'Declare an attack during your Attack Phase with priority.')];
  if (members.length !== 1) return [err('SEQUENTIAL_ATTACK', 'Declare one Forward attack at a time.')];
  const attacker = object(state, members[0]!);
  if (!attacker || attacker.zone !== 'field' || attacker.controller !== seat || context.catalog[attacker.card]?.type !== 'Forward') return [err('INVALID_ATTACKER', 'Choose a Forward you control.')];
  const definition = context.catalog[attacker.card]!;
  if (attacker.dull || attacker.frozen || attacker.attackedTurn === state.turn ||
      (attacker.controlledSinceTurn >= state.turn && !hasKeyword(state, attacker.object, 'Haste', context))) {
    return [err('UNREADY_ATTACKER', 'This Forward cannot attack now.')];
  }
  attacker.dull = true;
  attacker.attackedTurn = state.turn;
  state.combat = { step: 'block', attackers: [attacker.object], blocker: null, wasBlocked: false, allocation: {} };
  state.passes = 0;
  state.priority = other(seat);
  return [];
}

export function declareBlock(state: MatchState, seat: Seat, blockerId: ObjectId | null, context: EngineContext): RuleError[] {
  if (state.phase !== 'attack' || !state.combat || state.combat.step !== 'block' || state.active === seat || state.priority !== seat) return [err('WRONG_TIMING', 'Only the defending player may declare a block now.')];
  if (blockerId === null) return [err('INVALID_BLOCKER', 'Choose a Forward to block with.')];
  if (state.combat.blocker) return [err('BLOCKER_ALREADY_ASSIGNED', 'A blocker is already assigned to this attack.')];
  const blocker = object(state, blockerId);
  if (!blocker || blocker.zone !== 'field' || blocker.controller !== seat || blocker.dull || blocker.frozen || context.catalog[blocker.card]?.type !== 'Forward') return [err('INVALID_BLOCKER', 'Choose an active Forward you control.')];
  blocker.dull = true;
  state.combat.blocker = blocker.object;
  state.combat.wasBlocked = true;
  state.passes = 0;
  state.priority = state.active;
  return [];
}

export function resolveCombat(state: MatchState, context: EngineContext): RuleEvent[] {
  const combat = state.combat;
  if (!combat) return [];
  const events: RuleEvent[] = [];
  const attacker = object(state, combat.attackers[0]!);
  const blocker = combat.blocker ? object(state, combat.blocker) : undefined;
  if (!attacker || attacker.zone !== 'field') { state.combat = null; return events; }
  const power = (card: typeof attacker) => effectivePower(state, card.object, context);
  const damage = (target: typeof attacker, amount: number) => {
    const applied = replacementDamage(state, target.object, amount, context);
    target.damage += applied;
    events.push(event(state, 'combat.damage', { target: target.object, amount: applied, prevented: amount - applied }));
    if (target.damage >= effectivePower(state, target.object, context)) {
      const receipt = requestDeparture(state, target.instance, 'break', context);
      if (receipt) events.push(event(state, 'forward.broken', { object: receipt.old.object, card: receipt.old.card, destination: 'break' }));
    }
  };
  if (!blocker || blocker.zone !== 'field') {
    const defender: Seat = other(state.active);
    events.push(...dealPlayerDamage(state, defender, 1, attacker.card, context));
  } else {
    const attackerFirst = hasKeyword(state, attacker.object, 'First Strike', context);
    const blockerFirst = hasKeyword(state, blocker.object, 'First Strike', context);
    if (attackerFirst && blockerFirst) { damage(blocker, power(attacker)); damage(attacker, power(blocker)); }
    else if (attackerFirst) { damage(blocker, power(attacker)); if (blocker.zone === 'field') damage(attacker, power(blocker)); }
    else if (blockerFirst) { damage(attacker, power(blocker)); if (attacker.zone === 'field') damage(blocker, power(attacker)); }
    else { const a = power(attacker); const b = power(blocker); damage(blocker, a); damage(attacker, b); }
  }
  state.combat = null;
  state.priority = state.active;
  return events;
}
