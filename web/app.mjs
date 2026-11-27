import { BOT_PROFILES, LiveMatch, TIER2_MAX_LEVEL, TIER2_FAMILIES, TIER3_FAMILIES, killFluxForCreep, visualLaneForCreep } from '../dist/live.mjs';
import { createTouchUi } from './touch-ui.mjs';
import { createUpgradePanel } from './upgrade-panel.mjs';
import { createArenaArt } from './arena-art.mjs';
import { createTurretMotion, FORTRESS } from './turret-motion.mjs';

const canvas = document.querySelector('#arena');
const context = canvas.getContext('2d');
const WORLD_WIDTH = canvas.width;
const WORLD_HEIGHT = canvas.height;
let horizontalArena = false;
const status = document.querySelector('#status');
const start = document.querySelector('#start');
const restart = document.querySelector('#restart');
const mode = document.querySelector('#mode');
const botProfile = document.querySelector('#bot-profile');
const botProfileLabel = document.querySelector('#bot-profile-label');
const subtitle = document.querySelector('#subtitle');
const result = document.querySelector('#result');
const recon = document.querySelector('#recon');
const overview = document.querySelector('#match-overview');
const stage = document.querySelector('.game-stage');
const mapNav = document.querySelector('#map-nav');
const swipeMap = document.querySelector('#swipe-map');
const actionDock = document.querySelector('#action-dock');
const abilityMenu = document.querySelector('#ability-menu');
const abilityButton = document.querySelector('[data-abilities]');
const portraitMap = document.querySelector('#portrait-map');
const portraitTempo = document.querySelector('#portrait-tempo');
const fieldTip = document.querySelector('#field-tip');
const aimCancel = document.querySelector('#cancel-aim');
const arenaWrap = canvas.parentElement;
const strainMeter = document.querySelector('#strain-meter');
const waveTimer = document.querySelector('#incursion-next');
const waveLabel = document.querySelector('#portrait-wave');
const nextWaveLabel = document.querySelector('#next-wave-label');
const fluxLabel = document.querySelector('#portrait-flux');
const strainLabel = document.querySelector('#overload');
const createMatch = () => new LiveMatch(undefined, mode.value === 'solo' ? { botEnabled: false, soloProgression: true } : { botProfile:botProfile.value });
let match = createMatch();
let running = false;
let paused = false;
let previous = 0;
let mapView = 'human';
let swipeStart = null;
let aim = null;
let trackPosition = .5;
let trackMarkerVisible = false;
let statusExpiry;
const ultimateLabels = Object.fromEntries(Object.values(TIER3_FAMILIES).flat().map(({ id, label }) => [id, label]));

function setText(element, copy) {
  if (element.textContent !== copy) element.textContent = copy;
}

function updatePager(previous, next, position, page, count) {
  const focus = document.activeElement;
  previous.disabled = page === 0;
  next.disabled = page === count - 1;
  if (focus === previous && previous.disabled) next.focus({ preventScroll: true });
  if (focus === next && next.disabled) previous.focus({ preventScroll: true });
  setText(position, `${page + 1} / ${count}`);
}

function addPages(pages, title, items) {
  for (let offset = 0; offset < items.length; offset += 4) {
    pages.push({ title, items: items.slice(offset, offset + 4) });
  }
}

function showStatus(message) {
  clearTimeout(statusExpiry);
  status.hidden = !message;
  setText(status, message);
  if (message) statusExpiry = setTimeout(() => showStatus(''), 5000);
}

function setMapView(view, snapshot = latestSnapshot ?? match.snapshot()) {
  if (view === 'bot' && mode.value === 'solo') return;
  if (view !== mapView) aim = null;
  mapView = view;
  render(snapshot);
}

function setModeUi() {
  const solo = mode.value === 'solo';
  botProfileLabel.hidden = solo;
  subtitle.textContent = solo ? 'Solo · Defend your fortress' : `Versus bot · ${BOT_PROFILES[botProfile.value].label}`;
  mapNav.hidden = solo;
  stage.toggleAttribute('data-versus', !solo);
  if (solo) mapView = 'human';
}

