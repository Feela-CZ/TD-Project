import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LiveMatch } from '../dist/live.mjs';

const runs = positive(process.argv.find((value) => value.startsWith('--runs='))?.slice(7), 24);
const output = resolve(process.cwd(), process.argv.find((value) => value.startsWith('--output='))?.slice(9) ?? 'results/alpha-tier3-baseline');
const controlled = process.argv.includes('--controlled');
const solo = process.argv.includes('--solo');
const killFluxMultiplier = finite(process.argv.find((value) => value.startsWith('--kill-flux='))?.slice(12), 1.5);
const interestRateMultiplier = finite(process.argv.find((value) => value.startsWith('--interest-rate='))?.slice(16), 1);
const seeds = Array.from({ length: runs }, (_, index) => 20260828 + index * 97);

// Plans are ordered purchase intents. The controller retries an unavailable
// intent only when the match has enough naturally earned Flux.
const plans = {
  ordnanceCadence: [
    ['root','tower','damage',1], ['root','tower','attackSpeed',1],
    ['tier2','damage','reaper',2], ['tier2','damage','multishot',2],
    ['tier2','attackSpeed','burn',2], ['tier2','attackSpeed','rhythm',2],
    ['ultimate','damage','cullingEdict',1]
  ],
  cadencePrecision: [
    ['root','tower','attackSpeed',1], ['root','tower','crit',1],
    ['tier2','attackSpeed','rhythm',2], ['tier2','crit','critChance',2],
    ['tier2','crit','critMultiplier',2], ['ultimate','attackSpeed','overclockProtocol',1]
  ],
  focusCadence: [
    ['root','tower','attackSpeed',1], ['root','tower','crit',1],
    ['tier2','attackSpeed','rhythm',2], ['tier2','crit','critChance',2],
    ['tier2','crit','staticCharge',2], ['ultimate','crit','focusCascade',1]
  ],
  precisionControl: [
    ['root','tower','crit',1], ['root','tower','damage',1], ['root','tower','rewardFloor',1],
    ['tier2','crit','staticCharge',2], ['tier2','crit','critChance',2], ['tier2','rewardFloor','expandedField',2],
    ['ultimate','crit','arcStagger',1]
  ],
  reservesOffense: [
    ['root','tower','interest',1], ['root','tower','overdrive',1],
    ['tier2','interest','echo',2], ['tier2','interest','recovery',2],
    ['ultimate','interest','avariceEngine',1], ['root','tower','damage',1],
    ['root','tower','attackSpeed',1], ['tier2','damage','reaper',2]
  ],
  reservesBridge: [
    ['root','tower','damage',1], ['root','tower','attackSpeed',1], ['root','tower','interest',1],
    ['tier2','damage','reaper',2], ['tier2','damage','multishot',2],
    ['tier2','interest','echo',2], ['tier2','interest','recovery',2], ['ultimate','interest','avariceEngine',1]
  ],
  mutationPressure: [
    ['root','mutation','maxHp',1], ['root','mutation','speed',1],
    ['tier2','maxHp','homeostasis',2], ['tier2','speed','kinetic',2],
    ['tier2','speed','phaseSkip',2], ['ultimate','speed','pressureDrive',1],
    ['root','tower','damage',1], ['root','tower','attackSpeed',1]
  ],
  fullOrdnanceCadence: [
    ['root','tower','damage',1], ['root','tower','attackSpeed',1],
    ['tier2','damage','reaper',2], ['tier2','damage','multishot',2],
    ['tier2','attackSpeed','burn',2], ['tier2','attackSpeed','rhythm',2],
    ['root','tower','damage',3], ['root','tower','attackSpeed',3],
    ['ultimate','damage','cullingEdict',1]
  ],
  fullFocusCadence: [
    ['root','tower','attackSpeed',1], ['root','tower','crit',1],
    ['tier2','attackSpeed','burn',2], ['tier2','attackSpeed','rhythm',2],
    ['tier2','crit','critChance',2], ['tier2','crit','staticCharge',2],
    ['root','tower','attackSpeed',3], ['root','tower','crit',3],
    ['ultimate','crit','focusCascade',1]
  ],
  fullReservesBridge: [
    ['root','tower','damage',1], ['root','tower','attackSpeed',1], ['root','tower','interest',1],
    ['tier2','damage','reaper',2], ['tier2','damage','cryo',2],
    ['tier2','attackSpeed','requiem',2], ['tier2','attackSpeed','rhythm',2],
    ['tier2','interest','echo',2], ['tier2','interest','recovery',2],
    ['root','tower','damage',3], ['root','tower','attackSpeed',3], ['root','tower','interest',3],
    ['ultimate','attackSpeed','funeralCircuit',1], ['ultimate','interest','avariceEngine',1]
  ]
};

const report = { generatedAt:new Date().toISOString(), runs, seeds, killFluxMultiplier, interestRateMultiplier, model:controlled?'LiveMatch at 0.1-second deterministic ticks; test-only 5000 starting Flux to exercise legal Ultimate interactions.':solo?'Solo progression LiveMatch at 0.1-second deterministic ticks; no bot purchases, no opponent terminal, standard incoming Kethra, and no injected Flux.':'LiveMatch at 0.1-second deterministic ticks; no injected Flux; Tier-III plans are retried only after legal prerequisites and real affordability.', scenarios:{} };
for (const [name, plan] of Object.entries(plans)) report.scenarios[name] = summarize(seeds.map((seed) => play(seed, plan)));
await mkdir(output, { recursive:true });
await writeFile(resolve(output,'simulation-report.json'), `${JSON.stringify(report,null,2)}\n`);
await writeFile(resolve(output,'simulation-report.md'), markdown(report));
console.log(`Alpha balance report: ${resolve(output,'simulation-report.md')}`);

