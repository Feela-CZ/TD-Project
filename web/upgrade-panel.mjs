import { UPGRADE_GROUPS, TIER2_FAMILIES, TIER3_FAMILIES, TIER1_MAX_LEVEL, TIER2_MAX_LEVEL } from '../dist/live.mjs';
import { upgradeCost, upgradeBlock } from './upgrade-state.mjs';
import { BASIC_UPGRADES, UPGRADE_EFFECTS } from './upgrade-copy.mjs';

const makeBasic = ([id]) => ({ id, label: BASIC_UPGRADES[id].name, tier: 1, max: TIER1_MAX_LEVEL });

export function createUpgradePanel({ panel, sheet, desktop, purchase }) {
  const mobile = matchMedia('(max-width: 760px)');
  const tree = panel.querySelector('.upgrade-tree');
  const families = panel.querySelector('[data-families]');
  const specializations = panel.querySelector('[data-specializations]');
  const ultimates = panel.querySelector('[data-ultimates]');
  const ultimateLinks = panel.querySelector('[data-ultimate-links]');
  const specializationLinks = panel.querySelector('[data-specialization-links]');
  const groupButtons = panel.querySelectorAll('[data-group]');
  const heading = panel.querySelector('[data-upgrade-heading]');
  const balance = panel.querySelector('[data-panel-flux]');
  const mutationHint = panel.querySelector('[data-mutation-hint]');
  const detail = panel.querySelector('.upgrade-detail');
  const prompt = detail.querySelector('[data-upgrade-prompt]');
  const detailBody = detail.querySelector('[data-upgrade-details]');
  const name = detail.querySelector('[data-upgrade-name]');
  const kind = detail.querySelector('[data-upgrade-kind]');
  const effect = detail.querySelector('[data-upgrade-effect]');
  const numbers = detail.querySelector('.upgrade-numbers');
  const numbersText = numbers.querySelector('p');
  const instruction = detail.querySelector('[data-upgrade-instruction]');
  const feedback = detail.querySelector('[data-upgrade-feedback]');

  const firstRoots = UPGRADE_GROUPS.map(group => group.nodes[0][0]);
  const roots = [...firstRoots];
  let groupIndex = 0;
  let snapshot, running, drawnGroup, drawnRoot;
  let selected = null;
  let armed = false;
  let basics = [];
  let paths = [];
  let finalUpgrades = [];
  let nodes = new Map();
  let edges = new Map();

  const currentRoot = () => roots[groupIndex];
  const player = () => snapshot.players.human;

  function text(element, copy) {
    if (element.textContent !== copy) element.textContent = copy;
  }

  function rank(offer) {
    const p = player();
    if (offer.tier === 1) return (offer.id in p.tower ? p.tower : p.mutations)[offer.id];
    return (offer.tier === 2 ? p.tier2 : p.tier3)[currentRoot()][offer.id];
  }

  function availability(offer, level = rank(offer)) {
    return upgradeBlock(snapshot, {
      tier: offer.tier,
      root: offer.tier === 1 ? offer.id : currentRoot(),
      choice: offer.choice,
      groupIndex,
      item: { ...offer, level },
      running
    });
  }

  function priceLabel(offer) {
    const price = upgradeCost(player(), offer.tier, offer.id);
    return price === 0 ? 'Free' : price === null ? '—' : `${price} Flux`;
  }

  function buildNodes(container, offers) {
    container.replaceChildren(...offers.map(offer => {
      const button = document.createElement('button');
      const caption = document.createElement('span');
      const status = document.createElement('small');
      button.type = 'button';
      button.className = 'tree-node';
      button.dataset.node = offer.id;
      caption.textContent = offer.label;
      button.append(caption, status);
      nodes.set(offer.id, { button, status, offer });
      return button;
    }));
  }

  function buildEdges(container, offers) {
    container.replaceChildren(...offers.map((offer, column) => {
      const edge = document.createElement('span');
      edge.className = 'tree-edge';
      edge.dataset.column = column;
      edge.dataset.link = offer.id;
      edges.set(offer.id, edge);
      return edge;
    }));
  }

  function buildTree() {
    const root = currentRoot();
    if (drawnGroup !== groupIndex) {
      drawnGroup = groupIndex;
      nodes = new Map();
      basics = UPGRADE_GROUPS[groupIndex].nodes.map(makeBasic);
      buildNodes(families, basics);
      groupButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === groupIndex)));
      mutationHint.hidden = groupIndex !== 1;
    }
    if (drawnRoot === root) return;
    drawnRoot = root;
    for (const offer of [...paths, ...finalUpgrades]) nodes.delete(offer.id);
    edges = new Map();
    tree.dataset.rootColumn = basics.findIndex(offer => offer.id === root);
    paths = TIER2_FAMILIES[root].map(offer => ({ ...offer, tier: 2, max: TIER2_MAX_LEVEL }));
    finalUpgrades = TIER3_FAMILIES[root].map((offer, index) => ({ ...offer, tier: 3, max: 1, choice: paths[index].id }));
    buildNodes(specializations, paths);
    buildNodes(ultimates, finalUpgrades);
    buildEdges(ultimateLinks, finalUpgrades);
    buildEdges(specializationLinks, paths);
    const trunk = document.createElement('span');
    trunk.className = 'tree-trunk';
    specializationLinks.append(trunk);
  }

  function updateDetail(offer, level, reason) {
    let message = reason;
    if (level === offer.max) message = '';
    else if (!reason) {
      const action = level ? 'upgrade' : 'unlock';
      const input = mobile.matches ? 'Tap' : 'Click';
      const price = priceLabel(offer);
      message = armed ? `${input} again to ${action} · ${price}` : `${level ? 'Next rank' : 'Unlock'} · ${price}`;
    }
    text(instruction, message);
    instruction.toggleAttribute('data-buyable', !reason);
  }

  function refresh(nextSnapshot, active) {
    snapshot = nextSnapshot;
    running = active;
    buildTree();
    text(balance, `${Math.floor(player().energy)} Flux`);
    for (const [id, { button, status, offer }] of nodes) {
      const level = rank(offer);
      const reason = availability(offer, level);
      const isSelected = id === selected;
      if (isSelected && reason) armed = false;
      if (button.getAttribute('aria-pressed') !== String(isSelected)) button.setAttribute('aria-pressed', String(isSelected));
      if (isSelected) button.setAttribute('aria-describedby', 'selected-upgrade-description');
      else button.removeAttribute('aria-describedby');
      button.toggleAttribute('data-tree-root', offer.tier === 1 && id === currentRoot());
      button.toggleAttribute('data-owned', level > 0);
      button.toggleAttribute('data-locked', !level && Boolean(reason));
      button.toggleAttribute('data-ready', isSelected && armed && !reason);
      const label = level === offer.max ? (offer.tier === 3 ? 'Unlocked' : 'Max rank')
        : level ? `${level} / ${offer.max}` : reason ? 'Locked' : priceLabel(offer);
      text(status, label);
      edges.get(id)?.toggleAttribute('data-owned', level > 0);
      edges.get(id)?.toggleAttribute('data-selected', isSelected);
      if (isSelected) updateDetail(offer, level, reason);
    }
    specializationLinks.toggleAttribute('data-owned', paths.some(offer => rank(offer) > 0));
  }

  function clearSelection() {
    selected = null;
    armed = false;
    prompt.hidden = false;
    detailBody.hidden = true;
    numbers.open = false;
    detail.removeAttribute('data-tier');
    text(feedback, '');
  }

  function showDetail(offer) {
    const basic = BASIC_UPGRADES[offer.id];
    const summary = basic?.effect ?? UPGRADE_EFFECTS[offer.id];
    const exact = basic?.details ?? offer.detail;
    selected = offer.id;
    armed = true;
    prompt.hidden = true;
    detailBody.hidden = false;
    detail.dataset.tier = offer.tier;
    text(name, offer.label);
    text(kind, offer.kind === 'active' || offer.id === 'overdrive' ? 'Active' : '');
    text(effect, summary);
    numbers.open = false;
    numbers.hidden = !exact || exact === summary;
    text(numbersText, exact ?? '');
    text(feedback, '');
  }

  function buy(offer) {
    const previous = rank(offer);
    if (availability(offer, previous)) return;
    const price = priceLabel(offer);
    armed = false;
    const error = purchase(offer.tier, currentRoot(), offer.id);
    const level = rank(offer);
    if (level === previous) {
      text(feedback, error);
      return;
    }
    const action = previous ? `Upgraded to rank ${level}` : 'Unlocked';
    text(feedback, `${action} · ${price}`);
  }

  panel.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-close-upgrade')) return close();
    if (button.dataset.group !== undefined) {
      const index = Number(button.dataset.group);
      if (index === groupIndex) return;
      groupIndex = index;
      clearSelection();
      refresh(snapshot, running);
      return;
    }
    const offer = nodes.get(button.dataset.node)?.offer;
    if (!offer) return;
    if (selected === offer.id) {
      if (availability(offer)) return;
      if (armed) return buy(offer);
      armed = true;
      text(feedback, '');
      refresh(snapshot, running);
      return;
    }
    if (offer.tier === 1) roots[groupIndex] = offer.id;
    showDetail(offer);
    refresh(snapshot, running);
  });

  panel.addEventListener('keydown', event => {
    if (event.repeat && event.key === 'Enter' && event.target.matches('.tree-node')) event.preventDefault();
  });

  function open() {
    if (mobile.matches && !sheet.open) sheet.showModal();
    heading.focus();
  }

  function close() {
    if (sheet.open) sheet.close();
  }

  function layout() {
    close();
    armed = false;
    (mobile.matches ? sheet : desktop).append(panel);
    if (snapshot) refresh(snapshot, running);
  }

  function reset() {
    close();
    groupIndex = 0;
    firstRoots.forEach((root, index) => { roots[index] = root; });
    clearSelection();
  }

  sheet.addEventListener('close', () => {
    armed = false;
    if (snapshot) refresh(snapshot, running);
  });
  mobile.addEventListener('change', layout);
  layout();
  return { open, close, refresh, reset };
}
