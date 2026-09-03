// @ts-check

export { TIER2_FAMILIES, tier2Choice, tier2Choices } from './tier2.ts';
export { TIER3_FAMILIES, tier3Choice, tier3Choices } from './tier3.ts';

/** @typedef {{ damage: number, attackSpeed: number, crit: number, interest: number, rewardFloor: number, overdrive: number }} TowerLevels */
/** @typedef {{ armor: number, speed: number, maxHp: number }} MutationLevels */
/** @typedef {{ at: number, branch: 'tower' | 'mutation', node: string, level: number }} TimedPurchase */
/** @typedef {{ branch: 'tower' | 'mutation', node: string, level: number }} PlannedPurchase */
/** @typedef {{ id: string, label: string, tower: TowerLevels, mutations: MutationLevels, overdrivePolicy?: 'multi-target', purchases?: TimedPurchase[], purchasePlan?: PlannedPurchase[] }} Opening */
/** @typedef {{ waves?: number, durationSeconds?: number, seed?: number, snapshotInterval?: number, hpGrowthPerWave?: number }} RunOptions */

export const RULES = Object.freeze({
  startingEnergy: 150,
  waveSeconds: 45,
  creepsPerWave: 20,
  spawnWindowSeconds: 6,
  lapSeconds: 60,
  sectorStart: 0.35,
  sectorEnd: 0.65,
  projectileTravelSeconds: 0.25,
  retargetDelaySeconds: 0,
  overloadCap: 100,
  baseDamageMin: 24,
  baseDamageMax: 30,
  baseShotsPerSecond: 1,
  interestIntervalSeconds: 6,
  baseInterestRate: 0.0035
});

export const TIER1_MAX_LEVEL = 9;
export const TIER2_MAX_LEVEL = 5;
export const ORDNANCE_DAMAGE_PER_RANK = .05;
// Kill rewards deliberately use whole Flux. The bands raise late-game income
// without making the opening less legible or turning Reserves into the only
// viable source of progression.
export const KILL_FLUX_BY_WAVE_BAND = Object.freeze([8, 9, 11, 13, 16, 20]);
/** @param {number} level */
export function controlNexusRewardFloor(level) { return Math.min(5, 2 + Math.ceil(Math.max(0, level) / 3)); }
/** @param {number} wave */
export function baseKillFluxForWave(wave) { return KILL_FLUX_BY_WAVE_BAND[Math.min(KILL_FLUX_BY_WAVE_BAND.length - 1, Math.max(0, Math.floor((wave - 1) / 10)))]; }
/** @param {number} wave @param {number} completedLaps @param {number} [controlNexusLevel] */
export function killFluxForCreep(wave, completedLaps, controlNexusLevel = 0) {
  return Math.max(controlNexusRewardFloor(controlNexusLevel), Math.floor(baseKillFluxForWave(wave) * Math.pow(.75, Math.max(0, Math.floor(completedLaps)))));
}

// A Boss Incursion upgrades every natural Kethra in each fifth wave. It is a
// separate, temporary layer: future cards can extend it without changing the
// base Kethra or the permanent Mutation tree.
export const BOSS_INCURSION_PROFILES = Object.freeze([
  null,
  { id: 'carapace', label: 'Carapace', armor: 1, speed: 0, hp: 0 },
  { id: 'mobility', label: 'Mobility', armor: 0, speed: .10, hp: 0 },
  { id: 'vitality', label: 'Vitality', armor: 0, speed: 0, hp: .20 },
  { id: 'carapace-mobility', label: 'Carapace + Mobility', armor: 1, speed: .10, hp: 0 },
  { id: 'carapace-vitality', label: 'Carapace + Vitality', armor: 1, speed: 0, hp: .20 },
  { id: 'mobility-vitality', label: 'Mobility + Vitality', armor: 0, speed: .10, hp: .20 },
  { id: 'reinforced-mobility', label: 'Reinforced Mobility', armor: 2, speed: .15, hp: 0 },
  { id: 'reinforced-vitality', label: 'Reinforced Vitality', armor: 2, speed: 0, hp: .30 },
  { id: 'rapid-vitality', label: 'Rapid Vitality', armor: 0, speed: .15, hp: .30 },
  { id: 'apex', label: 'Apex', armor: 2, speed: .15, hp: .30 },
  { id: 'apex-reinforced', label: 'Apex Reinforced', armor: 3, speed: .20, hp: .35 },
  { id: 'apex-prime', label: 'Apex Prime', armor: 4, speed: .25, hp: .40 }
]);
/** @param {number} wave */
export function bossIncursionForWave(wave) {
  return wave > 0 && wave % 5 === 0 ? BOSS_INCURSION_PROFILES[Math.min(12, wave / 5)] : null;
}
/** @param {number} value @param {number} maximum */
export function tierProgress(value, maximum) { return Math.max(0, Math.min(maximum, value)) / maximum; }
/** @param {number} value @param {number} from @param {number} to @param {number} [maximum] */
export function tierValue(value, from, to, maximum = TIER2_MAX_LEVEL) { return from + (to - from) * tierProgress(value, maximum); }
/** Ordnance scales the innate Round, while every purchased permanent rank adds
 * flat damage separately in the live combat model. This prevents Ordnance from
 * multiplying the entire tree's progression. */
