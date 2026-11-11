import { defineConfig, devices } from '@playwright/test';

/**
 * E2E runs against `vite preview` + the local /api bridge.
 * By default it uses the committed, non-personal fixtures (tests/fixtures/site)
 * and a test-only passphrase. Set E2E_PRIVATE_DIR=.private/site locally to
 * exercise the real content (screenshots then land in .private/, never in git).
 */
export const E2E_PASSPHRASE = 'little moon test';
const HASH =
  'scrypt:32768:8:1:LQ2YR08QBgurnY1G3fXJSQ==:5IA32wbbXsvwXQOFz4aYJ9c25Z7ouKkHS5bIA6wM16g=';
const PORT = 4318;
const BASE = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: BASE, trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npx vite preview --port ${PORT} --strictPort`,
        url: `${BASE}/api/session`,
        reuseExistingServer: false,
        timeout: 60_000,
        env: {
          SITE_PASSPHRASE_HASH: HASH,
          SESSION_SECRET: 'e2e-only-secret-not-used-anywhere-else-0123456789',
          PRIVATE_STORAGE: 'local',
          PRIVATE_DIR: process.env.E2E_PRIVATE_DIR ?? 'tests/fixtures/site',
          COOKIE_SECURE: 'false',
        },
      },
});
