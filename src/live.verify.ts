// @ts-check
import assert from 'node:assert/strict';
import { LiveMatch, authoredCreepHp, damageRange, deadeyeChance, splitVolleyChance, splitVolleyChances, tier2Value, TIER1_MAX_LEVEL, TIER2_MAX_LEVEL, visualLaneForCreep } from './live.ts';
import { RULES, bossIncursionForWave, interestRate, killFluxForCreep } from './core.ts';

function advance(match, seconds) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 0.05) match.step(0.05);
}

const first = new LiveMatch(77);
const second = new LiveMatch(77);
const defaultConfigured = new LiveMatch(77, {});
advance(first, 0.05);
advance(second, 0.05);
advance(defaultConfigured, 0.05);
assert.deepEqual(first.snapshot(), second.snapshot(), 'same seed and inputs must reproduce the live match state');
assert.deepEqual(first.snapshot(), defaultConfigured.snapshot(), 'omitted and empty test-only balance config must preserve identical alpha state');
assert.equal(first.snapshot().players.human.creeps.length, 1, 'the live match must spawn the first paired creeps at t=0');
assert.equal(first.snapshot().players.bot.mutations.maxHp, 1, 'the deterministic bot must make its approved first purchase');
const aggressiveBot = new LiveMatch(77, { botProfile:'aggressive' });
advance(aggressiveBot, 0.05);
assert.equal(aggressiveBot.snapshot().players.bot.mutations.speed, 1, 'the aggressive bot profile must open with Kinesis pressure');
const economyBot = new LiveMatch(77, { botProfile:'economy' });
advance(economyBot, 0.05);
assert.equal(economyBot.snapshot().players.bot.mutations.maxHp, 1, 'the economy bot profile must retain a survivable opening');
const secondHumanFoundation = new LiveMatch(77, { botEnabled:false });
secondHumanFoundation.buyFor('bot', 'tower', 'damage');
assert.equal(secondHumanFoundation.snapshot().players.bot.tower.damage, 1, 'the shared match core must accept an explicit second-player purchase');
assert.deepEqual(damageRange(TIER1_MAX_LEVEL), [35, 44], 'Ordnance rank 9 must raise the innate base Round range by its declared percentage');
assert.equal(authoredCreepHp(30), 379, 'the live client must share approved +11 wave HP scaling');
assert.deepEqual([1, 11, 21, 31, 41, 51].map((wave) => killFluxForCreep(wave, 0)), [8, 9, 11, 13, 16, 20], 'first-lap kill Flux must use the approved whole-number wave bands');
assert.deepEqual([0, 1, 2, 3].map((lap) => killFluxForCreep(1, lap)), [8, 6, 4, 3], 'early Kethra rewards must decay proportionally by completed lap');
assert.deepEqual([0, 1, 2, 3].map((lap) => killFluxForCreep(60, lap)), [20, 15, 11, 8], 'late Kethra rewards must lose meaningful Flux on every completed lap');
assert.deepEqual(
  Array.from({ length: TIER1_MAX_LEVEL + 1 }, (_, rank) => killFluxForCreep(60, 99, rank)),
  [2, 3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5],
  'every Control Nexus rank must improve the late-lap reward floor'
);
assert.deepEqual(bossIncursionForWave(5), { id: 'carapace', label: 'Carapace', armor: 1, speed: 0, hp: 0 }, 'Wave 5 must begin the Boss Incursion rotation with Carapace');
assert.deepEqual(bossIncursionForWave(60), { id: 'apex-prime', label: 'Apex Prime', armor: 4, speed: .25, hp: .40 }, 'Wave 60 must carry the final combined Boss Incursion profile');
const liveTotals = first.snapshot();
assert.ok(liveTotals.nextIncursionIn > 44.9 && liveTotals.nextIncursionIn <= 45, 'the client snapshot must expose a countdown to the next Incursion');
first.players.human.tower.damage = TIER1_MAX_LEVEL; first.players.human.tower.attackSpeed = TIER1_MAX_LEVEL; first.players.human.tower.crit = TIER1_MAX_LEVEL;
const maxTotals = first.snapshot().players.human.combat;
assert.deepEqual(maxTotals.damage, [62, 71], 'the client snapshot must add one Round damage for every permanent Tier-I upgrade');
assert.equal(maxTotals.attackRate, 1.6, 'the client snapshot must expose final permanent attack speed for the PC HUD');
assert.equal(maxTotals.criticalChance, .3, 'the client snapshot must expose final permanent critical chance for the PC HUD');
first.players.human.tower.damage = 0; first.players.human.tower.attackSpeed = 0; first.players.human.tower.crit = 0;
first.players.human.mutations.armor = 1;
first.players.human.tier2.damage.multishot = 1;
first.players.human.tier3.damage.vectorReversal = 1;
assert.deepEqual(first.snapshot().players.human.combat.damage, [27, 33], 'every permanent Tier-I, Tier-II, and Ultimate purchase in any family must add one Round damage');
first.players.human.mutations.armor = 0;
first.players.human.tier2.damage.multishot = 0;
first.players.human.tier3.damage.vectorReversal = 0;
assert.deepEqual([0, 1, 2, 3, 4, 5].map((rank) => tier2Value(rank, .03, .05)), [0, .03, .035, .04, .045, .05], 'generic Tier-II values must be inert at rank 0 and span their exact declared range across ranks 1–5');
assert.deepEqual([0, 1, 2, 3, 4, 5].map(splitVolleyChance), [0, .18, .22, .26, .30, .34], 'Split Volley must expose the primary extra-Round chance at every rank');
assert.deepEqual(splitVolleyChances(5), [.34, .18, .09], 'Split Volley rank 5 must independently roll up to three extra Rounds');
assert.deepEqual([0, 1, 2, 3, 4, 5].map(deadeyeChance), [0, .04, .08, .13, .18, .24], 'Deadeye Protocol must use its explicit five-rank critical-chance curve');
for (const [rank, expected] of [[0, 0], [1, .04], [2, .08], [3, .13], [4, .18], [5, .24]]) {
  first.players.human.tier2.crit.critChance = rank;
  assert.equal(first.snapshot().players.human.combat.criticalChance, expected, `Deadeye Protocol rank ${rank} must expose its declared critical chance`);
}

