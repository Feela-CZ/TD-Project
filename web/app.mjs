import { BOT_PROFILES, LiveMatch, TIER2_MAX_LEVEL, TIER2_FAMILIES, TIER3_FAMILIES, killFluxForCreep, visualLaneForCreep } from '../dist/live.mjs';
import { createTouchUi } from './touch-ui.mjs';
import { createUpgradePanel } from './upgrade-panel.mjs';
import { createArenaArt } from './arena-art.mjs';
import { createTurretMotion, FORTRESS } from './turret-motion.mjs';

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
const recon = document.querySelector('#recon');
const mapNav = document.querySelector('#map-nav');
const swipeMap = document.querySelector('#swipe-map');
const actionDock = document.querySelector('#action-dock');
const portraitMap = document.querySelector('#portrait-map');
const createMatch = () => new LiveMatch(undefined, mode.value === 'solo' ? { botEnabled: false, soloProgression: true } : { botProfile:botProfile.value });
let match = createMatch();
let running = false;
let previous = 0;
let mapView = 'human';
let swipeStart = null;
let pendingUltimateTarget = null;
const NODE_ICONS = Object.freeze({ damage:'◉', attackSpeed:'≋', crit:'⌖', armor:'⬡', speed:'↟', maxHp:'◍', interest:'◌', rewardFloor:'▣', overdrive:'⚡' });
const NODE_INFO = Object.freeze({
  damage: ['Raises innate Round damage by 5% per rank, up to +45%.', 'Every permanent upgrade across all branches also adds 1 damage. Fortress output shows the current combined range; hit-specific effects apply afterwards.'],
  attackSpeed: ['Raises the fortress firing rate from 1.00 to 1.60 rounds per second.', 'Cadence is the permanent firing-rate layer. Combat Rhythm and temporary effects then multiply this live value; the Output panel always shows the current result.'],
  crit: ['Builds the base critical chance from 0% to 30%.', 'Precision sets the basic chance for a Round to become critical. Tier II can add chance or improve its multiplier, so the live critical total is shown separately.'],
  armor: ['Gradually raises the armor inherited by every spawned Kethra.', 'Carapace is applied at spawning. Its nine ranks lead to the current approved maximum rather than creating a stronger end state.'],
  speed: ['Gradually raises the movement speed inherited by every spawned Kethra.', 'Kinesis affects future spawns. Its later specializations add temporary movement behaviour on top of the inherited base speed.'],
  maxHp: ['Gradually raises the health inherited by every spawned Kethra.', 'Vital Mass affects future spawns. It is the persistent health layer; Tier II can add healing, distribution, or evolution behaviours.'],
  interest: ['Raises the interest rate paid every six seconds.', 'Reserves compounds only Flux kept available. The economy panel shows the exact active rate and an estimate of the next tick, including relevant economic effects.'],
  rewardFloor: ['Raises the minimum Flux value of a Kethra after repeated laps.', 'Control Nexus protects late-lap rewards from dropping too low. It does not change the first-lap reward; its exact effect is reflected in the next kill reward.'],
  overdrive: ['Builds Surge Core from an initial multi-round burst to its approved full output.', 'Each rank improves the four-second Surge Core window. It remains an active ability with a long cooldown, not permanent free firing speed.']
});

