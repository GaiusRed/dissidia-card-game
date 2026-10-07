import { describe, expect, it } from 'vitest';
import { castCharacter, castSummon } from '../../src/rules/casting';
import { commanderCost } from '../../src/rules/commander';
import { fixture, context } from '../support/harness';
import { moveCard } from '../../src/rules/zones';
import { runScheduler } from '../../src/rules/scheduler';
import { applyCommand } from '../../src/rules/engine';
import { createRegistry } from '../../src/content/registry';
import { opusPhRegisteredScripts, opusPhRegistry } from '../../src/content/manifest';
import { syntheticCantripScript } from '../support/script-fixtures';
import type { CardDefinition, EngineContext, Payment } from '../../src/rules/types';

const payBackups = (h: ReturnType<typeof fixture>, cost: number): Payment => {
  const backups = ['P-009C','P-010C','P-011R'];
  const selected = backups.slice(0, cost).map(card => h.object(0, card));
  return {
    discard: [], dullBackups: selected, specialDiscard: null, dullSource: false, sacrificeSource: false,
    sourceElements: Object.fromEntries(selected.map(object => [object, 'Fire'])), spend: { Fire: cost },
  };
};
const instanceOf = (h: ReturnType<typeof fixture>, number: string) => Object.values(h.state.cards).find(card => card.card === number)!.instance;
describe('Character casting', () => {
  it('publishes the entered object and controller on a character.cast event', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-014R', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-010C', zone: 'field' },
    ] });
    const source = h.object(0, 'P-014R');
    const result = applyCommand(h.state, { id: 'enter-event', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'cast', source, targets: [], mode: null, payment: payBackups(h, 2),
    } }, context);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cast = result.events.find(item => item.type === 'character.cast');
    const entered = result.state.cards[instanceOf(h, 'P-014R')]!;
    expect(cast?.data).toMatchObject({ card: 'P-014R', seat: 0, source: entered.object });
  });

  it('casts the Commander from its Zone at base cost, then adds tax to its next Zone cast', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-010C', zone: 'field' },
      { seat: 0, card: 'P-011R', zone: 'field' },
    ] });
    const commander = h.state.commanders[0].instance;
    const source = h.state.cards[commander]!.object;
    expect(commanderCost(h.state, commander, context)).toBe(3);
    expect(castCharacter(h.state, 0, source, payBackups(h, 3), context)).toEqual([]);
    expect(runScheduler(h.state, context).error).toBeNull();
    expect(h.state.cards[commander]!.zone).toBe('field');
    expect(h.state.commanders[0].casts).toBe(1);
    moveCard(h.state, commander, 'commander');
    expect(commanderCost(h.state, commander, context)).toBe(5);
  });
  it('rejects an illegal Backup limit without dulling sources or moving the card', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-010C', zone: 'field' },
      { seat: 0, card: 'P-011R', zone: 'field' }, { seat: 0, card: 'P-012H', zone: 'field' },
      { seat: 0, card: 'P-013R', zone: 'field' }, { seat: 0, card: 'P-014R', zone: 'hand' },
    ] });
    const backup = h.object(0, 'P-014R');
    const sources = ['P-009C','P-010C'].map(card => h.object(0, card));
    const payment: Payment = { discard: [], dullBackups: sources, specialDiscard: null, dullSource: false, sacrificeSource: false, sourceElements: Object.fromEntries(sources.map(object => [object, 'Fire'])), spend: { Fire: 2 } };
    expect(castCharacter(h.state, 0, backup, payment, context).map(e => e.code)).toContain('BACKUP_LIMIT');
    expect(h.state.cards[instanceOf(h, 'P-014R')]!.zone).toBe('hand');
    expect(h.state.cards[instanceOf(h, 'P-009C')]!.dull).toBe(false);
  });
  it('rejects a Commander cast during an opponent priority pass', () => {
    const h = fixture({ priority: 1 });
    expect(castCharacter(h.state, 0, h.object(0, 'P-001L'), payBackups(h, 3), context).map(e => e.code)).toContain('WRONG_TIMING');
  });
  it('permits two generic copies of the same name but rejects a second nongeneric copy', () => {
    const generic = fixture({ placements: [
      { seat: 0, card: 'P-003C', zone: 'field' },
      { seat: 0, card: 'P-004C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-010C', zone: 'field' },
    ] });
    expect(castCharacter(generic.state, 0, generic.object(0, 'P-004C'), payBackups(generic, 2), context)).toEqual([]);
    expect(runScheduler(generic.state, context).error).toBeNull();
    expect(generic.state.cards[instanceOf(generic, 'P-004C')]!.zone).toBe('field');
    const named = fixture({ placements: [
      { seat: 0, card: 'P-001L', zone: 'field' },
      { seat: 0, card: 'P-002C', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' }, { seat: 0, card: 'P-010C', zone: 'field' },
    ] });
    expect(castCharacter(named.state, 0, named.object(0, 'P-002C'), payBackups(named, 2), context).map(e => e.code)).toContain('DUPLICATE_NAME');
  });
});

