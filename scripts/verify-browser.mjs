import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { routePoint } from '../web/arena-route.mjs';

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

async function holdUpgrade(page, node, dialog, mobile) {
  await node.scrollIntoViewIfNeeded();
  const box = await node.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  if (mobile) {
    const cdp = await page.context().newCDPSession(page);
    try {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await dialog.waitFor();
    } finally {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    }
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    try {
      await dialog.waitFor();
    } finally {
      await page.mouse.up();
    }
  }
}

async function scenario(base, mobile, offline = false) {
  const page = await browser.newPage(mobile
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
    : { viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && /\.(?:mjs|css|webp)$/.test(new URL(response.url()).pathname)) errors.push(response.url());
  });
  if (offline) page.on('request', request => { if (/^https?:/.test(request.url())) errors.push(request.url()); });
  page.setDefaultTimeout(6000);
  const press = locator => mobile ? locator.tap() : locator.click();
  const panel = page.locator('#upgrade-panel');
  const flux = async () => Number(await page.locator('#portrait-flux').textContent());
  const feedback = () => panel.locator('[data-upgrade-feedback]').textContent();
  const node = id => panel.locator(`[data-node="${id}"]`);
  const link = id => panel.locator(`[data-link="${id}"]`);
  const instruction = () => panel.locator('[data-upgrade-instruction]').textContent();
  const name = () => panel.locator('[data-upgrade-name]').textContent();
  const level = id => node(id).locator('small').textContent();
  const start = page.locator('#start');
  const upgrades = page.locator('[data-open]');
  const description = panel.locator('#upgrade-description');
  const descriptionTitle = description.locator('h2');
  const mechanics = description.locator('[data-description-body]');
  const requirement = description.locator('[data-description-requirement]');

  try {
    await page.clock.install();
    await page.goto(base);
    if (!offline) assert.equal(new URL(page.url()).pathname, '/web/', 'the advertised root must land in the running game');
    await page.waitForFunction(standalone => {
      const atlas = document.querySelector('#fortress-atlas');
      return atlas?.naturalWidth > 0 && (!standalone || atlas.src.startsWith('data:image/webp;'));
    }, offline);
    await start.waitFor();
    assert.equal(await flux(), 150);
    assert.match(await page.locator('#field-tip').textContent(), /cannon fires on the gold track/);
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
    const [basicRow, specialRow, ultimateRow] = await Promise.all([1, 2, 3].map(tier => panel.locator(`.tree-row[data-tier="${tier}"]`).boundingBox()));
    assert.ok(basicRow.y > specialRow.y && specialRow.y > ultimateRow.y, 'all three tiers must be visible, rising upward');
    const colors = await panel.locator('.tree-tier').evaluateAll(tiers => tiers.map(tier => getComputedStyle(tier).color));
    assert.equal(new Set(colors).size, 3, 'each tier must have a distinct color');
    assert.equal(await panel.locator('.tree-node').count(), 9);
    assert.equal(await panel.locator('#upgrade-detail button').count(), 0, 'purchases take place on the tree itself');
    assert.equal(await panel.locator('[data-upgrade-details]').isVisible(), false);
    assert.match(await panel.locator('.upgrade-help').textContent(), /Hold an upgrade for details/);
    await press(node('damage'));
    assert.match(await panel.locator('[data-upgrade-effect]').textContent(), /Each shot deals more damage/);
    if (!mobile) {
      await node('damage').press('Shift+Enter');
      assert.equal(await descriptionTitle.textContent(), 'Shot damage');
      assert.match(await mechanics.textContent(), /\+5% base damage per rank/);
      assert.equal(await requirement.isVisible(), false);
      await page.keyboard.press('Escape');
      await description.waitFor({ state:'hidden' });
      await page.waitForFunction(() => document.activeElement.dataset.node === 'damage');
    }
    await press(panel.locator('[data-group="2"]'));
    await press(node('overdrive'));
    assert.equal(await instruction(), 'Start the match to buy upgrades.');
    await press(node('salvo'));
    assert.equal(await instruction(), 'Unlock the basic upgrade first.');
    await press(node('orbitalBreach'));
    assert.equal(await name(), 'Orbital Breach');
    assert.equal(await instruction(), 'Reach rank 5 in this specialization first.');
    assert.equal(await panel.locator('.tree-node[aria-pressed="true"]').count(), 1);
    assert.equal(await panel.locator('[data-link][data-owned]').count(), 0);
    await holdUpgrade(page, node('orbitalBreach'), description, mobile);
    assert.equal(await descriptionTitle.textContent(), 'Orbital Breach');
    assert.match(await mechanics.textContent(), /0\.65 seconds/);
    assert.equal(await requirement.textContent(), 'Requires Saturation Burst at rank 5.');
    await press(description.locator('[data-close-description]'));
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
    await press(node('overdrive'));
    assert.match(await instruction(), /again to unlock · Free/);
    assert.equal(await level('overdrive'), 'Free', 'the first press must only select the upgrade');
    await press(node('overdrive'));
    assert.equal(await level('overdrive'), '1 / 9', 'players can plan and purchase while paused');
    assert.match(await feedback(), /Unlocked · Free/);
    assert.equal(await level('salvo'), '60 Flux');
    assert.equal(await link('salvo').getAttribute('data-owned'), null, 'unlocking the parent does not light its child');
    const before = await flux();
    await press(node('salvo'));
    assert.equal(await flux(), before);
    assert.equal(await level('salvo'), '60 Flux');
    if (!mobile && !offline) {
      const box = await node('salvo').boundingBox();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 18, y);
      await page.clock.runFor(650);
      await page.mouse.up();
      assert.equal(await description.isVisible(), false, 'moving the pointer cancels the hold');
      assert.equal(await flux(), before, 'releasing a drag on the same node must not buy it');
    }
    await holdUpgrade(page, node('salvo'), description, mobile);
    assert.equal(await description.isVisible(), true, 'releasing the hold keeps the description open');
    assert.equal(await descriptionTitle.textContent(), 'Saturation Burst');
    assert.match(await mechanics.textContent(), /125%.*Recharges in 48 seconds/);
    assert.equal(await requirement.textContent(), 'Requires Surge Core at rank 1.');
    assert.equal(await flux(), before, 'releasing a long press must not buy a selected upgrade');
    assert.equal(await level('salvo'), '60 Flux');
    if (!offline && output) await page.screenshot({ path: join(output, mobile ? 'mobile-upgrade-description.png' : 'desktop-upgrade-description.png') });
    await page.keyboard.press('Escape');
    await description.waitFor({ state:'hidden' });
    if (mobile) assert.equal(await page.locator('#upgrade-sheet').isVisible(), true, 'closing details keeps the upgrade drawer open');
    await press(node('salvo'));
    assert.equal(await flux(), before, 'closing the description leaves the purchase disarmed');
    await press(node('salvo'));
    assert.equal(before - await flux(), 60, 'Saturation Burst must debit its displayed price');
    assert.equal(await level('salvo'), '1 / 5');
    assert.match(await feedback(), /Unlocked · 60 Flux/);
    assert.equal(await link('salvo').getAttribute('data-owned'), '');
    assert.notEqual(await link('salvo').evaluate(edge => getComputedStyle(edge, '::before').boxShadow), 'none');
    assert.equal(await link('adrenaline').evaluate(edge => getComputedStyle(edge, '::before').boxShadow), 'none');
    assert.equal(await link('adrenaline').getAttribute('data-owned'), null);
    assert.equal(await link('orbitalBreach').getAttribute('data-owned'), null);
    if (!offline) await capture(page, mobile ? 'mobile-upgrades' : 'desktop-upgrades');

    await press(node('salvo'));
    assert.equal(await level('salvo'), '1 / 5', 'each rank requires a new deliberate pair of presses');
    await press(node('salvo'));
    assert.match(await instruction(), /^Need \d+ more Flux\.$/);
    assert.equal(await level('salvo'), '2 / 5');
    const remaining = await flux();
    await press(node('salvo'));
    await press(node('salvo'));
    assert.equal(await flux(), remaining, 'reselecting a blocked upgrade must not spend Flux');
    await press(node('interest'));
    assert.equal(await link('salvo').count(), 0, 'choosing another basic upgrade changes the displayed path');
    await press(node('overdrive'));
    assert.equal(await link('salvo').getAttribute('data-owned'), '', 'revisiting a basic upgrade restores its earned connections');
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
    console.log(`PASS: ${offline ? 'offline' : mobile ? 'touch' : 'desktop'} upgrade tree, hold-to-read, two-step purchases, paid links, pause, restart and opponent view.`);
  } finally {
    await page.close();
  }
}

