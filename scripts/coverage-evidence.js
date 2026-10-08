import { relative, resolve, sep } from 'node:path';

const testReferencePattern = /`(tests\/[a-zA-Z0-9_./-]+\.(?:test|spec)\.ts)`/g;

function normalizePath(value) {
  return value.split(sep).join('/').replaceAll('\\', '/');
}

export function checkExecutionEvidence(report, coverageMarkdown, root) {
  const references = [...coverageMarkdown.matchAll(testReferencePattern)].map(match => match[1]);
  const required = new Set(references);
  const executed = new Map();
  for (const current of Array.isArray(report) ? report : [report]) {
    const reportRoot = current.config?.rootDir ? resolve(current.config.rootDir) : root;
    for (const result of current.testResults ?? []) {
      const testPath = normalizePath(relative(root, resolve(result.name)));
      executed.set(testPath, { kind: 'vitest', result });
    }
    const visitSuite = (suite, parentFile = '') => {
      const file = suite.file ? resolve(reportRoot, suite.file) : parentFile;
      for (const spec of suite.specs ?? []) {
        const specFile = spec.file ? resolve(reportRoot, spec.file) : file;
        if (!specFile) continue;
        const testPath = normalizePath(relative(root, specFile));
        const currentTests = spec.tests ?? [];
        const previous = executed.get(testPath);
        executed.set(testPath, { kind: 'playwright', tests: [...(previous?.tests ?? []), ...currentTests] });
      }
      for (const child of suite.suites ?? []) visitSuite(child, file);
    };
    for (const suite of current.suites ?? []) visitSuite(suite);
  }

  const errors = [];
  for (const testPath of required) {
    const result = executed.get(testPath);
    if (!result) {
      errors.push(`Coverage evidence is missing referenced test: ${testPath}.`);
      continue;
    }
    if (result.kind === 'vitest') {
      if (result.result.status !== 'passed') errors.push(`Coverage evidence did not pass: ${testPath}.`);
      const assertions = result.result.assertionResults ?? [];
      if (assertions.length === 0 || assertions.some(assertion => assertion.status !== 'passed')) {
        errors.push(`Coverage evidence has a skipped or unreported assertion in: ${testPath}.`);
      }
    } else {
      const tests = result.tests ?? [];
      if (tests.length === 0 || tests.some(test => test.status !== 'expected' ||
          test.results.length === 0 || test.results.at(-1)?.status !== 'passed')) {
        errors.push(`Coverage evidence has a skipped or failed browser test in: ${testPath}.`);
      }
    }
  }
  return errors;
}
