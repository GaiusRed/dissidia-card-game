import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit']);
run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.rules.json', '--noEmit']);
run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.tests.json', '--noEmit']);
run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.worker.json', '--noEmit']);

const vite = resolve('node_modules/vite/bin/vite.js');
for (const build of ['A', 'B']) {
  const env = {
    ...process.env,
    DISSIDIA_BUILD_ID: `release-${build}`,
    DISSIDIA_OUT_DIR: `test-results/release-build-${build.toLowerCase()}`,
  };
  run(process.execPath, [vite, 'build'], env);
}
const playwrightArgs = ['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.release.config.ts'];
const playwrightEnv = { ...process.env };
if (process.env.DISSIDIA_JSON_REPORT_PATH) {
  playwrightArgs.push('--reporter=json');
  playwrightEnv.PLAYWRIGHT_JSON_OUTPUT_NAME = process.env.DISSIDIA_JSON_REPORT_PATH;
}
run(process.execPath, playwrightArgs, playwrightEnv);