const bossWave = new LiveMatch(78, { botEnabled: false });
bossWave.time = 180; bossWave.step(.05);
const waveFiveKethra = bossWave.snapshot().players.human.creeps.find((creep) => creep.wave === 5);
assert.equal(waveFiveKethra?.boss, 'carapace', 'every fifth-wave Kethra must expose its Boss Incursion identity to the client');
assert.equal(waveFiveKethra?.traits.armor, 1, 'the Carapace Boss Incursion must add one armor above the base Kethra');

const beforeVisualLane = first.snapshot();
assert.deepEqual([1, 2, 3].map(visualLaneForCreep), [0, 1, -1], 'visual lanes must be a stable three-lane id mapping');
for (const creep of beforeVisualLane.players.human.creeps) visualLaneForCreep(creep.id);
assert.deepEqual(first.snapshot(), beforeVisualLane, 'deriving visual lanes must not alter live game state');

first.buy('tower', 'damage');
assert.equal(first.snapshot().players.human.tower.damage, 1, 'a valid human purchase must be applied');
first.buy('tower', 'damage');
assert.equal(first.snapshot().players.human.tower.damage, 2, 'a sequential upgrade level must be purchasable');
for (let level = 3; level <= TIER1_MAX_LEVEL; level += 1) { first.players.human.energy = 5000; first.buy('tower', 'damage'); }
assert.equal(first.snapshot().players.human.tower.damage, TIER1_MAX_LEVEL, 'Tier I must reach its new nine-rank maximum');
first.buy('tower', 'damage');
assert.equal(first.snapshot().players.human.tower.damage, TIER1_MAX_LEVEL, 'a purchase beyond the Tier I maximum must be safely rejected');

