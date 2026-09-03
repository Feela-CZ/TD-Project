import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LiveMatch, TIER2_FAMILIES, TIER3_FAMILIES } from '../dist/live.mjs';

const runs = positive(arg('--runs='), 2);
const output = resolve(process.cwd(), arg('--output=') ?? 'results/solo-offense-matrix');
const overlayId = arg('--overlay=') ?? 'none';
const seeds = Array.from({ length: runs }, (_, index) => 20260828 + index * 7919);
const roots = ['damage', 'attackSpeed', 'crit'];
const OVERLAYS = Object.freeze({
  none: { label: 'No Utility overlay', early: [], mid: [], late: [] },
  reservesCapital: { label: 'Reserves + Capital Punishment', early: [['root','tower','interest',1],['root','tower','rewardFloor',1],['tier2','interest','battery',2],['tier2','interest','recovery',2]], mid: [], late: [['root','tower','interest',3],['root','tower','rewardFloor',3],['tier2','rewardFloor','expandedField',2],['tier2','rewardFloor','painTolerance',2],['ultimate','interest','capitalPunishment',1]] },
  reservesBattery: { label: 'Reserves + Flux Battery', early: [['root','tower','interest',1],['root','tower','rewardFloor',1],['tier2','interest','echo',2],['tier2','interest','battery',2]], mid: [], late: [['root','tower','interest',3],['root','tower','rewardFloor',3],['tier2','rewardFloor','expandedField',2],['tier2','rewardFloor','painTolerance',2],['ultimate','interest','avariceEngine',1]] },
  reserveSeed: { label: 'Reserves seed opening', early: [['root','tower','interest',1],['tier2','interest','echo',2],['ultimate','interest','avariceEngine',1]], mid: [], late: [] },
  reserveVolley: { label: 'Reserves volley opening', early: [['root','tower','interest',1],['tier2','interest','echo',2],['tier2','interest','battery',2],['ultimate','interest','avariceEngine',1]], mid: [], late: [] },
  reserveDeep: { label: 'Reserves seed then deep investment', early: [['root','tower','interest',1],['tier2','interest','echo',2],['ultimate','interest','avariceEngine',1]], mid: [], late: [['root','tower','interest',3]] },
  reserveMid: { label: 'Reserves after first combat specializations', early: [], mid: [['root','tower','interest',1],['tier2','interest','echo',2],['ultimate','interest','avariceEngine',1]], late: [] },
  orbitalBreach: { label: 'Surge Core + Orbital Breach', early: [['root','tower','rewardFloor',1],['root','tower','overdrive',1],['tier2','overdrive','salvo',2],['tier2','overdrive','phaseShield',2]], mid: [], late: [['root','tower','rewardFloor',3],['root','tower','overdrive',3],['tier2','rewardFloor','expandedField',2],['tier2','rewardFloor','painTolerance',2],['ultimate','overdrive','orbitalBreach',1]] },
  conjunction: { label: 'Surge Core + Conjunction', early: [['root','tower','rewardFloor',1],['root','tower','overdrive',1],['tier2','overdrive','salvo',2],['tier2','overdrive','phaseShield',2]], mid: [], late: [['root','tower','rewardFloor',3],['root','tower','overdrive',3],['tier2','rewardFloor','expandedField',2],['tier2','rewardFloor','painTolerance',2],['ultimate','overdrive','conjunctionSpheres',1]] }
});
const overlay = OVERLAYS[overlayId]; if (!overlay) throw new Error(`Unknown overlay: ${overlayId}`);
const allCandidates = enumerate();
const offset = nonNegative(arg('--offset='), 0);
const limit = positive(arg('--limit='), allCandidates.length);
const candidates = allCandidates.slice(offset, offset + limit);
const rows = [];

for (const candidate of candidates) {
  const samples = seeds.map((seed) => play(seed, candidate.plan));
  rows.push({ ...candidate, samples, ...summarize(samples) });
}
rows.sort((a, b) => b.meanWave - a.meanWave || a.id.localeCompare(b.id));
const report = { generatedAt: new Date().toISOString(), runs, seeds, matrixSize: allCandidates.length, offset, overlay: overlayId, model: `Solo progression. Bot purchases and bot terminal conditions are disabled. Every candidate fully commits to two legal Offense Tier I families, two Tier II choices per family at L2, one legal Offense Ultimate, and the operational Utility overlay: ${overlay.label}. Mutation purchases are excluded because they do not modify incoming Kethra without an opponent.`, candidates: rows, overview: overview(rows) };
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(resolve(output, 'report.md'), markdown(report));
console.log(`Solo offense matrix: ${resolve(output, 'report.md')}`);

function enumerate() {
  const candidates = [];
  for (let i = 0; i < roots.length; i += 1) for (let j = i + 1; j < roots.length; j += 1) {
    const selectedRoots = [roots[i], roots[j]];
    for (const firstChoices of pairs(TIER2_FAMILIES[selectedRoots[0]].map((choice) => choice.id))) for (const secondChoices of pairs(TIER2_FAMILIES[selectedRoots[1]].map((choice) => choice.id))) {
      const specializations = { [selectedRoots[0]]: firstChoices, [selectedRoots[1]]: secondChoices };
      for (const ultimateRoot of selectedRoots) for (const parent of specializations[ultimateRoot]) {
        const index = TIER2_FAMILIES[ultimateRoot].findIndex((choice) => choice.id === parent);
        const ultimate = TIER3_FAMILIES[ultimateRoot][index];
        const label = `${selectedRoots.map((root) => `${root}[${specializations[root].join('+')}]`).join(' · ')} → ${ultimate.id}`;
        candidates.push({ id: label, roots: selectedRoots, specializations, ultimate: ultimate.id, plan: planFor(selectedRoots, specializations, ultimateRoot, ultimate.id) });
      }
    }
  }
  return candidates;
}

