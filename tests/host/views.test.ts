import { describe, expect, it } from 'vitest';
import { cinderCompany, tidalAssembly } from '../../src/content/decks';
import { LocalHost } from '../../src/host/local-host';
import { projectView } from '../../src/host/views';
import { fixture } from '../support/harness';
import { loadRecord } from '../../src/storage/indexed-db';
import type { RuleEvent } from '../../src/rules/types';
import 'fake-indexeddb/auto';

describe('local host projections', () => {
  it('starts the exact two-seat placeholder decks and preserves opponent hidden information', () => {
    const host = new LocalHost();
    host.start(42, [cinderCompany, tidalAssembly]);
    const state = host.getState();
    expect(Object.keys(state.cards)).toHaveLength(40);
    expect(state.choice?.kind).toBe('starting-player');
    const projection = host.view(0);
    expect(projection.cards[state.zones[1].deck[0]!]).toBeUndefined();
    expect(projection.zones[0].deck).toEqual([]);
    expect(projection.deckCounts[0]).toBe(state.zones[0].deck.length);
    expect(state.cards[state.zones[1].deck[0]!]!.card).not.toBe('HIDDEN');
  });

  it('withholds hidden card identities, deck order, private choices, and private log details', () => {
    const h = fixture({ placements: [{ seat: 1, card: 'P-031R', zone: 'hand' }] });
    const secret = Object.values(h.state.cards).find(card => card.owner === 1 && card.card === 'P-031R')!;
    const opponentDeckOrder = [...h.state.zones[1].deck];
    h.state.choice = { id: 'private-choice', seat: 1, kind: 'cards', reason: 'Search P-031R from deck.',
      options: [{ id: secret.object, label: 'P-031R', object: secret.object }], min: 1, max: 1, allocation: null,
      resume: { handler: 'private', step: 'choice', data: { card: 'P-031R' } } };
    const log: RuleEvent[] = [
      { id: 'draw-secret', type: 'card.drawn', data: { seat: 1, card: 'P-031R' } },
      { id: 'draw-own', type: 'card.drawn', data: { seat: 0, card: 'P-003C' } },
    ];
    const view = projectView(h.state, 0, log);
    const text = JSON.stringify(view);
    expect(text).not.toContain('P-031R');
    expect(text).not.toContain('"rng"');
    expect(text).not.toContain('"resume"');
    expect(text).not.toContain(opponentDeckOrder[0]!);
    expect(view.choice?.options).toEqual([]);
    expect(view.log.map(entry => entry.id)).toEqual(['draw-own']);
    expect(view.deckCounts[1]).toBe(opponentDeckOrder.length);
    expect(JSON.stringify(projectView(h.state, null))).not.toContain(opponentDeckOrder[0]!);
  });

  it('accepts only current-sequence commands and publishes accepted state changes after persistence', async () => {
    const host = new LocalHost();
    host.start(1);
    let notifications = 0;
    host.subscribe(() => notifications++);
    const state = host.getState();
    const choice = state.choice!;
    const reply = await host.submit({ id: 'start', expectedSeq: 0, seat: choice.seat, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: ['first'], amounts: {} },
    } });
    expect(reply.ok).toBe(true);
    expect(notifications).toBe(1);
    expect((await loadRecord())?.state).toEqual(host.getState());
    const stale = await host.submit({ id: 'stale', expectedSeq: 0, seat: choice.seat, intent: { kind: 'concede' } });
    expect(stale.ok).toBe(false);
    expect(notifications).toBe(1);
  });
  it('projects current-seat cast access and legal actions without exposing deck state', async () => {
    const host = new LocalHost();
    host.start(43);
    for (let step = 0; step < 4 && host.getState().choice; step++) {
      const state = host.getState();
      const choice = state.choice!;
      const selected = choice.kind === 'starting-player' ? 'first' : 'keep';
      await host.submit({ id: `project-setup-${step}`, expectedSeq: state.seq, seat: choice.seat, intent: {
        kind: 'answer', answer: { choice: choice.id, selected: [selected], amounts: {} },
      } });
    }
    const current = host.getState();
    const access = host.view(current.priority).castAccess;
    expect(access.every(item => item.source && item.blockedReasons)).toBe(true);
    expect(host.view(current.priority).actions.some(action => action.kind === 'pass')).toBe(true);
    const foreign = host.view(current.priority === 0 ? 1 : 0);
    expect(foreign.actions).toEqual([]);
    expect(JSON.stringify(foreign)).not.toContain(current.zones[current.priority].deck[0]!);
  });
  it('deduplicates identical command IDs and rejects conflicting reuse without changing state', async () => {
    const host = new LocalHost();
    host.start(8);
    const initial = host.getState();
    const choice = initial.choice!;
    const command = { id: 'idempotent-setup', expectedSeq: initial.seq, seat: choice.seat, intent: {
      kind: 'answer' as const, answer: { choice: choice.id, selected: ['first'], amounts: {} },
    } };
    const first = await host.submit(command);
    expect(first.ok).toBe(true);
    const afterFirst = JSON.stringify(host.getState());
    const duplicate = await host.submit(command);
    expect(duplicate).toEqual(first);
    expect(JSON.stringify(host.getState())).toBe(afterFirst);
    const conflict = await host.submit({ ...command, intent: { kind: 'concede' } });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.error.code).toBe('COMMAND_ID_REUSED');
    expect(JSON.stringify(host.getState())).toBe(afterFirst);
  });
  it('exports and restores a replay-verified saved match without accepting incompatible imports', async () => {
    const host = new LocalHost();
    host.start(9);
    const initial = host.getState();
    const choice = initial.choice!;
    const command = { id: 'setup', expectedSeq: 0, seat: choice.seat, intent: {
      kind: 'answer', answer: { choice: choice.id, selected: ['first'], amounts: {} },
    } } as const;
    const accepted = await host.submit(command);
    await host.waitForSave();
    const exported = await host.exportSave();
    const restored = new LocalHost();
    expect(await restored.importSave(exported)).toEqual({ imported: true, reason: null });
    expect(restored.getState()).toEqual(host.getState());
    expect(await restored.submit(command)).toEqual(accepted);
    const before = JSON.stringify(restored.getState());
    const rejected = await restored.importSave('{"format":"wrong"}');
    expect(rejected.imported).toBe(false);
    expect(JSON.stringify(restored.getState())).toBe(before);
  });
});
