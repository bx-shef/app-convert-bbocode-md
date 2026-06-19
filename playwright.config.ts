import { defineConfig, devices } from '@playwright/test'

/**
 * E2E / visual verification. Runs against the production server
 * (`node .output/server/index.mjs`), so `pnpm build` must run first
 * (CI builds before this step; locally run `pnpm build` once).
 *
 * Assertions are functional + a dark-mode contrast guard rather than pixel
 * baselines (those flake across font stacks / machines). Screenshots are
 * written to `e2e/output/` and uploaded as CI artifacts for human review.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/output/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never', outputFolder: 'e2e/output/report' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'node .output/server/index.mjs',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})
