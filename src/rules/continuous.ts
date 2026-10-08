import type { Catalog, EffectRecord, EngineContext, Keyword, MatchState, ObjectId, Seat } from './types';

type EffectDraft =
  | { kind: 'power-set'; controller: Seat; source: ObjectId; object: ObjectId; value: number; expiresTurn: number | null }
  | { kind: 'power-modifier'; controller: Seat; source: ObjectId; object: ObjectId; amount: number; expiresTurn: number | null }
  | { kind: 'keyword-add'; controller: Seat; source: ObjectId; object: ObjectId; keyword: Keyword; expiresTurn: number | null }
  | { kind: 'borrowed-control'; controller: Seat; source: ObjectId; object: ObjectId; expiresTurn: number | null };
export function effectivePower(state: MatchState, object: ObjectId,
  context: Pick<EngineContext, 'catalog' | 'registry'>): number {
  const card = Object.values(state.cards).find(item => item.object === object);
  if (!card) return 0;
  const definition = context.catalog[card.card];
  if (!definition || definition.power === null) return 0;
  let power = definition.power;
  const applicable = state.effects.filter(effect => effect.object === object &&
    (effect.expiresTurn === null || effect.expiresTurn >= state.turn)).sort((a, b) => a.timestamp - b.timestamp);
  for (const effect of applicable) {
    if (effect.kind === 'power-set') power = effect.value;
  }
  for (const effect of applicable) {
    if (effect.kind === 'power-modifier') power += effect.amount;
  }
  for (const instance of state.field) {
    const support = state.cards[instance]!;
    if (support.controller === card.controller) {
      const script = context.registry?.manifest.cards.some(item => item.number === support.card)
        ? context.registry.card(support.card) : undefined;
      const typedPower = script?.abilities.flatMap(ability => ability.fieldEffects.flatMap(provider =>
        provider.effects(state, support, context.catalog))).filter((operation): operation is Extract<import('./contracts/execution').Operation, { kind: 'power' }> =>
          operation.kind === 'power' && operation.object === object && operation.mode === 'add');
      if (typedPower?.length) power += typedPower.reduce((sum, operation) => sum + operation.value, 0);
    }
  }
  return Math.max(0, power);
}
export function hasKeyword(state: MatchState, object: ObjectId, keyword: Keyword, context: Pick<EngineContext, 'catalog'> | { catalog: Catalog }): boolean {
  const card = Object.values(state.cards).find(item => item.object === object);
  if (!card) return false;
  if (context.catalog[card.card]?.keywords.includes(keyword)) return true;
  return state.effects.some(effect => {
    return effect.kind === 'keyword-add' && effect.object === object && effect.keyword === keyword &&
      (effect.expiresTurn === null || effect.expiresTurn >= state.turn);
  });
}
export function addEffect(state: MatchState, effect: EffectDraft): void {
  state.effects.push({ id: `effect-${state.nextId++}`, timestamp: state.nextId, ...effect } as EffectRecord);
}
export function addKeyword(state: MatchState, source: ObjectId, object: ObjectId, keyword: Keyword, expiresTurn: number): void {
  addEffect(state, { kind: 'keyword-add', controller: state.active, source, object, keyword, expiresTurn });
}
export function addPower(state: MatchState, source: ObjectId, object: ObjectId, amount: number, expiresTurn: number): void {
  addEffect(state, { kind: 'power-modifier', controller: state.active, source, object, amount, expiresTurn });
}
export function setPower(state: MatchState, source: ObjectId, object: ObjectId, value: number, expiresTurn: number): void {
  addEffect(state, { kind: 'power-set', controller: state.active, source, object, value, expiresTurn });
}
export function recomputeControl(state: MatchState, context: Pick<EngineContext, 'catalog'>): void {
  for (const instance of state.field) {
    const target = state.cards[instance];
    if (!target || !context.catalog[target.card]) continue;
    const activeControl = state.effects.filter(effect => effect.kind === 'borrowed-control' &&
      effect.object === target.object && (effect.expiresTurn === null || effect.expiresTurn >= state.turn))
      .sort((a, b) => a.timestamp - b.timestamp).at(-1);
    const controller = activeControl?.controller ?? target.owner;
    if (target.controller !== controller) {
      target.controller = controller;
      target.controlledSinceTurn = state.turn;
    }
  }
}

export function expireTurnEffects(state: MatchState, context: Pick<EngineContext, 'catalog'>): void {
  state.effects = state.effects.filter(effect => effect.expiresTurn === null || effect.expiresTurn > state.turn);
  recomputeControl(state, context);
}
export function changeControl(state: MatchState, source: ObjectId, object: ObjectId, controller: 0 | 1, expiresTurn: number | null): void {
  const target = Object.values(state.cards).find(card => card.object === object);
  if (!target) return;
  if (target.controller !== controller) {
    target.controller = controller;
    target.controlledSinceTurn = state.turn;
  }
  addEffect(state, { kind: 'borrowed-control', controller, source, object, expiresTurn });
}
