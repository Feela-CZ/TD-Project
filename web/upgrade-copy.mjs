import { ORDNANCE_DAMAGE_PER_RANK, interestRate, tierValue } from '../dist/core.mjs';
import { ENTROPY_VECTOR_ODDS, TIER1_MAX_LEVEL, TIER2_MAX_LEVEL, TIER2_RANK_STATS, controlNexusRewardFloor } from '../dist/live.mjs';

const ranks = (count, row) => Array.from({ length: count }, (_, index) => [index + 1, ...row(index + 1)]);
const decimal = value => Number(value.toFixed(2));
const percent = value => decimal(value * 100) + '%';
const seconds = value => value + ' s';
const multiplier = value => decimal(value) + '×';
const flux = value => value + ' Flux';
const identity = value => value;

function basic(label, value, facts = []) {
  return { columns: ['Rank', label], rows: ranks(TIER1_MAX_LEVEL, rank => [value(rank)]), facts };
}

function specialization(id, columns, facts = []) {
  const stats = TIER2_RANK_STATS[id];
  return {
    columns: ['Rank', ...columns.map(([label]) => label)],
    rows: ranks(TIER2_MAX_LEVEL, rank => columns.map(([, format], index) => format(stats[index][rank]))),
    facts
  };
}

export const UPGRADE_DETAILS = {
  damage: basic('Base damage', rank => '+' + percent(rank * ORDNANCE_DAMAGE_PER_RANK), [
    ['Permanent upgrades', '+1 flat damage each']
  ]),
  attackSpeed: basic('Shots per second', rank => tierValue(rank, 1, 1.6, TIER1_MAX_LEVEL).toFixed(2)),
  crit: basic('Critical chance', rank => percent(tierValue(rank, 0, .30, TIER1_MAX_LEVEL))),
  armor: basic('Damage reduction', rank => percent(tierValue(rank, 0, .15, TIER1_MAX_LEVEL)), [['Applies to', 'New Kethra sent to the opponent']]),
  speed: basic('Movement speed', rank => '+' + percent(tierValue(rank, 0, .30, TIER1_MAX_LEVEL)), [['Applies to', 'New Kethra sent to the opponent']]),
  maxHp: basic('Base health', rank => '+' + percent(tierValue(rank, 0, .30, TIER1_MAX_LEVEL)), [['Applies to', 'New Kethra sent to the opponent']]),
  interest: basic('Interest per tick', rank => percent(interestRate(rank, .0025, .008)), [
    ['Interval', '6 s'], ['Fractional Flux', 'Carries over to later ticks']
  ]),
  rewardFloor: basic('Minimum reward', rank => flux(controlNexusRewardFloor(rank)), [
    ['Base minimum', '2 Flux'], ['Lap penalty', '25% per completed lap'], ['Fractional Flux', 'Carries over to later kills']
  ]),
  overdrive: {
    columns: ['Rank', 'Targets', 'Fire rate'],
    rows: ranks(TIER1_MAX_LEVEL, rank => [1 + Math.ceil(rank / 3), multiplier(1 + tierValue(rank, 0, 1.5, TIER1_MAX_LEVEL))]),
    facts: [['Duration', '4 s'], ['Cooldown', '120 s']]
  },
  multishot: {
    columns: ['Rank', '1st extra', '2nd extra', '3rd extra'],
    rows: ranks(TIER2_MAX_LEVEL, rank => {
      const chances = TIER2_RANK_STATS.multishot[0][rank];
      return [0, 1, 2].map(index => chances[index] ? percent(chances[index]) : '—');
    }),
    facts: [['Rolls', 'Independent chances per shot']]
  },
  reaper: specialization('reaper', [['Extra damage', value => '+' + percent(value)]], [['Per step', 'Each 10% of missing health']]),
  cryo: specialization('cryo', [['Slow', percent], ['Duration', seconds], ['Burn ticks¹', identity]], [['¹ With Thermite', 'Extra burn ticks']]),
  requiem: specialization('requiem', [['Overkill transferred', percent]], [['Cooldown', '2 s'], ['Rank 5', 'Can continue to a second target']]),
  burn: specialization('burn', [['Damage per tick', percent]], [['Ticks', '3 at 0.5 s intervals'], ['Based on', 'Damage dealt by the triggering hit']]),
  rhythm: specialization('rhythm', [['Fire rate per stack', value => '+' + percent(value)]], [['Stack limit', '20'], ['Expires after', 'More than 2 s without firing']]),
  critChance: specialization('critChance', [['Critical chance', value => '+' + decimal(value * 100) + ' pp']]),
  critMultiplier: specialization('critMultiplier', [['Critical damage', multiplier]]),
  staticCharge: specialization('staticCharge', [['Track range', percent], ['Arc damage', percent]], [['Trigger', 'Critical hit'], ['On impact', 'Reapplies hit effects']]),
  armorNet: specialization('armorNet', [['Damage shared', percent], ['Cap per ally', percent]], [['Recipients', 'Allies in the Killzone'], ['Cap based on', 'Each recipient’s maximum health. Excess is absorbed.']]),
  emergency: specialization('emergency', [['Survival chance', percent]], [['Trigger', 'Lethal damage, once per lap'], ['Survivor', '1 HP. Lower automatic priority until it leaves the Killzone.']]),
  swarm: specialization('swarm', [['Fusion chance', percent]], [['Group size', '4 newly spawned Kethra'], ['Chimera', 'Combined health and reward; +10% HP'], ['Speed and armor', 'Unchanged']]),
  inertial: specialization('inertial', [['Reduction per +1% speed', percent], ['Reduction cap', percent]], [['Speed baseline', 'The Kethra’s native speed']]),
  kinetic: specialization('kinetic', [['Damage blocked', identity], ['Speed bonus', value => '+' + percent(value)], ['Duration', seconds]]),
  phaseSkip: specialization('phaseSkip', [['Chance', percent], ['Track skipped', percent]], [['Roll interval', '3 s']]),
  reconstruction: specialization('reconstruction', [['Max HP restored', percent]], [['Trigger', 'Completing a lap']]),
  biomass: specialization('biomass', [['Max HP shared', percent]], [['Trigger', 'Death in the Killzone'], ['Recipients', 'Nearby allies in the Killzone']]),
  homeostasis: specialization('homeostasis', [['Interval', seconds]], [['Effect', 'Equalizes the health percentage of Kethra in the Killzone']]),
  echo: specialization('echo', [['Payouts per purchase', identity]], [['Each payout', '3.5% of the purchase price'], ['Interval', 'One per interest tick']]),
  battery: specialization('battery', [['At 300 Flux', identity], ['At 500 Flux¹', identity]], [['Count', 'Extra rounds per interest tick'], ['¹ At 500 Flux', 'Adds rounds to the 300 Flux payout']]),
  recovery: specialization('recovery', [['Flux per payout', identity]], [['Payout threshold', '30 accumulated overkill damage']]),
  painTolerance: specialization('painTolerance', [['Core strain capacity', identity]]),
  expandedField: specialization('expandedField', [['Track in range', percent]]),
  recon: {
    columns: ['Rank', 'Intel revealed'],
    rows: ranks(TIER2_MAX_LEVEL, rank => [[
      'Purchases and Core strain', 'Tier I upgrades', 'Tier II upgrades', 'Live unit mix and active cooldowns',
      'Live health and full tree; reveals the battlefield'
    ][rank - 1]])
  },
  adrenaline: specialization('adrenaline', [['Speed bonus', value => '+' + percent(value)], ['Duration', seconds]], [['Cooldown', '42 s']]),
  salvo: specialization('salvo', [['Shot damage', percent]], [['Targets', 'All enemies in range'], ['Cooldown', '48 s']]),
  phaseShield: specialization('phaseShield', [['Miss chance', percent], ['Duration', seconds]], [['Cooldown', '60 s']]),

  vectorReversal: { facts: [['Targets', 'Leading enemies hit by extra Split Volley rounds'], ['Pushback', '5% of the track'], ['Per-target cooldown', '4 s']] },
  cullingEdict: { facts: [['Base execute chance', '0.1%'], ['Bonus', '+0.1 pp per 10% missing HP after the hit'], ['Trigger', 'Direct physical hit']] },
  bioTarHalo: { facts: [['Direct slow', '36%'], ['Nearby slow', '24%'], ['Duration', '2 s'], ['Radius', '3% of the track']] },
  funeralCircuit: { facts: [['Precision companion', 'Lethal crits deal 1.5× damage after armor'], ['Overkill transfer', 'Requiem reaches up to 3 further targets with Precision']] },
  thermalRupture: { facts: [['Trigger', 'A direct hit kills a burning Kethra'], ['Nearby damage', '75% of a base shot'], ['Burning field', '3 s']] },
  overclockProtocol: { facts: [['Fire rate', '3×'], ['Direct damage', '30% per hit'], ['Combat Rhythm', 'One-third of the normal stack gain per shot']] },
  focusCascade: { facts: [['Trigger', '20 critical hits'], ['Critical rounds', '5'], ['Extra rounds', 'If fewer than five targets are available, the first takes the remaining damage']] },
  entropyVector: {
    columns: ['Multiplier', 'Chance'],
    rows: ENTROPY_VECTOR_ODDS.map(([value, chance]) => [multiplier(value), percent(chance)])
  },
  arcStagger: { facts: [['Target', 'Primary hit and the arc target'], ['Stop', '0.15 s, then gradual recovery'], ['Per-target cooldown', '2 s']] },
  burdenMatrix: { facts: [['Eligible carriers', 'Kethra at 25% health or more'], ['Below 25% health', '3% damage reduction per nearby carrier'], ['Reduction cap', '15%']] },
  chrysalisRebirth: { facts: [['Trigger', 'Failsafe Cocoon saves a Kethra'], ['Untargetable', '4 s'], ['Healing', 'Up to 40% health'], ['Shared cooldown', '20 s']] },
  broodFracture: { facts: [['Offspring', '4 at the site of the kill'], ['Completed laps', 'Inherited from the Chimera'], ['Kill reward', '0 Flux']] },
  inertiaBuffer: { facts: [['Peak reduction held', '4 s'], ['Fade', '1 s']] },
  pressureDrive: { facts: [['Each damaging hit', '+2.5% movement speed'], ['Duration', '2 s'], ['Stack limit', '10'], ['Minimum time between gains', '0.35 s']] },
  fractalBrood: { facts: [['Spawn chance', '12%'], ['Fragments', '2 or 3 faster units'], ['Health and reward', 'Split among the fragments']] },
  apexAscension: { facts: [['Health per lap', '+10%, up to 5 laps'], ['Carapace companion', '+0.6 armor each of those laps'], ['Kinesis companion', '+7.5% speed each of those laps']] },
  scavengerInstinct: { facts: [['Stored healing', 'Unused Biomass Pool at the death site'], ['Duration', '4 s'], ['Recipients', 'Injured Kethra passing nearby']] },
  aberrantGenesis: { facts: [['Health', '10 Kethra combined'], ['Movement speed', '85% of base'], ['Armor', '+3'], ['Regeneration', 'Inside the firing zone']] },
  avariceEngine: { facts: [['Starts at', 'Wave 20'], ['Full strength', 'Wave 40'], ['At full strength', '+1 Flux per tick per 20 Flux earned from ordinary interest'], ['Payout cap', 'Current wave number']] },
  bioforgeProgram: { facts: [['Unit contracts', 'Chimera or Abomination'], ['Stat contracts', 'Health, armor or speed'], ['Applies to', 'One eligible wave']] },
  capitalPunishment: { facts: [['Direct damage', '+1% per 100 Flux spent on permanent upgrades'], ['Cap', '+45%']] },
  redlineProtocol: { facts: [['Direct damage', '+1% per point of Core strain above 80'], ['At 90 strain', '+10%']] },
  commandOverride: { facts: [['Priority modes', 'Most laps, lowest health, highest health'], ['Manual', 'Select a specific enemy on the battlefield']] },
  signalCorruption: { facts: [['Duration', '6 s'], ['Targeting', 'Opponent switches targets when possible'], ['Protection', 'Each attacking Kethra can redirect one lethal hit to an ally'], ['Cooldown', '70 s']] },
  nullifyingPurge: { facts: [['Strips', 'Health, armor and speed bonuses in the target area'], ['Slow', '95% for 1.25 s'], ['Cooldown', '80 s']] },
  orbitalBreach: {
    columns: ['Rank', 'Ordnance', 'Cadence¹', 'Precision'],
    rows: [['1–3', '+20', '35%', '1.5×'], ['4–6', '+45', '50%', '1.75×'], ['7–9', '+75', '50% + 35%', '2×']],
    facts: [['First impact', 'After 0.65 s'], ['Base damage', '110 + 8 per maxed Tier II specialization'], ['¹ Cadence', 'Follow-up meteors as a fraction of the first impact'], ['Cooldown', '75 s']]
  },
  conjunctionSpheres: { facts: [['Sector', 'Choose the Breach or Loop Gate side'], ['Duration', '5 s'], ['Firing', 'Both sectors fire independently'], ['Cooldown', '90 s']] }
};

