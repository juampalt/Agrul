/* Pantallas de planificación, campo, inventario, cosecha y poscosecha.
 * Plantaciones y ciclos son del Administrador; el resto lo usan Administrador y Encargado de campo. */
(function () {
  const A = window.AGRUL;
  if (!A) return;

  const ESTADOS_CICLO = [['PLANIFICADO', 'Planificado'], ['ACTIVO', 'Activo'], ['FINALIZADO', 'Finalizado']];
  const ESTADOS_JORNADA = [['PENDIENTE', 'Pendiente'], ['EJECUTADA', 'Ejecutada'], ['CANCELADA', 'Cancelada']];
  const TIPOS_MOV_INVENTARIO = [['AJUSTE_POSITIVO', 'Ajuste positivo'], ['AJUSTE_NEGATIVO', 'Ajuste negativo'], ['PERDIDA', 'Pérdida'], ['DEVOLUCION', 'Devolución']];
  const TIPOS_DESTINO = [['MERCADO_FRESCO', 'Mercado fresco'], ['INDUSTRIA', 'Industria'], ['OTRO', 'Otro']];

  function configurar() {
    const U = A.ui;
    const { el, api, aviso, pantallaListado, abrirVentana, accionFormulario, cargarReferencias, ref, pill, texto, numero, nombreDe, hoy, fincaActual, nuevaOperacion } = U;
    const esAdmin = A.puedeVer('ADMINISTRADOR');

    const R = {
      usuarios: { ruta: '/usuarios?estado=ACTIVO', etiqueta: u => u.nombreCompleto || `${u.nombre} ${u.apellido}` },
      ciclos: { ruta: '/ciclos-productivos', etiqueta: c => c.nombreCodigo },
      tipos: { ruta: '/tipos-actividad', etiqueta: t => t.nombre },
      insumos: { ruta: '/insumos', etiqueta: i => `${i.codigo} · ${i.nombre}` },
      lotes: { ruta: '/lotes-territorio', etiqueta: l => l.codigoLote },
      cultivos: { ruta: '/cultivos', etiqueta: c => c.nombre },
      variedades: { ruta: '/variedades', etiqueta: v => v.nombre },
      plantaciones: { ruta: '/plantaciones', etiqueta: p => `${ref('/lotes-territorio', p.loteId)} · ${ref('/cultivos', p.cultivoId)}` },
      camaras: { ruta: '/almacenamiento/camaras', etiqueta: c => c.nombre },
    };
    const remoto = (clave, query = '', etiqueta) => ({ ruta: R[clave].ruta + query, etiqueta: etiqueta || R[clave].etiqueta });
    // Quien no puede listar usuarios queda como único responsable posible.
    const yo = () => [[A.usuario.id, A.usuario.nombreCompleto || `${A.usuario.nombre} ${A.usuario.apellido || ''}`.trim()]];
    const usuariosRemoto = { ...remoto('usuarios'), respaldo: yo };
    const responsable = (obligatorio = true) => ({ name: 'responsableId', label: 'Responsable', tipo: 'select', req: obligatorio, remoto: usuariosRemoto, defecto: () => A.usuario.id });
    const ciclosActivos = remoto('ciclos', '?estado=ACTIVO');
    const fecha = (name, label, extra = {}) => ({ name, label, tipo: 'date', ...extra });
    const sinVacio = (campos) => campos.map(c => ({ ...c, vacioComo: undefined, omitirVacio: true }));
    const conOperacion = (valores) => ({ ...valores, operacionId: nuevaOperacion() });
    const usuarioDe = (id) => ref('/usuarios?estado=ACTIVO', id);
    const refs = {
      usuarios: { ruta: '/usuarios?estado=ACTIVO', etiqueta: R.usuarios.etiqueta },
      ciclos: { ruta: '/ciclos-productivos', etiqueta: R.ciclos.etiqueta },
      tipos: { ruta: '/tipos-actividad', etiqueta: R.tipos.etiqueta },
      insumos: { ruta: '/insumos', etiqueta: R.insumos.etiqueta },
    };
    const cicloDe = (id) => ref('/ciclos-productivos', id);

    /* ---------- Administrador: plantaciones y ciclos ---------- */
    if (esAdmin) {
      pantallaListado({ id: 'plantaciones', titulo: 'Plantaciones', nombreSingular: 'plantación', textoNuevo: 'Nueva plantación', mensajeAlta: 'Plantación registrada.',
        descripcion: 'Cultivo y variedad plantados en un lote. La superficie no puede superar la libre del lote.',
        ruta: '/plantaciones', vacio: 'Todavía no hay plantaciones registradas.', editar: false,
        antes: () => cargarReferencias([{ ruta: '/lotes-territorio', etiqueta: R.lotes.etiqueta }, { ruta: '/cultivos', etiqueta: R.cultivos.etiqueta }, { ruta: '/variedades', etiqueta: R.variedades.etiqueta }]),
        filtros: [{ name: 'loteId', label: 'Lote', tipo: 'select', remoto: remoto('lotes') }, { name: 'cultivoId', label: 'Cultivo', tipo: 'select', remoto: remoto('cultivos') },
          { name: 'estado', label: 'Estado', tipo: 'select', opciones: [['ACTIVA', 'Activa'], ['FINALIZADA', 'Finalizada']] }],
        columnas: [{ titulo: 'Lote', valor: f => ref('/lotes-territorio', f.loteId) }, { titulo: 'Cultivo', valor: f => ref('/cultivos', f.cultivoId) },
          { titulo: 'Variedad', valor: f => ref('/variedades', f.variedadId) }, { titulo: 'Plantada', valor: f => f.fechaPlantacion },
          { titulo: 'Superficie (ha)', valor: f => numero(f.superficieHa) }, { titulo: 'Plantas', valor: f => numero(f.cantidadInicialPlantas) },
          { titulo: 'Estado', valor: f => pill(f.estado) }],
        campos: [{ name: 'loteId', label: 'Lote', tipo: 'select', req: true, remoto: remoto('lotes') },
          { name: 'cultivoId', label: 'Cultivo', tipo: 'select', req: true, remoto: remoto('cultivos', '?estado=ACTIVO') },
          { name: 'variedadId', label: 'Variedad', tipo: 'select', req: true, dependeDe: 'cultivoId', vacio: 'Elegí primero el cultivo',
            remoto: { ruta: v => v.cultivoId ? `/variedades?estado=ACTIVO&cultivoId=${v.cultivoId}` : null, etiqueta: R.variedades.etiqueta } },
          fecha('fechaPlantacion', 'Fecha de plantación', { req: true, defecto: () => hoy() }),
          { name: 'superficieHa', label: 'Superficie (ha)', tipo: 'number', req: true, min: 0 },
          { name: 'cantidadInicialPlantas', label: 'Cantidad inicial de plantas', tipo: 'number', req: true, min: 0 },
          { name: 'procedencia', label: 'Procedencia', max: 200, vacioComo: null },
          { name: 'observaciones', label: 'Observaciones', tipo: 'area', vacioComo: null, ancho: 'completo' }],
        accionesExtra: [
          { label: 'Detalle', ejecutar: async (f) => {
            try {
              const d = (await api('/plantaciones/' + f.id)).data;
              abrirVentana('Plantación', el('div', { class: 'detalle' },
                el('p', {}, el('strong', {}, `${ref('/cultivos', d.cultivoId)} · ${ref('/variedades', d.variedadId)}`), ' ', pill(d.estado)),
                d.lote ? el('p', { class: 'ayuda' }, `Lote ${d.lote.codigoLote}: ${numero(d.lote.superficieHa)} ha, ocupadas ${numero(d.lote.superficieOcupadaHa)} ha, disponibles ${numero(d.lote.superficieDisponibleHa)} ha.`) : null,
                el('h3', {}, 'Ciclos productivos'),
                (d.ciclos || []).length ? el('ul', {}, d.ciclos.map(c => el('li', {}, `${c.nombreCodigo} — ${c.estado.toLowerCase()} (${c.fechaInicioPrevista} a ${c.fechaFinPrevista})`)))
                  : el('p', { class: 'tabla-mensaje' }, 'Sin ciclos asociados.')), { ancho: '620px' });
            } catch (err) { aviso(err.message, 'error'); }
          } },
          { label: 'Finalizar', visible: f => f.estado === 'ACTIVA', ejecutar: accionFormulario({ titulo: () => 'Finalizar plantación', campos: [fecha('fechaFinalizacion', 'Fecha de finalización', { req: true, defecto: () => hoy() })],
            ruta: f => `/plantaciones/${f.id}/finalizar`, mensaje: 'Plantación finalizada.' }) }] });

      pantallaListado({ id: 'ciclos', titulo: 'Ciclos productivos', nombreSingular: 'ciclo', textoNuevo: 'Nuevo ciclo', mensajeAlta: 'Ciclo registrado.',
        descripcion: 'Períodos de producción de cada plantación. Un ciclo se planifica, se inicia y se finaliza.',
        ruta: '/ciclos-productivos', vacio: 'Todavía no hay ciclos registrados.', editar: false,
        antes: () => cargarReferencias([{ ruta: '/lotes-territorio', etiqueta: R.lotes.etiqueta }, { ruta: '/cultivos', etiqueta: R.cultivos.etiqueta }, refs.usuarios, { ruta: '/plantaciones', etiqueta: p => `${ref('/lotes-territorio', p.loteId)} · ${ref('/cultivos', p.cultivoId)}` }]),
        filtros: [{ name: 'estado', label: 'Estado', tipo: 'select', opciones: ESTADOS_CICLO }, { name: 'loteId', label: 'Lote', tipo: 'select', remoto: remoto('lotes') }],
        columnas: [{ titulo: 'Código', valor: f => f.nombreCodigo }, { titulo: 'Plantación', valor: f => ref('/plantaciones', f.plantacionId) },
          { titulo: 'Inicio previsto', valor: f => f.fechaInicioPrevista }, { titulo: 'Fin previsto', valor: f => f.fechaFinPrevista },
          { titulo: 'Responsable', valor: f => usuarioDe(f.responsableSeguimientoId) }, { titulo: 'Estado', valor: f => pill(f.estado) }],
        campos: [{ name: 'plantacionId', label: 'Plantación', tipo: 'select', req: true, remoto: { ruta: '/plantaciones?estado=ACTIVA', etiqueta: p => `${ref('/lotes-territorio', p.loteId)} · ${ref('/cultivos', p.cultivoId)} · ${p.fechaPlantacion}` } },
          { name: 'nombreCodigo', label: 'Nombre o código', req: true, max: 30 },
          fecha('fechaInicioPrevista', 'Inicio previsto', { req: true }), fecha('fechaFinPrevista', 'Fin previsto', { req: true }),
          { name: 'responsableSeguimientoId', label: 'Responsable de seguimiento', tipo: 'select', req: true, remoto: usuariosRemoto, defecto: () => A.usuario.id },
          { name: 'observaciones', label: 'Observaciones', tipo: 'area', vacioComo: null, ancho: 'completo' }],
        accionesExtra: [
          { label: 'Resumen', ejecutar: async (f) => {
            try {
              const r = (await api(`/ciclos-productivos/${f.id}/resumen`)).data;
              const item = (n, t) => el('div', { class: 'resumen-item' }, el('strong', {}, n), el('span', {}, t));
              const kg = (v) => v === null ? 'Sin registros' : numero(v) + ' kg';
              abrirVentana('Resumen del ciclo ' + f.nombreCodigo, el('div', { class: 'detalle' }, pill(r.estado),
                el('div', { class: 'resumen-grid' },
                  item(numero(r.actividadesRealizadas.cantidad), 'Actividades realizadas' + (r.actividadesRealizadas.superficieTrabajadaHa !== null ? ` (${numero(r.actividadesRealizadas.superficieTrabajadaHa)} ha)` : '')),
                  item(numero(r.monitoreos.cantidad), 'Monitoreos'), item(numero(r.aplicacionesInsumos.cantidad), 'Aplicaciones de insumos'),
                  item(numero(r.cosechas.cantidad), 'Cosechas'), item(kg(r.cosechas.totalCosechadoKg), 'Total cosechado')),
                r.aplicacionesInsumos.insumos.length ? el('div', {}, el('h3', {}, 'Insumos aplicados'),
                  el('ul', {}, r.aplicacionesInsumos.insumos.map(i => el('li', {}, `${i.codigo} · ${i.nombre}: ${numero(i.cantidadTotal)} ${i.unidadMedida}`)))) : null), { ancho: '680px' });
            } catch (err) { aviso(err.message, 'error'); }
          } },
          { label: 'Iniciar', visible: f => f.estado === 'PLANIFICADO', ejecutar: accionFormulario({ titulo: f => 'Iniciar ' + f.nombreCodigo, campos: [fecha('fechaInicioEfectiva', 'Fecha de inicio efectivo', { req: true, defecto: () => hoy() })],
            ruta: f => `/ciclos-productivos/${f.id}/iniciar`, mensaje: 'Ciclo iniciado.' }) },
          { label: 'Finalizar', visible: f => f.estado === 'ACTIVO', ejecutar: accionFormulario({ titulo: f => 'Finalizar ' + f.nombreCodigo, campos: [fecha('fechaFinEfectiva', 'Fecha de fin efectivo', { req: true, defecto: () => hoy() })],
            ruta: f => `/ciclos-productivos/${f.id}/finalizar`, mensaje: 'Ciclo finalizado.' }) }] });
    }

    /* ---------- Actividades ---------- */
    const camposEjecucion = (conTipo) => [
      ...(conTipo ? [{ name: 'cicloId', label: 'Ciclo', tipo: 'select', req: true, remoto: ciclosActivos },
        { name: 'tipoActividadId', label: 'Tipo de actividad', tipo: 'select', req: true, remoto: remoto('tipos', '?estado=ACTIVA') }] : []),
      responsable(), fecha('fechaEjecucion', 'Fecha de ejecución', { req: true, defecto: () => hoy() }),
      { name: 'superficieTrabajadaHa', label: 'Superficie trabajada (ha)', tipo: 'number', min: 0, ayuda: 'Opcional.' },
      { name: 'duracionHoras', label: 'Duración (horas)', tipo: 'number', min: 0, ayuda: 'Opcional.' },
      { name: 'descripcionTrabajo', label: 'Descripción del trabajo realizado', tipo: 'area', req: true, ancho: 'completo' },
      { name: 'observaciones', label: 'Observaciones', tipo: 'area', vacioComo: null, ancho: 'completo' }];

    pantallaListado({ id: 'actividades-programadas', titulo: 'Actividades programadas', nombreSingular: 'actividad', textoNuevo: 'Programar actividad', mensajeAlta: 'Actividad programada.',
      descripcion: 'Labores planificadas para un ciclo activo. Se pueden reprogramar, cancelar o registrar como realizadas.',
      ruta: '/actividades-programadas', vacio: 'Todavía no hay actividades programadas.', editar: false,
      antes: () => cargarReferencias([refs.ciclos, refs.tipos, refs.usuarios]),
      filtros: [{ name: 'cicloId', label: 'Ciclo', tipo: 'select', remoto: remoto('ciclos') }, { name: 'tipoActividadId', label: 'Tipo', tipo: 'select', remoto: remoto('tipos') },
        { name: 'estado', label: 'Estado', tipo: 'select', opciones: ESTADOS_JORNADA }, { name: 'desde', label: 'Desde', tipo: 'date' }, { name: 'hasta', label: 'Hasta', tipo: 'date' }],
      columnas: [{ titulo: 'Fecha', valor: f => texto(f.fechaProgramada) }, { titulo: 'Ciclo', valor: f => cicloDe(f.cicloId) }, { titulo: 'Tipo', valor: f => ref('/tipos-actividad', f.tipoActividadId) },
        { titulo: 'Responsable', valor: f => usuarioDe(f.responsableId) }, { titulo: 'Superficie (ha)', valor: f => numero(f.superficiePrevista) }, { titulo: 'Estado', valor: f => pill(f.estado) }],
      campos: [{ name: 'cicloId', label: 'Ciclo', tipo: 'select', req: true, remoto: ciclosActivos },
        { name: 'tipoActividadId', label: 'Tipo de actividad', tipo: 'select', req: true, remoto: remoto('tipos', '?estado=ACTIVA') },
        fecha('fechaProgramada', 'Fecha programada', { req: true }), responsable(),
        { name: 'superficiePrevista', label: 'Superficie prevista (ha)', tipo: 'number', min: 0, ayuda: 'Opcional. No puede superar la de la plantación.' },
        { name: 'descripcion', label: 'Descripción', tipo: 'area', vacioComo: null, ancho: 'completo' },
        { name: 'observaciones', label: 'Observaciones', tipo: 'area', vacioComo: null, ancho: 'completo' }],
      accionesExtra: [
        { label: 'Realizada', visible: f => f.estado === 'PENDIENTE', ejecutar: accionFormulario({ titulo: () => 'Registrar actividad realizada', campos: camposEjecucion(false), ruta: () => '/actividades-realizadas', metodo: 'POST',
          cuerpo: (v, f) => ({ ...v, actividadProgramadaId: f.id }), mensaje: 'Actividad registrada como realizada.' }) },
        { label: 'Reprogramar', visible: f => f.estado === 'PENDIENTE', ejecutar: accionFormulario({ titulo: () => 'Reprogramar actividad',
          campos: sinVacio([fecha('fechaProgramada', 'Nueva fecha', { req: true }), { name: 'responsableId', label: 'Responsable', tipo: 'select', remoto: usuariosRemoto, vacio: 'Sin cambios' },
            { name: 'superficiePrevista', label: 'Superficie prevista (ha)', tipo: 'number', min: 0 }, { name: 'descripcion', label: 'Descripción', tipo: 'area', ancho: 'completo' },
            { name: 'observaciones', label: 'Observaciones', tipo: 'area', ancho: 'completo' }]),
          ruta: f => `/actividades-programadas/${f.id}/reprogramar`, mensaje: 'Actividad reprogramada.' }) },
        { label: 'Cancelar', visible: f => f.estado === 'PENDIENTE', ejecutar: accionFormulario({ titulo: () => 'Cancelar actividad', campos: [{ name: 'motivoCancelacion', label: 'Motivo de cancelación', tipo: 'area', req: true, ancho: 'completo' }],
          ruta: f => `/actividades-programadas/${f.id}/cancelar`, mensaje: 'Actividad cancelada.' }) }] });

    pantallaListado({ id: 'actividades-realizadas', titulo: 'Actividades realizadas', nombreSingular: 'actividad', textoNuevo: 'Registrar actividad', mensajeAlta: 'Actividad registrada.',
      descripcion: 'Labores efectivamente ejecutadas. Podés registrar una directa, sin programación previa.',
      ruta: '/actividades-realizadas', vacio: 'Todavía no hay actividades realizadas.', editar: false,
      antes: () => cargarReferencias([refs.ciclos, refs.tipos, refs.usuarios]),
      filtros: [{ name: 'cicloId', label: 'Ciclo', tipo: 'select', remoto: remoto('ciclos') }, { name: 'tipoActividadId', label: 'Tipo', tipo: 'select', remoto: remoto('tipos') },
        { name: 'origen', label: 'Origen', tipo: 'select', opciones: [['PROGRAMADA', 'Programada'], ['NO_PROGRAMADA', 'Directa']] },
        { name: 'desde', label: 'Desde', tipo: 'date' }, { name: 'hasta', label: 'Hasta', tipo: 'date' }],
      columnas: [{ titulo: 'Fecha', valor: f => f.fechaEjecucion }, { titulo: 'Ciclo', valor: f => cicloDe(f.cicloId) }, { titulo: 'Tipo', valor: f => ref('/tipos-actividad', f.tipoActividadId) },
        { titulo: 'Responsable', valor: f => usuarioDe(f.responsableId) }, { titulo: 'Superficie (ha)', valor: f => numero(f.superficieTrabajadaHa) },
        { titulo: 'Origen', valor: f => f.origen === 'PROGRAMADA' ? 'Programada' : 'Directa' }, { titulo: 'Trabajo', valor: f => texto(f.descripcionTrabajo) }],
      campos: [...camposEjecucion(true), { name: 'monitoreoId', label: 'Monitoreo que la origina', tipo: 'select', vacio: 'Ninguno',
        remoto: { ruta: '/monitoreos', etiqueta: m => `${m.fechaInspeccion} · ${m.tipoObservacion}` }, ayuda: 'Opcional. Debe ser del mismo ciclo.' }],
      cuerpo: (v) => ({ ...v, origen: 'NO_PROGRAMADA' }) });

    pantallaListado({ id: 'monitoreos', titulo: 'Monitoreos', nombreSingular: 'monitoreo', textoNuevo: 'Registrar monitoreo', mensajeAlta: 'Monitoreo registrado.',
      descripcion: 'Inspecciones de cultivo en un ciclo activo. El detalle muestra las labores vinculadas.',
      ruta: '/monitoreos', vacio: 'Todavía no hay monitoreos registrados.', editar: false,
      antes: () => cargarReferencias([refs.ciclos, refs.usuarios]),
      filtros: [{ name: 'cicloId', label: 'Ciclo', tipo: 'select', remoto: remoto('ciclos') }, { name: 'tipoObservacion', label: 'Tipo de observación', max: 100 },
        { name: 'estadoGeneralCultivo', label: 'Estado del cultivo', max: 100 },
        { name: 'conProblema', label: 'Problemas', tipo: 'select', opciones: [['true', 'Con problema'], ['false', 'Sin problema']] },
        { name: 'desde', label: 'Desde', tipo: 'date' }, { name: 'hasta', label: 'Hasta', tipo: 'date' }],
      columnas: [{ titulo: 'Fecha', valor: f => f.fechaInspeccion }, { titulo: 'Ciclo', valor: f => cicloDe(f.cicloId) }, { titulo: 'Sector', valor: f => texto(f.sectorObservado) },
        { titulo: 'Estado del cultivo', valor: f => f.estadoGeneralCultivo }, { titulo: 'Tipo', valor: f => f.tipoObservacion },
        { titulo: 'Problema', valor: f => texto(f.problemaDetectado) }, { titulo: 'Responsable', valor: f => usuarioDe(f.responsableId) }],
      campos: [{ name: 'cicloId', label: 'Ciclo', tipo: 'select', req: true, remoto: ciclosActivos }, responsable(), fecha('fechaInspeccion', 'Fecha de inspección', { req: true, defecto: () => hoy() }),
        { name: 'sectorObservado', label: 'Sector observado', max: 120, vacioComo: null }, { name: 'etapaFenologica', label: 'Etapa fenológica', max: 100, vacioComo: null, ayuda: 'Opcional.' },
        { name: 'estadoGeneralCultivo', label: 'Estado general del cultivo', req: true, max: 100 }, { name: 'tipoObservacion', label: 'Tipo de observación', req: true, max: 100 },
        { name: 'problemaDetectado', label: 'Problema detectado', max: 300, vacioComo: null },
        { name: 'descripcionHallazgos', label: 'Descripción de hallazgos', tipo: 'area', req: true, ancho: 'completo' },
        { name: 'accionRecomendada', label: 'Acción recomendada', tipo: 'area', vacioComo: null, ancho: 'completo' }],
      accionesExtra: [{ label: 'Detalle', ejecutar: async (f) => {
        try {
          const d = (await api('/monitoreos/' + f.id)).data;
          const lista = (arr, fn) => arr.length ? el('ul', {}, arr.map(fn)) : null;
          abrirVentana('Monitoreo del ' + d.fechaInspeccion, el('div', { class: 'detalle' },
            el('p', {}, el('strong', {}, d.tipoObservacion), ' · ', d.estadoGeneralCultivo),
            el('p', {}, d.descripcionHallazgos),
            d.accionRecomendada ? el('p', { class: 'ayuda' }, 'Recomendación: ' + d.accionRecomendada) : null,
            el('h3', {}, 'Intervenciones vinculadas'),
            lista(d.actividadesRealizadas, a => el('li', {}, `${a.fechaEjecucion} · ${a.tipoActividad}`)),
            lista(d.aplicacionesInsumos, a => el('li', {}, `Aplicación: ${a.metodoAplicacion}`)),
            d.mensajeIntervenciones ? el('p', { class: 'tabla-mensaje' }, d.mensajeIntervenciones) : null), { ancho: '640px' });
        } catch (err) { aviso(err.message, 'error'); }
      } }] });

    /* ---------- Aplicaciones de insumos ---------- */
    const camposAplicacion = (conMotivoCorreccion) => [
      ...(conMotivoCorreccion ? [{ name: 'motivoCorreccion', label: 'Motivo de la corrección', tipo: 'area', req: true, ancho: 'completo' }] : []),
      { name: 'actividadRealizadaId', label: 'Actividad realizada', tipo: 'select', req: true, soloLecturaAlEditar: false,
        remoto: { ruta: '/actividades-realizadas', etiqueta: a => `${a.fechaEjecucion} · ${ref('/tipos-actividad', a.tipoActividadId)} · ${cicloDe(a.cicloId)}` } },
      { name: 'superficieTratada', label: 'Superficie tratada (ha)', tipo: 'number', req: true, min: 0, ayuda: 'No puede superar la superficie trabajada de la actividad.' },
      { name: 'metodoAplicacion', label: 'Método de aplicación', req: true, max: 500 }, { name: 'motivoAplicacion', label: 'Motivo de la aplicación', req: true, max: 500 },
      { name: 'items', label: 'Insumos aplicados', tipo: 'lineas', req: true, textoLinea: 'insumo', sub: [
        { name: 'insumoId', label: 'Insumo', tipo: 'select', remoto: remoto('insumos', '?estado=ACTIVO') }, { name: 'cantidad', label: 'Cantidad', tipo: 'number' },
        { name: 'unidadMedida', label: 'Unidad' }, { name: 'dosis', label: 'Dosis', tipo: 'number' }] },
      { name: 'observaciones', label: 'Observaciones', tipo: 'area', vacioComo: null, ancho: 'completo' }];
    const datosAplicacion = (v) => ({ actividadRealizadaId: v.actividadRealizadaId, superficieTratada: v.superficieTratada, metodoAplicacion: v.metodoAplicacion,
      motivoAplicacion: v.motivoAplicacion, observaciones: v.observaciones ?? null, items: v.items });

    pantallaListado({ id: 'aplicaciones-insumos', titulo: 'Aplicaciones de insumos', nombreSingular: 'aplicación', textoNuevo: 'Registrar aplicación', mensajeAlta: 'Aplicación registrada. El stock se descontó.',
      descripcion: 'Insumos aplicados en una actividad realizada. Descuentan el stock disponible (primero lo que vence antes). Se corrigen con una nueva versión.',
      ruta: '/aplicaciones-insumos', vacio: 'Todavía no hay aplicaciones registradas.', editar: false, ancho: '760px',
      antes: () => cargarReferencias([refs.insumos]),
      filtros: [{ name: 'insumoId', label: 'Insumo', tipo: 'select', remoto: remoto('insumos') }, { name: 'actividadRealizadaId', label: 'Actividad', tipo: 'select', remoto: { ruta: '/actividades-realizadas', etiqueta: a => `${a.fechaEjecucion} · ${a.id.slice(0, 6)}` } }],
      columnas: [{ titulo: 'Registrada', valor: f => texto((f.registradoEn || '').slice(0, 10)) }, { titulo: 'Superficie (ha)', valor: f => numero(f.superficieTratada) },
        { titulo: 'Método', valor: f => f.metodoAplicacion }, { titulo: 'Motivo', valor: f => f.motivoAplicacion },
        { titulo: 'Insumos', valor: f => (f.items || []).map(i => `${ref('/insumos', i.insumoId)} (${numero(i.cantidadAplicada)})`).join(', ') || '—' }],
      campos: camposAplicacion(false), cuerpo: (v) => ({ ...datosAplicacion(v), operacionId: nuevaOperacion() }),
      accionesExtra: [{ label: 'Corregir', visible: f => !f.versionSiguienteId, ejecutar: (f, recargar) => U.abrirFormulario({ titulo: 'Corregir aplicación', campos: camposAplicacion(true), modo: 'alta', ancho: '760px',
        valores: { actividadRealizadaId: f.actividadRealizadaId, superficieTratada: Number(f.superficieTratada), metodoAplicacion: f.metodoAplicacion, motivoAplicacion: f.motivoAplicacion,
          observaciones: f.observaciones, items: (f.items || []).map(i => ({ insumoId: i.insumoId, cantidad: Number(i.cantidadAplicada), unidadMedida: '', dosis: Number(i.dosis) })) },
        guardar: async (v) => {
          await api(`/aplicaciones-insumos/${f.id}/correcciones`, { method: 'POST', body: { operacionId: nuevaOperacion(), motivoCorreccion: v.motivoCorreccion, nuevaAplicacion: datosAplicacion(v) } });
          aviso('Aplicación corregida: se creó una nueva versión.', 'ok'); recargar();
        } }) }] });

    /* ---------- Inventario ---------- */
    pantallaListado({ id: 'inventario-existencias', titulo: 'Existencias de insumos', nombreSingular: 'ingreso', textoNuevo: 'Registrar ingreso', mensajeAlta: 'Ingreso registrado.',
      descripcion: 'Stock físico, utilizable y vencido de cada insumo, con alertas de stock mínimo y vencimiento.',
      ruta: '/inventario/existencias', vacio: 'Todavía no hay existencias registradas.', editar: false, paginar: true,
      filtros: [{ name: 'insumoId', label: 'Insumo', tipo: 'select', remoto: remoto('insumos') }],
      columnas: [{ titulo: 'Insumo', valor: f => `${f.codigo} · ${f.nombre}` }, { titulo: 'Unidad', valor: f => texto(f.unidadMedida) }, { titulo: 'Stock físico', valor: f => numero(f.stockFisico) },
        { titulo: 'Utilizable', valor: f => numero(f.stockUtilizable) }, { titulo: 'Vencido', valor: f => numero(f.stockVencido) }, { titulo: 'Mínimo', valor: f => numero(f.nivelMinimo) },
        { titulo: 'Alertas', valor: f => el('span', {}, f.alertaStockMinimo ? el('span', { class: 'pill pill-alerta' }, 'Stock bajo') : null, ' ', f.alertaVencimiento ? el('span', { class: 'pill pill-alerta' }, 'Vencimiento') : null,
          !f.alertaStockMinimo && !f.alertaVencimiento ? el('span', { class: 'pill pill-ok' }, 'Sin alertas') : null) }],
      rutaAlta: '/inventario/ingresos',
      campos: [{ name: 'insumoId', label: 'Insumo', tipo: 'select', req: true, remoto: remoto('insumos', '?estado=ACTIVO') },
        { name: 'tipoMovimiento', label: 'Tipo', tipo: 'select', req: true, opciones: [['INGRESO', 'Ingreso'], ['EXISTENCIA_INICIAL', 'Existencia inicial']], defecto: () => 'INGRESO' },
        { name: 'cantidad', label: 'Cantidad', tipo: 'number', req: true, min: 0 }, { name: 'unidadMedida', label: 'Unidad de medida', req: true, max: 30, ayuda: 'Debe coincidir con la del insumo.' },
        fecha('fechaIngreso', 'Fecha de ingreso', { req: true, defecto: () => hoy() }), { name: 'proveedor', label: 'Proveedor', req: true, max: 200 },
        fecha('fechaVencimiento', 'Fecha de vencimiento', { ayuda: 'Opcional.' }), { name: 'motivo', label: 'Motivo', max: 500, ayuda: 'Opcional.' }],
      cuerpo: async (v) => ({ ...v, fincaId: await fincaActual(), operacionId: nuevaOperacion(), fechaVencimiento: v.fechaVencimiento || null }) });

    pantallaListado({ id: 'inventario-movimientos', titulo: 'Movimientos de inventario', nombreSingular: 'movimiento', textoNuevo: 'Registrar movimiento', mensajeAlta: 'Movimiento registrado.',
      descripcion: 'Historial de ingresos, egresos y ajustes. Los ajustes manuales son ajustes, pérdidas y devoluciones.',
      ruta: '/inventario/movimientos', vacio: 'Todavía no hay movimientos registrados.', editar: false,
      antes: () => cargarReferencias([refs.insumos, refs.usuarios]),
      filtros: [{ name: 'insumoId', label: 'Insumo', tipo: 'select', remoto: remoto('insumos') },
        { name: 'tipoMovimiento', label: 'Tipo', tipo: 'select', opciones: [['INGRESO', 'Ingreso'], ['EXISTENCIA_INICIAL', 'Existencia inicial'], ...TIPOS_MOV_INVENTARIO, ['EGRESO_APLICACION', 'Egreso por aplicación']] },
        { name: 'desde', label: 'Desde', tipo: 'date' }, { name: 'hasta', label: 'Hasta', tipo: 'date' }],
      columnas: [{ titulo: 'Fecha', valor: f => f.fechaMovimiento }, { titulo: 'Tipo', valor: f => pill(f.tipoMovimiento) }, { titulo: 'Insumo', valor: f => ref('/insumos', f.insumoId) },
        { titulo: 'Cantidad', valor: f => `${numero(f.cantidad)} ${f.unidadMedida || ''}` }, { titulo: 'Motivo', valor: f => texto(f.motivo) }, { titulo: 'Responsable', valor: f => usuarioDe(f.responsableId) }],
      campos: [{ name: 'partidaId', label: 'Partida de insumo', tipo: 'select', req: true,
        remoto: { ruta: '/inventario/partidas', etiqueta: p => `${ref('/insumos', p.insumoId)} · ingreso ${p.fechaIngreso} · disp. ${numero(p.cantidadDisponible)}` } },
        { name: 'tipoMovimiento', label: 'Tipo', tipo: 'select', req: true, opciones: TIPOS_MOV_INVENTARIO },
        { name: 'cantidad', label: 'Cantidad', tipo: 'number', req: true, min: 0 }, { name: 'unidadMedida', label: 'Unidad de medida', req: true, max: 30 },
        fecha('fechaMovimiento', 'Fecha', { req: true, defecto: () => hoy() }), { name: 'motivo', label: 'Motivo', max: 500, ayuda: 'Opcional.' }],
      cuerpo: (v) => conOperacion(v) });

    /* ---------- Cosecha ---------- */
    const camposCosecha = (conCiclo) => [
      ...(conCiclo ? [{ name: 'cicloId', label: 'Ciclo', tipo: 'select', req: true, remoto: ciclosActivos }] : []),
      fecha('fechaEfectiva', 'Fecha de cosecha', { req: true, defecto: () => hoy() }),
      { name: 'numeroPasada', label: 'Número de pasada', tipo: 'number', req: true, min: 1, paso: '1', defecto: () => 1 },
      { name: 'cantidadCosechadaKg', label: 'Kg cosechados', tipo: 'number', req: true, min: 0 }, responsable(),
      { name: 'sector', label: 'Sector', max: 120, vacioComo: undefined, ayuda: 'Opcional.' },
      { name: 'observaciones', label: 'Observaciones', tipo: 'area', vacioComo: null, ancho: 'completo' }];

    pantallaListado({ id: 'cosechas-programadas', titulo: 'Cosechas programadas', nombreSingular: 'jornada', textoNuevo: 'Programar cosecha', mensajeAlta: 'Cosecha programada.',
      descripcion: 'Jornadas de cosecha previstas. Se reprograman, se cancelan o se registran como cosecha realizada.',
      ruta: '/cosechas-programadas', vacio: 'Todavía no hay cosechas programadas.', editar: false,
      antes: () => cargarReferencias([refs.ciclos, refs.usuarios]),
      filtros: [{ name: 'cicloId', label: 'Ciclo', tipo: 'select', remoto: remoto('ciclos') }, { name: 'estado', label: 'Estado', tipo: 'select', opciones: ESTADOS_JORNADA },
        ...(esAdmin ? [{ name: 'loteId', label: 'Lote', tipo: 'select', remoto: remoto('lotes') }] : []), { name: 'desde', label: 'Desde', tipo: 'date' }, { name: 'hasta', label: 'Hasta', tipo: 'date' }],
      columnas: [{ titulo: 'Fecha', valor: f => f.fechaPrevista }, { titulo: 'Ciclo', valor: f => cicloDe(f.cicloId) }, { titulo: 'Sector', valor: f => texto(f.sector) },
        { titulo: 'Kg estimados', valor: f => numero(f.cantidadEstimadaKg) }, { titulo: 'Responsable', valor: f => usuarioDe(f.responsableId) }, { titulo: 'Estado', valor: f => pill(f.estado) }],
      campos: [{ name: 'cicloId', label: 'Ciclo', tipo: 'select', req: true, remoto: ciclosActivos }, fecha('fechaPrevista', 'Fecha prevista', { req: true }), responsable(),
        { name: 'sector', label: 'Sector', max: 120, vacioComo: undefined, ayuda: 'Opcional.' }, { name: 'cantidadEstimadaKg', label: 'Kg estimados', tipo: 'number', min: 0, ayuda: 'Opcional.' },
        { name: 'observaciones', label: 'Observaciones', tipo: 'area', vacioComo: null, ancho: 'completo' }],
      cuerpo: (v) => conOperacion(v),
      accionesExtra: [
        { label: 'Cosecha realizada', visible: f => f.estado === 'PENDIENTE', ejecutar: accionFormulario({ titulo: () => 'Registrar cosecha realizada', campos: camposCosecha(false), ruta: () => '/cosechas', metodo: 'POST',
          cuerpo: (v, f) => ({ ...v, operacionId: nuevaOperacion(), origen: 'PROGRAMADA', cosechaProgramadaId: f.id, versionProgramacion: f.version }), mensaje: 'Cosecha registrada.' }) },
        { label: 'Reprogramar', visible: f => f.estado === 'PENDIENTE', ejecutar: accionFormulario({ titulo: () => 'Reprogramar cosecha',
          campos: sinVacio([fecha('fechaPrevista', 'Nueva fecha', { req: true }), { name: 'responsableId', label: 'Responsable', tipo: 'select', remoto: usuariosRemoto, vacio: 'Sin cambios' },
            { name: 'sector', label: 'Sector', max: 120 }, { name: 'cantidadEstimadaKg', label: 'Kg estimados', tipo: 'number', min: 0 }, { name: 'observaciones', label: 'Observaciones', tipo: 'area', ancho: 'completo' }]),
          ruta: f => `/cosechas-programadas/${f.id}/reprogramar`, cuerpo: (v, f) => ({ ...v, version: f.version }), mensaje: 'Cosecha reprogramada.' }) },
        { label: 'Cancelar', visible: f => f.estado === 'PENDIENTE', ejecutar: accionFormulario({ titulo: () => 'Cancelar cosecha', campos: sinVacio([{ name: 'motivoCancelacion', label: 'Motivo de cancelación', tipo: 'area', ancho: 'completo', ayuda: 'Opcional.' }]),
          ruta: f => `/cosechas-programadas/${f.id}/cancelar`, cuerpo: (v, f) => ({ ...v, version: f.version }), mensaje: 'Cosecha cancelada.' }) }] });

    pantallaListado({ id: 'cosechas', titulo: 'Cosechas realizadas', nombreSingular: 'cosecha', textoNuevo: 'Registrar cosecha', mensajeAlta: 'Cosecha registrada.',
      descripcion: 'Pesajes reales por pasada. Una cosecha puede venir de una jornada programada o registrarse directamente.',
      ruta: '/cosechas', vacio: 'Todavía no hay cosechas registradas.', editar: false,
      antes: () => cargarReferencias([refs.ciclos]),
      filtros: [{ name: 'cicloId', label: 'Ciclo', tipo: 'select', remoto: remoto('ciclos') },
        ...(esAdmin ? [{ name: 'cultivoId', label: 'Cultivo', tipo: 'select', remoto: remoto('cultivos') }] : []),
        { name: 'origen', label: 'Origen', tipo: 'select', opciones: [['PROGRAMADA', 'Programada'], ['NO_PROGRAMADA', 'Directa']] }, { name: 'desde', label: 'Desde', tipo: 'date' }, { name: 'hasta', label: 'Hasta', tipo: 'date' }],
      columnas: [{ titulo: 'Fecha', valor: f => f.fecha }, { titulo: 'Código', valor: f => texto(f.codigoTrazabilidad) }, { titulo: 'Ciclo', valor: f => cicloDe(f.cicloId) },
        { titulo: 'Pasada', valor: f => texto(f.numeroPasada) }, { titulo: 'Kg', valor: f => numero(f.cantidadCosechadaKg) }, { titulo: 'Sector', valor: f => texto(f.sector) },
        { titulo: 'Origen', valor: f => f.origen === 'PROGRAMADA' ? 'Programada' : 'Directa' }],
      campos: camposCosecha(true), cuerpo: (v) => ({ ...v, operacionId: nuevaOperacion(), origen: 'NO_PROGRAMADA' }),
      accionesExtra: [{ label: 'Totales', ejecutar: async () => {
        try {
          const t = (await api('/cosechas/totales')).data;
          abrirVentana('Totales de cosecha', el('div', { class: 'resumen-grid' },
            el('div', { class: 'resumen-item' }, el('strong', {}, numero(t.cantidadCosechas)), el('span', {}, 'Cosechas registradas')),
            el('div', { class: 'resumen-item' }, el('strong', {}, numero(t.totalCosechadoKg) + ' kg'), el('span', {}, 'Total cosechado'))), { ancho: '480px' });
        } catch (err) { aviso(err.message, 'error'); }
      } }] });

    /* ---------- Poscosecha ---------- */
    const cosechasRemoto = { ruta: '/cosechas', etiqueta: c => `${c.fecha} · ${c.codigoTrazabilidad || c.id.slice(0, 6)} · ${numero(c.cantidadCosechadaKg)} kg` };
    const partidasRemoto = { ruta: '/partidas-produccion', etiqueta: p => `${p.categoria === 'FRESCO' ? 'Fresco' : 'Industria'} · disp. ${numero(p.cantidadDisponibleKg)} kg · cosecha ${p.cosechaId.slice(0, 6)}` };

    pantallaListado({ id: 'clasificaciones', titulo: 'Clasificación y pérdidas', nombreSingular: 'clasificación', textoNuevo: 'Registrar clasificación', mensajeAlta: 'Clasificación registrada.',
      descripcion: 'Reparto de los kg de una cosecha en fresco, industria y descarte. Los kg deben sumar exactamente lo recibido.',
      ruta: '/clasificaciones', vacio: 'Todavía no hay clasificaciones registradas.', editar: false, ancho: '720px',
      filtros: [{ name: 'cosechaId', label: 'Cosecha', tipo: 'select', remoto: cosechasRemoto }, { name: 'desde', label: 'Desde', tipo: 'date' }, { name: 'hasta', label: 'Hasta', tipo: 'date' }],
      columnas: [{ titulo: 'Fecha', valor: f => f.fechaClasificacion }, { titulo: 'Recibido (kg)', valor: f => numero(f.cantidadRecibidaKg) }, { titulo: 'Fresco', valor: f => numero(f.kgFresco) },
        { titulo: 'Industria', valor: f => numero(f.kgIndustria) }, { titulo: 'Descarte', valor: f => numero(f.kgDescarte) },
        { titulo: 'Causas', valor: f => (f.descartePorCausa || []).map(c => `${c.causa} (${numero(c.kg)})`).join(', ') || texto((f.motivosDescarte || []).join(', ')) }],
      campos: [{ name: 'cosechaId', label: 'Cosecha', tipo: 'select', req: true, remoto: cosechasRemoto }, fecha('fechaClasificacion', 'Fecha', { req: true, defecto: () => hoy() }), responsable(),
        { name: 'cantidadRecibidaKg', label: 'Kg recibidos', tipo: 'number', req: true, min: 0 }, { name: 'kgFresco', label: 'Kg fresco', tipo: 'number', req: true, min: 0, defecto: () => 0 },
        { name: 'kgIndustria', label: 'Kg industria', tipo: 'number', req: true, min: 0, defecto: () => 0 }, { name: 'kgDescarte', label: 'Kg descarte', tipo: 'number', req: true, min: 0, defecto: () => 0 },
        { name: 'descartePorCausa', label: 'Descarte por causa', tipo: 'lineas', textoLinea: 'causa', sub: [{ name: 'causa', label: 'Causa' }, { name: 'kg', label: 'Kg', tipo: 'number' }] },
        { name: 'observaciones', label: 'Observaciones', tipo: 'area', vacioComo: null, ancho: 'completo' }],
      cuerpo: (v) => ({ ...conOperacion(v), motivosDescarte: [], descartePorCausa: (v.descartePorCausa || []).length ? v.descartePorCausa : undefined }),
      accionesExtra: [{ label: 'Totales', ejecutar: async () => {
        try {
          const t = (await api('/clasificaciones/totales')).data;
          const item = (n, l) => el('div', { class: 'resumen-item' }, el('strong', {}, numero(n) + ' kg'), el('span', {}, l));
          abrirVentana('Totales de clasificación', el('div', { class: 'detalle' },
            el('div', { class: 'resumen-grid' }, item(t.clasificadoKg, 'Clasificado'), item(t.aprovechableKg, 'Aprovechable'), item(t.frescoKg, 'Fresco'), item(t.industriaKg, 'Industria'), item(t.descarteKg, 'Descarte'))), { ancho: '620px' });
        } catch (err) { aviso(err.message, 'error'); }
      } }] });

    pantallaListado({ id: 'acondicionamientos', titulo: 'Acondicionamiento', nombreSingular: 'acondicionamiento', textoNuevo: 'Registrar acondicionamiento', mensajeAlta: 'Acondicionamiento registrado.',
      descripcion: 'Preparación y envasado de la producción clasificada. No cambia el stock físico.',
      ruta: '/acondicionamientos', vacio: 'Todavía no hay acondicionamientos registrados.', editar: false,
      filtros: [{ name: 'partidaProduccionId', label: 'Partida', tipo: 'select', remoto: partidasRemoto }, { name: 'desde', label: 'Desde', tipo: 'date' }, { name: 'hasta', label: 'Hasta', tipo: 'date' }],
      columnas: [{ titulo: 'Fecha', valor: f => f.fechaAcondicionamiento }, { titulo: 'Preparación', valor: f => f.tipoAcondicionamiento }, { titulo: 'Envase', valor: f => f.tipoEnvase },
        { titulo: 'Envases', valor: f => numero(f.cantidadEnvases) }, { titulo: 'Kg', valor: f => numero(f.cantidadKg) }],
      campos: [{ name: 'partidaProduccionId', label: 'Partida', tipo: 'select', req: true, remoto: partidasRemoto }, fecha('fechaAcondicionamiento', 'Fecha', { req: true, defecto: () => hoy() }), responsable(),
        { name: 'tipoAcondicionamiento', label: 'Tipo de acondicionamiento', req: true, max: 100 }, { name: 'cantidadKg', label: 'Kg acondicionados', tipo: 'number', req: true, min: 0 },
        { name: 'tipoEnvase', label: 'Tipo de envase', max: 100, vacioComo: undefined, ayuda: 'Opcional.' }, { name: 'cantidadEnvases', label: 'Cantidad de envases', tipo: 'number', min: 0, paso: '1', ayuda: 'Opcional.' },
        { name: 'observaciones', label: 'Observaciones', tipo: 'area', vacioComo: null, ancho: 'completo' }],
      cuerpo: (v) => conOperacion(v) });

    /* ---------- Almacenamiento y destinos ---------- */
    pantallaListado({ id: 'camaras', titulo: 'Cámaras de almacenamiento', nombreSingular: 'cámara', textoNuevo: 'Nueva cámara', mensajeAlta: 'Cámara registrada.',
      descripcion: 'Cámaras o sectores donde se conserva la producción.',
      ruta: '/almacenamiento/camaras', vacio: 'Todavía no hay cámaras registradas.', editar: false,
      columnas: [{ titulo: 'Nombre', valor: f => f.nombre }, { titulo: 'Descripción', valor: f => texto(f.descripcion) }, { titulo: 'Temperatura objetivo (°C)', valor: f => numero(f.temperaturaObjetivoC) }],
      campos: [{ name: 'nombre', label: 'Nombre', req: true, max: 40 }, { name: 'temperaturaObjetivoC', label: 'Temperatura objetivo (°C)', tipo: 'number', ayuda: 'Opcional.' },
        { name: 'descripcion', label: 'Descripción', tipo: 'area', vacioComo: null, ancho: 'completo' }],
      cuerpo: async (v) => ({ ...v, fincaId: await fincaActual(), operacionId: nuevaOperacion(), temperaturaObjetivoC: v.temperaturaObjetivoC ?? null }) });

    pantallaListado({ id: 'almacenamiento-movimientos', titulo: 'Movimientos de cámara', nombreSingular: 'movimiento', textoNuevo: 'Registrar movimiento', mensajeAlta: 'Movimiento registrado.',
      descripcion: 'Ingresos y salidas de producción en las cámaras. Una salida no puede superar lo que hay en la cámara.',
      ruta: '/almacenamiento/movimientos', vacio: 'Todavía no hay movimientos de cámara.', editar: false,
      antes: () => cargarReferencias([{ ruta: '/almacenamiento/camaras', etiqueta: R.camaras.etiqueta }]),
      filtros: [{ name: 'camaraSectorId', label: 'Cámara', tipo: 'select', remoto: remoto('camaras') }, { name: 'tipoMovimiento', label: 'Tipo', tipo: 'select', opciones: [['INGRESO', 'Ingreso'], ['SALIDA', 'Salida']] },
        { name: 'desde', label: 'Desde', tipo: 'date' }, { name: 'hasta', label: 'Hasta', tipo: 'date' }],
      columnas: [{ titulo: 'Fecha', valor: f => f.fechaMovimiento }, { titulo: 'Tipo', valor: f => pill(f.tipoMovimiento) }, { titulo: 'Cámara', valor: f => ref('/almacenamiento/camaras', f.camaraSectorId) },
        { titulo: 'Kg', valor: f => numero(f.cantidadKg) }, { titulo: 'Observaciones', valor: f => texto(f.observaciones) }],
      campos: [{ name: 'camaraSectorId', label: 'Cámara', tipo: 'select', req: true, remoto: remoto('camaras') }, { name: 'partidaProduccionId', label: 'Partida', tipo: 'select', req: true, remoto: partidasRemoto },
        { name: 'tipoMovimiento', label: 'Tipo', tipo: 'select', req: true, opciones: [['INGRESO', 'Ingreso'], ['SALIDA', 'Salida']] }, { name: 'cantidadKg', label: 'Kg', tipo: 'number', req: true, min: 0 },
        fecha('fechaMovimiento', 'Fecha', { req: true, defecto: () => hoy() }), responsable(), { name: 'observaciones', label: 'Observaciones', tipo: 'area', vacioComo: null, ancho: 'completo' }],
      cuerpo: (v) => conOperacion(v) });

    pantallaListado({ id: 'almacenamiento-saldos', titulo: 'Saldos en cámara', alta: false, editar: false,
      descripcion: 'Kg que hay hoy en cada cámara, por partida.', ruta: '/almacenamiento/saldos', vacio: 'No hay producción almacenada.',
      antes: () => cargarReferencias([{ ruta: '/almacenamiento/camaras', etiqueta: R.camaras.etiqueta }]),
      filtros: [{ name: 'camaraSectorId', label: 'Cámara', tipo: 'select', remoto: remoto('camaras') }],
      columnas: [{ titulo: 'Cámara', valor: f => ref('/almacenamiento/camaras', f.camaraSectorId) }, { titulo: 'Partida', valor: f => f.partidaProduccionId.slice(0, 8) + '…' }, { titulo: 'Kg en cámara', valor: f => numero(f.cantidadKg) }],
      campos: [] });

    pantallaListado({ id: 'destinos', titulo: 'Destinos de producción', nombreSingular: 'destino', textoNuevo: 'Registrar destino', mensajeAlta: 'Destino registrado.',
      descripcion: 'A dónde se destina la producción: mercado fresco, industria u otro. Solo se destinan kg que estén fuera de cámara.',
      ruta: '/destinos-produccion', vacio: 'Todavía no hay destinos registrados.', editar: false,
      filtros: [{ name: 'tipoDestino', label: 'Tipo', tipo: 'select', opciones: TIPOS_DESTINO }, { name: 'desde', label: 'Desde', tipo: 'date' }, { name: 'hasta', label: 'Hasta', tipo: 'date' }],
      columnas: [{ titulo: 'Fecha', valor: f => f.fechaDestino }, { titulo: 'Tipo', valor: f => nombreDe(TIPOS_DESTINO, f.tipoDestino) }, { titulo: 'Destino', valor: f => f.destinoEspecifico },
        { titulo: 'Kg', valor: f => numero(f.cantidadDestinadaKg) }, { titulo: 'Observaciones', valor: f => texto(f.observaciones) }],
      campos: [{ name: 'partidaProduccionId', label: 'Partida', tipo: 'select', req: true, remoto: partidasRemoto }, fecha('fechaDestino', 'Fecha', { req: true, defecto: () => hoy() }),
        { name: 'tipoDestino', label: 'Tipo de destino', tipo: 'select', req: true, opciones: TIPOS_DESTINO }, { name: 'cantidadDestinadaKg', label: 'Kg', tipo: 'number', req: true, min: 0 },
        { name: 'destinoEspecifico', label: 'Destino específico', max: 200, vacioComo: undefined, ayuda: 'Obligatorio solo para «Otro».' }, responsable(),
        { name: 'observaciones', label: 'Observaciones', tipo: 'area', vacioComo: null, ancho: 'completo' }],
      cuerpo: (v) => conOperacion(v),
      accionesExtra: [{ label: 'Totales', ejecutar: async () => {
        try {
          const t = (await api('/destinos-produccion/totales')).data;
          abrirVentana('Totales por destino', el('div', { class: 'detalle' },
            el('p', {}, el('strong', {}, numero(t.totalDestinadoKg) + ' kg'), ' destinados en total.'),
            el('ul', {}, (t.porTipo || []).map(x => el('li', {}, `${nombreDe(TIPOS_DESTINO, x.tipoDestino)}: ${numero(x.totalKg)} kg (${x.cantidadDestinos} destinos)`)))), { ancho: '520px' });
        } catch (err) { aviso(err.message, 'error'); }
      } }] });
  }

  document.addEventListener('agrul:sesion', () => { if (A.ui && (A.puedeVer('ADMINISTRADOR') || A.puedeVer('ENCARGADO_CAMPO'))) configurar(); });
})();