const tierTree = new LiveMatch(91);
advance(tierTree, 0.05);
tierTree.buy('tower', 'damage');
tierTree.players.human.energy = 2000;
tierTree.buy('tower', 'attackSpeed');
tierTree.buy('tower', 'crit');
assert.equal(tierTree.snapshot().players.human.tower.crit, 0, 'the third Tier-I family in Offense must lock after two commitments');
tierTree.buyTier2('interest', 'echo');
assert.equal(tierTree.snapshot().players.human.tier2.interest.echo, 0, 'three Tier-I purchases alone must not unlock a Tier-II family without its matching Tier-I L1');
tierTree.buyTier2('damage', 'multishot');
tierTree.buyTier2('damage', 'reaper');
assert.equal(tierTree.snapshot().players.human.tier2.damage.multishot, 1, 'Tier-II must unlock with the matching Tier-I rank');
assert.equal(tierTree.snapshot().players.human.tier2.damage.reaper, 1, 'a second Tier-II choice must be purchasable');
tierTree.buyTier2('damage', 'cryo');
assert.equal(tierTree.snapshot().players.human.tier2.damage.cryo, 0, 'the third Tier-II choice must lock after two selections');

const ultimateTree = new LiveMatch(88);
advance(ultimateTree, 0.05);
ultimateTree.buy('tower', 'damage');
ultimateTree.players.human.energy = 5000;
for (let level = 1; level <= TIER2_MAX_LEVEL; level += 1) ultimateTree.buyTier2('damage', 'multishot');
ultimateTree.buyTier3('damage', 'vectorReversal');
assert.equal(ultimateTree.snapshot().players.human.tier3.damage.vectorReversal, 1, 'the exact Tier-II rank 5 must unlock its matching Ultimate');
for (let level = 1; level <= TIER2_MAX_LEVEL; level += 1) ultimateTree.buyTier2('damage', 'reaper');
ultimateTree.buyTier3('damage', 'cullingEdict');
assert.equal(ultimateTree.snapshot().players.human.tier3.damage.cullingEdict, 0, 'one acquired Ultimate must lock all other Ultimates in its top-level branch');

const echo = new LiveMatch(92);
advance(echo, 0.05);
echo.buy('tower', 'interest');
echo.players.human.energy = 1000;
echo.buy('tower', 'damage');
echo.buy('tower', 'attackSpeed');
echo.buyTier2('interest', 'echo');
assert.equal(echo.players.human.echoBuffer.length, 1, 'Capital Echo must include its own unlocking purchase from the next tick');

const avarice = new LiveMatch(93, { botEnabled: false });
advance(avarice, 0.05);
avarice.buy('tower', 'interest');
avarice.players.human.energy = 2000;
for (let level = 1; level <= TIER2_MAX_LEVEL; level += 1) avarice.buyTier2('interest', 'echo');
avarice.buyTier3('interest', 'avariceEngine');
assert.equal(avarice.snapshot().players.human.tier3.interest.avariceEngine, 1, 'Avarice Engine must be a free Ultimate unlocked by Echo Reserve rank 5');
avarice.players.human.interestEnergy = 150;
avarice.players.human.energy = 1000;
const avariceEarnedBeforeTick = avarice.players.human.earnedEnergy;
avarice.time = 5.99;
avarice.players.human.nextInterestAt = 6;
avarice.step(0.05);
const avariceState = avarice.snapshot().players.human;
assert.equal(avariceState.avariceEnergy, 0, 'Avarice Engine must wait for the late-wave ramp');
assert.ok(avariceState.interestEnergy > 150, 'Avarice Engine must resolve after the ordinary interest tick');
assert.ok(avariceState.earnedEnergy > avariceEarnedBeforeTick, 'ordinary interest must still credit the player');

