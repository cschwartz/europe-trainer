import { test, expect } from '@playwright/test';
import { createProfile, answerOne, toHome } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await createProfile(page, 'Max');
});

test('a smart-mix session of 15 questions ends on the results screen', async ({ page }) => {
  await page.locator('.big-start').click();
  await page.waitForSelector('.session', { timeout: 4000 });
  for (let i = 0; i < 15; i++) {
    await answerOne(page);
    if (await page.locator('.results-card').count()) break;
  }
  await expect(page.locator('.results-card')).toBeVisible();
});

test('a non-text question screen never scrolls', async ({ page }) => {
  await page.locator('.big-start').click();
  await page.waitForSelector('.session');
  for (let i = 0; i < 6; i++) {
    await page.waitForSelector('.q-answer');
    await page.waitForTimeout(150);
    if (!(await page.locator('.freetext, .listpicker').count())) {
      const overflow = await page.evaluate(() => {
        const s = document.querySelector('.session')!;
        return s.scrollHeight - s.clientHeight;
      });
      expect(overflow).toBeLessThanOrEqual(2);
    }
    await answerOne(page);
    if (await page.locator('.results-card').count()) break;
  }
  await toHome(page);
});
