import { UPGRADE_GROUPS, TIER2_FAMILIES, TIER3_FAMILIES, TIER1_MAX_LEVEL, TIER2_MAX_LEVEL, ULTIMATE_COST } from '../dist/live.mjs';
import { upgradeCost, upgradeBlock } from './upgrade-state.mjs';

export function createTouchUi({ snapshot, purchase, descriptions, icons, isRunning }) {
  const shell = document.createElement('section');
  shell.className = 'orbital-tree'; shell.hidden = true;
  shell.setAttribute('aria-label', 'Fortress upgrades');
  shell.innerHTML = `<header><div><small>FORTRESS SYSTEMS</small><h2 id="orbit-title">Offense · Tier I</h2></div><button data-close aria-label="Close upgrades">×</button></header><nav class="orbit-tabs" aria-label="Upgrade branch"></nav><div class="orbit-price"></div><div class="orbit-stage"></div><button class="orbit-back" hidden>↓ Tier I</button><p class="orbit-help">Tap to upgrade · Hold to inspect</p>`;
  document.querySelector('.arena-wrap').append(shell);
  const dialog = document.createElement('dialog'); dialog.className = 'skill-dialog';
  document.body.append(dialog);
  const toast = document.createElement('div'); toast.className = 'purchase-toast'; toast.setAttribute('role', 'status'); document.body.append(toast);
  const toolbar = document.createElement('nav'); toolbar.className = 'phone-toolbar'; toolbar.setAttribute('aria-label', 'Game controls');
  toolbar.innerHTML = '<button data-open>◉ Upgrades</button><button data-rival>⇄ Sector</button><button data-stats>▤ Overview</button>';
  document.querySelector('.game-stage').append(toolbar);
  const telemetry = document.createElement('div'); telemetry.className='phone-telemetry'; toolbar.before(telemetry);
  const dock=document.querySelector('#action-dock'), dockHome=dock.parentElement;
  const phone=matchMedia('(max-width:760px)');
  function layout() { if(phone.matches) {toolbar.after(dock);dock.classList.add('phone-actions');dock.classList.remove('panel');} else {dockHome.append(dock);dock.classList.remove('phone-actions');dock.classList.add('panel');} }
  phone.addEventListener('change',layout); layout();
  const restartButton=document.createElement('button');restartButton.textContent='Restart match';restartButton.className='overview-restart';restartButton.onclick=()=>{document.querySelector('#restart').click();document.body.classList.remove('overview-open');shell.hidden=true;};dockHome.append(restartButton);
  const closeOverview = document.createElement('button'); closeOverview.className = 'overview-close'; closeOverview.textContent = 'Close overview ×';
  document.querySelector('.left-panel').prepend(closeOverview);
  closeOverview.onclick = () => document.body.classList.remove('overview-open');
  const settings = document.createElement('label'); settings.className = 'confirm-setting';
  settings.innerHTML = '<input type="checkbox" checked> Confirm upgrade purchases';
  document.querySelector('.left-panel').append(settings);
  const mapSettings=document.querySelector('.settings'); dockHome.append(mapSettings);
  let confirmPurchases = true;
  try { confirmPurchases = localStorage.getItem('td-confirm-purchases') !== 'false'; } catch {}
  settings.firstElementChild.checked = confirmPurchases;
  settings.onchange = () => { confirmPurchases = settings.firstElementChild.checked; try { localStorage.setItem('td-confirm-purchases', String(confirmPurchases)); } catch {} };
  let groupIndex = 0, tier = 1, root = null, choice = null, current = [], signature = '', timer, press, suppressClick = false, toastTimer;
  const stage = shell.querySelector('.orbit-stage');
  const tabs = shell.querySelector('.orbit-tabs');
  tabs.innerHTML = UPGRADE_GROUPS.map((g,i) => `<button data-group="${i}">${g.title}</button>`).join('');
  function entries() {
    const p = snapshot().players.human, g = UPGRADE_GROUPS[groupIndex];
    if (tier === 1) return g.nodes.map(([id,label]) => ({ id, label, level: (id in p.tower ? p.tower : p.mutations)[id], max:TIER1_MAX_LEVEL, detail:descriptions[id].join(' '), icon:icons[id] }));
    if (tier === 2) return TIER2_FAMILIES[root].map((item,i) => ({ ...item, level:p.tier2[root][item.id], max:TIER2_MAX_LEVEL, icon:['✦','◎','◈'][i] }));
    const item = TIER3_FAMILIES[root][TIER2_FAMILIES[root].findIndex(c => c.id === choice)];
    return [{ ...item, level:p.tier3[root][item.id], max:1, icon:'✺' }];
  }
  function cost(item) { return upgradeCost(snapshot().players.human,tier,item.id); }
  function reason(item) {
    return upgradeBlock(snapshot(),{tier,root,choice,groupIndex,item,running:isRunning()});
  }
  function refresh() {
    const state=snapshot(), player=state.players.human;
    const text=`Next incursion ${Math.ceil(state.nextIncursionIn)}s · Interest ${Math.ceil(player.nextInterestIn)}s · Strain ${player.load}/${player.overloadCap}`;
    if(telemetry.textContent!==text) telemetry.textContent=text;
    toolbar.querySelector('[data-rival]').disabled = document.querySelector('#mode').value === 'solo';
    if (shell.hidden || press || dialog.open) return;
    current = entries();
    const next = JSON.stringify([tier,root,choice,groupIndex,current.map(i => [i.level,reason(i),cost(i)])]);
    if (next === signature) return; signature = next;
    shell.querySelector('#orbit-title').textContent = `${tier === 1 ? UPGRADE_GROUPS[groupIndex].title : UPGRADE_GROUPS[groupIndex].nodes.find(([id]) => id === root)[1]} · Tier ${['','I','II','III'][tier]}`;
    tabs.querySelectorAll('button').forEach((b,i) => b.setAttribute('aria-pressed', String(i === groupIndex)));
    shell.querySelector('.orbit-price').textContent = `Next upgrade · ${cost(current[0]) ?? 'MAX'} Flux`;
    stage.innerHTML = current.map((item,i) => `<article class="orbit-node"><button class="orbit-forward" data-forward="${i}" ${tier === 3 ? 'hidden' : ''}>↑ <span>Tier ${tier === 1 ? 'II' : 'III'}</span></button><button class="skill-orb ${reason(item) ? 'unavailable' : ''}" data-skill="${i}" aria-label="${item.label}, rank ${item.level} of ${item.max}" style="--rank:${item.level/item.max*100}%"><span class="orb-icon" aria-hidden="true">${item.icon}</span><strong>${item.level} / ${item.max}</strong></button><span class="orb-name">${item.label}</span><small class="orb-state">${reason(item) || 'Upgrade available'}</small><button class="orb-info" data-info="${i}" aria-label="Describe ${item.label}">ⓘ</button></article>`).join('');
    const back = shell.querySelector('.orbit-back'); back.hidden = tier === 1; back.textContent = `↓ Tier ${tier === 2 ? 'I' : 'II'}`;
  }
  function transition(action, backwards = false) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const old = stage.cloneNode(true); old.removeAttribute('id'); old.classList.add('orbit-outgoing'); old.inert = true; stage.parentElement.append(old);
    action(); signature = ''; refresh();
    if (!reduced) { old.animate([{transform:'translateY(0)',opacity:1},{transform:`translateY(${backwards ? -110 : 110}%)`,opacity:0}],{duration:220}).finished.then(() => old.remove()); stage.animate([{transform:`translateY(${backwards ? 80 : -80}%)`,opacity:0},{transform:'translateY(0)',opacity:1}],{duration:280,easing:'ease-out'}); } else old.remove();
  }
  function open() { shell.hidden = false; document.body.classList.remove('overview-open'); refresh(); if(!matchMedia('(prefers-reduced-motion: reduce)').matches) shell.animate([{opacity:0,transform:'translateY(35px)'},{opacity:1,transform:'translateY(0)'}],{duration:240,easing:'ease-out'}); shell.querySelector('[data-close]').focus({preventScroll:true}); }
  function show(item, inspect = false) {
    const blocked = reason(item);
    if (!inspect && !blocked && !confirmPurchases) return buy(item);
    dialog.innerHTML = `<form method="dialog"><small>${inspect ? 'SKILL INTELLIGENCE' : 'CONFIRM UPGRADE'}</small><h2></h2><p class="skill-description"></p><p class="skill-cost"></p><div><button value="cancel">${inspect || blocked ? 'Close' : 'Cancel'}</button>${!inspect && !blocked ? '<button type="button" class="primary" data-confirm>Upgrade</button>' : ''}</div></form>`;
    dialog.querySelector('h2').textContent = item.label;
    dialog.querySelector('.skill-description').textContent = item.detail;
    dialog.querySelector('.skill-cost').textContent = blocked || `Rank ${item.level+1} / ${item.max} · ${cost(item)} Flux`;
    const confirm = dialog.querySelector('[data-confirm]'); if (confirm) confirm.onclick = () => { dialog.close(); buy(item); };
    dialog.showModal();
  }
  function buy(item) {
    const fresh=entries().find(entry=>entry.id===item.id);
    if (!fresh) return;
    if (reason(fresh)) { show(fresh, true); return; }
    purchase(tier, tier === 1 ? item.id : root, item.id);
    refresh(); toast.textContent = snapshot().message; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'),2500);
  }
  shell.addEventListener('pointerdown', e => { const b=e.target.closest('[data-skill]'); if (!b) return; suppressClick=false; press={x:e.clientX,y:e.clientY}; timer=setTimeout(() => { suppressClick=true; show(current[Number(b.dataset.skill)],true); },500); });
  const cancelHold = () => { clearTimeout(timer); press=null; };
  shell.addEventListener('pointermove', e => { if(press && Math.hypot(e.clientX-press.x,e.clientY-press.y)>10) { cancelHold(); suppressClick=true; } });
  window.addEventListener('pointerup',cancelHold); window.addEventListener('pointercancel',cancelHold); shell.addEventListener('contextmenu',e => e.preventDefault());
  dialog.addEventListener('close',()=>{cancelHold();refresh();});
  shell.addEventListener('click', e => {
    const b=e.target.closest('button'); if(!b) return;
    if(b.hasAttribute('data-close')) { shell.hidden=true; return; }
    if(b.dataset.group !== undefined) { transition(() => {groupIndex=Number(b.dataset.group);tier=1;root=null;}); return; }
    if(b.dataset.info !== undefined) { show(current[Number(b.dataset.info)],true); return; }
    if(b.dataset.forward !== undefined) { const item=current[Number(b.dataset.forward)]; transition(() => {if(tier===1) root=item.id; else choice=item.id;tier++;}); return; }
    if(b.classList.contains('orbit-back')) { transition(() => tier--,true); return; }
    if(b.dataset.skill !== undefined) { if(suppressClick) {suppressClick=false;return;} show(current[Number(b.dataset.skill)]); }
  });
  toolbar.querySelector('[data-open]').onclick=open;
  toolbar.querySelector('[data-rival]').onclick=() => {shell.hidden=true;document.querySelector('#portrait-map').click();};
  toolbar.querySelector('[data-stats]').onclick=() => {shell.hidden=true;document.body.classList.toggle('overview-open');};
  return {open,refresh};
}
