import { describe, expect, it } from 'vitest';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { LocalHost } from '../../src/host/local-host';
import 'fake-indexeddb/auto';

describe('local host projections', () => {
  it('starts the exact two-seat placeholder decks and preserves opponent hidden information', () => {
    const host = new LocalHost();
    host.start(42, [cinderCompany, tidalAssembly]);
    const state = host.getState();
    expect(Object.keys(state.cards)).toHaveLength(40);
    expect(state.choice?.kind).toBe('starting-player');
    const projection = host.view(0);
    expect(projection.cards[state.zones[1].deck[0]!]!.card).toBe('HIDDEN');
    expect(state.cards[state.zones[1].deck[0]!]!.card).not.toBe('HIDDEN');
  });

  it('accepts only current-sequence commands and publishes accepted state changes', () => {
    const host = new LocalHost();
    host.start(1);
    let notifications = 0;
    host.subscribe(() => notifications++);
    const state = host.getState();
    const choice = state.choice!;
    const reply = host.submit({ id: 'start', expectedSeq: 0, seat: choice.seat, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: ['first'], amounts: {} },
    } });
    expect(reply.ok).toBe(true);
    expect(notifications).toBe(1);
    const stale = host.submit({ id: 'stale', expectedSeq: 0, seat: choice.seat, intent: { kind: 'concede' } });
    expect(stale.ok).toBe(false);
    expect(notifications).toBe(1);
  });
  it('exports and restores a replay-verified saved match without accepting incompatible imports', async () => {
    const host = new LocalHost();
    host.start(9);
    const initial = host.getState();
    const choice = initial.choice!;
    host.submit({ id: 'setup', expectedSeq: 0, seat: choice.seat, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: ['first'], amounts: {} },
    } });
    await host.waitForSave();
    const exported = await host.exportSave();
    const restored = new LocalHost();
    expect(await restored.importSave(exported)).toEqual({ imported: true, reason: null });
    expect(restored.getState()).toEqual(host.getState());
    const before = JSON.stringify(restored.getState());
    const rejected = await restored.importSave('{"format":"wrong"}');
    expect(rejected.imported).toBe(false);
    expect(JSON.stringify(restored.getState())).toBe(before);
  });
});
