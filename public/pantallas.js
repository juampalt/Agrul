/* Pantallas del rol Administrador: finca, lotes, cultivos, variedades, tipos de actividad e insumos.
 * Un mismo motor arma cada pantalla (filtros, tabla, formulario en ventana y desactivación). */
(function () {
  const A = window.AGRUL;
  if (!A) return;
  const { el, api, aviso } = A;

  const CATEGORIAS_TIPO = [['PREPARACION_SUELO', 'Preparación de suelo'], ['PLANTACION', 'Plantación'], ['RIEGO', 'Riego'],
    ['FERTILIZACION', 'Fertilización'], ['MANTENIMIENTO', 'Mantenimiento'], ['CONTROL_SANITARIO', 'Control sanitario'], ['OTRO', 'Otro']];
  const CATEGORIAS_INSUMO = [['FERTILIZANTE', 'Fertilizante'], ['FITOSANITARIO', 'Fitosanitario'], ['ENMIENDA', 'Enmienda'], ['OTRO', 'Otro']];
  const ESTADOS_ACTIVO = [['ACTIVO', 'Activo'], ['INACTIVO', 'Inactivo']];
  const nombreDe = (lista, valor) => (lista.find(([v]) => v === valor) || [, valor])[1];
  const texto = (v) => (v === null || v === undefined || v === '' ? '—' : v);
  const numero = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('es-AR'));

  const legible = (estado) => ({ EN_PRODUCCION: 'En producción' })[estado] || (String(estado).charAt(0) + String(estado).slice(1).toLowerCase().replace(/_/g, ' '));
  const pill = (estado) => el('span', { class: 'pill pill-' + String(estado).toLowerCase().replace(/_/g, '-') }, legible(estado));

  /* ---- Ventana de formulario / detalle ---- */
  let ventana;
  function abrirVentana(titulo, contenido, { ancho } = {}) {
    cerrarVentana();
    const cerrar = el('button', { class: 'close-btn', type: 'button', 'aria-label': 'Cerrar', onclick: cerrarVentana }, '×');
    ventana = el('div', { class: 'modal open', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo },
      el('div', { class: 'modal-backdrop', onclick: cerrarVentana }),
      el('div', { class: 'modal-dialog', style: ancho ? 'max-width:' + ancho : null },
        el('div', { class: 'modal-header' }, el('h2', {}, titulo), cerrar), contenido));
    document.body.append(ventana);
    const primero = ventana.querySelector('input:not([type=hidden]),select,textarea');
    if (primero) primero.focus();
  }
  function cerrarVentana() { if (ventana) { ventana.remove(); ventana = null; } }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarVentana(); });

  /* ---- Campos de formulario ---- */
  const opcionesRemotas = {};
  async function cargarOpciones(campo, valores = {}) {
    if (campo.opciones) return campo.opciones;
    if (!campo.remoto) return [];
    const ruta = typeof campo.remoto.ruta === 'function' ? campo.remoto.ruta(valores) : campo.remoto.ruta;
    if (!ruta) return [];
    // Sin caché: las listas (cultivos activos, etc.) cambian al crear o desactivar registros.
    let datos;
    try { datos = (await api(ruta)).data; }
    catch (err) {
      // Un perfil sin permiso para listar (por ejemplo, usuarios) usa la alternativa de la pantalla o ninguna opción.
      if (err.status === 403) return campo.remoto.respaldo ? campo.remoto.respaldo() : [];
      throw err;
    }
    const opciones = (datos || []).map(f => [campo.remoto.valor ? campo.remoto.valor(f) : f.id, campo.remoto.etiqueta(f)]);
    opcionesRemotas[ruta] = opciones;
    return opciones;
  }
  const relleno = (select, opciones, valor, vacio) => {
    select.replaceChildren(el('option', { value: '' }, vacio || 'Seleccionar…'), ...opciones.map(([v, l]) => el('option', { value: v }, l)));
    select.value = valor ?? '';
  };
  async function crearCampo(campo, valorInicial, modo, contexto = {}) {
    const id = 'f-' + campo.name;
    let control;
    if (campo.tipo === 'select') {
      control = el('select', { id, name: campo.name });
      relleno(control, campo.dependeDe ? [] : await cargarOpciones(campo, contexto), valorInicial, campo.vacio);
      control.recargar = async (valores) => relleno(control, await cargarOpciones(campo, valores), '', campo.vacio);
    } else if (campo.tipo === 'lineas') {
      control = await crearLineas(campo, id, valorInicial);
    } else if (campo.tipo === 'multi') {
      const opciones = await cargarOpciones(campo);
      const marcados = new Set(valorInicial || []);
      control = el('div', { id, class: 'multi', 'data-name': campo.name },
        opciones.length ? opciones.map(([v, l]) => el('label', { class: 'multi-op' },
          el('input', { type: 'checkbox', value: v, checked: marcados.has(v) || null }), ' ', l))
          : el('p', { class: 'ayuda' }, 'No hay opciones disponibles.'));
    } else if (campo.tipo === 'area') {
      control = el('textarea', { id, name: campo.name, rows: 3, maxlength: campo.max || null });
      control.value = valorInicial ?? '';
    } else {
      control = el('input', { id, name: campo.name, type: campo.tipo || 'text', maxlength: campo.max || null,
        step: campo.tipo === 'number' ? (campo.paso || 'any') : null, min: campo.min ?? null });
      control.value = valorInicial ?? '';
    }
    if (modo === 'editar' && campo.soloLecturaAlEditar) { control.disabled = true; }
    return el('div', { class: 'campo' + (campo.ancho ? ' campo-' + campo.ancho : '') },
      el('label', { for: id }, campo.label, campo.req ? el('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
      control, campo.ayuda ? el('p', { class: 'ayuda' }, campo.ayuda) : null);
  }
  /* Líneas repetibles (por ejemplo, los insumos de una aplicación). */
  async function crearLineas(campo, id, iniciales) {
    const opcionesPorSub = {};
    for (const sub of campo.sub) if (sub.tipo === 'select') opcionesPorSub[sub.name] = await cargarOpciones(sub);
    const lista = el('div', { class: 'lineas-lista' });
    const nueva = (valores = {}) => {
      const fila = el('div', { class: 'linea' });
      campo.sub.forEach(sub => {
        const control = sub.tipo === 'select'
          ? el('select', { 'aria-label': sub.label, 'data-sub': sub.name })
          : el('input', { type: sub.tipo || 'text', 'aria-label': sub.label, placeholder: sub.label, 'data-sub': sub.name, step: sub.tipo === 'number' ? 'any' : null });
        if (sub.tipo === 'select') relleno(control, opcionesPorSub[sub.name], valores[sub.name] ?? '', sub.label);
        else if (valores[sub.name] !== undefined && valores[sub.name] !== null) control.value = valores[sub.name];
        fila.append(control);
      });
      fila.append(el('button', { class: 'btn-link peligro', type: 'button', onclick: () => fila.remove() }, 'Quitar'));
      lista.append(fila);
    };
    if (iniciales && iniciales.length) iniciales.forEach(v => nueva(v)); else nueva();
    const contenedor = el('div', { id, class: 'lineas', 'data-name': campo.name }, lista,
      el('button', { class: 'btn btn-secondary', type: 'button', onclick: () => nueva() }, '+ Agregar ' + (campo.textoLinea || 'línea')));
    return contenedor;
  }
  function leerLineas(formulario, campo) {
    const filas = [...formulario.querySelectorAll(`[data-name="${campo.name}"] .linea`)];
    return filas.map(fila => {
      const linea = {};
      campo.sub.forEach(sub => {
        const v = fila.querySelector(`[data-sub="${sub.name}"]`).value.trim();
        linea[sub.name] = sub.tipo === 'number' ? (v === '' ? null : Number(v.replace(',', '.'))) : v;
      });
      return linea;
    }).filter(l => Object.values(l).some(v => v !== '' && v !== null));
  }

  function leerValores(formulario, campos, modo) {
    const salida = {};
    for (const campo of campos) {
      if (modo === 'editar' && campo.soloAlta) continue;
      if (modo === 'alta' && campo.soloEdicion) continue;
      let valor;
      if (campo.tipo === 'multi') {
        valor = [...formulario.querySelectorAll(`[data-name="${campo.name}"] input:checked`)].map(i => i.value);
      } else if (campo.tipo === 'lineas') {
        valor = leerLineas(formulario, campo);
      } else {
        const control = formulario.elements[campo.name];
        valor = control.value.trim();
        if (campo.tipo === 'number') valor = valor === '' ? (campo.omitirVacio ? undefined : null) : Number(valor.replace(',', '.'));
        else if (valor === '') valor = campo.vacioComo === undefined ? undefined : campo.vacioComo;
      }
      if (valor !== undefined) salida[campo.name] = valor;
    }
    return salida;
  }
  function errorEn(formulario, mensaje) {
    let caja = formulario.querySelector('.form-error');
    if (!caja) { caja = el('p', { class: 'form-error', role: 'alert' }); formulario.prepend(caja); }
    caja.textContent = mensaje;
  }

  async function abrirFormulario({ titulo, campos, valores = {}, modo, guardar, ancho }) {
    const formulario = el('form', { class: 'form-grid', novalidate: true });
    for (const campo of campos) {
      if (modo === 'editar' && campo.soloAlta) continue;
      if (modo === 'alta' && campo.soloEdicion) continue;
      formulario.append(await crearCampo(campo, valores[campo.name], modo, valores));
    }
    // Las listas que dependen de otro campo se recargan cuando ese campo cambia.
    campos.filter(c => c.dependeDe).forEach(hijo => {
      const padre = formulario.elements[hijo.dependeDe];
      const control = formulario.elements[hijo.name];
      if (!padre || !control) return;
      const actualizar = () => control.recargar({ ...valores, ...leerValores(formulario, campos, modo) });
      padre.addEventListener('change', actualizar);
      if (valores[hijo.dependeDe]) actualizar().then(() => { control.value = valores[hijo.name] ?? ''; });
    });
    const enviar = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Guardar');
    formulario.append(el('div', { class: 'form-acciones' },
      el('button', { class: 'btn btn-secondary', type: 'button', onclick: cerrarVentana }, 'Cancelar'), enviar));
    formulario.addEventListener('submit', async (e) => {
      e.preventDefault();
      for (const campo of campos) {
        if (!campo.req || (modo === 'editar' && campo.soloAlta)) continue;
        const v = campo.tipo === 'multi' || campo.tipo === 'lineas' ? leerValores(formulario, [campo], modo)[campo.name]
          : (formulario.elements[campo.name] || {}).value;
        if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) { errorEn(formulario, `Completá «${campo.label}».`); return; }
      }
      enviar.disabled = true;
      try { await guardar(leerValores(formulario, campos, modo)); cerrarVentana(); }
      catch (err) { errorEn(formulario, err.message); enviar.disabled = false; }
    });
    abrirVentana(titulo, formulario, { ancho });
  }

  /* ---- Pantalla de listado + alta/edición ---- */
  function pantallaListado(cfg) {
    const contenedor = document.getElementById('vista-' + cfg.id);
    if (!contenedor) return;
    let filas = [];
    let pagina = 0;
    const TAM = 50;
    const cuerpo = el('tbody');
    const pie = el('div', { class: 'paginador' });
    const mensaje = el('p', { class: 'tabla-mensaje' });
    const filtros = el('form', { class: 'pantalla-filtros', novalidate: true });
    const controlesFiltro = {};
    (cfg.filtros || []).forEach(f => {
      const control = f.tipo === 'select'
        ? el('select', { 'aria-label': f.label }, el('option', { value: '' }, f.label), (f.opciones || []).map(([v, l]) => el('option', { value: v }, l)))
        : f.tipo === 'date' ? el('input', { type: 'date', title: f.label, 'aria-label': f.label })
          : el('input', { type: 'search', placeholder: f.label, 'aria-label': f.label, maxlength: f.max || null });
      controlesFiltro[f.name] = control;
      filtros.append(control);
      if (f.remoto) cargarOpciones(f).then(op => op.forEach(([v, l]) => control.append(el('option', { value: v }, l)))).catch(() => {});
    });
    if (cfg.filtros && cfg.filtros.length) {
      filtros.append(el('button', { class: 'btn btn-secondary', type: 'submit' }, 'Buscar'),
        el('button', { class: 'btn btn-secondary', type: 'button', onclick: () => { Object.values(controlesFiltro).forEach(c => { c.value = ''; }); pagina = 0; cargar(); } }, 'Limpiar'));
    }
    filtros.addEventListener('submit', (e) => { e.preventDefault(); pagina = 0; cargar(); });

    const columnas = cfg.columnas;
    const tabla = el('div', { class: 'tabla-scroll' }, el('table', { class: 'tabla-datos' },
      el('thead', {}, el('tr', {}, columnas.map(c => el('th', {}, c.titulo)), el('th', { class: 'acciones' }, 'Acciones'))), cuerpo));

    const nuevo = cfg.alta === false ? null
      : el('button', { class: 'btn btn-primary', type: 'button', onclick: () => abrirAlta() }, '+ ' + (cfg.textoNuevo || 'Nuevo'));
    contenedor.replaceChildren(
      el('div', { class: 'pantalla-cab' }, el('div', {}, el('h2', {}, cfg.titulo), el('p', {}, cfg.descripcion)), nuevo),
      filtros, mensaje, tabla, pie);

    async function cargar() {
      mensaje.textContent = 'Cargando…';
      cuerpo.replaceChildren();
      if (cfg.antes) { try { await cfg.antes(); } catch (_) { /* se muestran los identificadores */ } }
      const params = new URLSearchParams(cfg.consulta || '');
      Object.entries(controlesFiltro).forEach(([k, c]) => { if (c.value.trim()) params.set(k, c.value.trim()); });
      if (cfg.paginar !== false) { params.set('limit', String(TAM)); params.set('offset', String(pagina * TAM)); }
      try {
        const { data } = await api(cfg.ruta + (params.toString() ? '?' + params : ''));
        filas = data || [];
        mensaje.textContent = filas.length ? '' : (pagina ? 'No hay más registros.' : (cfg.vacio || 'No hay registros para mostrar.'));
        filas.forEach(f => cuerpo.append(filaTabla(f)));
        pie.replaceChildren();
        if (cfg.paginar !== false && (pagina > 0 || filas.length === TAM)) {
          pie.append(
            el('button', { class: 'btn btn-secondary', type: 'button', disabled: pagina === 0 || null, onclick: () => { pagina -= 1; cargar(); } }, '← Anterior'),
            el('span', {}, 'Página ' + (pagina + 1)),
            el('button', { class: 'btn btn-secondary', type: 'button', disabled: filas.length < TAM || null, onclick: () => { pagina += 1; cargar(); } }, 'Siguiente →'));
        }
      } catch (err) { mensaje.textContent = err.message; }
    }
    function filaTabla(f) {
      const acciones = el('td', { class: 'acciones' });
      (cfg.accionesExtra || []).filter(a => !a.visible || a.visible(f)).forEach(a => acciones.append(el('button', { class: 'btn-link', type: 'button', onclick: () => a.ejecutar(f, cargar) }, a.label)));
      if (cfg.editar !== false && (!cfg.puedeEditar || cfg.puedeEditar(f))) acciones.append(el('button', { class: 'btn-link', type: 'button', onclick: () => abrirEdicion(f) }, 'Editar'));
      if (cfg.desactivar && cfg.desactivar.activo(f)) {
        acciones.append(el('button', { class: 'btn-link peligro', type: 'button', onclick: () => desactivar(f) }, 'Desactivar'));
      }
      return el('tr', {}, columnas.map(c => el('td', { 'data-label': c.titulo }, c.valor(f))), acciones);
    }
    async function abrirAlta() {
      const defectos = {};
      for (const c of cfg.campos) if (c.defecto) defectos[c.name] = await c.defecto();
      abrirFormulario({ titulo: cfg.textoNuevo || 'Nuevo', campos: cfg.campos, modo: 'alta', ancho: cfg.ancho, valores: defectos,
        guardar: async (valores) => {
          await api(cfg.rutaAlta || cfg.ruta, { method: 'POST', body: cfg.cuerpo ? await cfg.cuerpo(valores, 'alta') : valores });
          aviso(cfg.mensajeAlta || 'Registro creado.', 'ok'); pagina = 0; cargar();
        } });
    }
    function abrirEdicion(f) {
      abrirFormulario({ titulo: 'Editar ' + (cfg.nombreSingular || 'registro'), campos: cfg.campos, modo: 'editar', ancho: cfg.ancho,
        valores: cfg.valores ? cfg.valores(f) : f,
        guardar: async (valores) => {
          await api(cfg.ruta + '/' + f.id, { method: 'PUT', body: cfg.cuerpo ? await cfg.cuerpo(valores, 'editar') : valores,
            headers: f.actualizadoEn ? { 'If-Match': '"' + f.actualizadoEn + '"' } : undefined });
          aviso('Cambios guardados.', 'ok'); cargar();
        } });
    }
    async function desactivar(f) {
      if (!confirm(cfg.desactivar.confirmar(f))) return;
      try { await api(cfg.ruta + '/' + f.id + '/desactivar', { method: 'PATCH' }); aviso('Registro desactivado.', 'ok'); cargar(); }
      catch (err) { aviso(err.message, 'error'); }
    }
    contenedor.recargar = () => cargar();
    cargar();
  }

  /* ---- Finca única (CU01–CU02) ---- */
  async function pantallaFinca() {
    const contenedor = document.getElementById('vista-finca');
    const campos = [
      { name: 'nombre', label: 'Nombre', req: true, max: 150 },
      { name: 'propietario', label: 'Propietario', max: 150, vacioComo: null },
      { name: 'provincia', label: 'Provincia', req: true, max: 120 },
      { name: 'departamento', label: 'Departamento', req: true, max: 120 },
      { name: 'localidad', label: 'Localidad', req: true, max: 120 },
      { name: 'superficieTotalHa', label: 'Superficie total (ha)', tipo: 'number', req: true, min: 0 },
      { name: 'telefono', label: 'Teléfono', max: 50, vacioComo: null },
      { name: 'observaciones', label: 'Observaciones', tipo: 'area', max: 2000, vacioComo: null, ancho: 'completo' },
    ];
    contenedor.replaceChildren(el('div', { class: 'pantalla-cab' }, el('div', {}, el('h2', {}, 'Finca'),
      el('p', {}, 'Datos generales de la finca. La superficie total no puede ser menor que la de los lotes activos.'))));
    let respuesta;
    try { respuesta = await api('/finca'); } catch (err) { contenedor.append(el('p', { class: 'tabla-mensaje' }, err.message)); return; }
    const finca = respuesta.data;
    let etag = respuesta.etag;
    const plano = { ...finca, ...(finca.ubicacion || {}) };
    const formulario = el('form', { class: 'form-grid glass tarjeta-form', novalidate: true });
    for (const campo of campos) formulario.append(await crearCampo(campo, plano[campo.name], 'editar'));
    const enviar = el('button', { class: 'btn btn-primary', type: 'submit' }, 'Guardar cambios');
    formulario.append(el('div', { class: 'form-acciones' }, enviar));
    formulario.addEventListener('submit', async (e) => {
      e.preventDefault();
      for (const c of campos) if (c.req && !formulario.elements[c.name].value.trim()) { errorEn(formulario, `Completá «${c.label}».`); return; }
      enviar.disabled = true;
      try {
        const r = await api('/finca', { method: 'PUT', body: leerValores(formulario, campos, 'editar'), headers: etag ? { 'If-Match': etag } : undefined });
        etag = r.etag || etag;
        aviso('Finca actualizada.', 'ok');
        const previo = formulario.querySelector('.form-error'); if (previo) previo.remove();
      } catch (err) { errorEn(formulario, err.message); }
      enviar.disabled = false;
    });
    contenedor.append(formulario);
  }

  /* ---- Configuración de cada pantalla ---- */
  const cultivosRemoto = { ruta: '/cultivos?estado=ACTIVO', etiqueta: f => f.nombre };

  async function configurar() {
    pantallaFinca();
    try { await cargarOpciones({ remoto: { ruta: '/cultivos', etiqueta: f => f.nombre } }); } catch (_) { /* se muestra el id */ }

    pantallaListado({ id: 'lotes-territorio', titulo: 'Lotes de la finca', nombreSingular: 'lote', textoNuevo: 'Nuevo lote', mensajeAlta: 'Lote registrado.',
      descripcion: 'Alta, modificación y baja de lotes. Cada lote ocupa un sector propio dentro de la superficie de la finca.',
      ruta: '/lotes-territorio', vacio: 'Todavía no hay lotes registrados.',
      filtros: [{ name: 'codigo', label: 'Código' }, { name: 'nombre', label: 'Nombre' }, { name: 'sector', label: 'Sector' },
        { name: 'estado', label: 'Estado', tipo: 'select', opciones: [['DISPONIBLE', 'Disponible'], ['EN_PRODUCCION', 'En producción'], ['INACTIVO', 'Inactivo']] }],
      columnas: [{ titulo: 'Código', valor: f => f.codigoLote }, { titulo: 'Nombre', valor: f => texto(f.nombreTerritorial) },
        { titulo: 'Sector', valor: f => texto(f.ubicacionSector) }, { titulo: 'Superficie (ha)', valor: f => numero(f.superficieHa) },
        { titulo: 'Suelo', valor: f => texto(f.tipoSuelo) }, { titulo: 'Riego', valor: f => texto(f.sistemaRiego) },
        { titulo: 'Estado', valor: f => pill(f.estadoTerritorial) }],
      campos: [
        { name: 'codigo', label: 'Código', req: true, max: 60, soloAlta: true, ayuda: 'Formato LOT-AAAA-XXXXX, por ejemplo LOT-2026-00001. No se puede cambiar después.' },
        { name: 'nombre', label: 'Nombre', req: true, max: 150 },
        { name: 'superficieHa', label: 'Superficie (ha)', tipo: 'number', req: true, min: 0 },
        { name: 'ubicacionSector', label: 'Ubicación o sector', req: true, max: 150 },
        { name: 'tipoSuelo', label: 'Tipo de suelo', max: 100, vacioComo: null },
        { name: 'sistemaRiego', label: 'Sistema de riego', max: 100, vacioComo: null },
        { name: 'fechaRegistro', label: 'Fecha de registro', tipo: 'date', soloAlta: true, ayuda: 'Opcional. Si se deja vacía, se usa hoy.' }],
      valores: f => ({ nombre: f.nombreTerritorial, superficieHa: f.superficieHa, ubicacionSector: f.ubicacionSector, tipoSuelo: f.tipoSuelo, sistemaRiego: f.sistemaRiego }),
      desactivar: { activo: f => f.estadoTerritorial !== 'INACTIVO', confirmar: f => `¿Desactivar el lote ${f.codigoLote}? Dejará de contar en la superficie de la finca.` } });

    pantallaListado({ id: 'cultivos', titulo: 'Cultivos', nombreSingular: 'cultivo', textoNuevo: 'Nuevo cultivo', mensajeAlta: 'Cultivo registrado.',
      descripcion: 'Catálogo de cultivos. No se desactiva un cultivo con ciclos productivos sin finalizar.',
      ruta: '/cultivos', vacio: 'Todavía no hay cultivos registrados.',
      filtros: [{ name: 'nombre', label: 'Nombre', max: 40 },
        { name: 'tipoCicloVida', label: 'Ciclo de vida', tipo: 'select', opciones: [['ANUAL', 'Anual'], ['PERENNE', 'Perenne']] },
        { name: 'estado', label: 'Estado', tipo: 'select', opciones: ESTADOS_ACTIVO }],
      columnas: [{ titulo: 'Nombre', valor: f => f.nombre }, { titulo: 'Ciclo de vida', valor: f => f.tipoCicloVida === 'ANUAL' ? 'Anual' : 'Perenne' },
        { titulo: 'Descripción', valor: f => texto(f.descripcion) }, { titulo: 'Estado', valor: f => pill(f.estado) }],
      campos: [{ name: 'nombre', label: 'Nombre', req: true, max: 40 },
        { name: 'tipoCicloVida', label: 'Ciclo de vida', tipo: 'select', req: true, opciones: [['ANUAL', 'Anual'], ['PERENNE', 'Perenne']] },
        { name: 'descripcion', label: 'Descripción', tipo: 'area', vacioComo: null, ancho: 'completo' }],
      desactivar: { activo: f => f.estado === 'ACTIVO', confirmar: f => `¿Desactivar el cultivo «${f.nombre}»?` } });

    pantallaListado({ id: 'variedades', titulo: 'Variedades', nombreSingular: 'variedad', textoNuevo: 'Nueva variedad', mensajeAlta: 'Variedad registrada.',
      descripcion: 'Variedades de cada cultivo. Solo se pueden registrar para cultivos activos.',
      ruta: '/variedades', vacio: 'Todavía no hay variedades registradas.',
      antes: () => cargarOpciones({ remoto: { ruta: '/cultivos', etiqueta: f => f.nombre } }),
      filtros: [{ name: 'cultivoId', label: 'Cultivo', tipo: 'select', remoto: { ruta: '/cultivos', etiqueta: f => f.nombre } },
        { name: 'nombre', label: 'Nombre', max: 40 }, { name: 'estado', label: 'Estado', tipo: 'select', opciones: ESTADOS_ACTIVO }],
      columnas: [{ titulo: 'Nombre', valor: f => f.nombre }, { titulo: 'Cultivo', valor: f => ((opcionesRemotas['/cultivos'] || []).find(([id]) => id === f.cultivoId) || [, f.cultivoId])[1] },
        { titulo: 'Descripción', valor: f => texto(f.descripcion) }, { titulo: 'Estado', valor: f => pill(f.estado) }],
      campos: [{ name: 'cultivoId', label: 'Cultivo', tipo: 'select', req: true, soloAlta: true, remoto: cultivosRemoto },
        { name: 'nombre', label: 'Nombre', req: true, max: 40 },
        { name: 'descripcion', label: 'Descripción', tipo: 'area', vacioComo: null, ancho: 'completo' }],
      desactivar: { activo: f => f.estado === 'ACTIVO', confirmar: f => `¿Desactivar la variedad «${f.nombre}»?` } });

    pantallaListado({ id: 'tipos-actividad', titulo: 'Tipos de actividad', nombreSingular: 'tipo de actividad', textoNuevo: 'Nuevo tipo', mensajeAlta: 'Tipo de actividad registrado.',
      descripcion: 'Labores que se pueden programar. Cada tipo se asocia a al menos un cultivo activo.',
      ruta: '/tipos-actividad', vacio: 'Todavía no hay tipos de actividad registrados.',
      filtros: [{ name: 'categoria', label: 'Categoría', tipo: 'select', opciones: CATEGORIAS_TIPO },
        { name: 'cultivoId', label: 'Cultivo', tipo: 'select', remoto: { ruta: '/cultivos', etiqueta: f => f.nombre } },
        { name: 'estado', label: 'Estado', tipo: 'select', opciones: [['ACTIVA', 'Activa'], ['INACTIVA', 'Inactiva']] }],
      columnas: [{ titulo: 'Nombre', valor: f => f.nombre }, { titulo: 'Categoría', valor: f => nombreDe(CATEGORIAS_TIPO, f.categoria) },
        { titulo: 'Cultivos', valor: f => String((f.cultivoIds || []).length) }, { titulo: 'Estado', valor: f => pill(f.estado) }],
      campos: [{ name: 'nombre', label: 'Nombre', req: true, max: 40 },
        { name: 'categoria', label: 'Categoría', tipo: 'select', req: true, opciones: CATEGORIAS_TIPO },
        { name: 'cultivoIds', label: 'Cultivos aplicables', tipo: 'multi', req: true, remoto: cultivosRemoto, ancho: 'completo' },
        { name: 'descripcion', label: 'Descripción', tipo: 'area', vacioComo: null, ancho: 'completo' }],
      desactivar: { activo: f => f.estado === 'ACTIVA', confirmar: f => `¿Desactivar el tipo «${f.nombre}»?` } });

    pantallaListado({ id: 'insumos', titulo: 'Insumos', nombreSingular: 'insumo', textoNuevo: 'Nuevo insumo', mensajeAlta: 'Insumo registrado.',
      descripcion: 'Catálogo de insumos. El código no se puede cambiar. Con «Detalle» ves dónde se aplicó cada insumo.',
      ruta: '/insumos', vacio: 'Todavía no hay insumos registrados.',
      filtros: [{ name: 'codigo', label: 'Código', max: 15 }, { name: 'nombre', label: 'Nombre', max: 200 },
        { name: 'categoria', label: 'Categoría', tipo: 'select', opciones: CATEGORIAS_INSUMO },
        { name: 'estado', label: 'Estado', tipo: 'select', opciones: ESTADOS_ACTIVO }],
      columnas: [{ titulo: 'Código', valor: f => f.codigo }, { titulo: 'Nombre', valor: f => f.nombre },
        { titulo: 'Categoría', valor: f => nombreDe(CATEGORIAS_INSUMO, f.categoria) }, { titulo: 'Unidad', valor: f => f.unidadMedida },
        { titulo: 'Nivel mínimo', valor: f => numero(f.nivelMinimo) }, { titulo: 'Estado', valor: f => pill(f.estado) }],
      campos: [{ name: 'codigo', label: 'Código', req: true, max: 15, soloLecturaAlEditar: true },
        { name: 'nombre', label: 'Nombre', req: true, max: 200 },
        { name: 'categoria', label: 'Categoría', tipo: 'select', req: true, opciones: CATEGORIAS_INSUMO },
        { name: 'unidadMedida', label: 'Unidad de medida', req: true, max: 30, ayuda: 'Ej.: kg, L. No se puede cambiar una vez aplicado.' },
        { name: 'tipoProducto', label: 'Tipo de producto', max: 150, vacioComo: null },
        { name: 'fabricanteMarca', label: 'Fabricante o marca', max: 150, vacioComo: null },
        { name: 'nivelMinimo', label: 'Nivel mínimo de existencias', tipo: 'number', req: true, min: 0 }],
      // El código viaja siempre: el servidor exige que no cambie.
      cuerpo: (valores, modo) => valores,
      desactivar: { activo: f => f.estado === 'ACTIVO', confirmar: f => `¿Desactivar el insumo «${f.nombre}»? Conserva su historial.` },
      accionesExtra: [{ label: 'Detalle', ejecutar: detalleInsumo }] });
  }

  async function detalleInsumo(insumo) {
    let datos;
    try { datos = (await api('/insumos/' + insumo.id)).data; } catch (err) { aviso(err.message, 'error'); return; }
    const filas = (datos.antecedentes || []).map(a => el('tr', {},
      el('td', {}, a.fechaAplicacion), el('td', {}, a.codigoLote), el('td', {}, a.cultivo), el('td', {}, a.ciclo),
      el('td', {}, numero(a.cantidadUtilizada) + ' ' + a.unidadMedida)));
    abrirVentana('Insumo ' + datos.codigo, el('div', { class: 'detalle' },
      el('p', {}, el('strong', {}, datos.nombre), ' · ', pill(datos.estado)),
      el('p', { class: 'ayuda' }, datos.habilitadoParaNuevasAplicaciones
        ? 'Habilitado para nuevas aplicaciones (sujeto a existencias).'
        : 'Inactivo: solo disponible para consultas históricas.'),
      el('h3', {}, 'Aplicaciones registradas'),
      filas.length
        ? el('div', { class: 'tabla-scroll' }, el('table', { class: 'tabla-datos' },
          el('thead', {}, el('tr', {}, ['Fecha', 'Lote', 'Cultivo', 'Ciclo', 'Cantidad'].map(t => el('th', {}, t)))), el('tbody', {}, filas)))
        : el('p', { class: 'tabla-mensaje' }, datos.mensajeAntecedentes || 'No se encontraron aplicaciones registradas para el insumo.')), { ancho: '760px' });
  }

  function inicioAdminSistema() {
    const contenedor = document.getElementById('vista-inicio');
    const acceso = (icono, titulo, detalle, idBoton) => el('button', { class: 'acceso glass', type: 'button',
      onclick: () => document.getElementById(idBoton).click() },
    el('span', { class: 'acceso-icono', 'aria-hidden': 'true' }, icono), el('strong', {}, titulo), el('span', {}, detalle));
    contenedor.replaceChildren(
      el('div', { class: 'pantalla-cab' }, el('div', {}, el('h2', {}, 'Bienvenido/a, ' + (A.usuario.nombre || '')),
        el('p', {}, 'Desde acá administrás las cuentas de acceso al sistema.'))),
      el('div', { class: 'accesos' },
        acceso('🔐', 'Usuarios y roles', 'Alta, modificación, bloqueo y asignación de fincas', 'btn-usuarios-roles'),
        acceso('📜', 'Auditoría y sesión', 'Bitácora de accesos y cambios', 'btn-bitacora-auditoria')));
  }

  /** Acción con un pequeño formulario (iniciar, finalizar, cancelar…). */
  function accionFormulario({ titulo, campos, ruta, metodo = 'PATCH', cuerpo, mensaje }) {
    return async (fila, recargar) => {
      const defectos = {};
      for (const c of campos) if (c.defecto) defectos[c.name] = await c.defecto();
      return abrirFormulario({ titulo: titulo(fila), campos, modo: 'alta', ancho: '520px',
      valores: defectos, guardar: async (valores) => {
        await api(ruta(fila), { method: metodo, body: cuerpo ? cuerpo(valores, fila) : valores });
        aviso(mensaje || 'Listo.', 'ok'); recargar();
      } });
    };
  }
  const hoy = () => new Date().toISOString().slice(0, 10);
  let fincaCache;
  /** Finca sobre la que opera el usuario: la finca única (Administrador) o la primera asignada. */
  async function fincaActual() {
    if (fincaCache) return fincaCache;
    if (A.usuario.perfil === 'ADMINISTRADOR') { try { fincaCache = (await api('/finca')).data.id; } catch (_) { /* se prueba con las asignadas */ } }
    if (!fincaCache) fincaCache = (A.usuario.fincasAsignadas || [])[0];
    return fincaCache;
  }
  const nuevaOperacion = () => (crypto.randomUUID ? crypto.randomUUID() : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c => (c ^ (Math.random() * 16) >> c / 4).toString(16)));
  const referencias = {};
  /** Carga nombres para mostrar en las tablas (lote, cultivo, usuario…). */
  async function cargarReferencias(lista) {
    await Promise.all(lista.map(async ({ ruta, etiqueta }) => {
      try { const { data } = await api(ruta); referencias[ruta] = new Map((data || []).map(f => [f.id, etiqueta(f)])); }
      catch (_) { referencias[ruta] = referencias[ruta] || new Map(); }
    }));
  }
  const ref = (ruta, id) => (referencias[ruta] && referencias[ruta].get(id)) || (id ? String(id).slice(0, 8) + '…' : '—');
  A.ui = { el, api, aviso, pantallaListado, abrirFormulario, abrirVentana, cerrarVentana, accionFormulario, cargarReferencias, ref,
    cargarOpciones, pill, texto, numero, nombreDe, hoy, fincaActual, nuevaOperacion };

  document.addEventListener('agrul:sesion', () => {
    if (A.puedeVer('ADMINISTRADOR')) configurar();
    if (A.puedeVer('ADMIN_SISTEMA')) inicioAdminSistema();
  });
})();
