import { UPGRADE_GROUPS, TIER2_FAMILIES, TIER3_FAMILIES, TIER1_MAX_LEVEL, TIER2_MAX_LEVEL, controlNexusRewardFloor } from '../dist/live.mjs';
import { upgradeAvailability } from './upgrade-state.mjs';
import { UPGRADE_DETAILS, UPGRADE_EFFECTS } from './upgrade-copy.mjs';

const makeBasic = ([id, label]) => ({ id, label, tier: 1, max: TIER1_MAX_LEVEL });
const HOLD_DELAY = 550;
const HOLD_TOLERANCE = 10;
const SWIPE_THRESHOLD = 44;
const TIER_LABELS = ['Tier I · Basic upgrade', 'Tier II · Specialization', 'Tier III · Ultimate'];

export function createUpgradePanel({ panel, sheet, desktop, purchase }) {
  const desktopLayout = matchMedia('(min-width: 1120px) and (min-height: 660px)');
  const tree = panel.querySelector('.upgrade-tree');
  const families = panel.querySelector('[data-families]');
  const specializations = panel.querySelector('[data-specializations]');
  const ultimates = panel.querySelector('[data-ultimates]');
  const ultimateLinks = panel.querySelector('[data-ultimate-links]');
  const specializationLinks = panel.querySelector('[data-specialization-links]');
  const familyTile = panel.querySelector('.family-tile');
  const familyName = familyTile.querySelector('[data-family-name]');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const heading = panel.querySelector('[data-upgrade-heading]');
  const balance = panel.querySelector('[data-panel-flux]');
  const detail = panel.querySelector('.upgrade-detail');
  const name = detail.querySelector('[data-upgrade-name]');
  const kind = detail.querySelector('[data-upgrade-kind]');
  const effect = detail.querySelector('[data-upgrade-effect]');
  const cost = detail.querySelector('[data-upgrade-cost]');
  const feedback = detail.querySelector('[data-upgrade-feedback]');
  const description = panel.querySelector('#upgrade-description');
  const descriptionTitle = description.querySelector('#upgrade-description-title');
  const descriptionTier = description.querySelector('[data-description-tier]');
  const descriptionLead = description.querySelector('[data-description-lead]');
  const descriptionRanks = description.querySelector('.upgrade-description-ranks');
  const descriptionFacts = description.querySelector('.upgrade-description-facts');
  const descriptionRequirement = description.querySelector('[data-description-requirement]');

  const firstRoots = UPGRADE_GROUPS.map(group => group.nodes[0][0]);
  const roots = [...firstRoots];
  let groupIndex = 0;
  let snapshot, running, drawnGroup, drawnRoot;
  let selected = null;
  let hold = null;
  let suppressPointerClick = false;
  let swipe = null;
  let familyTransition = null;
  const queuedSteps = [];
  let descriptionTrigger = null;
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

  function availability(offer, level = rank(offer), active = running) {
    return upgradeAvailability(snapshot, {
      tier: offer.tier,
      root: offer.tier === 1 ? offer.id : currentRoot(),
      choice: offer.choice,
      groupIndex,
      item: { ...offer, level },
      running: active
    });
  }

  function priceLabel(price) {
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
      button.setAttribute('aria-keyshortcuts', 'Shift+Enter');
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
      const group = UPGRADE_GROUPS[groupIndex];
      basics = group.nodes.map(makeBasic);
      buildNodes(families, basics);
      panel.dataset.family = group.title.toLowerCase();
      text(familyName, group.title);
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

  function updateDetail(offer, level, availability) {
    const { locked, missingFlux, price, reason } = availability;
    const label = priceLabel(price);
    text(cost, level === offer.max ? '' : locked ? reason : missingFlux ? `${label} · ${reason}` : label);
    cost.toggleAttribute('data-buyable', !reason);
    if (offer.id === 'rewardFloor') {
      const floor = controlNexusRewardFloor(level);
      const next = level === offer.max ? '' : ` → ${controlNexusRewardFloor(level + 1)}`;
      text(effect, `Minimum kill reward ${floor}${next} Flux`);
    }
  }

  function refresh(nextSnapshot, active) {
    snapshot = nextSnapshot;
    running = active;
    buildTree();
    text(balance, `${Math.floor(player().energy)} Flux`);
    for (const [id, { button, status, offer }] of nodes) {
      const level = rank(offer);
      const state = availability(offer, level, true);
      const isSelected = id === selected;
      if (button.getAttribute('aria-pressed') !== String(isSelected)) button.setAttribute('aria-pressed', String(isSelected));
      if (isSelected) button.setAttribute('aria-describedby', 'selected-upgrade-description selected-upgrade-cost');
      else button.removeAttribute('aria-describedby');
      button.toggleAttribute('data-tree-root', offer.tier === 1 && id === currentRoot());
      button.toggleAttribute('data-owned', level > 0);
      button.toggleAttribute('data-locked', !level && state.locked);
      button.toggleAttribute('data-unaffordable', state.missingFlux > 0);
      button.toggleAttribute('data-ready', isSelected && running && !state.reason);
      const label = level === offer.max ? (offer.tier === 3 ? 'Unlocked' : 'Max rank')
        : level ? `${level} / ${offer.max}` : state.locked ? 'Locked' : priceLabel(state.price);
      text(status, label);
      edges.get(id)?.toggleAttribute('data-owned', level > 0);
      edges.get(id)?.toggleAttribute('data-selected', isSelected);
      if (isSelected) updateDetail(offer, level, state);
    }
    specializationLinks.toggleAttribute('data-owned', paths.some(offer => rank(offer) > 0));
  }

  function clearSelection() {
    selected = null;
    detail.hidden = true;
    detail.removeAttribute('data-tier');
    text(feedback, '');
  }

  function applyFamilyStep(step) {
    const focused = document.activeElement;
    const restoreFocus = tree.contains(focused) || detail.contains(focused);
    const count = UPGRADE_GROUPS.length;
    groupIndex = (groupIndex + step + count) % count;
    clearSelection();
    refresh(snapshot, running);
    if (restoreFocus) {
      panel.querySelector(`[data-family-step="${step}"]`).focus({ preventScroll: true });
    }
  }

  function cancelFamilyTransition() {
    const transition = familyTransition;
    familyTransition = null;
    queuedSteps.length = 0;
    transition?.animations.forEach(animation => animation.cancel());
  }

  async function stepFamily(step) {
    if (familyTransition) {
      queuedSteps.push(step);
      return;
    }
    cancelHold();
    if (reduceMotion.matches) {
      applyFamilyStep(step);
      return;
    }

    const transition = { animations: [] };
    familyTransition = transition;
    const play = (frames, duration) => {
      transition.animations = [tree, familyTile].map(element =>
        element.animate(frames, { duration, easing: 'cubic-bezier(.2,.68,.25,1)', fill: 'both' }));
      return Promise.all(transition.animations.map(animation => animation.finished));
    };

    try {
      await play([{ opacity: 1, transform: 'translateX(0)' },
        { opacity: 0, transform: `translateX(${-step * 30}px)` }], 105);
      if (familyTransition !== transition) return;
      applyFamilyStep(step);
      transition.animations.forEach(animation => animation.cancel());
      await play([{ opacity: 0, transform: `translateX(${step * 30}px)` },
        { opacity: 1, transform: 'translateX(0)' }], 190);
    } catch (error) {
      if (error.name !== 'AbortError') throw error;
    } finally {
      if (familyTransition === transition) {
        familyTransition = null;
        transition.animations.forEach(animation => animation.cancel());
        const next = queuedSteps.shift();
        if (next) void stepFamily(next);
      }
    }
  }

  function showDetail(offer) {
    selected = offer.id;
    detail.hidden = false;
    detail.dataset.tier = offer.tier;
    text(name, offer.label);
    text(kind, offer.kind === 'active' || offer.id === 'overdrive' ? 'Active' : '');
    text(effect, UPGRADE_EFFECTS[offer.id]);
    text(feedback, '');
  }

  function renderDescriptionDetails(offer) {
    const { columns = [], rows = [], facts = [] } = UPGRADE_DETAILS[offer.id];
    descriptionRanks.hidden = !rows.length;
    descriptionFacts.hidden = !facts.length;
    const cell = (tag, value) => {
      const element = document.createElement(tag);
      element.textContent = value;
      return element;
    };
    descriptionRanks.tHead.rows[0].replaceChildren(...columns.map(label => {
      const heading = cell('th', label);
      heading.scope = 'col';
      return heading;
    }));
    const currentRank = rank(offer);
    descriptionRanks.tBodies[0].replaceChildren(...rows.map(([first, ...values]) => {
      const row = document.createElement('tr');
      const label = cell('th', first);
      label.scope = 'row';
      row.append(label, ...values.map(value => cell('td', value)));
      row.toggleAttribute('data-current-rank', columns[0] === 'Rank' && first === currentRank);
      return row;
    }));
    descriptionFacts.replaceChildren(...facts.map(([label, value]) => {
      const row = document.createElement('div');
      row.append(cell('dt', label), cell('dd', value));
      return row;
    }));
  }

  function openDescription(trigger, returnFocus = trigger) {
    const offer = nodes.get(trigger?.dataset.node)?.offer;
    if (!offer || description.open || familyTransition) return;
    cancelHold();
    const active = offer.id === 'overdrive' || offer.kind === 'active';
    const requirement = offer.tier === 2 ? `${nodes.get(currentRoot()).offer.label} at rank 1`
      : offer.tier === 3 ? `${nodes.get(offer.choice).offer.label} at rank ${TIER2_MAX_LEVEL}` : '';
    text(descriptionTier, TIER_LABELS[offer.tier - 1] + (active ? ' · Active' : ''));
    text(descriptionTitle, offer.label);
    text(descriptionLead, UPGRADE_EFFECTS[offer.id]);
    renderDescriptionDetails(offer);
    text(descriptionRequirement, requirement && `Requires ${requirement}.`);
    descriptionRequirement.hidden = !requirement;
    description.dataset.tier = offer.tier;
    descriptionTrigger = returnFocus;
    returnFocus.focus({ preventScroll: true });
    description.showModal();
  }

  function cancelHold() {
    if (!hold) return;
    clearTimeout(hold.timer);
    hold = null;
  }

  document.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressPointerClick = false;
    cancelHold();
    const onSelection = panel.contains(event.target) || (sheet.open && event.target === sheet);
    swipe = onSelection && !description.open ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
    const trigger = event.target.closest('.tree-node');
    if (!trigger || !tree.contains(trigger) || description.open) return;
    const timer = setTimeout(() => {
      if (!tree.contains(trigger)) {
        cancelHold();
        return;
      }
      suppressPointerClick = true;
      openDescription(trigger);
    }, HOLD_DELAY);
    hold = { id: event.pointerId, x: event.clientX, y: event.clientY, timer };
  }, true);

  document.addEventListener('pointermove', event => {
    if (hold?.id !== event.pointerId || Math.hypot(event.clientX - hold.x, event.clientY - hold.y) <= HOLD_TOLERANCE) return;
    cancelHold();
    suppressPointerClick = true;
  }, true);
  for (const type of ['pointerup', 'pointercancel']) {
    document.addEventListener(type, event => {
      if (hold?.id === event.pointerId) cancelHold();
      if (swipe?.id !== event.pointerId) return;
      const dx = event.clientX - swipe.x;
      const dy = event.clientY - swipe.y;
      swipe = null;
      if (type === 'pointerup' && !description.open &&
          Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > 1.35 * Math.abs(dy)) {
        suppressPointerClick = true;
        void stepFamily(dx < 0 ? 1 : -1);
      }
    }, true);
  }
  document.addEventListener('click', event => {
    if (!suppressPointerClick || event.detail === 0) return;
    suppressPointerClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  tree.addEventListener('contextmenu', event => {
    if ((hold || suppressPointerClick) && event.target.closest('.tree-node')) event.preventDefault();
  });
  window.addEventListener('blur', cancelHold);

  description.querySelector('[data-close-description]').addEventListener('click', () => description.close());

  function buy(offer) {
    const previous = rank(offer);
    const state = availability(offer, previous);
    if (state.reason) return;
    const price = priceLabel(state.price);
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
    if (button.hasAttribute('data-open-description')) return openDescription(nodes.get(selected)?.button, button);
    if (button.dataset.familyStep) {
      void stepFamily(Number(button.dataset.familyStep));
      return;
    }
    if (familyTransition) return;
    const offer = nodes.get(button.dataset.node)?.offer;
    if (!offer) return;
    if (selected === offer.id) return buy(offer);
    if (offer.tier === 1) roots[groupIndex] = offer.id;
    showDetail(offer);
    refresh(snapshot, running);
  });

  panel.addEventListener('keydown', event => {
    if (!description.open && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault();
      if (!event.repeat) void stepFamily(event.key === 'ArrowRight' ? 1 : -1);
      return;
    }
    if (event.key !== 'Enter' || !event.target.matches('.tree-node')) return;
    if (event.repeat || event.shiftKey) event.preventDefault();
    if (event.shiftKey && !event.repeat) openDescription(event.target);
  });

  function open() {
    if (!desktopLayout.matches && !sheet.open) sheet.showModal();
    heading.focus({ preventScroll: true });
  }

  function close() {
    cancelHold();
    swipe = null;
    cancelFamilyTransition();
    if (description.open) description.close();
    if (sheet.open) sheet.close();
  }

  function layout() {
    const wasOpen = sheet.open;
    const detailsOpen = description.open;
    const focused = panel.contains(document.activeElement) ? document.activeElement : null;
    cancelHold();
    swipe = null;
    cancelFamilyTransition();
    if (detailsOpen) description.close();
    if (wasOpen) sheet.close();
    (desktopLayout.matches ? desktop : sheet).append(panel);
    if (!desktopLayout.matches && (focused || detailsOpen)) sheet.showModal();
    if (detailsOpen) {
      (descriptionTrigger?.isConnected ? descriptionTrigger : heading).focus({ preventScroll: true });
      description.showModal();
    } else if (focused || wasOpen) (focused ?? heading).focus({ preventScroll: true });
    if (snapshot) refresh(snapshot, running);
  }

  function reset() {
    close();
    groupIndex = 0;
    firstRoots.forEach((root, index) => { roots[index] = root; });
    clearSelection();
  }

  sheet.addEventListener('close', () => {
    cancelHold();
    swipe = null;
    if (!sheet.open) cancelFamilyTransition();
  });
  desktopLayout.addEventListener('change', layout);
  layout();
  return { open, close, refresh, reset };
}
