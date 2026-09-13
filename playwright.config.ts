import { defineConfig } from '@playwright/test';

// Custom viewports (not Playwright's built-in device presets) matching the
// hand-tuned settings the old scripts/smoke.mjs used, to preserve behavioral
// parity with the script this suite replaces.
const MOBILE = { deviceScaleFactor: 2, isMobile: true, hasTouch: true } as const;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'phone',
      use: { ...MOBILE, viewport: { width: 390, height: 844 }, browserName: 'chromium' },
    },
    {
      name: 'tablet',
      use: { ...MOBILE, viewport: { width: 820, height: 1180 }, browserName: 'chromium' },
    },
  ],
});
