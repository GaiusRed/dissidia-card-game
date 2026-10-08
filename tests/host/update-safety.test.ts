import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { LocalHost } from '../../src/host/local-host';
import { loadRecord, saveRecord } from '../../src/storage/indexed-db';
import type { MatchSave } from '../../src/storage/save';

describe('offline update safety', () => {
  it('blocks activation during an unfinished match, including while the menu is open', async () => {
    const host = new LocalHost();
    host.start(31);
    expect(await host.requestUpdate()).toEqual({
      allowed: false, reason: 'Finish or abandon the current match before updating.',
    });
  });

  it('permits activation after deliberate abandonment and clears the old save first', async () => {
    const host = new LocalHost();
    host.start(32);
    await host.abandon();
    expect(await host.requestUpdate()).toEqual({ allowed: true, reason: null });
    await expect(host.restore()).resolves.toEqual({ restored: false, reason: null });
  });

  it('permits activation after the match reaches an outcome', async () => {
    const host = new LocalHost();
    host.start(33);
    const state = host.getState();
    await host.submit({ id: 'concede', expectedSeq: state.seq, seat: state.active, intent: { kind: 'concede' } });
    expect(await host.requestUpdate()).toEqual({ allowed: true, reason: null });
  });

  it('preserves the originating client build when an unfinished match restores and saves again', async () => {
    const original = new LocalHost();
    original.start(34);
    const record = JSON.parse(await original.exportSave()) as MatchSave;
    record.clientBuild = 'release-a';
    await saveRecord(record);

    const resumed = new LocalHost();
    await expect(resumed.restore()).resolves.toEqual({ restored: true, reason: null });
    const restored = JSON.parse(await resumed.exportSave()) as MatchSave;
    expect(restored.clientBuild).toBe('release-a');
    expect((await loadRecord())?.clientBuild).toBe('release-a');
  });
});