export function ordnanceMultiplier(level) { return 1 + Math.max(0, Math.min(TIER1_MAX_LEVEL, level)) * ORDNANCE_DAMAGE_PER_RANK; }
export const DAMAGE_RANGES = Object.freeze(Array.from({ length: TIER1_MAX_LEVEL + 1 }, (_, level) => [Math.round(RULES.baseDamageMin * ordnanceMultiplier(level)), Math.round(RULES.baseDamageMax * ordnanceMultiplier(level))]));
// Price is global inside a tier: every purchase consumes the next entry,
// regardless of branch or local level. Tier I starts with one free direction.
// Rebalanced alpha: early commitment remains meaningful, while a full two-family
// build can reach its late-game specialisations before the match is decided.
export const TIER1_PRICE_LADDER = Object.freeze(Array.from({ length: 80 }, (_, index) => index === 0 ? 0 : 20 + (index - 1) * 6));
export const TIER2_PRICE_LADDER = Object.freeze(Array.from({ length: 80 }, (_, index) => 60 + index * 8));
export const ROOT_LEVEL_COSTS = Object.freeze(Array.from({ length: TIER1_MAX_LEVEL + 1 }, (_, level) => level === 0 ? 0 : 20 + (level - 1) * 6));
/** @param {number} level */
export function damageRange(level) { return DAMAGE_RANGES[Math.max(0, Math.min(TIER1_MAX_LEVEL, level))]; }
/** @param {string | number | undefined} value */
export function parseHpGrowthArgument(value) {
  if (value === undefined) return 11;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error('--hp-growth must be a positive finite number.');
  return parsed;
}
/** @param {number} wave @param {number} [hpGrowthPerWave] */
export function authoredCreepHp(wave, hpGrowthPerWave = 11) { return 60 + parseHpGrowthArgument(hpGrowthPerWave) * (wave - 1); }