function resetMatch(active = false) {
  match = createMatch();
  running = active;
  paused = false;
  previous = 0;
  aim = null;
  swipeStart = null;
  mapView = 'human';
  showStatus('');
  upgradePanel.reset();
  for (const motion of Object.values(turrets)) motion.reset();
  render(match.snapshot());
}
mode.addEventListener('change', () => { setModeUi(); resetMatch(); });
botProfile.addEventListener('change', () => { if (mode.value === 'versus') { setModeUi(); resetMatch(); } });
start.addEventListener('click', () => {
  if (latestSnapshot.result) {
    resetMatch(true);
    return;
  }
  paused = running && !paused;
  running = true;
  if (paused) aim = null;
  showStatus('');
  render(match.snapshot());
});
restart.addEventListener('click', () => {
  restart.closest('dialog').close();
  abilityMenu.close();
  resetMatch(true);
  start.focus({ preventScroll: true });
});
portraitTempo.addEventListener('click', () => {
  if (!running || paused) return;
  match.activateTempoCharge();
  showStatus(match.snapshot().message);
  render(match.snapshot());
});
portraitMap.addEventListener('click', () => setMapView(mapView === 'human' ? 'bot' : 'human'));

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * canvas.width / rect.width;
  const y = (event.clientY - rect.top) * canvas.height / rect.height;
  return horizontalArena ? { x: WORLD_WIDTH - y, y: x } : { x, y };
}

function aimAt(point) {
  let distance = Infinity;
  for (let step = 0; step <= 200; step++) {
    const progress = step / 200;
    const sample = routePoint(progress);
    const nextDistance = Math.hypot(sample.x - point.x, sample.y - point.y);
    if (nextDistance < distance) {
      distance = nextDistance;
      trackPosition = progress;
    }
  }
  trackMarkerVisible = distance <= 28;
}

function finishAim(cast) {
  if (!aim) return;
  const id = aim;
  aim = null;
  if (cast) {
    match.activateUltimate(id, trackPosition);
    showStatus(match.snapshot().message);
  } else showStatus('');
  render(match.snapshot());
  abilityButton.focus({ preventScroll: true });
}

aimCancel.addEventListener('click', () => finishAim(false));
document.addEventListener('keydown', event => {
  if (aim && event.key === 'Escape' && !document.querySelector('dialog:modal')) {
    event.preventDefault();
    finishAim(false);
  }
});
canvas.addEventListener('keydown', event => {
  if (!aim) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (trackMarkerVisible) finishAim(true);
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    trackPosition = Math.max(0, Math.min(1, trackPosition + (event.key === 'ArrowLeft' ? -.02 : .02)));
    trackMarkerVisible = true;
    render(latestSnapshot);
  }
});
canvas.addEventListener('pointerdown', event => {
  if (event.isPrimary && event.button === 0) swipeStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
});
canvas.addEventListener('pointermove', event => {
  if (aim && event.pointerType === 'mouse') aimAt(canvasPoint(event));
});
canvas.addEventListener('pointerup', event => {
  if (swipeStart?.id !== event.pointerId) return;
  const dx = event.clientX - swipeStart.x;
  const dy = event.clientY - swipeStart.y;
  swipeStart = null;
  if (swipeMap.checked && mode.value === 'versus' && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    setMapView(dx < 0 ? 'bot' : 'human');
    return;
  }
  if (mapView !== 'human' || Math.hypot(dx, dy) >= 12) return;
  const point = canvasPoint(event);
  if (aim) {
    aimAt(point);
    if (trackMarkerVisible) finishAim(true);
    else showStatus('Choose a point on the track.');
    return;
  }
  const player = latestSnapshot.players.human;
  if (running && !paused && player.priorityMode === 'manual') {
    const nearest = player.creeps.map(creep => {
      const position = formationPoint(creep.progress, 'human', creep.id);
      return { creep, distance: Math.hypot(position.x - point.x, position.y - point.y) };
    }).sort((a, b) => a.distance - b.distance)[0];
    if (nearest && nearest.distance < 24) {
      match.setManualTarget(nearest.creep.id);
      showStatus('Target selected.');
      render(match.snapshot());
      return;
    }
  }
  if (Math.hypot(point.x - FORTRESS.x, point.y - FORTRESS.y) < 58) openUpgrades();
});
canvas.addEventListener('pointercancel', () => { swipeStart = null; });

function projectPoint(x, y) {
  return horizontalArena ? { x: y, y: WORLD_WIDTH - x } : { x, y };
}

function drawLabel(text, x, y, offsetY) {
  const point = projectPoint(x, y);
  context.save();
  context.resetTransform();
  context.fillText(text, point.x, point.y + offsetY);
  context.restore();
}

function drawEnemyHealth(point, radius, hp) {
  const anchor = projectPoint(point.x, point.y);
  const width = (radius + 1) * 2;
  context.save();
  context.resetTransform();
  context.fillStyle = '#081120';
  context.fillRect(anchor.x - radius - 1, anchor.y - radius - 9, width, 3);
  context.fillStyle = hp > .35 ? '#77e6a0' : '#ff8a6d';
  context.fillRect(anchor.x - radius - 1, anchor.y - radius - 9, width * hp, 3);
  context.restore();
}

