import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LiveMatch, TIER1_MAX_LEVEL, TIER2_MAX_LEVEL, TIER2_FAMILIES, TIER3_FAMILIES } from '../dist/live.mjs';

const runs = integerArgument('--runs=', 8);
const output = resolve(process.cwd(), argument('--output=') ?? 'results/price-sensitivity');
const seeds = Array.from({ length: runs }, (_, index) => 20260829 + index * 104729);
const profiles = Object.freeze([
  { id: 'current', label: 'Current ladder', tier1PriceMultiplier: 1, tier2PriceMultiplier: 1 },
  { id: 'soft50', label: '50% Tier I / 50% Tier II', tier1PriceMultiplier: .5, tier2PriceMultiplier: .5 },
  { id: 'soft35', label: '35% Tier I / 35% Tier II', tier1PriceMultiplier: .35, tier2PriceMultiplier: .35 },
  { id: 'soft25', label: '25% Tier I / 25% Tier II', tier1PriceMultiplier: .25, tier2PriceMultiplier: .25 },
  { id: 'soft18', label: '18% Tier I / 18% Tier II', tier1PriceMultiplier: .18, tier2PriceMultiplier: .18 }
]);
const roots = ['damage', 'attackSpeed', 'crit'];
const candidates = enumerate();
const rows = [];
for (const profile of profiles) for (const candidate of candidates) {
  const samples = seeds.map((seed) => play(seed, candidate.plan, profile));
  rows.push({ profile: profile.id, offense: candidate.offense, samples, ...summarize(samples) });
}
const report = { generatedAt: new Date().toISOString(), runs, seeds, candidates: candidates.length, trajectories: rows.length * runs, model: 'Solo, natural Flux only, no bot. All legal two-family Offense routes are tested. Each build buys its two Tier I roots, develops both to rank 3, completes its first Tier II specialization, finishes Tier I, completes its second Tier II specialization, then buys the matching Ultimate. Active abilities are used whenever ready. This isolates the effect of the global price ladder on a deep, combat-first progression policy.', profiles, overview: profiles.map((profile) => aggregate(profile, rows.filter((row) => row.profile === profile.id))), rows };
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(resolve(output, 'report.md'), markdown(report));
console.log(`Price sensitivity: ${resolve(output, 'report.md')}`);