describe('Summon declaration metadata', () => {
  it('declares and resolves an unmodified synthetic script through the production reducer', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-015C', zone: 'hand' }] });
    const source = h.object(0, 'P-015C');
    const sourceCard = Object.values(h.state.cards).find(card => card.object === source)!;
    sourceCard.card = 'TEST-001';
    const scripts = [...opusPhRegisteredScripts.filter(script => script.metadata.number !== 'P-015C'), syntheticCantripScript()];
    const registry = createRegistry(scripts, 'synthetic-production-test');
    const engine = { ...context, catalog: registry.catalog, registry };
    const initialDeck = h.state.zones[0].deck.length;
    const cast = applyCommand(h.state, { id: 'synthetic-cantrip-cast', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'cast', source, targets: [], mode: null, payment: {
        discard: [], dullBackups: [], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: {}, spend: {},
      },
    } }, engine);
    expect(cast.ok).toBe(true);
    if (!cast.ok) return;
    expect(cast.state.stack.at(-1)?.resume).toMatchObject({ script: 'TEST-001', ability: 'synthetic-cantrip' });
    let state = cast.state;
    for (const seat of [0, 1] as const) {
      const passed = applyCommand(state, { id: `synthetic-cantrip-pass-${seat}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, engine);
      expect(passed.ok).toBe(true);
      if (!passed.ok) return;
      state = passed.state;
    }
    expect(state.zones[0].deck).toHaveLength(initialDeck - 1);
    expect(state.cards[sourceCard.instance]?.zone).toBe('break');
  });

  it('puts the registered typed resolver on a cast Summon stack item', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-015C', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
      { seat: 0, card: 'P-005R', zone: 'field' },
    ] });
    const source = h.object(0, 'P-015C');
    const payment: Payment = { discard: [h.object(0, 'P-003C')], dullBackups: [], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [h.object(0, 'P-003C')]: 'Fire' }, spend: { Fire: 1 } };
    const engine = { ...context, registry: opusPhRegistry };
    const result = applyCommand(h.state, { id: 'typed-scorch-cast', expectedSeq: h.state.seq, seat: 0, intent: {
      kind: 'cast', source, targets: [h.object(0, 'P-005R')], mode: null, payment,
    } }, engine);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.stack.at(-1)?.resume).toEqual({ script: 'P-015C', version: '1', ability: 'scorch', step: 'resolve', payload: null });
    let state = result.state;
    const resolutionEvents: unknown[] = [];
    for (const seat of [0, 1] as const) {
      const passed = applyCommand(state, { id: `typed-scorch-pass-${seat}`, expectedSeq: state.seq, seat, intent: { kind: 'pass' } }, engine);
      expect(passed.ok).toBe(true);
      if (!passed.ok) return;
      resolutionEvents.push(...passed.events);
      state = passed.state;
    }
    expect(state.cards[instanceOf(h, 'P-015C')]?.zone).toBe('break');
    expect(resolutionEvents).toContainEqual(expect.objectContaining({
      type: 'forward.damaged', data: expect.objectContaining({ amount: 4000 }),
    }));
    // The 4000-power Forward is put into the Break Zone by the damage checkpoint.
    expect(Object.values(state.cards).find(card => card.card === 'P-005R')?.zone).toBe('break');
  });

  it('uses the owning card target declaration during command validation', () => {
    const h = fixture({ placements: [
      { seat: 0, card: 'P-009C', zone: 'field' },
      { seat: 0, card: 'P-015C', zone: 'hand' },
      { seat: 1, card: 'P-023C', zone: 'field' },
    ] });
    const metadataContext: EngineContext = {
      ...context,
      catalog: { ...context.catalog, 'P-015C': { ...context.catalog['P-015C']!, summonTarget: {
        min: 1, max: 1, zones: ['field'], types: ['Forward'],
        controller: 'you' as const, dull: null,
      } as NonNullable<CardDefinition['summonTarget']> } },
    };
    const source = h.object(0, 'P-015C');
    const backup = h.object(0, 'P-009C');
    const payment: Payment = { discard: [], dullBackups: [backup], specialDiscard: null, dullSource: false,
      sacrificeSource: false, sourceElements: { [backup]: 'Fire' }, spend: { Fire: 1 } };
    const before = JSON.stringify(h.state);
    const errors = castSummon(h.state, 0, source, [h.object(1, 'P-023C')], null, payment, metadataContext);
    expect(errors.map(error => error.code)).toContain('ILLEGAL_TARGET');
    expect(JSON.stringify(h.state)).toBe(before);
  });
});
