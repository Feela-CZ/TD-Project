import { BOT_PROFILES, LiveMatch, ULTIMATE_COST, UPGRADE_GROUPS, TIER1_MAX_LEVEL, TIER2_MAX_LEVEL, TIER2_FAMILIES, TIER3_FAMILIES, damageRange, killFluxForCreep, visualLaneForCreep } from '../dist/live.mjs';

const canvas = document.querySelector('#arena');
const context = canvas.getContext('2d');
const status = document.querySelector('#status');
const start = document.querySelector('#start');
const restart = document.querySelector('#restart');
const mode = document.querySelector('#mode');
const botProfile = document.querySelector('#bot-profile');
const botProfileLabel = document.querySelector('#bot-profile-label');
const subtitle = document.querySelector('#subtitle');
const result = document.querySelector('#result');
const upgrades = document.querySelector('#upgrade-groups');
const tier2Groups = document.querySelector('#tier2-groups');
const tier3Groups = document.querySelector('#tier3-groups');
const overdrive = document.querySelector('#overdrive');
const overdriveNote = document.querySelector('#overdrive-note');
const activeAbilities = document.querySelector('#active-abilities');
const ultimateAbilities = document.querySelector('#ultimate-abilities');
const recon = document.querySelector('#recon');
const tempo = document.querySelector('#tempo');
const tempoNote = document.querySelector('#tempo-note');
const mapNav = document.querySelector('#map-nav');
const mapButtons = [...document.querySelectorAll('[data-map-view]')];
const swipeMap = document.querySelector('#swipe-map');
const skillTree = document.querySelector('#skill-tree');
const actionDock = document.querySelector('#action-dock');
const portraitMap = document.querySelector('#portrait-map');
const createMatch = () => new LiveMatch(undefined, mode.value === 'solo' ? { botEnabled: false, soloProgression: true } : { botProfile:botProfile.value });
let match = createMatch();
let running = false;
let previous = 0;
let mapView = 'human';
let swipeStart = null;
let pendingUltimateTarget = null;
let treeState = { root:null, choice:null, detailed:false };
const CORE_ICONS = Object.freeze({ offense:'✹', mutation:'✥', utility:'◇' });
const NODE_ICONS = Object.freeze({ damage:'◉', attackSpeed:'≋', crit:'⌖', armor:'⬡', speed:'↟', maxHp:'◍', interest:'◌', rewardFloor:'▣', overdrive:'⚡' });
const NODE_INFO = Object.freeze({
  damage: ['Progressively raises base Round damage from 24–30 to 45–57.', 'Every Round, including physical split shots, begins with this range. Nine ranks preserve the approved final 45–57 endpoint while making each purchase a smaller, meaningful step.'],
  attackSpeed: ['Raises the fortress firing rate from 1.00 to 1.60 rounds per second.', 'Cadence is the permanent firing-rate layer. Combat Rhythm and temporary effects then multiply this live value; the Output panel always shows the current result.'],
  crit: ['Builds the base critical chance from 0% to 30%.', 'Precision sets the basic chance for a Round to become critical. Tier II can add chance or improve its multiplier, so the live critical total is shown separately.'],
  armor: ['Gradually raises the armor inherited by every spawned Kethra.', 'Carapace is applied at spawning. Its nine ranks lead to the current approved maximum rather than creating a stronger end state.'],
  speed: ['Gradually raises the movement speed inherited by every spawned Kethra.', 'Kinesis affects future spawns. Its later specializations add temporary movement behaviour on top of the inherited base speed.'],
  maxHp: ['Gradually raises the health inherited by every spawned Kethra.', 'Vital Mass affects future spawns. It is the persistent health layer; Tier II can add healing, distribution, or evolution behaviours.'],
  interest: ['Raises the interest rate paid every six seconds.', 'Reserves compounds only Flux kept available. The economy panel shows the exact active rate and an estimate of the next tick, including relevant economic effects.'],
  rewardFloor: ['Raises the minimum Flux value of a Kethra after repeated laps.', 'Control Nexus protects late-lap rewards from dropping too low. It does not change the first-lap reward; its exact effect is reflected in the next kill reward.'],
  overdrive: ['Builds Surge Core from an initial multi-round burst to its approved full output.', 'Each rank improves the four-second Surge Core window. It remains an active ability with a long cooldown, not permanent free firing speed.']
});

for (const group of UPGRADE_GROUPS) {
  const panel = document.createElement('section'); panel.className = 'group';
  panel.innerHTML = `<h2>${group.title}</h2>`;
  for (const [node, label] of group.nodes) {
    const button = document.createElement('button'); button.className = 'upgrade'; button.dataset.branch = group.branch; button.dataset.node = node;
    button.innerHTML = `<span>${label}</span><small>0 / 3</small>`;
    panel.append(button);
  }
  upgrades.append(panel);
}
for (const group of UPGRADE_GROUPS) {
  for (const [root, rootLabel] of group.nodes) {
    const panel = document.createElement('section'); panel.className = 'tier3-group'; panel.dataset.root = root;
    panel.innerHTML = `<h3>${rootLabel} — Ultimate</h3>`;
    for (const choice of TIER3_FAMILIES[root]) {
      const button = document.createElement('button'); button.className = 'tier3'; button.dataset.root = root; button.dataset.ultimate = choice.id;
      button.innerHTML = `<span>${choice.label}</span><small>${choice.detail}</small><em>Requires matching Tier II L2</em>`; panel.append(button);
    }
    tier3Groups.append(panel);
  }
}
for (const group of UPGRADE_GROUPS) {
  for (const [root, rootLabel] of group.nodes) {
    const panel = document.createElement('section'); panel.className = 'tier2-group'; panel.dataset.root = root;
    panel.innerHTML = `<h3>${rootLabel} — Tier II</h3>`;
    for (const choice of TIER2_FAMILIES[root]) {
      const button = document.createElement('button'); button.className = 'tier2'; button.dataset.root = root; button.dataset.choice = choice.id;
      button.innerHTML = `<span>${choice.label}</span><small>${choice.detail}</small><em>0 / 2</em>`; panel.append(button);
    }
    tier2Groups.append(panel);
  }
}
for (const choice of TIER2_FAMILIES.overdrive) { const button = document.createElement('button'); button.className = 'ability'; button.dataset.choice = choice.id; button.textContent = choice.label; activeAbilities.append(button); }
for (const [root, choices] of Object.entries(TIER3_FAMILIES)) for (const choice of choices.filter((entry) => entry.kind === 'active')) { const button = document.createElement('button'); button.className = 'ultimate'; button.dataset.ultimateActive = choice.id; button.dataset.root = root; button.textContent = `${choice.label} — locked`; ultimateAbilities.append(button); }