avarice.players.human.interestEnergy = 10_000;
avarice.time = RULES.waveSeconds * 39 + 1;
avarice.players.human.nextInterestAt = avarice.time;
const lateBefore = avarice.snapshot().players.human;
avarice.step(0.05);
const lateAfter = avarice.snapshot().players.human;
assert.equal(lateAfter.avariceEnergy, 40, 'late Avarice must apply the cap for the current wave');
assert.ok(lateAfter.interestEnergy > lateBefore.interestEnergy, 'the ordinary-interest ledger must remain separate');
assert.ok(lateAfter.earnedEnergy >= lateBefore.earnedEnergy + 40, 'Avarice must be credited to earned Flux');

const tempo = new LiveMatch(101);
advance(tempo, 0.05);
tempo.waveSpawns.human[1] = 20;
tempo.players.human.creeps.forEach((creep) => { creep.hp = 0; });
tempo.step(0.05);
assert.equal(tempo.snapshot().players.human.tempoCharge, true, 'clearing a fully deployed field must store one Tempo Charge');
tempo.activateTempoCharge();
assert.equal(tempo.snapshot().players.human.tempoQueued, true, 'releasing Tempo Charge must queue the bot’s next Incursion');
tempo.waveSpawns.bot[1] = 20;
tempo.step(0.05);
assert.ok(tempo.waveSpawns.bot[2] >= 1, 'the queued bot Incursion must begin as soon as its current deployment completes');
assert.equal(tempo.waveSpawns.human[2], 0, 'Tempo Charge must not add an extra Incursion to the player’s field');

const tracking = new LiveMatch(108, { botEnabled: false });
advance(tracking, .05);
tracking.waveSpawns.human[1] = RULES.creepsPerWave;
const tracker = tracking.players.human;
const lead = tracker.creeps[0];
Object.assign(lead, { progress: .48, hp: 1000, maxHp: 1000, baseSpeed: 0 });
const challenger = structuredClone(lead);
Object.assign(challenger, { id: 2, progress: .41 });
tracker.creeps.push(challenger);
tracker.tower.attackSpeed = 1;
tracker.tier2.attackSpeed.rhythm = 5;
const standingRate = tracking.snapshot().players.human.combat.attackRate;

function nextTrackingShot() {
  const fired = tracker.shots;
  for (let i = 0; i < 40 && tracker.shots === fired; i++) tracking.step(.05);
  assert.ok(tracker.shots > fired, 'the cannon must fire at an eligible target');
  return tracker.projectiles.at(-1).targetId;
}

assert.equal(nextTrackingShot(), lead.id, 'automatic targeting acquires the enemy nearest the sector center');
challenger.progress = .5;
assert.equal(nextTrackingShot(), lead.id, 'a new enemy nearer the center cannot steal an eligible target');
assert.equal(tracker.rhythmStacks, 2, 'consecutive shots build Combat Rhythm');
lead.progress = .8;
assert.equal(nextTrackingShot(), challenger.id, 'leaving the sector ends the target lock');
assert.equal(tracker.rhythmStacks, 3, 'changing target while firing retains Combat Rhythm');
challenger.hp = 0;
lead.progress = .49;
assert.equal(nextTrackingShot(), lead.id, 'a killed enemy is replaced on the next shot');

const alternate = { ...structuredClone(lead), id: 3, progress: .51 };
tracker.creeps.push(alternate);
tracker.signalUntil = tracking.time + 6;
assert.equal(nextTrackingShot(), alternate.id, 'Signal Corruption can still force an alternate target');
assert.equal(nextTrackingShot(), lead.id, 'Signal Corruption still alternates valid targets');

lead.progress = alternate.progress = .8;
advance(tracking, 2.1);
assert.equal(tracking.snapshot().players.human.combat.attackRate, standingRate, 'expired rhythm must not inflate the HUD or next firing interval');
alternate.progress = .5;
assert.equal(nextTrackingShot(), alternate.id);
assert.equal(tracker.rhythmStacks, 1, 'firing after a break starts a new rhythm');

tracker.signalUntil = -Infinity;
tracker.tier3.rewardFloor.commandOverride = 1;
tracking.setPriority('manual');
lead.progress = .49;
tracking.setManualTarget(lead.id);
assert.equal(nextTrackingShot(), lead.id, 'manual targeting overrides the prior automatic target');

