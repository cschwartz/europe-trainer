import type { Page } from '@playwright/test';

export async function home(page: Page): Promise<void> {
  await page.waitForSelector('.home', { timeout: 4000 });
}

export async function createProfile(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder('Dein Name').fill(name);
  await page.getByRole('button', { name: 'Los' }).click();
  await home(page);
}

/** From wherever a session/results/explore/stats screen is, get back to Home. */
export async function toHome(page: Page): Promise<void> {
  for (const sel of [
    '.results-card >> text=Startseite',
    '.session .icon-btn[aria-label="Beenden"]',
    '.explore .icon-btn',
    '.stats .icon-btn',
  ]) {
    if (await page.locator(sel).count()) {
      await page.locator(sel).first().click();
      break;
    }
  }
  await home(page);
}

/** Answer whatever question UI is currently showing and dismiss the feedback. */
export async function answerOne(page: Page): Promise<void> {
  await page.waitForSelector('.q-answer', { timeout: 4000 });
  await page.waitForTimeout(200);
  if (await page.locator('.choice:visible').count()) {
    await page.locator('.choice:visible').first().click();
  } else if (await page.locator('.listpicker').count()) {
    await page.locator('.listpicker .choice').first().click();
  } else if (await page.locator('.freetext').count()) {
    await page.locator('.freetext input').fill('Test');
    await page.getByRole('button', { name: 'Prüfen' }).click();
  } else if (await page.locator('.map-confirm').count()) {
    const box = await page.locator('.map .map-svg').boundingBox();
    const btn = page.getByRole('button', { name: 'Bestätigen' });
    for (const [fx, fy] of [
      [0.5, 0.55],
      [0.45, 0.5],
      [0.55, 0.45],
      [0.5, 0.35],
    ] as const) {
      await page.mouse.click(box!.x + box!.width * fx, box!.y + box!.height * fy);
      await page.waitForTimeout(120);
      if (await btn.isEnabled()) break;
    }
    if (!(await btn.isEnabled())) throw new Error('could not pick a country on the map');
    await btn.click();
  } else {
    throw new Error('no answer UI');
  }
  await page.waitForSelector('.feedback', { timeout: 4000 });
  const weiter = page.getByRole('button', { name: 'Weiter' });
  if (await weiter.count()) await weiter.click();
  await page.waitForTimeout(250);
}
