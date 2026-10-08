import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/rules/engine';
import { context, fixture } from '../support/harness';
import { opusPhRegisteredScripts } from '../../src/content/manifest';
import { createRegistry } from '../../src/content/registry';
import { openTriggerOrder } from '../../src/rules/priority';
import type { AbilityTargetRule, EngineContext } from '../../src/rules/types';
import type { CardScript } from '../../src/rules/contracts/card-script';
import { z } from 'zod';

describe('trigger declaration', () => {
  it('orders simultaneous active and nonactive controller groups in APNAP order', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-005R', zone: 'field' }, { seat: 0, card: 'P-006R', zone: 'field' },
      { seat: 1, card: 'P-023C', zone: 'field' }, { seat: 1, card: 'P-024C', zone: 'field' },
    ] });
    const cards = Object.values(h.state.cards).filter(card => card.zone === 'field');
    const makeItem = (card: typeof cards[number], id: string) => ({ id, controller: card.controller, source: card.object,
      lastKnown: { ...card }, targets: [], mode: null, data: null,
      resume: { script: 'P-014R', version: '1', ability: 'cinder-witness-leave', step: 'resolve', payload: null } });
    const activeItems = cards.filter(card => card.controller === 0).map((card, index) => makeItem(card, `active-${index}`));
    const nonactiveItems = cards.filter(card => card.controller === 1).map((card, index) => makeItem(card, `nonactive-${index}`));
    h.state.triggers = [
      { seat: 0, items: activeItems },
      { seat: 1, items: nonactiveItems },
    ];
    openTriggerOrder(h.state, context);
    expect(h.state.choice?.seat).toBe(0);
    const activeChoice = h.state.choice!;
    const invalid = applyCommand(h.state, { id: 'bad-apnap-order', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'answer', answer: { choice: activeChoice.id, selected: [activeChoice.options[0]!.id, activeChoice.options[0]!.id], amounts: {} },
    } }, context);
    expect(invalid.ok).toBe(false);
    const restored = JSON.parse(JSON.stringify(h.state)) as typeof h.state;
    const answerActive = applyCommand(restored, { id: 'answer-active-order', expectedSeq: restored.seq, seat: 0, intent: {
      kind: 'answer', answer: { choice: restored.choice!.id, selected: [...activeItems].reverse().map(item => item.id), amounts: {} },
    } }, context);
    expect(answerActive.ok, JSON.stringify(answerActive.ok ? null : answerActive.error)).toBe(true);
    if (!answerActive.ok) return;
    expect(answerActive.state.choice?.seat).toBe(1);
    const answerNonactive = applyCommand(answerActive.state, { id: 'answer-nonactive-order', expectedSeq: answerActive.state.seq, seat: 1, intent: {
      kind: 'answer', answer: { choice: answerActive.state.choice!.id, selected: [...nonactiveItems].reverse().map(item => item.id), amounts: {} },
    } }, context);
    expect(answerNonactive.ok).toBe(true);
    if (!answerNonactive.ok) return;
    expect(answerNonactive.state.stack.map(item => item.id)).toEqual([
      ...activeItems.map(item => item.id).reverse(), ...nonactiveItems.map(item => item.id).reverse(),
    ]);
    expect(answerNonactive.state.priority).toBe(0);
  });

  it('declares an entry target before opening a response window and survives reload', () => {
    const h = fixture({ active: 1, priority: 1, placements: [
      { seat: 1, card: 'P-025R', zone: 'hand' },
      { seat: 1, card: 'P-023C', zone: 'hand' },
      { seat: 1, card: 'P-024C', zone: 'hand' },
      { seat: 0, card: 'P-003C', zone: 'field' },
    ] });
    const state = h.state;
    const source = Object.values(state.cards).find(card => card.card === 'P-025R')!;
    const first = Object.values(state.cards).find(card => card.card === 'P-023C')!;
    const second = Object.values(state.cards).find(card => card.card === 'P-024C')!;
    const target = Object.values(state.cards).find(card => card.card === 'P-003C')!;
    const cast = applyCommand(state, { id: 'binder-cast', expectedSeq: 0, seat: 1, intent: {
      kind: 'cast', source: source.object, targets: [], mode: null, payment: {
        discard: [first.object, second.object], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [first.object]: 'Water', [second.object]: 'Water' }, spend: { Water: 3 },
      },
    } }, context);
    expect(cast.ok).toBe(true);
    if (!cast.ok) return;
    expect(cast.state.choice?.resume).toMatchObject({ script: 'rules', ability: 'choice-trigger', step: 'target' });
    expect(cast.state.priority).toBeNull();
    expect(cast.state.choice?.options.map(option => option.id)).toContain(target.object);

    const restored = JSON.parse(JSON.stringify(cast.state)) as typeof cast.state;
    const choice = restored.choice!;
    const answer = applyCommand(restored, { id: 'binder-target', expectedSeq: restored.seq, seat: 1, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: [target.object], amounts: {} },
    } }, context);
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    expect(answer.state.choice).toBeNull();
    const declared = answer.state.stack.find(item => item.resume?.ability === 'frost-binder-enter');
    expect(declared?.targets).toEqual([target.object]);
    expect(declared).toBeDefined();
    expect(Object.hasOwn(declared!, 'handler')).toBe(false);
    expect(answer.state.priority).toBe(1);
  });

  it('collects both controllers departure triggers from one simultaneous batch before priority', () => {
    const h = fixture({ active: 1, priority: 1, placements: [
      { seat: 0, card: 'P-014R', zone: 'field' }, { seat: 1, card: 'P-033R', zone: 'field' },
      { seat: 0, card: 'P-005R', zone: 'field', damage: 4000 },
      { seat: 1, card: 'P-023C', zone: 'field', damage: 6000 },
      { seat: 0, card: 'P-004C', zone: 'field' }, { seat: 1, card: 'P-024C', zone: 'field' },
    ] });
    const pass = applyCommand(h.state, { id: 'both-leave-pass', expectedSeq: h.state.seq, seat: 1,
      intent: { kind: 'pass' } }, context);
    expect(pass.ok).toBe(true);
    if (!pass.ok) return;
    expect(pass.state.cards[Object.values(pass.state.cards).find(card => card.card === 'P-005R')!.instance]!.zone).toBe('break');
    expect(pass.state.cards[Object.values(pass.state.cards).find(card => card.card === 'P-023C')!.instance]!.zone).toBe('break');
    expect(pass.state.choice).toMatchObject({ seat: 0, resume: { script: 'rules', ability: 'choice-trigger', step: 'target' } });
    expect(pass.state.stack.map(item => item.resume.ability)).toEqual(['tide-witness-leave', 'cinder-witness-leave']);

    const restored = JSON.parse(JSON.stringify(pass.state)) as typeof pass.state;
    const choice = restored.choice!;
    const answer = applyCommand(restored, { id: 'both-leave-target', expectedSeq: restored.seq, seat: 0,
      intent: { kind: 'answer', answer: { choice: choice.id, selected: [h.object(0, 'P-004C')], amounts: {} } } }, context);
    expect(answer.ok).toBe(true);
    if (!answer.ok) return;
    expect(answer.state.stack.map(item => item.resume.ability)).toEqual(['tide-witness-leave', 'cinder-witness-leave']);
    expect(answer.state.stack[1]?.targets).toEqual([h.object(0, 'P-004C')]);
    expect(answer.state.priority).toBe(1);
  });

  it('removes a required departure trigger when its target options have disappeared', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-014R', zone: 'field' }, { seat: 0, card: 'P-005R', zone: 'field', damage: 4000 },
    ] });
    const transition = applyCommand(h.state, { id: 'targetless-departure', expectedSeq: h.state.seq, seat: 0,
      intent: { kind: 'pass' } }, context);
    expect(transition.ok).toBe(true);
    if (!transition.ok) return;
    expect(transition.state.choice).toBeNull();
    expect(transition.state.stack.some(item => item.resume.ability === 'cinder-witness-leave')).toBe(false);
    expect(transition.state.priority).toBe(0);
  });

  it('collects a departure trigger caused by an ability sacrifice cost before priority', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-013R', zone: 'field' }, { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-005R', zone: 'break' }, { seat: 0, card: 'P-003C', zone: 'field' },
    ] });
    const medic = Object.values(h.state.cards).find(card => card.card === 'P-013R')!;
    const backup = Object.values(h.state.cards).find(card => card.card === 'P-009C')!;
    const target = Object.values(h.state.cards).find(card => card.card === 'P-005R')!;
    const observedForward = Object.values(h.state.cards).find(card => card.card === 'P-003C')!;
    const targetRule: AbilityTargetRule = { zones: ['field'], types: ['Forward'], elements: [], owner: 'any',
      controller: 'any', dull: null };
    const original = opusPhRegisteredScripts.find(script => script.metadata.number === 'P-013R')!;
    const text = 'When this Forward is put into the Break Zone, choose a Forward.';
    const metadata = { ...original.metadata, type: 'Forward' as const, power: 3000, abilities: [
      ...original.metadata.abilities,
      { id: 'test-self-break', kind: 'auto' as const, handler: 'test-self-break', text, ex: false, trigger: 'self-break' as const,
        target: targetRule },
    ] };
    const selfBreakScript: CardScript['abilities'][number] = {
      id: 'test-self-break', kind: 'auto', text, ex: false, zones: ['field'],
      cost: { cp: 0, elements: [], dullSource: false, sacrificeSource: false, sameNameDiscard: false },
      modes: [], targets: { min: 1, max: 1, distinct: true, accepts: () => true },
      triggers: [], fieldEffects: [], replacements: [],
      steps: { resolve: { payloadSchema: z.number().int().nonnegative(), run: ({ frame }) => ({
        batches: [{ simultaneous: false, operations: [{ kind: 'forward-damage', source: frame.source, target: frame.targets[0]!, amount: 1000 }] }],
        choice: null, next: null,
      }) } },
    };
    const observerScript: CardScript = { ...original, metadata, abilities: [...original.abilities, selfBreakScript] };
    const registry = createRegistry([...opusPhRegisteredScripts.filter(script => script.metadata.number !== 'P-013R'), observerScript], 'typed-self-break-test');
    const contextWithSelfBreak: EngineContext = { ...context, registry, catalog: registry.catalog };
    const activation = applyCommand(h.state, { id: 'sacrifice-trigger', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'activate', source: medic.object, ability: 'ember-medic-special', targets: [target.object], payment: {
        discard: [], dullBackups: [backup.object], specialDiscard: null, dullSource: true, sacrificeSource: true,
        sourceElements: { [backup.object]: 'Fire' }, spend: { Fire: 1 },
      },
    } }, contextWithSelfBreak);
    if (!activation.ok) throw new Error(JSON.stringify(activation.error));
    if (!activation.ok) return;
    expect(activation.state.cards[medic.instance]!.zone).toBe('break');
    expect(activation.state.choice?.resume).toMatchObject({ script: 'rules', ability: 'choice-trigger', step: 'target' });
    expect(activation.state.choice?.options.map(option => option.id)).toContain(observedForward.object);
    expect(activation.state.stack.map(item => item.resume.ability)).toEqual(['ember-medic-special', 'test-self-break']);
    expect(activation.state.stack.at(-1)?.resume).toMatchObject({ script: 'P-013R', ability: 'test-self-break', step: 'resolve' });
  });
});