function staticFixture(seed, emergency = 0) {
  const match = new LiveMatch(seed); advance(match, 0.05);
  const player = match.players.human; const primary = player.creeps[0];
  Object.assign(primary, { progress: 0.5, hp: 1, maxHp: 1 }); primary.traits.emergency = emergency;
  const secondary = structuredClone(primary); Object.assign(secondary, { id: 2, progress: 0.51, hp: 100, maxHp: 100 }); secondary.traits.emergency = 0;
  player.creeps.push(secondary); player.tower.crit = 1; player.tier2.crit.staticCharge = 1; player.tier2.attackSpeed.rhythm = 1;
  match.random.next = () => 0; return { match, player, primary, secondary };
}
const rhythmStatic = staticFixture(98);
rhythmStatic.match.step(0.05);
assert.equal(rhythmStatic.player.rhythmStacks, 1, 'a guaranteed primary crit plus Static Discharge must add exactly one Combat Rhythm stack');
const emergencyStatic = staticFixture(99, 2);
emergencyStatic.match.step(0.05); advance(emergencyStatic.match, 0.3);
assert.equal(emergencyStatic.primary.hp, 1, 'Emergency L2 must save a lethal primary crit at 1 HP');
assert.ok(emergencyStatic.player.projectiles.some((projectile) => projectile.targetId === emergencyStatic.secondary.id), 'Emergency must not suppress Static Discharge on that saved lethal crit');
advance(emergencyStatic.match, 0.3);
assert.ok(emergencyStatic.secondary.hp < 100, 'the Static Discharge secondary hit must damage its valid second target');
assert.equal(emergencyStatic.player.rhythmStacks, 1, 'Static Discharge must not add Combat Rhythm even when its secondary can crit');
assert.equal(emergencyStatic.player.shots, 2, 'a forced crit Static discharge must not produce a further Static cascade');

const bioTarStatic = staticFixture(100);
bioTarStatic.player.tier2.damage.cryo = TIER2_MAX_LEVEL;
bioTarStatic.player.tier2.attackSpeed.burn = 1;
Object.assign(bioTarStatic.primary, { hp: 100, maxHp: 100 });
bioTarStatic.match.step(0.05); advance(bioTarStatic.match, 0.3);
assert.equal(bioTarStatic.primary.slow, .24, 'Bio-Tar rank 5 must apply its approved slow to the primary hit');
assert.equal(bioTarStatic.primary.burn.left, 6, 'Bio-Tar rank 5 must add three ticks to the three-tick Thermite trace');
advance(bioTarStatic.match, 0.3);
assert.equal(bioTarStatic.secondary.slow, .24, 'Static Discharge must apply Bio-Tar to the secondary target');
assert.ok(bioTarStatic.secondary.slowUntil > bioTarStatic.match.time + 1.65, 'the secondary Bio-Tar application must start a fresh full duration at impact');
assert.equal(bioTarStatic.secondary.burn.left, 6, 'Static Discharge must apply a fresh Bio-Tar-extended Thermite trace');