function routePoint(progress) {
  if (progress <= .3) return { x:68, y:626 - progress / .3 * 408 };
  if (progress <= .7) { const angle = Math.PI * (1 - (progress - .3) / .4); return { x:210 + 142 * Math.cos(angle), y:218 - 112 * Math.sin(angle) }; }
  return { x:352, y:218 + (progress - .7) / .3 * 408 };
}
function formationPoint(progress, side, creepId) {
  const point = routePoint(progress, side);
  const before = routePoint(Math.max(0, progress - .001), side);
  const after = routePoint(Math.min(1, progress + .001), side);
  const dx = after.x - before.x; const dy = after.y - before.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = visualLaneForCreep(creepId) * 5;
  // Visual-only: the perpendicular offset never changes the creep's progress
  // or any calculation in the deterministic match.
  return { x: point.x - dy / length * offset, y: point.y + dx / length * offset };
}
function creepReward(creep, player) { return killFluxForCreep(creep.wave, creep.completedLaps, player.tower.rewardFloor); }
function creepColor(creep, player) {
  if (creep.boss) return '#f3ad4f';
  const floor = killFluxForCreep(creep.wave, 99, player.tower.rewardFloor);
  if (floor >= 5) return '#66d977';
  const firstLap = killFluxForCreep(creep.wave, 0, player.tower.rewardFloor);
  const progress = Math.max(0, Math.min(1, (firstLap - creepReward(creep, player)) / Math.max(1, firstLap - floor)));
  return `hsl(${120 * (1 - progress)} 72% 56%)`;
}
function seededUnit(value, salt = 0) {
  let hash = 2166136261 ^ salt;
  for (const character of String(value)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return ((hash >>> 0) % 1000) / 1000;
}
function polygon(x, y, radius, sides, rotation = 0, wobble = 0, seed = 0) {
  context.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const variance = 1 - wobble + seededUnit(seed, index) * wobble * 2;
    const angle = rotation + index / sides * Math.PI * 2;
    const px = x + Math.cos(angle) * radius * variance;
    const py = y + Math.sin(angle) * radius * variance;
    index ? context.lineTo(px, py) : context.moveTo(px, py);
  }
  context.closePath();
}
function drawKethra(creep, point, radius, baseColor) {
  const phase = snapshotTime * 1.5 + seededUnit(creep.id) * Math.PI * 2;
  const form = creep.form ?? 'standard';
  context.save(); context.translate(point.x, point.y);
  context.shadowColor = baseColor; context.shadowBlur = creep.boss ? 16 : 7;
  if (form.includes('abomination')) {
    polygon(0, 0, radius, 9, phase * .3, .19, creep.id); context.fillStyle = baseColor; context.fill();
    context.lineWidth = 2; context.strokeStyle = '#ffd0dd'; context.stroke();
    polygon(0, 0, radius * .55, 6, -phase, .12, `${creep.id}core`); context.fillStyle = '#4a1630'; context.fill();
  } else if (form.includes('chimera')) {
    for (let lobe = 0; lobe < 4; lobe += 1) {
      const angle = phase * .45 + lobe * Math.PI / 2;
      context.fillStyle = lobe % 2 ? '#b878e8' : baseColor;
      context.beginPath(); context.arc(Math.cos(angle) * radius * .38, Math.sin(angle) * radius * .38, radius * .58, 0, Math.PI * 2); context.fill();
    }
    context.strokeStyle = '#f2d8ff'; context.lineWidth = 1.3; context.beginPath(); context.arc(0, 0, radius * .7, 0, Math.PI * 2); context.stroke();
  } else if (form === 'fragment' || form === 'shard' || form === 'brood') {
    polygon(0, 0, radius, 3, phase, .06, creep.id); context.fillStyle = baseColor; context.fill();
  } else {
    polygon(0, 0, radius, 7, phase * .22, .13, creep.id); context.fillStyle = baseColor; context.fill();
    context.fillStyle = '#e3fff0'; context.globalAlpha = .55; context.beginPath(); context.arc(-radius * .22, -radius * .18, Math.max(1.5, radius * .22), 0, Math.PI * 2); context.fill(); context.globalAlpha = 1;
  }
  if (creep.boss) { context.strokeStyle = '#fff1ab'; context.lineWidth = 2; context.beginPath(); context.arc(0, 0, radius + 4 + Math.sin(snapshotTime * 5) * 1.5, 0, Math.PI * 2); context.stroke(); }
  context.restore();
}
function drawSide(player, side, color, visible) {
  arenaArt.drawTrack(snapshotTime, color, visible ? player.killzoneCoverage : .3);
  if (player.conjunctionUntil > snapshotTime && player.conjunctionZone) { context.strokeStyle = '#d9bcff88'; context.lineWidth = 28; context.lineCap = 'round'; context.beginPath(); for (let p = player.conjunctionZone.start; p <= player.conjunctionZone.end + .001; p += .01) { const point = routePoint(Math.min(player.conjunctionZone.end,p), side); p > player.conjunctionZone.start ? context.lineTo(point.x,point.y) : context.moveTo(point.x,point.y); } context.stroke(); }
  for (const scar of player.breachScars.filter((scar) => !scar.remote && scar.end > snapshotTime)) { const point=routePoint(scar.progress,side), alpha=Math.min(1,(scar.end-snapshotTime)/.5); context.globalAlpha=alpha*.65; context.fillStyle='#ff7b57'; context.beginPath(); context.arc(point.x,point.y,23+Math.sin(snapshotTime*8)*3,0,Math.PI*2); context.fill(); context.globalAlpha=1; }
  for (const meteor of player.pendingMeteors) { const point=routePoint(meteor.progress,side); context.strokeStyle='#ffbd71'; context.setLineDash([3,4]); context.lineWidth=2; context.beginPath(); context.arc(point.x,point.y,18,0,Math.PI*2); context.stroke(); context.setLineDash([]); }
  const points = new Map(visible ? player.creeps.map(creep => [creep.id, formationPoint(creep.progress, side, creep.id)]) : []);
  const motion = turrets[side];
  const pose = motion.update(snapshotTime, {
    activeId: visible ? player.activeTargetId : null,
    hasTargetInRange: visible && player.hasTargetInRange,
    rounds: visible ? player.projectiles : [],
    pointFor: id => points.get(id),
    reduced: reduceMotion.matches
  });
  arenaArt.drawTower(color, side === 'human' ? 'YOUR FORTRESS' : 'RIVAL FORTRESS', pose);
  if (!visible) return;
  for (const creep of player.creeps) { const point = points.get(creep.id); const hp = Math.max(0, creep.hp / creep.maxHp), radius=(creep.form?.includes('abomination')?18:creep.form?.includes('chimera')?12:creep.form==='fragment'?4:creep.form==='shard'?5:creep.form==='brood'?5:7)+(creep.boss?3:0); if (creep.slowUntil > snapshotTime) { context.strokeStyle = '#6ce5ff'; context.lineWidth = 2; context.shadowColor='#6ce5ff'; context.shadowBlur=8; context.beginPath(); context.arc(point.x, point.y + 5, radius+3, 0, Math.PI * 2); context.stroke(); context.shadowBlur=0; } if (creep.safeToken && creep.safeUntil > snapshotTime) { context.strokeStyle='#f7dc6f'; context.lineWidth=2; context.beginPath(); context.arc(point.x,point.y,radius+6,0,Math.PI*2); context.stroke(); } if (creep.chrysalisUntil > snapshotTime) { context.fillStyle='#c891ff77'; context.beginPath(); context.ellipse(point.x,point.y,radius+4,radius+8,0,0,Math.PI*2); context.fill(); } if (creep.burn) { context.fillStyle = '#ff8e46'; context.shadowColor='#ff5d3e'; context.shadowBlur=9; context.beginPath(); context.arc(point.x + radius*.7, point.y - radius, 3 + Math.sin(snapshotTime * 16 + creep.id), 0, Math.PI * 2); context.fill(); context.shadowBlur=0; } const baseColor = creep.boss?'#f3ad4f':creep.form?.includes('abomination')?'#b94c75':creep.form?.includes('chimera')?'#c47dff':creep.form==='fragment'?'#8bf2db':creepColor(creep, player); drawKethra(creep, point, radius, baseColor); drawEnemyHealth(point, radius, hp); }
  for (const projectile of player.projectiles) {
    const target = points.get(projectile.targetId);
    const origin = motion.originFor(projectile.firedAt);
    if (origin && target) drawRound(projectile, origin, target);
  }
}