function play(seed, plan) {
  const match = new LiveMatch(seed,{killFluxMultiplier,interestRateMultiplier,botEnabled:!solo,soloProgression:solo}); if(controlled)match.players.human.energy=5000; let cursor = 0; let planCompletedAt = null; let nextUltimateAt = 0;
  for (let tick=0; tick<27000 && !match.result; tick+=1) {
    if (tick % 10 === 0 && cursor < plan.length) {
      const intent=plan[cursor]; apply(match,intent); if(level(match.snapshot(),intent)>=intent[3]) { cursor+=1; if(cursor===plan.length)planCompletedAt=match.time; }
    }
    if (tick / 10 >= nextUltimateAt) { for (const id of ['nullifyingPurge','orbitalBreach','signalCorruption','conjunctionSpheres']) match.activateUltimate(id); nextUltimateAt += 5; }
    match.step(.1);
  }
  const s=match.snapshot(), p=s.players.human;
  return { result:s.result??'timeout', wave:s.wave, time:s.time, killed:p.killed, flux:p.energy, earned:p.earnedEnergy, interest:p.interestEnergy, echo:p.echoEnergy, recovery:p.recoveryEnergy, purchases:p.purchaseLog.length, planSteps:cursor, fullPlan:cursor===plan.length, planCompletedAt, strain:p.load, tiers2:Object.values(p.tier2).flatMap(Object.values).filter(Boolean).reduce((a,b)=>a+b,0), ultimates:Object.values(p.tier3).flatMap(Object.values).filter(Boolean).length, focus:p.focus,cascades:p.cascades };
}
function level(snapshot, intent) { const p=snapshot.players.human; const [kind, a,b,target]=intent; if(kind==='root') return (a==='tower'?p.tower:p.mutations)[b]; if(kind==='tier2') return p.tier2[a][b]; return p.tier3[a][b]; }
function apply(match, intent) { const [kind,a,b]=intent; if(kind==='root')match.buy(a,b); else if(kind==='tier2')match.buyTier2(a,b); else match.buyTier3(a,b); }
function summarize(rows) { const byResult={}; for(const row of rows)byResult[row.result]=(byResult[row.result]??0)+1; const completed=rows.filter((row)=>row.planCompletedAt!==null); return { results:byResult, meanWave:mean(rows,'wave'), medianWave:median(rows.map((row)=>row.wave)), maxWave:Math.max(...rows.map((row)=>row.wave)), meanKills:mean(rows,'killed'), meanFlux:mean(rows,'flux'), meanEarned:mean(rows,'earned'), meanInterest:mean(rows,'interest'), meanEcho:mean(rows,'echo'), meanRecovery:mean(rows,'recovery'), meanPurchases:mean(rows,'purchases'), meanTier2:mean(rows,'tiers2'), meanUltimates:mean(rows,'ultimates'), meanCascades:mean(rows,'cascades'), fullPlanRate:completed.length/rows.length, meanPlanCompletedWave:completed.length?mean(completed,'planCompletedAt')/45+1:null, rows };
}
function mean(rows, key) { return rows.reduce((sum,row)=>sum+row[key],0)/rows.length; }
function median(values) { const sorted=[...values].sort((a,b)=>a-b); return sorted[Math.floor(sorted.length/2)]; }
function positive(value, fallback) { const parsed=Number(value); return Number.isInteger(parsed)&&parsed>0?parsed:fallback; }
function finite(value, fallback) { const parsed=Number(value); return Number.isFinite(parsed)&&parsed>0?parsed:fallback; }
function markdown(value) { const lines=['# Tower Defense — Tier III alpha balance baseline','',`Runs per scenario: ${value.runs}. ${value.model}`, '', '| Build | Mean wave | Median | Max | Mean kills | Mean Flux | Interest | Echo | Recovery | Tier II | Ultimates | Cascades | Plan complete |','| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']; for(const [name,s] of Object.entries(value.scenarios))lines.push(`| ${name} | ${s.meanWave.toFixed(2)} | ${s.medianWave} | ${s.maxWave} | ${s.meanKills.toFixed(1)} | ${s.meanFlux.toFixed(1)} | ${s.meanInterest.toFixed(1)} | ${s.meanEcho.toFixed(1)} | ${s.meanRecovery.toFixed(1)} | ${s.meanTier2.toFixed(2)} | ${s.meanUltimates.toFixed(2)} | ${s.meanCascades.toFixed(2)} | ${s.meanPlanCompletedWave===null?'—':`W${s.meanPlanCompletedWave.toFixed(1)}`} |`); lines.push('', '## Terminal outcomes',''); for(const [name,s] of Object.entries(value.scenarios)) lines.push(`- **${name}:** ${Object.entries(s.results).map(([result,count])=>`${count}× ${result}`).join('; ')}.`); return `${lines.join('\n')}\n`; }
