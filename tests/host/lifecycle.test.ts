import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalHost } from '../../src/host/local-host';
import { applyCommand } from '../../src/rules/engine';
import { context } from '../support/harness';
import { loadRecord } from '../../src/storage/indexed-db';
import * as storage from '../../src/storage/indexed-db';
import type { CommandRequest } from '../../src/host/protocol';

afterEach(() => vi.restoreAllMocks());

describe('serialized host lifecycle', () => {
  it('rejects an old-match command queued across a new match', async () => {
    const host = new LocalHost();
    host.start(41);
    const old = host.getState();
    const pending = host.submit({ id: 'old-match-concede', expectedSeq: old.seq, seat: old.active, intent: { kind: 'concede' } });
    host.start(42);
    const reply = await pending;
    expect(reply).toMatchObject({ ok: false, error: { code: 'STALE_MATCH' } });
    expect(host.getState().result).toBeNull();
  });

  it('rejects a command created from a stale projected view after replacement', async () => {
    const host = new LocalHost();
    host.start(414);
    const oldView = host.view();
    host.start(415);
    const request: CommandRequest = { generation: oldView.generation, command: {
      id: 'stale-view-concede', expectedSeq: oldView.seq, seat: oldView.active, intent: { kind: 'concede' },
    } };
    expect(await host.submit(request)).toMatchObject({ ok: false, error: { code: 'STALE_MATCH' } });
    expect(host.getState().result).toBeNull();
  });

  it('rejects queued commands replaced by a scenario or an abandoned match', async () => {
    const scenarioHost = new LocalHost();
    scenarioHost.start(411);
    const scenarioState = scenarioHost.getState();
    const scenarioCommand = scenarioHost.submit({ id: 'old-before-scenario', expectedSeq: scenarioState.seq,
      seat: scenarioState.active, intent: { kind: 'concede' } });
    scenarioHost.startScenario('end-trigger-order');
    expect(await scenarioCommand).toMatchObject({ ok: false, error: { code: 'STALE_MATCH' } });

    const abandonHost = new LocalHost();
    abandonHost.start(412);
    const abandonState = abandonHost.getState();
    const abandon = abandonHost.abandon();
    const abandonedCommand = abandonHost.submit({ id: 'old-before-abandon', expectedSeq: abandonState.seq,
      seat: abandonState.active, intent: { kind: 'concede' } });
    await abandon;
    expect(await abandonedCommand).toMatchObject({ ok: false, error: { code: 'STALE_MATCH' } });
  });

  it('rejects an old queued command across an import with matching sequence and IDs', async () => {
    const host = new LocalHost();
    host.start(413);
    const old = host.getState();
    const incoming = new LocalHost();
    incoming.start(413);
    const replacement = host.importSave(await incoming.exportSave());
    const pending = host.submit({ id: 'same-id-same-seq', expectedSeq: old.seq, seat: old.active, intent: { kind: 'concede' } });
    expect(await replacement).toEqual({ imported: true, reason: null });
    expect(await pending).toMatchObject({ ok: false, error: { code: 'STALE_MATCH' } });
  });

  it('does not let a delayed restore replace a newer start', async () => {
    const source = new LocalHost();
    source.start(417);
    await source.waitForSave();
    const saved = await loadRecord();
    let release!: (record: Awaited<ReturnType<typeof loadRecord>>) => void;
    vi.spyOn(storage, 'loadRecord').mockImplementation(() => new Promise(resolve => { release = resolve; }));

    const host = new LocalHost();
    const restoring = host.restore();
    host.start(418);
    const newer = host.getState();
    release(saved);

    expect(await restoring).toEqual({ restored: false, reason: null });
    expect(host.getState()).toEqual(newer);
    await host.waitForSave();
  });

  it('repairs storage if a newer start supersedes an import whose write was already in flight', async () => {
    const incoming = new LocalHost();
    incoming.start(419);
    await incoming.waitForSave();
    const serialized = await incoming.exportSave();

    const host = new LocalHost();
    host.start(420);
    await host.waitForSave();

    const writeImport = storage.saveRecord;
    let releaseImport!: () => void;
    let markImportStarted!: () => void;
    const importStarted = new Promise<void>(resolve => { markImportStarted = resolve; });
    const importBlocked = new Promise<void>(resolve => { releaseImport = resolve; });
    let writes = 0;
    vi.spyOn(storage, 'saveRecord').mockImplementation(async record => {
      writes += 1;
      if (writes === 1) {
        markImportStarted();
        await importBlocked;
        await writeImport(record);
      } else if (writes === 2) {
        throw new Error('Transient newer-match write failure.');
      } else {
        await writeImport(record);
      }
    });

    const importing = host.importSave(serialized);
    await importStarted;
    host.start(421);
    const current = host.getState();
    releaseImport();

    expect(await importing).toMatchObject({ imported: false });
    await host.waitForSave();
    expect(writes).toBe(3);
    expect((await loadRecord())?.state).toEqual(current);
    expect((await loadRecord())?.originDescriptor).toMatchObject({ kind: 'normal', seed: 421 });
  });

  it('keeps consecutive commands in the same queued match generation valid', async () => {
    const host = new LocalHost();
    host.start(46);
    const initial = host.getState();
    const firstChoice = initial.choice!;
    const first = { id: 'queued-first-choice', expectedSeq: initial.seq, seat: firstChoice.seat,
      intent: { kind: 'answer' as const, answer: { choice: firstChoice.id, selected: ['first'], amounts: {} } } };
    const preview = applyCommand(initial, first, context);
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    const nextChoice = preview.state.choice!;
    const second = { id: 'queued-second-choice', expectedSeq: preview.state.seq, seat: nextChoice.seat,
      intent: { kind: 'answer' as const, answer: { choice: nextChoice.id, selected: ['keep'], amounts: {} } } };
    const firstReply = host.submit(first);
    const secondReply = host.submit(second);
    expect((await firstReply).ok).toBe(true);
    expect(await secondReply).toMatchObject({ ok: true, state: { seq: preview.state.seq + 1 } });
  });

  it('waits for an accepted command before exporting the transcript', async () => {
    const host = new LocalHost();
    host.start(43);
    const state = host.getState();
    const choice = state.choice!;
    const command = { id: 'choose-starting-player', expectedSeq: state.seq, seat: choice.seat,
      intent: { kind: 'answer' as const, answer: { choice: choice.id, selected: [choice.options[0]!.id], amounts: {} } } };
    const pending = host.submit(command);
    const exported = host.exportSave();
    expect((await pending).ok).toBe(true);
    expect(JSON.parse(await exported).transcript).toEqual([command]);
  });

  it('rebuilds exact accepted-command receipts after importing a later state', async () => {
    const source = new LocalHost();
    source.start(4311);
    const start = source.getState();
    const firstChoice = start.choice!;
    const first = { id: 'receipt-first-answer', expectedSeq: start.seq, seat: firstChoice.seat,
      intent: { kind: 'answer' as const, answer: { choice: firstChoice.id, selected: [firstChoice.options[0]!.id], amounts: {} } } };
    const firstReply = await source.submit(first);
    expect(firstReply.ok).toBe(true);
    const next = source.getState().choice!;
    const second = { id: 'receipt-second-answer', expectedSeq: source.getState().seq, seat: next.seat,
      intent: { kind: 'answer' as const, answer: { choice: next.id, selected: [next.options[0]!.id], amounts: {} } } };
    expect((await source.submit(second)).ok).toBe(true);

    const restored = new LocalHost();
    expect(await restored.importSave(await source.exportSave())).toEqual({ imported: true, reason: null });
    expect(await restored.submit(first)).toEqual(firstReply);
    expect(restored.getState().seq).toBe(source.getState().seq);
  });

  it('persists accepted command replies and rejects a modified receipt ledger', async () => {
    const source = new LocalHost();
    source.start(4321);
    const state = source.getState();
    const choice = state.choice!;
    const command = { id: 'ledger-first-choice', expectedSeq: state.seq, seat: choice.seat,
      intent: { kind: 'answer' as const, answer: { choice: choice.id, selected: [choice.options[0]!.id], amounts: {} } } };
    const accepted = await source.submit(command);
    expect(accepted.ok).toBe(true);
    await source.waitForSave();
    const exported = JSON.parse(await source.exportSave()) as {
      receipts?: { command: typeof command; reply: { state: { seq: number }; events: unknown[] } }[];
    };
    expect(exported.receipts).toHaveLength(1);
    expect(exported.receipts![0]).toMatchObject({ command, reply: accepted });

    const recovered = new LocalHost();
    expect(await recovered.restore()).toEqual({ restored: true, reason: null });
    expect(await recovered.submit(command)).toEqual(accepted);
    const reorderedCommand = Object.fromEntries(Object.entries(command).reverse()) as typeof command;
    expect(await recovered.submit(reorderedCommand)).toEqual(accepted);

    exported.receipts![0]!.reply.state.seq += 1;
    const restored = new LocalHost();
    await expect(restored.importSave(JSON.stringify(exported))).resolves.toMatchObject({
      imported: false, reason: expect.stringContaining('receipt'),
    });
    expect(() => restored.getState()).toThrow('Start a match first.');

    const forgedEvent = JSON.parse(await source.exportSave()) as typeof exported;
    forgedEvent.receipts![0]!.reply.events.push({ id: 'forged-event', type: 'forged', data: null });
    const eventRestore = new LocalHost();
    await expect(eventRestore.importSave(JSON.stringify(forgedEvent))).resolves.toMatchObject({
      imported: false, reason: expect.stringContaining('receipt'),
    });
  });

  it('retries persistence for the current match after a storage failure', async () => {
    const save = vi.spyOn(storage, 'saveRecord')
      .mockRejectedValueOnce(new Error('Temporary storage failure.'))
      .mockRejectedValueOnce(new Error('Temporary storage failure.'));
    const host = new LocalHost();
    host.start(431);
    await host.waitForSave();
    expect(host.persistenceError).toBe('Temporary storage failure.');
    const state = host.getState();
    const choice = state.choice!;
    const accepted = { id: 'persist-on-retry', expectedSeq: state.seq, seat: choice.seat,
      intent: { kind: 'answer' as const, answer: { choice: choice.id, selected: [choice.options[0]!.id], amounts: {} } } };
    const firstReply = await host.submit(accepted);
    expect(firstReply.ok).toBe(true);
    await host.waitForSave();
    expect(host.getState().seq).toBe(state.seq + 1);
    expect(await host.submit(accepted)).toEqual(firstReply);
    expect(host.getState().seq).toBe(state.seq + 1);
    expect(await host.retrySave()).toBe(true);
    expect(host.persistenceError).toBeNull();
    expect(save).toHaveBeenCalledTimes(3);
    expect((await loadRecord())?.transcript.map(command => command.id)).toEqual(['persist-on-retry']);
    expect(JSON.parse(await host.exportSave()).transcript.map((command: { id: string }) => command.id)).toEqual(['persist-on-retry']);
  });

  it('does not expose mutable authoritative state through snapshots or command replies', async () => {
    const host = new LocalHost();
    host.start(44);
    const exposed = host.getState();
    const expectedSequence = exposed.seq;
    const expectedDeckLength = exposed.zones[0].deck.length;
    exposed.seq = 900;
    exposed.zones[0].deck.splice(0);
    expect(host.getState().seq).toBe(expectedSequence);
    expect(host.getState().zones[0].deck).toHaveLength(expectedDeckLength);
    const projected = host.view(0);
    projected.seq = 902;
    projected.zones[0].deck.push('tampered');
    expect(host.getState().seq).toBe(expectedSequence);
    expect(host.getState().zones[0].deck).toHaveLength(expectedDeckLength);

    const state = host.getState();
    const choice = state.choice!;
    const reply = await host.submit({ id: 'clone-reply-choice', expectedSeq: state.seq, seat: choice.seat,
      intent: { kind: 'answer', answer: { choice: choice.id, selected: [choice.options[0]!.id], amounts: {} } } });
    expect(reply.ok).toBe(true);
    if (!reply.ok) return;
    const acceptedSequence = host.getState().seq;
    const acceptedDeckLength = host.getState().zones[0].deck.length;
    reply.state.seq = 901;
    reply.state.zones[0].deck.splice(0);
    expect(host.getState().seq).toBe(acceptedSequence);
    expect(host.getState().zones[0].deck).toHaveLength(acceptedDeckLength);
  });

  it('does not reserve a command ID for a rejected action', async () => {
    const host = new LocalHost();
    host.start(45);
    const state = host.getState();
    const choice = state.choice!;
    const invalid = await host.submit({ id: 'retry-after-invalid', expectedSeq: state.seq, seat: choice.seat,
      intent: { kind: 'answer', answer: { choice: choice.id, selected: ['not-an-option'], amounts: {} } } });
    expect(invalid.ok).toBe(false);
    expect(JSON.parse(await host.exportSave()).transcript).toEqual([]);
    const valid = await host.submit({ id: 'retry-after-invalid', expectedSeq: state.seq, seat: choice.seat,
      intent: { kind: 'answer', answer: { choice: choice.id, selected: [choice.options[0]!.id], amounts: {} } } });
    expect(valid.ok).toBe(true);
    expect(JSON.parse(await host.exportSave()).transcript.map((command: { id: string }) => command.id))
      .toEqual(['retry-after-invalid']);
  });
});