function drawRound(round, origin, target) {
  const travel = Math.max(0, Math.min(1, (snapshotTime - round.firedAt) / (round.impactAt - round.firedAt)));
  const dx = target.x - origin.x, dy = target.y - origin.y;
  const color = round.overdrive ? '#e9ff67' : round.crit ? '#ff92eb' : '#ffeab4';
  context.save();
  context.translate(origin.x + dx * travel, origin.y + dy * travel);
  context.rotate(Math.atan2(dy, dx));
  const tail = Math.min(18, Math.hypot(dx, dy) * travel);
  if (tail > 0) {
    const trail = context.createLinearGradient(-tail, 0, 0, 0);
    trail.addColorStop(0, `${color}00`);
    trail.addColorStop(1, color);
    context.strokeStyle = trail;
    context.lineWidth = round.crit || round.overdrive ? 3 : 2;
    context.beginPath();
    context.moveTo(-tail, 0);
    context.lineTo(0, 0);
    context.stroke();
  }
  context.shadowBlur = 7;
  context.shadowColor = color;
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(0, 0, round.crit ? 5 : 3.5, round.crit ? 2.5 : 1.8, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}
function drawCritFloats(snapshot) {
  for (const float of snapshot.critFloats) {
    if (float.player !== mapView) continue;
    const age = snapshot.time - float.startedAt; const alpha = Math.max(0, 1 - age / .65);
    const side = float.player === 'human' ? 'human' : 'bot'; const point = formationPoint(float.progress, side, float.targetId);
    context.globalAlpha = alpha; context.fillStyle = '#ff86e9'; context.font = '800 18px system-ui'; context.textAlign = 'center'; drawLabel('Crit!', point.x, point.y, -24 - age * 28); context.globalAlpha = 1;
  }
}
function drawFogOverlay(reconLevel, opponent) {
  const fog = context.createRadialGradient(210, 355, 30, 210, 355, 330); fog.addColorStop(0, '#0a1020b8'); fog.addColorStop(1, '#03060eea'); context.fillStyle = fog; context.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  context.fillStyle = '#d5def3'; context.font = '800 20px system-ui'; context.textAlign = 'center'; drawLabel('FOG OF WAR', 210, 350, -12);
  context.fillStyle = '#97a8cc'; context.font = '600 11px system-ui';
  const message = reconLevel >= 4 ? 'Live composition and cooldown telemetry available.' : reconLevel >= 3 ? 'Tier II telemetry available.' : reconLevel >= 2 ? 'Tier I telemetry available.' : reconLevel > 0 ? `Core Strain ${opponent.load} / ${opponent.overloadCap}` : 'Opponent Kethra, upgrades and economy are concealed.';
  drawLabel(reconLevel ? `Spectral Relay: ${message}` : message, 210, 350, 12);
  drawLabel(reconLevel ? `Upgrade to rank ${TIER2_MAX_LEVEL} for full reconnaissance.` : 'Spectral Relay rank 1 reveals purchases and Core Strain.', 210, 350, 32);
}
const priorities = { default: 'Automatic', veteran: 'Most laps', lowest: 'Lowest health', highest: 'Highest health', manual: 'Pick an enemy' };
const contracts = { chimera: ['Chimera', 90], abomination: ['Abomination', 180], hp: ['+20% health', 55], armor: ['+2 armor', 55], speed: ['+15% speed', 55] };
let abilityLayout = '';
let abilityPage = 0;
let abilityPages = [];
const abilityPrevious = abilityMenu.querySelector('[data-ability-prev]');
const abilityNext = abilityMenu.querySelector('[data-ability-next]');
const abilityPosition = abilityMenu.querySelector('[data-ability-position]');

function showAbilityPage(page) {
  abilityPage = page;
  abilityPages.forEach((panel, index) => { panel.hidden = index !== page; });
  abilityPrevious.parentElement.hidden = abilityPages.length < 2;
  if (abilityPages.length) updatePager(abilityPrevious, abilityNext, abilityPosition, page, abilityPages.length);
}

abilityPrevious.addEventListener('click', () => showAbilityPage(abilityPage - 1));
abilityNext.addEventListener('click', () => showAbilityPage(abilityPage + 1));

function renderActionDock(snapshot) {
  const player = snapshot.players.human;
  const active = running && !paused;
  const owned = new Set(Object.values(player.tier3).flatMap(choices => Object.keys(choices).filter(id => choices[id])));
  const quick = [];

  function ability(attribute, id, name, remaining, ready = 'Ready', side = '') {
    quick.push({ attribute, id, name, remaining, ready, side });
  }

  if (player.tower.overdrive) ability('action', 'overdrive', 'Surge Core', player.overdriveCooldown);
  for (const choice of TIER2_FAMILIES.overdrive) {
    if (player.tier2.overdrive[choice.id]) ability('active', choice.id, choice.label, player.activeCooldowns[choice.id]);
  }
  for (const id of ['signalCorruption', 'nullifyingPurge', 'orbitalBreach', 'conjunctionSpheres']) {
    if (!owned.has(id)) continue;
    const label = ultimateLabels[id];
    const remaining = player.ultimateCooldowns[id];
    if (id === 'nullifyingPurge' || id === 'orbitalBreach') ability('aim-ultimate', id, label, remaining, 'Aim on track');
    else if (id === 'conjunctionSpheres') {
      ability('ultimate', id, 'Conjunction · Entry side', remaining, 'Ready', 'left');
      ability('ultimate', id, 'Conjunction · Return side', remaining, 'Ready', 'right');
    } else ability('ultimate', id, label, remaining);
  }

  const targeting = owned.has('commandOverride');
  const bioforge = owned.has('bioforgeProgram');
  const layout = JSON.stringify([quick.map(item => item.id), targeting, bioforge]);
  if (layout !== abilityLayout) {
    abilityLayout = layout;
    const pages = [];
    addPages(pages, 'Combat abilities', quick.map(item =>
      `<button type="button" data-${item.attribute}="${item.id}"${item.side ? ` data-side="${item.side}"` : ''}><span>${item.name}</span><small></small></button>`));
    if (targeting) addPages(pages, 'Target priority', Object.entries(priorities).map(([id, label]) =>
      `<button type="button" data-priority="${id}">${label}</button>`));
    if (bioforge) addPages(pages, 'Bioforge · Next available wave', Object.entries(contracts).map(([id, [label, cost]]) =>
      `<button type="button" data-bioforge="${id}">${label} · ${cost} Flux</button>`));
    actionDock.innerHTML = pages.map(({ title, items }) =>
      `<section class="ability-page"><h3>${title}</h3><div>${items.join('')}</div></section>`).join('');
    abilityPages = [...actionDock.children];
    abilityButton.disabled = !pages.length;
    if (abilityButton.disabled) abilityMenu.close();
    showAbilityPage(0);
  }
  actionDock.querySelectorAll('button[data-action], button[data-active], button[data-ultimate], button[data-aim-ultimate]').forEach((button, index) => {
    const item = quick[index];
    const ready = item.remaining <= 0;
    button.disabled = !active || !ready;
    button.classList.toggle('ability-ready', active && ready);
    if (item.attribute === 'aim-ultimate') button.setAttribute('aria-pressed', String(aim === item.id));
    const label = !ready ? `Recharging · ${Math.ceil(item.remaining)} s` : paused ? 'Paused' : aim === item.id ? 'Aiming' : item.ready;
    setText(button.lastElementChild, label);
  });
  for (const button of actionDock.querySelectorAll('[data-priority]')) {
    button.disabled = !active;
    button.setAttribute('aria-pressed', String(player.priorityMode === button.dataset.priority));
  }
  for (const button of actionDock.querySelectorAll('[data-bioforge]')) {
    button.disabled = !active || player.energy < contracts[button.dataset.bioforge][1];
  }
}

actionDock.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || !running || paused) return;
  const { action, active, priority, bioforge, aimUltimate, ultimate, side } = button.dataset;
  if (aimUltimate && aim === aimUltimate) return finishAim(false);
  aim = null;
  if (action === 'overdrive') match.activateOverdrive();
  else if (active) match.activateTier2('overdrive', active);
  else if (priority) match.setPriority(priority);
  else if (bioforge) match.buyBioforgeContract(bioforge);
  else if (aimUltimate) {
    mapView = 'human';
    aim = aimUltimate;
    trackPosition = .5;
    trackMarkerVisible = true;
    showStatus('');
    render(match.snapshot());
    abilityMenu.close();
    canvas.focus({ preventScroll: true });
    return;
  } else if (ultimate) match.activateUltimate(ultimate, .5, side ?? 'left');
  abilityMenu.close();
  const snapshot = match.snapshot();
  showStatus(priority ? `Target priority · ${priorities[priority]}` : snapshot.message);
  render(snapshot);
});

