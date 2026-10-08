import { advanceTurnStep } from './turns';
import { resolveCombat } from './combat';
import { expireTurnEffects } from './continuous';
import { runRuleCheckpoint } from './checkpoints';
import { hasLegalTriggerTarget, openTriggerTargetChoice } from './triggers';
import { openRuleChoice } from './rule-choice';
import { RULE_ENGINE_VERSION } from './rule-scripts';
import './delayed-script';
import type { EngineContext, MatchState, RuleEvent, Seat, StackItem } from './types';

function typedResume(context: EngineContext, card: string, ability: string) {
  const registered = context.registry?.manifest.cards.find(item => item.number === card);
  if (!registered || !context.registry) return undefined;
  return context.registry.card(card).abilities.some(item => item.id === ability)
    ? { script: card, version: registered.behaviorVersion, ability, step: 'resolve', payload: null } : undefined;
}

const other = (seat: Seat): Seat => seat === 0 ? 1 : 0;
function event(state: MatchState, type: string, data: RuleEvent['data']): RuleEvent {
  return { id: 'event-' + state.nextId++, type, data };
}

export function openTriggerOrder(state: MatchState, context: EngineContext): void {
  while (state.triggers.length > 0) {
    const group = state.triggers[0]!;
    const items = group.items.filter(item => hasLegalTriggerTarget(state, item, context));
    if (items.length !== group.items.length) {
      group.items = items;
    }
    if (items.length === 0) {
      state.triggers.shift();
      continue;
    }
    if (items.length === 1) {
      state.stack.push(items[0]!);
      state.triggers.shift();
      continue;
    }
    openRuleChoice(state, { seat: group.seat, kind: 'order',
      reason: 'Order your End Phase abilities as they are put on the stack (first selected resolves last).',
      options: items.map(item => ({ id: item.id, label: context.catalog[item.lastKnown.card]?.name ?? item.resume.ability,
        object: Object.values(state.cards).some(card => card.object === item.source) ? item.source : null })),
      min: items.length, max: items.length, allocation: null,
      resume: { script: 'rules', version: RULE_ENGINE_VERSION, ability: 'choice-triggers', step: 'order',
        payload: { seat: group.seat } } }, items[0]!.lastKnown);
    return;
  }
  openTriggerTargetChoice(state, context);
  state.priority = state.choice ? null : state.active;
}

/** Run one End Phase cleanup checkpoint after both players pass. */
export function runEndCheckpoint(state: MatchState, context: EngineContext): RuleEvent[] {
  if (state.phase !== 'end' || state.choice) return [];
  const hand = state.zones[state.active].hand;
  const excess = hand.length - 5;
  if (excess > 0) {
    const source = state.cards[hand[0]!]!;
    openRuleChoice(state, { seat: state.active, kind: 'cards',
      reason: `End Phase: discard ${excess} card${excess === 1 ? '' : 's'} to reach a hand of five.`,
      options: hand.map(instance => ({ id: state.cards[instance]!.object,
        label: context.catalog[state.cards[instance]!.card]?.name ?? state.cards[instance]!.card,
        object: state.cards[instance]!.object })),
      min: excess, max: excess, allocation: null,
      resume: { script: 'rules', version: RULE_ENGINE_VERSION, ability: 'choice-end-phase', step: 'discard',
        payload: { seat: state.active } } }, source);
    return [];
  }

  const events: RuleEvent[] = [];
  for (const instance of [...state.field]) state.cards[instance]!.damage = 0;
  expireTurnEffects(state, context);
  events.push(...runRuleCheckpoint(state, context));
  state.passes = 0;
  if (state.choice || state.execution.batch || state.stack.length > 0 || state.triggers.length > 0) {
    state.priority = state.choice ? null : state.active;
    return events;
  }
  state.active = other(state.active);
  state.turn += 1;
  state.phase = 'active';
  state.priority = null;
  events.push(...advanceTurnStep(state, context));
  return events;
}