function setMapView(view, snapshot = latestSnapshot ?? match.snapshot()) { if (view === 'bot' && mode.value === 'solo') return; mapView = view; render(snapshot); }
function setModeUi() { const solo = mode.value === 'solo'; botProfileLabel.hidden = solo; subtitle.textContent = solo ? 'Solo progression — clear Wave 60' : `You versus ${BOT_PROFILES[botProfile.value].label} bot`; mapNav.hidden = solo; if (solo) mapView = 'human'; }
function resetMatch(active = false) {
  match = createMatch();
  running = active;
  start.disabled = active;
  pendingUltimateTarget = null;
  swipeStart = null;
  mapView = 'human';
  upgradePanel.reset();
  for (const motion of Object.values(turrets)) motion.reset();
  render(match.snapshot());
}
mode.addEventListener('change', () => { setModeUi(); resetMatch(); });
botProfile.addEventListener('change', () => { if (mode.value === 'versus') { setModeUi(); resetMatch(); } });
start.addEventListener('click', () => { running = true; start.disabled = true; render(match.snapshot()); });
restart.addEventListener('click', () => resetMatch(true));
document.querySelector('#portrait-tempo').addEventListener('click', () => { if (!running) return; match.activateTempoCharge(); render(match.snapshot()); });
portraitMap.addEventListener('click', () => setMapView(mapView === 'human' ? 'bot' : 'human'));
canvas.addEventListener('pointerdown', (event) => { swipeStart = { x:event.clientX, y:event.clientY }; });
canvas.addEventListener('pointerup', (event) => { if (!swipeStart) return; const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y; const rect = canvas.getBoundingClientRect(), x = (event.clientX - rect.left) * canvas.width / rect.width, y = (event.clientY - rect.top) * canvas.height / rect.height; swipeStart = null; if (swipeMap.checked && mode.value === 'versus' && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) { setMapView(dx < 0 ? 'bot' : 'human'); return; } if (mapView === 'human' && pendingUltimateTarget) { const player = (latestSnapshot ?? match.snapshot()).players.human; const nearest = player.creeps.map((creep) => ({ creep, point:formationPoint(creep.progress, 'human', creep.id) })).sort((a,b) => Math.hypot(a.point.x-x,a.point.y-y)-Math.hypot(b.point.x-x,b.point.y-y))[0]; match.activateUltimate(pendingUltimateTarget, nearest?.creep.progress ?? .5); pendingUltimateTarget = null; render(match.snapshot()); return; } if (mapView === 'human' && (latestSnapshot ?? match.snapshot()).players.human.priorityMode === 'manual') { const player = (latestSnapshot ?? match.snapshot()).players.human; const nearest = player.creeps.map((creep) => ({ creep, point:formationPoint(creep.progress, 'human', creep.id) })).sort((a,b) => Math.hypot(a.point.x-x,a.point.y-y)-Math.hypot(b.point.x-x,b.point.y-y))[0]; if (nearest && Math.hypot(nearest.point.x-x,nearest.point.y-y) < 24) { match.setManualTarget(nearest.creep.id); render(match.snapshot()); return; } } if (mapView === 'human' && Math.hypot(dx, dy) < 12 && Math.hypot(x - FORTRESS.x, y - FORTRESS.y) < 58) upgradePanel.open(); });
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
  const tower = FORTRESS;
  arenaArt.drawTrack(snapshotTime, color, visible ? player.killzoneCoverage : .3);
  if (player.conjunctionUntil > snapshotTime && player.conjunctionZone) { context.strokeStyle = '#d9bcff88'; context.lineWidth = 28; context.lineCap = 'round'; context.beginPath(); for (let p = player.conjunctionZone.start; p <= player.conjunctionZone.end + .001; p += .01) { const point = routePoint(Math.min(player.conjunctionZone.end,p), side); p > player.conjunctionZone.start ? context.lineTo(point.x,point.y) : context.moveTo(point.x,point.y); } context.stroke(); }
  for (const scar of player.breachScars.filter((scar) => !scar.remote && scar.end > snapshotTime)) { const point=routePoint(scar.progress,side), alpha=Math.min(1,(scar.end-snapshotTime)/.5); context.globalAlpha=alpha*.65; context.fillStyle='#ff7b57'; context.beginPath(); context.arc(point.x,point.y,23+Math.sin(snapshotTime*8)*3,0,Math.PI*2); context.fill(); context.globalAlpha=1; }
  for (const meteor of player.pendingMeteors) { const point=routePoint(meteor.progress,side); context.strokeStyle='#ffbd71'; context.setLineDash([3,4]); context.lineWidth=2; context.beginPath(); context.arc(point.x,point.y,18,0,Math.PI*2); context.stroke(); context.setLineDash([]); }
  const points = new Map(visible ? player.creeps.map(creep => [creep.id, formationPoint(creep.progress, side, creep.id)]) : []);
  const motion = turrets[side];
  const pose = motion.update(snapshotTime, visible ? player.activeTargetId : null, visible ? player.projectiles : [], id => points.get(id), reduceMotion.matches);
  arenaArt.drawTower(tower, color, side === 'human' ? 'YOUR FORTRESS' : 'RIVAL FORTRESS', pose);
  if (!visible) return;
  for (const creep of player.creeps) { const point = points.get(creep.id); const hp = Math.max(0, creep.hp / creep.maxHp), radius=(creep.form?.includes('abomination')?18:creep.form?.includes('chimera')?12:creep.form==='fragment'?4:creep.form==='shard'?5:creep.form==='brood'?5:7)+(creep.boss?3:0); if (creep.slowUntil > snapshotTime) { context.strokeStyle = '#6ce5ff'; context.lineWidth = 2; context.shadowColor='#6ce5ff'; context.shadowBlur=8; context.beginPath(); context.arc(point.x, point.y + 5, radius+3, 0, Math.PI * 2); context.stroke(); context.shadowBlur=0; } if (creep.safeToken && creep.safeUntil > snapshotTime) { context.strokeStyle='#f7dc6f'; context.lineWidth=2; context.beginPath(); context.arc(point.x,point.y,radius+6,0,Math.PI*2); context.stroke(); } if (creep.chrysalisUntil > snapshotTime) { context.fillStyle='#c891ff77'; context.beginPath(); context.ellipse(point.x,point.y,radius+4,radius+8,0,0,Math.PI*2); context.fill(); } if (creep.burn) { context.fillStyle = '#ff8e46'; context.shadowColor='#ff5d3e'; context.shadowBlur=9; context.beginPath(); context.arc(point.x + radius*.7, point.y - radius, 3 + Math.sin(snapshotTime * 16 + creep.id), 0, Math.PI * 2); context.fill(); context.shadowBlur=0; } const baseColor = creep.boss?'#f3ad4f':creep.form?.includes('abomination')?'#b94c75':creep.form?.includes('chimera')?'#c47dff':creep.form==='fragment'?'#8bf2db':creepColor(creep, player); drawKethra(creep, point, radius, baseColor); context.fillStyle = '#081120'; context.fillRect(point.x - radius-1, point.y - radius - 9, (radius+1)*2, 3); context.fillStyle = hp > .35 ? '#77e6a0' : '#ff8a6d'; context.fillRect(point.x - radius-1, point.y - radius - 9, (radius+1)*2 * hp, 3); }
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
let actionRenderKey = '';
function renderActionDock(snapshot) {
  const player = snapshot.players.human, actions = [], owned = Object.values(player.tier3).flatMap((choices) => Object.entries(choices).filter(([,value]) => value).map(([id]) => id));
  const key=JSON.stringify([running,player.tower.overdrive,player.tier2.overdrive,owned,player.priorityMode,Math.ceil(player.overdriveCooldown),Object.entries(player.activeCooldowns).map(([k,v])=>[k,Math.ceil(v)]),Object.entries(player.ultimateCooldowns).map(([k,v])=>[k,Math.ceil(v)])]);
  if(key===actionRenderKey) return; actionRenderKey=key;
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
  latestSnapshot = snapshot; snapshotTime = snapshot.time; context.clearRect(0, 0, canvas.width, canvas.height); arenaArt.drawBackground();
  const human = snapshot.players.human, bot = snapshot.players.bot, reconLevel = human.tier2.rewardFloor.recon, opponentView = mapView === 'bot' && mode.value === 'versus', viewedPlayer = opponentView ? bot : human, viewedSide = opponentView ? 'bot' : 'human', visible = !opponentView || reconLevel >= TIER2_MAX_LEVEL;
  context.fillStyle = '#dcdbbc'; context.font = '600 11px system-ui'; context.textAlign = 'center'; context.fillText(opponentView ? 'Opponent sector' : 'Your firing sector', canvas.width / 2, 79);
  drawSide(viewedPlayer, viewedSide, opponentView ? '#c99ce4' : '#e8bb79', visible); if (opponentView && !visible) drawFogOverlay(reconLevel, bot); if (visible) drawCritFloats(snapshot);
  document.querySelector('#clock').textContent = `${String(Math.floor(snapshot.time / 60)).padStart(2, '0')}:${String(Math.floor(snapshot.time % 60)).padStart(2, '0')}`;
  document.querySelector('#incursion').textContent = `${snapshot.wave} / ${snapshot.maxWaves}`;
  document.querySelector('#incursion-next').textContent = `${snapshot.nextIncursionIn.toFixed(1)} s`;
  document.querySelector('#energy').textContent = String(human.energy); document.querySelector('#overload').textContent = `${human.load} / ${human.overloadCap}`; document.querySelector('#bot-overload').textContent = `${bot.load} / ${bot.overloadCap}`;
  for (const [id, player] of Object.entries({ human, bot })) { const earned = document.querySelector(`#${id}-earned`), interest = document.querySelector(`#${id}-interest`), avarice = document.querySelector(`#${id}-avarice`), next = document.querySelector(`#${id}-interest-next`); if (earned) earned.textContent = String(player.earnedEnergy); if (interest) interest.textContent = String(player.interestEnergy); if (avarice) avarice.textContent = String(player.avariceEnergy); if (next) next.textContent = `${player.nextInterestIn.toFixed(1)} s · +${Math.floor(player.nextInterestEstimate)}`; }
  document.querySelector('#human-interest-rate').textContent = `${(human.interestRate * 100).toFixed(2)}% / 6s`;
  document.querySelector('#combat-damage').textContent = human.combat.damage.join('–'); document.querySelector('#combat-speed').textContent = `${human.combat.attackRate.toFixed(2)} / s`; document.querySelector('#combat-crit').textContent = `${(human.combat.criticalChance * 100).toFixed(1)}%`; document.querySelector('#combat-multiplier').textContent = typeof human.combat.criticalMultiplier === 'number' ? `${human.combat.criticalMultiplier}×` : human.combat.criticalMultiplier;
  const versus = mode.value === 'versus'; document.querySelectorAll('[data-bot-strain]').forEach((element) => { element.hidden = !versus || reconLevel < 1; }); document.querySelectorAll('[data-bot-economy]').forEach((element) => { element.hidden = !versus || reconLevel < TIER2_MAX_LEVEL; }); portraitMap.disabled = !versus; portraitMap.textContent = opponentView ? 'Your fortress' : 'Opponent';
  document.querySelector('#portrait-flux').textContent = String(Math.floor(human.energy));
  document.querySelector('#portrait-wave').textContent = `W${snapshot.wave}${snapshot.wave % 5 === 0 ? ' · BOSS' : ''}`;
  const portraitTempo = document.querySelector('#portrait-tempo');
  portraitTempo.hidden = !versus;
  portraitTempo.disabled = !running || !human.tempoCharge || human.tempoQueued;
  portraitTempo.textContent = human.tempoQueued ? 'Tempo queued' : human.tempoCharge ? 'Tempo ready' : 'Tempo';
  status.textContent = running && snapshot.message === 'Ready. Start the match.' ? 'Match running.' : snapshot.message;
  recon.hidden = !versus || !reconLevel; if (versus && reconLevel) { const roots = [...Object.entries(bot.tower).filter(([, value]) => value).map(([id, value]) => `${id} L${value}`), ...Object.entries(bot.mutations).filter(([, value]) => value).map(([id, value]) => `${id} L${value}`)].join(', ') || 'none'; const specializations = Object.entries(bot.tier2).map(([root, choices]) => `${root}: ${Object.entries(choices).filter(([, value]) => value).map(([id, value]) => `${id} L${value}`).join(', ') || 'none'}`).join(' | '); const ultimates = Object.values(bot.tier3).flatMap((choices) => Object.entries(choices).filter(([, value]) => value).map(([id]) => id)).join(', ') || 'none'; const composition = bot.creeps.reduce((memo, creep) => { memo[creep.form] = (memo[creep.form] ?? 0) + 1; return memo; }, {}); const compositionText = Object.entries(composition).map(([form, count]) => `${form} ×${count}`).join(', ') || 'no active Kethra'; const cooldowns = [...Object.entries(bot.activeCooldowns).map(([id, value]) => `${id} ${Math.ceil(value)}s`), ...Object.entries(bot.ultimateCooldowns).map(([id, value]) => `${id} ${Math.ceil(value)}s`)].join(' · '); recon.innerHTML = `<h3>Spectral Relay rank ${reconLevel}</h3><p>Bot Core Strain: ${bot.load}/${bot.overloadCap}</p><p>${bot.purchaseLog.map((entry) => entry.label).join(' · ') || 'The bot has not purchased yet.'}</p>${reconLevel >= 2 ? `<p>Tier I: ${roots}</p>` : ''}${reconLevel >= 3 ? `<p>Tier II: ${specializations}</p>` : ''}${reconLevel >= 4 ? `<p>Live composition: ${compositionText}</p><p>Cooldown telemetry: ${cooldowns}</p>` : ''}${reconLevel >= TIER2_MAX_LEVEL ? `<p>Ultimates: ${ultimates}</p>` : ''}`; }
  upgradePanel.refresh(snapshot, running); renderActionDock(snapshot); touchUi.refresh(snapshot, versus);
  result.hidden = !snapshot.result; result.textContent = snapshot.result ?? '';
}
function frame(now) { if (running) { const elapsed = previous ? (now - previous) / 1000 : 0; match.step(elapsed); const snapshot = match.snapshot(); if (snapshot.result) running = false; render(snapshot); } previous = now; requestAnimationFrame(frame); }
const arenaArt = createArenaArt(context, canvas, routePoint);
const turrets = { human:createTurretMotion(), bot:createTurretMotion() };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const upgradePanel = createUpgradePanel({
  panel: document.querySelector('#upgrade-panel'),
  sheet: document.querySelector('#upgrade-sheet'),
  desktop: document.querySelector('.right-panel'),
  descriptions: NODE_INFO,
  icons: NODE_ICONS,
  purchase(tier, root, id) {
    if (tier === 1) match.buy(root in match.players.human.tower ? 'tower' : 'mutation', root);
    else if (tier === 2) match.buyTier2(root, id);
    else match.buyTier3(root, id);
    const snapshot = match.snapshot();
    render(snapshot);
    return snapshot.message;
  }
});
const touchUi = createTouchUi({ openUpgrades: upgradePanel.open, closeUpgrades: upgradePanel.close });
setModeUi(); render(match.snapshot()); requestAnimationFrame(frame);
