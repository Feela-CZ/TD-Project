import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = spawn(process.execPath, ['scripts/serve.mjs', '--port=48849'], { cwd: resolve(import.meta.dirname, '..'), stdio: ['ignore', 'pipe', 'inherit'] });
const output = process.env.KETHRA_SCREENSHOTS;
let browser;

async function serverUrl() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Playtest server did not start')), 5000);
    server.once('error', reject);
    server.once('exit', code => reject(new Error(`Playtest server exited with ${code}`)));
    server.stdout.on('data', chunk => {
      const url = String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (url) {
        clearTimeout(timeout);
        resolve(url);
      }
    });
  });
}

async function capture(page, name) {
  if (output) await page.screenshot({ path: join(output, `${name}.png`), fullPage: true });
}

async function scenario(base, mobile, offline = false) {
  const page = await browser.newPage(mobile
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
    : { viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && /\.(?:mjs|css)$/.test(new URL(response.url()).pathname)) errors.push(response.url());
  });
  if (offline) page.on('request', request => { if (/^https?:/.test(request.url())) errors.push(request.url()); });
  page.setDefaultTimeout(6000);
  const press = locator => mobile ? locator.tap() : locator.click();
  const panel = page.locator('#upgrade-panel');
  const flux = async () => Number(await page.locator('#portrait-flux').textContent());
  const feedback = () => panel.locator('[data-upgrade-feedback]').textContent();
  const offer = tier => panel.locator(`[data-buy="${tier}"]`);
  const status = tier => panel.locator(`#offer-status-${tier}`).textContent();
  const confirm = panel.locator('[data-confirm-upgrade]');

  try {
    await page.goto(base);
    if (!offline) assert.equal(new URL(page.url()).pathname, '/web/', 'the advertised root must land in the running game');
    await page.locator('#start').waitFor();
    assert.equal(await flux(), 150);
    if (!mobile && !offline) await capture(page, 'desktop');

    if (mobile) {
      await press(page.locator('[data-open]'));
      await page.locator('#upgrade-sheet[open]').waitFor();
    }
    await press(panel.locator('[data-group="2"]'));
    await press(panel.locator('[data-family="overdrive"]'));
    await press(panel.locator('[data-specialization="salvo"]'));
    assert.equal(await status(1), 'Start the match to upgrade');
    assert.equal(await status(2), 'Requires Tier I rank 1');
    assert.equal(await offer(2).isEnabled(), false);
    if (mobile) await press(panel.locator('[data-close-upgrade]'));

    await press(page.locator('#start'));
    if (mobile) await press(page.locator('[data-open]'));
    await press(offer(1));
    if (mobile) {
      await press(panel.locator('[data-cancel-upgrade]'));
      assert.equal(await flux(), 150);
      assert.equal(await status(2), 'Requires Tier I rank 1');
      await press(offer(1));
      await press(confirm);
    }
    assert.match(await feedback(), /purchased for 0 Flux/);
    assert.equal(await offer(2).isEnabled(), true);
    assert.match(await offer(2).textContent(), /60 Flux/);
    const before = await flux();
    await press(offer(2));
    if (mobile) await press(confirm);
    assert.equal(before - await flux(), 60, 'Saturation Burst must debit its displayed price');
    assert.match(await status(2), /Rank 1 \/ 5/);
    assert.match(await feedback(), /Saturation Burst: L1 purchased/);
    if (!offline) await capture(page, mobile ? 'mobile-upgrades' : 'desktop-upgrades');

    await press(offer(2));
    if (mobile) await press(confirm);
    assert.equal(await status(2), 'Insufficient Flux');
    assert.equal(await offer(2).isEnabled(), false);
    assert.match(await panel.locator('[data-specialization="salvo"]').textContent(), /2 \/ 5/);
    if (mobile) await press(panel.locator('[data-close-upgrade]'));
    const active = page.locator('[data-active="salvo"]');
    await press(active);
    assert.match(await active.textContent(), /4[78] s/);
    assert.equal(await active.isEnabled(), false);
    if (mobile) {
      await capture(page, 'mobile');
      await press(page.locator('[data-stats]'));
      await press(page.locator('.overview-restart'));
    } else await press(page.locator('#restart'));
    assert.equal(await flux(), 150);
    assert.equal(await active.count(), 0, 'restart must reset a purchased ability');

    await page.locator('#mode').selectOption('versus');
    const opponent = page.locator(mobile ? '[data-rival]' : '#portrait-map');
    assert.equal(await opponent.isEnabled(), true);
    await press(opponent);
    assert.equal(await page.locator('#portrait-map').textContent(), 'Your fortress');
    await press(opponent);
    assert.equal(await page.locator('#portrait-map').textContent(), 'Opponent');
    assert.deepEqual(errors, []);
    console.log(`PASS: ${offline ? 'offline' : mobile ? 'touch' : 'desktop'} boot, lock, Tier II purchase, Flux debit, activation, insufficient Flux, restart and opponent view.`);
  } finally {
    await page.close();
  }
}

try {
  const base = await serverUrl();
  if (output) await mkdir(output, { recursive:true });
  assert.equal((await fetch(`${base}/web`, { redirect:'manual' })).headers.get('location'), '/web/');
  assert.equal((await fetch(`${base}/scripts/`)).status, 404, 'directories other than the game index are not streamed');
  browser = await chromium.launch({ executablePath: process.env.KETHRA_BROWSER || undefined });
  await scenario(base, false);
  await scenario(base, true);
  if (process.env.KETHRA_PREVIEW_FILE) await scenario(pathToFileURL(resolve(process.env.KETHRA_PREVIEW_FILE)).href, false, true);
} finally {
  await browser?.close();
  server.kill();
}
