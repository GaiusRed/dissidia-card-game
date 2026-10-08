import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkExecutionEvidence } from './coverage-evidence.js';

const root = process.cwd();
const reportPaths = process.argv.flatMap((arg, index) => arg === '--report' && process.argv[index + 1]
  ? [resolve(root, process.argv[index + 1])] : []);
if (reportPaths.length === 0) {
  console.error('Usage: node scripts/check-test-evidence.mjs --report <test-json-report> [--report <test-json-report> ...]');
  process.exit(2);
}

const reports = reportPaths.map(path => JSON.parse(readFileSync(path, 'utf8')));
const coverage = readFileSync(resolve(root, 'docs/rules-coverage.md'), 'utf8');
const errors = checkExecutionEvidence(reports, coverage, root);
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  const references = new Set([...coverage.matchAll(/`(tests\/[a-zA-Z0-9_./-]+\.(?:test|spec)\.ts)`/g)].map(match => match[1]));
  console.log(`Executed coverage evidence: ${references.size} linked test files passed with no skipped or unreported assertions.`);
}
