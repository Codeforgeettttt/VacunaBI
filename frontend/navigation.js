(function () {
  const views = new Set(['resumen','localidades','sectores','calidad','metodologia','decisiones']);
  const links = [...document.querySelectorAll('[data-nav]')];
  const pages = [...document.querySelectorAll('[data-page]')];
  const main = document.getElementById('main-content');
  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    main.focus();
  });
  function renderNavigation() {
    const requested = location.hash.slice(1);
    const active = views.has(requested) ? requested : 'resumen';
    pages.forEach(page => { page.hidden = page.dataset.page !== active; });
    links.forEach(link => {
      if(link.dataset.nav === active) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    document.title = 'VacunaBI · ' + (links.find(link => link.dataset.nav === active)?.textContent.trim() || 'Resumen');
    document.getElementById('module-title').textContent = links.find(link => link.dataset.nav === active)?.lastChild.textContent.trim() || 'Resumen general';
    requestAnimationFrame(() => {
      if(typeof Chart !== 'undefined' && Chart.instances) {
        Object.values(Chart.instances).forEach(chart => chart.resize());
      }
    });
  }
  addEventListener('hashchange', renderNavigation);
  renderNavigation();
})();
