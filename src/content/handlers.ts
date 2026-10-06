import { requestDeparture } from '../rules/commander';
import { addPower, effectivePower } from '../rules/continuous';
import { replacementDamage } from '../rules/damage';
import { moveCard } from '../rules/zones';
import { shuffle } from '../rules/random';
import type { AbilityHandler, Json, RuleEvent, Seat } from '../rules/types';

function payload(data: Json): { source?: string; targets?: string[] } {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const row = data as Record<string, Json>;
  const result: { source?: string; targets?: string[] } = {};
  if (typeof row.source === 'string') result.source = row.source;
  if (Array.isArray(row.targets) && row.targets.every(item => typeof item === 'string')) result.targets = row.targets as string[];
  return result;
}
function emit(state: Parameters<AbilityHandler>[0]['state'], type: string, data: RuleEvent['data']): RuleEvent {
  return { id: `event-${state.nextId++}`, type, data };
}
function card(state: Parameters<AbilityHandler>[0]['state'], object: string) {
  return Object.values(state.cards).find(item => item.object === object);
}
function damageForward(context: Parameters<AbilityHandler>[0], object: string, amount: number): RuleEvent[] {
  const target = card(context.state, object);
  if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward') return [];
  const applied = replacementDamage(context.state, target.object, amount, context);
  target.damage += applied;
  const events = [emit(context.state, 'forward.damaged', { object: target.object, amount: applied, prevented: amount - applied })];
  if (target.damage >= effectivePower(context.state, target.object, context)) {
    const receipt = requestDeparture(context.state, target.instance, 'break');
    if (receipt) events.push(emit(context.state, 'forward.broken', { object: receipt.old.object, card: receipt.old.card, destination: 'break' }));
  }
  return events;
}
function handler(run: (context: Parameters<AbilityHandler>[0], source: string, targets: string[]) => RuleEvent[]): AbilityHandler {
  return context => {
    const data = payload(context.frame.data);
    const source = data.source ?? '';
    const targets = data.targets ?? [];
    return { events: run(context, source, targets), next: [], choice: context.state.choice };
  };
}

export const abilityHandlers: Readonly<Record<string, AbilityHandler>> = {
  'forge-apprentice-buff': handler((context, source, targets) => {
    const target = card(context.state, targets[0] ?? '');
    if (!target || target.zone !== 'field') return [];
    addPower(context.state, source, target.object, 1000, context.state.turn);
    return [emit(context.state, 'forward.power-increased', { object: target.object, amount: 1000 })];
  }),
  'wave-apprentice-activate': handler((context, _source, targets) => {
    const target = card(context.state, targets[0] ?? '');
    if (!target || target.zone !== 'field') return [];
    target.dull = false;
    return [emit(context.state, 'card.activated', { object: target.object, seat: target.controller })];
  }),
  'recovery-clerk-bottom': handler((context, _source, targets) => {
    const target = card(context.state, targets[0] ?? '');
    if (!target || target.zone !== 'break') return [];
    const old = moveCard(context.state, target.instance, 'deck', context.state.zones[target.owner].deck.length);
    return [emit(context.state, 'card.returned-to-deck', { card: old.card, seat: old.owner })];
  }),
  'ember-medic-recover': handler((context, _source, targets) => {
    const target = card(context.state, targets[0] ?? '');
    if (!target || target.zone !== 'break') return [];
    const old = moveCard(context.state, target.instance, 'hand');
    return [emit(context.state, 'card.recovered', { card: old.card, seat: old.owner })];
  }),
  'cinder-marshal-special': handler((context, _source, targets) => damageForward(context, targets[0] ?? '', 7000)),
  'tide-warden-special': handler((context, _source, targets) => {
    const target = card(context.state, targets[0] ?? '');
    if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward') return [];
    const receipt = requestDeparture(context.state, target.instance, 'hand');
    return receipt ? [emit(context.state, 'forward.returned', { card: receipt.old.card, owner: receipt.old.owner })] : [];
  }),
  'dusk-reaver-enter': chooseForward('Dusk Reaver', (context, target) => {
    addPower(context.state, context.frame.handler, target.object, -2000, context.state.turn);
    return emit(context.state, 'forward.power-reduced', { object: target.object, amount: 2000 });
  }),
  'frost-binder-enter': chooseForward('Frost Binder', (_context, target) => {
    target.dull = true;
    target.frozen = true;
    return emit(_context.state, 'forward.dulled-and-frozen', { object: target.object });
  }),
  'tide-warden-activate': chooseForward('Tide Warden', (context, target) => {
    target.dull = false;
    return emit(context.state, 'card.activated', { object: target.object, seat: target.controller });
  }),
  'mist-caller-activate': chooseForward('Mist Caller', (context, target) => {
    target.dull = false;
    return emit(context.state, 'card.activated', { object: target.object, seat: target.controller });
  }),
  'quartermaster-search': quartermasterSearch,
  'rising-undertow-end-discard': risingUndertowDiscard,
  'archive-keeper-draw-discard': archiveKeeperDrawDiscard,
};