function openUpgrades() {
  if (aim) finishAim(false);
  upgradePanel.open();
}

function renderFieldControls(snapshot, opponentView) {
  const human = snapshot.players.human;
  setText(start, snapshot.result ? 'Play again' : running ? paused ? 'Resume' : 'Pause' : 'Start match');
  start.classList.toggle('primary', !running || paused);
  setText(fluxLabel, String(Math.floor(human.energy)));
  setText(waveLabel, `Wave ${snapshot.wave} / ${snapshot.maxWaves}${snapshot.wave % 5 === 0 ? ' · Boss' : ''}`);
  const finalWave = snapshot.wave === snapshot.maxWaves;
  setText(waveTimer, finalWave ? 'Final wave' : `${Math.ceil(snapshot.nextIncursionIn)}s`);
  nextWaveLabel.hidden = finalWave;
  setText(strainLabel, `${human.load} / ${human.overloadCap}`);
  strainMeter.max = human.overloadCap;
  strainMeter.value = human.load;
  strainMeter.classList.toggle('danger', human.load / human.overloadCap >= .75);
  arenaWrap.classList.toggle('aiming', Boolean(aim));
  aimCancel.hidden = !aim;
  if (aim) setText(fieldTip, `${ultimateLabels[aim]}: pick a spot on the track. Arrow keys to aim, Enter to fire.`);
  else if (paused) setText(fieldTip, 'Paused. You can still buy upgrades.');
  else if (opponentView) setText(fieldTip, 'Opponent battlefield.');
  else if (!running) setText(fieldTip, 'Your cannon fires on its own. Spend Flux to upgrade it.');
  else if (human.priorityMode === 'manual') setText(fieldTip, 'Manual aim: select an enemy on the track.');
  else setText(fieldTip, '');
  fieldTip.parentElement.hidden = !fieldTip.textContent;

  portraitTempo.hidden = mode.value !== 'versus' || (!human.tempoCharge && !human.tempoQueued);
  portraitTempo.disabled = !running || paused || !human.tempoCharge || human.tempoQueued;
  setText(portraitTempo, human.tempoQueued ? 'Early wave queued' : 'Send next wave early');
}

