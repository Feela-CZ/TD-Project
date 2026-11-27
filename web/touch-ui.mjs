export function createTouchUi({ openUpgrades, closeUpgrades }) {
  const toolbar = document.querySelector('.game-toolbar');
  const upgradeButton = toolbar.querySelector('[data-open]');
  const rival = toolbar.querySelector('[data-rival]');
  const overview = document.querySelector('#match-overview');
  const sections = [...overview.querySelectorAll('[data-screen]')];
  const tabs = [...overview.querySelectorAll('[data-view]')];
  const reconTab = overview.querySelector('[data-view="recon"]');
  const desktop = matchMedia('(min-width: 1120px) and (min-height: 660px)');

  function showOverviewSection(view) {
    for (const tab of tabs) tab.setAttribute('aria-pressed', String(tab.dataset.view === view));
    for (const section of sections) section.hidden = section.dataset.screen !== view;
  }

  function layout() {
    if (desktop.matches) upgradeButton.removeAttribute('aria-haspopup');
    else upgradeButton.setAttribute('aria-haspopup', 'dialog');
  }

  for (const button of document.querySelectorAll('[data-open-dialog]')) {
    const dialog = document.getElementById(button.dataset.openDialog);
    button.addEventListener('click', () => {
      closeUpgrades();
      if (dialog === overview) showOverviewSection('combat');
      dialog.showModal();
    });
    dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
  }

  overview.addEventListener('click', event => {
    const tab = event.target.closest('[data-view]');
    if (tab) {
      showOverviewSection(tab.dataset.view);
      if (tab === reconTab) overview.dispatchEvent(new Event('showrecon'));
    }
  });
  document.querySelector('.overview-restart').addEventListener('click', () => {
    overview.close();
    document.querySelector('#restart').click();
  });
  upgradeButton.addEventListener('click', openUpgrades);
  rival.addEventListener('click', () => document.querySelector('#portrait-map').click());
  desktop.addEventListener('change', layout);
  layout();

  function refresh(opponentView, reconAvailable) {
    const label = opponentView ? 'Own fortress' : 'Opponent';
    if (rival.textContent !== label) rival.textContent = label;
    if (!reconAvailable && !reconTab.hidden && reconTab.getAttribute('aria-pressed') === 'true') {
      showOverviewSection('combat');
    }
    reconTab.hidden = !reconAvailable;
  }
  return { refresh };
}
