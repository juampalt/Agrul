// Agrul Dashboard Client Logic
document.addEventListener('DOMContentLoaded', () => {
  let allLotes = [];
  let currentFilter = 'TODOS';
  let searchTerm = '';

  // Elementos DOM
  const lotesTbody = document.getElementById('lotes-tbody');
  const inputBusqueda = document.getElementById('input-busqueda');
  const filterTabs = document.getElementById('filter-tabs');
  const btnRecargar = document.getElementById('btn-recargar');
  const btnNuevoLote = document.getElementById('btn-nuevo-lote');

  // KPIs
  const kpiTotal = document.getElementById('kpi-total-lotes');
  const kpiActivos = document.getElementById('kpi-lotes-activos');
  const kpiEmbalados = document.getElementById('kpi-lotes-embalados');
  const kpiMasa = document.getElementById('kpi-masa-total');

  // Modales
  const modalNuevoLote = document.getElementById('modal-nuevo-lote');
  const formNuevoLote = document.getElementById('form-nuevo-lote');

  const modalRegistrarEvento = document.getElementById('modal-registrar-evento');
  const formRegistrarEvento = document.getElementById('form-registrar-evento');
  const eventoLoteIdInput = document.getElementById('evento-lote-id');
  const eventoLoteCodigoSpan = document.getElementById('evento-lote-codigo');

  const modalHistorial = document.getElementById('modal-historial');
  const historialLista = document.getElementById('historial-eventos-lista');
  const historialSubtitulo = document.getElementById('historial-subtitulo');

  // Modales QR y Escáner (AGRUL-013)
  const modalQrLabel = document.getElementById('modal-qr-label');
  const qrLabelSubtitle = document.getElementById('qr-label-subtitle');
  const labelCodigoLote = document.getElementById('label-codigo-lote');
  const labelProducto = document.getElementById('label-producto');
  const labelVariedad = document.getElementById('label-variedad');
  const labelEstado = document.getElementById('label-estado');
  const labelCantidad = document.getElementById('label-cantidad');
  const labelFecha = document.getElementById('label-fecha');
  const labelUuid = document.getElementById('label-uuid');
  const qrCanvasContainer = document.getElementById('qr-canvas-container');
  const btnDescargarQrSvg = document.getElementById('btn-descargar-qr-svg');
  const btnImprimirEtiqueta = document.getElementById('btn-imprimir-etiqueta');

  const btnAbrirEscaner = document.getElementById('btn-abrir-escaner');
  const modalQrScanner = document.getElementById('modal-qr-scanner');
  const scannerVideo = document.getElementById('scanner-video');
  const scannerStatusText = document.getElementById('scanner-status-text');
  const btnSwitchCamera = document.getElementById('btn-switch-camera');
  const scannerFileInput = document.getElementById('scanner-file-input');
  const scannerManualCode = document.getElementById('scanner-manual-code');
  const btnSubmitManualCode = document.getElementById('btn-submit-manual-code');

  let activeMediaStream = null;
  let isScanningActive = false;
  let currentCameraFacingMode = 'environment';

  // Fincas y Filtros Avanzados (AGRUL-016)
  let allFincas = [];
  const filtroFinca = document.getElementById('filtro-finca');
  const filtroSupMin = document.getElementById('filtro-sup-min');
  const filtroSupMax = document.getElementById('filtro-sup-max');
  const nuevoFincaId = document.getElementById('nuevo-finca-id');
  const nuevoSuperficie = document.getElementById('nuevo-superficie');
  const nuevoGeoLat = document.getElementById('nuevo-geo-lat');
  const nuevoGeoLng = document.getElementById('nuevo-geo-lng');

  // Modal Cartel de Cabecera (RF-M1-11)
  const modalFichaCabecera = document.getElementById('modal-ficha-cabecera');
  const cartelCodigo = document.getElementById('cartel-codigo');
  const cartelProducto = document.getElementById('cartel-producto');
  const cartelVariedad = document.getElementById('cartel-variedad');
  const cartelSuperficie = document.getElementById('cartel-superficie');
  const cartelFinca = document.getElementById('cartel-finca');
  const cartelCoords = document.getElementById('cartel-coords');
  const cartelQrContainer = document.getElementById('cartel-qr-container');
  const cartelEmision = document.getElementById('cartel-emision');
  const btnAbrirHtmlCartel = document.getElementById('btn-abrir-html-cartel');
  const btnImprimirCartel = document.getElementById('btn-imprimir-cartel');

  // Cosecha Rápida en Campo (AGRUL-031 / RF-M5-13 / RNF-01 / RNF-15)
  const btnCosechaRapida = document.getElementById('btn-cosecha-rapida');
  const modalCosechaRapida = document.getElementById('modal-cosecha-rapida');
  const dialogCosechaRapida = document.getElementById('dialog-cosecha-rapida');
  const btnToggleContrasteSolar = document.getElementById('btn-toggle-contraste-solar');
  const formCosechaRapida = document.getElementById('form-cosecha-rapida');
  const rapidaLoteId = document.getElementById('rapida-lote-id');
  const rapidaLoteInfo = document.getElementById('rapida-lote-info');
  const rapidaCicloDetectado = document.getElementById('rapida-ciclo-detectado');
  const btnRapidaEscanearQr = document.getElementById('btn-rapida-escanear-qr');
  const rapidaFecha = document.getElementById('rapida-fecha');
  const btnRapidaHoy = document.getElementById('btn-rapida-hoy');
  const rapidaTotalKg = document.getElementById('rapida-total-kg');
  const rapidaComercialKg = document.getElementById('rapida-comercial-kg');
  const btnRapidaTodoComercial = document.getElementById('btn-rapida-todo-comercial');
  const rapidaCalcComercial = document.getElementById('rapida-calc-comercial');
  const rapidaCalcDescarte = document.getElementById('rapida-calc-descarte');
  const rapidaCarenciaWarning = document.getElementById('rapida-carencia-warning');
  const rapidaCarenciaText = document.getElementById('rapida-carencia-text');
  const rapidaMotivoDescarte = document.getElementById('rapida-motivo-descarte');
  const rapidaRecipienteTipo = document.getElementById('rapida-recipiente-tipo');
  const rapidaRecipienteCant = document.getElementById('rapida-recipiente-cant');
  const rapidaObservaciones = document.getElementById('rapida-observaciones');
  const rapidaSupHa = document.getElementById('rapida-sup-ha');
  const btnSubmitCosechaRapida = document.getElementById('btn-submit-cosecha-rapida');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : '❌';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Cargar Lotes desde API REST
  async function cargarLotes() {
    try {
      lotesTbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="6" class="text-center loading-indicator">
            <span class="spinner"></span> Obteniendo lotes actualizados...
          </td>
        </tr>`;

      const response = await fetch('/api/v1/lotes');
      const json = await response.json();

      if (!json.success) {
        throw new Error(json.error?.message || 'Error al obtener lotes');
      }

      allLotes = json.data || [];
      actualizarKPIs(allLotes);
      renderizarTabla();
    } catch (err) {
      console.error(err);
      showToast(`Error al cargar datos: ${err.message}`, 'error');
      lotesTbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="6" class="text-center" style="color: var(--accent-rose);">
            No se pudo conectar con el servidor. Reintentá nuevamente.
          </td>
        </tr>`;
    }
  }

  // Actualizar KPIs de Producción
  function actualizarKPIs(lotes) {
    kpiTotal.textContent = lotes.length;

    const activos = lotes.filter(l => l.estadoActual === 'CREADO' || l.estadoActual === 'EN_PROCESO').length;
    kpiActivos.textContent = activos;

    const embalados = lotes.filter(l => l.estadoActual === 'EMBALADO' || l.estadoActual === 'DESPACHADO').length;
    kpiEmbalados.textContent = embalados;

    const masaKg = lotes.reduce((acc, curr) => {
      const cant = Number(curr.cantidadActual) || 0;
      return acc + cant;
    }, 0);
    kpiMasa.textContent = `${masaKg.toLocaleString('es-AR')} kg`;
  }

  // Cargar Catálogo de Fincas (AGRUL-016)
  async function cargarFincas() {
    try {
      const res = await fetch('/api/v1/fincas');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        allFincas = json.data;
        if (filtroFinca) {
          filtroFinca.innerHTML = '<option value="">Todas las Fincas</option>' +
            allFincas.map(f => `<option value="${f.id}">${f.nombre} (${f.ubicacion.provincia})</option>`).join('');
        }
        if (nuevoFincaId) {
          nuevoFincaId.innerHTML = '<option value="">Sin finca asignada</option>' +
            allFincas.map(f => `<option value="${f.id}">${f.nombre} (${f.superficieTotalHa} ha)</option>`).join('');
        }
      }
    } catch (e) {
      console.warn('No se pudieron cargar las fincas:', e);
    }
  }

  // Renderizar Tabla con Filtros
  function renderizarTabla() {
    let filtrados = allLotes;

    if (currentFilter !== 'TODOS') {
      filtrados = filtrados.filter(l => l.estadoActual === currentFilter);
    }

    if (filtroFinca && filtroFinca.value) {
      filtrados = filtrados.filter(l => l.fincaId === filtroFinca.value);
    }

    if (filtroSupMin && filtroSupMin.value !== '') {
      const min = Number(filtroSupMin.value);
      filtrados = filtrados.filter(l => l.superficieHa !== null && l.superficieHa !== undefined && Number(l.superficieHa) >= min);
    }

    if (filtroSupMax && filtroSupMax.value !== '') {
      const max = Number(filtroSupMax.value);
      filtrados = filtrados.filter(l => l.superficieHa !== null && l.superficieHa !== undefined && Number(l.superficieHa) <= max);
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      filtrados = filtrados.filter(l => 
        (l.codigoLote && l.codigoLote.toLowerCase().includes(term)) ||
        (l.producto && l.producto.toLowerCase().includes(term)) ||
        (l.variedad && l.variedad.toLowerCase().includes(term))
      );
    }

    if (filtrados.length === 0) {
      lotesTbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="6" class="text-center" style="color: var(--text-muted); padding: 32px;">
            No se encontraron lotes para los filtros seleccionados.
          </td>
        </tr>`;
      return;
    }

    lotesTbody.innerHTML = filtrados.map(l => {
      const estadoClase = (l.estadoActual || 'CREADO').toLowerCase();
      const fecha = l.creadoEn ? new Date(l.creadoEn).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : '-';

      const surfaceBadge = l.superficieHa ? `<span style="font-size:11px; color:#10b981; font-weight:600; margin-left:6px;">📐 ${l.superficieHa} ha</span>` : '';

      return `
        <tr>
          <td>
            <span class="batch-code">${l.codigoLote}</span>
          </td>
          <td>
            <div class="product-title">${l.producto} ${surfaceBadge}</div>
            <div class="product-variety">${l.variedad || 'Sin variedad especificada'}</div>
          </td>
          <td>
            <span class="status-badge ${estadoClase}">${l.estadoActual}</span>
          </td>
          <td>
            <span class="stock-value">${Number(l.cantidadActual).toLocaleString('es-AR')}</span>
            <span class="stock-unit">${l.unidadMedida}</span>
          </td>
          <td style="color: var(--text-muted); font-size: 13px;">${fecha}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-action action-event" data-id="${l.id}" data-codigo="${l.codigoLote}" title="Registrar evento de trazabilidad">
                ⚡ Evento
              </button>
              <button class="btn-action action-timeline" data-id="${l.id}" data-codigo="${l.codigoLote}" title="Ver bitácora inmutable de eventos">
                📜 Bitácora
              </button>
              <button class="btn-action action-lineage" data-id="${l.id}" data-codigo="${l.codigoLote}" title="Ver grafo interactivo de linaje N:M">
                🕸️ Linaje
              </button>
              <button class="btn-action action-qr" data-id="${l.id}" data-codigo="${l.codigoLote}" title="Ver e imprimir etiqueta oficial con código QR">
                🏷️ QR
              </button>
              <button class="btn-action action-cartel" data-id="${l.id}" data-codigo="${l.codigoLote}" title="Ver e imprimir Cartel de Cabecera de Lote (RF-M1-11)">
                📋 Cartel
              </button>
              <button class="btn-action action-report" data-id="${l.id}" data-codigo="${l.codigoLote}" title="Emitir informe oficial en PDF o exportar a Excel/CSV (AGRUL-033)">
                📄 Informe
              </button>
              <button class="btn-action action-harvest" data-id="${l.id}" data-codigo="${l.codigoLote}" title="Cosecha ultrarrápida en campo (RF-M5-13)">
                🌾 Cosechar
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Asignar listeners a botones de fila
    document.querySelectorAll('.action-event').forEach(btn => {
      btn.addEventListener('click', () => {
        abrirModalEvento(btn.dataset.id, btn.dataset.codigo);
      });
    });

    document.querySelectorAll('.action-timeline').forEach(btn => {
      btn.addEventListener('click', () => {
        abrirModalHistorial(btn.dataset.id, btn.dataset.codigo);
      });
    });

    document.querySelectorAll('.action-report').forEach(btn => {
      btn.addEventListener('click', () => {
        abrirModalInforme(btn.dataset.id, btn.dataset.codigo);
      });
    });

    document.querySelectorAll('.action-lineage').forEach(btn => {
      btn.addEventListener('click', () => {
        abrirModalLinaje(btn.dataset.id, btn.dataset.codigo);
      });
    });

    document.querySelectorAll('.action-qr').forEach(btn => {
      btn.addEventListener('click', () => {
        abrirModalEtiquetaQR(btn.dataset.id, btn.dataset.codigo);
      });
    });

    document.querySelectorAll('.action-cartel').forEach(btn => {
      btn.addEventListener('click', () => {
        abrirModalCartelCabecera(btn.dataset.id, btn.dataset.codigo);
      });
    });

    document.querySelectorAll('.action-harvest').forEach(btn => {
      btn.addEventListener('click', () => {
        abrirModalCosechaRapida(btn.dataset.id);
      });
    });
  }

  // Filtrado por pestañas
  filterTabs.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-btn')) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderizarTabla();
    }
  });

  // Filtros Avanzados
  if (filtroFinca) {
    filtroFinca.addEventListener('change', () => {
      renderizarTabla();
    });
  }

  if (filtroSupMin) {
    filtroSupMin.addEventListener('input', () => {
      renderizarTabla();
    });
  }

  if (filtroSupMax) {
    filtroSupMax.addEventListener('input', () => {
      renderizarTabla();
    });
  }

  // Búsqueda en tiempo real
  inputBusqueda.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderizarTabla();
  });

  btnRecargar.addEventListener('click', async () => {
    await Promise.all([cargarLotes(), cargarFincas()]);
  });

  // Manejo de Modales
  function openModal(modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.close;
      if (modalId === 'modal-qr-scanner') {
        detenerCamara();
      }
      closeModal(document.getElementById(modalId));
    });
  });

  // Modal Nuevo Lote
  btnNuevoLote.addEventListener('click', () => {
    formNuevoLote.reset();
    openModal(modalNuevoLote);
  });

  formNuevoLote.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigoLote = document.getElementById('nuevo-codigo').value.trim() || undefined;
    const producto = document.getElementById('nuevo-producto').value.trim();
    const variedad = document.getElementById('nuevo-variedad').value.trim() || null;
    const cantidadInicial = Number(document.getElementById('nuevo-cantidad').value);
    const unidadMedida = document.getElementById('nuevo-unidad').value;

    const fincaId = nuevoFincaId ? nuevoFincaId.value.trim() : '';
    const superficieHaRaw = nuevoSuperficie ? nuevoSuperficie.value.trim() : '';
    const geoLatRaw = nuevoGeoLat ? nuevoGeoLat.value.trim() : '';
    const geoLngRaw = nuevoGeoLng ? nuevoGeoLng.value.trim() : '';

    const payload = { producto, variedad, cantidadInicial, unidadMedida };
    if (codigoLote) payload.codigoLote = codigoLote;
    if (fincaId) payload.fincaId = fincaId;
    if (superficieHaRaw) payload.superficieHa = Number(superficieHaRaw);
    if (geoLatRaw && geoLngRaw) {
      payload.geometria = {
        type: 'Point',
        coordinates: [Number(geoLngRaw), Number(geoLatRaw)],
      };
    }

    try {
      const res = await fetch('/api/v1/lotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (!json.success) {
        const msg = json.error?.message || 'Error al crear lote';
        const details = json.error?.details ? json.error.details.map(d => `${d.field}: ${d.message}`).join(', ') : '';
        throw new Error(details ? `${msg} (${details})` : msg);
      }

      showToast(`¡Lote ${json.data.codigoLote} creado con éxito!`);
      closeModal(modalNuevoLote);
      await cargarLotes();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Modal Registrar Evento
  function abrirModalEvento(loteId, codigoLote) {
    formRegistrarEvento.reset();
    eventoLoteIdInput.value = loteId;
    eventoLoteCodigoSpan.textContent = codigoLote;
    openModal(modalRegistrarEvento);
  }

  formRegistrarEvento.addEventListener('submit', async (e) => {
    e.preventDefault();
    const loteId = eventoLoteIdInput.value;
    const tipoEvento = document.getElementById('evento-tipo').value;
    const nuevoEstado = document.getElementById('evento-nuevo-estado').value || undefined;
    const actorId = document.getElementById('evento-actor-id').value.trim();
    const ubicacionId = document.getElementById('evento-ubicacion-id').value.trim();
    const detallesRaw = document.getElementById('evento-detalles').value.trim();

    let payloadEspecifico = {};
    if (detallesRaw) {
      try {
        payloadEspecifico = JSON.parse(detallesRaw);
      } catch (jsonErr) {
        payloadEspecifico = { observaciones: detallesRaw };
      }
    }

    const payload = {
      tipoEvento,
      actorId,
      ubicacionId,
      timestampCapturaLocal: new Date().toISOString(),
      payloadEspecifico,
    };
    if (nuevoEstado) {
      payload.nuevoEstado = nuevoEstado;
    }

    try {
      const res = await fetch(`/api/v1/lotes/${loteId}/eventos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error?.message || 'Error al registrar evento');
      }

      showToast(`Evento ${tipoEvento} asentado con éxito.`);
      closeModal(modalRegistrarEvento);
      await cargarLotes();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Modal Historial de Eventos
  let currentLoteIdHistorial = null;
  let currentCodigoLoteHistorial = null;

  const btnAbrirInformeDesdeHistorial = document.getElementById('btn-abrir-informe-desde-historial');
  if (btnAbrirInformeDesdeHistorial) {
    btnAbrirInformeDesdeHistorial.addEventListener('click', () => {
      if (currentLoteIdHistorial) {
        abrirModalInforme(currentLoteIdHistorial, currentCodigoLoteHistorial);
      }
    });
  }

  async function abrirModalHistorial(loteId, codigoLote) {
    currentLoteIdHistorial = loteId;
    currentCodigoLoteHistorial = codigoLote;
    historialSubtitulo.textContent = `Lote ${codigoLote} — Auditoría inmutable append-only`;
    historialLista.innerHTML = '<p class="text-center" style="color: var(--text-muted); padding: 20px;">Consultando bitácora...</p>';
    openModal(modalHistorial);

    try {
      const res = await fetch(`/api/v1/lotes/${loteId}/eventos`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error?.message || 'Error al obtener bitácora');
      }

      const eventos = json.data || [];
      if (eventos.length === 0) {
        historialLista.innerHTML = '<p class="text-center" style="color: var(--text-muted); padding: 20px;">No hay eventos registrados para este lote todavía.</p>';
        return;
      }

      historialLista.innerHTML = eventos.map(ev => {
        const fecha = new Date(ev.timestampCapturaLocal).toLocaleString('es-AR');
        const detalles = JSON.stringify(ev.payloadEspecifico || {});
        return `
          <div class="timeline-item">
            <div class="timeline-header">
              <span class="timeline-type">⚡ ${ev.tipoEvento}</span>
              <span class="timeline-time">${fecha}</span>
            </div>
            <div class="timeline-details">
              <strong>Actor:</strong> ${ev.actorId} | <strong>Ubicación:</strong> ${ev.ubicacionId}
            </div>
            <div class="timeline-details" style="font-family: monospace; font-size: 12px; color: var(--text-dim);">
              ${detalles}
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      historialLista.innerHTML = `<p class="text-center" style="color: var(--accent-rose); padding: 20px;">${err.message}</p>`;
    }
  }

  // ==========================================================================
  // AGRUL-012: Visualizador Gráfico de Linaje Interactivo (Grafo N:M) & Recall
  // ==========================================================================

  const modalLinaje = document.getElementById('modal-linaje');
  const linajeSubtitulo = document.getElementById('linaje-subtitulo');
  const linajeFocoCodigo = document.getElementById('linaje-foco-codigo');
  const linajeFocoMeta = document.getElementById('linaje-foco-meta');
  const lineageSvg = document.getElementById('lineage-svg');
  const lineageZoomGroup = document.getElementById('lineage-zoom-group');
  const graphEdges = document.getElementById('graph-edges');
  const graphNodes = document.getElementById('graph-nodes');
  const btnToggleRecall = document.getElementById('btn-toggle-recall');
  const recallAlertBanner = document.getElementById('recall-alert-banner');
  const recallMasaRiesgo = document.getElementById('recall-masa-riesgo');
  const graphViewportContainer = document.getElementById('graph-viewport-container');

  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');

  // Inspector
  const inspectorEstado = document.getElementById('inspector-estado');
  const inspectorCodigo = document.getElementById('inspector-codigo');
  const inspectorProducto = document.getElementById('inspector-producto');
  const inspectorStock = document.getElementById('inspector-stock');
  const inspectorRelacionField = document.getElementById('inspector-relacion-field');
  const inspectorAporte = document.getElementById('inspector-aporte');
  const inspectorMotivoField = document.getElementById('inspector-motivo-field');
  const inspectorMotivo = document.getElementById('inspector-motivo');
  const btnRecenterGraph = document.getElementById('btn-recenter-graph');

  let currentLinajeData = null;
  let isRecallActive = false;
  let selectedInspectorLote = null;

  // Pan y Zoom
  let zoomLevel = 1;
  let panOffsetX = 0;
  let panOffsetY = 0;
  let isDraggingGraph = false;
  let dragStartX = 0;
  let dragStartY = 0;

  function aplicarTransformacionGrafo() {
    lineageZoomGroup.setAttribute('transform', `translate(${panOffsetX}, ${panOffsetY}) scale(${zoomLevel})`);
  }

  btnZoomIn.addEventListener('click', () => {
    zoomLevel = Math.min(2.5, zoomLevel + 0.2);
    aplicarTransformacionGrafo();
  });

  btnZoomOut.addEventListener('click', () => {
    zoomLevel = Math.max(0.4, zoomLevel - 0.2);
    aplicarTransformacionGrafo();
  });

  btnZoomReset.addEventListener('click', () => {
    zoomLevel = 1;
    panOffsetX = 0;
    panOffsetY = 0;
    aplicarTransformacionGrafo();
  });

  // Paneo con el ratón
  graphViewportContainer.addEventListener('mousedown', (e) => {
    if (e.target.closest('.graph-node')) return; // Permitir clic en nodos
    isDraggingGraph = true;
    graphViewportContainer.classList.add('grabbing');
    dragStartX = e.clientX - panOffsetX;
    dragStartY = e.clientY - panOffsetY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingGraph) return;
    panOffsetX = e.clientX - dragStartX;
    panOffsetY = e.clientY - dragStartY;
    aplicarTransformacionGrafo();
  });

  window.addEventListener('mouseup', () => {
    isDraggingGraph = false;
    graphViewportContainer.classList.remove('grabbing');
  });

  graphViewportContainer.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoomLevel = Math.min(2.5, Math.max(0.4, zoomLevel + delta));
    aplicarTransformacionGrafo();
  }, { passive: false });

  // Toggle Recall Simulator
  btnToggleRecall.addEventListener('click', () => {
    isRecallActive = !isRecallActive;
    if (isRecallActive) {
      btnToggleRecall.classList.add('active');
      recallAlertBanner.style.display = 'flex';
      showToast('🚨 Recall Simulator Activado: Se destacan en rojo los lotes derivados en riesgo.', 'error');
    } else {
      btnToggleRecall.classList.remove('active');
      recallAlertBanner.style.display = 'none';
      showToast('Recall Simulator Desactivado.', 'success');
    }
    if (currentLinajeData) {
      renderizarGrafoLinaje(currentLinajeData);
    }
  });

  // Centrar en lote seleccionado desde el inspector
  btnRecenterGraph.addEventListener('click', () => {
    if (selectedInspectorLote && selectedInspectorLote.id) {
      abrirModalLinaje(selectedInspectorLote.id, selectedInspectorLote.codigoLote);
    }
  });

  // Abrir Modal de Linaje y consultar API
  async function abrirModalLinaje(loteId, codigoLote) {
    linajeSubtitulo.textContent = `Consultando árbol genealógico del lote ${codigoLote}...`;
    linajeFocoCodigo.textContent = codigoLote;
    linajeFocoMeta.textContent = 'Cargando topología...';
    graphEdges.innerHTML = '';
    graphNodes.innerHTML = '';

    // Reset estado
    isRecallActive = false;
    btnToggleRecall.classList.remove('active');
    recallAlertBanner.style.display = 'none';
    zoomLevel = 1;
    panOffsetX = 0;
    panOffsetY = 0;
    aplicarTransformacionGrafo();

    openModal(modalLinaje);

    try {
      const res = await fetch(`/api/v1/lotes/${loteId}/linaje`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error?.message || 'Error al obtener linaje');
      }

      currentLinajeData = json.data;
      const target = currentLinajeData.loteObjetivo;

      linajeSubtitulo.textContent = `Lote ${target.codigoLote} — ${target.producto} (${target.cantidadActual} ${target.unidadMedida})`;
      linajeFocoCodigo.textContent = target.codigoLote;
      linajeFocoMeta.textContent = `${target.producto} | Stock: ${Number(target.cantidadActual).toLocaleString('es-AR')} ${target.unidadMedida}`;

      // Actualizar inspector inicial con el lote objetivo
      actualizarInspectorLote({
        id: target.id,
        codigoLote: target.codigoLote,
        producto: target.producto,
        estadoActual: target.estadoActual,
        cantidadActual: target.cantidadActual,
        unidadMedida: target.unidadMedida,
      });

      renderizarGrafoLinaje(currentLinajeData);
    } catch (err) {
      console.error(err);
      linajeSubtitulo.textContent = `Error al cargar linaje: ${err.message}`;
      showToast(`Error al cargar linaje: ${err.message}`, 'error');
    }
  }

  // Actualizar datos del panel de inspección lateral
  function actualizarInspectorLote(loteData, relacionData = null) {
    selectedInspectorLote = loteData;
    inspectorCodigo.textContent = loteData.codigoLote || '-';
    inspectorProducto.textContent = loteData.producto || '-';

    const estado = loteData.estadoActual || 'CREADO';
    inspectorEstado.textContent = estado;
    inspectorEstado.className = `inspector-status-badge status-badge ${estado.toLowerCase()}`;

    const stock = Number(loteData.cantidadActual !== undefined ? loteData.cantidadActual : loteData.cantidadAportada) || 0;
    inspectorStock.textContent = `${stock.toLocaleString('es-AR')} ${loteData.unidadMedida || 'KG'}`;

    if (relacionData) {
      inspectorRelacionField.style.display = 'block';
      inspectorAporte.textContent = `${Number(relacionData.cantidadAportada || 0).toLocaleString('es-AR')} ${relacionData.unidadMedida || 'KG'}`;

      inspectorMotivoField.style.display = 'block';
      const motivo = relacionData.motivoRelacion || 'TRANSFORMACION';
      inspectorMotivo.textContent = motivo;
      inspectorMotivo.className = `inspector-value badge-relacion ${motivo.toLowerCase()}`;
    } else {
      inspectorRelacionField.style.display = 'none';
      inspectorMotivoField.style.display = 'none';
    }

    if (currentLinajeData && currentLinajeData.loteObjetivo && loteData.id === currentLinajeData.loteObjetivo.id) {
      btnRecenterGraph.style.display = 'none';
    } else {
      btnRecenterGraph.style.display = 'block';
    }
  }

  // Motor de renderizado SVG del Grafo N:M
  function renderizarGrafoLinaje(data) {
    graphEdges.innerHTML = '';
    graphNodes.innerHTML = '';

    const target = data.loteObjetivo;
    const ancestros = data.ancestros || [];
    const descendientes = data.descendientes || [];

    // Dimensiones de nodos
    const nodeW = 190;
    const nodeH = 74;

    // Calcular distribución vertical
    const maxRows = Math.max(1, ancestros.length, descendientes.length);
    const rowGap = 100;
    const totalHeight = Math.max(380, maxRows * rowGap + 80);

    const centerY = totalHeight / 2 - nodeH / 2;
    const targetX = 460;
    const targetY = centerY;

    const targetNodeCoords = { x: targetX, y: targetY };

    // Coordenadas de ancestros (Columna izquierda)
    const ancestorX = 90;
    const ancestorNodes = ancestros.map((anc, idx) => {
      const spacing = totalHeight / (ancestros.length + 1);
      const y = spacing * (idx + 1) - nodeH / 2;
      return { data: anc, x: ancestorX, y };
    });

    // Coordenadas de descendientes (Columna derecha)
    const descendantX = 830;
    const descendantNodes = descendientes.map((desc, idx) => {
      const spacing = totalHeight / (descendientes.length + 1);
      const y = spacing * (idx + 1) - nodeH / 2;
      return { data: desc, x: descendantX, y };
    });

    // Calcular masa comprometida en Recall
    let masaRecallRiesgo = 0;
    if (isRecallActive) {
      // Masa de todos los descendientes en riesgo
      masaRecallRiesgo = descendientes.reduce((sum, d) => sum + (Number(d.cantidadAportada) || 0), 0);
      recallMasaRiesgo.textContent = `${masaRecallRiesgo.toLocaleString('es-AR')} kg (${descendientes.length} lotes)`;
    }

    // 1. Renderizar Aristas de Ancestros -> Lote Objetivo
    ancestorNodes.forEach(({ data: anc, x, y }) => {
      const startX = x + nodeW;
      const startY = y + nodeH / 2;
      const endX = targetX;
      const endY = targetY + nodeH / 2;

      const edgePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cp1X = startX + (endX - startX) * 0.5;
      const cp2X = startX + (endX - startX) * 0.5;
      const d = `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`;
      edgePath.setAttribute('d', d);

      const motivo = (anc.motivoRelacion || 'BLEND_MERGE').toLowerCase();
      edgePath.setAttribute('class', `graph-edge ${motivo}`);
      edgePath.setAttribute('marker-end', motivo === 'split' ? 'url(#arrow-split)' : 'url(#arrow-merge)');
      graphEdges.appendChild(edgePath);

      // Etiqueta intermedia en la arista
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const labelText = `${anc.motivoRelacion || 'FUSIÓN'} (${Number(anc.cantidadAportada || 0).toLocaleString('es-AR')} ${anc.unidadMedida || 'KG'})`;
      crearEtiquetaArista(midX, midY, labelText, motivo);
    });

    // 2. Renderizar Aristas de Lote Objetivo -> Descendientes
    descendantNodes.forEach(({ data: desc, x, y }) => {
      const startX = targetX + nodeW;
      const startY = targetY + nodeH / 2;
      const endX = x;
      const endY = y + nodeH / 2;

      const edgePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const cp1X = startX + (endX - startX) * 0.5;
      const cp2X = startX + (endX - startX) * 0.5;
      const d = `M ${startX} ${startY} C ${cp1X} ${startY}, ${cp2X} ${endY}, ${endX} ${endY}`;
      edgePath.setAttribute('d', d);

      const motivo = (desc.motivoRelacion || 'SPLIT').toLowerCase();
      const isRecallEdge = isRecallActive;

      edgePath.setAttribute('class', `graph-edge ${motivo} ${isRecallEdge ? 'recall-edge' : ''}`);
      edgePath.setAttribute('marker-end', isRecallEdge ? 'url(#arrow-recall)' : (motivo === 'merge' ? 'url(#arrow-merge)' : 'url(#arrow-split)'));
      graphEdges.appendChild(edgePath);

      // Etiqueta intermedia
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const labelText = `${desc.motivoRelacion || 'DIVISIÓN'} (${Number(desc.cantidadAportada || 0).toLocaleString('es-AR')} ${desc.unidadMedida || 'KG'})`;
      crearEtiquetaArista(midX, midY, labelText, isRecallEdge ? 'recall' : motivo);
    });

    // 3. Renderizar Nodos de Ancestros
    ancestorNodes.forEach(({ data: anc, x, y }) => {
      const g = crearElementoNodoSVG(anc, x, y, nodeW, nodeH, {
        isTarget: false,
        isRecalled: false,
        isSource: false,
      });
      g.addEventListener('click', () => {
        actualizarInspectorLote(anc, anc);
      });
      graphNodes.appendChild(g);
    });

    // 4. Renderizar Nodo Lote Objetivo (Foco)
    const targetG = crearElementoNodoSVG(target, targetNodeCoords.x, targetNodeCoords.y, nodeW, nodeH, {
      isTarget: true,
      isRecalled: false,
      isSource: isRecallActive,
    });
    targetG.addEventListener('click', () => {
      actualizarInspectorLote(target);
    });
    graphNodes.appendChild(targetG);

    // 5. Renderizar Nodos de Descendientes
    descendantNodes.forEach(({ data: desc, x, y }) => {
      const g = crearElementoNodoSVG(desc, x, y, nodeW, nodeH, {
        isTarget: false,
        isRecalled: isRecallActive,
        isSource: false,
      });
      g.addEventListener('click', () => {
        actualizarInspectorLote(desc, desc);
      });
      graphNodes.appendChild(g);
    });
  }

  // Crear Etiqueta SVG para Aristas
  function crearEtiquetaArista(x, y, texto, tipo) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const width = Math.max(80, texto.length * 6.5 + 16);
    const height = 20;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x - width / 2);
    rect.setAttribute('y', y - height / 2);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('class', 'edge-label-bg');
    if (tipo === 'recall') {
      rect.setAttribute('stroke', '#f43f5e');
      rect.setAttribute('fill', '#450a0a');
    }

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('class', 'edge-label-text');
    if (tipo === 'recall') {
      text.setAttribute('fill', '#fca5a5');
    }
    text.textContent = texto;

    g.appendChild(rect);
    g.appendChild(text);
    graphEdges.appendChild(g);
  }

  // Crear Elemento Gráfico de Nodo SVG
  function crearElementoNodoSVG(lote, x, y, w, h, flags) {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    let classes = 'graph-node';
    if (flags.isTarget) classes += ' is-target';
    if (flags.isSource) classes += ' is-source-contaminated';
    if (flags.isRecalled) classes += ' is-recalled';
    g.setAttribute('class', classes);
    g.setAttribute('transform', `translate(${x}, ${y})`);

    // Rectángulo de fondo
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('class', 'node-card-rect');
    g.appendChild(rect);

    // Indicador circular de estado
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', 16);
    circle.setAttribute('cy', 22);
    circle.setAttribute('r', 5);
    const estado = (lote.estadoActual || 'CREADO').toUpperCase();
    let fillColor = '#38bdf8'; // Creado
    if (estado === 'EN_PROCESO') fillColor = '#f59e0b';
    if (estado === 'EMBALADO') fillColor = '#a855f7';
    if (estado === 'DESPACHADO') fillColor = '#10b981';
    if (estado === 'CERRADO') fillColor = '#64748b';
    if (flags.isRecalled || flags.isSource) fillColor = '#f43f5e';
    circle.setAttribute('fill', fillColor);
    g.appendChild(circle);

    // Texto: Código de lote
    const codeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    codeText.setAttribute('x', 28);
    codeText.setAttribute('y', 25);
    codeText.setAttribute('class', 'node-code-text');
    codeText.textContent = lote.codigoLote || 'LOTE-SIN-CODIGO';
    g.appendChild(codeText);

    // Texto: Producto
    const prodText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    prodText.setAttribute('x', 14);
    prodText.setAttribute('y', 44);
    prodText.setAttribute('class', 'node-prod-text');
    const prodStr = lote.producto || 'Producto Agrícola';
    prodText.textContent = prodStr.length > 22 ? `${prodStr.substring(0, 20)}...` : prodStr;
    g.appendChild(prodText);

    // Texto: Stock / Masa
    const stockText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    stockText.setAttribute('x', 14);
    stockText.setAttribute('y', 61);
    stockText.setAttribute('class', 'node-stock-text');
    const cant = Number(lote.cantidadActual !== undefined ? lote.cantidadActual : lote.cantidadAportada) || 0;
    const unit = lote.unidadMedida || 'KG';
    stockText.textContent = `Stock: ${cant.toLocaleString('es-AR')} ${unit}`;
    g.appendChild(stockText);

    return g;
  }

  // ==========================================================================
  // AGRUL-013: Generador y Lector de Códigos QR para Operarios de Campo
  // ==========================================================================

  // Abrir Modal de Etiqueta QR
  async function abrirModalEtiquetaQR(loteId, codigoLote) {
    qrLabelSubtitle.textContent = `Generando rótulo oficial para lote ${codigoLote}...`;
    qrCanvasContainer.innerHTML = '<div class="qr-loading-placeholder">Generando QR...</div>';
    openModal(modalQrLabel);

    try {
      const res = await fetch(`/api/v1/lotes/${loteId}/qr`);
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Error al obtener código QR');
      }

      const data = json.data;
      qrLabelSubtitle.textContent = `Rótulo estandarizado para bines y pallets de campo (RN-07)`;
      labelCodigoLote.textContent = data.codigoLote;
      labelProducto.textContent = data.producto;
      labelVariedad.textContent = data.variedad || 'Sin variedad';
      labelEstado.textContent = data.estadoActual;
      labelEstado.className = `field-value status-tag status-badge ${(data.estadoActual || 'creado').toLowerCase()}`;
      labelCantidad.textContent = `${Number(data.cantidadActual).toLocaleString('es-AR')} ${data.unidadMedida}`;
      labelFecha.textContent = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
      labelUuid.textContent = data.loteId;

      // Inyectar SVG generado por el backend
      qrCanvasContainer.innerHTML = data.qrSvg;

      // Configurar enlace de descarga SVG
      btnDescargarQrSvg.href = `/api/v1/lotes/${loteId}/qr/image`;
      btnDescargarQrSvg.download = `etiqueta-${data.codigoLote}.svg`;
    } catch (err) {
      console.error(err);
      qrCanvasContainer.innerHTML = `<span style="color:#ef4444;font-size:0.75rem;">Error al generar QR</span>`;
      showToast(`Error al generar QR: ${err.message}`, 'error');
    }
  }

  // Imprimir etiqueta
  if (btnImprimirEtiqueta) {
    btnImprimirEtiqueta.addEventListener('click', () => {
      window.print();
    });
  }

  // ==========================================================================
  // AGRUL-016: Cartel de Cabecera de Lote y Ficha Imprimible de Campo (RF-M1-11)
  // ==========================================================================
  async function abrirModalCartelCabecera(loteId, codigoLote) {
    if (!modalFichaCabecera) return;
    openModal(modalFichaCabecera);
    cartelCodigo.textContent = codigoLote || 'Cargando...';
    cartelQrContainer.innerHTML = '<div class="qr-loading-placeholder">Generando QR de campo...</div>';
    if (btnAbrirHtmlCartel) {
      btnAbrirHtmlCartel.href = `/api/v1/lotes/${loteId}/ficha-imprimible?format=html`;
    }

    try {
      const res = await fetch(`/api/v1/lotes/${loteId}/ficha-imprimible`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'Error al obtener ficha imprimible');

      const f = json.data;
      cartelCodigo.textContent = f.codigoLote;
      cartelProducto.textContent = f.producto;
      cartelVariedad.textContent = f.variedad || 'Sin variedad';
      cartelSuperficie.textContent = f.superficieHa ? `${f.superficieHa} ha` : 'No especificada';
      cartelFinca.textContent = f.finca ? `${f.finca.nombre} (${f.finca.localidad}, ${f.finca.provincia})` : 'Establecimiento General';
      cartelCoords.textContent = f.coordenadasFormateadas;
      cartelEmision.textContent = `Emisión: ${new Date(f.fechaEmision).toLocaleDateString('es-AR')}`;
      cartelQrContainer.innerHTML = f.qrSvg;
    } catch (err) {
      console.error(err);
      cartelQrContainer.innerHTML = `<span style="color:#ef4444;font-size:0.75rem;">Error al cargar QR</span>`;
      showToast(`Error al obtener ficha de lote: ${err.message}`, 'error');
    }
  }

  if (btnImprimirCartel) {
    btnImprimirCartel.addEventListener('click', () => {
      window.print();
    });
  }

  // Abrir Modal de Escáner
  if (btnAbrirEscaner) {
    btnAbrirEscaner.addEventListener('click', () => {
      openModal(modalQrScanner);
      iniciarCamara();
    });
  }

  // Iniciar Stream de Cámara
  async function iniciarCamara() {
    detenerCamara();
    if (scannerStatusText) {
      scannerStatusText.textContent = 'Solicitando acceso a la cámara...';
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (scannerStatusText) {
        scannerStatusText.textContent = 'Cámara no soportada en este entorno. Ingrese el código manual abajo.';
      }
      showToast('Cámara web no soportada en este navegador.', 'error');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: currentCameraFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      activeMediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (scannerVideo) {
        scannerVideo.srcObject = activeMediaStream;
        await scannerVideo.play();
      }

      isScanningActive = true;
      if (scannerStatusText) {
        scannerStatusText.textContent = 'Enfocá el código QR del bin/pallet...';
      }

      iniciarBucleDeteccionQR();
    } catch (err) {
      console.warn('Error accediendo a cámara:', err);
      if (scannerStatusText) {
        scannerStatusText.textContent = 'No se pudo acceder a la cámara. Ingrese el código manual abajo.';
      }
      showToast('Acceso a cámara no disponible. Utilice el selector de foto o código manual.', 'error');
    }
  }

  // Detener Stream de Cámara
  function detenerCamara() {
    isScanningActive = false;
    if (activeMediaStream) {
      activeMediaStream.getTracks().forEach(track => track.stop());
      activeMediaStream = null;
    }
    if (scannerVideo) {
      scannerVideo.srcObject = null;
    }
  }

  // Alternar entre cámara trasera y frontal
  if (btnSwitchCamera) {
    btnSwitchCamera.addEventListener('click', () => {
      currentCameraFacingMode = currentCameraFacingMode === 'environment' ? 'user' : 'environment';
      iniciarCamara();
    });
  }

  // Bucle de Detección de QR
  function iniciarBucleDeteccionQR() {
    if (!('BarcodeDetector' in window)) {
      if (scannerStatusText) {
        scannerStatusText.textContent = 'Cámara activa (use selector de foto o código manual para escanear)';
      }
      return;
    }

    try {
      // @ts-ignore
      const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });

      async function escanearFrame() {
        if (!isScanningActive || !scannerVideo || scannerVideo.readyState < 2) {
          if (isScanningActive) requestAnimationFrame(escanearFrame);
          return;
        }

        try {
          const barcodes = await barcodeDetector.detect(scannerVideo);
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            procesarCodigoQRDetectado(rawValue);
            return;
          }
        } catch (e) {
          // Ignorar excepciones de frames intermedios
        }

        if (isScanningActive) {
          requestAnimationFrame(escanearFrame);
        }
      }

      requestAnimationFrame(escanearFrame);
    } catch (err) {
      console.warn('BarcodeDetector no pudo inicializarse:', err);
    }
  }

  // Procesar archivo de imagen subido
  if (scannerFileInput) {
    scannerFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (scannerStatusText) {
        scannerStatusText.textContent = 'Analizando imagen subida...';
      }

      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
          const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
          const imgBitmap = await createImageBitmap(file);
          const barcodes = await barcodeDetector.detect(imgBitmap);
          if (barcodes.length > 0) {
            procesarCodigoQRDetectado(barcodes[0].rawValue);
            return;
          } else {
            showToast('No se detectó ningún código QR en la foto.', 'error');
            if (scannerStatusText) {
              scannerStatusText.textContent = 'No se detectó QR. Pruebe con otra imagen.';
            }
          }
        } catch (err) {
          console.error(err);
          showToast('Error al analizar la imagen.', 'error');
        }
      } else {
        showToast('Navegador sin BarcodeDetector nativo. Ingrese el código manual.', 'error');
      }
    });
  }

  // Procesar entrada manual
  if (btnSubmitManualCode) {
    btnSubmitManualCode.addEventListener('click', () => {
      const codigo = (scannerManualCode?.value || '').trim().toUpperCase();
      if (!codigo) {
        showToast('Ingrese un código de lote válido.', 'error');
        return;
      }
      procesarCodigoQRDetectado(codigo);
    });
  }

  if (scannerManualCode) {
    scannerManualCode.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        btnSubmitManualCode?.click();
      }
    });
  }

  // Procesar Código QR Detectado o Ingresado
  function procesarCodigoQRDetectado(rawText) {
    detenerCamara();
    closeModal(modalQrScanner);

    let codigo = String(rawText || '').trim();
    if (codigo.includes('/lotes/')) {
      const parts = codigo.split('/lotes/');
      codigo = parts[parts.length - 1];
    } else if (codigo.includes('=')) {
      const parts = codigo.split('=');
      codigo = parts[parts.length - 1];
    }

    codigo = codigo.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();

    showToast(`🎯 Lote escaneado: ${codigo}`, 'success');

    const loteEncontrado = allLotes.find(l => (l.codigoLote || '').toUpperCase() === codigo || l.id === codigo);

    if (loteEncontrado) {
      abrirModalEvento(loteEncontrado.id, loteEncontrado.codigoLote);
    } else {
      fetch('/api/v1/lotes')
        .then(r => r.json())
        .then(json => {
          if (json.success && json.data) {
            allLotes = json.data;
            const lote = allLotes.find(l => (l.codigoLote || '').toUpperCase() === codigo || l.id === codigo);
            if (lote) {
              abrirModalEvento(lote.id, lote.codigoLote);
            } else {
              showToast(`Lote ${codigo} no encontrado en la base de datos.`, 'error');
            }
          }
        })
        .catch(() => {
          showToast(`Error al consultar el lote ${codigo}.`, 'error');
        });
    }
  }

  // ==========================================================================
  // COSECHA MÓVIL ULTRARRÁPIDA EN CAMPO (AGRUL-031 / RF-M5-13 / RNF-01 / RNF-15)
  // ==========================================================================

  function abrirModalCosechaRapida(preselectedLoteId = null) {
    if (!formCosechaRapida) return;
    formCosechaRapida.reset();

    // Fecha actual autocompletada por defecto (RN-01 / RF-M5-13)
    if (rapidaFecha) {
      rapidaFecha.value = new Date().toISOString().split('T')[0];
    }

    // Poblar selector de lotes
    if (rapidaLoteId) {
      rapidaLoteId.innerHTML = '<option value="">Seleccione lote a cosechar...</option>';
      allLotes.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.id;
        opt.textContent = `${l.codigoLote} — ${l.producto} (${l.estadoActual})`;
        if (preselectedLoteId && l.id === preselectedLoteId) {
          opt.selected = true;
        }
        rapidaLoteId.appendChild(opt);
      });
    }

    if (rapidaLoteInfo) {
      rapidaLoteInfo.style.display = preselectedLoteId ? 'inline-flex' : 'none';
    }

    recalcularBalanceEnVivo();
    verificarCarenciaRapida();

    if (modalCosechaRapida) {
      openModal(modalCosechaRapida);
    }
  }

  // Recálculo en vivo de Descarte y Balances (RN-09)
  function recalcularBalanceEnVivo() {
    if (!rapidaTotalKg || !rapidaComercialKg) return;
    const total = parseFloat(rapidaTotalKg.value) || 0;
    const comercial = parseFloat(rapidaComercialKg.value) || 0;
    const descarte = Math.max(0, Number((total - comercial).toFixed(2)));

    const pctComercial = total > 0 ? ((comercial / total) * 100).toFixed(1) : '0.0';
    const pctDescarte = total > 0 ? ((descarte / total) * 100).toFixed(1) : '0.0';

    if (rapidaCalcComercial) {
      rapidaCalcComercial.textContent = `${comercial.toFixed(1)} kg (${pctComercial}%)`;
      if (comercial > total && total > 0) {
        rapidaCalcComercial.style.color = '#ef4444';
      } else {
        rapidaCalcComercial.style.color = '';
      }
    }

    if (rapidaCalcDescarte) {
      if (comercial > total && total > 0) {
        rapidaCalcDescarte.textContent = '¡Excede Total!';
        rapidaCalcDescarte.style.color = '#ef4444';
      } else {
        rapidaCalcDescarte.textContent = `${descarte.toFixed(1)} kg (${pctDescarte}%)`;
        rapidaCalcDescarte.style.color = '';
      }
    }
  }

  // Verificación de carencia no bloqueante en tiempo real (RF-M5-11 / RN-14)
  async function verificarCarenciaRapida() {
    if (!rapidaLoteId || !rapidaFecha || !rapidaCarenciaWarning) return;
    const loteId = rapidaLoteId.value;
    const fecha = rapidaFecha.value;

    if (!loteId || !fecha) {
      rapidaCarenciaWarning.style.display = 'none';
      return;
    }

    try {
      const res = await fetch(`/api/v1/lotes/${loteId}/carencia?fecha=${encodeURIComponent(fecha)}`);
      const json = await res.json();
      if (json.success && json.data && json.data.totalAlertasCarencia > 0) {
        if (rapidaCarenciaText) {
          rapidaCarenciaText.textContent = `⚠️ Advertencia de Carencia Fitosanitaria: ${json.data.totalAlertasCarencia} aplicación(es) activa(s) en este lote. La cosecha no está bloqueada, pero quedará asentada en trazabilidad.`;
        }
        rapidaCarenciaWarning.style.display = 'flex';
      } else {
        rapidaCarenciaWarning.style.display = 'none';
      }
    } catch (_) {
      rapidaCarenciaWarning.style.display = 'none';
    }
  }

  // Event Listeners de Cosecha Rápida
  if (btnCosechaRapida) {
    btnCosechaRapida.addEventListener('click', () => {
      abrirModalCosechaRapida();
    });
  }

  if (btnToggleContrasteSolar) {
    btnToggleContrasteSolar.addEventListener('click', () => {
      if (dialogCosechaRapida) {
        dialogCosechaRapida.classList.toggle('solar-high-contrast');
        const isActive = dialogCosechaRapida.classList.contains('solar-high-contrast');
        btnToggleContrasteSolar.textContent = isActive ? '🌙 Modo Normal' : '☀️ Modo Sol';
        showToast(isActive ? 'Modo Alto Contraste Solar Activado' : 'Modo Estándar Restaurado', 'success');
      }
    });
  }

  if (btnRapidaHoy && rapidaFecha) {
    btnRapidaHoy.addEventListener('click', () => {
      rapidaFecha.value = new Date().toISOString().split('T')[0];
      verificarCarenciaRapida();
    });
  }

  if (btnRapidaTodoComercial && rapidaTotalKg && rapidaComercialKg) {
    btnRapidaTodoComercial.addEventListener('click', () => {
      rapidaComercialKg.value = rapidaTotalKg.value;
      recalcularBalanceEnVivo();
    });
  }

  if (rapidaTotalKg) {
    rapidaTotalKg.addEventListener('input', recalcularBalanceEnVivo);
  }

  if (rapidaComercialKg) {
    rapidaComercialKg.addEventListener('input', recalcularBalanceEnVivo);
  }

  if (rapidaLoteId) {
    rapidaLoteId.addEventListener('change', () => {
      if (rapidaLoteInfo) {
        rapidaLoteInfo.style.display = rapidaLoteId.value ? 'inline-flex' : 'none';
      }
      verificarCarenciaRapida();
    });
  }

  if (rapidaFecha) {
    rapidaFecha.addEventListener('change', verificarCarenciaRapida);
  }

  if (btnRapidaEscanearQr) {
    btnRapidaEscanearQr.addEventListener('click', () => {
      closeModal(modalCosechaRapida);
      btnAbrirEscaner?.click();
    });
  }

  // Envío del Formulario Móvil Ultrarrápido (< 15s)
  if (formCosechaRapida) {
    formCosechaRapida.addEventListener('submit', async (e) => {
      e.preventDefault();

      const loteId = rapidaLoteId?.value;
      const totalKg = parseFloat(rapidaTotalKg?.value || '0');
      const comercialKg = parseFloat(rapidaComercialKg?.value || '0');
      const fecha = rapidaFecha?.value || new Date().toISOString().split('T')[0];

      if (!loteId) {
        showToast('Seleccione un lote a cosechar.', 'error');
        rapidaLoteId?.focus();
        return;
      }

      if (isNaN(totalKg) || totalKg <= 0) {
        showToast('El total cosechado debe ser mayor a 0 kg.', 'error');
        rapidaTotalKg?.focus();
        return;
      }

      if (isNaN(comercialKg) || comercialKg < 0) {
        showToast('La cantidad comercializable no puede ser negativa.', 'error');
        rapidaComercialKg?.focus();
        return;
      }

      if (comercialKg > totalKg) {
        showToast('La cantidad comercializable no puede superar el total cosechado (RN-09).', 'error');
        rapidaComercialKg?.focus();
        return;
      }

      const payload = {
        loteId,
        cantidadCosechadaKg: totalKg,
        cantidadComercializableKg: comercialKg,
        fecha,
      };

      if (rapidaMotivoDescarte && rapidaMotivoDescarte.value) {
        payload.motivoDescarte = rapidaMotivoDescarte.value;
      }
      if (rapidaObservaciones && rapidaObservaciones.value.trim()) {
        payload.observacionesCalidad = rapidaObservaciones.value.trim();
      }
      if (rapidaSupHa && parseFloat(rapidaSupHa.value) > 0) {
        payload.superficieCosechadaHa = parseFloat(rapidaSupHa.value);
      }
      if (rapidaRecipienteCant && parseInt(rapidaRecipienteCant.value, 10) > 0) {
        payload.recipientes = [{
          tipo: rapidaRecipienteTipo?.value || 'CAJON',
          cantidad: parseInt(rapidaRecipienteCant.value, 10),
        }];
      }

      if (btnSubmitCosechaRapida) {
        btnSubmitCosechaRapida.disabled = true;
        btnSubmitCosechaRapida.innerHTML = '<span class="spinner"></span> Registrando Cosecha...';
      }

      try {
        const response = await fetch('/api/v1/cosechas/rapida', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const json = await response.json();

        if (json.success && json.data) {
          showToast(`🌾 Cosecha registrada: ${json.data.codigoTrazabilidad} (+${json.data.cantidadComercializableKg} kg)`, 'success');
          if (json.meta && json.meta.advertenciaCarencia) {
            showToast('⚠️ Advertencia: Cosecha asentada pero violó período de carencia fitosanitaria.', 'error');
          }
          closeModal(modalCosechaRapida);
          await cargarLotes();
        } else {
          const msg = json.error?.message || 'Error al procesar la cosecha.';
          showToast(`Error: ${msg}`, 'error');
        }
      } catch (err) {
        showToast(`Error de conexión: ${err.message}`, 'error');
      } finally {
        if (btnSubmitCosechaRapida) {
          btnSubmitCosechaRapida.disabled = false;
          btnSubmitCosechaRapida.innerHTML = '<span class="btn-icon-large">💾</span> <span class="btn-text-large">REGISTRAR COSECHA INMEDIATA</span>';
        }
      }
    });
  }

  // ==========================================================================
  // AGRUL-033: Emisión de Informes de Trazabilidad (PDF & CSV/Excel)
  // ==========================================================================
  const modalInforme = document.getElementById('modal-informe-trazabilidad');
  const informeLoteIdInput = document.getElementById('informe-lote-id');
  const informeCodigoLoteInput = document.getElementById('informe-codigo-lote');
  const informeLoteCodigoDisplay = document.getElementById('informe-lote-codigo-display');
  const informeSubtitulo = document.getElementById('informe-subtitulo');
  const informeEmitidoPor = document.getElementById('informe-emitido-por');
  const chkIncluirCostos = document.getElementById('chk-incluir-costos');
  const chkIncluirDatosPersonales = document.getElementById('chk-incluir-datos-personales');
  const btnDescargarPdf = document.getElementById('btn-descargar-pdf');
  const btnDescargarCsv = document.getElementById('btn-descargar-csv');
  const btnRefrescarLogs = document.getElementById('btn-refrescar-logs');
  const informesLogList = document.getElementById('informes-log-list');

  async function descargarArchivo(url, fallbackFilename) {
    try {
      showToast('Generando documento de trazabilidad...', 'info');
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Error del servidor (${res.status})`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      let filename = fallbackFilename;
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/);
        if (match && match[1]) filename = match[1];
      }
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      showToast('Descarga completada con éxito.', 'success');
      if (informeLoteIdInput && informeLoteIdInput.value) {
        cargarLogsEmision(informeLoteIdInput.value);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function cargarLogsEmision(loteId) {
    if (!informesLogList) return;
    informesLogList.innerHTML = '<p class="text-dim" style="font-size: 12px; padding: 8px 0;">Consultando emisiones...</p>';
    try {
      const res = await fetch(`/api/v1/trazabilidad/informes-log?loteId=${encodeURIComponent(loteId)}`);
      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error?.message || 'Error al obtener historial');
      }
      const logs = json.data;
      if (logs.length === 0) {
        informesLogList.innerHTML = '<p class="text-dim" style="font-size: 12px; padding: 8px 0;">Sin emisiones previas registradas para este lote.</p>';
        return;
      }

      informesLogList.innerHTML = logs.map(item => {
        const fecha = new Date(item.emitidoEn).toLocaleString('es-AR');
        const hashAbbr = item.hashSha256 ? `${item.hashSha256.substring(0, 10)}...${item.hashSha256.substring(item.hashSha256.length - 6)}` : '-';
        const rectBadge = item.tuvoRectificacion ? '<span class="badge-rect-log" title="Incluye historial de modificaciones/rectificaciones">⚠️ Rectificado</span>' : '';
        const anulBadge = item.tuvoAnulacion ? '<span class="badge-anul-log" title="Lote con anulación/compensación">⛔ Anulado</span>' : '';
        const formatBadge = item.formato === 'PDF' 
          ? '<span class="badge-format-pdf">PDF</span>' 
          : '<span class="badge-format-csv">CSV</span>';

        return `
          <div class="informe-log-row">
            <div class="log-row-main">
              ${formatBadge}
              <span class="log-id-informe">${item.idInforme}</span>
              <span class="log-fecha">${fecha}</span>
              <span class="log-emisor">${item.emitidoPor}</span>
              ${rectBadge}
              ${anulBadge}
            </div>
            <div class="log-hash-code" title="Hash inmutable SHA-256 de integridad">
              SHA-256: <code>${hashAbbr}</code>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      informesLogList.innerHTML = `<p style="color: var(--accent-rose); font-size: 12px; padding: 8px 0;">${err.message}</p>`;
    }
  }

  function abrirModalInforme(loteId, codigoLote) {
    if (!modalInforme) return;
    if (informeLoteIdInput) informeLoteIdInput.value = loteId;
    if (informeCodigoLoteInput) informeCodigoLoteInput.value = codigoLote;
    if (informeLoteCodigoDisplay) informeLoteCodigoDisplay.textContent = `LOTE: ${codigoLote}`;
    if (informeSubtitulo) informeSubtitulo.textContent = `Lote ${codigoLote} — Certificación oficial SENASA & BPA / Exportación`;

    // Filtros por defecto conforme RNF-14 / RF-M6-11 (privacidad activa por defecto)
    if (chkIncluirCostos) chkIncluirCostos.checked = false;
    if (chkIncluirDatosPersonales) chkIncluirDatosPersonales.checked = false;

    openModal(modalInforme);
    cargarLogsEmision(loteId);
  }

  if (btnDescargarPdf) {
    btnDescargarPdf.addEventListener('click', () => {
      const loteId = informeLoteIdInput.value;
      const emitidoPor = (informeEmitidoPor && informeEmitidoPor.value.trim()) || 'Auditoría de Calidad Agrul';
      const incluirCostos = chkIncluirCostos ? chkIncluirCostos.checked : false;
      const incluirDatosPersonales = chkIncluirDatosPersonales ? chkIncluirDatosPersonales.checked : false;
      const url = `/api/v1/trazabilidad/recorrido/${encodeURIComponent(loteId)}/pdf?emitidoPor=${encodeURIComponent(emitidoPor)}&incluirCostos=${incluirCostos}&incluirDatosPersonales=${incluirDatosPersonales}`;
      descargarArchivo(url, `informe_trazabilidad_${informeCodigoLoteInput.value || loteId}.pdf`);
    });
  }

  if (btnDescargarCsv) {
    btnDescargarCsv.addEventListener('click', () => {
      const loteId = informeLoteIdInput.value;
      const emitidoPor = (informeEmitidoPor && informeEmitidoPor.value.trim()) || 'Auditoría de Calidad Agrul';
      const incluirCostos = chkIncluirCostos ? chkIncluirCostos.checked : false;
      const incluirDatosPersonales = chkIncluirDatosPersonales ? chkIncluirDatosPersonales.checked : false;
      const url = `/api/v1/trazabilidad/recorrido/${encodeURIComponent(loteId)}/csv?emitidoPor=${encodeURIComponent(emitidoPor)}&incluirCostos=${incluirCostos}&incluirDatosPersonales=${incluirDatosPersonales}`;
      descargarArchivo(url, `trazabilidad_${informeCodigoLoteInput.value || loteId}.csv`);
    });
  }

  if (btnRefrescarLogs) {
    btnRefrescarLogs.addEventListener('click', () => {
      if (informeLoteIdInput && informeLoteIdInput.value) {
        cargarLogsEmision(informeLoteIdInput.value);
      }
    });
  }

  // ==========================================================================
  // AGRUL-034: Consulta Inversa y Retiro Preventivo de Insumos (Recall - RF-M6-12)
  // ==========================================================================
  const btnRecallInsumo = document.getElementById('btn-recall-insumo');
  const modalRecallInsumo = document.getElementById('modal-recall-insumo');
  const formConsultaInversa = document.getElementById('form-consulta-inversa');
  const recallSelectInsumo = document.getElementById('recall-select-insumo');
  const recallInputInsumoId = document.getElementById('recall-input-insumo-id');
  const recallInputNumeroLote = document.getElementById('recall-input-numero-lote');
  const recallLoading = document.getElementById('recall-loading');
  const recallResultsWrap = document.getElementById('recall-results-wrap');
  const recallRiskBadge = document.getElementById('recall-risk-badge');
  const recallInsumoTitle = document.getElementById('recall-insumo-title');
  const recallInsumoActive = document.getElementById('recall-insumo-active');
  const recallKpiCosechado = document.getElementById('recall-kpi-cosechado');
  const recallKpiMercado = document.getElementById('recall-kpi-mercado');
  const recallKpiStock = document.getElementById('recall-kpi-stock');
  const recallKpiDestinatarios = document.getElementById('recall-kpi-destinatarios');
  const recallTbodyDestinatarios = document.getElementById('recall-tbody-destinatarios');
  const recallTbodyLotes = document.getElementById('recall-tbody-lotes');
  const recallTbodyCosechas = document.getElementById('recall-tbody-cosechas');
  const recallTbodyDespachos = document.getElementById('recall-tbody-despachos');
  const recallProtocolList = document.getElementById('recall-protocol-list');
  const btnCopiarContactosRecall = document.getElementById('btn-copiar-contactos-recall');

  let ultimoRecallData = null;

  async function cargarInsumosParaRecall() {
    if (!recallSelectInsumo) return;
    try {
      const res = await fetch('/api/v1/insumos');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        recallSelectInsumo.innerHTML = '<option value="">-- Seleccionar insumo registrado --</option>' +
          json.data.map(i => `<option value="${i.id}">${i.nombreComercial} (${i.categoria} - ${i.principioActivo || 'N/A'})</option>`).join('');
      }
    } catch {
      // silencioso si no hay insumos cargados
    }
  }

  if (recallSelectInsumo) {
    recallSelectInsumo.addEventListener('change', () => {
      if (recallSelectInsumo.value) {
        recallInputInsumoId.value = recallSelectInsumo.value;
      }
    });
  }

  if (btnRecallInsumo && modalRecallInsumo) {
    btnRecallInsumo.addEventListener('click', () => {
      openModal(modalRecallInsumo);
      cargarInsumosParaRecall();
    });
  }

  if (formConsultaInversa) {
    formConsultaInversa.addEventListener('submit', async (e) => {
      e.preventDefault();
      const insumoId = (recallInputInsumoId?.value || recallSelectInsumo?.value || '').trim();
      const numeroLote = (recallInputNumeroLote?.value || '').trim();

      if (!insumoId && !numeroLote) {
        showToast('Debe ingresar un ID de Insumo o un Número de Lote de Fabricante.', 'error');
        return;
      }

      if (recallLoading) recallLoading.style.display = 'block';
      if (recallResultsWrap) recallResultsWrap.style.display = 'none';

      try {
        const queryParams = new URLSearchParams();
        if (insumoId) queryParams.set('insumoId', insumoId);
        if (numeroLote) queryParams.set('numeroLote', numeroLote);

        const res = await fetch(`/api/v1/trazabilidad/consulta-inversa?${queryParams.toString()}`);
        const json = await res.json();

        if (!json.success) {
          throw new Error(json.error?.message || 'Error al ejecutar la consulta inversa de recall');
        }

        renderizarResultadosRecall(json.data);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        if (recallLoading) recallLoading.style.display = 'none';
      }
    });
  }

  function renderizarResultadosRecall(data) {
    ultimoRecallData = data;
    if (!recallResultsWrap) return;

    // 1. Nivel de Riesgo
    const riesgo = data.metricas.nivelRiesgoSanitario || 'MODERADO';
    recallRiskBadge.textContent = riesgo;
    recallRiskBadge.className = `risk-badge-pill ${riesgo.toLowerCase()}`;

    // 2. Info Insumo
    recallInsumoTitle.textContent = `${data.insumo.nombreComercial} (${data.insumo.tipoInsumo})`;
    const carenciaInfo = data.insumo.periodoCarenciaDias ? ` | Carencia: ${data.insumo.periodoCarenciaDias} días` : '';
    const senasaInfo = data.insumo.numeroRegistroSenasa ? ` | SENASA: ${data.insumo.numeroRegistroSenasa}` : '';
    recallInsumoActive.textContent = `Principio Activo: ${data.insumo.principioActivo || 'N/A'}${senasaInfo}${carenciaInfo}`;

    // 3. KPIs
    recallKpiCosechado.textContent = `${data.metricas.totalKilosCosechadosAfectados.toLocaleString('es-AR')} kg`;
    recallKpiMercado.textContent = `${data.metricas.totalKilosEnMercadoDespachados.toLocaleString('es-AR')} kg`;
    recallKpiStock.textContent = `${data.metricas.totalKilosEnStockPendientes.toLocaleString('es-AR')} kg`;
    recallKpiDestinatarios.textContent = data.metricas.totalDestinatariosParaNotificar;

    // 4. Clientes y Destinatarios
    if (recallTbodyDestinatarios) {
      if (!data.destinatariosParaNotificar || data.destinatariosParaNotificar.length === 0) {
        recallTbodyDestinatarios.innerHTML = `
          <tr>
            <td colspan="6" class="text-center" style="color: var(--text-dim); padding: 18px;">
              No se detectaron envíos comerciales ni clientes receptores para esta fruta. Todo el stock permanece en finca.
            </td>
          </tr>`;
      } else {
        recallTbodyDestinatarios.innerHTML = data.destinatariosParaNotificar.map(d => `
          <tr>
            <td><strong>${d.nombre}</strong><br><small style="color:var(--text-dim)">CUIT: ${d.cuit || '-'}</small></td>
            <td><span class="status-tag">${d.tipo}</span></td>
            <td>${d.contacto || '-'}<br><a href="tel:${d.telefono || ''}" style="color:var(--accent-blue);font-weight:600;">${d.telefono || '-'}</a></td>
            <td><a href="mailto:${d.email || ''}" style="color:var(--text-muted);">${d.email || '-'}</a></td>
            <td>${d.remitosAfectados.map(r => `<code style="font-size:11px;color:#f87171;">${r}</code>`).join(' ')}</td>
            <td><strong style="color:#f87171;">${d.totalKilosRecibidos.toLocaleString('es-AR')} kg</strong></td>
          </tr>
        `).join('');
      }
    }

    // 5. Lotes Afectados
    if (recallTbodyLotes) {
      recallTbodyLotes.innerHTML = data.lotes.map(l => {
        const origenBadge = l.esDescendienteLinaje 
          ? `<span class="badge-linaje-hijo">Descendiente N:M (Padre: ${l.lotePadreOrigenCodigo || '-'})</span>` 
          : `<span class="status-tag">Lote de Aplicación Directa</span>`;
        return `
          <tr>
            <td><span class="batch-code">${l.codigoLote}</span></td>
            <td>${l.producto} ${l.variedad ? `(${l.variedad})` : ''}</td>
            <td>${l.fincaNombre || '-'}</td>
            <td>${l.superficieHa ? `${l.superficieHa} ha` : '-'}</td>
            <td>${origenBadge}</td>
            <td>${Number(l.cantidadActual).toLocaleString('es-AR')} ${l.unidadMedida}</td>
          </tr>
        `;
      }).join('');
    }

    // 6. Cosechas Afectadas
    if (recallTbodyCosechas) {
      if (!data.cosechas || data.cosechas.length === 0) {
        recallTbodyCosechas.innerHTML = `
          <tr>
            <td colspan="7" class="text-center" style="color: var(--text-dim); padding: 18px;">
              No se han registrado cosechas en los lotes con posterioridad a la aplicación.
            </td>
          </tr>`;
      } else {
        recallTbodyCosechas.innerHTML = data.cosechas.map(c => {
          const carenciaBadge = c.alertaViolacionCarencia
            ? `<span class="badge-carencia-alert">⚠️ VIOLA CARENCIA (${c.diasDesdeAplicacion} días)</span>`
            : `<span class="badge-carencia-ok">Cumplida (${c.diasDesdeAplicacion} días)</span>`;
          return `
            <tr>
              <td><code>${c.codigoTrazabilidad}</code></td>
              <td>${c.codigoLote}</td>
              <td>${c.fechaCosecha.split('T')[0]}</td>
              <td>${c.diasDesdeAplicacion} días</td>
              <td>${carenciaBadge}</td>
              <td><strong>${c.cantidadComercializableKg.toLocaleString('es-AR')} kg</strong></td>
              <td>${c.saldoDisponibleKg.toLocaleString('es-AR')} kg</td>
            </tr>
          `;
        }).join('');
      }
    }

    // 7. Despachos
    if (recallTbodyDespachos) {
      if (!data.despachos || data.despachos.length === 0) {
        recallTbodyDespachos.innerHTML = `
          <tr>
            <td colspan="5" class="text-center" style="color: var(--text-dim); padding: 18px;">
              No se han emitido guías de remito de fruta comprometida.
            </td>
          </tr>`;
      } else {
        recallTbodyDespachos.innerHTML = data.despachos.map(d => `
          <tr>
            <td><code style="color:#f87171;font-weight:600;">${d.nroGuiaRemito}</code></td>
            <td>${d.fecha.split('T')[0]}</td>
            <td>${d.destinatarioNombre}</td>
            <td><strong>${d.cantidadEnviadaKg.toLocaleString('es-AR')} kg</strong></td>
            <td>${d.chofer || '-'} ${d.patenteCamion ? `[${d.patenteCamion}]` : ''}</td>
          </tr>
        `).join('');
      }
    }

    // 8. Protocolo
    if (recallProtocolList) {
      recallProtocolList.innerHTML = (data.protocoloRetiroSugerido || []).map(p => `<li>${p}</li>`).join('');
    }

    recallResultsWrap.style.display = 'flex';
  }

  if (btnCopiarContactosRecall) {
    btnCopiarContactosRecall.addEventListener('click', () => {
      if (!ultimoRecallData || !ultimoRecallData.destinatariosParaNotificar || ultimoRecallData.destinatariosParaNotificar.length === 0) {
        showToast('No hay destinatarios en el informe de recall actual.', 'error');
        return;
      }
      const lineas = ultimoRecallData.destinatariosParaNotificar.map(d => 
        `• ${d.nombre} | Contacto: ${d.contacto || 'N/A'} | Tel: ${d.telefono || 'N/A'} | Email: ${d.email || 'N/A'} | Remitos: ${d.remitosAfectados.join(', ')} | Kilos: ${d.totalKilosRecibidos} kg`
      );
      const texto = `ALERTA DE RECALL SANITARIO AGRUL\nInsumo: ${ultimoRecallData.insumo.nombreComercial}\n\nDestinatarios para Notificación Inmediata:\n${lineas.join('\n')}`;
      navigator.clipboard.writeText(texto)
        .then(() => showToast('Lista de contactos copiada al portapapeles'))
        .catch(() => showToast('No se pudo copiar al portapapeles', 'error'));
    });
  }

  // ==========================================================================
  // Módulo 7: Indicadores de Producción, Rendimiento y Descarte (AGRUL-035)
  // ==========================================================================
  const btnIndicadoresProduccion = document.getElementById('btn-indicadores-produccion');
  const modalIndicadoresProduccion = document.getElementById('modal-indicadores-produccion');
  const indFiltroFinca = document.getElementById('ind-filtro-finca');
  const indFiltroCultivo = document.getElementById('ind-filtro-cultivo');
  const indFiltroVariedad = document.getElementById('ind-filtro-variedad');
  const indFiltroEstado = document.getElementById('ind-filtro-estado');
  const indFiltroDesde = document.getElementById('ind-filtro-desde');
  const indFiltroHasta = document.getElementById('ind-filtro-hasta');
  const btnIndAplicarFiltros = document.getElementById('btn-ind-aplicar-filtros');
  const btnIndLimpiarFiltros = document.getElementById('btn-ind-limpiar-filtros');

  const indKpiRendBruto = document.getElementById('ind-kpi-rend-bruto');
  const indKpiRendNeto = document.getElementById('ind-kpi-rend-neto');
  const indKpiDescarte = document.getElementById('ind-kpi-descarte');
  const indKpiPrendimiento = document.getElementById('ind-kpi-prendimiento');

  const indTotCosechado = document.getElementById('ind-tot-cosechado');
  const indTotComercial = document.getElementById('ind-tot-comercial');
  const indTotDescarte = document.getElementById('ind-tot-descarte');
  const indTotSuperficie = document.getElementById('ind-tot-superficie');
  const indTotCiclos = document.getElementById('ind-tot-ciclos');

  const indTbodyCiclos = document.getElementById('ind-tbody-ciclos');
  const indTbodyLotes = document.getElementById('ind-tbody-lotes');
  const indTbodyCultivos = document.getElementById('ind-tbody-cultivos');

  async function poblarFiltroFincasIndicadores() {
    if (!indFiltroFinca) return;
    try {
      const res = await fetch('/api/v1/fincas');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        indFiltroFinca.innerHTML = '<option value="">Todas las fincas</option>' +
          json.data.map(f => `<option value="${f.id}">${f.nombre}</option>`).join('');
      }
    } catch {
      // Ignorar si fincas no está activo
    }
  }

  async function cargarIndicadoresProduccion() {
    if (!modalIndicadoresProduccion) return;

    const params = new URLSearchParams();
    if (indFiltroFinca && indFiltroFinca.value) params.set('fincaId', indFiltroFinca.value);
    if (indFiltroCultivo && indFiltroCultivo.value.trim()) params.set('cultivo', indFiltroCultivo.value.trim());
    if (indFiltroVariedad && indFiltroVariedad.value.trim()) params.set('variedad', indFiltroVariedad.value.trim());
    if (indFiltroEstado && indFiltroEstado.value) params.set('estadoCiclo', indFiltroEstado.value);
    if (indFiltroDesde && indFiltroDesde.value) params.set('desde', indFiltroDesde.value);
    if (indFiltroHasta && indFiltroHasta.value) params.set('hasta', indFiltroHasta.value);

    try {
      showToast('Calculando rendimientos y métricas...', 'info');
      const res = await fetch(`/api/v1/indicadores/produccion?${params.toString()}`);
      const json = await res.json();

      if (!json.success || !json.data) {
        throw new Error(json.error?.message || 'Error al obtener indicadores de producción');
      }

      renderizarIndicadoresProduccion(json.data);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function renderizarIndicadoresProduccion(data) {
    const { resumenGlobal, desglosePorCiclo, desglosePorLote, desglosePorCultivo } = data;

    // 1. KPIs
    if (indKpiRendBruto) {
      indKpiRendBruto.textContent = `${resumenGlobal.rendimientoPromedioKgHa.toLocaleString('es-AR')} kg/ha`;
    }
    if (indKpiRendNeto) {
      indKpiRendNeto.textContent = `${resumenGlobal.rendimientoComercializableKgHa.toLocaleString('es-AR')} kg/ha`;
    }
    if (indKpiDescarte) {
      indKpiDescarte.textContent = `${resumenGlobal.porcentajeDescarteGlobal.toFixed(2)} %`;
    }
    if (indKpiPrendimiento) {
      indKpiPrendimiento.textContent = resumenGlobal.tasaPrendimientoPromedioPorcentaje !== null
        ? `${resumenGlobal.tasaPrendimientoPromedioPorcentaje.toFixed(1)} %`
        : 'N/D';
    }

    // 2. Totales Strip
    if (indTotCosechado) indTotCosechado.textContent = `${resumenGlobal.totalKilosCosechados.toLocaleString('es-AR')} kg`;
    if (indTotComercial) indTotComercial.textContent = `${resumenGlobal.totalKilosComercializables.toLocaleString('es-AR')} kg`;
    if (indTotDescarte) indTotDescarte.textContent = `${resumenGlobal.totalKilosDescarte.toLocaleString('es-AR')} kg`;
    if (indTotSuperficie) indTotSuperficie.textContent = `${resumenGlobal.superficieTotalHa.toFixed(2)} ha`;
    if (indTotCiclos) indTotCiclos.textContent = `${resumenGlobal.totalCiclos} / ${resumenGlobal.totalCosechas}`;

    // 3. Tab Ciclos
    if (indTbodyCiclos) {
      if (!desglosePorCiclo || desglosePorCiclo.length === 0) {
        indTbodyCiclos.innerHTML = `<tr><td colspan="11" class="text-center" style="padding: 24px; color: var(--text-dim);">No se encontraron ciclos productivos para los filtros seleccionados.</td></tr>`;
      } else {
        indTbodyCiclos.innerHTML = desglosePorCiclo.map(c => {
          let badgeDescarte = 'badge-descarte-ok';
          if (c.porcentajeDescarte > 15) badgeDescarte = 'badge-descarte-critico';
          else if (c.porcentajeDescarte > 5) badgeDescarte = 'badge-descarte-alerta';

          const prendTexto = c.prendimientoPlantas?.tasaPrendimientoPorcentaje !== null
            ? `<span class="badge-prendimiento">${c.prendimientoPlantas.tasaPrendimientoPorcentaje}% (${c.prendimientoPlantas.plantasVivas || 0}/${c.prendimientoPlantas.plantasPlantadas || 0})</span>`
            : '<span style="color: var(--text-dim); font-size: 11px;">N/D</span>';

          const laboresTexto = c.labores
            ? `${c.labores.conteoPorEstado['REALIZADA'] || 0} / ${c.labores.conteoPorEstado['PLANIFICADA'] || 0} (${c.labores.totalLabores || 0})`
            : '-';

          return `
            <tr>
              <td><code>${c.codigoCiclo}</code></td>
              <td>${c.codigoLote}</td>
              <td>${c.cultivo} ${c.variedad ? `(${c.variedad})` : ''}</td>
              <td>${c.superficieCultivadaHa.toFixed(2)} ha</td>
              <td><strong>${c.totalKilosCosechados.toLocaleString('es-AR')} kg</strong></td>
              <td>${c.totalKilosComercializables.toLocaleString('es-AR')} kg</td>
              <td><span class="${badgeDescarte}">${c.porcentajeDescarte}%</span></td>
              <td><strong>${c.rendimientoBrutoKgHa.toLocaleString('es-AR')} kg/ha</strong></td>
              <td style="color: var(--accent-emerald);"><strong>${c.rendimientoComercializableKgHa.toLocaleString('es-AR')} kg/ha</strong></td>
              <td>${prendTexto}</td>
              <td style="font-size: 11px;">${laboresTexto}</td>
            </tr>
          `;
        }).join('');
      }
    }

    // 4. Tab Lotes
    if (indTbodyLotes) {
      if (!desglosePorLote || desglosePorLote.length === 0) {
        indTbodyLotes.innerHTML = `<tr><td colspan="10" class="text-center" style="padding: 24px; color: var(--text-dim);">No se encontraron lotes para los filtros seleccionados.</td></tr>`;
      } else {
        indTbodyLotes.innerHTML = desglosePorLote.map(l => {
          let badgeDescarte = 'badge-descarte-ok';
          if (l.porcentajeDescarte > 15) badgeDescarte = 'badge-descarte-critico';
          else if (l.porcentajeDescarte > 5) badgeDescarte = 'badge-descarte-alerta';

          return `
            <tr>
              <td><code>${l.codigoLote}</code></td>
              <td>${l.fincaNombre || l.fincaId || '-'}</td>
              <td>${l.producto} ${l.variedad ? `(${l.variedad})` : ''}</td>
              <td>${l.superficieHa ? l.superficieHa.toFixed(2) + ' ha' : '-'}</td>
              <td>${l.totalCiclos}</td>
              <td><strong>${l.totalKilosCosechados.toLocaleString('es-AR')} kg</strong></td>
              <td>${l.totalKilosComercializables.toLocaleString('es-AR')} kg</td>
              <td><span class="${badgeDescarte}">${l.porcentajeDescarte}%</span></td>
              <td><strong>${l.rendimientoBrutoKgHa.toLocaleString('es-AR')} kg/ha</strong></td>
              <td style="color: var(--accent-emerald);"><strong>${l.rendimientoComercializableKgHa.toLocaleString('es-AR')} kg/ha</strong></td>
            </tr>
          `;
        }).join('');
      }
    }

    // 5. Tab Cultivos
    if (indTbodyCultivos) {
      if (!desglosePorCultivo || desglosePorCultivo.length === 0) {
        indTbodyCultivos.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 24px; color: var(--text-dim);">No se encontraron cultivos registrados.</td></tr>`;
      } else {
        indTbodyCultivos.innerHTML = desglosePorCultivo.map(cu => `
          <tr>
            <td><strong>${cu.cultivo}</strong></td>
            <td>${cu.superficieTotalHa.toFixed(2)} ha</td>
            <td>${cu.totalLotes} / ${cu.totalCiclos}</td>
            <td><strong>${cu.totalKilosCosechados.toLocaleString('es-AR')} kg</strong></td>
            <td>${cu.totalKilosComercializables.toLocaleString('es-AR')} kg</td>
            <td><span class="badge-descarte-ok">${cu.porcentajeDescarte}%</span></td>
            <td><strong>${cu.rendimientoPromedioKgHa.toLocaleString('es-AR')} kg/ha</strong></td>
            <td style="color: var(--accent-emerald);"><strong>${cu.rendimientoComercializableKgHa.toLocaleString('es-AR')} kg/ha</strong></td>
          </tr>
        `).join('');
      }
    }
  }

  // Bindings botones indicadores
  if (btnIndicadoresProduccion) {
    btnIndicadoresProduccion.addEventListener('click', () => {
      openModal(modalIndicadoresProduccion);
      poblarFiltroFincasIndicadores();
      cargarIndicadoresProduccion();
    });
  }

  if (btnIndAplicarFiltros) {
    btnIndAplicarFiltros.addEventListener('click', () => {
      cargarIndicadoresProduccion();
    });
  }

  if (btnIndLimpiarFiltros) {
    btnIndLimpiarFiltros.addEventListener('click', () => {
      if (indFiltroFinca) indFiltroFinca.value = '';
      if (indFiltroCultivo) indFiltroCultivo.value = '';
      if (indFiltroVariedad) indFiltroVariedad.value = '';
      if (indFiltroEstado) indFiltroEstado.value = '';
      if (indFiltroDesde) indFiltroDesde.value = '';
      if (indFiltroHasta) indFiltroHasta.value = '';
      cargarIndicadoresProduccion();
    });
  }

  // Navegación entre pestañas de indicadores
  const indTabBtns = document.querySelectorAll('.ind-tab-btn');
  indTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-ind-tab');
      indTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.ind-tab-content').forEach(content => {
        if (content.id === targetId) {
          content.style.display = 'block';
          content.classList.add('active');
        } else {
          content.style.display = 'none';
          content.classList.remove('active');
        }
      });
    });
  });

  // Carga inicial
  cargarLotes();
  cargarFincas();
});
