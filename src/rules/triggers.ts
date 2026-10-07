import { effectivePower } from './continuous';
import { openTriggerOrder } from './priority';
import type { CardObject, EngineContext, MatchState, Seat, Zone } from './types';

function typedResume(context: EngineContext, card: string, ability: string, payload: import('./types').Json = null) {
  const registered = context.registry?.manifest.cards.find(item => item.number === card);
  if (!registered || !context.registry) return undefined;
  const script = context.registry.card(card).abilities.find(item => item.id === ability);
  return script ? { script: card, version: registered.behaviorVersion, ability, step: 'resolve', payload } : undefined;
}

const other = (seat: Seat): Seat => seat === 0 ? 1 : 0;

function targetOptions(state: MatchState, controller: Seat, target: import('./types').AbilityTargetRule,
  context: EngineContext) {
  return state.field.map(instance => state.cards[instance]!).filter(card => {
    const definition = context.catalog[card.card];
    if (!definition || !target.zones.includes(card.zone) || !target.types.includes(definition.type)) return false;
    if (target.elements.length && !target.elements.some(element => definition.elements.includes(element))) return false;
    if (target.owner === 'you' && card.owner !== controller) return false;
    if (target.controller === 'you' && card.controller !== controller) return false;
    if (target.controller === 'opponent' && card.controller === controller) return false;
    return target.dull === null || card.dull === target.dull;
  }).map(card => ({ id: card.object, label: context.catalog[card.card]!.name, object: card.object }));
}

/** Check required trigger targets before asking its controller to order simultaneous abilities. */
export function hasLegalTriggerTarget(state: MatchState, item: import('./types').StackItem, context: EngineContext): boolean {
  const data = item.data && typeof item.data === 'object' && !Array.isArray(item.data)
    ? item.data as Record<string, import('./types').Json> : {};
  const raw = data.declarationTarget;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return true;
  return targetOptions(state, item.controller, raw as unknown as import('./types').AbilityTargetRule, context).length > 0;
}

/** Publish the next required trigger target before players receive priority. */
export function openTriggerTargetChoice(state: MatchState, context: EngineContext): void {
  while (!state.choice) {
    const item = state.stack.find(candidate => {
      const data = candidate.data && typeof candidate.data === 'object' && !Array.isArray(candidate.data)
        ? candidate.data as Record<string, import('./types').Json> : {};
      return typeof data.declarationTarget === 'object' && data.declarationTarget !== null;
    });
    if (!item) return;
    const data = item.data as Record<string, import('./types').Json>;
    const rule = data.declarationTarget as unknown as import('./types').AbilityTargetRule;
    const options = targetOptions(state, item.controller, rule, context);
    if (options.length === 0) {
      state.stack.splice(state.stack.indexOf(item), 1);
      continue;
    }
    state.choice = {
      id: `choice-${state.nextId++}`, seat: item.controller, kind: 'targets',
      reason: `${context.catalog[item.lastKnown.card]?.name ?? 'Triggered ability'}: choose a target.`,
      options, min: 1, max: 1, allocation: null,
      resume: { handler: 'trigger-declaration', step: 'target', data: { item: item.id } },
    };
    state.priority = null;
    state.passes = 0;
  }
}

/** Put supported auto abilities triggered by a Character entering on the rules stack. */
export function scheduleEntryAbilities(state: MatchState, instance: string, context: EngineContext): void {
  const source = state.cards[instance];
  const definition = source && context.catalog[source.card];
  if (!source || source.zone !== 'field' || !definition) return;
  const abilities = definition.abilities.filter(ability => ability.kind === 'auto' && ability.trigger === 'enter' &&
    (context.handlers?.[ability.handler] || typedResume(context, source.card, ability.id)));
  const items: import('./types').StackItem[] = [];
  for (const ability of abilities) {
    const resume = typedResume(context, source.card, ability.id);
    items.push({
      id: `stack-${state.nextId++}`, controller: source.controller, source: source.object, lastKnown: { ...source },
      handler: ability.handler, targets: [], mode: null,
      data: JSON.parse(JSON.stringify({ source: source.object, seat: source.controller, ability: ability.id, targets: [],
        ...(ability.target ? { declarationTarget: ability.target } : {}) })) as import('./types').Json,
      ...(resume ? { resume } : {}),
    });
  }
  if (items.length > 0) {
    if (items.length > 1) state.triggers.push({ handler: 'trigger-order', step: 'order',
      data: JSON.parse(JSON.stringify({ seat: source.controller, items })) as import('./types').Json });
    else state.stack.push(items[0]!);
    state.passes = 0;
    if (state.triggers.length > 0) openTriggerOrder(state, context);
    else {
      openTriggerTargetChoice(state, context);
      if (!state.choice) state.priority = source.controller;
    }
  }
}

