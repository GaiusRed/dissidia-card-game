import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui-design',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: 'test-results/ui-design',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}-{platform}{ext}',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/ui-design', open: 'never' }],
    ['json', { outputFile: 'test-results/ui-design-results.json' }]],
  use: {
    ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure', screenshot: 'on', video: 'retain-on-failure',
  },
  projects: [
    { name: '1280-normal', use: { viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' } },
    { name: '1280-reduced', use: { viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' } },
    { name: '1920-normal', use: { viewport: { width: 1920, height: 1080 }, reducedMotion: 'no-preference' } },
    { name: '1920-reduced', use: { viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174', reuseExistingServer: false,
  },
});
