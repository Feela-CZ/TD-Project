import { UPGRADE_GROUPS, TIER2_FAMILIES, TIER3_FAMILIES, TIER1_MAX_LEVEL, TIER2_MAX_LEVEL } from '../dist/live.mjs';
import { upgradeCost, upgradeBlock } from './upgrade-state.mjs';

export function createUpgradePanel({ panel, sheet, desktop, descriptions, icons, purchase }) {
  const mobile = matchMedia('(max-width: 760px)');
  const families = panel.querySelector('[data-families]');
  const specializations = panel.querySelector('[data-specializations]');
  const details = panel.querySelector('[data-upgrade-details]');
  const feedback = panel.querySelector('[data-upgrade-feedback]');
  const confirmation = panel.querySelector('[data-confirmation]');
  const confirmText = confirmation.querySelector('p');
  const confirmPreference = panel.querySelector('[data-confirm-preference]');
  const groupButtons = [...panel.querySelectorAll('[data-group]')];

  let groupIndex = 0;
  let root = UPGRADE_GROUPS[0].nodes[0][0];
  let choice = null;
  let snapshot, running, structure, pending;
  try { confirmPreference.checked = localStorage.getItem('td-confirm-purchases') !== 'false'; } catch {}
  confirmPreference.addEventListener('change', () => {
    try { localStorage.setItem('td-confirm-purchases', String(confirmPreference.checked)); } catch {}
  });

  const group = () => UPGRADE_GROUPS[groupIndex];
  const rootLabel = () => group().nodes.find(([id]) => id === root)[1];
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

  function makeOffer(offer, copy) {
    return `<article class="upgrade-offer" data-offer="${offer.tier}">
      <div><h3>${offer.label}</h3><p>${copy}</p></div>
      <button type="button" data-buy="${offer.tier}" aria-describedby="offer-status-${offer.tier}"></button>
      <span id="offer-status-${offer.tier}" class="offer-status"></span>
    </article>`;
  }

  function rebuild(available) {
    groupButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === groupIndex)));
    families.innerHTML = group().nodes.map(([id, label]) => `<button type="button" data-family="${id}" aria-pressed="${id === root}"><span aria-hidden="true">${icons[id]}</span> ${label}<small></small></button>`).join('');
    specializations.innerHTML = TIER2_FAMILIES[root].map(item => `<button type="button" data-specialization="${item.id}" aria-pressed="${item.id === choice}">${item.label}<small></small></button>`).join('');
    details.innerHTML = makeOffer(available[0], descriptions[root].join(' '))
      + (choice ? makeOffer(available[1], available[1].detail) + makeOffer(available[2], available[2].detail) : '');
  }

  function text(element, copy) {
    if (element.textContent !== copy) element.textContent = copy;
  }

  function refresh(nextSnapshot, active) {
    snapshot = nextSnapshot;
    running = active;
    const available = offers();
    const selection = [groupIndex, root, choice].join('/');
    if (selection !== structure) {
      structure = selection;
      rebuild(available);
    }
    text(panel.querySelector('[data-panel-flux]'), `${Math.floor(state().energy)} Flux`);
    text(panel.querySelector('[data-tier2-hint]'), rootRank(root) ? `${rootLabel()} specializations` : `Requires ${rootLabel()} rank 1`);
    for (const button of families.querySelectorAll('button')) text(button.lastElementChild, `${rootRank(button.dataset.family)} / ${TIER1_MAX_LEVEL}`);
    for (const button of specializations.querySelectorAll('button')) text(button.lastElementChild, `${state().tier2[root][button.dataset.specialization]} / ${TIER2_MAX_LEVEL}`);
    for (const offer of available) {
      const button = details.querySelector(`[data-buy="${offer.tier}"]`);
      const reason = block(offer);
      button.disabled = Boolean(reason);
      text(button, offer.level >= offer.max ? (offer.tier === 3 ? 'Acquired' : 'Max rank') : `Buy ${offer.label} · ${priceLabel(offer)}`);
      text(details.querySelector(`#offer-status-${offer.tier}`), reason || `Rank ${offer.level} / ${offer.max}`);
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
    setFeedback(reason || purchase(offer.tier, root, offer.id));
    const button = details.querySelector(`[data-buy="${offer.tier}"]`);
    (button.disabled ? panel.querySelector('[data-upgrade-heading]') : button).focus({ preventScroll: true });
  }

  panel.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-close-upgrade')) return close();
    if (button.hasAttribute('data-cancel-upgrade')) {
      const offer = pending;
      clearConfirmation();
      if (offer) details.querySelector(`[data-buy="${offer.tier}"]`)?.focus({ preventScroll: true });
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
  }

  sheet.addEventListener('close', clearConfirmation);
  mobile.addEventListener('change', layout);
  layout();
  return { open, close, refresh, reset };
}
