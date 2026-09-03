// @ts-check
import assert from 'node:assert/strict';
import { OPENINGS, RULES, SeededRandom, TIER1_MAX_LEVEL, authoredCreepHp, damageRange, parseHpGrowthArgument, simulateRun, spawnTime } from './core.mjs';

const baseline = OPENINGS.find((opening) => opening.id === 'none');
assert.ok(baseline, 'baseline opening must exist');

const first = simulateRun(baseline, { waves: 3, seed: 418 });
const second = simulateRun(baseline, { waves: 3, seed: 418 });
assert.deepEqual(first, second, 'identical seeds must reproduce an identical run');
assert.equal(spawnTime(0), 0, 'the first creep spawns at the first endpoint');
assert.equal(spawnTime(19), 6, 'the twentieth creep spawns at the second endpoint');
assert.equal(RULES.waveSeconds, 45, 'approved wave cadence must remain 45 seconds');
assert.equal(RULES.baseDamageMin, 24, 'approved base minimum damage must remain 24');
assert.equal(RULES.baseDamageMax, 30, 'approved base maximum damage must remain 30');
assert.deepEqual([0, TIER1_MAX_LEVEL].map(damageRange), [[24, 30], [35, 44]], 'nine-rank Ordnance must raise innate Round damage by its declared percentage');
assert.equal(authoredCreepHp(1), 60, 'wave 1 authored HP must remain 60');
assert.equal(authoredCreepHp(30), 379, 'wave 30 authored HP must use approved +11 scaling');
assert.equal(authoredCreepHp(30, 9), 321, 'a simulation-only +9 growth override must be isolated from the approved +11 default');
assert.equal(parseHpGrowthArgument('10.5'), 10.5, 'the simulation CLI must accept a positive finite decimal HP-growth override');
assert.throws(() => parseHpGrowthArgument('not-a-number'), /positive finite number/, 'the simulation CLI must reject invalid HP-growth input explicitly');
assert.throws(() => parseHpGrowthArgument('0'), /positive finite number/, 'the simulation CLI must reject non-positive HP-growth input explicitly');
assert.equal(RULES.projectileTravelSeconds, 0.25, 'approved projectile travel time must remain non-zero');
assert.equal(RULES.overloadCap, 100, 'approved overload cap must remain 100');
assert.equal(new SeededRandom(7).integer(24, 30), new SeededRandom(7).integer(24, 30), 'seeded damage must be stable');

const noCombat = simulateRun(baseline, { waves: 1, durationSeconds: 0.24, seed: 1 });
assert.equal(noCombat.impacts, 0, 'a projectile must not impact before 0.25 seconds');
// The first baseline creep reaches the sector at t=21.00; the first impact is
// therefore exactly t=21.25, not at sector entry.
const beforeFirstImpact = simulateRun(baseline, { waves: 1, durationSeconds: 21.24, seed: 1 });
assert.equal(beforeFirstImpact.impacts, 0, 'the first projectile must still be in flight at t=21.24');
const firstImpact = simulateRun(baseline, { waves: 1, durationSeconds: 21.25, seed: 1 });
assert.ok(firstImpact.impacts > 0, 'projectiles must impact 0.25 seconds after firing once a creep reaches the sector');

const overdrive = OPENINGS.find((opening) => opening.id === 'overdrive-l1-policy');
assert.ok(overdrive, 'Overdrive opening must exist');
// Compare equivalent seeded runs over a horizon contained in the four-second
// effect window. This observes the approved additional physical projectiles
// and attack-speed increase, rather than comparing one Overdrive-only hit
// against all baseline hits.
const baselineAtImpact = simulateRun(baseline, { waves: 1, durationSeconds: 25, seed: 91 });
const overdriveAtImpact = simulateRun(overdrive, { waves: 1, durationSeconds: 25, seed: 91 });
assert.ok(overdriveAtImpact.overdriveShots > 0, 'Overdrive must activate while a target is in the firing sector');
assert.ok(overdriveAtImpact.overdriveShots >= 2, 'Overdrive L1 must emit multiple normal physical projectiles when distinct targets are available');
assert.ok(overdriveAtImpact.overdriveImpacts > 0, 'Overdrive projectile must impact after its approved flight time');
assert.ok(overdriveAtImpact.overdriveActivations > 0, 'the Overdrive policy must wait for its multi-target condition and then activate');
assert.ok(overdriveAtImpact.overdriveTargetSlots >= overdriveAtImpact.overdriveShots, 'Overdrive efficacy must retain target-slot accounting');
assert.ok(overdriveAtImpact.damageDealt > baselineAtImpact.damageDealt, 'Overdrive must measurably increase total dealt damage against an equivalent baseline run');

const fullSpend = OPENINGS.find((opening) => opening.id === 'full-spend-offense-damage-first');
assert.ok(fullSpend, 'the required Damage-first full-spend trajectory must exist');
const fullSpendOpening = simulateRun(fullSpend, { waves: 1, durationSeconds: 0.1, seed: 2 });
assert.deepEqual(fullSpendOpening.purchases.slice(0, 2).map((purchase) => `${purchase.node} L${purchase.level}`), ['damage L1', 'damage L2'], 'full-spend plans must buy their next upgrades as soon as the starting energy allows');
assert.equal(simulateRun(baseline, { waves: 1, durationSeconds: 0.1 }).hpGrowthPerWave, 11, 'simulation output must retain the approved +11 default');
assert.equal(simulateRun(baseline, { waves: 1, durationSeconds: 0.1, hpGrowthPerWave: 10 }).hpGrowthPerWave, 10, 'simulation output must record a non-default HP-growth experiment');

console.log('PASS: deterministic core, DEC-TD-005 damage/HP ranges, full-spend trajectories, delayed projectiles, and cooldown-aware multi-target Overdrive verified.');
