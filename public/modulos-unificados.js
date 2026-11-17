/* Módulos Consolidados de Agrul (5 módulos únicos: Finca, Producción, Insumos y Stock, Estadísticas, Auditoría) */
(function () {
  const AGRUL = window.AGRUL || (window.AGRUL = {});
  const pantallas = AGRUL.pantallas || (AGRUL.pantallas = {});
  const el = AGRUL.el || ((tag, attrs, ...children) => {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === false || v == null) return;
      if (k === 'class') n.className = v;
      else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    children.flat().forEach(h => { if (h != null && h !== false) n.append(h.nodeType ? h : document.createTextNode(String(h))); });
    return n;
  });

  function esAdmin() {
    return AGRUL.usuario && AGRUL.usuario.perfil === 'ADMINISTRADOR';
  }
  function esSistema() {
    return AGRUL.usuario && AGRUL.usuario.perfil === 'ADMIN_SISTEMA';
  }
  function formatoFecha(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso).slice(0, 10);
      return d.toLocaleString('es-AR', { timeZone: 'America/Argentina/Tucuman', dateStyle: 'short', timeStyle: 'short' });
    } catch (_) {
      return String(iso).slice(0, 16);
    }
  }
  function hoyInput() {
    const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  }
  function avisar(msg, tipo = 'ok') {
    if (typeof AGRUL.avisar === 'function') { AGRUL.avisar(msg, tipo); return; }
    const cont = document.getElementById('toast-container');
    if (cont) {
      const t = el('div', { class: `toast toast-${tipo === 'error' ? 'error' : 'success'}` }, msg);
      cont.appendChild(t);
      setTimeout(() => t.remove(), 4000);
    }
  }
  async function apiJson(ruta, opts = {}) {
    if (typeof AGRUL.api === 'function') return AGRUL.api(ruta, opts);
    const token = AGRUL.token || localStorage.getItem('agrul_auth_token') || '';
    const res = await fetch('/api/v1' + ruta, {
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || !json.success) {
      throw new Error((json && json.error && json.error.message) || `Error HTTP ${res.status}`);
    }
    return json.data;
  }

  /* =========================================================================
     MÓDULO 1: FINCA (Solo ADMINISTRADOR)
     ========================================================================= */
  pantallas.finca = async function renderFinca(raiz) {
    raiz.innerHTML = '<div class="pantalla-cab"><div><h2>Finca</h2><p>Cargando configuración territorial...</p></div></div>';
    try {
      const finca = await apiJson('/finca-resumen');
      const pct = finca.hectareasTotales > 0
        ? Math.min(100, Math.round((finca.hectareasAsignadas / finca.hectareasTotales) * 100))
        : 0;

      const form = el('form', { class: 'form-grid glass tarjeta-form', novalidate: true },
        el('div', { class: 'campo' }, el('label', {}, 'Nombre de la Finca *'), el('input', { id: 'f-nombre', type: 'text', value: finca.nombre, required: true })),
        el('div', { class: 'campo' }, el('label', {}, 'Propietario'), el('input', { id: 'f-propietario', type: 'text', value: finca.propietario || '' })),
        el('div', { class: 'campo' }, el('label', {}, 'Hectáreas Totales (ha) *'), el('input', { id: 'f-hectareas', type: 'number', step: '0.01', min: finca.hectareasAsignadas, value: finca.hectareasTotales, required: true })),
        el('div', { class: 'campo' }, el('label', {}, 'Localidad *'), el('input', { id: 'f-localidad', type: 'text', value: finca.localidad, required: true })),
        el('div', { class: 'campo' }, el('label', {}, 'Provincia *'), el('input', { id: 'f-provincia', type: 'text', value: finca.provincia, required: true })),
        el('div', { class: 'campo campo-completo' }, el('label', {}, 'Observaciones'), el('textarea', { id: 'f-obs', rows: 3 }, finca.observaciones || '')),
        el('div', { class: 'form-acciones' }, el('button', { class: 'btn btn-primary', type: 'submit' }, 'Guardar Configuración de Finca'))
      );

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await apiJson('/finca-resumen', {
            method: 'PUT',
            body: {
              nombre: form.querySelector('#f-nombre').value.trim(),
              propietario: form.querySelector('#f-propietario').value.trim() || null,
              hectareasTotales: Number(form.querySelector('#f-hectareas').value),
              localidad: form.querySelector('#f-localidad').value.trim(),
              provincia: form.querySelector('#f-provincia').value.trim(),
              observaciones: form.querySelector('#f-obs').value.trim() || null,
            },
          });
          avisar('Configuración de la finca actualizada.');
          renderFinca(raiz);
        } catch (err) {
          avisar(err.message, 'error');
        }
      });

      raiz.replaceChildren(
        el('div', { class: 'pantalla-cab' },
          el('div', {}, el('h2', {}, 'Finca'), el('p', {}, 'Configuración general de la explotación y control en tiempo real de hectáreas disponibles.'))),
        el('div', { class: 'uni-kpi-strip' },
          el('div', { class: 'uni-kpi' }, el('span', {}, 'Hectáreas Totales'), el('strong', {}, `${finca.hectareasTotales} ha`)),
          el('div', { class: 'uni-kpi' }, el('span', {}, `Asignadas (${finca.produccionesActivas} activas)`), el('strong', { style: 'color:#047857' }, `${finca.hectareasAsignadas} ha`)),
          el('div', { class: 'uni-kpi' }, el('span', {}, 'Hectáreas Disponibles'), el('strong', { style: 'color:#0369a1' }, `${finca.hectareasDisponibles} ha`))
        ),
        el('div', { class: 'uni-progress-wrap' },
          el('div', { class: 'uni-progress-labels' }, el('span', {}, `Ocupación territorial: ${pct}%`), el('span', {}, `${finca.hectareasAsignadas} / ${finca.hectareasTotales} ha`)),
          el('div', { class: 'uni-progress-track' }, el('div', { class: 'uni-progress-fill', style: `width:${pct}%` }))
        ),
        form
      );
    } catch (err) {
      raiz.innerHTML = `<div class="pantalla-cab"><div><h2>Finca</h2><p class="ingreso-error">${err.message}</p></div></div>`;
    }
  };

  /* =========================================================================
     MÓDULO 2: PRODUCCIÓN (Lista + Detalle Unificado + Trazabilidad y QR)
     ========================================================================= */
  let estadoFiltroProd = 'ACTIVA';
  let produccionAbiertaId = null;

  pantallas.produccion = async function renderProduccion(raiz) {
    if (produccionAbiertaId) {
      return renderDetalleProduccion(raiz, produccionAbiertaId, 'TODOS', 'BITACORA');
    }
    raiz.innerHTML = '<div class="pantalla-cab"><div><h2>Producción</h2><p>Cargando producciones...</p></div></div>';
    try {
      const [producciones, finca] = await Promise.all([
        apiJson(`/producciones?estado=${estadoFiltroProd}`),
        esAdmin() ? apiJson('/finca-resumen').catch(() => null) : Promise.resolve(null),
      ]);

      const filtros = ['ACTIVA', 'FINALIZADA', 'TODAS'].map(est =>
        el('button', {
          type: 'button',
          class: `btn btn-sm ${estadoFiltroProd === est ? 'btn-primary' : 'btn-secondary'}`,
          onclick: () => { estadoFiltroProd = est; renderProduccion(raiz); },
        }, est === 'ACTIVA' ? 'Activas' : est === 'FINALIZADA' ? 'Finalizadas' : 'Todas')
      );

      const accionesCab = el('div', { class: 'uni-actions-row' }, ...filtros);
      if (esAdmin()) {
        accionesCab.append(
          el('button', {
            type: 'button',
            class: 'btn btn-primary btn-sm',
            onclick: () => abrirModalNuevaProduccion(raiz, finca),
          }, '+ Nueva Producción')
        );
      }

      const cuerpo = producciones.length === 0
        ? el('div', { class: 'uni-empty' }, 'No hay producciones registradas en este estado.')
        : el('div', { class: 'tabla-scroll' },
            el('table', { class: 'tabla-datos' },
              el('thead', {}, el('tr', {},
                el('th', {}, 'Código'),
                el('th', {}, 'Cultivo / Variedad'),
                el('th', {}, 'Hectáreas'),
                el('th', {}, 'Estado'),
                el('th', {}, 'Último Registro'),
                el('th', {}, 'Cosechado'),
                el('th', { class: 'text-right' }, 'Acciones')
              )),
              el('tbody', {}, producciones.map(p =>
                el('tr', {},
                  el('td', {}, el('strong', {}, p.codigo), p.carenciaActivaHasta ? el('span', { class: 'pill pill-pendiente', style: 'margin-left:6px' }, `Carencia hasta ${p.carenciaActivaHasta}`) : null),
                  el('td', {}, `${p.cultivoNombre} · ${p.variedadNombre}`),
                  el('td', {}, `${p.hectareas} ha`),
                  el('td', {}, el('span', { class: `pill ${p.estado === 'ACTIVA' ? 'pill-ok' : 'pill-cancelada'}` }, p.estado)),
                  el('td', {}, formatoFecha(p.ultimoRegistroEn)),
                  el('td', {}, `${p.kgCosechados} kg`),
                  el('td', { class: 'acciones text-right' },
                    el('button', {
                      type: 'button',
                      class: 'btn btn-primary btn-sm',
                      onclick: () => { produccionAbiertaId = p.id; renderDetalleProduccion(raiz, p.id, 'TODOS', 'BITACORA'); },
                    }, p.estado === 'ACTIVA' ? 'Abrir / Cargar Registro' : 'Ver Historial'),
                    (esAdmin() && p.estado === 'ACTIVA') ? el('button', {
                      type: 'button',
                      class: 'btn btn-secondary btn-sm',
                      onclick: async () => {
                        if (!confirm(`¿Finalizar la producción ${p.codigo} (${p.hectareas} ha)? Esto liberará las hectáreas para la finca.`)) return;
                        try {
                          await apiJson(`/producciones/${p.id}/finalizar`, { method: 'POST', body: {} });
                          avisar(`Producción ${p.codigo} finalizada y ${p.hectareas} ha liberadas.`);
                          renderProduccion(raiz);
                        } catch (err) { avisar(err.message, 'error'); }
                      },
                    }, 'Finalizar Producción') : null
                  )
                )
              ))
            )
          );

      raiz.replaceChildren(
        el('div', { class: 'pantalla-cab' },
          el('div', {},
            el('h2', {}, 'Producción'),
            el('p', {}, finca ? `Superficie disponible en finca: ${finca.hectareasDisponibles} ha de ${finca.hectareasTotales} ha.` : 'Seleccioná una producción activa para cargar novedades de campo.')),
          accionesCab
        ),
        cuerpo
      );
    } catch (err) {
      raiz.innerHTML = `<div class="pantalla-cab"><div><h2>Producción</h2><p class="ingreso-error">${err.message}</p></div></div>`;
    }
  };

  async function abrirModalNuevaProduccion(raiz, finca) {
    const [cultivos, variedades] = await Promise.all([
      apiJson('/cultivos').catch(() => []),
      apiJson('/variedades').catch(() => []),
    ]);

    const selCultivo = el('select', { id: 'np-cultivo', required: true });
    const selVariedad = el('select', { id: 'np-variedad', required: true });
    const inputFecha = el('input', { id: 'np-fecha', type: 'date', value: hoyInput(), required: true });
    const inputHa = el('input', { id: 'np-ha', type: 'number', step: '0.01', min: '0.01', max: finca ? finca.hectareasDisponibles : '', placeholder: finca ? `Máx ${finca.hectareasDisponibles} ha` : 'Ej: 10', required: true });
    const inputObs = el('textarea', { id: 'np-obs', rows: 2, placeholder: 'Notas iniciales de implantación...' });

    function poblarVariedades() {
      const cid = selCultivo.value;
      const filtradas = (variedades || []).filter(v => v.cultivoId === cid);
      selVariedad.replaceChildren(...filtradas.map(v => el('option', { value: v.id }, v.nombre)));
    }
    function poblarCultivos(seleccionarId) {
      selCultivo.replaceChildren(...(cultivos || []).map(c => el('option', { value: c.id }, c.nombre)));
      if (seleccionarId) selCultivo.value = seleccionarId;
      poblarVariedades();
    }
    selCultivo.addEventListener('change', poblarVariedades);
    poblarCultivos();

    const cajaInlineCultivo = el('div', { class: 'uni-inline-add', hidden: true },
      el('input', { id: 'np-nuevo-cult-txt', type: 'text', placeholder: 'Nombre del cultivo' }),
      el('button', {
        type: 'button', class: 'btn btn-primary btn-sm',
        onclick: async () => {
          const nombre = cajaInlineCultivo.querySelector('#np-nuevo-cult-txt').value.trim();
          if (!nombre) return;
          try {
            const c = await apiJson('/producciones/cultivos-rapido', { method: 'POST', body: { nombre, tipoCicloVida: 'ANUAL' } });
            cultivos.push(c);
            poblarCultivos(c.id);
            cajaInlineCultivo.hidden = true;
            avisar(`Cultivo "${c.nombre}" agregado.`);
          } catch (err) { avisar(err.message, 'error'); }
        },
      }, 'Crear')
    );

    const cajaInlineVar = el('div', { class: 'uni-inline-add', hidden: true },
      el('input', { id: 'np-nueva-var-txt', type: 'text', placeholder: 'Nombre de la variedad' }),
      el('button', {
        type: 'button', class: 'btn btn-primary btn-sm',
        onclick: async () => {
          const nombre = cajaInlineVar.querySelector('#np-nueva-var-txt').value.trim();
          if (!nombre || !selCultivo.value) return;
          try {
            const v = await apiJson('/producciones/variedades-rapido', { method: 'POST', body: { cultivoId: selCultivo.value, nombre } });
            variedades.push(v);
            poblarVariedades();
            selVariedad.value = v.id;
            cajaInlineVar.hidden = true;
            avisar(`Variedad "${v.nombre}" agregada.`);
          } catch (err) { avisar(err.message, 'error'); }
        },
      }, 'Crear')
    );

    const overlay = el('div', { class: 'modal-backdrop', style: 'display:flex' },
      el('div', { class: 'modal-dialog glass', style: 'max-width:560px;width:100%' },
        el('div', { class: 'modal-header' },
          el('h2', {}, 'Crear Nueva Producción'),
          el('button', { class: 'close-btn', type: 'button', onclick: () => overlay.remove() }, '×')
        ),
        el('form', {
          class: 'form-grid',
          style: 'padding:18px 20px',
          onsubmit: async (e) => {
            e.preventDefault();
            try {
              await apiJson('/producciones', {
                method: 'POST',
                body: {
                  cultivoId: selCultivo.value,
                  variedadId: selVariedad.value,
                  fechaInicio: inputFecha.value,
                  hectareas: Number(inputHa.value),
                  observaciones: inputObs.value.trim() || undefined,
                },
              });
              overlay.remove();
              avisar('Producción creada e iniciada.');
              renderProduccion(raiz);
            } catch (err) { avisar(err.message, 'error'); }
          },
        },
          el('div', { class: 'campo' },
            el('div', { class: 'uni-label-row' }, el('label', {}, 'Cultivo *'), el('button', { type: 'button', class: 'btn-link-inline', onclick: () => { cajaInlineCultivo.hidden = !cajaInlineCultivo.hidden; } }, '+ Nuevo')),
            selCultivo,
            cajaInlineCultivo
          ),
          el('div', { class: 'campo' },
            el('div', { class: 'uni-label-row' }, el('label', {}, 'Variedad *'), el('button', { type: 'button', class: 'btn-link-inline', onclick: () => { cajaInlineVar.hidden = !cajaInlineVar.hidden; } }, '+ Nueva')),
            selVariedad,
            cajaInlineVar
          ),
          el('div', { class: 'campo' }, el('label', {}, 'Fecha de Inicio *'), inputFecha),
          el('div', { class: 'campo' }, el('label', {}, `Hectáreas Destinadas * ${finca ? `(Disp: ${finca.hectareasDisponibles} ha)` : ''}`), inputHa),
          el('div', { class: 'campo campo-completo' }, el('label', {}, 'Observaciones'), inputObs),
          el('div', { class: 'form-acciones' },
            el('button', { type: 'button', class: 'btn btn-secondary', onclick: () => overlay.remove() }, 'Cancelar'),
            el('button', { type: 'submit', class: 'btn btn-primary' }, 'Iniciar Producción')
          )
        )
      )
    );
    document.body.appendChild(overlay);
  }

  async function renderDetalleProduccion(raiz, cicloId, filtroTipo = 'TODOS', subtab = 'BITACORA') {
    raiz.innerHTML = '<div class="pantalla-cab"><div><h2>Cargando producción...</h2></div></div>';
    try {
      const [det, insumosSel] = await Promise.all([
        apiJson(`/producciones/${cicloId}/detalle?tipo=${filtroTipo}`),
        apiJson('/insumos/selector').catch(() => []),
      ]);
      const p = det.produccion;

      const cab = el('div', { class: 'pantalla-cab' },
        el('div', {},
          el('button', {
            type: 'button', class: 'btn btn-secondary btn-sm', style: 'margin-bottom:8px',
            onclick: () => { produccionAbiertaId = null; renderProduccion(raiz); },
          }, '← Volver a Producciones'),
          el('h2', {}, `${p.codigo} · ${p.cultivoNombre} (${p.variedadNombre})`),
          el('p', {}, `${p.hectareas} ha · Estado: ${p.estado} · Cosechado: ${p.kgCosechados} kg · Último registro: ${formatoFecha(p.ultimoRegistroEn)}`)
        ),
        el('div', { class: 'uni-actions-row' },
          el('button', {
            type: 'button',
            class: `btn btn-sm ${subtab === 'BITACORA' ? 'btn-primary' : 'btn-secondary'}`,
            onclick: () => renderDetalleProduccion(raiz, cicloId, filtroTipo, 'BITACORA'),
          }, 'Bitácora y Registros'),
          el('button', {
            type: 'button',
            class: `btn btn-sm ${subtab === 'TRAZABILIDAD' ? 'btn-primary' : 'btn-secondary'}`,
            onclick: () => renderDetalleProduccion(raiz, cicloId, filtroTipo, 'TRAZABILIDAD'),
          }, 'Trazabilidad y QR')
        )
      );

      if (subtab === 'TRAZABILIDAD') {
        const contTraz = el('div', { class: 'glass tarjeta-form', style: 'max-width:100%' },
          el('h3', {}, 'Trazabilidad Integral, Código QR y Recall'),
          el('p', { class: 'ayuda', style: 'margin-bottom:12px' }, `Lote subyacente: ${p.codigo} (${p.loteId})`),
          el('div', { id: 'uni-traz-body' }, 'Cargando grafo de trazabilidad...')
        );
        raiz.replaceChildren(cab, contTraz);
        try {
          const rec = await apiJson(`/trazabilidad/recorrido/${encodeURIComponent(p.codigo)}`).catch(() => null);
          const urlPublica = `${location.origin}/?lote=${encodeURIComponent(p.codigo)}`;
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(urlPublica)}`;
          contTraz.querySelector('#uni-traz-body').replaceChildren(
            el('div', { class: 'uni-qr-grid' },
              el('div', { class: 'uni-qr-box' },
                el('img', { src: qrUrl, alt: `QR ${p.codigo}`, width: 150, height: 150 }),
                el('p', { class: 'ayuda' }, `Código único: ${p.codigo}`)
              ),
              el('div', { class: 'uni-qr-info' },
                el('p', {}, el('strong', {}, 'Resumen de Cadena de Custodia:')),
                el('p', {}, `Eventos totales registrados: ${det.historial.length}`),
                el('p', {}, `Carencia activa: ${p.carenciaActivaHasta ? `Sí, hasta ${p.carenciaActivaHasta}` : 'Libre para cosecha'}`),
                rec ? el('pre', { class: 'delta-json-box', style: 'max-height:220px;overflow:auto;margin-top:8px' }, JSON.stringify(rec, null, 2))
                    : el('p', { class: 'ayuda' }, 'Podés consultar el historial completo en la pestaña Bitácora o exportar informes desde Estadísticas.')
              )
            )
          );
        } catch (err) {
          contTraz.querySelector('#uni-traz-body').textContent = err.message;
        }
        return;
      }

      // Bloque 1: Formulario Rápido de Registro de Actualización (si está ACTIVA)
      const bloqueForm = el('div', { class: 'glass tarjeta-form', style: 'max-width:100%;margin-bottom:18px' });
      if (p.estado === 'ACTIVA') {
        let tipoActual = 'FUMIGACION';
        const selTipo = el('select', { id: 'reg-tipo' },
          el('option', { value: 'FUMIGACION' }, 'Fumigación / Aplicación (descuenta stock)'),
          el('option', { value: 'COSECHA' }, 'Cosecha (verifica carencia)'),
          el('option', { value: 'LABOR' }, 'Labor / Actividad'),
          el('option', { value: 'OBSERVACION' }, 'Observación / Clima')
        );
        const camposCont = el('div', { class: 'form-grid', style: 'grid-column:1/-1' });

        function pintarCampos() {
          tipoActual = selTipo.value;
          if (tipoActual === 'FUMIGACION') {
            const selIns = el('select', { id: 'reg-insumo', required: true },
              insumosSel.map(i => el('option', { value: i.id }, `${i.nombre} (Disp: ${i.stockDisponible} ${i.unidadMedida})`))
            );
            camposCont.replaceChildren(
              el('div', { class: 'campo' }, el('label', {}, 'Insumo *'), selIns),
              el('div', { class: 'campo' }, el('label', {}, 'Cantidad Utilizada *'), el('input', { id: 'reg-cantidad', type: 'number', step: '0.01', min: '0.01', required: true })),
              el('div', { class: 'campo' }, el('label', {}, 'Superficie Tratada (ha) *'), el('input', { id: 'reg-sup', type: 'number', step: '0.01', min: '0.01', value: p.hectareas, required: true })),
              el('div', { class: 'campo' }, el('label', {}, 'Días de Carencia'), el('input', { id: 'reg-carencia', type: 'number', min: '0', value: '0' })),
              el('div', { class: 'campo campo-completo' }, el('label', {}, 'Observaciones'), el('input', { id: 'reg-obs', type: 'text', placeholder: 'Detalles de aplicación, dosis o clima' }))
            );
          } else if (tipoActual === 'COSECHA') {
            camposCont.replaceChildren(
              el('div', { class: 'campo' }, el('label', {}, 'Fecha *'), el('input', { id: 'reg-fecha', type: 'date', value: hoyInput(), required: true })),
              el('div', { class: 'campo' }, el('label', {}, 'Kg Comercializables *'), el('input', { id: 'reg-kg-com', type: 'number', step: '0.1', min: '0.1', required: true })),
              el('div', { class: 'campo' }, el('label', {}, 'Kg Descarte'), el('input', { id: 'reg-kg-desc', type: 'number', step: '0.1', min: '0', value: '0' })),
              el('div', { class: 'campo' }, el('label', {}, 'Destino / Cliente'), el('input', { id: 'reg-destino', type: 'text', placeholder: 'Ej: Empaque Central / Mercado' })),
              el('div', { class: 'campo campo-completo' }, el('label', {}, 'Observaciones'), el('input', { id: 'reg-obs', type: 'text' }))
            );
          } else if (tipoActual === 'LABOR') {
            camposCont.replaceChildren(
              el('div', { class: 'campo' }, el('label', {}, 'Tipo de Labor *'), el('select', { id: 'reg-labor' },
                el('option', { value: 'Riego' }, 'Riego'),
                el('option', { value: 'Poda' }, 'Poda'),
                el('option', { value: 'Preparación de suelo' }, 'Preparación de suelo'),
                el('option', { value: 'Fertilización manual' }, 'Fertilización manual'),
                el('option', { value: 'Desmalezado' }, 'Desmalezado'),
                el('option', { value: 'Mantenimiento general' }, 'Mantenimiento general')
              )),
              el('div', { class: 'campo' }, el('label', {}, 'Fecha *'), el('input', { id: 'reg-fecha', type: 'date', value: hoyInput(), required: true })),
              el('div', { class: 'campo' }, el('label', {}, 'Responsable / Cuadrilla'), el('input', { id: 'reg-resp', type: 'text', placeholder: 'Ej: Cuadrilla Sur' })),
              el('div', { class: 'campo' }, el('label', {}, 'Observaciones'), el('input', { id: 'reg-obs', type: 'text' }))
            );
          } else {
            camposCont.replaceChildren(
              el('div', { class: 'campo' }, el('label', {}, 'Subtipo *'), el('select', { id: 'reg-subtipo' },
                el('option', { value: 'Monitoreo sanitario' }, 'Monitoreo sanitario'),
                el('option', { value: 'Nota de campo' }, 'Nota de campo'),
                el('option', { value: 'Helada / Granizo' }, 'Evento climático adverso (Helada/Granizo)')
              )),
              el('div', { class: 'campo' }, el('label', {}, 'Fecha *'), el('input', { id: 'reg-fecha', type: 'date', value: hoyInput(), required: true })),
              el('div', { class: 'campo campo-completo' }, el('label', {}, 'Detalle / Hallazgos *'), el('textarea', { id: 'reg-obs', rows: 2, required: true, placeholder: 'Describí lo observado en el lote...' })),
              el('div', { class: 'campo campo-completo' }, el('label', { class: 'multi-op' }, el('input', { id: 'reg-clima-chk', type: 'checkbox' }), ' Registrar también como evento climático adverso oficial'))
            );
          }
        }
        selTipo.addEventListener('change', pintarCampos);
        pintarCampos();

        const formReg = el('form', {
          class: 'form-grid',
          onsubmit: async (e) => {
            e.preventDefault();
            try {
              const body = { tipo: tipoActual };
              if (tipoActual === 'FUMIGACION') {
                body.insumoId = formReg.querySelector('#reg-insumo').value;
                body.cantidad = Number(formReg.querySelector('#reg-cantidad').value);
                body.superficie = Number(formReg.querySelector('#reg-sup').value);
                body.diasCarencia = Number(formReg.querySelector('#reg-carencia').value || 0);
                body.observaciones = formReg.querySelector('#reg-obs').value;
              } else if (tipoActual === 'COSECHA') {
                body.fecha = formReg.querySelector('#reg-fecha').value;
                body.kgComercializable = Number(formReg.querySelector('#reg-kg-com').value);
                body.kgDescarte = Number(formReg.querySelector('#reg-kg-desc').value || 0);
                body.destino = formReg.querySelector('#reg-destino').value;
                body.observaciones = formReg.querySelector('#reg-obs').value;
              } else if (tipoActual === 'LABOR') {
                body.tipoLabor = formReg.querySelector('#reg-labor').value;
                body.fecha = formReg.querySelector('#reg-fecha').value;
                body.responsable = formReg.querySelector('#reg-resp').value;
                body.observaciones = formReg.querySelector('#reg-obs').value;
              } else {
                body.subtipo = formReg.querySelector('#reg-subtipo').value;
                body.fecha = formReg.querySelector('#reg-fecha').value;
                body.observaciones = formReg.querySelector('#reg-obs').value;
                body.esEventoClimatico = formReg.querySelector('#reg-clima-chk').checked;
              }
              const r = await apiJson(`/producciones/${cicloId}/registros`, { method: 'POST', body });
              avisar(r.mensaje || 'Registro guardado.');
              renderDetalleProduccion(raiz, cicloId, filtroTipo, 'BITACORA');
            } catch (err) {
              avisar(err.message, 'error');
            }
          },
        },
          el('div', { class: 'campo campo-completo' }, el('label', {}, 'Tipo de Registro de Actualización'), selTipo),
          camposCont,
          el('div', { class: 'form-acciones' }, el('button', { type: 'submit', class: 'btn btn-primary' }, 'Guardar Registro'))
        );

        bloqueForm.replaceChildren(
          el('h3', { style: 'margin-bottom:12px' }, 'Nuevo Registro de Actualización'),
          p.carenciaActivaHasta ? el('p', { class: 'pill pill-pendiente', style: 'margin-bottom:12px' }, `⚠ Período de carencia vigente hasta ${p.carenciaActivaHasta} (cosechas bloqueadas)`) : null,
          formReg
        );
      } else {
        bloqueForm.replaceChildren(el('p', { class: 'ayuda' }, 'Esta producción está FINALIZADA. El historial es de solo lectura.'));
      }

      // Bloque 2: Historial y Auditoría con Filtro por Tipo
      const tiposFiltro = ['TODOS', 'FUMIGACION', 'COSECHA', 'LABOR', 'OBSERVACION', 'EDICION'];
      const barraFiltro = el('div', { class: 'uni-actions-row', style: 'margin-bottom:12px' },
        ...tiposFiltro.map(tf =>
          el('button', {
            type: 'button',
            class: `btn btn-sm ${filtroTipo === tf ? 'btn-primary' : 'btn-secondary'}`,
            onclick: () => renderDetalleProduccion(raiz, cicloId, tf, 'BITACORA'),
          }, tf === 'TODOS' ? 'Todos' : tf.charAt(0) + tf.slice(1).toLowerCase())
        )
      );

      const timeline = det.historial.length === 0
        ? el('p', { class: 'ayuda' }, 'Sin registros para el filtro seleccionado.')
        : el('div', { class: 'uni-timeline' },
            ...det.historial.map(item =>
              el('div', { class: 'uni-timeline-item' },
                el('div', { class: 'uni-tl-head' },
                  el('span', { class: `pill ${item.tipo === 'FUMIGACION' ? 'pill-pendiente' : item.tipo === 'COSECHA' ? 'pill-ok' : item.tipo === 'EDICION' ? 'pill-cancelada' : 'pill-ejecutada'}` }, item.tipo),
                  el('strong', {}, item.titulo),
                  el('span', { class: 'ayuda' }, `${formatoFecha(item.fecha)} · ${item.usuarioNombre}`)
                ),
                el('p', { class: 'uni-tl-body' }, item.detalle),
                (esAdmin() && item.tipo !== 'EDICION') ? el('button', {
                  type: 'button',
                  class: 'btn btn-secondary btn-sm',
                  style: 'margin-top:6px',
                  onclick: async () => {
                    const motivo = prompt(`Motivo obligatorio de corrección compensatoria para "${item.titulo}":`);
                    if (!motivo || !motivo.trim()) return;
                    const valorNuevo = prompt('Nuevo valor o aclaración:', item.detalle);
                    if (valorNuevo == null) return;
                    try {
                      await apiJson(`/producciones/${cicloId}/registros/${item.id}/corregir`, {
                        method: 'POST',
                        body: { tipoOriginal: item.tipo, motivo: motivo.trim(), valorAnterior: item.detalle, valorNuevo },
                      });
                      avisar('Corrección compensatoria registrada.');
                      renderDetalleProduccion(raiz, cicloId, filtroTipo, 'BITACORA');
                    } catch (err) { avisar(err.message, 'error'); }
                  },
                }, 'Corregir (Compensación)') : null
              )
            )
          );

      const bloqueHist = el('div', { class: 'glass tarjeta-form', style: 'max-width:100%' },
        el('h3', { style: 'margin-bottom:10px' }, 'Historial Cronológico de la Producción'),
        barraFiltro,
        timeline
      );

      raiz.replaceChildren(cab, bloqueForm, bloqueHist);
    } catch (err) {
      raiz.innerHTML = `<div class="pantalla-cab"><div><h2>Producción</h2><p class="ingreso-error">${err.message}</p></div></div>`;
    }
  }

  /* =========================================================================
     MÓDULO 3: INSUMOS Y STOCK (Solo ADMINISTRADOR)
     ========================================================================= */
  pantallas.insumos = async function renderInsumos(raiz) {
    raiz.innerHTML = '<div class="pantalla-cab"><div><h2>Insumos y Stock</h2><p>Cargando inventario...</p></div></div>';
    try {
      const data = await apiJson('/insumos/resumen-unificado');

      const acciones = el('div', { class: 'uni-actions-row' },
        el('button', { type: 'button', class: 'btn btn-secondary btn-sm', onclick: () => abrirModalNuevoInsumo(raiz) }, '+ Nuevo Insumo'),
        el('button', { type: 'button', class: 'btn btn-primary btn-sm', onclick: () => abrirModalIngresoStock(raiz, data.insumos) }, '+ Ingresar Stock')
      );

      const alertasBox = data.alertas.length > 0
        ? el('div', { class: 'uni-alert-box' },
            el('strong', {}, `⚠ ${data.alertas.length} insumo(s) en stock mínimo o crítico: `),
            data.alertas.map(a => `${a.nombre} (${a.stockDisponible} ${a.unidadMedida} / mín ${a.nivelMinimo})`).join(' · ')
          )
        : null;

      const tablaStock = el('div', { class: 'tabla-scroll', style: 'margin-bottom:18px' },
        el('table', { class: 'tabla-datos' },
          el('thead', {}, el('tr', {},
            el('th', {}, 'Código'),
            el('th', {}, 'Insumo'),
            el('th', {}, 'Categoría'),
            el('th', {}, 'Stock Actual'),
            el('th', {}, 'Stock Mínimo'),
            el('th', {}, 'Estado')
          )),
          el('tbody', {}, data.insumos.map(i =>
            el('tr', {},
              el('td', {}, i.codigo),
              el('td', {}, el('strong', {}, i.nombre)),
              el('td', {}, i.categoria),
              el('td', {}, `${i.stockDisponible} ${i.unidadMedida}`),
              el('td', {}, `${i.nivelMinimo} ${i.unidadMedida}`),
              el('td', {}, el('span', { class: `pill ${i.stockDisponible <= i.nivelMinimo ? 'pill-alerta' : 'pill-ok'}` }, i.stockDisponible <= i.nivelMinimo ? 'REPOSICIÓN' : 'OK'))
            )
          ))
        )
      );

      const tablaEgresos = el('div', { class: 'glass tarjeta-form', style: 'max-width:100%' },
        el('h3', { style: 'margin-bottom:10px' }, 'Egresos Automáticos por Fumigaciones en Producción'),
        data.egresos.length === 0
          ? el('p', { class: 'ayuda' }, 'Todavía no hay egresos automáticos registrados.')
          : el('div', { class: 'tabla-scroll' },
              el('table', { class: 'tabla-datos' },
                el('thead', {}, el('tr', {}, el('th', {}, 'Fecha'), el('th', {}, 'Insumo'), el('th', {}, 'Cantidad'), el('th', {}, 'Detalle'))),
                el('tbody', {}, data.egresos.map(eg =>
                  el('tr', {},
                    el('td', {}, formatoFecha(eg.fecha)),
                    el('td', {}, eg.insumoNombre),
                    el('td', {}, `${eg.cantidad} ${eg.unidadMedida}`),
                    el('td', {}, eg.detalle)
                  )
                ))
              )
            )
      );

      raiz.replaceChildren(
        el('div', { class: 'pantalla-cab' },
          el('div', {}, el('h2', {}, 'Insumos y Stock'), el('p', {}, 'Catálogo, ingresos de mercadería, alertas de stock mínimo y egresos automáticos desde Producción.')),
          acciones
        ),
        alertasBox,
        tablaStock,
        tablaEgresos
      );
    } catch (err) {
      raiz.innerHTML = `<div class="pantalla-cab"><div><h2>Insumos y Stock</h2><p class="ingreso-error">${err.message}</p></div></div>`;
    }
  };

  function abrirModalNuevoInsumo(raiz) {
    const overlay = el('div', { class: 'modal-backdrop', style: 'display:flex' },
      el('div', { class: 'modal-dialog glass', style: 'max-width:480px;width:100%' },
        el('div', { class: 'modal-header' }, el('h2', {}, 'Nuevo Insumo'), el('button', { class: 'close-btn', type: 'button', onclick: () => overlay.remove() }, '×')),
        el('form', {
          class: 'form-grid', style: 'padding:18px 20px',
          onsubmit: async (e) => {
            e.preventDefault();
            try {
              const f = e.target;
              await apiJson('/insumos', {
                method: 'POST',
                body: {
                  codigo: f.querySelector('#ni-cod').value.trim(),
                  nombre: f.querySelector('#ni-nom').value.trim(),
                  categoria: f.querySelector('#ni-cat').value,
                  unidadMedida: f.querySelector('#ni-uni').value.trim(),
                  nivelMinimo: Number(f.querySelector('#ni-min').value || 0),
                },
              });
              overlay.remove();
              avisar('Insumo creado en el catálogo.');
              renderInsumos(raiz);
            } catch (err) { avisar(err.message, 'error'); }
          },
        },
          el('div', { class: 'campo' }, el('label', {}, 'Código *'), el('input', { id: 'ni-cod', type: 'text', placeholder: 'INS-010', required: true })),
          el('div', { class: 'campo' }, el('label', {}, 'Nombre *'), el('input', { id: 'ni-nom', type: 'text', required: true })),
          el('div', { class: 'campo' }, el('label', {}, 'Categoría *'), el('select', { id: 'ni-cat' },
            el('option', { value: 'FITOSANITARIO' }, 'Fitosanitario'),
            el('option', { value: 'FERTILIZANTE' }, 'Fertilizante'),
            el('option', { value: 'ENMIENDA' }, 'Enmienda'),
            el('option', { value: 'OTRO' }, 'Otro')
          )),
          el('div', { class: 'campo' }, el('label', {}, 'Unidad *'), el('input', { id: 'ni-uni', type: 'text', value: 'L', required: true })),
          el('div', { class: 'campo campo-completo' }, el('label', {}, 'Stock Mínimo'), el('input', { id: 'ni-min', type: 'number', step: '0.1', min: '0', value: '10' })),
          el('div', { class: 'form-acciones' },
            el('button', { type: 'button', class: 'btn btn-secondary', onclick: () => overlay.remove() }, 'Cancelar'),
            el('button', { type: 'submit', class: 'btn btn-primary' }, 'Guardar Insumo')
          )
        )
      )
    );
    document.body.appendChild(overlay);
  }

  function abrirModalIngresoStock(raiz, insumos) {
    const sel = el('select', { id: 'is-ins', required: true }, insumos.map(i => el('option', { value: i.id }, `${i.nombre} (${i.unidadMedida})`)));
    const overlay = el('div', { class: 'modal-backdrop', style: 'display:flex' },
      el('div', { class: 'modal-dialog glass', style: 'max-width:460px;width:100%' },
        el('div', { class: 'modal-header' }, el('h2', {}, 'Ingresar Stock'), el('button', { class: 'close-btn', type: 'button', onclick: () => overlay.remove() }, '×')),
        el('form', {
          class: 'form-grid', style: 'padding:18px 20px',
          onsubmit: async (e) => {
            e.preventDefault();
            try {
              const f = e.target;
              await apiJson('/insumos/ingreso-rapido', {
                method: 'POST',
                body: {
                  insumoId: sel.value,
                  cantidad: Number(f.querySelector('#is-cant').value),
                  proveedor: f.querySelector('#is-prov').value.trim() || undefined,
                  fechaVencimiento: f.querySelector('#is-venc').value || null,
                },
              });
              overlay.remove();
              avisar('Stock ingresado correctamente.');
              renderInsumos(raiz);
            } catch (err) { avisar(err.message, 'error'); }
          },
        },
          el('div', { class: 'campo campo-completo' }, el('label', {}, 'Insumo *'), sel),
          el('div', { class: 'campo' }, el('label', {}, 'Cantidad *'), el('input', { id: 'is-cant', type: 'number', step: '0.01', min: '0.01', required: true })),
          el('div', { class: 'campo' }, el('label', {}, 'Vencimiento (FEFO)'), el('input', { id: 'is-venc', type: 'date' })),
          el('div', { class: 'campo campo-completo' }, el('label', {}, 'Proveedor (opcional)'), el('input', { id: 'is-prov', type: 'text', placeholder: 'Proveedor General BPA' })),
          el('div', { class: 'form-acciones' },
            el('button', { type: 'button', class: 'btn btn-secondary', onclick: () => overlay.remove() }, 'Cancelar'),
            el('button', { type: 'submit', class: 'btn btn-primary' }, 'Confirmar Ingreso')
          )
        )
      )
    );
    document.body.appendChild(overlay);
  }

  /* =========================================================================
     MÓDULO 5: AUDITORÍA (ADMINISTRADOR y ADMIN_SISTEMA)
     ========================================================================= */
  pantallas.auditoria = async function renderAuditoria(raiz, tab = 'LOGS') {
    raiz.innerHTML = '<div class="pantalla-cab"><div><h2>Auditoría</h2><p>Cargando bitácora inmutable y usuarios...</p></div></div>';
    try {
      const [audData, usuariosData] = await Promise.all([
        apiJson('/auditoria?limit=50').catch(() => ({ eventos: [], items: [] })),
        apiJson('/usuarios').catch(() => []),
      ]);
      const logs = Array.isArray(audData) ? audData : (audData.eventos || audData.items || []);
      const usuarios = Array.isArray(usuariosData) ? usuariosData : (usuariosData.usuarios || []);

      const cab = el('div', { class: 'pantalla-cab' },
        el('div', {}, el('h2', {}, 'Auditoría y Seguridad'), el('p', {}, 'Bitácora global inmutable (append-only, DELETE prohibido) y administración de usuarios/roles.')),
        el('div', { class: 'uni-actions-row' },
          el('button', { type: 'button', class: `btn btn-sm ${tab === 'LOGS' ? 'btn-primary' : 'btn-secondary'}`, onclick: () => renderAuditoria(raiz, 'LOGS') }, 'Bitácora Global'),
          el('button', { type: 'button', class: `btn btn-sm ${tab === 'USUARIOS' ? 'btn-primary' : 'btn-secondary'}`, onclick: () => renderAuditoria(raiz, 'USUARIOS') }, 'Usuarios y Roles')
        )
      );

      if (tab === 'USUARIOS') {
        const tablaUsr = el('div', { class: 'tabla-scroll' },
          el('table', { class: 'tabla-datos' },
            el('thead', {}, el('tr', {}, el('th', {}, 'Usuario'), el('th', {}, 'Nombre'), el('th', {}, 'Perfil'), el('th', {}, 'Estado'), el('th', {}, 'Último Acceso'))),
            el('tbody', {}, usuarios.map(u =>
              el('tr', {},
                el('td', {}, el('strong', {}, u.nombreUsuario || u.email)),
                el('td', {}, u.nombreCompleto || `${u.nombre} ${u.apellido}`),
                el('td', {}, el('span', { class: 'pill pill-ejecutada' }, u.perfil)),
                el('td', {}, el('span', { class: `pill ${u.estado === 'ACTIVO' ? 'pill-ok' : 'pill-alerta'}` }, u.estado)),
                el('td', {}, formatoFecha(u.ultimoAcceso))
              )
            ))
          )
        );
        const nota = esSistema()
          ? el('p', { class: 'ayuda', style: 'margin-bottom:10px' }, 'Sesión de Administrador de Sistema: acceso exclusivo al módulo de Auditoría y Seguridad.')
          : null;
        raiz.replaceChildren(cab, nota, tablaUsr);
        return;
      }

      const tablaLogs = el('div', { class: 'tabla-scroll' },
        el('table', { class: 'tabla-datos' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Fecha (UTC-3)'), el('th', {}, 'Acción'), el('th', {}, 'Entidad'), el('th', {}, 'Usuario'), el('th', {}, 'Detalle'))),
          el('tbody', {}, logs.map(l =>
            el('tr', {},
              el('td', {}, formatoFecha(l.timestamp || l.fecha)),
              el('td', {}, el('span', { class: 'pill pill-ejecutada' }, l.accion || l.tipoEvento)),
              el('td', {}, l.entidad || '—'),
              el('td', {}, l.usuarioEmail || l.usuarioId || 'Sistema'),
              el('td', {}, l.valorNuevoJson ? JSON.stringify(l.valorNuevoJson).slice(0, 120) : '—')
            )
          ))
        )
      );
      raiz.replaceChildren(cab, tablaLogs);
    } catch (err) {
      raiz.innerHTML = `<div class="pantalla-cab"><div><h2>Auditoría</h2><p class="ingreso-error">${err.message}</p></div></div>`;
    }
  };
})();
