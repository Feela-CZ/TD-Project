import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { FORTRESS } from '../web/turret-motion.mjs';

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
  const box = await node.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height, 'upgrade must already fit in the viewport');
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
    ? { viewport: { width: 390, height: 667 }, hasTouch: true, isMobile: true }
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
  const cost = () => panel.locator('[data-upgrade-cost]').textContent();
  const tones = () => page.evaluate(() => window.toneStarts);
  const name = () => panel.locator('[data-upgrade-name]').textContent();
  const level = id => node(id).locator('small').textContent();
  const start = page.locator('#start');
  const upgrades = page.locator('[data-open]');
  const description = panel.locator('#upgrade-description');
  const descriptionTitle = description.locator('h2');
  const mechanics = description.locator('[data-description-body]');
  const requirement = description.locator('[data-description-requirement]');

  try {
    await page.addInitScript(() => {
      window.toneStarts = 0;
      const startTone = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function (...args) {
        window.toneStarts++;
        return startTone.apply(this, args);
      };
    });
    await page.clock.install();
    await page.goto(base);
    if (!offline) assert.equal(new URL(page.url()).pathname, '/web/', 'the advertised root must land in the running game');
    await page.waitForFunction(standalone => {
      return ['#fortress-atlas', '.arena-terrain'].every(selector => {
        const art = document.querySelector(selector);
        return art?.naturalWidth > 0 && (!standalone || art.src.startsWith('data:image/webp;'));
      });
    }, offline);
    await start.waitFor();
    assert.equal(await flux(), 150);
    assert.equal(await page.locator('#field-tip').count(), 0, 'the battlefield must be clear of tutorial copy');
    assert.equal(await tones(), 0, 'audio must await a player gesture');
    assert.equal(await page.locator('#portrait-wave').textContent(), 'Wave 1 / 60');
    assert.equal(await page.locator('#strain-meter').getAttribute('max'), '100');
    assert.equal(await page.locator('[data-rival]').isVisible(), false);
    assert.equal(await page.locator('[data-abilities]').count(), 0, 'combat abilities must not use a generic menu button');
    assert.equal(await page.locator('#action-dock').isVisible(), false, 'the dock appears when an ability is earned');
    if (mobile) {
      const available = await page.locator('main').evaluate(main => {
        const style = getComputedStyle(main);
        return main.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      });
      const arena = await page.locator('.arena-wrap').boundingBox();
      assert.ok(Math.abs(arena.width - available) < 1, 'the arena fills the usable phone width');
    }
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
    assert.deepEqual(await panel.locator('[data-group]').allTextContents(), ['Offense', 'Mutation', 'Utility']);
    assert.deepEqual(await panel.locator('[data-families] button span').allTextContents(), ['Ordnance', 'Cadence', 'Precision']);
    await press(panel.locator('[data-group="1"]'));
    assert.deepEqual(await panel.locator('[data-families] button span').allTextContents(), ['Carapace', 'Kinesis', 'Vital Mass']);
    await press(panel.locator('[data-group="0"]'));
    assert.equal(await panel.locator('#upgrade-detail').isVisible(), false);
    assert.equal(await panel.locator('.upgrade-help').count(), 0);
    await press(node('damage'));
    assert.match(await panel.locator('[data-upgrade-effect]').textContent(), /Each shot deals more damage/);
    const detailsButton = panel.locator('[data-open-description]');
    await press(detailsButton);
    assert.equal(await descriptionTitle.textContent(), 'Ordnance');
    assert.match(await mechanics.textContent(), /\+5% base damage per rank/);
    await press(description.locator('[data-close-description]'));
    await description.waitFor({ state:'hidden' });
    await page.waitForFunction(() => document.activeElement.hasAttribute('data-open-description'));
    if (!mobile) {
      await node('damage').press('Shift+Enter');
      assert.equal(await descriptionTitle.textContent(), 'Ordnance');
      assert.match(await mechanics.textContent(), /\+5% base damage per rank/);
      assert.equal(await requirement.isVisible(), false);
      await page.keyboard.press('Escape');
      await description.waitFor({ state:'hidden' });
      await page.waitForFunction(() => document.activeElement.dataset.node === 'damage');
    }
    await press(panel.locator('[data-group="2"]'));
    assert.deepEqual(await panel.locator('[data-families] button span').allTextContents(), ['Reserves', 'Control Nexus', 'Surge Core']);
    await press(node('overdrive'));
    assert.equal(await cost(), 'Free');
    await press(node('overdrive'));
    assert.equal(await level('overdrive'), 'Free', 'show the price before the match without buying');
    assert.equal(await tones(), 0, 'selecting or trying an upgrade before the match stays silent');
    await press(node('salvo'));
    assert.equal(await cost(), 'Unlock the basic upgrade first.');
    await press(node('orbitalBreach'));
    assert.equal(await name(), 'Orbital Breach');
    assert.equal(await cost(), 'Reach rank 5 in this specialization first.');
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
    await page.waitForFunction(() => window.toneStarts === 2);
    await press(start);
    assert.equal(await start.textContent(), 'Resume');
    const timer = await page.locator('#incursion-next').textContent();
    await page.clock.fastForward(10_000);
    assert.equal(await page.locator('#incursion-next').textContent(), timer, 'pausing must freeze the next-wave timer');
    if (mobile) await press(upgrades);
    await press(node('overdrive'));
    assert.equal(await cost(), 'Free');
    assert.equal(await level('overdrive'), 'Free', 'the first press must only select the upgrade');
    const beforePurchaseCue = await tones();
    await press(node('overdrive'));
    assert.equal(await tones(), beforePurchaseCue + 2, 'successful purchases play the confirmation sound');
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
    assert.match(await cost(), /^Need \d+ more Flux\.$/);
    assert.equal(await level('salvo'), '2 / 5', 'every additional tap buys the next rank');
    assert.equal(before - await flux(), 128, 'each of the two ranks is charged exactly once');
    const remaining = await flux();
    const beforeBlockedCue = await tones();
    await press(node('salvo'));
    await press(node('salvo'));
    assert.equal(await tones(), beforeBlockedCue, 'blocked purchases stay silent');
    assert.equal(await flux(), remaining, 'reselecting a blocked upgrade must not spend Flux');
    await press(node('interest'));
    assert.equal(await link('salvo').count(), 0, 'choosing another basic upgrade changes the displayed path');
    await press(node('overdrive'));
    assert.equal(await link('salvo').getAttribute('data-owned'), '', 'revisiting a basic upgrade restores its earned connections');
    if (mobile) await press(panel.locator('[data-close-upgrade]'));
    const active = page.locator('[data-active="salvo"]');
    assert.equal(await active.isEnabled(), false);
    await press(start);
    assert.equal(await active.isVisible(), true, 'the earned ability is already visible on the battlefield');
    assert.equal(await active.isEnabled(), true);
    if (mobile) await capture(page, 'mobile');

    const beforeAbilityCue = await tones();
    await press(active);
    assert.equal(await tones(), beforeAbilityCue + 2, 'a fired ability has its own sound');
    assert.match(await active.locator('small').textContent(), /^4[78] s$/);
    assert.equal(await active.isEnabled(), false);
    await press(page.locator('[data-open-dialog="match-settings"]'));
    const sound = page.locator('#sound-effects');
    assert.equal(await sound.isChecked(), true);
    await press(sound);
    assert.equal(await sound.isChecked(), false);
    await press(page.locator('#match-settings [data-close-dialog]'));
    const mutedTones = await tones();
    if (mobile) {
      await press(page.locator('[data-stats]'));
      await press(page.locator('[data-view="match"]'));
      await press(page.locator('.overview-restart'));
    } else {
      await press(page.locator('[data-open-dialog="match-settings"]'));
      await press(page.locator('#restart'));
    }
    assert.equal(await flux(), 150);
    assert.equal(await tones(), mutedTones, 'restarting a muted match plays no cue');
    assert.equal(await active.count(), 0, 'restart must reset a purchased ability');

    await press(page.locator('[data-open-dialog="match-settings"]'));
    await page.locator('#mode').selectOption('versus');
    await press(page.locator('#match-settings [data-close-dialog]'));
    const opponent = page.locator('[data-rival]');
    assert.equal(await opponent.isEnabled(), true);
    await press(opponent);
    assert.equal(await page.locator('#portrait-map').textContent(), 'Your fortress');
    await press(opponent);
    assert.equal(await page.locator('#portrait-map').textContent(), 'Opponent');
    if (!offline) {
      await page.reload();
      await press(page.locator('[data-open-dialog="match-settings"]'));
      assert.equal(await sound.isChecked(), false, 'the sound setting persists across reload');
    }
    assert.deepEqual(errors, []);
    console.log(`PASS: ${offline ? 'offline' : mobile ? 'touch' : 'desktop'} upgrade tree, hold-to-read, consecutive rank purchases, paid links, pause, restart and opponent view.`);
  } finally {
    await page.close();
  }
}

