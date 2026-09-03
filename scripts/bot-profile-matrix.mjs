import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { BOT_PROFILES, LiveMatch, TIER1_MAX_LEVEL, TIER2_MAX_LEVEL } from '../dist/live.mjs';

const runs = positive(argument('--runs='), 4);
const output = resolve(process.cwd(), argument('--output=') ?? 'results/bot-profile-matrix');
const seeds = Array.from({ length:runs }, (_, index) => 20260902 + index * 7919);
const profiles = Object.keys(BOT_PROFILES);
const strategies = {
  combatFirst: offensePlan(false),
  economyBridge: offensePlan(true)
};
const rows = [];
for (const profile of profiles) for (const [strategy, plan] of Object.entries(strategies)) {
  const samples = seeds.map((seed) => play(seed, profile, plan));
  rows.push({ profile, strategy, samples, ...summarize(samples) });
}
const report = { generatedAt:new Date().toISOString(), runs, seeds, model:'Two-sided deterministic LiveMatch. The human controller follows a legal combat-first or economy-bridge purchase plan; each bot profile follows its own legal purchase profile and uses abilities/Tempo when available.', rows };
await mkdir(output, { recursive:true });
await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(resolve(output, 'report.md'), markdown(report));
console.log(`Bot profile matrix: ${resolve(output, 'report.md')}`);

function root(node, from, to, branch='tower') { return Array.from({ length:to-from+1 }, (_, index) => ['root', branch, node, from + index]); }
function tier(rootId, choice, from=1, to=TIER2_MAX_LEVEL) { return Array.from({ length:to-from+1 }, (_, index) => ['tier2', rootId, choice, from + index]); }
function offensePlan(economy) {
  const plan = [...root('damage',1,1), ...root('attackSpeed',1,1), ...root('damage',2,3), ...root('attackSpeed',2,3), ...tier('damage','multishot'), ...tier('attackSpeed','requiem')];
  if (economy) plan.push(...root('interest',1,1), ...tier('interest','echo'), ['ultimate','interest','avariceEngine',1]);
  plan.push(...root('damage',4,TIER1_MAX_LEVEL), ...root('attackSpeed',4,TIER1_MAX_LEVEL), ...tier('damage','reaper'), ...tier('attackSpeed','burn'), ['ultimate','damage','vectorReversal',1]);
  return plan;
}
function play(seed, profile, plan) {
  const match = new LiveMatch(seed, { botProfile:profile });
  let cursor = 0;
  for (let tick = 0; tick < 27000 && !match.result; tick += 1) {
    if (tick % 5 === 0 && cursor < plan.length) { const intent = plan[cursor]; apply(match, intent); if (level(match, intent) >= intent[3]) cursor += 1; }
    if (tick % 25 === 0) { match.activateOverdrive(); match.activateTier2('overdrive','salvo'); match.activateTier2('overdrive','adrenaline'); match.activateTier2('overdrive','phaseShield'); }
    match.step(.1);
  }
  const snapshot = match.snapshot(), human = snapshot.players.human, bot = snapshot.players.bot;
  return { result:snapshot.result ?? 'timeout', wave:snapshot.wave, time:snapshot.time, humanFlux:human.energy, botFlux:bot.energy, humanStrain:human.load, botStrain:bot.load, humanPurchases:human.tier1Purchases + human.tier2Purchases, botPurchases:bot.tier1Purchases + bot.tier2Purchases, completed:cursor === plan.length };
}
function apply(match, intent) { const [kind, a, b] = intent; if (kind === 'root') match.buy(a,b); else if (kind === 'tier2') match.buyTier2(a,b); else match.buyTier3(a,b); }
function level(match, intent) { const p = match.players.human, [kind,a,b] = intent; return kind === 'root' ? (a === 'tower' ? p.tower : p.mutations)[b] : kind === 'tier2' ? p.tier2[a][b] : p.tier3[a][b]; }
function summarize(samples) { return { meanWave:mean(samples.map((sample) => sample.wave)), humanWins:samples.filter((sample) => sample.result.startsWith('victory')).length / samples.length, botWins:samples.filter((sample) => sample.result.startsWith('defeat')).length / samples.length, draws:samples.filter((sample) => sample.result.startsWith('draw')).length / samples.length, meanHumanFlux:mean(samples.map((sample) => sample.humanFlux)), meanBotFlux:mean(samples.map((sample) => sample.botFlux)), meanHumanStrain:mean(samples.map((sample) => sample.humanStrain)), meanBotStrain:mean(samples.map((sample) => sample.botStrain)), meanBotPurchases:mean(samples.map((sample) => sample.botPurchases)), completionRate:mean(samples.map((sample) => sample.completed ? 1 : 0)) }; }
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function markdown(report) {
  const lines = ['# Bot profile matrix', '', `**${report.runs} seeds per profile/strategy.** ${report.model}`, '', '| Bot profile | Human strategy | Mean W | Human win | Bot win | Human strain | Bot strain | Bot purchases | Human Flux | Bot Flux | Plan complete |', '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'];
  for (const row of report.rows) lines.push(`| ${BOT_PROFILES[row.profile].label} | ${row.strategy} | ${row.meanWave.toFixed(1)} | ${(row.humanWins*100).toFixed(0)}% | ${(row.botWins*100).toFixed(0)}% | ${row.meanHumanStrain.toFixed(0)} | ${row.meanBotStrain.toFixed(0)} | ${row.meanBotPurchases.toFixed(1)} | ${row.meanHumanFlux.toFixed(0)} | ${row.meanBotFlux.toFixed(0)} | ${(row.completionRate*100).toFixed(0)}% |`);
  return `${lines.join('\n')}\n`;
}
function argument(prefix) { return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length); }
function positive(value, fallback) { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback; }
