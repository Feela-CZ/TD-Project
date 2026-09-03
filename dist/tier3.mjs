// @ts-check

/** Tier-III catalogue. Every entry requires Level 2 of its exact Tier-II parent. */
export const TIER3_FAMILIES = Object.freeze({
  damage: Object.freeze([
    { id: 'vectorReversal', label: 'Vector Reversal', kind: 'passive', detail: 'Split Volley extras target the foremost Kethra, then push them backwards.' },
    { id: 'cullingEdict', label: 'Culling Edict', kind: 'passive', detail: 'Physical Rounds gain an execute chance against damaged Kethra.' },
    { id: 'bioTarHalo', label: 'Bio-Tar Halo', kind: 'passive', detail: 'Bio-Tar impacts spread the slow through a local halo.' }
  ]),
  attackSpeed: Object.freeze([
    { id: 'funeralCircuit', label: 'Funeral Circuit', kind: 'passive', detail: 'Shrapnel Requiem gains its selected Offense companion.' },
    { id: 'thermalRupture', label: 'Thermal Rupture', kind: 'passive', detail: 'Thermite kills rupture and leave a burning field.' },
    { id: 'overclockProtocol', label: 'Overclock Protocol', kind: 'passive', detail: '3× cadence at 30% direct Round damage.' }
  ]),
  crit: Object.freeze([
    { id: 'focusCascade', label: 'Focus Cascade', kind: 'passive', detail: 'Every 20 critical hits release five critical Cascade Rounds.' },
    { id: 'entropyVector', label: 'Entropy Vector', kind: 'passive', detail: 'Critical hits roll between 3× and 10×.' },
    { id: 'arcStagger', label: 'Arc Stagger', kind: 'passive', detail: 'Static Discharge briefly staggers its targets.' }
  ]),
  armor: Object.freeze([
    { id: 'burdenMatrix', label: 'Burden Matrix', kind: 'passive', detail: 'Healthy carriers distribute damage and gain reduction.' },
    { id: 'chrysalisRebirth', label: 'Chrysalis Rebirth', kind: 'passive', detail: 'A saved Kethra cocoons, heals, then returns.' },
    { id: 'broodFracture', label: 'Brood Fracture', kind: 'passive', detail: 'A dead Chimera splits into four unrewarded Kethra.' }
  ]),
  speed: Object.freeze([
    { id: 'inertiaBuffer', label: 'Inertia Buffer', kind: 'passive', detail: 'Dynamic Armor lingers after speed falls.' },
    { id: 'pressureDrive', label: 'Pressure Drive', kind: 'passive', detail: 'Surviving physical hits build temporary Drive speed.' },
    { id: 'fractalBrood', label: 'Fractal Brood', kind: 'passive', detail: 'Eligible Kethra may split into rapid fragments.' }
  ]),
  maxHp: Object.freeze([
    { id: 'apexAscension', label: 'Apex Ascension', kind: 'passive', detail: 'Each lap grows the Kethra and its chosen companion stat.' },
    { id: 'scavengerInstinct', label: 'Scavenger Instinct', kind: 'passive', detail: 'Unused Biomass becomes a temporary reserve.' },
    { id: 'aberrantGenesis', label: 'Aberrant Genesis', kind: 'passive', detail: 'Ten Kethra may fuse into one Kethra Abomination.' }
  ]),
  interest: Object.freeze([
    { id: 'avariceEngine', label: 'Avarice Engine', kind: 'passive', detail: 'Free Ultimate: ordinary interest powers a bonus payout. It ramps from Wave 20 to full effect at Wave 40; at full power, every 20 Flux earned through ordinary interest adds 1 bonus Flux per tick, capped by the current wave.' },
    { id: 'bioforgeProgram', label: 'Bioforge Program', kind: 'purchase', detail: 'Buy one-use contracts for the next own Incursion.' },
    { id: 'capitalPunishment', label: 'Capital Punishment', kind: 'passive', detail: 'Every 100 permanently invested Flux gives +1% direct damage.' }
  ]),
  rewardFloor: Object.freeze([
    { id: 'redlineProtocol', label: 'Redline Protocol', kind: 'passive', detail: 'Each Core Strain above 80 grants +1% direct damage.' },
    { id: 'commandOverride', label: 'Command Override', kind: 'control', detail: 'Unlocks priority modes and manual target command.' },
    { id: 'signalCorruption', label: 'Signal Corruption', kind: 'active', detail: 'Poison target selection and issue one Safe token to each Kethra.' }
  ]),
  overdrive: Object.freeze([
    { id: 'nullifyingPurge', label: 'Nullifying Purge', kind: 'active', detail: 'Targeted own-map buff purge and 95% slow.' },
    { id: 'orbitalBreach', label: 'Orbital Breach', kind: 'active', detail: 'Meteor, Breach Scar, and selected companion modules.' },
    { id: 'conjunctionSpheres', label: 'Conjunction of Spheres', kind: 'active', detail: 'Create a temporary second defensive Killzone.' }
  ])
});

/** @param {string} root @param {string} choice */
export function tier3Choice(root, choice) { return TIER3_FAMILIES[root]?.find((entry) => entry.id === choice) ?? null; }
/** @param {string} root */
export function tier3Choices(root) { return TIER3_FAMILIES[root] ?? []; }
