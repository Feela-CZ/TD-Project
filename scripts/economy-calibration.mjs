import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { LiveMatch, TIER1_MAX_LEVEL, TIER2_MAX_LEVEL } from '../dist/live.mjs';

const output = resolve(process.cwd(), 'results/economy-calibration-20260831');
const multipliers = [1];
const priceSteps = [{ tier1:6, tier2:8 }];
const interestCurvePowers = [4];
const interestCaps = [.015,.016,.018,.02];
const seeds = Array.from({length:8},(_,index)=>20260831+index*7919);
const plans = {
  ordnanceCadence: offense('damage',['multishot','reaper'],'attackSpeed',['burn','rhythm'],'thermalRupture'),
  reservesCadence: reservesLate('damage',['multishot','reaper'],'attackSpeed',['burn','rhythm'],'thermalRupture')
};

const rows=[];
for(const [name,plan] of Object.entries(plans))for(const interestRateMultiplier of multipliers)for(const priceStep of priceSteps)for(const interestCurvePower of interestCurvePowers)for(const interestCap of interestCaps){const samples=seeds.map((seed)=>play(seed,plan,interestRateMultiplier,priceStep,interestCurvePower,interestCap));rows.push({name,interestRateMultiplier,interestCurvePower,interestCap,priceStep,samples,...summarize(samples)});}
const report={generatedAt:new Date().toISOString(),model:'Solo LiveMatch at 0.1-second ticks through the Wave-60 clear window. Tier I/Tier II purchases are retried only when naturally affordable. Prices and the Reserves curve are calibration-only.',multipliers,priceSteps,interestCurvePowers,interestCaps,seeds,rows};
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'report.json'),`${JSON.stringify(report,null,2)}\n`);
await writeFile(resolve(output,'report.md'),markdown(report));
console.log(`Economy calibration: ${resolve(output,'report.md')}`);

