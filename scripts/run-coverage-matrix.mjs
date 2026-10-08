import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { checkExecutionEvidence } from './coverage-evidence.js';

const root = process.cwd();
const resultDirectory = resolve(root, '.coverage-reports');
mkdirSync(resultDirectory, { recursive: true });

function run(args, env = process.env) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const args of [
  ['node_modules/typescript/bin/tsc', '--noEmit'],
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.rules.json', '--noEmit'],
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.tests.json', '--noEmit'],
  ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.worker.json', '--noEmit'],
  ['node_modules/vite/bin/vite.js', 'build'],
  ['node_modules/vitest/vitest.mjs', 'run', '--reporter=json', '--outputFile=.coverage-reports/vitest-coverage.json'],
]) run(args);

run(['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.config.ts', '--reporter=json'], {
  ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: '.coverage-reports/e2e-coverage.json',
});
run(['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.ui-design.config.ts']);
copyFileSync(resolve(root, 'test-results/ui-design-results.json'), resolve(resultDirectory, 'ui-design-coverage.json'));
run(['scripts/test-release.mjs'], { ...process.env, DISSIDIA_JSON_REPORT_PATH: '.coverage-reports/release-coverage.json' });

const reportPaths = [
  '.coverage-reports/vitest-coverage.json',
  '.coverage-reports/e2e-coverage.json',
  '.coverage-reports/ui-design-coverage.json',
  '.coverage-reports/release-coverage.json',
];
const reports = reportPaths.map(path => JSON.parse(readFileSync(resolve(root, path), 'utf8')));
const coverage = readFileSync(resolve(root, 'docs/rules-coverage.md'), 'utf8');
const errors = checkExecutionEvidence(reports, coverage, root);
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log('Every test file referenced by docs/rules-coverage.md ran and passed with no skipped assertions.');
}
