import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { createSave, inspectSave } from '../../src/storage/save';
import { loadRecord, saveRecord } from '../../src/storage/indexed-db';
import { replaySave } from '../../src/storage/replay';
import { applyCommand } from '../../src/rules/engine';
import { context, fixture } from '../support/harness';

describe('match saves', () => {
  it('round trips complete state including an open choice and command history', async () => {
    const state = fixture({}).state;
    const save = createSave(state, []);
    await saveRecord(save);
    const restored = await loadRecord();
    expect(restored).toEqual(save);
    expect(inspectSave(restored!, state.versions)).toEqual({ compatible: true, reason: null });
  });
  it('rejects an incompatible save without modifying it', () => {
    const save = createSave(fixture({}).state, []);
    expect(inspectSave(save, { ...save.versions, engine: 'future' }).compatible).toBe(false);
  });
  it('replays accepted commands from the saved origin and checks the final state', () => {
    const origin = fixture({}).state;
    const reply = applyCommand(origin, { id: 'end', expectedSeq: 0, seat: 0, intent: { kind: 'concede' } }, context);
    if (!reply.ok) throw new Error('concession should be accepted');
    const save = createSave(reply.state, [{ id: 'end', expectedSeq: 0, seat: 0, intent: { kind: 'concede' } }], origin);
    expect(replaySave(origin, save, context)).toEqual(reply.state);
  });
  it('rejects a tampered transcript that reuses an accepted command ID', () => {
    const origin = fixture({}).state;
    const command = { id: 'reused', expectedSeq: 0, seat: 0 as const, intent: { kind: 'concede' as const } };
    const reply = applyCommand(origin, command, context);
    if (!reply.ok) throw new Error('concession should be accepted');
    const tampered = createSave(reply.state, [command, { ...command, expectedSeq: 1 }], origin);
    expect(() => replaySave(origin, tampered, context)).toThrow('duplicate command ID');
  });
});
