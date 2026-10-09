import { describe, expect, it } from 'vitest';
import { assertInvariants } from '../../src/rules/invariants';
import { validatePayment, commitPayment } from '../../src/rules/payment';
import { applyCommand } from '../../src/rules/engine';
import { legalActions } from '../../src/rules/actions';
import { castCharacter } from '../../src/rules/casting';
import { runScheduler } from '../../src/rules/scheduler';
import { moveCard } from '../../src/rules/zones';
import { fixture, context } from '../support/harness';
import { opusPhRegisteredScripts, opusPhRegistry } from '../../src/content/manifest';
import { createRegistry } from '../../src/content/registry';
import type { CardScript } from '../../src/rules/contracts/card-script';
import type { CostSpec, Element, EngineContext, Payment } from '../../src/rules/types';
import { z } from 'zod';

const payment = (changes: Partial<Payment> = {}): Payment => ({
  discard: [], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
  sourceElements: {}, spend: {}, ...changes,
});
const cost = (amount: number, elements: Element[] = ['Fire']): CostSpec => ({
  amount, elements, dullSource: false, sacrificeSource: false, specialDiscardName: null,
});
describe('CP payment', () => {
  it('validates Cinder Marshal Flare Order before paying its special cost and resolves 7000 damage', () => {
    const h = fixture({ active: 0, priority: 0, placements: [
      { seat: 0, card: 'P-001L', zone: 'field' }, { seat: 0, card: 'P-002C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-003C', zone: 'field' },
      { seat: 1, card: 'P-026R', zone: 'field' },
    ] });
    const source = Object.values(h.state.cards).find(card => card.card === 'P-001L')!;
    const specialDiscard = Object.values(h.state.cards).find(card => card.card === 'P-002C')!;
    const backup = Object.values(h.state.cards).find(card => card.card === 'P-009C')!;
    const illegalTarget = Object.values(h.state.cards).find(card => card.card === 'P-009C')!;
    const target = Object.values(h.state.cards).find(card => card.card === 'P-026R')!;
    const payment = { discard: [], dullBackups: [backup.object], specialDiscard: specialDiscard.object,
      dullSource: true, sacrificeSource: false, sourceElements: { [backup.object]: 'Fire' as const }, spend: { Fire: 1 } };
    const before = JSON.stringify(h.state);
    const rejected = applyCommand(h.state, { id: 'flare-order-illegal-target', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'activate', source: source.object, ability: 'flare-order', targets: [illegalTarget.object], payment,
    } }, context);
    expect(rejected).toMatchObject({ ok: false, error: { code: 'ILLEGAL_TARGET' }, events: [] });
    expect(JSON.stringify(rejected.state)).toBe(before);
    expect(JSON.stringify(h.state)).toBe(before);

    const activated = applyCommand(h.state, { id: 'flare-order-legal-target', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'activate', source: source.object, ability: 'flare-order', targets: [target.object], payment,
    } }, context);
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;
    let state = activated.state;
    expect(state.cards[source.instance]!.dull).toBe(true);
    expect(state.cards[backup.instance]!.dull).toBe(true);
    expect(state.cards[specialDiscard.instance]!.zone).toBe('break');
    expect(state.stack.at(-1)?.resume).toEqual({ script: 'P-001L', version: '1', ability: 'flare-order', step: 'resolve', payload: null });
    const resolutionEvents: unknown[] = [];
    for (let pass = 0; pass < 2; pass += 1) {
      const seat = state.priority;
      if (seat === null) throw new Error('Flare Order did not open a response window.');
      const result = applyCommand(state, { id: `flare-order-pass-${pass}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      resolutionEvents.push(...result.events);
      state = result.state;
    }
    expect(state.cards[target.instance]!.zone).toBe('break');
    expect(resolutionEvents).toContainEqual(expect.objectContaining({
      type: 'forward.damaged', data: expect.objectContaining({ target: target.object, amount: 7000 }),
    }));
  });

  it('rejects Ember Medic targets outside its controller Break Zone before paying', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-013R', zone: 'field' }, { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 1, card: 'P-026R', zone: 'break' },
    ] });
    const source = h.object(0, 'P-013R');
    const backup = h.object(0, 'P-009C');
    const illegalTarget = h.object(1, 'P-026R');
    const sourceCard = Object.values(h.state.cards).find(card => card.object === source)!;
    const backupCard = Object.values(h.state.cards).find(card => card.object === backup)!;
    const before = JSON.stringify(h.state);
    const rejected = applyCommand(h.state, { id: 'medic-opponent-break-target', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'activate', source, ability: 'ember-medic-special', targets: [illegalTarget], payment: payment({
        dullBackups: [backup], dullSource: true, sacrificeSource: true,
        sourceElements: { [backup]: 'Fire' }, spend: { Fire: 1 },
      }),
    } }, context);
    expect(rejected).toMatchObject({ ok: false, error: { code: 'ILLEGAL_TARGET' }, events: [] });
    expect(JSON.stringify(rejected.state)).toBe(before);
    expect(JSON.stringify(h.state)).toBe(before);
    expect(sourceCard.zone).toBe('field');
    expect(sourceCard.dull).toBe(false);
    expect(backupCard.dull).toBe(false);
  });

  it('resolves Tide Warden Undertow after validating target and atomically paying its special cost', () => {
    const h = fixture({ active: 1, phase: 'main1', placements: [
      { seat: 1, card: 'P-021L', zone: 'field' }, { seat: 1, card: 'P-022C', zone: 'hand' },
      { seat: 1, card: 'P-029C', zone: 'field' }, { seat: 0, card: 'P-005R', zone: 'field' },
    ] });
    const source = h.object(1, 'P-021L');
    const discarded = h.object(1, 'P-022C');
    const backup = h.object(1, 'P-029C');
    const opposingForward = h.object(0, 'P-005R');
    const instanceOf = (object: string) => Object.values(h.state.cards).find(card => card.object === object)!.instance;
    const sourceInstance = instanceOf(source);
    const discardInstance = instanceOf(discarded);
    const backupInstance = instanceOf(backup);
    const targetInstance = instanceOf(opposingForward);
    const paymentForUndertow = payment({ specialDiscard: discarded, dullBackups: [backup],
      sourceElements: { [backup]: 'Water' }, spend: { Water: 1 }, dullSource: true });
    const illegal = applyCommand(h.state, { id: 'undertow-illegal-target', expectedSeq: h.state.seq, seat: 1,
      intent: { kind: 'activate', source, ability: 'undertow', targets: [backup], payment: paymentForUndertow } }, context);
    expect(illegal).toMatchObject({ ok: false, error: { code: 'ILLEGAL_TARGET' }, events: [] });
    expect(h.state.cards[sourceInstance]!.dull).toBe(false);
    expect(h.state.cards[backupInstance]!.dull).toBe(false);
    expect(h.state.cards[discardInstance]!.zone).toBe('hand');

    const activation = applyCommand(h.state, { id: 'undertow-legal-target', expectedSeq: h.state.seq, seat: 1,
      intent: { kind: 'activate', source, ability: 'undertow', targets: [opposingForward], payment: paymentForUndertow } }, context);
    expect(activation.ok).toBe(true);
    if (!activation.ok) return;
    expect(activation.state.stack.at(-1)?.resume).toEqual({ script: 'P-021L', version: '1', ability: 'undertow', step: 'resolve', payload: null });
    expect(activation.state.cards[sourceInstance]!.dull).toBe(true);
    expect(activation.state.cards[backupInstance]!.dull).toBe(true);
    expect(activation.state.cards[discardInstance]!.zone).toBe('break');

    let state = activation.state;
    for (const seat of [1, 0] as const) {
      const passed = applyCommand(state, { id: `undertow-pass-${seat}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, context);
      expect(passed.ok).toBe(true);
      if (!passed.ok) return;
      state = passed.state;
    }
    expect(state.cards[targetInstance]!.zone).toBe('hand');
    expect(state.cards[targetInstance]!.owner).toBe(0);
  });

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
    const resolutionEvents: unknown[] = [];
    for (const seat of [0, 1] as const) {
      const passed = applyCommand(state, { id: `typed-activation-pass-${seat}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, engine);
      expect(passed.ok).toBe(true);
      if (!passed.ok) return;
      resolutionEvents.push(...passed.events);
      state = passed.state;
    }
    expect(Object.values(state.cards).find(card => card.card === 'P-005R')?.zone).toBe('break');
    expect(resolutionEvents).toContainEqual(expect.objectContaining({
      type: 'forward.damaged', data: expect.objectContaining({ target, amount: 7000 }),
    }));
  });

  it('applies Commander replacement when an activated ability sacrifices its Commander source', () => {
    const h = fixture({ phase: 'main1', placements: [
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-005R', zone: 'field' },
    ] });
    const commander = h.state.cards[h.state.commanders[0].instance]!;
    moveCard(h.state, commander.instance, 'field');
    h.state.priority = 0;
    const commanderDefinition = context.catalog['P-001L']!;
    const sacrificeAbility = {
      id: 'test-commander-sacrifice', kind: 'action' as const, handler: 'test-commander-sacrifice',
      text: '{Fire}: Sacrifice this Commander and choose a Forward.', ex: false,
      activation: { cost: 1, elements: ['Fire'] as Element[], dullSource: false, sacrificeSource: true,
        specialDiscardName: null, target: { zones: ['field' as const], types: ['Forward' as const], elements: ['Fire'] as Element[],
          owner: 'any' as const, controller: 'any' as const, dull: null } },
    };
    const commanderScript: CardScript = { metadata: { ...commanderDefinition, abilities: [sacrificeAbility] }, behaviorVersion: '1', abilities: [{
      id: sacrificeAbility.id, kind: sacrificeAbility.kind, text: sacrificeAbility.text, ex: false, zones: ['field'],
      cost: { cp: 1, elements: ['Fire'], dullSource: false, sacrificeSource: true, sameNameDiscard: false },
      modes: [], targets: { min: 1, max: 1 },
      fieldEffects: [], replacements: [],
      steps: { resolve: { payloadSchema: z.null(), run: () => ({ batches: [], choice: null, next: null }) } },
    }] };
    const registry = createRegistry([...opusPhRegisteredScripts.filter(script => script.metadata.number !== 'P-001L'), commanderScript], 'sacrifice-commander-test');
    const custom: EngineContext = { ...context, registry, catalog: registry.catalog };
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
