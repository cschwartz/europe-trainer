import { test, expect } from '@playwright/test';
import { createProfile, home } from './helpers';

test('creating a profile lands on Home', async ({ page }) => {
  await page.goto('/');
  await createProfile(page, 'Max');
  await expect(page.locator('.home')).toBeVisible();
  await expect(page.getByText('Max')).toBeVisible();
});

test('the "Los" button is disabled until a name is entered', async ({ page }) => {
  await page.goto('/');
  const submit = page.getByRole('button', { name: 'Los' });
  await expect(submit).toBeDisabled();
  await page.getByPlaceholder('Dein Name').fill('  ');
  await expect(submit).toBeDisabled();
  await page.getByPlaceholder('Dein Name').fill('Max');
  await expect(submit).toBeEnabled();
});

test('creating a second profile and switching back to the first', async ({ page }) => {
  await page.goto('/');
  await createProfile(page, 'Max');
  await page.locator('.profile-pill').click();
  await page.getByText('+ Neues Profil').click();
  await createProfile(page, 'Mia');
  await expect(page.getByText('Mia')).toBeVisible();

  await page.locator('.profile-pill').click();
  await page.locator('.profile-row', { hasText: 'Max' }).click();
  await home(page);
  await expect(page.getByText('Max')).toBeVisible();
});
