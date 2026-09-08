import { UPGRADE_GROUPS, TIER2_MAX_LEVEL, ULTIMATE_COST } from '../dist/live.mjs';

export function upgradeCost(player, tier, id) {
  return tier === 1 ? player.nextTier1Cost : tier === 2 ? player.nextTier2Cost : id === 'avariceEngine' ? 0 : ULTIMATE_COST;
}

export function upgradeBlock(state, { tier, root, choice, groupIndex, item, running }) {
  const p=state.players.human, group=UPGRADE_GROUPS[groupIndex];
  if (item.level >= item.max) return 'Maximum rank';
  if (tier===1 && !item.level && group.nodes.filter(([id])=>(id in p.tower?p.tower:p.mutations)[id]>0).length>=2) return 'Two paths already chosen';
  if (tier===2) {
    if (!(root in p.tower?p.tower:p.mutations)[root]) return 'Requires Tier I rank 1';
    if (!item.level && Object.values(p.tier2[root]).filter(Boolean).length>=2) return 'Two paths already chosen';
  }
  if (tier===3) {
    if(p.tier2[root][choice]<TIER2_MAX_LEVEL) return 'Requires matching Tier II rank 5';
    if(group.nodes.some(([id])=>Object.values(p.tier3[id]).some(Boolean))) return 'One Ultimate per branch';
  }
  if(state.result) return 'Match finished';
  if(!running) return 'Start the match to upgrade';
  const price=upgradeCost(p,tier,item.id);
  if(price===null) return 'No upgrades available';
  if(p.energy<price) return 'Insufficient Flux';
  return '';
}
