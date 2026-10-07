import { describe, expect, it } from 'vitest';
import { driver } from '../support/driver';
import { moveCard } from '../../src/rules/zones';

describe('suspended effect continuations', () => {
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
    expect(d.send({ kind: 'pass' }, 1).ok).toBe(true);
    const resolve = d.send({ kind: 'pass' }, 0);
    expect(resolve.ok).toBe(true);
    expect(d.state.choice?.resume.handler).toBe('departure');
    expect(d.state.priority).toBeNull();
    expect(d.answer(['destination']).ok).toBe(true);
    d.state = JSON.parse(JSON.stringify(d.state)) as typeof d.state;
    expect(d.state.choice?.resume.handler).toBe('departure');
    expect(d.state.choice?.seat).toBe(1);
    expect(d.answer(['destination']).ok).toBe(true);
    expect(d.state.cards[leftCommander.instance]!.zone).toBe('break');
    expect(d.state.cards[rightCommander.instance]!.zone).toBe('break');
  });
});
