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
  const start = page.locator('#start');
  const upgrades = page.locator('[data-open]');

  try {
    await page.clock.install();
    await page.goto(base);
    if (!offline) assert.equal(new URL(page.url()).pathname, '/web/', 'the advertised root must land in the running game');
    await start.waitFor();
    assert.equal(await flux(), 150);
    assert.match(await page.locator('#field-tip').textContent(), /cannon fires on its own/);
    assert.equal(await page.locator('#portrait-wave').textContent(), 'Wave 1 / 60');
    assert.equal(await page.locator('#strain-meter').getAttribute('max'), '100');
    assert.equal(await page.locator('[data-rival]').isVisible(), false);
    if (!mobile && !offline) await capture(page, 'desktop');

    await press(upgrades);
    if (mobile) {
      await page.locator('#upgrade-sheet[open]').waitFor();
    } else {
      assert.equal(await page.evaluate(() => document.activeElement.id), 'upgrade-title');
    }
    assert.match(await panel.locator('[data-offer="1"] p').first().textContent(), /Each shot deals more damage/);
    assert.equal(await panel.locator('.upgrade-paths').getAttribute('open'), null);
    await press(panel.locator('[data-group="2"]'));
    await press(panel.locator('[data-family="overdrive"]'));
    await press(panel.locator('.upgrade-paths > summary'));
    await press(panel.locator('[data-specialization="salvo"]'));
    assert.equal(await status(1), 'Start the match to buy upgrades.');
    assert.equal(await status(2), 'Unlock the basic upgrade first.');
    assert.equal(await status(3), 'Reach rank 5 in this specialization first.');
    assert.equal(await offer(2).isEnabled(), false);
    if (mobile) await press(panel.locator('[data-close-upgrade]'));

    await press(start);
    assert.equal(await start.textContent(), 'Pause');
    await press(start);
    assert.equal(await start.textContent(), 'Resume');
    assert.match(await page.locator('#field-tip').textContent(), /Paused/);
    const timer = await page.locator('#incursion-next').textContent();
    await page.clock.fastForward(10_000);
    assert.equal(await page.locator('#incursion-next').textContent(), timer, 'pausing must freeze the next-wave timer');
    if (mobile) await press(upgrades);
    assert.equal(await offer(1).isEnabled(), true, 'players can plan and purchase while paused');
    assert.match(await offer(1).textContent(), /Unlock Surge Core · Free/);
    await press(offer(1));
    if (mobile) {
      await press(panel.locator('[data-cancel-upgrade]'));
      assert.equal(await flux(), 150);
      assert.equal(await status(2), 'Unlock the basic upgrade first.');
      await press(offer(1));
      await press(confirm);
    }
    assert.match(await feedback(), /Surge Core unlocked · Free/);
    assert.equal(await offer(2).isEnabled(), true);
    assert.match(await offer(2).textContent(), /60 Flux/);
    const before = await flux();
    await press(offer(2));
    if (mobile) await press(confirm);
    assert.equal(before - await flux(), 60, 'Saturation Burst must debit its displayed price');
    assert.match(await status(2), /Rank 1 \/ 5/);
    assert.match(await feedback(), /Saturation Burst unlocked · 60 Flux/);
    if (!offline) await capture(page, mobile ? 'mobile-upgrades' : 'desktop-upgrades');

    await press(offer(2));
    if (mobile) await press(confirm);
    assert.match(await status(2), /^Need \d+ more Flux\.$/);
    assert.equal(await offer(2).isEnabled(), false);
    assert.match(await panel.locator('[data-specialization="salvo"]').textContent(), /2 \/ 5/);
    if (mobile) await press(panel.locator('[data-close-upgrade]'));
    const active = page.locator('[data-active="salvo"]');
    assert.equal(await active.isEnabled(), false);
    await press(start);
    assert.match(await active.textContent(), /Ready/);
    if (mobile) await capture(page, 'mobile');
    await press(active);
    assert.match(await active.textContent(), /Recharging · 4[78] s/);
    assert.equal(await active.isEnabled(), false);
    if (mobile) {
      await press(page.locator('[data-stats]'));
      await press(page.locator('.overview-restart'));
    } else {
      await press(page.locator('.match-settings > summary'));
      await press(page.locator('#restart'));
    }
    assert.equal(await flux(), 150);
    assert.equal(await active.count(), 0, 'restart must reset a purchased ability');

    await press(page.locator('.match-settings > summary'));
    await page.locator('#mode').selectOption('versus');
    await press(page.locator('.match-settings > summary'));
    const opponent = page.locator(mobile ? '[data-rival]' : '#portrait-map');
    assert.equal(await opponent.isEnabled(), true);
    await press(opponent);
    assert.equal(await page.locator('#portrait-map').textContent(), 'Your fortress');
    await press(opponent);
    assert.equal(await page.locator('#portrait-map').textContent(), 'Opponent');
    assert.deepEqual(errors, []);
    console.log(`PASS: ${offline ? 'offline' : mobile ? 'touch' : 'desktop'} onboarding, pause, locking, purchase, Flux debit, ability states, restart and opponent view.`);
  } finally {
    await page.close();
  }
}

