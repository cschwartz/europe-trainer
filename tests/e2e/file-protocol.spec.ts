import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from '@playwright/test';
import { createProfile, answerOne } from './helpers';

const here = dirname(fileURLToPath(import.meta.url));

// The singlefile build's whole point is to run standalone from disk, so this
// spec bypasses the webServer/baseURL and opens the built dist/index.html
// directly via file://, unlike the rest of the suite.
test('the built dist/index.html boots and works standalone over file://', async ({ page }) => {
  const url = 'file://' + resolve(here, '../../dist/index.html');
  await page.goto(url);
  await createProfile(page, 'Max');
  await page.locator('.big-start').click();
  await page.waitForSelector('.session', { timeout: 4000 });
  await answerOne(page);
});