function ranks(kind,a,b,from,to){return Array.from({length:to-from+1},(_,i)=>[kind,a,b,from+i]);}
function ultimateRoot(id){return id==='thermalRupture'?'attackSpeed':id==='focusCascade'?'crit':'damage';}
function offense(a,choicesA,b,choicesB,ultimate){return [...ranks('root','tower',a,1,1),...ranks('root','tower',b,1,1),...ranks('root','tower',a,2,3),...ranks('root','tower',b,2,3),...ranks('tier2',a,choicesA[0],1,TIER2_MAX_LEVEL),...ranks('tier2',b,choicesB[0],1,TIER2_MAX_LEVEL),...ranks('root','tower',a,4,TIER1_MAX_LEVEL),...ranks('root','tower',b,4,TIER1_MAX_LEVEL),...ranks('tier2',a,choicesA[1],1,TIER2_MAX_LEVEL),...ranks('tier2',b,choicesB[1],1,TIER2_MAX_LEVEL),['ultimate',ultimateRoot(ultimate),ultimate,1]];}
function reserves(a,choicesA,b,choicesB,ultimate){return [...ranks('root','tower',a,1,1),...ranks('root','tower',b,1,1),...ranks('root','tower',a,2,3),...ranks('root','tower',b,2,3),...ranks('tier2',a,choicesA[0],1,3),...ranks('tier2',b,choicesB[0],1,3),...ranks('root','tower','interest',1,1),...ranks('tier2','interest','echo',1,TIER2_MAX_LEVEL),['ultimate','interest','avariceEngine',1],...ranks('root','tower',a,4,TIER1_MAX_LEVEL),...ranks('root','tower',b,4,TIER1_MAX_LEVEL),...ranks('tier2',a,choicesA[0],4,TIER2_MAX_LEVEL),...ranks('tier2',b,choicesB[0],4,TIER2_MAX_LEVEL),...ranks('tier2',a,choicesA[1],1,TIER2_MAX_LEVEL),...ranks('tier2',b,choicesB[1],1,TIER2_MAX_LEVEL),['ultimate',ultimateRoot(ultimate),ultimate,1]];}
function reservesLate(a,choicesA,b,choicesB,ultimate){return [...ranks('root','tower',a,1,5),...ranks('root','tower',b,1,5),...ranks('tier2',a,choicesA[0],1,TIER2_MAX_LEVEL),...ranks('tier2',b,choicesB[0],1,TIER2_MAX_LEVEL),...ranks('root','tower','interest',1,1),...ranks('tier2','interest','echo',1,TIER2_MAX_LEVEL),['ultimate','interest','avariceEngine',1],...ranks('root','tower',a,6,TIER1_MAX_LEVEL),...ranks('root','tower',b,6,TIER1_MAX_LEVEL),...ranks('tier2',a,choicesA[1],1,TIER2_MAX_LEVEL),...ranks('tier2',b,choicesB[1],1,TIER2_MAX_LEVEL),['ultimate',ultimateRoot(ultimate),ultimate,1]];}
function apply(match,[kind,a,b]){if(kind==='root')match.buy(a,b);else if(kind==='tier2')match.buyTier2(a,b);else match.buyTier3(a,b);}
function value(match,[kind,a,b]){const p=match.players.human;return kind==='root'?p.tower[b]:kind==='tier2'?p.tier2[a][b]:p.tier3[a][b];}
function play(seed,plan,interestRateMultiplier,priceStep,interestCurvePower,interestCap){const match=new LiveMatch(seed,{botEnabled:false,soloProgression:true,interestRateMultiplier,interestCurvePower,interestCap,tier1PriceStep:priceStep.tier1,tier2PriceStep:priceStep.tier2});let cursor=0,completedAt=null,w30Flux=null,w30Plan=null;for(let tick=0;tick<27900&&!match.result;tick+=1){if(tick%5===0&&cursor<plan.length){const intent=plan[cursor];apply(match,intent);if(value(match,intent)>=intent[3]){cursor+=1;if(cursor===plan.length)completedAt=match.time;}}match.step(.1);if(w30Flux===null&&match.time>=1305){const p=match.snapshot().players.human;w30Flux=p.energy;w30Plan=cursor;}}const s=match.snapshot(),p=s.players.human;return{wave:s.wave,result:s.result??'timeout',flux:p.energy,earned:p.earnedEnergy,interest:p.interestEnergy,plan:cursor,full:cursor===plan.length,completedAt,w30Flux,w30Plan};}
function mean(xs){return xs.reduce((s,x)=>s+x,0)/xs.length;}
function summarize(samples){return{meanWave:mean(samples.map(x=>x.wave)),meanFlux:mean(samples.map(x=>x.flux)),meanInterest:mean(samples.map(x=>x.interest)),meanPlan:mean(samples.map(x=>x.plan)),fullRate:mean(samples.map(x=>x.full?1:0)),meanCompletedWave:mean(samples.filter(x=>x.completedAt!==null).map(x=>x.completedAt/45+1))||null,meanW30Flux:mean(samples.map(x=>x.w30Flux??0)),meanW30Plan:mean(samples.map(x=>x.w30Plan??0))};}
function markdown(r){const lines=['# Economy calibration','','| Build | Interest | Curve | Cap | T1 step | T2 step | Mean wave | W30 Flux | W30 purchases | End Flux | Interest earned | Full plan | Completion |','| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |'];for(const x of r.rows)lines.push(`| ${x.name} | ${x.interestRateMultiplier} | ${x.interestCurvePower} | ${(x.interestCap*100).toFixed(2)}% | ${x.priceStep.tier1} | ${x.priceStep.tier2} | ${x.meanWave.toFixed(1)} | ${x.meanW30Flux.toFixed(0)} | ${x.meanW30Plan.toFixed(1)} | ${x.meanFlux.toFixed(0)} | ${x.meanInterest.toFixed(0)} | ${(x.fullRate*100).toFixed(0)}% | ${x.meanCompletedWave?`W${x.meanCompletedWave.toFixed(1)}`:'—'} |`);return `${lines.join('\n')}\n`;}