async function verifyTurretArt(base) {
  const page = await browser.newPage({ viewport: { width:1440, height:1000 } });
  try {
    await page.addInitScript(() => {
      window.muzzleFlashes = [];
      window.shotSounds = 0;
      const playBuffer = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        window.shotSounds++;
        return playBuffer.apply(this, args);
      };
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
    assert.ok(await page.evaluate(() => window.shotSounds > 0), 'the real cannon shot must play a sound');
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

async function exposeMatch(page) {
  await page.route('**/dist/live.mjs', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const readSnapshot = LiveMatch.prototype.snapshot;
      LiveMatch.prototype.snapshot = function () {
        window.aimingTestMatch = this;
        return readSnapshot.call(this);
      };` });
  });
}

async function verifyAiming(base) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    await exposeMatch(page);
    await page.goto(base);
    await page.locator('#start').click();
    await page.evaluate(() => {
      window.aimingTestMatch.players.human.energy = 100000;
    });

    await page.locator('[data-group="2"]').click();
    const root = page.locator('[data-node="overdrive"]');
    await root.click();
    await root.press('Enter');
    assert.equal(await root.locator('small').textContent(), '1 / 9');
    const salvo = page.locator('[data-node="salvo"]');
    await salvo.click();
    for (let rank = 1; rank <= 5; rank++) {
      await salvo.click();
      assert.equal(await salvo.locator('small').textContent(), rank === 5 ? 'Max rank' : rank + ' / 5');
    }
    const orbital = page.locator('[data-node="orbitalBreach"]');
    const edge = page.locator('[data-link="orbitalBreach"]');
    await orbital.click();
    assert.equal(await edge.getAttribute('data-owned'), null);
    assert.equal(await page.locator('[data-aim-ultimate="orbitalBreach"]').count(), 0);
    await orbital.click();
    assert.equal(await orbital.locator('small').textContent(), 'Unlocked');
    assert.equal(await edge.getAttribute('data-owned'), '');
    assert.notEqual(await edge.evaluate(link => getComputedStyle(link, '::before').boxShadow), 'none');
    assert.equal(await page.locator('[data-link="conjunctionSpheres"]').getAttribute('data-owned'), null);
    await capture(page, 'desktop-ultimate');

    const aim = page.locator('[data-aim-ultimate="orbitalBreach"]');
    const canvas = page.locator('#arena');
    const cancel = page.locator('#cancel-aim');

    await aim.click();
    await cancel.waitFor();
    assert.equal(await canvas.getAttribute('aria-label'), 'Aim Orbital Breach');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'arena');
    await page.keyboard.press('Escape');
    assert.equal(await cancel.isVisible(), false);
    assert.equal(await aim.isEnabled(), true);
    assert.equal(await aim.getAttribute('aria-pressed'), 'false');

    await aim.click();
    const { width, height } = await canvas.boundingBox();
    await canvas.click({ position: { x: width / 2, y: height / 2 } });
    assert.equal(await cancel.isVisible(), true, 'clicking outside the track must not spend the ability');
    await cancel.click();

    await aim.click();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    assert.equal(await cancel.isVisible(), false);
    assert.match(await aim.locator('small').textContent(), /^\d+ s$/);
    const progress = await page.evaluate(() => window.aimingTestMatch.players.human.breachScars[0].progress);
    assert.equal(progress, .48, 'the cast must land at the selected track position');
    console.log('PASS: keyboard and Tier III purchases, exact Ultimate link, and targeted ability aim, cancel and cast.');
  } finally {
    await page.close();
  }
}

async function verifyAbilityChoices(base) {
  const page = await browser.newPage({ viewport: { width: 320, height: 568 }, hasTouch: true, isMobile: true });
  try {
    await exposeMatch(page);
    await page.goto(base);
    await page.locator('[data-open-dialog="match-settings"]').tap();
    await page.locator('#mode').selectOption('versus');
    await page.locator('#restart').tap();

    for (const [root, path, ultimate] of [
      ['overdrive', 'phaseShield', 'conjunctionSpheres'],
      ['rewardFloor', 'expandedField', 'commandOverride'],
      ['interest', 'battery', 'bioforgeProgram']
    ]) {
      if (root !== 'overdrive') {
        await page.locator('[data-open-dialog="match-settings"]').tap();
        await page.locator('#restart').tap();
      }
      await page.evaluate(([root, path, ultimate]) => {
        const match = window.aimingTestMatch;
        match.players.human.energy = 100_000;
        match.buy('tower', 'overdrive');
        if (root !== 'overdrive') match.buy('tower', root);
        match.buyTier2('overdrive', 'salvo');
        for (let rank = 0; rank < 5; rank++) match.buyTier2(root, path);
        match.buyTier3(root, ultimate);
      }, [root, path, ultimate]);
      const dock = page.locator('#action-dock');
      const options = page.locator('#ability-options');
      const choice = root === 'overdrive'
        ? dock.locator('[data-ultimate="conjunctionSpheres"][data-side="right"]')
        : dock.locator(`[data-ability-options="${root === 'interest' ? 'bioforge' : 'priority'}"]`);
      await choice.waitFor();
      assert.equal(await dock.locator('button').count(), root === 'overdrive' ? 5 : 3);
      await dock.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const canvas = document.querySelector('#arena').getBoundingClientRect();
        if (bounds.top < canvas.bottom || bounds.bottom > innerHeight || document.scrollingElement.scrollHeight > innerHeight) {
          throw new Error('Combat abilities must fit below the arena without scrolling or covering the track');
        }
        for (const button of element.querySelectorAll('button')) {
          const rect = button.getBoundingClientRect();
          if (rect.height < 44 || rect.right > innerWidth || rect.bottom > innerHeight) {
            throw new Error('Combat ability must stay usable as a direct touch target');
          }
        }
      });
      if (root === 'overdrive') await capture(page, 'phone-active-abilities');
      await choice.tap();

      if (root === 'overdrive') {
        assert.equal(await options.isVisible(), false);
        assert.equal(await choice.isEnabled(), false, 'Conjunction starts its shared cooldown directly from the battlefield');
        assert.equal(await dock.locator('[data-side="left"]').isEnabled(), false);
      } else {
        assert.equal(await options.isVisible(), true);
        assert.equal(await options.locator('.ability-options-list button').count(), 5);
        if (root === 'rewardFloor') {
          await options.locator('[data-priority="manual"]').tap();
          assert.equal(await page.evaluate(() => window.aimingTestMatch.players.human.priorityMode), 'manual');
        } else {
          await options.locator('[data-bioforge="speed"]').tap();
          assert.equal(await page.evaluate(() => window.aimingTestMatch.players.human.purchaseLog.at(-1).label), 'Bioforge speed');
        }
        assert.equal(await options.isVisible(), false);
      }
    }
    console.log('PASS: full combat dock fits a 320 px phone and both contextual ability choices work.');
  } finally {
    await page.close();
  }
}

async function verifyFixedViewports(base) {
  const cases = [
    { width: 320, height: 568, touch: true },
    { width: 390, height: 667, touch: true },
    { width: 667, height: 375, touch: true },
    { width: 740, height: 300, touch: true },
    { width: 844, height: 390, touch: true },
    { width: 1024, height: 600 },
    { width: 1440, height: 900 },
  ];
  for (const { width, height, touch } of cases) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const checkFit = async (label, selectors) => {
      const failures = await page.evaluate(selectors => {
        const overflow = [];
        const root = document.scrollingElement;
        if (root.scrollHeight > innerHeight + 1 || root.scrollWidth > innerWidth + 1 || scrollX || scrollY) {
          overflow.push('document');
        }
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          const rect = element.getBoundingClientRect();
          if (!rect.width || !rect.height || rect.x < -.5 || rect.y < -.5 ||
              rect.bottom > innerHeight + .5 || rect.right > innerWidth + .5 ||
              element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1) {
            overflow.push(selector);
          }
        }
        return overflow;
      }, selectors);
      assert.deepEqual(failures, [], `${width}×${height} ${label} must fit without scrolling`);
    };
    try {
      await page.goto(base);
      const arena = page.locator('#arena');
      await checkFit('battlefield', ['main', '#arena', '.game-toolbar']);
      await page.waitForFunction(() => document.querySelector('.arena-terrain').naturalWidth > 0);
      assert.ok(await page.locator('.arena-terrain').evaluate(image => {
        const { width, height } = image.getBoundingClientRect();
        const arena = image.parentElement;
        return getComputedStyle(image).objectFit === 'cover' &&
          Math.abs(width - arena.clientWidth) < 1 && Math.abs(height - arena.clientHeight) < 1;
      }), 'alien terrain must fill the entire arena');
      const field = await arena.boundingBox();
      await page.mouse.move(field.x + field.width / 2, field.y + field.height / 2);
      await page.mouse.wheel(500, 500);
      await checkFit('after wheel', ['main', '#arena']);
      const world = await arena.evaluate(element => ({ width: element.width, height: element.height }));
      assert.equal(world.width / world.height, .6, 'the game world must stay in portrait orientation');
      assert.ok(Math.abs(field.width / field.height - .6) < .02, 'displayed arena must keep the portrait proportions');
      await arena.click({ position: { x: field.width * FORTRESS.x / world.width, y: field.height * FORTRESS.y / world.height } });
      if (width < 1120 || height < 660) await page.locator('#upgrade-sheet[open]').waitFor();
      await checkFit('upgrades', ['#upgrade-panel', '.upgrade-tree']);
      await page.locator('[data-node="damage"]').click();
      await checkFit('selected upgrade', ['#upgrade-panel', '.upgrade-tree', '.upgrade-detail']);
      for (const branch of [1, 2, 0]) {
        await page.locator(`[data-group="${branch}"]`).click();
        await checkFit('upgrade branch', ['#upgrade-panel', '.upgrade-tree']);
      }
      await page.locator('[data-node="damage"]').press('Shift+Enter');
      await checkFit('upgrade description', ['#upgrade-description', '.upgrade-description-body']);
      if (width === 1440) {
        await page.setViewportSize({ width: 667, height: 375 });
        await page.locator('#upgrade-sheet:modal').waitFor();
        await page.locator('#upgrade-description:modal').waitFor();
        await checkFit('open description after shrinking', ['#upgrade-description']);
        assert.equal(await page.evaluate(() => document.activeElement.hasAttribute('data-close-description')), true);
        await page.setViewportSize({ width, height });
        await page.locator('#upgrade-description:modal').waitFor();
        await page.locator('#upgrade-sheet').waitFor({ state: 'hidden' });
        await checkFit('open description after growing', ['#upgrade-description']);
      }
      await page.keyboard.press('Escape');
      if (await page.locator('#upgrade-sheet').isVisible()) await page.keyboard.press('Escape');
      await page.locator('[data-stats]').click();
      for (const section of ['income', 'match', 'combat']) {
        await page.locator(`[data-view="${section}"]`).click();
        await checkFit(`stats ${section}`, ['#match-overview', `[data-screen="${section}"]`]);
      }
      await page.keyboard.press('Escape');
      await page.locator('[data-open-dialog="match-settings"]').click();
      await page.locator('#mode').selectOption('versus');
      await checkFit('versus settings', ['#match-settings', '#bot-profile', '#sound-effects', '#restart']);
      await page.keyboard.press('Escape');
      await checkFit('versus battlefield', ['main', '#arena', '[data-rival]']);
    } finally {
      await page.close();
    }
  }
  console.log('PASS: battlefield, upgrades, descriptions, stats and settings fit seven viewports without scrolling.');
}

try {
  const base = await serverUrl();
  if (output) await mkdir(output, { recursive:true });
  assert.equal((await fetch(`${base}/web`, { redirect:'manual' })).headers.get('location'), '/web/');
  assert.equal((await fetch(`${base}/scripts/`)).status, 404, 'directories other than the game index are not streamed');
  assert.equal((await fetch(`${base}/web/art/fortress-atlas.webp`, { method: 'HEAD' })).headers.get('content-type'), 'image/webp');
  assert.equal((await fetch(`${base}/web/art/kethra-terrain.webp`, { method: 'HEAD' })).headers.get('content-type'), 'image/webp');
  browser = await chromium.launch({ executablePath: process.env.KETHRA_BROWSER || undefined });
  await verifyFixedViewports(base);
  await scenario(base, false);
  await scenario(base, true);
  await verifyTurretArt(base);
  await verifyAiming(base);
  await verifyAbilityChoices(base);
  if (process.env.KETHRA_PREVIEW_FILE) await scenario(pathToFileURL(resolve(process.env.KETHRA_PREVIEW_FILE)).href, false, true);
} finally {
  await browser?.close();
  server.kill();
}
