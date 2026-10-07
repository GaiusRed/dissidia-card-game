import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { LocalHost } from '../../src/host/local-host';
import type { MatchSave } from '../../src/storage/save';

describe('save origin reconstruction', () => {
  it('reconstructs registered scenario origins during import', async () => {
    const source = new LocalHost();
    source.startScenario('end-trigger-order');
    await source.waitForSave();
    const exported = await source.exportSave();

    const restored = new LocalHost();
    expect(await restored.importSave(exported)).toEqual({ imported: true, reason: null });
    expect(restored.getState()).toEqual(source.getState());
  });

  it('accepts valid origin and final snapshots with reordered JSON properties', async () => {
    const source = new LocalHost();
    source.start(31);
    await source.waitForSave();
    const save = JSON.parse(await source.exportSave()) as MatchSave;
    save.origin = Object.fromEntries(Object.entries(save.origin).reverse()) as unknown as MatchSave['origin'];
    save.state = Object.fromEntries(Object.entries(save.state).reverse()) as unknown as MatchSave['state'];

    const restored = new LocalHost();
    expect(await restored.importSave(JSON.stringify(save))).toEqual({ imported: true, reason: null });
    expect(restored.getState()).toEqual(source.getState());
  });

  it('rejects a replay-consistent origin rewritten in both snapshots', async () => {
    const source = new LocalHost();
    source.start(29);
    await source.waitForSave();
    const save = JSON.parse(await source.exportSave()) as MatchSave;
    save.origin.rng = (save.origin.rng + 1) >>> 0;
    save.state.rng = save.origin.rng;

    const restored = new LocalHost();
    const result = await restored.importSave(JSON.stringify(save));
    expect(result).toMatchObject({ imported: false, reason: expect.stringContaining('origin') });
    expect(() => restored.getState()).toThrow('Start a match first.');
  });
});
