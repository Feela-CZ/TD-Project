import assert from 'node:assert/strict';
import { LiveMatch, TIER2_FAMILIES, TIER3_FAMILIES, TIER2_MAX_LEVEL } from '../dist/live.mjs';

const active = new Set(['signalCorruption','nullifyingPurge','orbitalBreach','conjunctionSpheres']);
const results = [];
for (const [root, ultimates] of Object.entries(TIER3_FAMILIES)) {
  for (const [index, ultimate] of ultimates.entries()) {
    const parent = TIER2_FAMILIES[root][index].id;
    const match = new LiveMatch(20260831 + results.length, { botEnabled:true });
    match.players.human.energy = 20_000;
    match.buy(root === 'armor' || root === 'speed' || root === 'maxHp' ? 'mutation' : 'tower', root);
    for (let rank=1; rank<=TIER2_MAX_LEVEL; rank+=1) match.buyTier2(root,parent);
    match.buyTier3(root,ultimate.id);
    const before = match.snapshot().players.human;
    assert.equal(before.tier3[root][ultimate.id], 1, `${ultimate.id} did not unlock`);
    if (ultimate.id === 'bioforgeProgram') for (const kind of ['chimera','abomination','hp','armor','speed']) match.buyBioforgeContract(kind);
    if (ultimate.id === 'commandOverride') { match.setPriority('manual'); }
    if (active.has(ultimate.id)) match.activateUltimate(ultimate.id,.5,'right');
    for (let tick=0; tick<320; tick+=1) match.step(.1);
    const after = match.snapshot().players.human;
    assert.ok(Number.isFinite(after.energy), `${ultimate.id} produced invalid Flux`);
    assert.ok(after.creeps.every((creep) => Number.isFinite(creep.hp) && Number.isFinite(creep.progress)), `${ultimate.id} produced invalid creep state`);
    results.push({ id:ultimate.id, root, active:active.has(ultimate.id), creeps:after.creeps.length, flux:Math.round(after.energy) });
  }
}
console.log(`PASS: ${results.length} Tier III Ultimates unlocked, activated where applicable, and simulated.`);
