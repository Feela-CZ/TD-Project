// @ts-check

/** Tier-II catalogue. These values mirror DEC-TD-007's approved test baseline. */
export const TIER2_FAMILIES = Object.freeze({
  damage: Object.freeze([
    { id: 'multishot', label: 'Split Volley', kind: 'passive', detail: 'Independent chances for extra Rounds. Rank 1: 18% for one; rank 2: 22% / 6% for up to two; rank 3: 26% / 10% / 3% for up to three; rank 4: 30% / 14% / 6%; rank 5: 34% / 18% / 9%.' },
    { id: 'reaper', label: 'Reaper’s Gaze', kind: 'passive', detail: 'Ranks 1–5: +3% → +5% damage per 10% missing HP.' },
    { id: 'cryo', label: 'Bio-Tar Rounds', kind: 'passive', detail: 'Ranks 1–5 slow by 4% / 8% / 12% / 18% / 24% for 1 / 1.25 / 1.5 / 1.75 / 2 s. With Thermite, adds 1 / 1 / 2 / 2 / 3 burn ticks.' }
  ]),
  attackSpeed: Object.freeze([
    { id: 'requiem', label: 'Shrapnel Requiem', kind: 'passive', detail: 'Ranks 1–5 transfer 15% / 30% / 50% / 75% / 100% of final overkill. Only rank 5 can continue to a second Kethra; cooldown 2 s.' },
    { id: 'burn', label: 'Thermite Trace', kind: 'passive', detail: 'Three 0.5 s ticks, each dealing 3% / 6% / 9% / 12% / 16% of the triggering hit.' },
    { id: 'rhythm', label: 'Combat Rhythm', kind: 'passive', detail: '20 stacks; ranks 1–5 scale from +1.25% → +2% APS per stack.' }
  ]),
  crit: Object.freeze([
    { id: 'critChance', label: 'Deadeye Protocol', kind: 'passive', detail: 'Ranks 1–5: +4 / +8 / +13 / +18 / +24 critical percentage points.' },
    { id: 'critMultiplier', label: 'Terminal Vector', kind: 'passive', detail: 'Ranks 1–5 set critical multiplier to 2.2× / 2.4× / 2.6× / 2.8× / 3.0×.' },
    { id: 'staticCharge', label: 'Static Discharge', kind: 'passive', detail: 'On crit, jumps 2% / 2.75% / 3.5% / 4.25% / 5% of the track for 15% / 30% / 45% / 57% / 70% damage; reapplies hit effects.' }
  ]),
  armor: Object.freeze([
    { id: 'armorNet', label: 'Distributed Shell', kind: 'passive', detail: 'Ranks 1–5 redistribute 10% / 20% / 30% / 40% / 50% of final damage across Kethra in the Killzone. Each recipient takes at most 6% / 9% / 12% / 15% / 18% of max HP from one shared hit; the remainder is absorbed.' },
    { id: 'emergency', label: 'Failsafe Cocoon', kind: 'passive', detail: 'Once per lap, lethal damage has a 15% / 30% / 50% / 70% / 100% chance to leave the Kethra at 1 HP. It is then moved to the end of automatic target priority until it leaves the Killzone.' },
    { id: 'swarm', label: 'Swarm Synthesis', kind: 'passive', detail: 'Each independent group of four freshly spawned Kethra has a 6% / 7.5% / 9% / 10.5% / 12% chance to merge into a Kethra Chimera: combined stats, +10% HP, unchanged speed and Armor, and combined reward.' }
  ]),
  speed: Object.freeze([
    { id: 'inertial', label: 'Momentum Plating', kind: 'passive', detail: 'Current speed above the Kethra’s native speed grants 0.05% / 0.10% / 0.15% / 0.20% / 0.25% damage reduction per +1% speed, capped at 4% / 7% / 11% / 14% / 18%.' },
    { id: 'kinetic', label: 'Impact Dynamo', kind: 'passive', detail: 'After blocking 60 / 52 / 45 / 39 / 35 damage, gains +10% / 18% / 27% / 36% / 45% speed for 2 / 2.5 / 3 / 3.5 / 4 s.' },
    { id: 'phaseSkip', label: 'Phase Curl', kind: 'passive', detail: 'Every 3 s, a 0.5% / 1% / 1.5% / 2.25% / 3% chance to advance 1% / 2% / 3% / 4.5% / 6% of the track.' }
  ]),
  maxHp: Object.freeze([
    { id: 'reconstruction', label: 'Regrowth Node', kind: 'passive', detail: 'At each checkpoint, restores 3% / 6% / 10% / 14% / 18% of max HP.' },
    { id: 'biomass', label: 'Biomass Pool', kind: 'passive', detail: 'On death, distributes 3% / 6% / 10% / 13% / 16% of the dead Kethra’s max HP among allies in the Killzone.' },
    { id: 'homeostasis', label: 'Hive Equilibrium', kind: 'passive', detail: 'Equalizes the current HP ratio of Kethra in the Killzone every 8 / 6.5 / 5 / 4 / 3 seconds.' }
  ]),
  interest: Object.freeze([
    { id: 'echo', label: 'Echo Reserve', kind: 'passive', detail: 'Each purchase yields 3.5% of its value at every interest tick for 2 / 4 / 6 / 8 / 10 ticks.' },
    { id: 'battery', label: 'Flux Battery', kind: 'passive', detail: 'At ≥300 Flux, fires 1 / 1 / 2 / 2 / 3 extra Rounds at each interest tick. At ≥500 Flux, adds 0 / 1 / 1 / 2 / 2 more.' },
    { id: 'recovery', label: 'Excess Reclamation', kind: 'passive', detail: 'For every 30 accumulated overkill, reclaims 1 / 2 / 3 / 4 / 5 Flux.' }
  ]),
  rewardFloor: Object.freeze([
    { id: 'painTolerance', label: 'Pain Tolerance', kind: 'passive', detail: 'Raises Core Strain capacity to 110 / 125 / 140 / 160 / 180.' },
    { id: 'expandedField', label: 'Killzone Aperture', kind: 'passive', detail: 'Expands the Killzone to 31% / 33% / 35% / 38% / 40% of the track.' },
    { id: 'recon', label: 'Spectral Relay', kind: 'passive', detail: 'Rank 1: purchase and Core Strain alerts. Rank 2: Tier I. Rank 3: Tier II. Rank 4: live Kethra composition and active cooldowns. Rank 5: removes Fog of War, including live HP and full enemy tree.' }
  ]),
  overdrive: Object.freeze([
    { id: 'adrenaline', label: 'Adrenaline Surge', kind: 'active', detail: 'Opponent speed +30% / 37.5% / 45% / 52.5% / 60% for 3 / 3.25 / 3.5 / 3.75 / 4 s; CD 42 s.' },
    { id: 'salvo', label: 'Saturation Burst', kind: 'active', detail: 'Hit all Kethra in your Killzone for 125% / 131.25% / 137.5% / 143.75% / 150%; CD 48 s.' },
    { id: 'phaseShield', label: 'Phase Shift', kind: 'active', detail: 'Global miss chance 35% / 43.75% / 52.5% / 61.25% / 70% for 4 / 4.25 / 4.5 / 4.75 / 5 s; CD 60 s.' }
  ])
});

/** @param {string} root @param {string} choice */
export function tier2Choice(root, choice) { return TIER2_FAMILIES[root]?.find((entry) => entry.id === choice) ?? null; }
/** @param {string} root */
export function tier2Choices(root) { return TIER2_FAMILIES[root] ?? []; }
