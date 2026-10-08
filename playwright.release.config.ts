import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/release',
  outputDir: 'test-results/release-run',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174', trace: 'retain-on-failure' },
  webServer: {
    command: 'node scripts/serve-update-builds.mjs',
    url: 'http://127.0.0.1:4174/__test/build',
    reuseExistingServer: false,
  },
});