function enumerate() {
  const entries = [];
  for (let left = 0; left < roots.length; left += 1) for (let right = left + 1; right < roots.length; right += 1) {
    const selectedRoots = [roots[left], roots[right]];
    for (const leftChoices of pairs(TIER2_FAMILIES[selectedRoots[0]].map((choice) => choice.id))) for (const rightChoices of pairs(TIER2_FAMILIES[selectedRoots[1]].map((choice) => choice.id))) {
      const choices = { [selectedRoots[0]]: leftChoices, [selectedRoots[1]]: rightChoices };
      for (const ultimateRoot of selectedRoots) for (const ultimateParent of choices[ultimateRoot]) {
        const ultimate = TIER3_FAMILIES[ultimateRoot][TIER2_FAMILIES[ultimateRoot].findIndex((choice) => choice.id === ultimateParent)];
        entries.push({ offense: `${selectedRoots[0]}[${leftChoices.join('+')}] + ${selectedRoots[1]}[${rightChoices.join('+')}] → ${ultimate.id}`, plan: planFor(selectedRoots, choices, ultimateRoot, ultimate.id) });
      }
    }
  }
  return entries;
}
function pairs(values) { const result = []; for (let left = 0; left < values.length; left += 1) for (let right = left + 1; right < values.length; right += 1) result.push([values[left], values[right]]); return result; }
function rootRanks(node, first, last) { return Array.from({ length: last - first + 1 }, (_, index) => ['root', 'tower', node, first + index]); }
function tierRanks(root, choice) { return Array.from({ length: TIER2_MAX_LEVEL }, (_, index) => ['tier2', root, choice, index + 1]); }
function planFor(selectedRoots, choices, ultimateRoot, ultimate) { const plan = []; for (const root of selectedRoots) plan.push(...rootRanks(root, 1, 1)); for (const root of selectedRoots) plan.push(...rootRanks(root, 2, 3)); for (const root of selectedRoots) plan.push(...tierRanks(root, choices[root][0])); for (const root of selectedRoots) plan.push(...rootRanks(root, 4, TIER1_MAX_LEVEL)); for (const root of selectedRoots) plan.push(...tierRanks(root, choices[root][1])); plan.push(['ultimate', ultimateRoot, ultimate, 1]); return plan; }
function play(seed, plan, profile) {
  const match = new LiveMatch(seed, { botEnabled: false, soloProgression: true, tier1PriceMultiplier: profile.tier1PriceMultiplier, tier2PriceMultiplier: profile.tier2PriceMultiplier });
  let cursor = 0; let completionAt = null;
  for (let tick = 0; tick < 27000 && !match.result; tick += 1) {
    if (tick % 5 === 0 && cursor < plan.length) { const intent = plan[cursor]; apply(match, intent); if (level(match, intent) >= intent[3]) { cursor += 1; if (cursor === plan.length) completionAt = match.time; } }
    if (tick % 25 === 0) { match.activateOverdrive(); match.activateTier2('overdrive', 'salvo'); match.activateTier2('overdrive', 'adrenaline'); match.activateTier2('overdrive', 'phaseShield'); for (const id of ['nullifyingPurge', 'orbitalBreach', 'conjunctionSpheres']) match.activateUltimate(id); }
    match.step(.1);
  }
  const snapshot = match.snapshot(), player = snapshot.players.human;
  return { result: snapshot.result ?? 'timeout', wave: snapshot.wave, flux: player.energy, earned: player.earnedEnergy, interest: player.interestEnergy, purchases: player.purchaseLog.length, tier1Ranks: player.tier1Purchases, tier2Ranks: player.tier2Purchases, completionAt, fullPlan: cursor === plan.length };
}
function apply(match, intent) { const [kind, a, b] = intent; if (kind === 'root') match.buy(a, b); else if (kind === 'tier2') match.buyTier2(a, b); else match.buyTier3(a, b); }
function level(match, intent) { const player = match.players.human, [kind, a, b] = intent; return kind === 'root' ? player.tower[b] : kind === 'tier2' ? player.tier2[a][b] : player.tier3[a][b]; }
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function percentile(values, proportion) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor((sorted.length - 1) * proportion)]; }
function summarize(samples) { const waves = samples.map((sample) => sample.wave), complete = samples.filter((sample) => sample.completionAt !== null); return { meanWave: mean(waves), p10Wave: percentile(waves, .1), p90Wave: percentile(waves, .9), victoryRate: samples.filter((sample) => sample.result.startsWith('victory')).length / samples.length, meanFlux: mean(samples.map((sample) => sample.flux)), meanEarned: mean(samples.map((sample) => sample.earned)), meanInterest: mean(samples.map((sample) => sample.interest)), meanPurchases: mean(samples.map((sample) => sample.purchases)), fullPlanRate: complete.length / samples.length, meanCompletionWave: complete.length ? mean(complete.map((sample) => sample.completionAt / 45 + 1)) : null }; }
function aggregate(profile, rows) { const waves = rows.map((row) => row.meanWave); return { profile: profile.id, label: profile.label, meanWave: mean(waves), p10Build: percentile(waves, .1), medianBuild: percentile(waves, .5), p90Build: percentile(waves, .9), minBuild: Math.min(...waves), maxBuild: Math.max(...waves), reaches45: rows.filter((row) => row.meanWave >= 45).length, reaches50: rows.filter((row) => row.meanWave >= 50).length, reaches55: rows.filter((row) => row.meanWave >= 55).length, victoryRate: mean(rows.map((row) => row.victoryRate)), fullPlanRate: mean(rows.map((row) => row.fullPlanRate)), meanCompletionWave: mean(rows.filter((row) => row.meanCompletionWave !== null).map((row) => row.meanCompletionWave)) || null }; }
function markdown(report) {
  const lines = [
    '# Solo Price Sensitivity',
    '',
    `**${report.candidates} legal combat-first Offense routes × ${report.runs} seeds × ${report.profiles.length} price profiles = ${report.trajectories} trajectories.**`,
    '', report.model, '',
    '| Ladder | Mean wave | P10–P90 build | Best build | Builds ≥W45 | ≥W50 | ≥W55 | Mean victory rate | Full plan |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'
  ];
  for (const row of report.overview) {
    lines.push(`| ${row.label} | ${row.meanWave.toFixed(2)} | ${row.p10Build.toFixed(2)}–${row.p90Build.toFixed(2)} | ${row.maxBuild.toFixed(2)} | ${row.reaches45} | ${row.reaches50} | ${row.reaches55} | ${(row.victoryRate * 100).toFixed(0)}% | ${(row.fullPlanRate * 100).toFixed(0)}% |`);
  }
  for (const profile of report.profiles) {
    const top = report.rows.filter((row) => row.profile === profile.id).sort((a, b) => b.meanWave - a.meanWave).slice(0, 5);
    lines.push('', `## ${profile.label}`, '', '| Route | Mean W | P10–P90 | Win | Plan |', '| --- | ---: | ---: | ---: | ---: |');
    for (const row of top) lines.push(`| ${row.offense} | ${row.meanWave.toFixed(2)} | ${row.p10Wave}–${row.p90Wave} | ${(row.victoryRate * 100).toFixed(0)}% | ${(row.fullPlanRate * 100).toFixed(0)}% |`);
  }
  return `${lines.join('\n')}\n`;
}
function argument(prefix) { return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length); }
function integerArgument(prefix, fallback) { const value = Number(argument(prefix)); return Number.isInteger(value) && value > 0 ? value : fallback; }