const terminalCreep = (wave) => ({ id: 1, hp: 1, maxHp: 1, progress: 0, baseSpeed: 0, completedLaps: 0, wave, weight: 1, traits: { homeostasis: 0, phaseSkip: 0 }, slowUntil: -Infinity, kineticUntil: -Infinity, adrenalineUntil: -Infinity });
const w60Win = new LiveMatch(93);
w60Win.nextSpawnIndex = 1200; w60Win.players.human.wave60Started = true; w60Win.players.bot.wave60Started = true; w60Win.players.bot.creeps = [terminalCreep(60)]; w60Win.step(0.05);
assert.match(w60Win.snapshot().result, /victory/, 'a single Wave-60 clear must win immediately');
const w60Draw = new LiveMatch(94);
w60Draw.nextSpawnIndex = 1200; w60Draw.players.human.wave60Started = true; w60Draw.players.bot.wave60Started = true; w60Draw.step(0.05);
assert.match(w60Draw.snapshot().result, /draw/, 'simultaneous Wave-60 clears must draw');
const w60Overload = new LiveMatch(95);
w60Overload.nextSpawnIndex = 1200; w60Overload.players.human.wave60Started = true; w60Overload.players.bot.creeps = Array.from({ length: 100 }, () => terminalCreep(59)); w60Overload.step(0.05);
assert.match(w60Overload.snapshot().result, /victory/, 'a Wave-60 clear must beat an opponent overload at the same timestamp');
const priorOverload = new LiveMatch(96);
priorOverload.nextSpawnIndex = 1199; priorOverload.players.human.creeps = Array.from({ length: 100 }, () => terminalCreep(59)); priorOverload.step(0.05);
assert.match(priorOverload.snapshot().result, /defeat/, 'an overload before Wave-60 clear must defeat that side');
const overloadDraw = new LiveMatch(97);
overloadDraw.nextSpawnIndex = 1199; overloadDraw.players.human.creeps = Array.from({ length: 100 }, () => terminalCreep(59)); overloadDraw.players.bot.creeps = Array.from({ length: 100 }, () => terminalCreep(59)); overloadDraw.step(0.05);
assert.match(overloadDraw.snapshot().result, /draw/, 'simultaneous overload without a Wave-60 clear must draw');
const frozenTerminal = overloadDraw.snapshot(); overloadDraw.step(1); assert.deepEqual(overloadDraw.snapshot(), frozenTerminal, 'no actions may occur after a terminal result');

const overdrive = new LiveMatch(8);
advance(overdrive, 0.05);
overdrive.buy('tower', 'overdrive');
overdrive.activateOverdrive();
assert.ok(overdrive.snapshot().players.human.overdriveRemaining > 0, 'an unlocked Overdrive must activate');

const multiProjectile = new LiveMatch(81);
advance(multiProjectile, 0.05);
multiProjectile.buy('tower', 'overdrive');
advance(multiProjectile, 20.9);
multiProjectile.activateOverdrive();
const shotsBeforeOverdrive = multiProjectile.snapshot().players.human.shots;
advance(multiProjectile, 1.5);
const multiProjectileState = multiProjectile.snapshot().players.human;
assert.ok(multiProjectileState.shots >= shotsBeforeOverdrive + 2, 'Overdrive L1 must launch multiple physical projectiles while multiple valid creeps are present');

function fluxFromFirstKill(multiplier) {
  const match = new LiveMatch(10, { botEnabled: false, killFluxMultiplier: multiplier });
  advance(match, 0.05);
  match.players.human.creeps[0].hp = 0;
  advance(match, 0.05);
  return match.snapshot().players.human.earnedEnergy;
}
assert.equal(fluxFromFirstKill(1), killFluxForCreep(1, 0), 'the default live reward must match the browser rules');
assert.equal(fluxFromFirstKill(2), fluxFromFirstKill(1) * 2, 'a simulation reward override must actually affect kill Flux');

function fourLateLapKills(rank) {
  const match = new LiveMatch(109, { botEnabled: false });
  advance(match, .05);
  const player = match.players.human;
  player.tower.rewardFloor = rank;
  const sample = player.creeps[0];
  player.creeps = Array.from({ length: 4 }, (_, index) =>
    ({ ...structuredClone(sample), id: index + 1, completedLaps: 99, hp: 0 }));
  advance(match, .05);
  return match.snapshot().players.human.earnedEnergy;
}
assert.deepEqual([7, 8, 9].map(fourLateLapKills), [18, 19, 20], 'fractional Nexus bonuses must carry through real kill payouts');

const economy = new LiveMatch(10);
advance(economy, 18.05);
const economyState = economy.snapshot().players.human;
assert.equal(economyState.interestEnergy, 1, 'at 0.25% on 150 Flux, the third fractional interest tick must pay a whole Flux');
assert.equal(economyState.earnedEnergy, 1, 'cumulative earned Flux must exclude starting Flux and retain whole numbers');
assert.ok(economyState.nextInterestIn > 5.9 && economyState.nextInterestIn <= 6, 'the next-interest countdown must reset after a tick');

