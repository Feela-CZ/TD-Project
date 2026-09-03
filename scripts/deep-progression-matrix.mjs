import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LiveMatch, TIER1_MAX_LEVEL, TIER2_MAX_LEVEL, TIER2_FAMILIES, TIER3_FAMILIES } from '../dist/live.mjs';

const runs = integerArgument('--runs=', 6);
const output = resolve(process.cwd(), argument('--output=') ?? 'results/deep-progression-matrix');
const offset = integerArgument('--offset=', 0, true);
const limit = integerArgument('--limit=', 0, true);
const overlayFilter = argument('--overlay=');
const seeds = Array.from({ length: runs }, (_, index) => 20260829 + index * 104729);
const roots = ['damage', 'attackSpeed', 'crit'];
const overlays = Object.freeze({
  combatOnly: { label: 'Combat only', before: [], after: [] },
  reservesLate: { label: 'Late Reserves / Avarice', stagedReserves:true },
  reservesEarly: { label: 'Opening Reserves / Avarice', openingReserves:true },
  reservesMid: { label: 'Midgame Reserves / Avarice', midReserves:true },
  reservesHybrid: { label: 'Hybrid Reserves / Avarice', hybridReserves:true },
  rushUltimate: { label: 'Ultimate rush', rushUltimate:true },
  allUltimatesCombat: { label: 'Three-Ultimate combat', allUltimates:'combat' },
  allUltimatesEconomy: { label: 'Three-Ultimate economy', allUltimates:'economy' }
});
if (overlayFilter && !overlays[overlayFilter]) throw new Error(`Unknown overlay: ${overlayFilter}`);

const allCandidates = enumerate();
const candidates = allCandidates.slice(offset, limit > 0 ? offset + limit : undefined);
const rows = [];
for (const candidate of candidates) {
  const samples = seeds.map((seed) => play(seed, candidate.plan));
  rows.push({ id: candidate.id, offense: candidate.offense, overlay: candidate.overlay, samples, ...summarize(samples) });
}
rows.sort((left, right) => right.meanWave - left.meanWave || right.victoryRate - left.victoryRate || left.id.localeCompare(right.id));
const report = { generatedAt: new Date().toISOString(), runs, seeds, offset, limit: limit || allCandidates.length, totalCandidates: allCandidates.length, candidates: rows.length, model: 'LiveMatch solo progression at 0.1-second deterministic ticks. Purchases use natural Flux only and are retried when affordable. Every build selects two legal Offense Tier I families, two legal Tier II choices per selected family, and one matching Offense Ultimate. It is measured both as combat-only and as a staged Reserves/Avarice build: combat rank 5 plus one completed primary specialization comes before the economic investment. Mutation is excluded because a solo player does not alter incoming Kethra.', overview: overview(rows), rows };
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(resolve(output, 'report.md'), markdown(report));
console.log(`Deep progression matrix: ${resolve(output, 'report.md')}`);