export const OPENINGS = Object.freeze([
  { id: 'none', label: 'Bez vylepseni', tower: levels(), mutations: mutations() },
  { id: 'damage-l1', label: 'Poskozeni L1', tower: levels({ damage: 1 }), mutations: mutations() },
  { id: 'attack-speed-l1', label: 'Rychlost utoku L1', tower: levels({ attackSpeed: 1 }), mutations: mutations() },
  { id: 'crit-l1', label: 'Kriticky zasah L1', tower: levels({ crit: 1 }), mutations: mutations() },
  { id: 'damage-l2', label: 'Poskozeni L2', tower: levels({ damage: 2 }), mutations: mutations() },
  { id: 'attack-speed-l2', label: 'Rychlost utoku L2', tower: levels({ attackSpeed: 2 }), mutations: mutations() },
  { id: 'crit-l2', label: 'Kriticky zasah L2', tower: levels({ crit: 2 }), mutations: mutations() },
  { id: 'offense-triple-l1', label: 'Tri ofenzivni L1', tower: levels({ damage: 1, attackSpeed: 1, crit: 1 }), mutations: mutations() },
  { id: 'interest-l1', label: 'Urokove otevreni L1', tower: levels({ interest: 1 }), mutations: mutations() },
  { id: 'interest-l2', label: 'Urokove otevreni L2', tower: levels({ interest: 2 }), mutations: mutations() },
  { id: 'overdrive-l1-policy', label: 'Overdrive L1 (multi-target politika)', tower: levels({ overdrive: 1 }), mutations: mutations(), overdrivePolicy: 'multi-target' },
  { id: 'mutation-hp-l1-counterbuild', label: 'Damage L1 proti HP mutaci L1', tower: levels({ damage: 1 }), mutations: mutations({ maxHp: 1 }) },
  { id: 'mutation-armor-l1-counterbuild', label: 'Damage L1 proti armor mutaci L1', tower: levels({ damage: 1 }), mutations: mutations({ armor: 1 }) },
  { id: 'mutation-speed-l1-counterbuild', label: 'Damage L1 proti speed mutaci L1', tower: levels({ damage: 1 }), mutations: mutations({ speed: 1 }) },
  {
    id: 'timed-offense-trajectory', label: 'Casovana ofenzivni trajektorie', tower: levels(), mutations: mutations(),
    purchases: [
      { at: 60, branch: 'tower', node: 'damage', level: 1 },
      { at: 120, branch: 'tower', node: 'attackSpeed', level: 1 },
      { at: 180, branch: 'tower', node: 'crit', level: 1 }
    ]
  },
  {
    id: 'timed-interest-trajectory', label: 'Urokova trajektorie do ofenzivy', tower: levels({ interest: 1 }), mutations: mutations(),
    purchases: [
      { at: 60, branch: 'tower', node: 'damage', level: 1 },
      { at: 120, branch: 'tower', node: 'attackSpeed', level: 1 },
      { at: 180, branch: 'tower', node: 'crit', level: 1 }
    ]
  },
  {
    id: 'full-spend-offense-damage-first', label: 'Plne utraceni: offense, Damage-first', tower: levels(), mutations: mutations(),
    purchasePlan: plan(['damage', 'attackSpeed', 'crit'], true)
  },
  {
    id: 'full-spend-offense-balanced', label: 'Plne utraceni: offense, vyvazene', tower: levels(), mutations: mutations(),
    purchasePlan: balancedPlan(['damage', 'attackSpeed', 'crit'])
  },
  {
    id: 'full-spend-damage-l2-then-offense', label: 'Plne utraceni: Damage L2, pak offense', tower: levels(), mutations: mutations(),
    purchasePlan: [purchase('damage', 1), purchase('damage', 2), ...balancedPlan(['attackSpeed', 'crit', 'damage']).filter((entry) => !(entry.node === 'damage' && entry.level < 3))]
  },
  {
    id: 'full-spend-interest-l1-then-offense', label: 'Plne utraceni: Urok L1, pak offense', tower: levels(), mutations: mutations(),
    purchasePlan: [purchase('interest', 1), ...balancedPlan(['damage', 'attackSpeed', 'crit'])]
  }
]);

function levels(partial = {}) {
  return { damage: 0, attackSpeed: 0, crit: 0, interest: 0, rewardFloor: 0, overdrive: 0, ...partial };
}
function mutations(partial = {}) { return { armor: 0, speed: 0, maxHp: 0, ...partial }; }
/** @param {string} node @param {number} level */
function purchase(node, level) { return { branch: 'tower', node, level }; }
/** @param {string[]} nodes @param {boolean} [byNode] */
function plan(nodes, byNode = false) {
  return byNode ? nodes.flatMap((node) => Array.from({ length: TIER1_MAX_LEVEL }, (_, index) => purchase(node, index + 1))) : balancedPlan(nodes);
}
/** @param {string[]} nodes */
function balancedPlan(nodes) { return Array.from({ length: TIER1_MAX_LEVEL }, (_, index) => index + 1).flatMap((level) => nodes.map((node) => purchase(node, level))); }