function chooseForward(
  name: string,
  apply: (context: Parameters<AbilityHandler>[0], target: NonNullable<ReturnType<typeof card>>) => RuleEvent,
): AbilityHandler {
  return context => {
    const data = payload(context.frame.data);
    const extra = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
      ? context.frame.data as Record<string, Json> : {};
    if (context.frame.step === 'choice') {
      const selected = Array.isArray(extra.selected) ? extra.selected[0] : undefined;
      const target = typeof selected === 'string' ? card(context.state, selected) : undefined;
      if (!target || target.zone !== 'field' || context.catalog[target.card]?.type !== 'Forward') {
        return { events: [], next: [], choice: null };
      }
      return { events: [apply(context, target)], next: [], choice: null };
    }
    const seat = extra.seat === 1 ? 1 : 0;
    const forwards = context.state.field.map(instance => context.state.cards[instance]!)
      .filter(target => context.catalog[target.card]?.type === 'Forward');
    if (forwards.length === 0) return { events: [], next: [], choice: null };
    return {
      events: [], next: [], choice: {
        id: `choice-${context.state.nextId++}`, seat, kind: 'targets',
        reason: `${name}: choose a Forward.`,
        options: forwards.map(target => ({ id: target.object, label: context.catalog[target.card]!.name, object: target.object })),
        min: 1, max: 1, allocation: null,
        resume: { handler: context.frame.handler, step: 'choice', data: { source: data.source ?? '', seat, selected: [] } },
      },
    };
  };
}

function quartermasterSearch(context: Parameters<AbilityHandler>[0]) {
  const data = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
    ? context.frame.data as Record<string, Json> : {};
  const seat: Seat = data.seat === 1 ? 1 : 0;
  if (context.frame.step === 'choice') {
    const selected = Array.isArray(data.selected) ? data.selected[0] : undefined;
    if (selected === 'skip') return { events: [emit(context.state, 'card.search-skipped', { seat })], next: [], choice: null };
    const target = typeof selected === 'string' ? card(context.state, selected) : undefined;
    if (!target || target.owner !== seat || target.zone !== 'deck' || !context.catalog[target.card]?.jobs.includes('Soldier')) {
      return { events: [], next: [], choice: null };
    }
    const old = moveCard(context.state, target.instance, 'hand');
    const result = shuffle(context.state.zones[seat].deck, context.state.rng);
    context.state.zones[seat].deck = result.items;
    context.state.rng = result.seed;
    return { events: [emit(context.state, 'card.searched', { seat, card: old.card })], next: [], choice: null };
  }
  const options = context.state.zones[seat].deck.map(instance => context.state.cards[instance]!)
    .filter(target => context.catalog[target.card]?.jobs.includes('Soldier'))
    .map(target => ({ id: target.object, label: context.catalog[target.card]!.name, object: target.object }));
  return {
    events: [], next: [], choice: {
      id: `choice-${context.state.nextId++}`, seat, kind: 'cards' as const,
      reason: 'Quartermaster: search your main deck for a Soldier, add it to your hand, then shuffle.',
      options: [...options, { id: 'skip', label: 'Do not search', object: null }],
      min: 1, max: 1, allocation: null,
      resume: { handler: 'quartermaster-search', step: 'choice', data: { seat, selected: [] } },
    },
  };
}

