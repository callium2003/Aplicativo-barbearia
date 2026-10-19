import { defineConfig } from '@playwright/test';
import { CRITICAL_APP, requireCriticalTarget } from './scripts/critical-test-environment.mjs';

requireCriticalTarget(process.env.CRITICAL_API_URL);
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  globalTimeout: 600_000,
  expect: { timeout: 30_000 },
  reporter: 'list',
  outputDir: '.tmp/critical-tests/results',
  use: { baseURL: CRITICAL_APP, viewport: { width: 390, height: 844 }, trace: 'off', screenshot: 'off' },
  webServer: {
    command: 'node scripts/start-critical-app.mjs',
    url: `${CRITICAL_APP}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