function enumerate() {
  const entries = [];
  for (let left = 0; left < roots.length; left += 1) for (let right = left + 1; right < roots.length; right += 1) {
    const selectedRoots = [roots[left], roots[right]];
    for (const leftChoices of pairs(TIER2_FAMILIES[selectedRoots[0]].map((choice) => choice.id))) for (const rightChoices of pairs(TIER2_FAMILIES[selectedRoots[1]].map((choice) => choice.id))) {
      const choices = { [selectedRoots[0]]: leftChoices, [selectedRoots[1]]: rightChoices };
      for (const ultimateRoot of selectedRoots) for (const ultimateParent of choices[ultimateRoot]) {
        const index = TIER2_FAMILIES[ultimateRoot].findIndex((choice) => choice.id === ultimateParent);
        const ultimate = TIER3_FAMILIES[ultimateRoot][index];
        const offense = `${selectedRoots[0]}[${leftChoices.join('+')}] + ${selectedRoots[1]}[${rightChoices.join('+')}] → ${ultimate.id}`;
        for (const [overlay, config] of Object.entries(overlays)) if (!overlayFilter || overlay === overlayFilter) entries.push({ id: `${offense} · ${overlay}`, offense, overlay, plan: planFor(selectedRoots, choices, ultimateRoot, ultimate.id, config) });
      }
    }
  }
  return entries;
}
function pairs(values) { const result = []; for (let left = 0; left < values.length; left += 1) for (let right = left + 1; right < values.length; right += 1) result.push([values[left], values[right]]); return result; }
function rootRanks(node, first, last, branch = 'tower') { return Array.from({ length: last - first + 1 }, (_, index) => ['root', branch, node, first + index]); }
function tierRanks(root, choice, first, last) { return Array.from({ length: last - first + 1 }, (_, index) => ['tier2', root, choice, first + index]); }
function planFor(selectedRoots, choices, ultimateRoot, ultimate, overlay) {
  const plan = [];
  for (const root of selectedRoots) plan.push(...rootRanks(root, 1, 1));
  if (overlay.rushUltimate) {
    const parent = TIER2_FAMILIES[ultimateRoot].find((choice, index) => TIER3_FAMILIES[ultimateRoot][index]?.id === ultimate)?.id;
    plan.push(...tierRanks(ultimateRoot, parent, 1, TIER2_MAX_LEVEL), ['ultimate', ultimateRoot, ultimate, 1]);
    return plan;
  }
  if (overlay.allUltimates) {
    for (const root of selectedRoots) plan.push(...rootRanks(root, 2, 5));
    for (const root of selectedRoots) plan.push(...tierRanks(root, choices[root][0], 1, TIER2_MAX_LEVEL));
    if (overlay.allUltimates === 'economy') plan.push(...rootRanks('interest', 1, 1), ...tierRanks('interest', 'echo', 1, TIER2_MAX_LEVEL), ['ultimate', 'interest', 'avariceEngine', 1]);
    for (const root of selectedRoots) plan.push(...rootRanks(root, 6, TIER1_MAX_LEVEL), ...tierRanks(root, choices[root][1], 1, TIER2_MAX_LEVEL));
    if (overlay.allUltimates !== 'economy') plan.push(...rootRanks('overdrive', 1, 1), ...tierRanks('overdrive', 'adrenaline', 1, TIER2_MAX_LEVEL), ['ultimate', 'overdrive', 'nullifyingPurge', 1]);
    plan.push(...rootRanks('armor', 1, 1, 'mutation'), ...tierRanks('armor', 'armorNet', 1, TIER2_MAX_LEVEL), ['ultimate', 'armor', 'burdenMatrix', 1], ['ultimate', ultimateRoot, ultimate, 1]);
    return plan;
  }
  if (overlay.openingReserves) plan.push(...rootRanks('interest', 1, 1), ...tierRanks('interest', 'echo', 1, TIER2_MAX_LEVEL), ['ultimate', 'interest', 'avariceEngine', 1]);
  if (overlay.hybridReserves) {
    plan.push(...rootRanks('interest', 1, 1));
    for (const root of selectedRoots) plan.push(...rootRanks(root, 2, 3));
    plan.push(...rootRanks('interest', 2, 4), ...tierRanks('interest', 'echo', 1, 2));
    for (const root of selectedRoots) plan.push(...tierRanks(root, choices[root][0], 1, 3));
    plan.push(...rootRanks('interest', 5, TIER1_MAX_LEVEL), ...tierRanks('interest', 'echo', 3, TIER2_MAX_LEVEL), ['ultimate', 'interest', 'avariceEngine', 1]);
  }
  if (overlay.stagedReserves) {
    for (const root of selectedRoots) plan.push(...rootRanks(root, 2, 5));
    for (const root of selectedRoots) plan.push(...tierRanks(root, choices[root][0], 1, TIER2_MAX_LEVEL));
    plan.push(...rootRanks('interest', 1, 1), ...tierRanks('interest', 'echo', 1, TIER2_MAX_LEVEL), ['ultimate', 'interest', 'avariceEngine', 1]);
  } else if (!overlay.hybridReserves) {
    for (const root of selectedRoots) plan.push(...rootRanks(root, 2, 3));
    if (overlay.midReserves) plan.push(...rootRanks('interest', 1, 1), ...tierRanks('interest', 'echo', 1, TIER2_MAX_LEVEL), ['ultimate', 'interest', 'avariceEngine', 1]);
    for (const root of selectedRoots) plan.push(...tierRanks(root, choices[root][0], 1, TIER2_MAX_LEVEL));
  }
  for (const root of selectedRoots) plan.push(...rootRanks(root, overlay.stagedReserves ? 6 : 4, TIER1_MAX_LEVEL));
  if (overlay.hybridReserves) for (const root of selectedRoots) plan.push(...tierRanks(root, choices[root][0], 4, TIER2_MAX_LEVEL));
  for (const root of selectedRoots) plan.push(...tierRanks(root, choices[root][1], 1, TIER2_MAX_LEVEL));
  plan.push(['ultimate', ultimateRoot, ultimate, 1]);
  return plan;
}
function play(seed, plan) {
  const match = new LiveMatch(seed, { botEnabled: false, soloProgression: true });
  let cursor = 0; let completionAt = null; const ultimates = [];
  for (let tick = 0; tick < 27000 && !match.result; tick += 1) {
    if (tick % 5 === 0 && cursor < plan.length) { const intent = plan[cursor]; apply(match, intent); if (level(match, intent) >= intent[3]) { if (intent[0] === 'ultimate') ultimates.push({ id:intent[2], at:match.time }); cursor += 1; if (cursor === plan.length) completionAt = match.time; } }
    if (tick % 25 === 0) { match.activateOverdrive(); match.activateTier2('overdrive', 'salvo'); match.activateTier2('overdrive', 'adrenaline'); match.activateTier2('overdrive', 'phaseShield'); for (const id of ['nullifyingPurge', 'orbitalBreach', 'conjunctionSpheres']) match.activateUltimate(id); }
    match.step(.1);
  }
  const snapshot = match.snapshot(), player = snapshot.players.human;
  return { result: snapshot.result ?? 'timeout', wave: snapshot.wave, time: snapshot.time, kills: player.killed, flux: player.energy, earned: player.earnedEnergy, interest: player.interestEnergy, avarice: player.avariceEnergy, strain: player.load, purchases: player.purchaseLog.length, tier1Ranks: player.tier1Purchases, tier2Ranks: player.tier2Purchases, ultimates, nextPurchase: plan[cursor] ?? null, tiers: { tower: player.tower, tier2: player.tier2, tier3: player.tier3 }, completionAt, fullPlan: cursor === plan.length };
}
function apply(match, intent) { const [kind, a, b] = intent; if (kind === 'root') match.buy(a, b); else if (kind === 'tier2') match.buyTier2(a, b); else match.buyTier3(a, b); }
function level(match, intent) { const player = match.players.human; const [kind, a, b] = intent; return kind === 'root' ? (a === 'tower' ? player.tower : player.mutations)[b] : kind === 'tier2' ? player.tier2[a][b] : player.tier3[a][b]; }
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function percentile(values, proportion) { const sorted = [...values].sort((a, b) => a - b); return sorted[Math.floor((sorted.length - 1) * proportion)]; }
function summarize(samples) { const waves = samples.map((sample) => sample.wave), complete = samples.filter((sample) => sample.completionAt !== null), finalUltimates = samples.filter((sample) => sample.ultimates.length > 0); return { meanWave: mean(waves), p10Wave: percentile(waves, .1), medianWave: percentile(waves, .5), p90Wave: percentile(waves, .9), minWave: Math.min(...waves), maxWave: Math.max(...waves), victoryRate: samples.filter((sample) => sample.result.startsWith('victory')).length / samples.length, meanFlux: mean(samples.map((sample) => sample.flux)), meanEarned: mean(samples.map((sample) => sample.earned)), meanInterest: mean(samples.map((sample) => sample.interest)), meanAvarice: mean(samples.map((sample) => sample.avarice)), meanPurchases: mean(samples.map((sample) => sample.purchases)), fullPlanRate: complete.length / samples.length, meanUltimateCount: mean(samples.map((sample) => sample.ultimates.length)), meanFinalUltimateWave: finalUltimates.length ? mean(finalUltimates.map((sample) => sample.ultimates.at(-1).at / 45 + 1)) : null, meanCompletionWave: complete.length ? mean(complete.map((sample) => sample.completionAt / 45 + 1)) : null }; }
function overview(rows) { const waves = rows.map((row) => row.meanWave); return { meanWave: mean(waves), p10: percentile(waves, .1), median: percentile(waves, .5), p90: percentile(waves, .9), min: Math.min(...waves), max: Math.max(...waves), reaches45: rows.filter((row) => row.meanWave >= 45).length, reaches50: rows.filter((row) => row.meanWave >= 50).length, under30: rows.filter((row) => row.meanWave < 30).length, fullPlan: rows.filter((row) => row.fullPlanRate === 1).length }; }
function markdown(value) {
  const o = value.overview, lines = ['# Deep Solo Progression Matrix', '', `**${value.candidates} builds × ${value.runs} seeds**. ${value.model}`, '', `Mean-wave range: **W${o.min.toFixed(1)}–W${o.max.toFixed(1)}**; P10 / median / P90: **W${o.p10.toFixed(1)} / W${o.median.toFixed(1)} / W${o.p90.toFixed(1)}**. ${o.reaches45} builds reach W45 on average; ${o.reaches50} reach W50; ${o.under30} fall below W30.`, '', '| Rank | Offense route | Utility | Mean W | Ultimates | Last Ultimate | P10–P90 | Win rate | End Flux | Interest | Plan complete |', '| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'];
  value.rows.forEach((row, index) => lines.push(`| ${value.offset + index + 1} | ${row.offense} | ${overlays[row.overlay].label} | ${row.meanWave.toFixed(2)} | ${row.meanUltimateCount.toFixed(1)} | ${row.meanFinalUltimateWave === null ? '—' : `W${row.meanFinalUltimateWave.toFixed(1)}`} | ${row.p10Wave}–${row.p90Wave} | ${(row.victoryRate * 100).toFixed(0)}% | ${row.meanFlux.toFixed(0)} | ${row.meanInterest.toFixed(0)} | ${(row.fullPlanRate * 100).toFixed(0)}% |`));
  return `${lines.join('\n')}\n`;
}
function argument(prefix) { return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length); }
function integerArgument(prefix, fallback, allowZero = false) { const value = Number(argument(prefix)); return Number.isInteger(value) && (allowZero ? value >= 0 : value > 0) ? value : fallback; }