async function verifyTurretArt(base) {
  const page = await browser.newPage({ viewport: { width:1440, height:1000 } });
  try {
    await page.addInitScript(() => {
      window.muzzleFlashes = [];
      const original = CanvasRenderingContext2D.prototype.createRadialGradient;
      CanvasRenderingContext2D.prototype.createRadialGradient = function (...args) {
        if (this.canvas.id === 'arena' && args.slice(0,5).every(value => value === 0) && args[5] > 12 && args[5] <= 20) {
          const aim = this.getTransform();
          window.muzzleFlashes.push({ x:aim.e, y:aim.f, angle:Math.atan2(aim.b,aim.a) });
        }
        return original.apply(this, args);
      };
    });
    await page.clock.install();
    await page.goto(base);
    await page.locator('#start').click();
    const now = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(now + 500);
    await page.clock.runFor(20_000);
    let flashes = await page.evaluate(() => window.muzzleFlashes);
    for (let step = 0; !flashes.length && step < 120; step++) {
      await page.clock.runFor(25);
      flashes = await page.evaluate(() => window.muzzleFlashes);
    }
    assert.ok(flashes.length, 'the real match must draw its first muzzle flash');
    const flash = flashes[0];
    assert.ok(Math.abs(flash.x - 210) > 3, 'the cannon must turn off its idle bearing on the first shot');
    assert.ok(flash.y < 575 && Math.sin(flash.angle) < 0, 'the muzzle points toward the actual firing sector');
    await capture(page, 'turret-firing');
    console.log('PASS: the running browser rendered a muzzle flash from the rotated cannon.');
  } finally {
    await page.close();
  }
}

async function verifyAiming(base) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    await page.route('**/dist/live.mjs', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `${await response.text()}
        const readSnapshot = LiveMatch.prototype.snapshot;
        LiveMatch.prototype.snapshot = function () {
          window.aimingTestMatch = this;
          return readSnapshot.call(this);
        };` });
    });
    await page.goto(base);
    await page.locator('#start').click();
    await page.evaluate(() => {
      const match = window.aimingTestMatch;
      match.players.human.energy = 100000;
      match.buy('tower', 'overdrive');
      for (let rank = 0; rank < 5; rank++) match.buyTier2('overdrive', 'salvo');
      match.buyTier3('overdrive', 'orbitalBreach');
    });

    const aim = page.locator('[data-aim-ultimate="orbitalBreach"]');
    const canvas = page.locator('#arena');
    const cancel = page.locator('#cancel-aim');
    await aim.click();
    await cancel.waitFor();
    assert.match(await page.locator('#field-tip').textContent(), /pick a spot on the track/i);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'arena');
    await page.keyboard.press('Escape');
    assert.equal(await cancel.isVisible(), false);
    assert.match(await aim.textContent(), /Aim on track/);
    await aim.click();
    const { width, height } = await canvas.boundingBox();
    await canvas.click({ position: { x: width / 2, y: height / 2 } });
    assert.equal(await cancel.isVisible(), true, 'clicking outside the track must not spend the ability');
    await cancel.click();
    await aim.click();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    assert.equal(await cancel.isVisible(), false);
    assert.match(await aim.textContent(), /Recharging/);
    const progress = await page.evaluate(() => window.aimingTestMatch.players.human.breachScars[0].progress);
    assert.equal(progress, .48, 'the cast must land at the selected track position');
    console.log('PASS: targeted ability enters aim mode, preserves its charge on cancellation or off-track clicks, and fires at the selected track position.');
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
  await verifyTurretArt(base);
  await verifyAiming(base);
  if (process.env.KETHRA_PREVIEW_FILE) await scenario(pathToFileURL(resolve(process.env.KETHRA_PREVIEW_FILE)).href, false, true);
} finally {
  await browser?.close();
  server.kill();
}
