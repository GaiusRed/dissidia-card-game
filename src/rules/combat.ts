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
  if (state.phase !== 'attack' || state.active !== seat || state.priority !== seat || state.combat || state.stack.length > 0) return [err('WRONG_TIMING', 'Declare an attack during your Attack Phase with priority and an empty stack.')];
  if (members.length === 0) return [err('INVALID_ATTACKER', 'Choose at least one Forward to attack.')];
  if (new Set(members).size !== members.length) return [err('DUPLICATE_ATTACKER', 'A Forward cannot appear twice in one party.')];
  const attackers = members.map(member => object(state, member));
  if (attackers.some(attacker => !attacker || attacker.zone !== 'field' || attacker.controller !== seat || context.catalog[attacker.card]?.type !== 'Forward')) {
    return [err('INVALID_ATTACKER', 'Choose Forwards you control.')];
  }
  const validAttackers = attackers as NonNullable<(typeof attackers)[number]>[];
  const definitions = validAttackers.map(attacker => context.catalog[attacker.card]!);
  if (!definitions[0]!.elements.some(element => definitions.every(definition => definition.elements.includes(element)))) {
    return [err('MIXED_PARTY_ELEMENTS', 'Every Forward in a party must share an element.')];
  }
  if (validAttackers.some(attacker => attacker.dull || attacker.attackedTurn === state.turn ||
      (attacker.controlledSinceTurn >= state.turn && !hasKeyword(state, attacker.object, 'Haste', context)))) {
    return [err('UNREADY_ATTACKER', 'Every Forward in the party must be ready to attack.')];
  }
  for (const attacker of validAttackers) {
    if (!hasKeyword(state, attacker.object, 'Brave', context)) attacker.dull = true;
    attacker.attackedTurn = state.turn;
  }
  state.combat = { step: 'prepare', participants: validAttackers.map(attacker => ({ ...attacker })),
    attackers: validAttackers.map(attacker => attacker.object), blocker: null,
    wasBlocked: false, partyFirstStrike: validAttackers.every(attacker => hasKeyword(state, attacker.object, 'First Strike', context)), allocation: {} };
  state.passes = 0;
  state.priority = seat;
  return [];
}

export function declareBlock(state: MatchState, seat: Seat, blockerId: ObjectId | null, context: EngineContext): RuleError[] {
  if (state.phase !== 'attack' || !state.combat || state.combat.step !== 'block' || state.active === seat || state.priority !== seat) return [err('WRONG_TIMING', 'Only the defending player may declare a block now.')];
  if (blockerId === null) {
    state.combat.step = 'damage';
    state.passes = 0;
    state.priority = state.active;
    return [];
  }
  if (state.combat.blocker) return [err('BLOCKER_ALREADY_ASSIGNED', 'A blocker is already assigned to this attack.')];
  const blocker = object(state, blockerId);
  if (!blocker || blocker.zone !== 'field' || blocker.controller !== seat || blocker.dull || context.catalog[blocker.card]?.type !== 'Forward') return [err('INVALID_BLOCKER', 'Choose an active Forward you control.')];
  state.combat.blocker = blocker.object;
  state.combat.participants.push({ ...blocker });
  state.combat.wasBlocked = true;
  state.combat.step = 'damage';
  state.passes = 0;
  state.priority = state.active;
  return [];
}

