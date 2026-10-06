import { describe, expect, it } from 'vitest';
import { applyCommand } from '../../src/rules/engine';
import { fixture, context } from '../support/harness';
import { requestDeparture } from '../../src/rules/commander';

describe('command transaction', () => {
  it('rejects a stale sequence without changing state or emitting events', () => {
    const h = fixture({});
    const before = JSON.stringify(h.state);
    const result = applyCommand(h.state, { id: 'old', expectedSeq: 3, seat: 0, intent: { kind: 'concede' } }, context);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result.state)).toBe(before);
    expect(result.events).toEqual([]);
  });
  it('rejects a malformed command and an illegal Character cast without partial payment', () => {
    const h = fixture({ priority: 1, placements: [
      { seat: 0, card: 'P-005R', zone: 'hand' },
      { seat: 0, card: 'P-009C', zone: 'field' },
    ] });
    const before = JSON.stringify(h.state);
    const malformed = applyCommand(h.state, { id: 'bad', expectedSeq: 0, seat: 2, intent: { kind: 'pass' } } as never, context);
    expect(malformed.ok).toBe(false);
    const illegal = applyCommand(h.state, { id: 'cast', expectedSeq: 0, seat: 0, intent: {
      kind: 'cast', source: h.object(0, 'P-005R'), targets: [], mode: null,
      payment: { discard: [], dullBackups: [h.object(0, 'P-009C')], specialDiscard: null, dullSource: false, sacrificeSource: false,
        sourceElements: { [h.object(0, 'P-009C')]: 'Fire' }, spend: { Fire: 2 } },
    } }, context);
    expect(illegal.ok).toBe(false);
    expect(JSON.stringify(illegal.state)).toBe(before);
  });
  it('accepts concession while another seat has a pending Commander choice', () => {
    const h = fixture({ placements: [{ seat: 0, card: 'P-001L', zone: 'field' }] });
    requestDeparture(h.state, h.state.commanders[0].instance, 'break');
    const result = applyCommand(h.state, { id: 'concede', expectedSeq: 0, seat: 1, intent: { kind: 'concede' } }, context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.result).toEqual({ winner: 0, reason: 'concede' });
      expect(result.state.choice).toBeNull();
      expect(result.state.seq).toBe(1);
    }
  });
});