function drawAim() {
  if (!aim || !trackMarkerVisible) return;
  const point = routePoint(trackPosition);
  context.save();
  context.translate(point.x, point.y);
  context.strokeStyle = '#ffd27d';
  context.lineWidth = 2;
  context.shadowColor = '#111827';
  context.shadowBlur = 6;
  context.beginPath();
  context.arc(0, 0, 19, 0, Math.PI * 2);
  for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    context.moveTo(x * 15, y * 15);
    context.lineTo(x * 25, y * 25);
  }
  context.stroke();
  context.restore();
}

const reconTitle = recon.querySelector('[data-recon-title]');
const reconStrain = recon.querySelector('[data-recon-strain]');
const reconSection = recon.querySelector('[data-recon-section]');
const reconEntries = recon.querySelector('[data-recon-entries]');
const reconPosition = recon.querySelector('[data-recon-position]');
const reconPrevious = recon.querySelector('[data-recon-prev]');
const reconNext = recon.querySelector('[data-recon-next]');
let reconPages = [];
let reconPage = 0;

function showReconPage(page) {
  reconPage = page;
  const { title, items } = reconPages[page];
  setText(reconSection, title);
  if (reconEntries.children.length !== items.length) {
    reconEntries.replaceChildren(...items.map(() => document.createElement('li')));
  }
  items.forEach((item, index) => setText(reconEntries.children[index], item));
  reconPrevious.parentElement.hidden = reconPages.length < 2;
  updatePager(reconPrevious, reconNext, reconPosition, page, reconPages.length);
}

