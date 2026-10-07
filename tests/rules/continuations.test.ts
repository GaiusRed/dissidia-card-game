import { describe, expect, it } from 'vitest';
import { driver } from '../support/driver';
import { moveCard } from '../../src/rules/zones';
import { applyCommand } from '../../src/rules/engine';
import { context, fixture } from '../support/harness';
import { assertStable } from '../support/assert-stable';
import { scheduleEntryAbilities } from '../../src/rules/triggers';
import { effectivePower } from '../../src/rules/continuous';

describe('suspended effect continuations', () => {
  it('returns priority after Archive Keeper completes its discard choice', () => {
    const d = driver({ active: 1, placements: [{ seat: 1, card: 'P-031R', zone: 'field' }] });
    const keeper = Object.values(d.state.cards).find(card => card.card === 'P-031R')!;
    scheduleEntryAbilities(d.state, keeper.instance, context);
    expect(d.send({ kind: 'pass' }, 1).ok).toBe(true);
    expect(d.send({ kind: 'pass' }, 0).ok).toBe(true);
    expect(d.state.choice?.reason).toContain('discard');
    const pending = d.state.choice!;
    const selected = pending.options[0]!.id;
    expect(d.answer([selected]).ok).toBe(true);
    assertStable(d.state);
    expect(d.state.priority).toBe(1);
    const repeated = applyCommand(d.state, {
      id: 'archive-repeated-answer', expectedSeq: d.state.seq - 1, seat: pending.seat,
      intent: { kind: 'answer', answer: { choice: pending.id, selected: [selected], amounts: {} } },
    }, context);
    expect(repeated.ok).toBe(false);
    if (!repeated.ok) expect(repeated.error.code).toBe('STALE_SEQUENCE');
    expect(repeated.state).toEqual(d.state);
  });

  it('returns priority after the excess-Backup choice completes', () => {
    const d = driver({ placements: ['P-009C', 'P-010C', 'P-011R', 'P-012H', 'P-013R', 'P-014R']
      .map(card => ({ seat: 0 as const, card, zone: 'field' as const })) });
    expect(d.send({ kind: 'pass' }).ok).toBe(true);
    expect(d.state.choice?.reason).toContain('Backup');
    const selected = d.state.choice!.options[0]!.id;
    expect(d.answer([selected]).ok).toBe(true);
    assertStable(d.state);
    expect(d.state.priority).toBe(0);
  });

  it('reruns rule processes after a field-limit choice removes a Forward power boost', () => {
    const d = driver({ placements: [
      ...['P-009C', 'P-010C', 'P-011R', 'P-012H', 'P-013R', 'P-014R'].map(card =>
        ({ seat: 0 as const, card, zone: 'field' as const })),
      { seat: 0, card: 'P-005R', zone: 'field', damage: 4500 },
      { seat: 1, card: 'P-023C', zone: 'field' },
    ] });
    expect(effectivePower(d.state, d.object(0, 'P-005R'), context)).toBe(5000);
    expect(d.send({ kind: 'pass' }).ok).toBe(true);
    expect(d.state.cards[Object.values(d.state.cards).find(card => card.card === 'P-005R')!.instance]!.zone).toBe('field');
    expect(d.state.choice?.reason).toContain('Backup');
    expect(d.answer([d.object(0, 'P-012H')]).ok).toBe(true);
    expect(d.state.cards[Object.values(d.state.cards).find(card => card.card === 'P-005R')!.instance]!.zone).toBe('break');
    expect(d.state.choice?.reason).toContain('choose a target');
    expect(d.state.stack.some(item => item.handler === 'cinder-witness-damage')).toBe(true);
  });

  it('rejects a typed choice that has no saved execution frame', () => {
    const state = fixture({}).state;
    state.choice = {
      id: 'typed-choice', seat: 0, kind: 'confirm', reason: 'Test typed continuation.',
      options: [{ id: 'first', label: 'Continue', object: null }], min: 1, max: 1, allocation: null,
      resume: { script: 'P-015C', version: '1', ability: 'scorch', step: 'resolve', payload: null },
    };
    const before = JSON.parse(JSON.stringify(state)) as typeof state;
    const transition = applyCommand(state, {
      id: 'typed-choice', expectedSeq: state.seq, seat: state.choice.seat,
      intent: { kind: 'answer', answer: { choice: state.choice.id, selected: ['first'], amounts: {} } },
    }, context);
    expect(transition.ok).toBe(false);
    if (!transition.ok) {
      expect(transition.error.code).toBe('MISSING_FRAME');
      expect(transition.state).toEqual(before);
    }
  });

  it('pauses Twin Embers for each Commander owner before resuming the remaining target', () => {
    const d = driver({ placements: [
      { seat: 0, card: 'P-016R', zone: 'hand' }, { seat: 0, card: 'P-003C', zone: 'hand' },
    ] });
    const leftCommander = d.state.cards[d.state.commanders[0].instance]!;
    const rightCommander = d.state.cards[d.state.commanders[1].instance]!;
    moveCard(d.state, leftCommander.instance, 'field');
    moveCard(d.state, rightCommander.instance, 'field');
    d.state.cards[leftCommander.instance]!.damage = 4000;
    d.state.cards[rightCommander.instance]!.damage = 4000;
    const payment = {
      discard: [d.object(0, 'P-003C')], dullBackups: [], specialDiscard: null,
      dullSource: false, sacrificeSource: false, sourceElements: { [d.object(0, 'P-003C')]: 'Fire' as const }, spend: { Fire: 2 },
    };
    expect(d.send({ kind: 'cast', source: d.object(0, 'P-016R'), targets: [leftCommander.object, rightCommander.object], mode: null, payment }).ok).toBe(true);
    expect(d.send({ kind: 'pass' }, 0).ok).toBe(true);
    const resolve = d.send({ kind: 'pass' }, 1);
    expect(resolve.ok).toBe(true);
    expect(d.state.choice?.resume).toMatchObject({ script: 'rules', ability: 'batch', step: 'commander-departure' });
    expect(d.state.priority).toBeNull();
    const summon = Object.values(d.state.cards).find(card => card.card === 'P-016R')!;
    expect(d.state.cards[summon.instance]!.zone).toBe('stack');
    expect(d.state.stackCards).toContain(summon.instance);
    expect(d.state.cards[leftCommander.instance]!.damage).toBe(7000);
    expect(d.state.cards[rightCommander.instance]!.damage).toBe(7000);
    expect(d.answer(['destination']).ok).toBe(true);
    d.state = JSON.parse(JSON.stringify(d.state)) as typeof d.state;
    expect(d.state.execution).toEqual(JSON.parse(JSON.stringify(d.state.execution)));
    expect(d.state.choice?.resume).toMatchObject({ script: 'rules', ability: 'batch', step: 'commander-departure' });
    expect(d.state.choice?.seat).toBe(1);
    expect(d.answer(['destination']).ok).toBe(true);
    expect(d.state.cards[leftCommander.instance]!.zone).toBe('break');
    expect(d.state.cards[rightCommander.instance]!.zone).toBe('break');
    expect(d.state.cards[summon.instance]!.zone).toBe('break');
  });
});