async function verifyTurretArt(base) {
  const page = await browser.newPage({ viewport: { width:390, height:844 }, hasTouch: true, isMobile: true });
  try {
    await page.addInitScript(() => {
      window.muzzleFlashes = [];
      let fortressFrame;
      const drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (source, ...args) {
        if (this.canvas.id === 'arena' && source.id === 'fortress-atlas' && args.length === 8) {
          const [tileX, , , tileHeight, x, y, width, height] = args;
          const matrix = this.getTransform();
          const angle = Math.atan2(-matrix.d, -matrix.c);
          if (tileX === 0) {
            fortressFrame = { foundation: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f] };
          } else if (tileX === 450) {
            const tip = new DOMPoint(x + width / 2, y + 6 * height / tileHeight).matrixTransform(matrix);
            fortressFrame.barrel = { angle, x: tip.x, y: tip.y };
          } else if (tileX === 294) {
            fortressFrame.turret = angle;
            window.fortressFrame = fortressFrame;
          }
        }
        return drawImage.call(this, source, ...args);
      };
      const original = CanvasRenderingContext2D.prototype.createRadialGradient;
      CanvasRenderingContext2D.prototype.createRadialGradient = function (...args) {
        if (this.canvas.id === 'arena' && args.slice(0,5).every(value => value === 0) && args[5] > 12 && args[5] <= 20) {
          const aim = this.getTransform();
          window.muzzleFlashes.push({ x:aim.e, y:aim.f, angle:Math.atan2(aim.b,aim.a), sprites: fortressFrame });
        }
        return original.apply(this, args);
      };
    });
    await page.clock.install();
    await page.goto(base);
    await page.waitForFunction(() => window.fortressFrame?.barrel);
    const idle = await page.evaluate(() => window.fortressFrame);
    await page.locator('#start').tap();
    const now = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(now + 500);
    await page.clock.runFor(2200);
    assert.equal(await page.evaluate(() => window.muzzleFlashes.length), 0, 'the cannon waits until the first Kethra is in range');
    let flashes = await page.evaluate(() => window.muzzleFlashes);
    for (let step = 0; !flashes.length && step < 40; step++) {
      await page.clock.runFor(25);
      flashes = await page.evaluate(() => window.muzzleFlashes);
    }
    assert.ok(flashes.length, 'the real match must draw its first muzzle flash');
    const flash = flashes[0];
    assert.ok(Math.abs(flash.x - 210) > 3, 'the cannon must turn off its idle bearing on the first shot');
    assert.ok(flash.y < 575 && Math.sin(flash.angle) < 0, 'the muzzle points toward the actual firing sector');
    assert.deepEqual(flash.sprites.foundation, idle.foundation, 'the foundation must stay in place');
    assert.ok(Math.abs(flash.sprites.turret - idle.turret) > .1, 'the whole turret housing follows the target');
    assert.ok(Math.abs(flash.sprites.turret - flash.sprites.barrel.angle) < .001);
    assert.ok(Math.abs(flash.angle - flash.sprites.barrel.angle) < .001);
    assert.ok(Math.hypot(flash.x - flash.sprites.barrel.x, flash.y - flash.sprites.barrel.y) < .5, 'the flash must be drawn on the sprite tip');
    await capture(page, 'turret-firing');
    console.log('PASS: the browser drew a fixed foundation, a rotating turret and barrel, and a flash on the sprite tip.');
  } finally {
    await page.close();
  }
}