function setMapView(view, snapshot = latestSnapshot ?? match.snapshot()) { if (view === 'bot' && mode.value === 'solo') return; mapView = view; render(snapshot); }
function setModeUi() { const solo = mode.value === 'solo'; botProfileLabel.hidden = solo; subtitle.textContent = solo ? 'Solo progression — clear Wave 60' : `You versus ${BOT_PROFILES[botProfile.value].label} bot`; mapNav.hidden = solo; if (solo) mapView = 'human'; document.querySelector('.bot-note').hidden = solo; tempo.closest('.tempo').hidden = solo; }
function resetMatch(message) { match = createMatch(); running = false; start.disabled = false; result.hidden = true; status.textContent = message; render(match.snapshot()); }
mode.addEventListener('change', () => { setModeUi(); resetMatch(mode.value === 'solo' ? 'Solo progression ready. Clear Wave 60.' : 'Versus bot ready.'); });
botProfile.addEventListener('change', () => { if (mode.value === 'versus') { setModeUi(); resetMatch(`${BOT_PROFILES[botProfile.value].label} bot ready.`); } });
start.addEventListener('click', () => { running = true; status.textContent = mode.value === 'solo' ? 'Solo progression running. Clear Wave 60.' : 'Match running. Choose the first purchase for the situation.'; start.disabled = true; });
restart.addEventListener('click', () => { match = createMatch(); running = true; start.disabled = true; result.hidden = true; status.textContent = mode.value === 'solo' ? 'New solo progression match running.' : 'New deterministic match running.'; });
upgrades.addEventListener('click', (event) => { const button = event.target.closest('button[data-node]'); if (!button || !running) return; match.buy(button.dataset.branch, button.dataset.node); render(match.snapshot()); });
tier2Groups.addEventListener('click', (event) => { const button = event.target.closest('button[data-choice]'); if (!button || !running) return; match.buyTier2(button.dataset.root, button.dataset.choice); render(match.snapshot()); });
tier3Groups.addEventListener('click', (event) => { const button = event.target.closest('button[data-ultimate]'); if (!button || !running) return; match.buyTier3(button.dataset.root, button.dataset.ultimate); render(match.snapshot()); });
overdrive.addEventListener('click', () => { if (!running) return; match.activateOverdrive(); render(match.snapshot()); });
activeAbilities.addEventListener('click', (event) => { const button = event.target.closest('button[data-choice]'); if (!button || !running) return; match.activateTier2('overdrive', button.dataset.choice); render(match.snapshot()); });
ultimateAbilities.addEventListener('click', (event) => { const button = event.target.closest('button[data-ultimate-active]'); if (!button || !running) return; if (button.dataset.ultimateActive === 'signalCorruption') setMapView('bot'); match.activateUltimate(button.dataset.ultimateActive); render(match.snapshot()); });
tempo.addEventListener('click', () => { if (!running) return; match.activateTempoCharge(); render(match.snapshot()); });
document.querySelector('#portrait-tempo').addEventListener('click', () => { if (!running) return; match.activateTempoCharge(); render(match.snapshot()); });
mapButtons.forEach((button) => button.addEventListener('click', () => setMapView(button.dataset.mapView)));
portraitMap.addEventListener('click', () => setMapView(mapView === 'human' ? 'bot' : 'human'));
canvas.addEventListener('pointerdown', (event) => { swipeStart = { x:event.clientX, y:event.clientY }; });
canvas.addEventListener('pointerup', (event) => { if (!swipeStart) return; const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y; const rect = canvas.getBoundingClientRect(), x = (event.clientX - rect.left) * canvas.width / rect.width, y = (event.clientY - rect.top) * canvas.height / rect.height; swipeStart = null; if (swipeMap.checked && mode.value === 'versus' && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) { setMapView(dx < 0 ? 'bot' : 'human'); return; } if (mapView === 'human' && pendingUltimateTarget) { const player = (latestSnapshot ?? match.snapshot()).players.human; const nearest = player.creeps.map((creep) => ({ creep, point:formationPoint(creep.progress, 'human', creep.id) })).sort((a,b) => Math.hypot(a.point.x-x,a.point.y-y)-Math.hypot(b.point.x-x,b.point.y-y))[0]; match.activateUltimate(pendingUltimateTarget, nearest?.creep.progress ?? .5); pendingUltimateTarget = null; render(match.snapshot()); return; } if (mapView === 'human' && (latestSnapshot ?? match.snapshot()).players.human.priorityMode === 'manual') { const player = (latestSnapshot ?? match.snapshot()).players.human; const nearest = player.creeps.map((creep) => ({ creep, point:formationPoint(creep.progress, 'human', creep.id) })).sort((a,b) => Math.hypot(a.point.x-x,a.point.y-y)-Math.hypot(b.point.x-x,b.point.y-y))[0]; if (nearest && Math.hypot(nearest.point.x-x,nearest.point.y-y) < 24) { match.setManualTarget(nearest.creep.id); render(match.snapshot()); return; } } if (mapView === 'human' && Math.hypot(x - 210, y - 584) < 58) { treeState = { root:treeState.root ?? 'damage', choice:null, detailed:false }; render(match.snapshot()); } });
canvas.addEventListener('pointercancel', () => { swipeStart = null; });