function pairs(values) { const result = []; for (let i = 0; i < values.length; i += 1) for (let j = i + 1; j < values.length; j += 1) result.push([values[i], values[j]]); return result; }
function planFor(selectedRoots, specializations, ultimateRoot, ultimate) {
  const plan = selectedRoots.map((root) => ['root', 'tower', root, 1]);
  plan.push(...overlay.early);
  for (const root of selectedRoots) plan.push(['tier2', root, specializations[root][0], 2]);
  plan.push(...overlay.mid);
  for (const root of selectedRoots) plan.push(['tier2', root, specializations[root][1], 2]);
  for (const root of selectedRoots) plan.push(['root', 'tower', root, 3]);
  plan.push(...overlay.late);
  plan.push(['ultimate', ultimateRoot, ultimate, 1]);
  return plan;
}
function play(seed, plan) {
  const match = new LiveMatch(seed, { botEnabled: false, soloProgression: true });
  let cursor = 0; let completedAt = null;
  for (let tick = 0; tick < 27000 && !match.result; tick += 1) {
    if (tick % 10 === 0 && cursor < plan.length) {
      const intent = plan[cursor]; apply(match, intent);
      if (level(match.players.human, intent) >= intent[3]) { cursor += 1; if (cursor === plan.length) completedAt = match.time; }
    }
    if (tick % 50 === 0) { match.activateOverdrive(); match.activateTier2('overdrive', 'salvo'); for (const id of ['nullifyingPurge','orbitalBreach','signalCorruption','conjunctionSpheres']) match.activateUltimate(id); }
    match.step(.1);
  }
  const snapshot = match.snapshot(); const player = snapshot.players.human;
  return { result: snapshot.result ?? 'timeout', wave: snapshot.wave, kills: player.killed, flux: player.energy, earned: player.earnedEnergy, interest: player.interestEnergy, avarice: player.avariceEnergy, completedAt, complete: cursor === plan.length };
}
function apply(match, intent) { const [kind, a, b] = intent; if (kind === 'root') match.buy(a, b); else if (kind === 'tier2') match.buyTier2(a, b); else match.buyTier3(a, b); }
function level(player, intent) { const [kind, a, b] = intent; return kind === 'root' ? player.tower[b] : kind === 'tier2' ? player.tier2[a][b] : player.tier3[a][b]; }
function summarize(samples) { const complete = samples.filter((sample) => sample.completedAt !== null); return { meanWave: mean(samples, 'wave'), minWave: Math.min(...samples.map((sample) => sample.wave)), maxWave: Math.max(...samples.map((sample) => sample.wave)), meanFlux: mean(samples, 'flux'), meanInterest: mean(samples, 'interest'), meanAvarice: mean(samples, 'avarice'), completeRate: complete.length / samples.length, meanCompletionWave: complete.length ? mean(complete, 'completedAt') / 45 + 1 : null }; }
function overview(rows) { const waves = rows.map((row) => row.meanWave).sort((a, b) => a - b); return { combinations: rows.length, meanWave: mean(rows, 'meanWave'), minWave: waves[0], p10: quantile(waves, .1), median: quantile(waves, .5), p90: quantile(waves, .9), maxWave: waves.at(-1), atLeast45: rows.filter((row) => row.meanWave >= 45).length, atLeast50: rows.filter((row) => row.meanWave >= 50).length, below30: rows.filter((row) => row.meanWave < 30).length }; }
function mean(rows, key) { return rows.length ? rows.reduce((sum, row) => sum + row[key], 0) / rows.length : 0; }
function quantile(values, percentile) { return values[Math.min(values.length - 1, Math.floor((values.length - 1) * percentile))]; }
function arg(prefix) { return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length); }
function positive(value, fallback) { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback; }
function nonNegative(value, fallback) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback; }
function markdown(report) {
  const o = report.overview; const lines = ['# Solo Offense Matrix', '', `**${o.combinations}** complete legal Offense builds × ${report.runs} deterministic seeds. ${report.model}`, '', `Range: **W${o.minWave.toFixed(1)}–W${o.maxWave.toFixed(1)}**; median **W${o.median.toFixed(1)}**; P10/P90 **W${o.p10.toFixed(1)} / W${o.p90.toFixed(1)}**. ${o.atLeast45}/${o.combinations} reach W45; ${o.atLeast50}/${o.combinations} reach W50; ${o.below30} fall below W30.`, '', '| Rank | Build | Mean wave | Min–max | Completion | Flux at end | Interest | Avarice |', '| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |'];
  report.candidates.forEach((row, index) => lines.push(`| ${index + 1} | \`${row.id}\` | ${row.meanWave.toFixed(2)} | ${row.minWave}–${row.maxWave} | ${row.meanCompletionWave === null ? '—' : `W${row.meanCompletionWave.toFixed(1)}`} | ${row.meanFlux.toFixed(0)} | ${row.meanInterest.toFixed(0)} | ${row.meanAvarice.toFixed(0)} |`));
  return `${lines.join('\n')}\n`;
}
