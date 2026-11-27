import { UPGRADE_GROUPS, TIER2_MAX_LEVEL, ULTIMATE_COST } from '../dist/live.mjs';

export function upgradeCost(player, tier, id) {
  return tier === 1 ? player.nextTier1Cost : tier === 2 ? player.nextTier2Cost : id === 'avariceEngine' ? 0 : ULTIMATE_COST;
}

function upgradeLock(state, { tier, root, choice, groupIndex, item, running }) {
  const p=state.players.human, group=UPGRADE_GROUPS[groupIndex];
  if (item.level >= item.max) return 'Maximum rank';
  if (tier===1 && !item.level && group.nodes.filter(([id])=>(id in p.tower?p.tower:p.mutations)[id]>0).length>=2) return 'You can unlock two basic upgrades per category.';
  if (tier===2) {
    if (!(root in p.tower?p.tower:p.mutations)[root]) return 'Unlock the basic upgrade first.';
    if (!item.level && Object.values(p.tier2[root]).filter(Boolean).length>=2) return 'You can unlock two specializations per basic upgrade.';
  }
  if (tier===3) {
    if(p.tier2[root][choice]<TIER2_MAX_LEVEL) return `Reach rank ${TIER2_MAX_LEVEL} in this specialization first.`;
    if(group.nodes.some(([id])=>Object.values(p.tier3[id]).some(Boolean))) return 'You can unlock one Ultimate per category.';
  }
  if(state.result) return 'Match finished';
  if(!running) return 'Start the match to buy upgrades.';
  return '';
}

export function upgradeAvailability(state, offer) {
  const player = state.players.human;
  const price = upgradeCost(player, offer.tier, offer.item.id);
  const lock = upgradeLock(state, offer) || (price === null ? 'No upgrades available' : '');
  const missingFlux = lock ? 0 : Math.max(0, Math.ceil(price - player.energy));
  const reason = lock || (missingFlux > 0 ? `Need ${missingFlux} more Flux.` : '');
  return { price, locked: Boolean(lock), missingFlux, reason };
}

export function upgradeBlock(state, offer) {
  return upgradeAvailability(state, offer).reason;
}