reconPrevious.addEventListener('click', () => showReconPage(reconPage - 1));
reconNext.addEventListener('click', () => showReconPage(reconPage + 1));

function renderRecon(bot, level) {
  const pages = [];
  const rankList = values => Object.entries(values).filter(([, rank]) => rank).map(([id, rank]) => `${id} · Rank ${rank}`);
  const addTelemetry = (title, items, empty = 'None') => addPages(pages, title, items.length ? items : [empty]);
  addTelemetry('Bot purchases', [...bot.purchaseLog].reverse().map(entry => entry.label), 'The bot has not purchased yet.');
  if (level >= 2) addTelemetry('Tier I', [...rankList(bot.tower), ...rankList(bot.mutations)]);
  if (level >= 3) addTelemetry('Tier II', Object.values(bot.tier2).flatMap(rankList));
  if (level >= 4) {
    const composition = new Map();
    for (const creep of bot.creeps) composition.set(creep.form, (composition.get(creep.form) ?? 0) + 1);
    addTelemetry('Live composition', [...composition].map(([form, count]) => `${form} ×${count}`), 'No active Kethra');
    addTelemetry('Cooldown telemetry', [...Object.entries(bot.activeCooldowns), ...Object.entries(bot.ultimateCooldowns)]
      .map(([id, seconds]) => `${id} · ${Math.ceil(seconds)}s`));
  }
  if (level >= TIER2_MAX_LEVEL) addTelemetry('Ultimates', Object.values(bot.tier3).flatMap(choices =>
    Object.keys(choices).filter(id => choices[id]).map(id => ultimateLabels[id])));
  reconPages = pages;
  setText(reconTitle, `Spectral Relay · Rank ${level}`);
  setText(reconStrain, `Bot core strain ${bot.load} / ${bot.overloadCap}`);
  showReconPage(Math.min(reconPage, pages.length - 1));
}

overview.addEventListener('showrecon', () => {
  reconPage = 0;
  render(latestSnapshot);
});