async function verifyAiming(base) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
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
    await page.locator('#start').tap();
    await page.evaluate(() => {
      window.aimingTestMatch.players.human.energy = 100000;
    });

    await page.locator('[data-open]').tap();
    await page.locator('[data-group="2"]').tap();
    const root = page.locator('[data-node="overdrive"]');
    await root.tap();
    await root.tap();
    assert.equal(await root.locator('small').textContent(), '1 / 9');
    const salvo = page.locator('[data-node="salvo"]');
    for (let rank = 0; rank < 5; rank++) {
      await salvo.tap();
      await salvo.tap();
    }
    const orbital = page.locator('[data-node="orbitalBreach"]');
    const edge = page.locator('[data-link="orbitalBreach"]');
    await orbital.tap();
    assert.equal(await edge.getAttribute('data-owned'), null);
    assert.equal(await page.locator('[data-aim-ultimate="orbitalBreach"]').count(), 0);
    await orbital.tap();
    assert.equal(await orbital.locator('small').textContent(), 'Unlocked');
    assert.equal(await edge.getAttribute('data-owned'), '');
    assert.notEqual(await edge.evaluate(link => getComputedStyle(link, '::before').boxShadow), 'none');
    assert.equal(await page.locator('[data-link="conjunctionSpheres"]').getAttribute('data-owned'), null);
    await capture(page, 'mobile-ultimate');
    await page.locator('[data-close-upgrade]').tap();

    const aim = page.locator('[data-aim-ultimate="orbitalBreach"]');
    const canvas = page.locator('#arena');
    const cancel = page.locator('#cancel-aim');
    await aim.tap();
    await cancel.waitFor();
    assert.match(await page.locator('#field-tip').textContent(), /tap the track to aim/i);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'arena');
    await cancel.tap();
    assert.equal(await cancel.isVisible(), false);
    assert.match(await aim.textContent(), /Aim on track/);
    await aim.tap();
    const { width, height } = await canvas.boundingBox();
    await canvas.tap({ position: { x: width / 2, y: height / 2 } });
    assert.equal(await cancel.isVisible(), true, 'tapping outside the track must not spend the ability');
    const point = routePoint(.18);
    await canvas.tap({ position: { x: point.x * width / 420, y: point.y * height / 700 } });
    assert.equal(await cancel.isVisible(), false);
    assert.match(await aim.textContent(), /Recharging/);
    const progress = await page.evaluate(() => window.aimingTestMatch.players.human.breachScars[0].progress);
    assert.ok(Math.abs(progress - .18) < .01, 'the cast must land at the tapped track position');
    console.log('PASS: touch Tier III purchases, exact Ultimate link, and targeted ability aim, cancel and cast.');
  } finally {
    await page.close();
  }
}

try {
  const base = await serverUrl();
  if (output) await mkdir(output, { recursive:true });
  assert.equal((await fetch(`${base}/web`, { redirect:'manual' })).headers.get('location'), '/web/');
  assert.equal((await fetch(`${base}/scripts/`)).status, 404, 'directories other than the game index are not streamed');
  assert.equal((await fetch(`${base}/web/art/fortress-atlas.webp`, { method: 'HEAD' })).headers.get('content-type'), 'image/webp');
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