const critical = new LiveMatch(11);
critical.players.human.tower.crit = 1;
critical.random.next = () => 0;
advance(critical, 21.4);
assert.ok(critical.snapshot().critFloats.some(float => float.rolledCritMultiplier === null), 'fixed crits use an unnumbered combat float');

for (const [roll, expected] of [[.1, 3], [.6, 4], [.8, 5], [.9, 6], [.95, 7], [.972, 8], [.985, 9], [.997, 10]]) {
  const match = new LiveMatch(12, { botEnabled: false });
  advance(match, .05);
  match.waveSpawns.human[1] = RULES.creepsPerWave;
  match.waveSpawns.bot[1] = RULES.creepsPerWave;
  const player = match.players.human;
  const target = player.creeps[0];
  Object.assign(target, { progress: .5, hp: 10000, maxHp: 10000, baseSpeed: 0 });
  player.tower.crit = 1;
  player.tier2.crit.critMultiplier = TIER2_MAX_LEVEL;
  player.tier3.crit.entropyVector = 1;
  const [baseDamage] = match.snapshot().players.human.combat.damage;
  const rolls = [0, roll, 0];
  match.random.next = () => rolls.shift() ?? 0;
  match.step(.05);
  assert.equal(player.projectiles[0].damage, baseDamage * expected, 'every Entropy Vector outcome must affect real damage');
  assert.equal(player.projectiles[0].rolledCritMultiplier, expected);
  advance(match, .3);
  assert.equal(target.hp, 10000 - baseDamage * expected);
  assert.equal(match.snapshot().critFloats[0].rolledCritMultiplier, expected, 'the float must retain the roll made when the projectile fired');
}

const projectile = new LiveMatch(9);
advance(projectile, 21.1);
assert.ok(projectile.snapshot().players.human.projectiles.length > 0, 'the tower must fire at a creep in the fixed sector');
advance(projectile, 0.1);
assert.ok(projectile.snapshot().players.human.projectiles.length > 0, 'the projectile must remain visible before its 0.25-second impact');
advance(projectile, 0.2);
assert.ok(projectile.snapshot().players.human.shots > 0, 'the live match must continue after delayed projectile resolution');

// The alpha intentionally retains the certified overload-prone balance. This
// accelerated check drives the ordinary 0.1-second game ticks, not a separate
// balance model, until it reaches the same clear terminal state the player sees.
const fullMatch = new LiveMatch(20260825);
advance(fullMatch, 0.05);
fullMatch.buy('mutation', 'maxHp');
fullMatch.buy('mutation', 'maxHp');
advance(fullMatch, 12 * 60);
const terminal = fullMatch.snapshot();
assert.ok(terminal.result === 'defeat — your fortress reached Core Strain' || terminal.result === 'victory — the bot reached Core Strain', 'a deterministic full match must reach a clear victory or defeat outcome');
assert.ok(terminal.time <= 12 * 60, 'the terminal result must occur within the reproducible full-match horizon');
fullMatch.restart();
const restarted = fullMatch.snapshot();
assert.equal(restarted.result, null, 'restart after a terminal state must clear the previous result');
assert.equal(restarted.time, 0, 'restart must reset the match clock');
assert.equal(restarted.players.human.energy, 150, 'restart must restore starting energy');
assert.equal(restarted.players.human.creeps.length, 0, 'restart must clear active creeps before the new match begins');
advance(fullMatch, 0.05);
assert.equal(fullMatch.snapshot().players.human.creeps.length, 1, 'the restarted match must start normally with its opening creep');

console.log('PASS: live alpha deterministic state, visual lanes, economy totals, interest countdown, physical multi-projectile Overdrive, Crit! float, sector firing, terminal outcome, and post-terminal restart verified.');
