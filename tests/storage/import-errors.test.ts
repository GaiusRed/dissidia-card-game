import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { LocalHost } from '../../src/host/local-host';
import { createSave, inspectSave } from '../../src/storage/save';
import { fixture } from '../support/harness';

describe('save import errors', () => {
  it('returns a normal failure for JSON with a supported label but no version metadata', async () => {
    const host = new LocalHost();
    await expect(host.importSave(JSON.stringify({ format: 'dissidia-save-v1' }))).resolves.toMatchObject({
      imported: false,
      reason: expect.any(String),
    });
  });

  it('returns a normal failure for malformed JSON and null metadata', async () => {
    const host = new LocalHost();
    await expect(host.importSave('{')).resolves.toMatchObject({ imported: false });
    await expect(host.importSave('null')).resolves.toMatchObject({ imported: false });
  });

  it('rejects a supported save label when its nested match state is malformed', () => {
    const save = createSave(fixture({}).state, []);
    const malformed = { ...save, state: { seq: 0 } };
    expect(inspectSave(malformed, save.versions)).toMatchObject({ compatible: false, reason: expect.any(String) });
  });
});
