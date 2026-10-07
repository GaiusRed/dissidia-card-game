import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { commandSchema } from '../../src/rules/codec';
import { findBoundaryViolations } from '../../scripts/check-boundaries.mjs';

describe('command boundary', () => {
  it('keeps browser presentation on projected host views', () => {
    expect(findBoundaryViolations()).not.toContain(
      'src/main.ts: presentation must read host projections, not authoritative state',
    );
  });

  it('rejects content-handler imports from browser presentation files', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'dissidia-presentation-boundary-'));
    try {
      const source = path.join(root, 'src');
      mkdirSync(path.join(source, 'client'), { recursive: true });
      writeFileSync(path.join(source, 'main.ts'), "import handlers from './content/handlers';\n");
      mkdirSync(path.join(source, 'content'), { recursive: true });
      writeFileSync(path.join(source, 'client', 'screen.ts'), "import legacy from '../content/shared/legacy';\n");

      const issues = findBoundaryViolations(root);

      expect(issues).toContain('src/main.ts: presentation must not import runtime card handlers');
      expect(issues).toContain('src/client/screen.ts: presentation must not import runtime card handlers');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('rejects card identity switches and content imports from rules', () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'dissidia-boundary-'));
    try {
      const rules = path.join(root, 'src/rules');
      const cards = path.join(root, 'src/content/cards/opus-ph');
      mkdirSync(rules, { recursive: true });
      mkdirSync(cards, { recursive: true });
      writeFileSync(path.join(cards, 'P-015C.ts'), 'export const card = { "number": "P-015C", "name": "Scorch" };');
      writeFileSync(path.join(rules, 'engine.ts'), [
        'import card from "../content/cards/opus-ph/P-015C";',
        'const number = "P-015C";',
        'const name = "Scorch";',
      ].join('\n'));
      const issues = findBoundaryViolations(root);
      expect(issues).toContainEqual(expect.stringContaining("card identity 'P-015C'"));
      expect(issues).toContainEqual(expect.stringContaining("card identity 'Scorch'"));
      expect(issues).toContainEqual(expect.stringContaining("local import leaves src/rules"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

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
