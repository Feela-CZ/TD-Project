import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const input = resolve(process.cwd(), arg('--input=') ?? 'results/solo-offense-matrix-chunks');
const output = resolve(process.cwd(), arg('--output=') ?? 'results/solo-offense-matrix-full');
const entries = await readdir(input, { withFileTypes: true });
const files = entries.filter((entry) => entry.isDirectory()).map((entry) => resolve(input, entry.name, 'report.json')).sort();
const reports = await Promise.all(files.map(async (file) => JSON.parse(await readFile(file, 'utf8'))));
const rows = reports.flatMap((report) => report.candidates).sort((a, b) => b.meanWave - a.meanWave || a.id.localeCompare(b.id));
const waves = rows.map((row) => row.meanWave).sort((a, b) => a - b);
const overview = { combinations: rows.length, meanWave: mean(rows, 'meanWave'), minWave: waves[0], p10: quantile(waves, .1), median: quantile(waves, .5), p90: quantile(waves, .9), maxWave: waves.at(-1), atLeast45: rows.filter((row) => row.meanWave >= 45).length, atLeast50: rows.filter((row) => row.meanWave >= 50).length, below30: rows.filter((row) => row.meanWave < 30).length };
const report = { generatedAt: new Date().toISOString(), runs: reports[0]?.runs ?? 0, model: reports[0]?.model ?? '', overview, candidates: rows };
await mkdir(output, { recursive: true }); await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`); await writeFile(resolve(output, 'report.md'), markdown(report)); console.log(`Merged matrix: ${resolve(output, 'report.md')}`);

function arg(prefix) { return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length); }
function mean(rows, key) { return rows.length ? rows.reduce((sum, row) => sum + row[key], 0) / rows.length : 0; }
function quantile(values, percentile) { return values[Math.min(values.length - 1, Math.floor((values.length - 1) * percentile))]; }
function markdown(report) { const o = report.overview; const lines = ['# Solo Offense Matrix', '', `**${o.combinations}** complete legal Offense builds × ${report.runs} deterministic seeds. ${report.model}`, '', `Range: **W${o.minWave.toFixed(1)}–W${o.maxWave.toFixed(1)}**; median **W${o.median.toFixed(1)}**; P10/P90 **W${o.p10.toFixed(1)} / W${o.p90.toFixed(1)}**. ${o.atLeast45}/${o.combinations} reach W45; ${o.atLeast50}/${o.combinations} reach W50; ${o.below30} fall below W30.`, '', '| Rank | Build | Mean wave | Min–max | Completion | Flux at end | Interest |', '| ---: | --- | ---: | ---: | ---: | ---: | ---: |']; report.candidates.forEach((row, index) => lines.push(`| ${index + 1} | \`${row.id}\` | ${row.meanWave.toFixed(2)} | ${row.minWave}–${row.maxWave} | ${row.meanCompletionWave === null ? '—' : `W${row.meanCompletionWave.toFixed(1)}`} | ${row.meanFlux.toFixed(0)} | ${row.meanInterest.toFixed(0)} |`)); return `${lines.join('\n')}\n`; }
