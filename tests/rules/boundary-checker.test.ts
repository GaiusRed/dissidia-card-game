import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findBoundaryViolations } from '../../scripts/check-boundaries.mjs';

let root = '';
afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); root = ''; });

describe('rules dependency boundary', () => {
  it('finds browser globals and nondeterministic calls in a local rules import', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dissidia-boundary-'));
    await mkdir(path.join(root, 'src/rules'), { recursive: true });
    await writeFile(path.join(root, 'src/rules/state.ts'), 'export const state = { now: Date.now(), roll: Math.random(), node: document.body };');

    expect(findBoundaryViolations(root)).toEqual(expect.arrayContaining([
      expect.stringContaining('Date.now'), expect.stringContaining('Math.random'), expect.stringContaining('document'),
    ]));
  });

  it('follows local rules imports before checking dependencies', async () => {
    root = await mkdtemp(path.join(tmpdir(), 'dissidia-boundary-'));
    await mkdir(path.join(root, 'src/rules'), { recursive: true });
    await writeFile(path.join(root, 'src/rules/index.ts'), "import './random'; export const ok = true;");
    await writeFile(path.join(root, 'src/rules/random.ts'), "export const result = fetch('/cards');");

    expect(findBoundaryViolations(root)).toEqual(expect.arrayContaining([
      expect.stringContaining('fetch'),
    ]));
  });
});
