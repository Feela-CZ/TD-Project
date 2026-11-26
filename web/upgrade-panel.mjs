import { UPGRADE_GROUPS, TIER2_FAMILIES, TIER3_FAMILIES, TIER1_MAX_LEVEL, TIER2_MAX_LEVEL } from '../dist/live.mjs';
import { upgradeCost, upgradeBlock } from './upgrade-state.mjs';
import { BASIC_UPGRADES, GROUP_COPY, UPGRADE_EFFECTS } from './upgrade-copy.mjs';

export function createUpgradePanel({ panel, sheet, desktop, purchase }) {
  const mobile = matchMedia('(max-width: 760px)');
  const families = panel.querySelector('[data-families]');
  const specializations = panel.querySelector('[data-specializations]');
  const paths = panel.querySelector('.upgrade-paths');
  const baseOffer = panel.querySelector('[data-base-offer]');
  const details = panel.querySelector('[data-upgrade-details]');
  const feedback = panel.querySelector('[data-upgrade-feedback]');
  const confirmation = panel.querySelector('[data-confirmation]');
  const confirmText = confirmation.querySelector('p');
  const confirmPreference = panel.querySelector('[data-confirm-preference]');
  const groupButtons = [...panel.querySelectorAll('[data-group]')];

  let groupIndex = 0;
  let root = UPGRADE_GROUPS[0].nodes[0][0];
  let choice = null;
  let snapshot, running, basicSelection, pathSelection, pending;
  try { confirmPreference.checked = localStorage.getItem('td-confirm-purchases') !== 'false'; } catch {}
  confirmPreference.addEventListener('change', () => {
    try { localStorage.setItem('td-confirm-purchases', String(confirmPreference.checked)); } catch {}
  });

  const group = () => UPGRADE_GROUPS[groupIndex];
  const rootLabel = () => BASIC_UPGRADES[root].name;
  const state = () => snapshot.players.human;
  const rootRank = id => (id in state().tower ? state().tower : state().mutations)[id];

  function offers() {
    const result = [{ id: root, label: rootLabel(), tier: 1, level: rootRank(root), max: TIER1_MAX_LEVEL }];
    if (choice) {
      const index = TIER2_FAMILIES[root].findIndex(item => item.id === choice);
      const specialization = TIER2_FAMILIES[root][index];
      const ultimate = TIER3_FAMILIES[root][index];
      result.push({ ...specialization, tier: 2, level: state().tier2[root][choice], max: TIER2_MAX_LEVEL });
      result.push({ ...ultimate, tier: 3, level: state().tier3[root][ultimate.id], max: 1 });
    }
    return result;
  }

  function block(offer) {
    return upgradeBlock(snapshot, { tier: offer.tier, root, choice, groupIndex, item: offer, running });
  }

  function priceLabel(offer) {
    const price = upgradeCost(state(), offer.tier, offer.id);
    return price === 0 ? 'Free' : price === null ? 'Unavailable' : `${price} Flux`;
  }

  function setFeedback(message) {
    if (feedback.textContent !== message) feedback.textContent = message;
  }

  function clearConfirmation() {
    pending = null;
    confirmation.hidden = true;
    confirmText.textContent = '';
  }

  function makeOffer(offer, effect, numbers) {
    const type = offer.tier === 3 ? 'Ultimate' : '';
    const timing = offer.kind === 'active' || offer.id === 'overdrive' ? 'Active' : '';
    const math = numbers && numbers !== effect ? `<details class="upgrade-numbers"><summary>Details</summary><p>${numbers}</p></details>` : '';
    return `<article class="upgrade-offer" data-offer="${offer.tier}">
      <div class="offer-heading"><h3>${offer.label}</h3><span>${[type, timing].filter(Boolean).join(' · ')}</span></div>
      <p>${effect}</p>
      ${math}
      <button type="button" data-buy="${offer.tier}" aria-describedby="offer-status-${offer.tier}"></button>
      <span id="offer-status-${offer.tier}" class="offer-status"></span>
    </article>`;
  }

  function rebuildBasics(offer) {
    groupButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === groupIndex)));
    text(panel.querySelector('[data-group-hint]'), GROUP_COPY[groupIndex]);
    families.innerHTML = group().nodes.map(([id]) => `<button type="button" data-family="${id}" aria-pressed="${id === root}">${BASIC_UPGRADES[id].name}<small></small></button>`).join('');
    specializations.innerHTML = TIER2_FAMILIES[root].map(item => `<button type="button" data-specialization="${item.id}">${item.label}<small></small></button>`).join('');
    const basic = BASIC_UPGRADES[root];
    baseOffer.innerHTML = makeOffer(offer, basic.effect, basic.details);
  }

  function text(element, copy) {
    if (element.textContent !== copy) element.textContent = copy;
  }

  function refresh(nextSnapshot, active) {
    snapshot = nextSnapshot;
    running = active;
    const available = offers();
    if (basicSelection !== root) {
      basicSelection = root;
      rebuildBasics(available[0]);
    }
    if (pathSelection !== `${root}/${choice}`) {
      pathSelection = `${root}/${choice}`;
      for (const button of specializations.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.specialization === choice));
      details.innerHTML = available.slice(1).map(offer => makeOffer(offer, UPGRADE_EFFECTS[offer.id], offer.detail)).join('');
    }
    text(panel.querySelector('[data-panel-flux]'), `${Math.floor(state().energy)} Flux`);
    const unlocked = rootRank(root) > 0;
    paths.toggleAttribute('data-unlocked', unlocked);
    text(panel.querySelector('[data-tier2-hint]'), unlocked ? 'Choose a path' : `Unlock with ${rootLabel()} rank 1`);
    for (const button of families.querySelectorAll('button')) {
      const rank = rootRank(button.dataset.family);
      text(button.lastElementChild, rank ? `Rank ${rank} / ${TIER1_MAX_LEVEL}` : 'Not unlocked');
    }
    for (const button of specializations.querySelectorAll('button')) {
      const rank = state().tier2[root][button.dataset.specialization];
      text(button.lastElementChild, rank ? `Rank ${rank} / ${TIER2_MAX_LEVEL}` : 'Not unlocked');
    }
    for (const offer of available) {
      const button = panel.querySelector(`[data-buy="${offer.tier}"]`);
      const reason = block(offer);
      const verb = offer.level ? 'Upgrade' : 'Unlock';
      const action = offer.tier === 3 ? 'Unlock Ultimate' : `${verb} ${offer.label}`;
      button.disabled = Boolean(reason);
      text(button, offer.level >= offer.max ? (offer.tier === 3 ? 'Acquired' : 'Max rank') : `${action} · ${priceLabel(offer)}`);
      text(panel.querySelector(`#offer-status-${offer.tier}`), reason || (offer.level ? `Rank ${offer.level} / ${offer.max}` : ''));
    }
    if (pending) {
      const offer = available.find(item => item.tier === pending.tier && item.id === pending.id);
      const reason = offer && block(offer);
      if (!offer || reason) {
        clearConfirmation();
        setFeedback(reason || 'Selection changed.');
      } else {
        text(confirmText, `${offer.label} · rank ${offer.level + 1} · ${priceLabel(offer)}`);
      }
    }
  }

  function finish(offer) {
    const reason = block(offer);
    clearConfirmation();
    if (reason) {
      setFeedback(reason);
      return;
    }
    const price = priceLabel(offer);
    const error = purchase(offer.tier, root, offer.id);
    const rank = offers().find(item => item.tier === offer.tier).level;
    setFeedback(rank === offer.level ? error : `${offer.label} ${offer.level ? `upgraded to rank ${rank}` : 'unlocked'} · ${price}`);
    const button = panel.querySelector(`[data-buy="${offer.tier}"]`);
    (button.disabled ? panel.querySelector('[data-upgrade-heading]') : button).focus({ preventScroll: true });
  }

  panel.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-close-upgrade')) return close();
    if (button.hasAttribute('data-cancel-upgrade')) {
      const offer = pending;
      clearConfirmation();
      if (offer) panel.querySelector(`[data-buy="${offer.tier}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (button.hasAttribute('data-confirm-upgrade')) {
      const offer = pending && offers().find(item => item.tier === pending.tier && item.id === pending.id);
      if (offer) finish(offer);
      return;
    }
    if (button.dataset.buy) {
      const offer = offers().find(item => item.tier === Number(button.dataset.buy));
      if (!offer || block(offer)) return;
      if (mobile.matches && confirmPreference.checked) {
        pending = offer;
        confirmation.hidden = false;
        refresh(snapshot, running);
        confirmation.scrollIntoView({ block:'nearest' });
        confirmation.querySelector('[data-confirm-upgrade]').focus({ preventScroll:true });
      } else finish(offer);
      return;
    }
    const { group: index, family, specialization } = button.dataset;
    if (index === undefined && !family && !specialization) return;
    if (Number(index) === groupIndex || family === root || specialization === choice) return;
    clearConfirmation();
    setFeedback('');
    if (index !== undefined) {
      groupIndex = Number(index);
      root = group().nodes[0][0];
      choice = null;
    } else if (family) {
      root = family;
      choice = null;
    } else choice = specialization;
    if (index !== undefined || family) paths.open = false;
    refresh(snapshot, running);
    if (family) families.querySelector(`[data-family="${family}"]`).focus({ preventScroll: true });
    if (specialization) specializations.querySelector(`[data-specialization="${specialization}"]`).focus({ preventScroll: true });
  });

  function open() {
    if (mobile.matches && !sheet.open) sheet.showModal();
    panel.querySelector('[data-upgrade-heading]').focus();
  }

  function close() {
    clearConfirmation();
    if (sheet.open) sheet.close();
  }

  function layout() {
    close();
    (mobile.matches ? sheet : desktop).append(panel);
  }

  function reset() {
    close();
    setFeedback('');
    groupIndex = 0;
    root = UPGRADE_GROUPS[0].nodes[0][0];
    choice = null;
    paths.open = false;
  }

  sheet.addEventListener('close', clearConfirmation);
  mobile.addEventListener('change', layout);
  layout();
  return { open, close, refresh, reset };
}