export const UPGRADE_EFFECTS = {
  damage: 'Each shot deals more damage.',
  attackSpeed: 'The cannon fires more often.',
  crit: 'More shots deal critical damage.',
  armor: 'New attacking Kethra take less damage.',
  speed: 'New attacking Kethra move faster.',
  maxHp: 'New attacking Kethra gain health.',
  interest: 'Earn interest on unspent Flux.',
  rewardFloor: 'Raises the minimum Flux earned from a kill.',
  overdrive: 'Temporarily fire faster and hit multiple targets.',
  multishot: 'Each shot can fire extra rounds.',
  reaper: 'Shots hit injured enemies harder.',
  cryo: 'Hits slow enemies.',
  requiem: 'Damage left over from a kill can hit another enemy.',
  burn: 'Hits set enemies on fire for extra damage.',
  rhythm: 'Keep firing to build up fire rate.',
  critChance: 'Critical hits happen more often.',
  critMultiplier: 'Critical hits deal more damage.',
  staticCharge: 'Critical hits can strike a nearby enemy too.',
  armorNet: 'Kethra share part of the damage they take.',
  emergency: 'A lethal hit can leave a Kethra alive at 1 health.',
  swarm: 'Groups of four Kethra can merge into a Chimera.',
  inertial: 'Kethra take less damage while moving faster than normal.',
  kinetic: 'Kethra speed up after blocking enough damage.',
  phaseSkip: 'Kethra sometimes jump ahead on the track.',
  reconstruction: 'Kethra heal when they complete a lap.',
  biomass: 'Dying Kethra heal nearby allies in the cannon’s firing zone.',
  homeostasis: 'Kethra in the firing zone periodically share health.',
  echo: 'Purchases pay back some Flux over several interest payouts.',
  battery: 'Saving enough Flux fires extra shots when interest pays out.',
  recovery: 'Damage left over from kills earns Flux.',
  painTolerance: 'Your fortress can handle more enemies before you lose.',
  expandedField: 'The cannon can hit enemies across more of the track.',
  recon: 'Reveal more of the bot’s upgrades and battlefield with each rank.',
  adrenaline: 'Speed up the Kethra attacking the bot for a few seconds.',
  salvo: 'Fire a powerful shot at every target in your cannon’s firing zone.',
  phaseShield: 'For a few seconds, the bot has a chance to miss shots.',
  vectorReversal: 'Extra Split Volley shots push the leading enemies back.',
  cullingEdict: 'Cannon shots can instantly kill injured enemies.',
  bioTarHalo: 'Bio-Tar shots also slow enemies near the one they hit.',
  funeralCircuit: 'Shrapnel Requiem gains a bonus based on your other Cannon upgrade.',
  thermalRupture: 'Killing a burning enemy sets the area around it on fire.',
  overclockProtocol: 'Fire three times as fast. Direct hits deal 30% of their usual damage.',
  focusCascade: 'Every 20 critical hits, fire five extra critical shots.',
  entropyVector: 'Each critical hit deals between 3× and 10× damage.',
  arcStagger: 'Static Discharge briefly interrupts enemies it hits.',
  burdenMatrix: 'Healthy Kethra shield injured allies by sharing their damage.',
  chrysalisRebirth: 'Kethra saved from a lethal hit form a cocoon and heal.',
  broodFracture: 'A dying Chimera splits into four Kethra that give no Flux.',
  inertiaBuffer: 'Kethra keep their Momentum Plating briefly after slowing down.',
  pressureDrive: 'Kethra temporarily speed up when they survive a cannon hit.',
  fractalBrood: 'Some Kethra split into smaller, faster enemies.',
  apexAscension: 'Kethra grow stronger each lap based on your other Mutation upgrade.',
  scavengerInstinct: 'Unused healing from Biomass Pool is saved for later.',
  aberrantGenesis: 'Ten Kethra can merge into an Abomination.',
  avariceEngine: 'Earn extra Flux from interest, starting at wave 20.',
  bioforgeProgram: 'Buy stronger units or stat bonuses for an upcoming wave against the bot.',
  capitalPunishment: 'Flux spent on permanent upgrades increases cannon damage.',
  redlineProtocol: 'Your cannon deals more damage above 80 Core strain.',
  commandOverride: 'Choose how the cannon picks a target, or select an enemy yourself.',
  signalCorruption: 'Disrupt the bot’s targeting and give your attacking Kethra temporary protection.',
  nullifyingPurge: 'Aim at the track to strip bonuses from enemies in that area and slow them.',
  orbitalBreach: 'Aim at the track to call down a meteor.',
  conjunctionSpheres: 'Temporarily open a second firing zone toward Breach or Loop Gate.'
};
