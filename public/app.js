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

  // Carga inicial
  cargarLotes();
});
