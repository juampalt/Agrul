/* Sesión, menú por rol y cliente de la API.
 * Guarda el token en la misma clave que usa app.js (agrul_auth_token), así ambos comparten la sesión. */
(function () {
  const CLAVE_TOKEN = 'agrul_auth_token';
  const CLAVE_USUARIO = 'agrul_auth_usuario';
  const ROLES = {
    ADMIN_SISTEMA: 'Administrador del sistema',
    ADMINISTRADOR: 'Administrador',
    ENCARGADO_CAMPO: 'Encargado de campo',
  };
  // Vista inicial de cada rol, si tiene acceso a ella.
  const INICIO_POR_ROL = { ADMIN_SISTEMA: 'inicio', ADMINISTRADOR: 'finca', ENCARGADO_CAMPO: 'actividades-programadas' };

  const leer = (clave) => { try { return localStorage.getItem(clave); } catch (_) { return null; } };
  const guardar = (clave, valor) => { try { localStorage.setItem(clave, valor); } catch (_) { /* sin almacenamiento */ } };
  const borrar = (clave) => { try { localStorage.removeItem(clave); } catch (_) { /* sin almacenamiento */ } };

  const AGRUL = window.AGRUL = {
    ROLES,
    token: leer(CLAVE_TOKEN),
    usuario: null,
    listo: false,
  };
  try { AGRUL.usuario = JSON.parse(leer(CLAVE_USUARIO) || 'null'); } catch (_) { AGRUL.usuario = null; }

  /** Quita de un mensaje los códigos internos de reglas y requisitos, por ejemplo «(RN-09)». */
  AGRUL.sinCodigos = (texto) => String(texto == null ? '' : texto)
    .replace(/\s*\([^()]*\b(?:RNF?-\d+|RF-M\d+(?:-\d+)?|AGRUL-\d+)\b[^()]*\)/g, '')
    .replace(/\s*\b(?:RNF?-\d+|RF-M\d+(?:-\d+)?|AGRUL-\d+)\b/g, '')
    .replace(/\s+([.,;:])/g, '$1').trim();

  function el(tag, atributos, ...hijos) {
    const nodo = document.createElement(tag);
    Object.entries(atributos || {}).forEach(([k, v]) => {
      if (v === false || v == null) return;
      if (k === 'class') nodo.className = v;
      else if (k.startsWith('on') && typeof v === 'function') nodo.addEventListener(k.slice(2), v);
      else nodo.setAttribute(k, v === true ? '' : v);
    });
    hijos.flat().forEach(h => { if (h != null && h !== false) nodo.append(h.nodeType ? h : document.createTextNode(String(h))); });
    return nodo;
  }
  AGRUL.el = el;

  /* ---- Avisos ---- */
  function aviso(texto, tipo = 'info') {
    let caja = document.getElementById('avisos');
    if (!caja) { caja = el('div', { id: 'avisos', class: 'avisos', 'aria-live': 'polite' }); document.body.append(caja); }
    const nodo = el('div', { class: 'aviso aviso-' + tipo }, AGRUL.sinCodigos(texto));
    caja.append(nodo);
    setTimeout(() => nodo.remove(), tipo === 'error' ? 7000 : 3500);
  }
  AGRUL.aviso = aviso;

  /* ---- Cliente de la API ---- */
  function mensajeDeError(json, estado) {
    const e = json && json.error;
    if (!e) return 'La operación falló (' + estado + ').';
    const limpio = (t) => AGRUL.sinCodigos(t);
    const detalles = Array.isArray(e.details) ? e.details.map(d => (d.field ? d.field + ': ' : '') + (d.message || '')).filter(Boolean) : [];
    return limpio(detalles.length ? (e.message ? e.message + ' ' : '') + detalles.join('; ') : (e.message || 'La operación falló.'));
  }
  async function api(ruta, { method = 'GET', body, headers } = {}) {
    const cabeceras = { Authorization: 'Bearer ' + AGRUL.token, ...(headers || {}) };
    let cuerpo;
    if (method !== 'GET') { cabeceras['Content-Type'] = 'application/json'; cuerpo = JSON.stringify(body === undefined ? {} : body); }
    const respuesta = await fetch('/api/v1' + ruta, { method, headers: cabeceras, body: cuerpo });
    let json = null;
    try { json = await respuesta.json(); } catch (_) { /* sin cuerpo */ }
    if (respuesta.status === 401 && AGRUL.listo) { cerrarLocal(); location.reload(); }
    if (!respuesta.ok || (json && json.success === false)) {
      const error = new Error(mensajeDeError(json, respuesta.status));
      error.status = respuesta.status;
      error.codigo = json && json.error && json.error.code;
      throw error;
    }
    return { data: json ? json.data : null, etag: respuesta.headers.get('ETag') };
  }
  AGRUL.api = api;

  function cerrarLocal() { AGRUL.token = null; AGRUL.usuario = null; borrar(CLAVE_TOKEN); borrar(CLAVE_USUARIO); }
  async function cerrarSesion() {
    try { await fetch('/api/v1/auth/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + AGRUL.token, 'Content-Type': 'application/json' }, body: '{}' }); } catch (_) { /* cierre local igualmente */ }
    cerrarLocal();
    location.reload();
  }
  AGRUL.cerrarSesion = cerrarSesion;

  /* ---- Pantalla de ingreso ---- */
  function pantallaIngreso(mensaje) {
    document.body.classList.add('sin-sesion');
    const error = el('p', { class: 'ingreso-error', role: 'alert' }, mensaje || '');
    const usuario = el('input', { id: 'ingreso-usuario', type: 'text', autocomplete: 'username', required: true, placeholder: 'Correo o nombre de usuario' });
    const clave = el('input', { id: 'ingreso-clave', type: 'password', autocomplete: 'current-password', required: true, placeholder: 'Contraseña' });
    const boton = el('button', { class: 'btn btn-primary ingreso-boton', type: 'submit' }, 'Ingresar');
    const formulario = el('form', { class: 'ingreso-form', novalidate: true },
      el('label', { for: 'ingreso-usuario' }, 'Usuario'), usuario,
      el('label', { for: 'ingreso-clave' }, 'Contraseña'), clave, error, boton);
    formulario.addEventListener('submit', async (e) => {
      e.preventDefault();
      const valor = usuario.value.trim();
      if (!valor || !clave.value) { error.textContent = 'Ingresá el usuario y la contraseña.'; return; }
      boton.disabled = true; boton.textContent = 'Ingresando…'; error.textContent = '';
      try {
        const cuerpo = valor.includes('@') ? { email: valor, password: clave.value } : { nombreUsuario: valor, password: clave.value };
        const res = await fetch('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.success) throw new Error(mensajeDeError(json, res.status));
        guardar(CLAVE_TOKEN, json.data.token);
        guardar(CLAVE_USUARIO, JSON.stringify(json.data.usuario));
        location.reload();
      } catch (err) {
        error.textContent = err.message || 'No se pudo iniciar sesión.';
        boton.disabled = false; boton.textContent = 'Ingresar';
      }
    });
    const tarjeta = el('div', { class: 'ingreso-tarjeta' },
      el('div', { class: 'ingreso-marca' }, el('span', { class: 'brand-icon', 'aria-hidden': 'true' }, '🌱'),
        el('div', {}, el('h1', {}, 'Agrul'), el('p', {}, 'Trazabilidad agroindustrial'))),
      el('h2', {}, 'Iniciar sesión'), formulario);
    document.body.append(el('div', { id: 'pantalla-ingreso', class: 'ingreso' }, tarjeta));
    usuario.focus();
  }

  /* ---- Cambio obligatorio de contraseña (primer ingreso) ---- */
  function pantallaCambioClave() {
    document.body.classList.add('sin-sesion');
    const actual = el('input', { id: 'cc-actual', type: 'password', autocomplete: 'current-password', required: true });
    const nueva = el('input', { id: 'cc-nueva', type: 'password', autocomplete: 'new-password', required: true });
    const repetida = el('input', { id: 'cc-repetida', type: 'password', autocomplete: 'new-password', required: true });
    const error = el('p', { class: 'ingreso-error', role: 'alert' });
    const boton = el('button', { class: 'btn btn-primary ingreso-boton', type: 'submit' }, 'Cambiar contraseña');
    const form = el('form', { class: 'ingreso-form', novalidate: true },
      el('p', { class: 'ingreso-ayuda' }, 'Es tu primer ingreso: tenés que definir una contraseña nueva antes de continuar. Debe tener al menos 8 caracteres, una letra y un número.'),
      el('label', { for: 'cc-actual' }, 'Contraseña actual'), actual,
      el('label', { for: 'cc-nueva' }, 'Contraseña nueva'), nueva,
      el('label', { for: 'cc-repetida' }, 'Repetir contraseña nueva'), repetida, error, boton);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (nueva.value !== repetida.value) { error.textContent = 'Las contraseñas nuevas no coinciden.'; return; }
      boton.disabled = true; error.textContent = '';
      try {
        await api('/auth/cambiar-password', { method: 'POST', body: { passwordActual: actual.value, passwordNueva: nueva.value } });
        cerrarLocal();
        location.reload();
      } catch (err) { error.textContent = err.message; boton.disabled = false; }
    });
    document.body.append(el('div', { id: 'pantalla-ingreso', class: 'ingreso' }, el('div', { class: 'ingreso-tarjeta' },
      el('div', { class: 'ingreso-marca' }, el('span', { class: 'brand-icon', 'aria-hidden': 'true' }, '🔐'), el('div', {}, el('h1', {}, 'Nueva contraseña'))),
      form, el('button', { class: 'btn btn-secondary ingreso-salir', type: 'button', onclick: cerrarSesion }, 'Salir'))));
    actual.focus();
  }

  /* ---- Menú por rol ---- */
  function aplicarRol() {
    const rol = AGRUL.usuario && AGRUL.usuario.perfil;
    document.body.dataset.rol = rol || '';
    document.querySelectorAll('[data-roles]').forEach(nodo => {
      const permitido = (nodo.dataset.roles || '').split(/\s+/).includes(rol);
      nodo.hidden = !permitido;
    });
    // Un título de grupo solo se muestra si tiene alguna opción visible.
    document.querySelectorAll('.side-nav .side-title').forEach(titulo => {
      let visible = false;
      for (let n = titulo.nextElementSibling; n && !n.classList.contains('side-title'); n = n.nextElementSibling) {
        if (!n.hidden) { visible = true; break; }
      }
      titulo.hidden = !visible;
    });
    const caja = document.getElementById('side-usuario');
    if (caja && AGRUL.usuario) {
      caja.replaceChildren(
        el('div', { class: 'side-usuario-datos' },
          el('strong', {}, AGRUL.usuario.nombreCompleto || AGRUL.usuario.nombre),
          el('span', {}, ROLES[rol] || rol)),
        el('button', { class: 'btn btn-secondary side-salir', type: 'button', title: 'Cerrar sesión', onclick: cerrarSesion }, 'Salir'));
    }
  }
  AGRUL.puedeVer = (roles) => Boolean(AGRUL.usuario) && (roles || '').split(/\s+/).includes(AGRUL.usuario.perfil);
  AGRUL.vistaInicial = () => INICIO_POR_ROL[AGRUL.usuario && AGRUL.usuario.perfil] || 'lotes';

  async function iniciar() {
    if (!AGRUL.token) { pantallaIngreso(); return; }
    try {
      const res = await fetch('/api/v1/auth/me', { headers: { Authorization: 'Bearer ' + AGRUL.token } });
      if (!res.ok) throw new Error('Sesión vencida');
      const json = await res.json();
      if (json && json.data && json.data.perfil) { AGRUL.usuario = json.data; guardar(CLAVE_USUARIO, JSON.stringify(json.data)); }
    } catch (_) {
      cerrarLocal();
      pantallaIngreso('Tu sesión venció. Volvé a ingresar.');
      return;
    }
    if (AGRUL.usuario && AGRUL.usuario.debeCambiarPassword) { pantallaCambioClave(); return; }
    document.body.classList.remove('sin-sesion');
    aplicarRol();
    AGRUL.listo = true;
    document.dispatchEvent(new CustomEvent('agrul:sesion'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
