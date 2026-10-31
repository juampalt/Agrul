/* Vistas del panel: muestra una sola sección a la vez (Lotes o Tablero ejecutivo).
 * Las demás acciones del menú siguen abriendo sus ventanas propias. */
(function () {
  const MOVIL = window.matchMedia('(max-width: 900px)');
  const btnMenu = document.getElementById('btn-menu');
  const overlay = document.getElementById('menu-overlay');
  const CLAVE = 'agrul.menu.colapsado';

  // Cada opción conserva su texto como tooltip cuando el menú está contraído.
  document.querySelectorAll('.side-nav .nav-item').forEach(item => {
    const texto = item.textContent.replace(/\s+/g, ' ').trim();
    item.querySelectorAll(':scope > .btn-icon').forEach(i => i.setAttribute('aria-hidden', 'true'));
    [...item.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).forEach(n => {
      const span = document.createElement('span');
      span.className = 'nav-label';
      span.textContent = n.textContent.trim();
      item.replaceChild(span, n);
    });
    if (!item.title) item.title = texto.replace(/^\S+\s/, '');
  });

  function estadoMenu() {
    const expandido = MOVIL.matches
      ? document.body.classList.contains('menu-abierto')
      : !document.body.classList.contains('menu-colapsado');
    if (btnMenu) btnMenu.setAttribute('aria-expanded', String(expandido));
    if (overlay) overlay.hidden = !(MOVIL.matches && expandido);
  }
  function alternarMenu() {
    if (MOVIL.matches) document.body.classList.toggle('menu-abierto');
    else {
      document.body.classList.toggle('menu-colapsado');
      try { localStorage.setItem(CLAVE, document.body.classList.contains('menu-colapsado') ? '1' : '0'); } catch (_) { /* sin almacenamiento */ }
    }
    estadoMenu();
    window.dispatchEvent(new Event('resize'));
  }
  function cerrarMenuMovil() { document.body.classList.remove('menu-abierto'); estadoMenu(); }

  try { if (localStorage.getItem(CLAVE) === '1') document.body.classList.add('menu-colapsado'); } catch (_) { /* sin almacenamiento */ }
  if (btnMenu) btnMenu.addEventListener('click', alternarMenu);
  if (overlay) overlay.addEventListener('click', cerrarMenuMovil);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && MOVIL.matches) cerrarMenuMovil(); });
  // En móvil, elegir una opción cierra el menú para dejar ver la vista o la ventana.
  document.querySelectorAll('.side-nav .nav-item').forEach(item => item.addEventListener('click', () => { if (MOVIL.matches) cerrarMenuMovil(); }));
  MOVIL.addEventListener('change', () => { document.body.classList.remove('menu-abierto'); estadoMenu(); });
  estadoMenu();

  const botones = document.querySelectorAll('.side-nav [data-nav]');

  // Una vista está disponible si su opción de menú existe y el rol actual la puede ver.
  const disponible = (vista) => [...botones].some(b => b.dataset.nav === vista && !b.hidden);

  function mostrar(vista, { guardar = true } = {}) {
    if (!disponible(vista)) { vista = (window.AGRUL && window.AGRUL.vistaInicial()) || 'lotes'; guardar = true; }
    document.body.dataset.vista = vista;
    document.querySelectorAll('[data-view]').forEach(s => s.classList.toggle('vista-activa', s.dataset.view === vista));
    // Las pantallas de gestión muestran siempre datos al día.
    const pantalla = document.getElementById('vista-' + vista);
    if (pantalla && typeof pantalla.recargar === 'function') pantalla.recargar();
    botones.forEach(b => b.classList.toggle('active', b.dataset.nav === vista));
    const activo = [...botones].find(b => b.dataset.nav === vista);
    const titulo = document.getElementById('vista-titulo');
    const subtitulo = document.getElementById('vista-subtitulo');
    if (activo && titulo) titulo.textContent = activo.dataset.titulo;
    if (activo && subtitulo) subtitulo.textContent = activo.dataset.subtitulo;
    document.title = (activo ? activo.dataset.titulo + ' · ' : '') + 'Agrul';
    if (guardar) {
      try { history.replaceState(null, '', '#' + vista); } catch (_) { /* sin historial */ }
    }
    // Los gráficos medidos mientras estaban ocultos necesitan recalcular su tamaño.
    window.dispatchEvent(new Event('resize'));
    window.scrollTo({ top: 0 });
  }

  botones.forEach(b => b.addEventListener('click', e => {
    // El botón del tablero ya no desplaza la página: cambia de vista.
    e.stopImmediatePropagation();
    mostrar(b.dataset.nav);
  }, true));
  window.addEventListener('hashchange', () => mostrar(location.hash.slice(1), { guardar: false }));
  // Las vistas se muestran recién cuando hay sesión, con la vista inicial que corresponde al rol.
  document.addEventListener('agrul:sesion', () => mostrar(location.hash.slice(1), { guardar: false }));
})();