/** Pass priority and advance an empty-stack timing window after both players pass. */
export function passPriority(state: MatchState, context: EngineContext): RuleEvent[] {
  if (state.priority === null) throw new Error('There is no player with priority.');
  if (state.phase === 'attack' && state.combat?.step === 'block' && state.priority !== state.active) {
    state.combat.step = 'damage';
    state.passes = 0;
    state.priority = state.choice ? null : state.active;
    return [event(state, 'combat.block-declined', { seat: other(state.active) })];
  }
  const events: RuleEvent[] = [event(state, 'priority.passed', { seat: state.priority })];
  state.passes += 1;
  if (state.passes === 1) {
    state.priority = other(state.priority);
    return events;
  }
  state.passes = 0;
  if (state.stack.length > 0) {
    const item = state.stack.pop()!;
    state.execution.frames.push({
      id: `frame-${state.nextId++}`, resume: item.resume, mode: 'stack', controller: item.controller,
      source: item.source, lastKnown: { ...item.lastKnown }, targets: [...item.targets], selectedMode: item.mode,
      remaining: [], returnWindow: { kind: 'priority', seat: state.active }, operationIndex: 0, scriptComplete: false,
    });
    state.priority = state.choice ? null : state.active;
    events.push(event(state, 'stack.resolved', { item: item.id, ability: item.resume.ability }));
    return events;
  }
  if (state.phase === 'attack' && state.combat) {
    if (state.combat.step === 'prepare') {
      state.combat.step = 'block';
      state.priority = other(state.active);
      events.push(event(state, 'combat.blockers-opened', { seat: state.priority }));
      return events;
    }
    if (state.combat.step === 'damage' || state.combat.step === 'normalDamage') {
      events.push(...resolveCombat(state, context));
      return events;
    }
  }
  switch (state.phase) {
    case 'main1': state.phase = 'attack'; break;
    case 'attack': state.phase = 'main2'; break;
    case 'main2': {
      state.phase = 'end';
      const grouped: Record<Seat, StackItem[]> = { 0: [], 1: [] };
      const delayed = state.execution.delayed.filter(effect =>
        effect.controller === state.active && effect.at === 'controller-end' && effect.eligibleTurn <= state.turn);
      for (const effect of delayed) grouped[effect.controller].push({
        id: `stack-${state.nextId++}`, controller: effect.controller, source: effect.source,
        lastKnown: { ...effect.lastKnown }, targets: [], mode: null, data: {}, resume: effect.resume,
      });
      state.execution.delayed = state.execution.delayed.filter(effect => !delayed.some(item => item.id === effect.id));
      for (const instance of state.field) {
        const source = state.cards[instance]!;
        if (source.controller !== state.active) continue;
        const abilities = context.catalog[source.card]?.abilities.filter(ability =>
          ability.kind === 'auto' && ability.trigger === 'end-phase' && typedResume(context, source.card, ability.id)) ?? [];
        for (const ability of abilities) {
          const resume = typedResume(context, source.card, ability.id);
          if (!resume) continue;
          grouped[source.controller].push({
            id: `stack-${state.nextId++}`, controller: source.controller, source: source.object, lastKnown: { ...source },
            targets: [], mode: null,
            data: JSON.parse(JSON.stringify({ source: source.object, seat: source.controller, ability: ability.id, targets: [],
              ...(ability.target ? { declarationTarget: ability.target } : {}) })) as import('./types').Json,
            resume,
          });
        }
      }
      for (const seat of [state.active, other(state.active)] as const) {
        if (grouped[seat].length > 0) state.triggers.push({ seat, items: grouped[seat] });
      }
      openTriggerOrder(state, context);
      break;
    }
    case 'end':
      events.push(...runEndCheckpoint(state, context));
      return events;
    default: throw new Error('Priority cannot advance during an automatic phase.');
  }
  state.priority = state.choice ? null : state.phase === 'end' ? state.active : state.stack.length > 0 ? other(state.active) : state.active;
  events.push(event(state, 'phase.started', { phase: state.phase, turn: state.turn, active: state.active }));
  return events;
}
