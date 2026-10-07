import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { LocalHost } from '../../src/host/local-host';

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
});