export class SeededRandom {
  /** @param {number} seed */
  constructor(seed) { this.state = seed >>> 0; }
  next() {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  /** @param {number} minimum @param {number} maximum */
  integer(minimum, maximum) { return minimum + Math.floor(this.next() * (maximum - minimum + 1)); }
}

/** @param {Opening} opening */
export function openingCost(opening) {
  const totalLevels = Object.values(opening.tower).reduce((sum, level) => sum + levelCost(level), 0)
    + Object.values(opening.mutations).reduce((sum, level) => sum + levelCost(level), 0);
  return totalLevels;
}
/** Every L1/L2/L3 is an incremental 100/200/300-energy purchase. @param {number} level */
export function levelCost(level) { return ROOT_LEVEL_COSTS[level] ?? Infinity; }

/** @param {Opening} opening @param {RunOptions} [options] */
export function simulateRun(opening, options = {}) {
  const waves = options.waves ?? 30;
  const duration = options.durationSeconds ?? waves * RULES.waveSeconds;
  const snapshotInterval = options.snapshotInterval ?? 10;
  const random = new SeededRandom(options.seed ?? 1);
  const hpGrowthPerWave = parseHpGrowthArgument(options.hpGrowthPerWave);
  const cost = openingCost(opening);
  if (cost > RULES.startingEnergy) throw new Error(`${opening.id} costs ${cost}, exceeding starting energy.`);

  /** @type {{ id: number, hp: number, progress: number, speed: number, armor: number, completedLaps: number, wave: number }[]} */
  const creeps = [];
  /** @type {{ targetId: number, impactAt: number, damage: number, crit: boolean, overdrive: boolean }[]} */
  const projectiles = [];
  const state = {
    time: 0, energy: RULES.startingEnergy - cost, activeTargetId: null, nextReadyAt: 0,
    tower: { ...opening.tower }, mutations: { ...opening.mutations }, purchaseIndex: 0, purchasePlanIndex: 0,
    spawnIndex: 0, nextInterestAt: RULES.interestIntervalSeconds, nextSnapshotAt: 0,
    killed: 0, rewardTotal: 0, killsByLap: /** @type {Record<string, number>} */ ({}), overloadWave: null,
    snapshots: /** @type {{ time: number, activeCreeps: number, energy: number, kills: number }[]} */ ([]),
    purchases: /** @type {{ at: number, branch: string, node: string, level: number, status: 'purchased' | 'rejected' }[]} */ ([]),
    shots: 0, impacts: 0, overdriveShots: 0, overdriveImpacts: 0, overdriveFiringEvents: 0, overdriveTargetSlots: 0,
    overdriveActivations: 0, lastOverdriveAt: -Infinity, damageDealt: 0, overdriveDamageDealt: 0, interestTotal: 0
  };
  const spawnTotal = waves * RULES.creepsPerWave;
  const epsilon = 1e-9;

  const activeTarget = () => creeps.find((creep) => creep.id === state.activeTargetId && inSector(creep.progress));
  const chooseTarget = () => {
    const valid = creeps.filter((creep) => inSector(creep.progress));
    valid.sort((left, right) => Math.abs(left.progress - 0.5) - Math.abs(right.progress - 0.5) || left.id - right.id);
    state.activeTargetId = valid[0]?.id ?? null;
    return valid[0] ?? null;
  };
  const validTargets = () => creeps.filter((creep) => inSector(creep.progress)).sort((left, right) => Math.abs(left.progress - 0.5) - Math.abs(right.progress - 0.5) || left.id - right.id);
  const advance = (delta) => {
    if (delta <= 0) return;
    for (const creep of creeps) {
      const movement = creep.progress + creep.speed * delta;
      const loops = Math.floor(movement + epsilon);
      creep.progress = movement - loops;
      creep.completedLaps += loops;
    }
  };
  const spawn = () => {
    const wave = Math.floor(state.spawnIndex / RULES.creepsPerWave) + 1;
    const boss = bossIncursionForWave(wave);
    const authoredHp = authoredCreepHp(wave, hpGrowthPerWave);
    const hp = authoredHp * (1 + tierValue(state.mutations.maxHp, 0, .30, TIER1_MAX_LEVEL)) * (1 + (boss?.hp ?? 0));
    const speed = (1 + tierValue(state.mutations.speed, 0, .30, TIER1_MAX_LEVEL)) * (1 + (boss?.speed ?? 0)) / RULES.lapSeconds;
    const armor = tierValue(state.mutations.armor, 0, .15, TIER1_MAX_LEVEL) + (boss?.armor ?? 0) * .05;
    creeps.push({ id: state.spawnIndex + 1, hp, progress: 0, speed, armor, completedLaps: 0, wave });
    state.spawnIndex += 1;
    if (creeps.length >= RULES.overloadCap) state.overloadWave = wave;
  };
  const resolveImpacts = () => {
    for (let index = projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = projectiles[index];
      if (Math.abs(projectile.impactAt - state.time) > epsilon) continue;
      const target = creeps.find((creep) => creep.id === projectile.targetId);
      if (target) {
        const appliedDamage = projectile.damage * (1 - target.armor);
        target.hp -= appliedDamage;
        state.impacts += 1;
        state.damageDealt += appliedDamage;
        if (projectile.overdrive) {
          state.overdriveImpacts += 1;
          state.overdriveDamageDealt += appliedDamage;
        }
      }
      projectiles.splice(index, 1);
    }
    for (let index = creeps.length - 1; index >= 0; index -= 1) {
      const creep = creeps[index];
      if (creep.hp > 0) continue;
      const lap = creep.completedLaps + 1;
      const reward = killFluxForCreep(creep.wave, creep.completedLaps, state.tower.rewardFloor);
      state.energy += reward;
      state.rewardTotal += reward;
      state.killed += 1;
      state.killsByLap[String(lap)] = (state.killsByLap[String(lap)] ?? 0) + 1;
      if (state.activeTargetId === creep.id) state.activeTargetId = null;
      creeps.splice(index, 1);
    }
  };
  const fireWhenReady = () => {
    if (state.time + epsilon < state.nextReadyAt || state.overloadWave !== null) return;
    const target = activeTarget() ?? chooseTarget();
    if (!target) return;
    const readyForOverdrive = opening.overdrivePolicy === 'multi-target'
      && state.tower.overdrive > 0
      && state.time + epsilon >= state.lastOverdriveAt + 120
      && validTargets().length >= 1 + state.tower.overdrive;
    if (readyForOverdrive) {
      state.lastOverdriveAt = state.time;
      state.overdriveActivations += 1;
    }
    const overdrive = overdriveActive(state.tower.overdrive, state.lastOverdriveAt, state.time);
    const targets = overdrive.projectileCount > 1 ? validTargets().slice(0, overdrive.projectileCount) : [target];
    if (targets.length) state.activeTargetId = targets[0].id;
    if (overdrive.projectileCount > 1) {
      state.overdriveFiringEvents += 1;
      state.overdriveTargetSlots += overdrive.projectileCount;
    }
    for (const target of targets) {
      const [minimumDamage, maximumDamage] = damageRange(state.tower.damage);
      const baseDamage = random.integer(minimumDamage, maximumDamage);
      const crit = random.next() < tierValue(state.tower.crit, 0, .30, TIER1_MAX_LEVEL);
      const damage = baseDamage * (crit ? 2 : 1);
      projectiles.push({ targetId: target.id, impactAt: state.time + RULES.projectileTravelSeconds, damage, crit, overdrive: overdrive.projectileCount > 1 });
      state.shots += 1;
      if (overdrive.projectileCount > 1) state.overdriveShots += 1;
    }
    const attackRate = RULES.baseShotsPerSecond * (1 + tierValue(state.tower.attackSpeed, 0, .60, TIER1_MAX_LEVEL)) * overdrive.speedMultiplier;
    state.nextReadyAt = state.time + 1 / attackRate;
  };
  const snapshot = () => {
    state.snapshots.push({ time: round(state.time), activeCreeps: creeps.length, energy: round(state.energy), kills: state.killed });
  };

  while (state.time < duration - epsilon && state.overloadWave === null) {
    const nextSpawnAt = state.spawnIndex < spawnTotal ? spawnTime(state.spawnIndex) : Infinity;
    const nextImpactAt = projectiles.reduce((minimum, projectile) => Math.min(minimum, projectile.impactAt), Infinity);
    const nextBoundaryAt = creeps.reduce((minimum, creep) => Math.min(minimum, state.time + timeToSectorBoundary(creep)), Infinity);
    const nextPurchaseAt = opening.purchases?.[state.purchaseIndex]?.at ?? Infinity;
    // An idle tower is already ready, but must not schedule a zero-time "shot"
    // until a creep enters the sector. The sector-boundary event wakes it then.
    const nextShotAt = creeps.some((creep) => inSector(creep.progress)) ? state.nextReadyAt : Infinity;
    const nextTime = Math.min(nextSpawnAt, state.nextInterestAt, state.nextSnapshotAt, nextShotAt, nextImpactAt, nextBoundaryAt, nextPurchaseAt, duration);
    advance(nextTime - state.time);
    state.time = nextTime;
    while (state.spawnIndex < spawnTotal && Math.abs(spawnTime(state.spawnIndex) - state.time) <= epsilon) spawn();
    resolveImpacts();
    while (opening.purchases?.[state.purchaseIndex] && Math.abs(opening.purchases[state.purchaseIndex].at - state.time) <= epsilon) {
      const purchase = opening.purchases[state.purchaseIndex];
      const levelsForBranch = purchase.branch === 'tower' ? state.tower : state.mutations;
      const currentLevel = levelsForBranch[purchase.node] ?? -1;
      const price = levelCost(purchase.level);
      const allowed = currentLevel === purchase.level - 1 && state.energy + epsilon >= price;
      if (allowed) {
        levelsForBranch[purchase.node] = purchase.level;
        state.energy -= price;
      }
      state.purchases.push({ ...purchase, status: allowed ? 'purchased' : 'rejected' });
      state.purchaseIndex += 1;
    }
    if (Math.abs(state.nextInterestAt - state.time) <= epsilon) {
      const interest = state.energy * interestRate(state.tower.interest);
      state.energy += interest;
      state.interestTotal += interest;
      state.nextInterestAt += RULES.interestIntervalSeconds;
    }
    while (opening.purchasePlan?.[state.purchasePlanIndex]) {
      const purchase = opening.purchasePlan[state.purchasePlanIndex];
      const levelsForBranch = purchase.branch === 'tower' ? state.tower : state.mutations;
      const currentLevel = levelsForBranch[purchase.node] ?? -1;
      const price = levelCost(purchase.level);
      if (currentLevel !== purchase.level - 1 || state.energy + epsilon < price) break;
      levelsForBranch[purchase.node] = purchase.level;
      state.energy -= price;
      state.purchases.push({ at: round(state.time), ...purchase, status: 'purchased' });
      state.purchasePlanIndex += 1;
    }
    fireWhenReady();
    if (Math.abs(state.nextSnapshotAt - state.time) <= epsilon) {
      snapshot();
      state.nextSnapshotAt += snapshotInterval;
    }
  }
  return {
    opening: opening.id, seed: options.seed ?? 1, durationSeconds: duration, hpGrowthPerWave, killed: state.killed,
    activeCreeps: creeps.length, averageReward: state.killed ? state.rewardTotal / state.killed : 0,
    rewardTotal: state.rewardTotal, endingEnergy: state.energy, killsByLap: state.killsByLap,
    overloadWave: state.overloadWave, snapshots: state.snapshots, purchases: state.purchases,
    shots: state.shots, impacts: state.impacts, overdriveShots: state.overdriveShots, overdriveImpacts: state.overdriveImpacts,
    overdriveFiringEvents: state.overdriveFiringEvents, overdriveTargetSlots: state.overdriveTargetSlots, overdriveActivations: state.overdriveActivations,
    damageDealt: state.damageDealt, overdriveDamageDealt: state.overdriveDamageDealt, interestTotal: state.interestTotal,
    earnedEnergy: state.rewardTotal + state.interestTotal
  };
}

/** @param {number} index */
export function spawnTime(index) {
  const wave = Math.floor(index / RULES.creepsPerWave);
  const withinWave = index % RULES.creepsPerWave;
  return wave * RULES.waveSeconds + withinWave * RULES.spawnWindowSeconds / (RULES.creepsPerWave - 1);
}
/** @param {number} progress */
export function inSector(progress) { return progress >= RULES.sectorStart - 1e-9 && progress < RULES.sectorEnd - 1e-9; }
/** @param {{progress: number, speed: number}} creep */
export function timeToSectorBoundary(creep) {
  if (inSector(creep.progress)) return Math.max(0, (RULES.sectorEnd - creep.progress) / creep.speed);
  if (creep.progress < RULES.sectorStart) return (RULES.sectorStart - creep.progress) / creep.speed;
  return (1 + RULES.sectorStart - creep.progress) / creep.speed;
}
/** @param {number} level */
// Interest ticks every six seconds. These rates deliberately stay modest:
// kill Flux drives normal progression, while Reserves remains a patient,
// supporting economy rather than a compounding replacement for combat.
/**
 * Six-second interest rate. Reserves is deliberately front-loaded: its first
 * ranks create a real economic choice, while the cap prevents a 60-wave game
 * from turning retained Flux into an exponential auto-win.
 */
export function interestRate(level, base = 0.0025, cap = 0.008, curvePower = 1) {
  const progress = tierProgress(level, TIER1_MAX_LEVEL);
  return base + (cap - base) * (1 - Math.pow(1 - progress, curvePower));
}
/** @param {Opening} opening @param {number} time */
export function overdriveActive(level, lastOverdriveAt, time) {
  if (!level) return { projectileCount: 1, speedMultiplier: 1 };
  const elapsed = time - lastOverdriveAt;
  if (elapsed < 0 || elapsed >= 4) return { projectileCount: 1, speedMultiplier: 1 };
  return { projectileCount: 1 + Math.ceil(level / 3), speedMultiplier: 1 + tierValue(level, 0, 1.5, TIER1_MAX_LEVEL) };
}
/** @param {number} value */
function round(value) { return Number(value.toFixed(6)); }
