import { test, expect } from '@playwright/test';
import { createProfile, home } from './helpers';

test('profile data survives a reload', async ({ page }) => {
  await page.goto('/');
  await createProfile(page, 'Max');

  // Wait for the debounced localStorage write to flush instead of a fixed sleep.
  await page.waitForFunction(() => localStorage.getItem('europa-trainer') !== null);

  await page.reload();
  await home(page);
  await expect(page.getByText('Max')).toBeVisible();
});
