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

  // Renderizar Tabla con Filtros
  function renderizarTabla() {
    let filtrados = allLotes;

    if (currentFilter !== 'TODOS') {
      filtrados = filtrados.filter(l => l.estadoActual === currentFilter);
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
            No se encontraron lotes para el filtro seleccionado.
          </td>
        </tr>`;
      return;
    }

    lotesTbody.innerHTML = filtrados.map(l => {
      const estadoClase = (l.estadoActual || 'CREADO').toLowerCase();
      const fecha = l.creadoEn ? new Date(l.creadoEn).toLocaleDateString('es-AR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : '-';

      return `
        <tr>
          <td>
            <span class="batch-code">${l.codigoLote}</span>
          </td>
          <td>
            <div class="product-title">${l.producto}</div>
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

  // Búsqueda en tiempo real
  inputBusqueda.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderizarTabla();
  });

  btnRecargar.addEventListener('click', cargarLotes);

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

    const payload = { producto, variedad, cantidadInicial, unidadMedida };
    if (codigoLote) payload.codigoLote = codigoLote;

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
  async function abrirModalHistorial(loteId, codigoLote) {
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

  // Carga inicial
  cargarLotes();
});