/** Collect triggers that observe a card leaving the field, using its last field values. */
export function scheduleDepartureAbilities(state: MatchState, departed: CardObject, destination: Zone, context: EngineContext,
  lastPower = 0, observers?: readonly CardObject[], deferOrdering = false): void {
  if (context.catalog[departed.card]?.type !== 'Forward') return;
  const pending: Array<{ source: CardObject; handler: string; data: Record<string, string | number>; target?: import('./types').AbilityTargetRule }> = [];
  const sources = observers ?? state.field.map(instance => state.cards[instance]!).filter(Boolean);
  for (const source of sources) {
    if (source.controller !== departed.controller) continue;
    for (const ability of context.catalog[source.card]?.abilities ?? []) {
      if (ability.kind === 'auto' && ability.trigger === 'controlled-forward-leaves' &&
          (!ability.triggerDestination || ability.triggerDestination.includes(destination))) {
        pending.push({ source, handler: ability.handler, data: { seat: source.controller },
          ...(ability.target ? { target: ability.target } : {}) });
      }
    }
  }
  if (destination === 'break') {
    for (const ability of context.catalog[departed.card]?.abilities ?? []) {
      if (ability.kind === 'auto' && ability.trigger === 'self-break') {
        pending.push({ source: departed, handler: ability.handler, data: { seat: departed.controller, lastPower },
          ...(ability.target ? { target: ability.target } : {}) });
      }
    }
  }
  const grouped: Record<Seat, import('./types').StackItem[]> = { 0: [], 1: [] };
  for (const trigger of pending) {
    const abilityId = Object.entries(context.catalog[trigger.source.card]?.abilities ?? {})
      .find(([, ability]) => ability.handler === trigger.handler)?.[1]?.id;
    const resume = abilityId ? typedResume(context, trigger.source.card, abilityId,
      typeof trigger.data.lastPower === 'number' ? trigger.data.lastPower : null) : undefined;
    if (!context.handlers?.[trigger.handler] && !resume) continue;
    grouped[trigger.source.controller].push({ id: `stack-${state.nextId++}`, controller: trigger.source.controller,
      source: trigger.source.object, lastKnown: { ...trigger.source }, handler: trigger.handler,
      targets: [], mode: null, data: JSON.parse(JSON.stringify({ source: trigger.source.object, ...trigger.data,
        targets: [], ...(trigger.target ? { declarationTarget: trigger.target } : {}) })) as import('./types').Json,
      ...(resume ? { resume } : {}) });
  }
  for (const seat of [state.active, other(state.active)] as const) {
    if (grouped[seat].length === 0) continue;
    const existing = deferOrdering ? state.triggers.find(trigger => {
      if (trigger.handler !== 'trigger-order' || trigger.step !== 'order' || !trigger.data ||
          typeof trigger.data !== 'object' || Array.isArray(trigger.data)) return false;
      return (trigger.data as Record<string, import('./types').Json>).seat === seat;
    }) : undefined;
    if (existing && existing.data && typeof existing.data === 'object' && !Array.isArray(existing.data)) {
      const data = existing.data as Record<string, import('./types').Json>;
      const prior = Array.isArray(data.items) ? data.items : [];
      existing.data = JSON.parse(JSON.stringify({ ...data, items: [...prior, ...grouped[seat]] })) as import('./types').Json;
    } else {
      const trigger = { handler: 'trigger-order', step: 'order',
        data: JSON.parse(JSON.stringify({ seat, items: grouped[seat] })) as import('./types').Json };
      const nonactiveGroupIndex = deferOrdering ? state.triggers.findIndex(candidate => {
        if (candidate.handler !== 'trigger-order' || !candidate.data || typeof candidate.data !== 'object' || Array.isArray(candidate.data)) return false;
        return (candidate.data as Record<string, import('./types').Json>).seat === other(state.active);
      }) : -1;
      if (deferOrdering && seat === state.active && nonactiveGroupIndex >= 0) {
        state.triggers.splice(nonactiveGroupIndex, 0, trigger);
      } else state.triggers.push(trigger);
    }
  }
  if (!deferOrdering && state.triggers.length > 0) openTriggerOrder(state, context);
}
