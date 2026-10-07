import { describe, expect, it } from 'vitest';
import { resumeRefSchema } from '../../src/rules/contracts/execution';

describe('card execution contracts', () => {
  it('accepts a JSON continuation reference and rejects executable payloads', () => {
    expect(resumeRefSchema.safeParse({
      script: 'P-015C', version: '1', ability: 'scorch', step: 'resolve', payload: null,
    }).success).toBe(true);
    expect(resumeRefSchema.safeParse({
      script: 'P-015C', version: '1', ability: 'scorch', step: 'resolve', payload: () => 1,
    }).success).toBe(false);
  });
});
