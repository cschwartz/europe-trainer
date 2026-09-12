/** Headless smoke test of the built single-file app, at a phone and a tablet size. */
import { chromium } from 'playwright-core';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'file://' + resolve(root, 'dist/index.html');

const VIEWPORTS = [
  { tag: 'phone', width: 390, height: 844 },
  { tag: 'tablet', width: 820, height: 1180 },
];

const browser = await chromium.launch();
let failures = 0;

for (const vp of VIEWPORTS) {
  console.log(`\n=== ${vp.tag} (${vp.width}x${vp.height}) ===`);
  failures += await run(vp);
}

await browser.close();
process.exit(failures ? 1 : 0);

async function run({ tag, width, height }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  const shot = (p) => resolve(root, 'scripts', `.smoke-${tag}-${p}.png`);

  let failed = 0;
  const step = async (name, fn) => {
    try {
      await fn();
      console.log(`  ok   ${name}`);
    } catch (e) {
      failed++;
      console.error(`  FAIL ${name}: ${e.message.split('\n')[0]}`);
      await page.screenshot({ path: shot(`fail-${name}`) }).catch(() => {});
    }
  };
  const home = () => page.waitForSelector('.home', { timeout: 4000 });
  const toHome = async () => {
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
    await home();
  };
  const answerOne = async () => {
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
      for (const [fx, fy] of [[0.5, 0.55], [0.45, 0.5], [0.55, 0.45], [0.5, 0.35]]) {
        await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
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
  };

  await page.goto(URL);
  await page.waitForTimeout(400);

  await step('create profile', async () => {
    await page.getByPlaceholder('Dein Name').fill('Max');
    await page.getByRole('button', { name: 'Los' }).click();
    await home();
  });
  await page.screenshot({ path: shot('home') });

  await step('smart session: 15 questions -> results', async () => {
    await page.locator('.big-start').click();
    await page.waitForSelector('.session', { timeout: 4000 });
    for (let i = 0; i < 15; i++) {
      if (i === 4) await page.screenshot({ path: shot('question') });
      await answerOne();
      if (await page.locator('.results-card').count()) break;
    }
    await page.waitForSelector('.results-card', { timeout: 4000 });
  });
  await page.screenshot({ path: shot('results') });

  await step('no session screen scrolls (map questions stay pinned)', async () => {
    await toHome();
    await page.locator('.big-start').click();
    await page.waitForSelector('.session');
    for (let i = 0; i < 6; i++) {
      await page.waitForSelector('.q-answer');
      await page.waitForTimeout(150);
      // for a non-text question the session must fit the viewport exactly
      if (!(await page.locator('.freetext, .listpicker').count())) {
        const overflow = await page.evaluate(() => {
          const s = document.querySelector('.session');
          return s.scrollHeight - s.clientHeight;
        });
        if (overflow > 2) throw new Error(`session overflows by ${overflow}px`);
      }
      await answerOne();
      if (await page.locator('.results-card').count()) break;
    }
    await toHome();
  });

  await step('practice HARD shows free-text input', async () => {
    await page.locator('.mode-tile', { hasText: 'Üben' }).click();
    await page.waitForSelector('.practice');
    for (const d of ['Land → auf der Karte zeigen', 'Hauptstadt → Land auf der Karte zeigen']) {
      const chip = page.locator('.chip', { hasText: new RegExp(`^${d}$`) });
      if ((await chip.getAttribute('aria-pressed')) === 'true') await chip.click();
    }
    await page.locator('.chip', { hasText: /^Schwer$/ }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    await page.waitForSelector('.session');
    await page.waitForTimeout(300);
    if (!(await page.locator('.freetext').count())) throw new Error('no free-text at hard level');
    await page.screenshot({ path: shot('freetext') });
  });

  await step('practice MITTEL shows list picker', async () => {
    await toHome();
    await page.locator('.mode-tile', { hasText: 'Üben' }).click();
    await page.waitForSelector('.practice');
    for (const d of ['Land → auf der Karte zeigen', 'Hauptstadt → Land auf der Karte zeigen']) {
      const chip = page.locator('.chip', { hasText: new RegExp(`^${d}$`) });
      if ((await chip.getAttribute('aria-pressed')) === 'true') await chip.click();
    }
    await page.locator('.chip', { hasText: /^Mittel$/ }).click();
    await page.getByRole('button', { name: 'Start' }).click();
    await page.waitForSelector('.session');
    await page.waitForTimeout(300);
    if (!(await page.locator('.listpicker').count())) throw new Error('no list picker at medium level');
  });

  await step('explore: tap country, zoom, reset', async () => {
    await toHome();
    await page.locator('.mode-tile', { hasText: 'Erkunden' }).click();
    await page.waitForSelector('.explore-map .map-svg', { timeout: 4000 });
    await page.locator('.map-controls button[aria-label="Hineinzoomen"]').click();
    await page.waitForTimeout(300);
    await page.locator('.map-svg path[data-country="de"]').click({ force: true });
    await page.waitForTimeout(300);
    const info = await page.locator('.explore-info-main strong').textContent();
    if (info !== 'Deutschland') throw new Error(`tapped DE, got "${info}"`);
    await page.locator('.map-controls button[aria-label="Ansicht zurücksetzen"]').click();
  });
  await page.screenshot({ path: shot('explore') });

  await step('stats screen renders', async () => {
    await toHome();
    await page.locator('.icon-btn[aria-label="Fortschritt"]').click();
    await page.waitForSelector('.stats', { timeout: 4000 });
    await page.waitForSelector('.bar-row');
  });
  await page.screenshot({ path: shot('stats'), fullPage: true });

  await step('data persists across reload', async () => {
    await page.waitForTimeout(400); // let the debounced localStorage write flush
    await page.reload();
    await page.waitForSelector('.home, .profile-list', { timeout: 5000 });
    if (!(await page.textContent('body')).includes('Max')) throw new Error('profile lost');
  });

  if (errors.length) console.error(`  console errors:\n    ${errors.join('\n    ')}`);
  await page.close();
  return failed + errors.length;
}
