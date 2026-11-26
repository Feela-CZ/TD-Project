import assert from 'node:assert/strict';
import { LiveMatch, UPGRADE_GROUPS, TIER2_FAMILIES, TIER3_FAMILIES } from '../dist/live.mjs';
import { upgradeBlock, upgradeCost } from '../web/upgrade-state.mjs';

let purchases=0;
for(const [groupIndex,group] of UPGRADE_GROUPS.entries()) {
  for(const [root] of group.nodes) {
    for(const [index,skill] of TIER2_FAMILIES[root].entries()) {
      const match=new LiveMatch(71,{botEnabled:false});
      match.players.human.energy=1000000;
      const check=(tier,item,choice=skill.id)=>upgradeBlock(match.snapshot(),{tier,root,choice,groupIndex,item,running:true});
      assert.match(check(2,{...skill,level:0,max:5}),/Unlock the basic upgrade/);
      const p=match.players.human;
      match.buy(root in p.tower?'tower':'mutation',root);
      for(let rank=0;rank<5;rank++) {
        assert.equal(check(2,{...skill,level:rank,max:5}), '');
        const before=p.energy, cost=upgradeCost(match.snapshot().players.human,2,skill.id);
        match.buyTier2(root,skill.id);
        assert.equal(p.tier2[root][skill.id],rank+1);
        assert.equal(before-p.energy,cost);purchases++;
      }
      const ultimate=TIER3_FAMILIES[root][index];
      assert.equal(check(3,{...ultimate,level:0,max:1}),'');
      const before=p.energy,price=upgradeCost(match.snapshot().players.human,3,ultimate.id);
      match.buyTier3(root,ultimate.id);
      assert.equal(p.tier3[root][ultimate.id],1);
      assert.equal(before-p.energy,price);purchases++;
      assert.equal(check(3,{...ultimate,level:1,max:1}),'Maximum rank');
      const other=TIER2_FAMILIES[root][(index+1)%3];
      for(let r=0;r<5;r++)match.buyTier2(root,other.id);
      const blocked=TIER2_FAMILIES[root][(index+2)%3];
      assert.match(check(2,{...blocked,level:0,max:5}),/two specializations/);
      const otherUltimate=TIER3_FAMILIES[root][(index+1)%3];
      assert.match(check(3,{...otherUltimate,level:0,max:1},other.id),/one Ultimate per category/);
    }
  }
  const m=new LiveMatch(81,{botEnabled:false});m.players.human.energy=100000;
  for(const [root] of group.nodes.slice(0,2))m.buy(root in m.players.human.tower?'tower':'mutation',root);
  const root=group.nodes[2][0];
  assert.match(upgradeBlock(m.snapshot(),{tier:1,root,groupIndex,item:{id:root,level:0,max:9},running:true}),/two basic upgrades/);
}
console.log(`PASS: mobile upgrade availability, all 27 Tier II paths and Ultimates, ${purchases} purchases, live prices and branch locks.`);
