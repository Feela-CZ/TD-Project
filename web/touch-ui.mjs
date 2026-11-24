export function createTouchUi({ openUpgrades, closeUpgrades }) {
  const toolbar = document.querySelector('.phone-toolbar');
  const dock = document.querySelector('#action-dock');
  const dockHome = dock.parentElement;
  const settings = document.querySelector('.settings');
  const overview = document.querySelector('.left-panel');
  const phone = matchMedia('(max-width: 760px)');

  function closeOverview() {
    document.body.classList.remove('overview-open');
  }
  function layout() {
    closeOverview();
    if (phone.matches) toolbar.after(dock);
    else dockHome.append(dock);
    dock.classList.toggle('phone-actions', phone.matches);
    dock.classList.toggle('panel', !phone.matches);
  }

  toolbar.querySelector('[data-open]').addEventListener('click', () => {
    closeOverview();
    openUpgrades();
  });
  toolbar.querySelector('[data-rival]').addEventListener('click', () => {
    closeUpgrades();
    document.querySelector('#portrait-map').click();
  });
  toolbar.querySelector('[data-stats]').addEventListener('click', () => {
    closeUpgrades();
    document.body.classList.toggle('overview-open');
    if (document.body.classList.contains('overview-open')) overview.querySelector('.overview-close').focus();
  });
  overview.querySelector('.overview-close').addEventListener('click', () => {
    closeOverview();
    toolbar.querySelector('[data-stats]').focus();
  });
  overview.querySelector('.overview-restart').addEventListener('click', () => {
    closeOverview();
    document.querySelector('#restart').click();
  });
  dockHome.append(settings);
  phone.addEventListener('change', layout);
  layout();

  function refresh(snapshot, versus) {
    const player = snapshot.players.human;
    const next = `Next incursion ${Math.ceil(snapshot.nextIncursionIn)}s · Strain ${player.load}/${player.overloadCap}`;
    const telemetry = document.querySelector('.phone-telemetry');
    if (telemetry.textContent !== next) telemetry.textContent = next;
    toolbar.querySelector('[data-rival]').disabled = !versus;
  }
  return { refresh };
}
