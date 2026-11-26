export function createTouchUi({ openUpgrades, closeUpgrades }) {
  const toolbar = document.querySelector('.game-toolbar');
  const upgradeButton = toolbar.querySelector('[data-open]');
  const statsButton = toolbar.querySelector('[data-stats]');
  const rival = toolbar.querySelector('[data-rival]');
  const overview = document.querySelector('.left-panel');
  const phone = matchMedia('(max-width: 760px)');

  function setOverview(open) {
    document.body.classList.toggle('overview-open', open);
    statsButton.setAttribute('aria-expanded', String(open));
  }

  function layout() {
    setOverview(false);
    if (phone.matches) upgradeButton.setAttribute('aria-haspopup', 'dialog');
    else upgradeButton.removeAttribute('aria-haspopup');
  }

  upgradeButton.addEventListener('click', () => {
    setOverview(false);
    openUpgrades();
  });
  rival.addEventListener('click', () => {
    closeUpgrades();
    document.querySelector('#portrait-map').click();
  });
  statsButton.addEventListener('click', () => {
    closeUpgrades();
    setOverview(true);
    overview.querySelector('.overview-close').focus();
  });
  overview.querySelector('.overview-close').addEventListener('click', () => {
    setOverview(false);
    statsButton.focus();
  });
  overview.querySelector('.overview-restart').addEventListener('click', () => {
    setOverview(false);
    document.querySelector('#restart').click();
  });
  phone.addEventListener('change', layout);
  layout();

  function refresh(versus, opponentView) {
    rival.hidden = !versus;
    const label = opponentView ? 'Own fortress' : 'Opponent';
    if (rival.textContent !== label) rival.textContent = label;
  }
  return { refresh };
}