function routePoint(progress, side) {
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
function drawTower(tower, color, label) {
  const pulse = 1 + Math.sin(snapshotTime * 3.2) * .05;
  context.save();
  context.translate(tower.x, tower.y);
  context.shadowColor = color;
  context.shadowBlur = 16;
  context.fillStyle = '#081226';
  context.beginPath(); context.arc(0, 0, 43 * pulse, 0, Math.PI * 2); context.fill();
  context.lineWidth = 2; context.strokeStyle = `${color}88`; context.stroke();
  context.shadowBlur = 0;
  polygon(0, 0, 31, 6, Math.PI / 6, .04, 37); context.fillStyle = '#162b4c'; context.fill();
  context.lineWidth = 2; context.strokeStyle = color; context.stroke();
  polygon(0, 0, 18, 6, snapshotTime * .18, .03, 91); context.fillStyle = '#0b1a32'; context.fill();
  context.strokeStyle = `${color}aa`; context.stroke();
  context.fillStyle = color; context.shadowBlur = 13; context.shadowColor = color;
  context.beginPath(); context.arc(0, 0, 7 + Math.sin(snapshotTime * 4) * 1, 0, Math.PI * 2); context.fill();
  context.shadowBlur = 0;
  for (const direction of [-1, 1]) {
    context.save(); context.rotate(direction * .36);
    context.fillStyle = '#183256'; context.fillRect(-4, -47, 8, 32);
    context.fillStyle = color; context.fillRect(-2, -48, 4, 12);
    context.restore();
  }
  context.fillStyle = '#cbdcff'; context.font = '800 9px system-ui'; context.textAlign = 'center'; context.fillText(label, 0, 5);
  context.restore();
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
function drawArenaBackground() {
  const ambience = context.createRadialGradient(210, 390, 24, 210, 390, 400);
  ambience.addColorStop(0, '#10254a'); ambience.addColorStop(.55, '#09182e'); ambience.addColorStop(1, '#050b19');
  context.fillStyle = ambience; context.fillRect(0, 0, canvas.width, canvas.height);
  context.save(); context.globalAlpha = .24; context.strokeStyle = '#385779'; context.lineWidth = .55;
  for (let x = 10; x < canvas.width; x += 28) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, canvas.height); context.stroke(); }
  for (let y = 20; y < canvas.height; y += 28) { context.beginPath(); context.moveTo(0, y); context.lineTo(canvas.width, y); context.stroke(); }
  context.globalAlpha = .34;
  for (const seed of [17, 29, 43, 71, 97, 113, 149, 193]) { const x = 22 + seededUnit(seed, 1) * 376, y = 76 + seededUnit(seed, 2) * 570, radius = 1 + seededUnit(seed, 3) * 1.6; context.fillStyle = seed % 2 ? '#76d8ff' : '#a789ff'; context.beginPath(); context.arc(x, y, radius, 0, Math.PI * 2); context.fill(); }
  context.restore();
}
function drawTrack(side, color) {
  context.lineWidth = 33; context.lineCap = 'round'; context.strokeStyle = '#071126'; context.beginPath();
  for (let p = 0; p <= 1.001; p += .012) { const point = routePoint(Math.min(1, p), side); p ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y); } context.stroke();
  context.lineWidth = 25; context.strokeStyle = '#1b2a49'; context.beginPath();
  for (let p = 0; p <= 1.001; p += .012) { const point = routePoint(Math.min(1, p), side); p ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y); } context.stroke();
  context.lineWidth = 3; context.setLineDash([2, 9]); context.lineDashOffset = -snapshotTime * 14; context.strokeStyle = `${color}aa`; context.beginPath();
  for (let p = 0; p <= 1.001; p += .012) { const point = routePoint(Math.min(1, p), side); p ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y); } context.stroke(); context.setLineDash([]);
  context.lineWidth = 29; context.strokeStyle = `${color}34`; context.beginPath();
  for (let p = .35; p <= .6501; p += .01) { const point = routePoint(p, side); p > .35 ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y); } context.stroke();
  const entry = routePoint(0, side); const exit = routePoint(1, side); for (const [index, portal] of [entry, exit].entries()) { context.save(); context.shadowColor = color; context.shadowBlur = 20; context.fillStyle = '#09152b'; context.beginPath(); context.arc(portal.x, portal.y, 20, 0, Math.PI * 2); context.fill(); context.strokeStyle = color; context.lineWidth = 2; context.beginPath(); context.arc(portal.x, portal.y, 15, snapshotTime * 2 * (index ? -1 : 1), snapshotTime * 2 * (index ? -1 : 1) + Math.PI * 1.55); context.stroke(); context.fillStyle = `${color}66`; context.beginPath(); context.arc(portal.x, portal.y, 8 + Math.sin(snapshotTime * 3 + index) * 2, 0, Math.PI * 2); context.fill(); context.restore(); }
}
function drawSide(player, side, color, visible) {
  const tower = { x:210, y:584 }; drawTrack(side, color);
  if (player.conjunctionUntil > snapshotTime && player.conjunctionZone) { context.strokeStyle = '#d9bcff88'; context.lineWidth = 28; context.lineCap = 'round'; context.beginPath(); for (let p = player.conjunctionZone.start; p <= player.conjunctionZone.end + .001; p += .01) { const point = routePoint(Math.min(player.conjunctionZone.end,p), side); p > player.conjunctionZone.start ? context.lineTo(point.x,point.y) : context.moveTo(point.x,point.y); } context.stroke(); }
  for (const scar of player.breachScars.filter((scar) => !scar.remote && scar.end > snapshotTime)) { const point=routePoint(scar.progress,side), alpha=Math.min(1,(scar.end-snapshotTime)/.5); context.globalAlpha=alpha*.65; context.fillStyle='#ff7b57'; context.beginPath(); context.arc(point.x,point.y,23+Math.sin(snapshotTime*8)*3,0,Math.PI*2); context.fill(); context.globalAlpha=1; }
  for (const meteor of player.pendingMeteors) { const point=routePoint(meteor.progress,side); context.strokeStyle='#ffbd71'; context.setLineDash([3,4]); context.lineWidth=2; context.beginPath(); context.arc(point.x,point.y,18,0,Math.PI*2); context.stroke(); context.setLineDash([]); }
  drawTower(tower, color, side === 'human' ? 'YOUR FORTRESS' : 'RIVAL FORTRESS');
  if (!visible) return;
  for (const creep of player.creeps) { const point = formationPoint(creep.progress, side, creep.id); const hp = Math.max(0, creep.hp / creep.maxHp), radius=(creep.form?.includes('abomination')?18:creep.form?.includes('chimera')?12:creep.form==='fragment'?4:creep.form==='shard'?5:creep.form==='brood'?5:7)+(creep.boss?3:0); if (creep.slowUntil > snapshotTime) { context.strokeStyle = '#6ce5ff'; context.lineWidth = 2; context.shadowColor='#6ce5ff'; context.shadowBlur=8; context.beginPath(); context.arc(point.x, point.y + 5, radius+3, 0, Math.PI * 2); context.stroke(); context.shadowBlur=0; } if (creep.safeToken && creep.safeUntil > snapshotTime) { context.strokeStyle='#f7dc6f'; context.lineWidth=2; context.beginPath(); context.arc(point.x,point.y,radius+6,0,Math.PI*2); context.stroke(); } if (creep.chrysalisUntil > snapshotTime) { context.fillStyle='#c891ff77'; context.beginPath(); context.ellipse(point.x,point.y,radius+4,radius+8,0,0,Math.PI*2); context.fill(); } if (creep.burn) { context.fillStyle = '#ff8e46'; context.shadowColor='#ff5d3e'; context.shadowBlur=9; context.beginPath(); context.arc(point.x + radius*.7, point.y - radius, 3 + Math.sin(snapshotTime * 16 + creep.id), 0, Math.PI * 2); context.fill(); context.shadowBlur=0; } const baseColor = creep.boss?'#f3ad4f':creep.form?.includes('abomination')?'#b94c75':creep.form?.includes('chimera')?'#c47dff':creep.form==='fragment'?'#8bf2db':creepColor(creep, player); drawKethra(creep, point, radius, baseColor); context.fillStyle = '#081120'; context.fillRect(point.x - radius-1, point.y - radius - 9, (radius+1)*2, 3); context.fillStyle = hp > .35 ? '#77e6a0' : '#ff8a6d'; context.fillRect(point.x - radius-1, point.y - radius - 9, (radius+1)*2 * hp, 3); }
  for (const projectile of player.projectiles) { const target = player.creeps.find((creep) => creep.id === projectile.targetId); if (!target) continue; const targetPoint = formationPoint(target.progress, side, target.id); const travel = Math.min(1, Math.max(0, (snapshotTime - projectile.firedAt) / (projectile.impactAt - projectile.firedAt))); const x = tower.x + (targetPoint.x - tower.x) * travel, y = tower.y + (targetPoint.y - tower.y) * travel, projectileColor = projectile.overdrive ? '#e9ff67' : projectile.crit ? '#ff92eb' : '#e6f4ff'; context.save(); context.translate(x,y); context.shadowColor=projectileColor; context.shadowBlur=12; context.fillStyle=projectileColor; if(projectile.crit) { polygon(0,0,6,4,Math.PI/4,0,projectile.targetId); context.fill(); } else { context.beginPath(); context.arc(0,0,projectile.overdrive?5:3.5,0,Math.PI*2); context.fill(); } context.restore(); }
}
function drawCritFloats(snapshot) {
  for (const float of snapshot.critFloats) {
    if (float.player !== mapView) continue;
    const age = snapshot.time - float.startedAt; const alpha = Math.max(0, 1 - age / .65);
    const side = float.player === 'human' ? 'human' : 'bot'; const point = formationPoint(float.progress, side, float.targetId);
    context.globalAlpha = alpha; context.fillStyle = '#ff86e9'; context.font = '800 18px system-ui'; context.textAlign = 'center'; context.fillText('Crit!', point.x, point.y - 24 - age * 28); context.globalAlpha = 1;
  }
}
function drawFogOverlay(reconLevel, opponent) {
  const fog = context.createRadialGradient(210, 355, 30, 210, 355, 330); fog.addColorStop(0, '#0a1020b8'); fog.addColorStop(1, '#03060eea'); context.fillStyle = fog; context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#d5def3'; context.font = '800 20px system-ui'; context.textAlign = 'center'; context.fillText('FOG OF WAR', 210, 338);
  context.fillStyle = '#97a8cc'; context.font = '600 11px system-ui';
  const message = reconLevel >= 4 ? 'Live composition and cooldown telemetry available.' : reconLevel >= 3 ? 'Tier II telemetry available.' : reconLevel >= 2 ? 'Tier I telemetry available.' : reconLevel > 0 ? `Core Strain ${opponent.load} / ${opponent.overloadCap}` : 'Opponent Kethra, upgrades and economy are concealed.';
  context.fillText(reconLevel ? `Spectral Relay: ${message}` : message, 210, 362);
  context.fillText(reconLevel ? `Upgrade to rank ${TIER2_MAX_LEVEL} for full reconnaissance.` : 'Spectral Relay rank 1 reveals purchases and Core Strain.', 210, 382);
}
const branchForRoot = (root) => ['damage','attackSpeed','crit'].includes(root) ? 'offense' : ['armor','speed','maxHp'].includes(root) ? 'mutation' : 'utility';
const groupForCore = (core) => UPGRADE_GROUPS.find((group) => group.title.toLowerCase() === core);
function renderSkillTree(snapshot) {
  const player = snapshot.players.human;
  skillTree.innerHTML = UPGRADE_GROUPS.map((group) => `<section class="tree-core"><h3>${group.title}</h3>${group.nodes.map(([root, label]) => {
    const levels = root in player.tower ? player.tower : player.mutations, level = levels[root], expanded = treeState.root === root;
    const selectedRoots = group.nodes.filter(([candidate]) => (candidate in player.tower ? player.tower[candidate] : player.mutations[candidate]) > 0).length;
    const rootLocked = level === 0 && selectedRoots >= 2, next = level + 1;
    const children = expanded ? `<p class="tree-node-brief">${NODE_INFO[root][0]}${treeState.detailed ? `<br><br>${NODE_INFO[root][1]}` : ''} <button class="tree-detail-toggle" data-tree-detail>More detail</button></p><button class="tree-buy" data-buy-tier1 ${!running || rootLocked || next > TIER1_MAX_LEVEL || player.nextTier1Cost === null ? 'disabled' : ''}>${next > TIER1_MAX_LEVEL ? 'MAX RANK' : rootLocked ? 'Other two paths committed' : `Tier I rank ${next} · ${player.nextTier1Cost === 0 ? 'free' : `${player.nextTier1Cost} Flux`}`}</button><div class="tree-children">${TIER2_FAMILIES[root].map((choice, index) => {
      const choiceLevel = player.tier2[root][choice.id], selected = treeState.choice === choice.id, selectedCount = Object.values(player.tier2[root]).filter(Boolean).length, locked = choiceLevel === 0 && selectedCount >= 2, ultimate = TIER3_FAMILIES[root][index], owned = player.tier3[root][ultimate.id] > 0;
      return `<div><button class="tree-child" data-tree-tier2="${choice.id}" ${rootLevelLocked(level) ? 'disabled' : ''}><span>${choice.label}</span><small>${rootLevelLocked(level) ? 'Requires Tier I rank 1' : `${choiceLevel} / ${TIER2_MAX_LEVEL}`}</small></button>${selected ? `<div class="tier2-detail"><p>${choice.detail} Five ranks scale its approved effect from its initial to final value.</p><button data-buy-tier2="${choice.id}" ${!running || locked || choiceLevel >= TIER2_MAX_LEVEL || player.nextTier2Cost === null ? 'disabled' : ''}>${choiceLevel >= TIER2_MAX_LEVEL ? 'MAX RANK' : locked ? 'Third path locked' : `Tier II rank ${choiceLevel + 1} · ${player.nextTier2Cost} Flux`}</button><button class="tree-ultimate" data-buy-tier3="${ultimate.id}" ${!running || choiceLevel !== TIER2_MAX_LEVEL || owned || (!isFreeUltimate(ultimate.id) && player.energy < ULTIMATE_COST) ? 'disabled' : ''}>${ultimate.label}<br><small>${owned ? 'Acquired' : choiceLevel !== TIER2_MAX_LEVEL ? `Requires rank ${TIER2_MAX_LEVEL}` : isFreeUltimate(ultimate.id) ? 'Free Ultimate' : `Ultimate · ${ULTIMATE_COST} Flux`}</small></button></div>` : ''}</div>`;
    }).join('')}</div>` : '';
    return `<article class="tree-node ${expanded ? 'expanded' : ''}"><button class="tree-node-head" data-tree-root="${root}"><span>${NODE_ICONS[root]} ${label}</span><small>Tier I · ${level} / ${TIER1_MAX_LEVEL}</small></button>${children}</article>`;
  }).join('')}</section>`).join('');
}
const rootLevelLocked = (level) => level === 0;
const isFreeUltimate = (id) => id === 'avariceEngine';
skillTree.addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button) return; if (button.dataset.treeRoot) treeState = { root:treeState.root === button.dataset.treeRoot ? null : button.dataset.treeRoot, choice:null, detailed:false }; else if (button.dataset.treeTier2) treeState = { ...treeState, choice:button.dataset.treeTier2 }; else if (button.dataset.treeDetail !== undefined) treeState = { ...treeState, detailed:!treeState.detailed }; else if (button.dataset.buyTier1 !== undefined) match.buy(treeState.root in match.players.human.tower ? 'tower' : 'mutation', treeState.root); else if (button.dataset.buyTier2) match.buyTier2(treeState.root, button.dataset.buyTier2); else if (button.dataset.buyTier3) match.buyTier3(treeState.root, button.dataset.buyTier3); render(match.snapshot()); });
function renderActionDock(snapshot) {
  const player = snapshot.players.human, actions = [], owned = Object.values(player.tier3).flatMap((choices) => Object.entries(choices).filter(([,value]) => value).map(([id]) => id));
  if (player.tower.overdrive) actions.push(`<button data-action="overdrive" ${!running || player.overdriveCooldown > 0 ? 'disabled' : ''}>Surge Core ${player.overdriveCooldown > 0 ? `${Math.ceil(player.overdriveCooldown)} s` : 'Ready'}</button>`);
  for (const choice of TIER2_FAMILIES.overdrive) { const level = player.tier2.overdrive[choice.id], cooldown = player.activeCooldowns[choice.id] ?? 0; if (level) actions.push(`<button data-active="${choice.id}" ${!running || cooldown > 0 ? 'disabled' : ''}>${choice.label}${cooldown > 0 ? ` · ${Math.ceil(cooldown)} s` : ''}</button>`); }
  if (owned.includes('commandOverride')) actions.push(`<div class="action-group"><span>Command Override · ${player.priorityMode}</span><button data-priority="default">Default</button><button data-priority="veteran">Veteran</button><button data-priority="lowest">Lowest HP</button><button data-priority="highest">Highest HP</button><button data-priority="manual">Manual</button></div>`);
  if (owned.includes('bioforgeProgram')) actions.push(`<div class="action-group"><span>Bioforge Program · next Incursion</span><button data-bioforge="chimera">Chimera · 90</button><button data-bioforge="abomination">Abomination · 180</button><button data-bioforge="hp">+20% HP · 55</button><button data-bioforge="armor">+2 Armor · 55</button><button data-bioforge="speed">+15% Speed · 55</button></div>`);
  for (const id of ['signalCorruption','nullifyingPurge','orbitalBreach','conjunctionSpheres']) if (owned.includes(id)) { const label=Object.values(TIER3_FAMILIES).flat().find((choice)=>choice.id===id).label, cooldown=player.ultimateCooldowns[id]??0, disabled=!running||cooldown>0; if (id==='nullifyingPurge'||id==='orbitalBreach') actions.push(`<button data-aim-ultimate="${id}" ${disabled?'disabled':''}>${label}${cooldown?` · ${Math.ceil(cooldown)} s`:' · aim on map'}</button>`); else if(id==='conjunctionSpheres') actions.push(`<button data-ultimate="${id}" data-side="left" ${disabled?'disabled':''}>${label}${cooldown?` · ${Math.ceil(cooldown)} s`:' · left zone'}</button><button data-ultimate="${id}" data-side="right" ${disabled?'disabled':''}>Conjunction · right zone</button>`); else actions.push(`<button data-ultimate="${id}" ${disabled?'disabled':''}>${label}${cooldown?` · ${Math.ceil(cooldown)} s`:''}</button>`); }
  actionDock.innerHTML = `<h2>Active abilities</h2>${actions.length ? actions.join('') : '<p class="muted">Unlock Surge Core or an active Ultimate.</p>'}`;
}
actionDock.addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button || !running) return; if (button.dataset.action === 'overdrive') match.activateOverdrive(); else if (button.dataset.active) match.activateTier2('overdrive', button.dataset.active); else if (button.dataset.priority) match.setPriority(button.dataset.priority); else if (button.dataset.bioforge) match.buyBioforgeContract(button.dataset.bioforge); else if (button.dataset.aimUltimate) { pendingUltimateTarget=button.dataset.aimUltimate; status.textContent=`${button.textContent.split(' · ')[0]}: click a point in your Killzone.`; } else if (button.dataset.ultimate) match.activateUltimate(button.dataset.ultimate,.5,button.dataset.side ?? 'left'); render(match.snapshot()); });
let snapshotTime = 0;
let latestSnapshot = null;
function render(snapshot) {
  latestSnapshot = snapshot; snapshotTime = snapshot.time; context.clearRect(0, 0, canvas.width, canvas.height); drawArenaBackground();
  const human = snapshot.players.human, bot = snapshot.players.bot, reconLevel = human.tier2.rewardFloor.recon, opponentView = mapView === 'bot' && mode.value === 'versus', viewedPlayer = opponentView ? bot : human, viewedSide = opponentView ? 'bot' : 'human', visible = !opponentView || reconLevel >= TIER2_MAX_LEVEL;
  context.fillStyle = '#a4b8dd'; context.font = '600 11px system-ui'; context.textAlign = 'center'; context.fillText(opponentView ? 'Opponent sector' : 'Your killzone highlighted', canvas.width / 2, 92);
  drawSide(viewedPlayer, viewedSide, opponentView ? '#9a93ff' : '#70e5cf', visible); if (opponentView && !visible) drawFogOverlay(reconLevel, bot); if (visible) drawCritFloats(snapshot);
  document.querySelector('#clock').textContent = `${String(Math.floor(snapshot.time / 60)).padStart(2, '0')}:${String(Math.floor(snapshot.time % 60)).padStart(2, '0')}`;
  document.querySelector('#incursion').textContent = `${snapshot.wave} / ${snapshot.maxWaves}`;
  document.querySelector('#incursion-next').textContent = `${snapshot.nextIncursionIn.toFixed(1)} s`;
  document.querySelector('#energy').textContent = String(human.energy); document.querySelector('#overload').textContent = `${human.load} / ${human.overloadCap}`; document.querySelector('#bot-overload').textContent = `${bot.load} / ${bot.overloadCap}`;
  for (const [id, player] of Object.entries({ human, bot })) { const earned = document.querySelector(`#${id}-earned`), interest = document.querySelector(`#${id}-interest`), avarice = document.querySelector(`#${id}-avarice`), next = document.querySelector(`#${id}-interest-next`); if (earned) earned.textContent = String(player.earnedEnergy); if (interest) interest.textContent = String(player.interestEnergy); if (avarice) avarice.textContent = String(player.avariceEnergy); if (next) next.textContent = `${player.nextInterestIn.toFixed(1)} s · +${Math.floor(player.nextInterestEstimate)}`; }
  document.querySelector('#human-interest-rate').textContent = `${(human.interestRate * 100).toFixed(2)}% / 6s`;
  document.querySelector('#combat-damage').textContent = human.combat.damage.join('–'); document.querySelector('#combat-speed').textContent = `${human.combat.attackRate.toFixed(2)} / s`; document.querySelector('#combat-crit').textContent = `${(human.combat.criticalChance * 100).toFixed(1)}%`; document.querySelector('#combat-multiplier').textContent = typeof human.combat.criticalMultiplier === 'number' ? `${human.combat.criticalMultiplier}×` : human.combat.criticalMultiplier;
  const versus = mode.value === 'versus'; document.querySelectorAll('[data-bot-strain]').forEach((element) => { element.hidden = !versus || reconLevel < 1; }); document.querySelectorAll('[data-bot-economy]').forEach((element) => { element.hidden = !versus || reconLevel < TIER2_MAX_LEVEL; }); mapButtons.forEach((button) => { const selected = button.dataset.mapView === mapView; button.setAttribute('aria-pressed', String(selected)); button.disabled = button.dataset.mapView === 'bot' && !versus; }); portraitMap.disabled = !versus; portraitMap.textContent = opponentView ? 'Your fortress' : 'Opponent';
  document.querySelector('#portrait-flux').textContent = String(human.energy); document.querySelector('#portrait-wave').textContent = `W${snapshot.wave}${snapshot.wave % 5 === 0 ? ' · BOSS' : ''}`; document.querySelector('#portrait-prices').textContent = `T1 ${human.nextTier1Cost ?? 'MAX'} · T2 ${human.nextTier2Cost ?? 'MAX'} · T3 ${ULTIMATE_COST}`; document.querySelector('#tree-prices').textContent = `T1 ${human.nextTier1Cost === 0 ? 'free' : human.nextTier1Cost ?? 'MAX'} · T2 ${human.nextTier2Cost ?? 'MAX'}`; const portraitTempo = document.querySelector('#portrait-tempo'); portraitTempo.disabled = !running || !human.tempoCharge || human.tempoQueued; portraitTempo.textContent = human.tempoQueued ? 'Tempo queued' : human.tempoCharge ? 'Tempo ready' : 'Tempo';
  status.textContent = snapshot.message;
  document.querySelector('#tier1-price').textContent = `Tier I — next upgrade: ${human.nextTier1Cost === null ? 'MAX' : human.nextTier1Cost === 0 ? 'free' : human.nextTier1Cost}`;
  document.querySelector('#tier2-price').textContent = `Tier II — next upgrade: ${human.nextTier2Cost === null ? 'MAX' : human.nextTier2Cost}`;
  const topBranch = (root) => ['damage','attackSpeed','crit'].includes(root) ? 'offense' : ['armor','speed','maxHp'].includes(root) ? 'mutation' : 'utility';
  document.querySelectorAll('.upgrade').forEach((button) => { const levels = button.dataset.branch === 'tower' ? human.tower : human.mutations; const level = levels[button.dataset.node]; const range = button.dataset.node === 'damage' ? ` · ${damageRange(level).join('–')}` : ''; const selected = Object.entries(levels).filter(([root,value]) => topBranch(root) === topBranch(button.dataset.node) && value > 0).length; const familyLocked = level === 0 && selected >= 2; button.querySelector('small').textContent = `${level} / ${TIER1_MAX_LEVEL}${range}`; button.title = familyLocked ? 'Two Tier I families are already committed in this branch.' : button.dataset.node === 'damage' ? `Damage per round: ${damageRange(level).join('–')}` : ''; button.disabled = !running || level >= TIER1_MAX_LEVEL || familyLocked || human.nextTier1Cost === null; });
  document.querySelectorAll('.tier2').forEach((button) => { const root = button.dataset.root; const choice = button.dataset.choice; const level = human.tier2[root][choice]; const selected = Object.values(human.tier2[root]).filter((value) => value > 0).length; const rootLevel = root in human.tower ? human.tower[root] : human.mutations[root]; const unlocked = rootLevel > 0; const locked = level === 0 && selected >= 2; button.querySelector('em').textContent = `${level} / ${TIER2_MAX_LEVEL}`; button.disabled = !running || !unlocked || locked || level >= TIER2_MAX_LEVEL || human.nextTier2Cost === null; button.title = !unlocked ? 'Requires Tier I rank 1 in its matching family.' : locked ? 'The third Tier II choice locks after two selections.' : ''; });
  document.querySelectorAll('.tier3').forEach((button) => { const root = button.dataset.root; const choice = button.dataset.ultimate; const index = TIER3_FAMILIES[root].findIndex((entry) => entry.id === choice); const parent = TIER2_FAMILIES[root][index].id; const unlocked = human.tier2[root][parent] === TIER2_MAX_LEVEL; const branchTaken = Object.entries(human.tier3).some(([candidate, choices]) => topBranch(candidate) === topBranch(root) && Object.values(choices).some(Boolean)); const owned = human.tier3[root][choice] > 0; const free = choice === 'avariceEngine'; button.querySelector('em').textContent = owned ? 'Acquired' : !unlocked ? `${TIER2_FAMILIES[root][index].label} rank ${TIER2_MAX_LEVEL} required` : branchTaken ? 'Another Ultimate locks this branch' : free ? 'Free Ultimate' : `${ULTIMATE_COST} Flux`; button.disabled = !running || owned || !unlocked || branchTaken || (!free && human.energy < ULTIMATE_COST); });
  overdrive.disabled = !running || !human.tower.overdrive || human.overdriveCooldown > 0; overdriveNote.textContent = !human.tower.overdrive ? 'Unlock Surge Core to activate it for 4 seconds.' : human.overdriveRemaining > 0 ? `Active for ${human.overdriveRemaining.toFixed(1)} more seconds.` : human.overdriveCooldown > 0 ? `Cooldown: ${Math.ceil(human.overdriveCooldown)} s.` : 'Ready: activate for 4 seconds.';
  tempo.disabled = !running || !human.tempoCharge || human.tempoQueued; tempo.textContent = human.tempoQueued ? 'Tempo Charge queued' : human.tempoCharge ? 'Release Tempo Charge' : 'Tempo Charge unavailable'; tempoNote.textContent = human.tempoQueued ? 'Queued: the bot’s next Incursion launches after its current deployment.' : human.tempoCharge ? 'Stored: release it to accelerate the bot’s next Incursion.' : 'Clear your field after an Incursion deployment to earn one charge.';
  document.querySelectorAll('.ability').forEach((button) => { const level = human.tier2.overdrive[button.dataset.choice]; const cooldown = human.activeCooldowns[button.dataset.choice] ?? 0; button.disabled = !running || !level || cooldown > 0; button.textContent = !level ? `${TIER2_FAMILIES.overdrive.find((entry) => entry.id === button.dataset.choice).label} — locked` : cooldown > 0 ? `${TIER2_FAMILIES.overdrive.find((entry) => entry.id === button.dataset.choice).label} — ${Math.ceil(cooldown)} s` : `${TIER2_FAMILIES.overdrive.find((entry) => entry.id === button.dataset.choice).label}`; });
  document.querySelectorAll('.ultimate').forEach((button) => { const id = button.dataset.ultimateActive; const owned = Object.values(human.tier3).some((choices) => choices[id]); const cooldown = human.ultimateCooldowns?.[id] ?? 0; const label = Object.values(TIER3_FAMILIES).flat().find((entry) => entry.id === id).label; button.disabled = !running || !owned || cooldown > 0; button.textContent = !owned ? `${label} — locked` : cooldown > 0 ? `${label} — ${Math.ceil(cooldown)} s` : label; });
  recon.hidden = !versus || !reconLevel; if (versus && reconLevel) { const roots = [...Object.entries(bot.tower).filter(([, value]) => value).map(([id, value]) => `${id} L${value}`), ...Object.entries(bot.mutations).filter(([, value]) => value).map(([id, value]) => `${id} L${value}`)].join(', ') || 'none'; const specializations = Object.entries(bot.tier2).map(([root, choices]) => `${root}: ${Object.entries(choices).filter(([, value]) => value).map(([id, value]) => `${id} L${value}`).join(', ') || 'none'}`).join(' | '); const ultimates = Object.values(bot.tier3).flatMap((choices) => Object.entries(choices).filter(([, value]) => value).map(([id]) => id)).join(', ') || 'none'; const composition = bot.creeps.reduce((memo, creep) => { memo[creep.form] = (memo[creep.form] ?? 0) + 1; return memo; }, {}); const compositionText = Object.entries(composition).map(([form, count]) => `${form} ×${count}`).join(', ') || 'no active Kethra'; const cooldowns = [...Object.entries(bot.activeCooldowns).map(([id, value]) => `${id} ${Math.ceil(value)}s`), ...Object.entries(bot.ultimateCooldowns).map(([id, value]) => `${id} ${Math.ceil(value)}s`)].join(' · '); recon.innerHTML = `<h3>Spectral Relay rank ${reconLevel}</h3><p>Bot Core Strain: ${bot.load}/${bot.overloadCap}</p><p>${bot.purchaseLog.map((entry) => entry.label).join(' · ') || 'The bot has not purchased yet.'}</p>${reconLevel >= 2 ? `<p>Tier I: ${roots}</p>` : ''}${reconLevel >= 3 ? `<p>Tier II: ${specializations}</p>` : ''}${reconLevel >= 4 ? `<p>Live composition: ${compositionText}</p><p>Cooldown telemetry: ${cooldowns}</p>` : ''}${reconLevel >= TIER2_MAX_LEVEL ? `<p>Ultimates: ${ultimates}</p>` : ''}`; }
  renderSkillTree(snapshot); renderActionDock(snapshot);
  result.hidden = !snapshot.result; result.textContent = snapshot.result ?? '';
}
function frame(now) { if (running) { const elapsed = previous ? (now - previous) / 1000 : 0; match.step(elapsed); const snapshot = match.snapshot(); if (snapshot.result) running = false; render(snapshot); } previous = now; requestAnimationFrame(frame); }
setModeUi(); render(match.snapshot()); requestAnimationFrame(frame);
