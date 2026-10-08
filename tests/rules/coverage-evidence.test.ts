import { describe, expect, it } from 'vitest';
import { checkExecutionEvidence } from '../../scripts/coverage-evidence.js';

const coverage = '| Rule | Test |\n|---|---|\n| setup | `tests/rules/setup.test.ts` |';
const evidence = (status: string, assertionStatus = 'passed') => ({ testResults: [{
  name: 'C:/repo/tests/rules/setup.test.ts', status,
  assertionResults: [{ status: assertionStatus }],
}] });

describe('coverage execution evidence', () => {
  it('accepts a linked test file when it ran and all assertions passed', () => {
    expect(checkExecutionEvidence(evidence('passed'), coverage, 'C:/repo')).toEqual([]);
  });

  it('rejects a referenced file absent from the fresh run', () => {
    expect(checkExecutionEvidence({ testResults: [] }, coverage, 'C:/repo'))
      .toContain('Coverage evidence is missing referenced test: tests/rules/setup.test.ts.');
  });

  it('rejects a referenced file with skipped tests', () => {
    expect(checkExecutionEvidence(evidence('passed', 'pending'), coverage, 'C:/repo'))
      .toContain('Coverage evidence has a skipped or unreported assertion in: tests/rules/setup.test.ts.');
  });

  it('rejects a referenced file that failed', () => {
    expect(checkExecutionEvidence(evidence('failed'), coverage, 'C:/repo'))
      .toContain('Coverage evidence did not pass: tests/rules/setup.test.ts.');
  });

  it('accepts linked Playwright evidence from a nested report suite', () => {
    const browserCoverage = '| Browser | Test |\n|---|---|\n| duel | `tests/e2e/smoke.spec.ts` |';
    const browserReport = { suites: [{ file: 'tests/e2e/smoke.spec.ts', specs: [{ file: 'tests/e2e/smoke.spec.ts', tests: [
      { status: 'expected', results: [{ status: 'passed' }] },
    ] }] }] };
    expect(checkExecutionEvidence(browserReport, browserCoverage, 'C:/repo')).toEqual([]);
  });

  it('rejects skipped Playwright evidence', () => {
    const browserCoverage = '| Browser | Test |\n|---|---|\n| duel | `tests/e2e/smoke.spec.ts` |';
    const browserReport = { suites: [{ file: 'tests/e2e/smoke.spec.ts', specs: [{ file: 'tests/e2e/smoke.spec.ts', tests: [
      { status: 'skipped', results: [] },
    ] }] }] };
    expect(checkExecutionEvidence(browserReport, browserCoverage, 'C:/repo'))
      .toContain('Coverage evidence has a skipped or failed browser test in: tests/e2e/smoke.spec.ts.');
  });
});
