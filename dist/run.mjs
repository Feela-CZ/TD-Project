// @ts-check
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { OPENINGS, RULES, parseHpGrowthArgument, simulateRun } from './core.mjs';

const argumentsByName = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [name, value] = argument.replace(/^--/, '').split('=');
  return [name, value ?? 'true'];
}));
const runs = integerArgument(argumentsByName.runs, 30);
const waves = integerArgument(argumentsByName.waves, 30);
const seed = integerArgument(argumentsByName.seed, 20260825);
const hpGrowthPerWave = parseHpGrowthArgument(argumentsByName['hp-growth']);
const output = resolve(process.cwd(), argumentsByName.output ?? 'results/latest');
const report = {
  generatedAt: new Date().toISOString(),
  command: `node dist/run.mjs --runs=${runs} --waves=${waves} --seed=${seed} --hp-growth=${hpGrowthPerWave}`,
  assumptions: {
    lapSeconds: RULES.lapSeconds, spawnWindowSeconds: RULES.spawnWindowSeconds,
    waveSeconds: RULES.waveSeconds, damageRanges: '24-30 / 31-39 / 38-48 / 45-57', authoredHp: `60 + ${hpGrowthPerWave} × (wave - 1)`, hpGrowthPerWave,
    spawnConvention: '20 creeps over 6 seconds, endpoints inclusive (6/19 seconds)',
    projectileTravelSeconds: RULES.projectileTravelSeconds, retargetDelaySeconds: RULES.retargetDelaySeconds,
    overloadBoundary: 'active creeps >= 100'
  },
  runs, waves, seed,
  scenarios: OPENINGS.map((opening, openingIndex) => summarize(opening, runs, waves, seed + openingIndex * 1000003, hpGrowthPerWave))
};
report.comparison = report.scenarios.map((scenario) => ({
  opening: scenario.opening, meanKills: scenario.mean.killed, meanEndingEnergy: scenario.mean.endingEnergy,
  overloadRate: scenario.overload.rate, meanOverloadWave: scenario.overload.meanWave
})).sort((left, right) => right.meanKills - left.meanKills || right.meanEndingEnergy - left.meanEndingEnergy);

await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'simulation-report.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(resolve(output, 'simulation-report.md'), markdown(report));
console.log(`Simulation report: ${resolve(output, 'simulation-report.json')}`);
console.log(`Human summary: ${resolve(output, 'simulation-report.md')}`);