export function resolveCombat(state: MatchState, context: EngineContext): RuleEvent[] {
  const combat = state.combat;
  if (!combat) return [];
  const events: RuleEvent[] = [];
  const attackers = combat.attackers.map(id => object(state, id)).filter((card): card is NonNullable<typeof card> =>
    !!card && card.zone === 'field' && card.controller === state.active);
  const blockerCard = combat.blocker ? object(state, combat.blocker) : undefined;
  const blocker = blockerCard?.zone === 'field' && blockerCard.controller !== state.active ? blockerCard : undefined;
  if (attackers.length === 0) { state.combat = null; return events; }
  if (attackers.length > 1 && blocker?.zone === 'field' && Object.keys(combat.allocation).length === 0 && combat.step !== 'normalDamage') {
    const total = effectivePower(state, blocker.object, context);
    state.choice = {
      id: `choice-${state.nextId++}`, seat: other(state.active), kind: 'allocation',
      reason: 'Assign the blocking Forward’s battle damage among the party.',
      options: attackers.map(card => ({ id: card.object, label: context.catalog[card.card]?.name ?? card.card, object: card.object })),
      min: 0, max: 0, allocation: { total, increment: 1000 },
      resume: { handler: 'combat', step: 'party-allocation', data: { blocker: blocker.object } },
    };
    state.priority = null;
    state.passes = 0;
    return events;
  }
  const power = (card: (typeof attackers)[number]) => effectivePower(state, card.object, context);
  const partyFirstStrike = attackers.length > 1 && combat.partyFirstStrike;
  const blockerFirstStrike = blocker?.zone === 'field' && hasKeyword(state, blocker.object, 'First Strike', context);
  const damage = (target: (typeof attackers)[number], amount: number) => {
    const applied = replacementDamage(state, target.object, amount, context);
    target.damage += applied;
    events.push(event(state, 'combat.damage', { target: target.object, amount: applied, prevented: amount - applied }));
  };
  if (combat.step === 'damage' && attackers.length === 1 && blocker?.zone === 'field') {
    const attacker = attackers[0]!;
    const attackerFirst = hasKeyword(state, attacker.object, 'First Strike', context);
    const blockerFirst = hasKeyword(state, blocker.object, 'First Strike', context);
    if (attackerFirst || blockerFirst) {
      const attackerPower = power(attacker);
      const blockerPower = effectivePower(state, blocker.object, context);
      if (attackerFirst) damage(blocker, attackerPower);
      if (blockerFirst) damage(attacker, blockerPower);
      if (attackerFirst !== blockerFirst) {
        combat.step = 'normalDamage';
        state.passes = 0;
        state.priority = state.active;
        events.push(event(state, 'combat.first-strike-checkpoint', { attacker: attacker.object, blocker: blocker.object }));
        return events;
      }
      state.combat = null;
      state.priority = state.active;
      return events;
    }
  }
  if (combat.step === 'damage' && attackers.length > 1 && blocker?.zone === 'field' && (partyFirstStrike || blockerFirstStrike)) {
    if (partyFirstStrike) damage(blocker, attackers.reduce((sum, attacker) => sum + power(attacker), 0));
    if (blockerFirstStrike) {
      for (const [id, amount] of Object.entries(combat.allocation)) {
        const target = attackers.find(attacker => attacker.object === id);
        if (target) damage(target, amount);
      }
    }
    if (partyFirstStrike !== blockerFirstStrike) {
      combat.step = 'normalDamage';
      state.passes = 0;
      state.priority = state.active;
      events.push(event(state, 'combat.first-strike-checkpoint', { attackers: combat.attackers, blocker: blocker.object }));
      return events;
    }
    state.combat = null;
    state.priority = state.active;
    return events;
  }
  if ((!blocker || blocker.zone !== 'field') && !combat.wasBlocked) {
    const defender: Seat = other(state.active);
    events.push(...dealPlayerDamage(state, defender, 1, attackers[0]!.card, context));
  } else if (blocker?.zone === 'field') {
    const attackPower = attackers.reduce((sum, attacker) => sum + power(attacker), 0);
    const allocationEntries = Object.entries(combat.allocation).filter(([id, amount]) => attackers.some(attacker => attacker.object === id) && amount > 0);
    if (attackers.length > 1) {
      if (combat.step !== 'normalDamage' || !partyFirstStrike) damage(blocker, attackPower);
      if (combat.step !== 'normalDamage' || !blockerFirstStrike) {
        for (const [id, amount] of allocationEntries) {
          const target = attackers.find(attacker => attacker.object === id)!;
          damage(target, amount);
        }
      }
    } else if (combat.step === 'normalDamage') {
      const attacker = attackers[0]!;
      if (blocker?.zone === 'field' && !hasKeyword(state, attacker.object, 'First Strike', context)) {
        damage(blocker, power(attacker));
      } else if (blocker?.zone === 'field' && !hasKeyword(state, blocker.object, 'First Strike', context)) {
        damage(attacker, effectivePower(state, blocker.object, context));
      }
    } else {
      const attacker = attackers[0]!;
      const attackerFirst = hasKeyword(state, attacker.object, 'First Strike', context);
      const blockerFirst = hasKeyword(state, blocker.object, 'First Strike', context);
    if (attackerFirst && blockerFirst) { damage(blocker, power(attacker)); damage(attacker, power(blocker)); }
    else if (attackerFirst) { damage(blocker, power(attacker)); if (blocker.zone === 'field') damage(attacker, power(blocker)); }
    else if (blockerFirst) { damage(attacker, power(blocker)); if (attacker.zone === 'field') damage(blocker, power(attacker)); }
    else { const a = power(attacker); const b = power(blocker); damage(blocker, a); damage(attacker, b); }
    }
  }
  state.combat = null;
  state.priority = state.active;
  return events;
}
