import { test, expect } from '@playwright/test';
import { createProfile } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await createProfile(page, 'Max');
  await page.locator('.mode-tile', { hasText: 'Üben' }).click();
  await page.waitForSelector('.practice');
  // Restrict to a naming direction so the chosen level actually determines the
  // answer UI (map-answer directions always render the map regardless of level).
  for (const d of ['Land → auf der Karte zeigen', 'Hauptstadt → Land auf der Karte zeigen']) {
    const chip = page.locator('.chip', { hasText: new RegExp(`^${d}$`) });
    if ((await chip.getAttribute('aria-pressed')) === 'true') await chip.click();
  }
});

test('HARD level shows a free-text input', async ({ page }) => {
  await page.locator('.chip', { hasText: /^Schwer$/ }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForSelector('.session');
  await page.waitForTimeout(300);
  await expect(page.locator('.freetext')).toBeVisible();
});

test('MEDIUM level shows a list picker', async ({ page }) => {
  await page.locator('.chip', { hasText: /^Mittel$/ }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await page.waitForSelector('.session');
  await page.waitForTimeout(300);
  await expect(page.locator('.listpicker')).toBeVisible();
});
