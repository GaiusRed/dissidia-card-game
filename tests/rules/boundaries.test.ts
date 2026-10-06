import { describe, expect, it } from 'vitest';
import { commandSchema } from '../../src/rules/codec';

describe('command boundary', () => {
  it('rejects a seat that is not one of the two players', () => {
    const parsed = commandSchema.safeParse({
      id: 'invalid-seat', expectedSeq: 0, seat: 2, intent: { kind: 'pass' },
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects unknown command and intent fields', () => {
    const parsed = commandSchema.safeParse({
      id: 'extra-field', expectedSeq: 0, seat: 0, ignored: true, intent: { kind: 'pass' },
    });

    expect(parsed.success).toBe(false);
  });
});
