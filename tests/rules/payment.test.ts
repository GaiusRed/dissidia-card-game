import { describe, expect, it } from 'vitest';
import { assertInvariants } from '../../src/rules/invariants';
import { validatePayment, commitPayment } from '../../src/rules/payment';
import { applyCommand } from '../../src/rules/engine';
import { legalActions } from '../../src/rules/actions';
import { castCharacter } from '../../src/rules/casting';
import { runScheduler } from '../../src/rules/scheduler';
import { moveCard } from '../../src/rules/zones';
import { fixture, context } from '../support/harness';
import { opusPhRegistry } from '../../src/content/manifest';
import { abilityHandlers as forgeHandlers } from '../../src/content/cards/opus-ph/P-010C';
import type { AbilityDefinition, CostSpec, Element, EngineContext, Payment } from '../../src/rules/types';

const payment = (changes: Partial<Payment> = {}): Payment => ({
  discard: [], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
  sourceElements: {}, spend: {}, ...changes,
});
const cost = (amount: number, elements: Element[] = ['Fire']): CostSpec => ({
  amount, elements, dullSource: false, sacrificeSource: false, specialDiscardName: null,
});
describe('CP payment', () => {
  it('puts the registered activated-ability resolver on the stack', () => {
    const h = fixture({ phase: 'main1', placements: [
      { seat: 0, card: 'P-001L', zone: 'field' }, { seat: 0, card: 'P-002C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-005R', zone: 'field' },
    ] });
    h.state.priority = 0;
    const source = h.object(0, 'P-001L');
    const target = h.object(0, 'P-005R');
    const otherMarshal = h.object(0, 'P-002C');
    const engine = { ...context, catalog: { ...context.catalog, 'P-002C': { ...context.catalog['P-002C']!, name: 'Cinder Marshal' } }, registry: opusPhRegistry };
    const result = applyCommand(h.state, { id: 'typed-activation', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'activate', source, ability: 'flare-order', targets: [target], payment: payment({
        specialDiscard: otherMarshal, dullSource: true, dullBackups: [h.object(0, 'P-009C')],
        sourceElements: { [h.object(0, 'P-009C')]: 'Fire' }, spend: { Fire: 1 },
      }),
    } }, engine);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.stack.at(-1)?.resume).toEqual({ script: 'P-001L', version: '1', ability: 'flare-order', step: 'resolve', payload: null });
    let state = result.state;
    for (const seat of [0, 1] as const) {
      const passed = applyCommand(state, { id: `typed-activation-pass-${seat}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, engine);
      expect(passed.ok).toBe(true);
      if (!passed.ok) return;
      state = passed.state;
    }
    expect(Object.values(state.cards).find(card => card.card === 'P-005R')?.damage).toBe(7000);
  });

  it('applies Commander replacement when an activated ability sacrifices its Commander source', () => {
    const h = fixture({ phase: 'main1', placements: [
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-005R', zone: 'field' },
    ] });
    const commander = h.state.cards[h.state.commanders[0].instance]!;
    moveCard(h.state, commander.instance, 'field');
    h.state.priority = 0;
    const sourceDefinition = context.catalog['P-010C']!;
    const sacrificeAbility: AbilityDefinition = { ...sourceDefinition.abilities[0]!, id: 'test-commander-sacrifice', activation: {
      cost: 1, elements: ['Fire'], dullSource: false, sacrificeSource: true, specialDiscardName: null,
      target: { zones: ['field'], types: ['Forward'], elements: ['Fire'], owner: 'any', controller: 'any', dull: null },
    } };
    const custom: EngineContext = { ...context, handlers: forgeHandlers, catalog: { ...context.catalog, 'P-001L': {
      ...context.catalog['P-001L']!, abilities: [sacrificeAbility],
    } } };
    const backup = h.object(0, 'P-009C');
    const target = h.object(0, 'P-005R');
    const result = applyCommand(h.state, { id: 'commander-cost-sacrifice', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'activate', source: commander.object, ability: sacrificeAbility.id, targets: [target], payment: {
        discard: [], dullBackups: [backup], specialDiscard: null, dullSource: false, sacrificeSource: true,
        sourceElements: { [backup]: 'Fire' }, spend: { Fire: 1 },
      },
    } }, custom);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.choice?.resume).toMatchObject({ script: 'rules', ability: 'batch', step: 'commander-departure' });
    expect(result.state.stack).toHaveLength(1);
    expect(result.state.cards[commander.instance]!.zone).toBe('field');
    const restored = JSON.parse(JSON.stringify(result.state)) as typeof result.state;
    const choice = restored.choice!;
    const returned = applyCommand(restored, { id: 'commander-cost-return', expectedSeq: restored.seq, seat: 0, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: ['return'], amounts: {} },
    } }, custom);
    expect(returned.ok).toBe(true);
    if (!returned.ok) return;
    expect(returned.state.cards[commander.instance]!.zone).toBe('commander');
    expect(returned.state.stack).toHaveLength(1);
    expect(returned.events).toContainEqual(expect.objectContaining({ type: 'card.moved', data: expect.objectContaining({ object: commander.object }) }));
    expect(returned.events).toContainEqual(expect.objectContaining({ type: 'card.status-changed', data: expect.objectContaining({ object: backup }) }));
  });

  it('generates two CP per discard and one per dull Backup, while spending the exact cost', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' },
    ] });
    const selected = payment({
      discard: [h.object(0, 'P-003C')], dullBackups: [h.object(0, 'P-009C')],
      sourceElements: { [h.object(0, 'P-003C')]: 'Fire', [h.object(0, 'P-009C')]: 'Fire' },
      spend: { Fire: 3 },
    });
    expect(validatePayment(h.state, 0, h.object(0, 'P-005R'), selected, cost(3), context)).toEqual([]);
    commitPayment(h.state, 0, h.object(0, 'P-005R'), selected, cost(3), context);
    expect(h.state.execution.batch?.operations).toHaveLength(2);
    expect(h.state.zones[0].break.map(id => h.state.cards[id]!.card)).not.toContain('P-003C');
    expect(h.state.cards[Object.keys(h.state.cards).find(id => h.state.cards[id]!.card === 'P-009C')!]!.dull).toBe(false);
    expect(runScheduler(h.state, context).error).toBeNull();
    expect(h.state.zones[0].break.map(id => h.state.cards[id]!.card)).toContain('P-003C');
    expect(h.state.cards[Object.keys(h.state.cards).find(id => h.state.cards[id]!.card === 'P-009C')!]!.dull).toBe(true);
    assertInvariants(h.state, context);
  });
  it('expires unused generated CP when a discard pays a one-CP cost', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-002C', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
    ] });
    const selected = payment({ discard: [h.object(0, 'P-003C')], sourceElements: { [h.object(0, 'P-003C')]: 'Fire' }, spend: { Fire: 1 } });
    expect(validatePayment(h.state, 0, h.object(0, 'P-002C'), selected, cost(1), context)).toEqual([]);
  });
  it('allows any generated element to pay a Light or Dark card cost', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-008H', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' },
    ] });
    const source = h.object(0, 'P-008H');
    const discard = h.object(0, 'P-003C');
    const backup = h.object(0, 'P-009C');
    const selected = payment({ discard: [discard], dullBackups: [backup],
      sourceElements: { [discard]: 'Fire', [backup]: 'Fire' }, spend: { Fire: 3 } });
    expect(validatePayment(h.state, 0, source, selected, cost(3, ['Light']), context)).toEqual([]);
  });
  it('rejects Dark CP discards, a missing matching element and underpayment', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'hand' },
      { seat: 0, card: 'P-008H', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'hand' },
    ] });
    const source = h.object(0, 'P-005R');
    const darkDiscard = payment({ discard: [h.object(0, 'P-008H')], sourceElements: { [h.object(0, 'P-008H')]: 'Light' }, spend: { Fire: 2 } });
    expect(validatePayment(h.state, 0, source, darkDiscard, cost(2), context).map(e => e.code)).toContain('INVALID_CP_SOURCE');
    const noFire = payment({ discard: [h.object(0, 'P-003C')], sourceElements: { [h.object(0, 'P-003C')]: 'Fire' }, spend: { Water: 2 } });
    expect(validatePayment(h.state, 0, source, noFire, cost(2), context).map(e => e.code)).toEqual(expect.arrayContaining(['UNGENERATED_CP', 'ELEMENT_REQUIREMENT']));
    expect(validatePayment(h.state, 0, source, noFire, cost(3), context).map(e => e.code)).toContain('UNDERPAYMENT');
  });
  it('does not let a special-discard card also produce CP', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-001L', zone: 'field' },
      { seat: 0, card: 'P-002C', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'hand' },
    ] });
    const selected = payment({
      discard: [h.object(0, 'P-002C'), h.object(0, 'P-003C')],
      specialDiscard: h.object(0, 'P-002C'),
      sourceElements: { [h.object(0, 'P-002C')]: 'Fire', [h.object(0, 'P-003C')]: 'Fire' },
      spend: { Fire: 4 },
    });
    expect(validatePayment(h.state, 0, h.object(0, 'P-001L'), selected, cost(3), context).map(e => e.code)).toContain('DUPLICATE_COST_SOURCE');
  });
  it('rejects removable surplus CP sources', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' },
    ] });
    const selected = payment({
      discard: [h.object(0, 'P-003C')], dullBackups: [h.object(0, 'P-009C')],
      sourceElements: { [h.object(0, 'P-003C')]: 'Fire', [h.object(0, 'P-009C')]: 'Fire' }, spend: { Fire: 1 },
    });
    expect(validatePayment(h.state, 0, h.object(0, 'P-005R'), selected, cost(1), context).map(error => error.code))
      .toContain('EXCESS_CP_SOURCE');
  });

  it('rejects four generated CP for a one-CP cost even when the spend is exact', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'hand' }, { seat: 0, card: 'P-004C', zone: 'hand' },
    ] });
    const first = h.object(0, 'P-003C');
    const second = h.state.zones[0].hand.map(id => h.state.cards[id]!).find(card => card.object !== h.object(0, 'P-005R') && card.object !== first)!.object;
    const selected = payment({ discard: [first, second], sourceElements: { [first]: 'Fire', [second]: 'Fire' }, spend: { Fire: 1 } });
    expect(validatePayment(h.state, 0, h.object(0, 'P-005R'), selected, cost(1), context).map(error => error.code))
      .toEqual(expect.arrayContaining(['EXCESS_CP', 'EXCESS_CP_SOURCE']));
  });

  it('rejects duplicate CP sources and element assignments that do not come from the source', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
    ] });
    const source = h.object(0, 'P-005R');
    const discard = h.object(0, 'P-003C');
    const duplicate = payment({ discard: [discard], dullBackups: [discard], sourceElements: { [discard]: 'Water' }, spend: { Water: 2 } });
    expect(validatePayment(h.state, 0, source, duplicate, cost(2), context).map(error => error.code))
      .toEqual(expect.arrayContaining(['DUPLICATE_COST_SOURCE', 'INVALID_CP_ELEMENT']));
    const wrongElement = payment({ discard: [discard], sourceElements: { [discard]: 'Water' }, spend: { Water: 2 } });
    expect(validatePayment(h.state, 0, source, wrongElement, cost(2), context).map(error => error.code))
      .toContain('INVALID_CP_ELEMENT');
  });

  it('leaves the complete match unchanged when a cost declaration fails', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'hand' }, { seat: 0, card: 'P-009C', zone: 'field' },
    ] });
    const source = h.object(0, 'P-005R');
    const backup = h.object(0, 'P-009C');
    const before = JSON.stringify(h.state);
    const errors = castCharacter(h.state, 0, source, payment({
      dullBackups: [backup], sourceElements: { [backup]: 'Fire' }, spend: { Fire: 1 },
    }), context);
    expect(errors.map(error => error.code)).toContain('UNDERPAYMENT');
    expect(JSON.stringify(h.state)).toBe(before);
  });
  it('rejects an invalid cast payment without changing the accepted state or events', () => {
    const h = fixture({ phase: 'main1', active: 0, priority: 0, placements: [
      { seat: 0, card: 'P-005R', zone: 'hand' }, { seat: 0, card: 'P-009C', zone: 'field' },
    ] });
    const before = JSON.stringify(h.state);
    const source = h.object(0, 'P-005R');
    const backup = h.object(0, 'P-009C');
    const rejected = applyCommand(h.state, { id: 'reject-underpaid-cast', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'cast', source, targets: [], mode: null, payment: payment({ dullBackups: [backup],
        sourceElements: { [backup]: 'Fire' }, spend: { Fire: 1 } }),
    } }, context);
    expect(rejected.ok).toBe(false);
    expect(rejected.events).toEqual([]);
    expect(JSON.stringify(rejected.state)).toBe(before);
    expect(JSON.stringify(h.state)).toBe(before);
  });
  it('rolls back a committed cast cost when a post-payment trigger declaration fails', () => {
    const h = fixture({ phase: 'main1', active: 0, priority: 0, placements: [
      { seat: 0, card: 'P-011R', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
    ] });
    const source = h.object(0, 'P-011R');
    const cpDiscard = h.object(0, 'P-003C');
    const before = JSON.stringify(h.state);
    const originalRegistry = context.registry;
    const failingContext: EngineContext = { ...context, registry: {
      ...originalRegistry,
      card(number) {
        if (number === 'P-011R') throw new Error('post-payment trigger metadata failure');
        return originalRegistry.card(number);
      },
    } };
    const rejected = applyCommand(h.state, { id: 'rollback-after-payment', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'cast', source, targets: [], mode: null, payment: payment({
        discard: [cpDiscard], sourceElements: { [cpDiscard]: 'Fire' }, spend: { Fire: 2 },
      }),
    } }, failingContext);
    expect(rejected.ok).toBe(false);
    if (rejected.ok) return;
    expect(rejected.error.code).toBe('ENGINE_FAULT');
    expect(rejected.events).toEqual([]);
    expect(JSON.stringify(rejected.state)).toBe(before);
    expect(JSON.stringify(h.state)).toBe(before);
  });
  it('rejects extra dull and sacrifice flags on a card cast', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'hand' }, { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-010C', zone: 'field' }, { seat: 0, card: 'P-011R', zone: 'field' },
    ] });
    const source = h.object(0, 'P-005R');
    const backups = ['P-009C', 'P-010C', 'P-011R'].map(card => h.object(0, card));
    const errors = castCharacter(h.state, 0, source, payment({ dullBackups: backups,
      sourceElements: Object.fromEntries(backups.map(object => [object, 'Fire'])),
      spend: { Fire: 3 }, dullSource: true, sacrificeSource: true,
    }), context);
    expect(errors.map(error => error.code)).toContain('INVALID_COST_COMPONENTS');
  });

  it('keeps unselected same-name cards available as CP after one special-discard candidate is chosen', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-001L', zone: 'field' }, { seat: 0, card: 'P-002C', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'hand' }, { seat: 0, card: 'P-005R', zone: 'field' },
    ] });
    const custom: EngineContext = { ...context, catalog: { ...context.catalog,
      'P-002C': { ...context.catalog['P-002C']!, name: 'Cinder Marshal' },
      'P-003C': { ...context.catalog['P-003C']!, name: 'Cinder Marshal' },
    } };
    const source = h.object(0, 'P-001L');
    const special = h.object(0, 'P-002C');
    const cpDiscard = h.object(0, 'P-003C');
    const target = h.object(0, 'P-005R');
    const cpInstance = h.state.cards[Object.keys(h.state.cards).find(instance => h.state.cards[instance]!.object === cpDiscard)!]!.instance;
    const specialInstance = h.state.cards[Object.keys(h.state.cards).find(instance => h.state.cards[instance]!.object === special)!]!.instance;
    const sourceInstance = h.state.cards[Object.keys(h.state.cards).find(instance => h.state.cards[instance]!.object === source)!]!.instance;
    const offer = legalActions(h.state, 0, custom).find(action => action.ability === 'flare-order')!;
    expect(offer.payment?.specialOptions).toEqual(expect.arrayContaining([special, cpDiscard]));
    expect(offer.payment?.discardOptions).toEqual(expect.arrayContaining([special, cpDiscard]));
    const result = applyCommand(h.state, { id: 'same-name-candidates', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'activate', source, ability: 'flare-order', targets: [target], payment: payment({
        discard: [cpDiscard], specialDiscard: special, dullSource: true,
        sourceElements: { [cpDiscard]: 'Fire' }, spend: { Fire: 1 },
      }),
    } }, custom);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.cards[cpInstance]?.zone).toBe('break');
    expect(result.state.cards[specialInstance]?.zone).toBe('break');
    expect(result.state.cards[sourceInstance]?.dull).toBe(true);
  });
  it('allows a Backup controlled by the payer even when another player owns it', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'field' }, { seat: 1, card: 'P-029C', zone: 'field' },
    ] });
    const source = h.object(0, 'P-005R');
    const backup = h.state.cards[h.state.field.find(instance => h.state.cards[instance]!.card === 'P-029C')!]!;
    backup.controller = 0;
    const selected = payment({ dullBackups: [backup.object], sourceElements: { [backup.object]: 'Water' }, spend: { Water: 1 } });
    const cost: CostSpec = { amount: 1, elements: ['Water'], dullSource: false, sacrificeSource: false, specialDiscardName: null };
    expect(validatePayment(h.state, 0, source, selected, cost, context)).toEqual([]);
  });

  it('rejects an opponent-controlled Backup and rejects extra ability costs', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'field' }, { seat: 0, card: 'P-009C', zone: 'field' },
    ] });
    const source = h.object(0, 'P-005R');
    const backup = h.state.cards[h.state.field.find(instance => h.state.cards[instance]!.card === 'P-009C')!]!;
    backup.controller = 1;
    const spec: CostSpec = { amount: 1, elements: ['Fire'], dullSource: false, sacrificeSource: false, specialDiscardName: null };
    const selected = payment({ dullBackups: [backup.object], sourceElements: { [backup.object]: 'Fire' }, spend: { Fire: 1 } });
    expect(validatePayment(h.state, 0, source, selected, spec, context).map(error => error.code)).toContain('INVALID_CP_SOURCE');
    const extraAbilityCost: CostSpec = { ...spec, dullSource: true };
    expect(validatePayment(h.state, 0, source, selected, extraAbilityCost, context).map(error => error.code)).toContain('INVALID_COST_COMPONENTS');
  });
});
