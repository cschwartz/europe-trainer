import { test, expect } from '@playwright/test';
import { createProfile } from './helpers';

test('tapping a country shows its info, zoom and reset controls work', async ({ page }) => {
  await page.goto('/');
  await createProfile(page, 'Max');
  await page.locator('.mode-tile', { hasText: 'Erkunden' }).click();
  await page.waitForSelector('.explore-map .map-svg', { timeout: 4000 });

  await page.locator('.map-controls button[aria-label="Hineinzoomen"]').click();
  await page.waitForTimeout(300);
  await page.locator('.map-svg path[data-country="de"]').click({ force: true });
  await page.waitForTimeout(300);
  await expect(page.locator('.explore-info-main strong')).toHaveText('Deutschland');

  await page.locator('.map-controls button[aria-label="Ansicht zurücksetzen"]').click();
});