function risingUndertowDiscard(context: Parameters<AbilityHandler>[0]) {
  const data = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
    ? context.frame.data as Record<string, Json> : {};
  const seat: Seat = data.seat === 1 ? 1 : 0;
  if (context.frame.step === 'choice') {
    const selected = Array.isArray(data.selected) ? data.selected[0] : undefined;
    const target = typeof selected === 'string' ? card(context.state, selected) : undefined;
    if (!target || target.zone !== 'hand' || target.owner !== seat) return { events: [], next: [], choice: null };
    const old = moveCard(context.state, target.instance, 'break');
    return { events: [emit(context.state, 'card.discarded', { seat, card: old.card, reason: 'Rising Undertow' })], next: [], choice: null };
  }
  const hand = context.state.zones[seat].hand;
  if (hand.length === 0) return { events: [], next: [], choice: null };
  return {
    events: [], next: [], choice: {
      id: `choice-${context.state.nextId++}`, seat, kind: 'cards' as const,
      reason: 'Rising Undertow: discard 1 card at the beginning of your End Phase.',
      options: hand.map(instance => ({ id: context.state.cards[instance]!.object, label: context.catalog[context.state.cards[instance]!.card]!.name, object: context.state.cards[instance]!.object })),
      min: 1, max: 1, allocation: null,
      resume: { handler: 'rising-undertow-end-discard', step: 'choice', data: { seat, selected: [] } },
    },
  };
}

function archiveKeeperDrawDiscard(context: Parameters<AbilityHandler>[0]) {
  const data = context.frame.data && typeof context.frame.data === 'object' && !Array.isArray(context.frame.data)
    ? context.frame.data as Record<string, Json> : {};
  const seat: Seat = data.seat === 1 ? 1 : 0;
  if (context.frame.step === 'choice') {
    const selected = Array.isArray(data.selected) ? data.selected[0] : undefined;
    const target = typeof selected === 'string' ? card(context.state, selected) : undefined;
    if (!target || target.zone !== 'hand' || target.owner !== seat) return { events: [], next: [], choice: null };
    const old = moveCard(context.state, target.instance, 'break');
    return { events: [emit(context.state, 'card.discarded', { seat, card: old.card, reason: 'Archive Keeper' })], next: [], choice: null };
  }
  const instance = context.state.zones[seat].deck[0];
  const events: RuleEvent[] = [];
  if (!instance) {
    context.state.work.push({ handler: 'rule-process', step: 'empty-deck', data: { seat } });
    events.push(emit(context.state, 'player.attempted-empty-draw', { seat, source: 'Archive Keeper' }));
  } else {
    const old = moveCard(context.state, instance, 'hand');
    events.push(emit(context.state, 'card.drawn', { seat, card: old.card, source: 'Archive Keeper' }));
  }
  const hand = context.state.zones[seat].hand;
  if (hand.length === 0) return { events, next: [], choice: null };
  return {
    events, next: [], choice: {
      id: `choice-${context.state.nextId++}`, seat, kind: 'cards' as const,
      reason: 'Archive Keeper: discard 1 card.',
      options: hand.map(item => ({ id: context.state.cards[item]!.object, label: context.catalog[context.state.cards[item]!.card]!.name, object: context.state.cards[item]!.object })),
      min: 1, max: 1, allocation: null,
      resume: { handler: 'archive-keeper-draw-discard', step: 'choice', data: { seat, selected: [] } },
    },
  };
}
