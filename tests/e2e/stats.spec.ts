import { test, expect } from '@playwright/test';
import { createProfile } from './helpers';

test('stats screen renders per-direction bars', async ({ page }) => {
  await page.goto('/');
  await createProfile(page, 'Max');
  await page.locator('.icon-btn[aria-label="Fortschritt"]').click();
  await page.waitForSelector('.stats', { timeout: 4000 });
  await expect(page.locator('.bar-row').first()).toBeVisible();
});

test('exporting a backup copies the profile data to the clipboard', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Clipboard permissions are only grantable in Chromium.');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await createProfile(page, 'Max');
  await page.locator('.icon-btn[aria-label="Fortschritt"]').click();
  await page.waitForSelector('.stats', { timeout: 4000 });

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Sichern' }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toContain('"Max"');
});