function summarize(opening, count, waveCount, baseSeed, hpGrowth) {
  const results = Array.from({ length: count }, (_, index) => simulateRun(opening, { waves: waveCount, seed: baseSeed + index, hpGrowthPerWave: hpGrowth }));
  const snapshotTimes = results[0].snapshots.map((snapshot) => snapshot.time);
  return {
    opening: opening.id, label: opening.label, runs: count,
    mean: {
      killed: average(results.map((result) => result.killed)), activeCreeps: average(results.map((result) => result.activeCreeps)),
      averageReward: average(results.map((result) => result.averageReward)), endingEnergy: average(results.map((result) => result.endingEnergy)),
      killsByLap: meanLaps(results)
    },
    variance: { killed: variance(results.map((result) => result.killed)), endingEnergy: variance(results.map((result) => result.endingEnergy)) },
    overload: overload(results),
    overdrive: overdriveEfficacy(results),
    purchaseOutcomes: purchaseOutcomes(results),
    activeCreepsOverTime: snapshotTimes.map((time, index) => ({ time, value: average(results.map((result) => result.snapshots[index]?.activeCreeps ?? result.activeCreeps)) })),
    energyOverTime: snapshotTimes.map((time, index) => ({ time, value: average(results.map((result) => result.snapshots[index]?.energy ?? result.endingEnergy)) }))
  };
}
function overload(results) {
  const affected = results.filter((result) => result.overloadWave !== null);
  return { rate: affected.length / results.length, meanWave: affected.length ? average(affected.map((result) => result.overloadWave)) : null, waves: affected.map((result) => result.overloadWave) };
}
function overdriveEfficacy(results) {
  const total = (field) => results.reduce((sum, result) => sum + result[field], 0);
  const events = total('overdriveFiringEvents'); const slots = total('overdriveTargetSlots');
  const projectiles = total('overdriveShots');
  return {
    meanActivations: average(results.map((result) => result.overdriveActivations)), meanFiringEvents: average(results.map((result) => result.overdriveFiringEvents)),
    meanProjectiles: average(results.map((result) => result.overdriveShots)), meanImpacts: average(results.map((result) => result.overdriveImpacts)), meanDamage: average(results.map((result) => result.overdriveDamageDealt)),
    projectilesPerFiringEvent: events ? projectiles / events : 0, targetSlotFillRate: slots ? projectiles / slots : 0
  };
}
function meanLaps(results) {
  const keys = [...new Set(results.flatMap((result) => Object.keys(result.killsByLap)))].sort((left, right) => Number(left) - Number(right));
  return Object.fromEntries(keys.map((key) => [key, average(results.map((result) => result.killsByLap[key] ?? 0))]));
}
function purchaseOutcomes(results) {
  const outcomes = new Map();
  for (const result of results) for (const purchase of result.purchases) {
    const key = `${purchase.at}s ${purchase.branch}.${purchase.node} L${purchase.level}`;
    const current = outcomes.get(key) ?? { purchase: key, purchasedRuns: 0, rejectedRuns: 0 };
    if (purchase.status === 'purchased') current.purchasedRuns += 1;
    else current.rejectedRuns += 1;
    outcomes.set(key, current);
  }
  return [...outcomes.values()];
}
function average(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function variance(values) { const mean = average(values); return average(values.map((value) => (value - mean) ** 2)); }
function integerArgument(value, fallback) { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback; }
function fixed(value) { return Number(value).toFixed(2); }
function markdown(value) {
  const lines = [
    '# Tower Defense — headless simulation report', '',
    `Command: \`${value.command}\``, '',
    '## Approved temporary assumptions', '',
    `- Lap: ${value.assumptions.lapSeconds}s; sector: 30% of the route.`,
    `- Spawn: ${value.assumptions.spawnConvention}.`,
    `- Projectile travel: ${value.assumptions.projectileTravelSeconds}s; retarget delay: ${value.assumptions.retargetDelaySeconds}s.`,
    `- Overload: ${value.assumptions.overloadBoundary}.`, '',
    '## Build comparison', '',
    '| Opening | Mean kills | Mean ending energy | Overload rate | Mean overload wave |',
    '| --- | ---: | ---: | ---: | ---: |'
  ];
  for (const scenario of value.comparison) lines.push(`| ${scenario.opening} | ${fixed(scenario.meanKills)} | ${fixed(scenario.meanEndingEnergy)} | ${fixed(scenario.overloadRate * 100)}% | ${scenario.meanOverloadWave === null ? '—' : fixed(scenario.meanOverloadWave)} |`);
  const trajectories = value.scenarios.filter((scenario) => scenario.purchaseOutcomes.length > 0);
  if (trajectories.length) {
    lines.push('', '## Purchase trajectories', '');
    for (const scenario of trajectories) {
      lines.push(`### ${scenario.opening}`);
      for (const purchase of scenario.purchaseOutcomes) lines.push(`- ${purchase.purchase}: purchased in ${purchase.purchasedRuns}/${scenario.runs} runs; rejected in ${purchase.rejectedRuns}/${scenario.runs}.`);
      lines.push('');
    }
  }
  const overdrive = value.scenarios.find((scenario) => scenario.opening === 'overdrive-l1-policy');
  if (overdrive) lines.push('## Overdrive multi-projectile efficacy', '', `- Mean activations: ${fixed(overdrive.overdrive.meanActivations)}; firing events: ${fixed(overdrive.overdrive.meanFiringEvents)}; projectiles/event: ${fixed(overdrive.overdrive.projectilesPerFiringEvent)}; target-slot fill: ${fixed(overdrive.overdrive.targetSlotFillRate * 100)}%; impacts: ${fixed(overdrive.overdrive.meanImpacts)}.`, '');
  lines.push('', 'Detailed per-opening kills by lap, active creeps over time, energy over time, reward, variance, and overload outcomes are in `simulation-report.json`.');
  return `${lines.join('\n')}\n`;
}