let snapshotTime = 0;
let latestSnapshot = null;
function render(snapshot) {
  latestSnapshot = snapshot;
  snapshotTime = snapshot.time;
  context.resetTransform();
  context.clearRect(0, 0, canvas.width, canvas.height);
  // Rotate the same world for wide arenas. Simulation and aiming keep their original coordinates.
  if (horizontalArena) context.setTransform(0, -1, 1, 0, 0, WORLD_WIDTH);
  arenaArt.drawBackground();
  const human = snapshot.players.human, bot = snapshot.players.bot, reconLevel = human.tier2.rewardFloor.recon, opponentView = mapView === 'bot' && mode.value === 'versus', viewedPlayer = opponentView ? bot : human, viewedSide = opponentView ? 'bot' : 'human', visible = !opponentView || reconLevel >= TIER2_MAX_LEVEL;
  drawSide(viewedPlayer, viewedSide, opponentView ? '#c99ce4' : '#e8bb79', visible); if (opponentView && !visible) drawFogOverlay(reconLevel, bot); if (visible) drawCritFloats(snapshot);
  drawAim();
  setText(document.querySelector('#clock'), `${String(Math.floor(snapshot.time / 60)).padStart(2, '0')}:${String(Math.floor(snapshot.time % 60)).padStart(2, '0')}`);
  setText(document.querySelector('#bot-overload'), `${bot.load} / ${bot.overloadCap}`);
  for (const [id, player] of Object.entries({ human, bot })) { const earned = document.querySelector(`#${id}-earned`), interest = document.querySelector(`#${id}-interest`), avarice = document.querySelector(`#${id}-avarice`), next = document.querySelector(`#${id}-interest-next`); if (earned) earned.textContent = String(player.earnedEnergy); if (interest) interest.textContent = String(player.interestEnergy); if (avarice) avarice.textContent = String(player.avariceEnergy); if (next) next.textContent = `${player.nextInterestIn.toFixed(1)} s · +${Math.floor(player.nextInterestEstimate)}`; }
  document.querySelector('#human-interest-rate').textContent = `${(human.interestRate * 100).toFixed(2)}% / 6s`;
  document.querySelector('#combat-damage').textContent = human.combat.damage.join('–'); document.querySelector('#combat-speed').textContent = `${human.combat.attackRate.toFixed(2)} / s`; document.querySelector('#combat-crit').textContent = `${(human.combat.criticalChance * 100).toFixed(1)}%`; document.querySelector('#combat-multiplier').textContent = typeof human.combat.criticalMultiplier === 'number' ? `${human.combat.criticalMultiplier}×` : human.combat.criticalMultiplier;
  const versus = mode.value === 'versus'; document.querySelectorAll('[data-bot-strain]').forEach((element) => { element.hidden = !versus || reconLevel < 1; }); document.querySelectorAll('[data-bot-economy]').forEach((element) => { element.hidden = !versus || reconLevel < TIER2_MAX_LEVEL; }); portraitMap.disabled = !versus; portraitMap.textContent = opponentView ? 'Your fortress' : 'Opponent';
  if (versus && reconLevel && overview.open && !recon.hidden) renderRecon(bot, reconLevel);
  renderFieldControls(snapshot, opponentView);
  upgradePanel.refresh(snapshot, running);
  renderActionDock(snapshot);
  touchUi.refresh(versus, opponentView, versus && reconLevel > 0);
  result.hidden = !snapshot.result; result.textContent = snapshot.result ?? '';
}
function frame(now) {
  if (running && !paused) {
    const elapsed = previous ? (now - previous) / 1000 : 0;
    match.step(elapsed);
    const snapshot = match.snapshot();
    if (snapshot.result) {
      running = false;
      aim = null;
      showStatus('');
    }
    render(snapshot);
  }
  previous = now;
  requestAnimationFrame(frame);
}
const fortressAtlas = document.querySelector('#fortress-atlas');
const arenaArt = createArenaArt(context, canvas, routePoint, fortressAtlas, drawLabel);
const turrets = { human:createTurretMotion(), bot:createTurretMotion() };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const upgradePanel = createUpgradePanel({
  panel: document.querySelector('#upgrade-panel'),
  sheet: document.querySelector('#upgrade-sheet'),
  desktop: document.querySelector('.right-panel'),
  purchase(tier, root, id) {
    if (tier === 1) match.buy(root in match.players.human.tower ? 'tower' : 'mutation', root);
    else if (tier === 2) match.buyTier2(root, id);
    else match.buyTier3(root, id);
    const snapshot = match.snapshot();
    render(snapshot);
    return snapshot.message;
  }
});
const touchUi = createTouchUi({ openUpgrades, closeUpgrades: upgradePanel.close });
fortressAtlas.addEventListener('load', () => {
  if (!running || paused) render(match.snapshot());
});
new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  const nextHorizontal = width > height * 1.05;
  if (nextHorizontal === horizontalArena) return;
  horizontalArena = nextHorizontal;
  canvas.width = horizontalArena ? WORLD_HEIGHT : WORLD_WIDTH;
  canvas.height = horizontalArena ? WORLD_WIDTH : WORLD_HEIGHT;
  canvas.toggleAttribute('data-horizontal', horizontalArena);
  render(latestSnapshot);
}).observe(arenaWrap);

setModeUi(); render(match.snapshot()); requestAnimationFrame(frame);
