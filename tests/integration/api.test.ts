import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryFincasRepository } from '../mocks/in-memory-fincas.repository.js';

describe('API Integration Tests (Fastify HTTP Surface)', () => {
  let app: FastifyInstance;
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let fincasRepo: InMemoryFincasRepository;

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();
    fincasRepo = new InMemoryFincasRepository();

    app = buildApp({
      lotesRepo,
      eventosRepo,
      genealogiaRepo,
      fincasRepo,
      logger: false,
    });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/health debe responder 200 con formato envelope estándar', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('healthy');
    expect(body.timestamp).toBeDefined();
  });

  it('POST /api/v1/lotes debe crear un lote y responder 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-00100',
        producto: 'Cereza Lapins',
        variedad: 'Export',
        cantidadInicial: 4500,
        unidadMedida: 'KG',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.codigoLote).toBe('LOT-2026-00100');
    expect(body.data.estadoActual).toBe('CREADO');
  });

  it('POST /api/v1/lotes con payload malformado debe responder 400 Bad Request con detalles de campo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        producto: '', // Demasiado corto
        cantidadInicial: -10, // Debe ser positiva
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/lotes/:id inexistente debe responder 404 Not Found', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/lotes/00000000-0000-0000-0000-000000000000',
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ENTITY_NOT_FOUND');
  });

  it('POST /api/v1/lotes/:id/eventos debe registrar un evento y hacer avanzar el estado del lote', async () => {
    // 1. Crear lote primero
    const loteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-00200',
        producto: 'Arándano Emerald',
        cantidadInicial: 2000,
        unidadMedida: 'KG',
      },
    });
    const loteCreado = JSON.parse(loteRes.body).data;

    // 2. Registrar evento de PROCESO
    const eventoRes = await app.inject({
      method: 'POST',
      url: `/api/v1/lotes/${loteCreado.id}/eventos`,
      payload: {
        actorId: '11111111-1111-1111-1111-111111111111',
        ubicacionId: '22222222-2222-2222-2222-222222222222',
        tipoEvento: 'PROCESO',
        payloadEspecifico: { linea: 1, calibradoMm: 18 },
      },
    });

    expect(eventoRes.statusCode).toBe(201);
    const evBody = JSON.parse(eventoRes.body);
    expect(evBody.success).toBe(true);
    expect(evBody.data.tipoEvento).toBe('PROCESO');

    // 3. Consultar lote y verificar que su estado avanzó a EN_PROCESO
    const loteActualizadoRes = await app.inject({
      method: 'GET',
      url: `/api/v1/lotes/${loteCreado.id}`,
    });
    const loteActualizado = JSON.parse(loteActualizadoRes.body).data;
    expect(loteActualizado.estadoActual).toBe('EN_PROCESO');
  });

  it('POST /api/v1/eventos/sincronizar debe aceptar un batch offline y devolver resumen', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/eventos/sincronizar',
      payload: {
        dispositivoId: 'HANDHELD-ZEBRA-04',
        eventos: [
          {
            idLocalTemporal: 'temp-01',
            loteId: '11111111-1111-1111-1111-111111111111',
            actorId: '22222222-2222-2222-2222-222222222222',
            ubicacionId: '33333333-3333-3333-3333-333333333333',
            tipoEvento: 'COSECHA',
            timestampCapturaLocal: '2026-10-03T17:30:00.000Z',
            payloadEspecifico: { bins: 12 },
          },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.dispositivoId).toBe('HANDHELD-ZEBRA-04');
    expect(body.data.insertados).toBe(1);
    expect(body.data.fallidos).toHaveLength(0);
  });

  it('POST /api/v1/lotes/:id/split debe fraccionar un lote y responder 201 Created con el envelope estándar', async () => {
    // 1. Crear lote inicial
    const loteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-00300',
        producto: 'Uva Red Globe',
        cantidadInicial: 6000,
        unidadMedida: 'KG',
      },
    });
    const lotePadre = JSON.parse(loteRes.body).data;

    // 2. Ejecutar split
    const splitRes = await app.inject({
      method: 'POST',
      url: `/api/v1/lotes/${lotePadre.id}/split`,
      payload: {
        actorId: '11111111-1111-1111-1111-111111111111',
        ubicacionId: '22222222-2222-2222-2222-222222222222',
        motivo: 'Clasificación para empaque exportación',
        hijos: [
          { cantidad: 2500, variedad: 'Primera' },
          { cantidad: 3500, variedad: 'Segunda' },
        ],
      },
    });

    expect(splitRes.statusCode).toBe(201);
    const splitBody = JSON.parse(splitRes.body);
    expect(splitBody.success).toBe(true);
    expect(splitBody.data.lotePadre.cantidadActual).toBe(0);
    expect(splitBody.data.lotePadre.estadoActual).toBe('EN_PROCESO');
    expect(splitBody.data.lotesHijos).toHaveLength(2);
    expect(splitBody.data.aristasGenealogia).toHaveLength(2);
    expect(splitBody.data.eventoSplit.tipoEvento).toBe('DIVISION_SPLIT');
  });

  it('POST /api/v1/lotes/:id/split debe responder 422 Unprocessable si la suma de hijos excede la cantidad del padre', async () => {
    const loteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-00301',
        producto: 'Pera Williams',
        cantidadInicial: 1000,
        unidadMedida: 'KG',
      },
    });
    const lotePadre = JSON.parse(loteRes.body).data;

    const splitRes = await app.inject({
      method: 'POST',
      url: `/api/v1/lotes/${lotePadre.id}/split`,
      payload: {
        actorId: '11111111-1111-1111-1111-111111111111',
        ubicacionId: '22222222-2222-2222-2222-222222222222',
        hijos: [
          { cantidad: 800 },
          { cantidad: 500 }, // Total: 1300 > 1000
        ],
      },
    });

    expect(splitRes.statusCode).toBe(422);
    const body = JSON.parse(splitRes.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CANTIDAD_INSUFICIENTE');
  });

  it('GET /api/v1/lotes debe listar todos los lotes y soportar filtro por estado', async () => {
    // Crear lote 1 en estado CREADO
    await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-00401',
        producto: 'Frutilla San Andreas',
        cantidadInicial: 2000,
        unidadMedida: 'KG',
      },
    });

    // Listar todos
    const resTodos = await app.inject({
      method: 'GET',
      url: '/api/v1/lotes',
    });
    expect(resTodos.statusCode).toBe(200);
    const bodyTodos = JSON.parse(resTodos.body);
    expect(bodyTodos.success).toBe(true);
    expect(Array.isArray(bodyTodos.data)).toBe(true);
    expect(bodyTodos.data.length).toBeGreaterThanOrEqual(1);

    // Listar filtrado por CREADO
    const resCreados = await app.inject({
      method: 'GET',
      url: '/api/v1/lotes?estado=CREADO',
    });
    expect(resCreados.statusCode).toBe(200);
    const bodyCreados = JSON.parse(resCreados.body);
    expect(bodyCreados.data.every((l: { estadoActual: string }) => l.estadoActual === 'CREADO')).toBe(true);

    // Listar filtrado por estado inexistente
    const resVacio = await app.inject({
      method: 'GET',
      url: '/api/v1/lotes?estado=CERRADO',
    });
    expect(resVacio.statusCode).toBe(200);
    const bodyVacio = JSON.parse(resVacio.body);
    expect(bodyVacio.data.length).toBe(0);
  });

  it('GET / y GET /dashboard deben servir la interfaz del Dashboard Web de Lotes', async () => {
    const resRoot = await app.inject({
      method: 'GET',
      url: '/',
    });
    expect(resRoot.statusCode).toBe(200);
    expect(resRoot.headers['content-type']).toContain('text/html');
    expect(resRoot.body).toContain('Agrul');
    expect(resRoot.body).toContain('Dashboard Operativo de Trazabilidad');

    const resDashboard = await app.inject({
      method: 'GET',
      url: '/dashboard',
    });
    expect(resDashboard.statusCode).toBe(200);
    expect(resDashboard.headers['content-type']).toContain('text/html');
  });

  it('POST /api/v1/lotes/merge debe fusionar múltiples lotes padres en un nuevo lote y reflejar el linaje N:M', async () => {
    // 1. Crear dos lotes padres
    const p1Res = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-M01',
        producto: 'Uva Bonarda',
        cantidadInicial: 4000,
        unidadMedida: 'KG',
      },
    });
    const padre1 = JSON.parse(p1Res.body).data;

    const p2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-M02',
        producto: 'Uva Syrah',
        cantidadInicial: 2500,
        unidadMedida: 'KG',
      },
    });
    const padre2 = JSON.parse(p2Res.body).data;

    // 2. Ejecutar fusión (Merge N:1)
    const mergeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes/merge',
      payload: {
        padres: [
          { loteId: padre1.id, cantidad: 2000 },
          { loteId: padre2.id, cantidad: 2500 },
        ],
        nuevoLote: {
          codigoLote: 'LOT-2026-CORTE01',
          producto: 'Vino Tinto Bonarda-Syrah',
          unidadMedida: 'KG',
        },
        actorId: '11111111-1111-1111-1111-111111111111',
        ubicacionId: '22222222-2222-2222-2222-222222222222',
        motivo: 'Mezcla en pileta subterránea 12',
      },
    });

    expect(mergeRes.statusCode).toBe(201);
    const mergeBody = JSON.parse(mergeRes.body);
    expect(mergeBody.success).toBe(true);
    expect(mergeBody.data.loteHijo.codigoLote).toBe('LOT-2026-CORTE01');
    expect(mergeBody.data.loteHijo.cantidadActual).toBe(4500); // 2000 + 2500
    expect(mergeBody.data.aristasGenealogia).toHaveLength(2);
    expect(mergeBody.data.eventosOrigen).toHaveLength(2);
    expect(mergeBody.data.eventoRecepcion.tipoEvento).toBe('FUSION_RECEPCION');

    // 3. Consultar linaje del lote hijo resultante
    const linajeRes = await app.inject({
      method: 'GET',
      url: `/api/v1/lotes/${mergeBody.data.loteHijo.id}/linaje`,
    });
    expect(linajeRes.statusCode).toBe(200);
    const linajeBody = JSON.parse(linajeRes.body);
    expect(linajeBody.success).toBe(true);
    expect(linajeBody.data.ancestros).toHaveLength(2);

    const idsAncestros = linajeBody.data.ancestros.map((a: { loteId: string }) => a.loteId);
    expect(idsAncestros).toContain(padre1.id);
    expect(idsAncestros).toContain(padre2.id);
  });

  it('POST /api/v1/lotes/merge debe responder 422 si algún lote padre no tiene stock suficiente', async () => {
    const p1Res = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-M03',
        producto: 'Cereza Lapins',
        cantidadInicial: 500,
        unidadMedida: 'KG',
      },
    });
    const padre1 = JSON.parse(p1Res.body).data;

    const p2Res = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-M04',
        producto: 'Cereza Sweetheart',
        cantidadInicial: 1000,
        unidadMedida: 'KG',
      },
    });
    const padre2 = JSON.parse(p2Res.body).data;

    const mergeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes/merge',
      payload: {
        padres: [
          { loteId: padre1.id, cantidad: 600 }, // Supera el stock de 500
          { loteId: padre2.id, cantidad: 500 },
        ],
        nuevoLote: {
          producto: 'Cereza Mix Descarte',
          unidadMedida: 'KG',
        },
        actorId: '11111111-1111-1111-1111-111111111111',
        ubicacionId: '22222222-2222-2222-2222-222222222222',
      },
    });

    expect(mergeRes.statusCode).toBe(422);
    const mergeBody = JSON.parse(mergeRes.body);
    expect(mergeBody.success).toBe(false);
    expect(mergeBody.error.code).toBe('CANTIDAD_INSUFICIENTE');
  });

  it('POST /api/v1/lotes/merge debe responder 400 Bad Request si se envían menos de 2 lotes padres', async () => {
    const mergeRes = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes/merge',
      payload: {
        padres: [
          { loteId: '11111111-1111-1111-1111-111111111111', cantidad: 500 },
        ],
        nuevoLote: {
          producto: 'Mix',
          unidadMedida: 'KG',
        },
        actorId: '11111111-1111-1111-1111-111111111111',
        ubicacionId: '22222222-2222-2222-2222-222222222222',
      },
    });

    expect(mergeRes.statusCode).toBe(400);
    const mergeBody = JSON.parse(mergeRes.body);
    expect(mergeBody.success).toBe(false);
    expect(mergeBody.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET / debe servir la SPA incluyendo el Visualizador Gráfico de Linaje y Simulador de Recall (AGRUL-012)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('id="modal-linaje"');
    expect(res.body).toContain('id="lineage-svg"');
    expect(res.body).toContain('id="btn-toggle-recall"');
    expect(res.body).toContain('id="recall-alert-banner"');
    expect(res.body).toContain('id="node-inspector"');
  });

  it('GET /app.js y /app.css deben servirse correctamente para soportar la visualización del grafo', async () => {
    const resJs = await app.inject({
      method: 'GET',
      url: '/app.js',
    });
    expect(resJs.statusCode).toBe(200);
    expect(resJs.headers['content-type']).toContain('application/javascript');
    expect(resJs.body).toContain('renderizarGrafoLinaje');

    const resCss = await app.inject({
      method: 'GET',
      url: '/app.css',
    });
    expect(resCss.statusCode).toBe(200);
    expect(resCss.headers['content-type']).toContain('text/css');
    expect(resCss.body).toContain('.graph-node.is-recalled');
  });

  it('GET /api/v1/lotes/:id/qr debe generar código QR en formato dataUrl y SVG con trackingUrl (AGRUL-013)', async () => {
    // 1. Crear lote
    const loteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-QR001',
        producto: 'Arándano Duke',
        variedad: 'Export',
        cantidadInicial: 1200,
        unidadMedida: 'KG',
      },
    });
    const lote = JSON.parse(loteRes.body).data;

    // 2. Consultar QR
    const qrRes = await app.inject({
      method: 'GET',
      url: `/api/v1/lotes/${lote.id}/qr`,
    });

    expect(qrRes.statusCode).toBe(200);
    const body = JSON.parse(qrRes.body);
    expect(body.success).toBe(true);
    expect(body.data.codigoLote).toBe('LOT-2026-QR001');
    expect(body.data.qrDataUrl).toContain('data:image/png;base64');
    expect(body.data.qrSvg).toContain('<svg');
    expect(body.data.trackingUrl).toContain('https://agrul.app/lotes/LOT-2026-QR001');
  });

  it('GET /api/v1/lotes/:id/qr/image debe devolver el archivo vectorial SVG con cabeceras de imagen', async () => {
    const loteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-QR002',
        producto: 'Limón Eureka',
        cantidadInicial: 5000,
        unidadMedida: 'KG',
      },
    });
    const lote = JSON.parse(loteRes.body).data;

    const imgRes = await app.inject({
      method: 'GET',
      url: `/api/v1/lotes/${lote.id}/qr/image`,
    });

    expect(imgRes.statusCode).toBe(200);
    expect(imgRes.headers['content-type']).toContain('image/svg+xml');
    expect(imgRes.headers['content-disposition']).toContain('filename="qr-LOT-2026-QR002.svg"');
    expect(imgRes.body).toContain('<svg');
  });

  it('GET / debe incluir los componentes para Rótulos QR y Escáner de Campo (AGRUL-013)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('id="btn-abrir-escaner"');
    expect(res.body).toContain('id="modal-qr-label"');
    expect(res.body).toContain('id="modal-qr-scanner"');
    expect(res.body).toContain('id="printable-pallet-label"');
    expect(res.body).toContain('id="scanner-video"');
  });

  // ==========================================================================
  // AGRUL-016: Búsqueda Filtrada, Polígonos Geográficos y Ficha Imprimible
  // ==========================================================================

  it('POST /api/v1/fincas debe registrar una finca con GeoJSON Point y responder 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/fincas',
      payload: {
        nombre: 'Finca La Florida',
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: 120.5,
        renspa: '23.001.0.00123/00',
        geometria: {
          type: 'Point',
          coordinates: [-65.3444, -26.9211],
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    expect(body.data.nombre).toBe('Finca La Florida');
    expect(body.data.geometria.type).toBe('Point');
    expect(body.data.geometria.coordinates).toEqual([-65.3444, -26.9211]);
  });

  it('POST /api/v1/fincas debe registrar una finca con GeoJSON Polygon cerrado y responder 201 Created', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/fincas',
      payload: {
        nombre: 'Finca San José',
        localidad: 'Famaillá',
        departamento: 'Famaillá',
        provincia: 'Tucumán',
        superficieTotalHa: 85,
        geometria: {
          type: 'Polygon',
          coordinates: [
            [
              [-65.40, -27.05],
              [-65.38, -27.05],
              [-65.38, -27.03],
              [-65.40, -27.03],
              [-65.40, -27.05], // Polígono cerrado
            ],
          ],
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.data.geometria.type).toBe('Polygon');
    expect(body.data.geometria.coordinates[0].length).toBe(5);
  });

  it('POST /api/v1/fincas debe rechazar finca con datos inválidos con 400 Bad Request', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/fincas',
      payload: {
        nombre: '', // Nombre vacío
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: -10, // Superficie negativa
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  it('GET /api/v1/fincas debe listar fincas y permitir filtrado por provincia o nombre', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/v1/fincas',
      payload: {
        nombre: 'Finca Salta Norte',
        localidad: 'Cafayate',
        departamento: 'Cafayate',
        provincia: 'Salta',
        superficieTotalHa: 50,
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/fincas',
      payload: {
        nombre: 'Finca Tucumán Sur',
        localidad: 'Concepción',
        departamento: 'Chicligasta',
        provincia: 'Tucumán',
        superficieTotalHa: 75,
      },
    });

    // Filtro por provincia
    const resSalta = await app.inject({
      method: 'GET',
      url: '/api/v1/fincas?provincia=Salta',
    });
    expect(resSalta.statusCode).toBe(200);
    const dataSalta = JSON.parse(resSalta.body).data;
    expect(dataSalta.length).toBe(1);
    expect(dataSalta[0].nombre).toBe('Finca Salta Norte');

    // Filtro por nombre parcial
    const resTuc = await app.inject({
      method: 'GET',
      url: '/api/v1/fincas?nombre=Tucumán',
    });
    expect(resTuc.statusCode).toBe(200);
    const dataTuc = JSON.parse(resTuc.body).data;
    expect(dataTuc.length).toBe(1);
    expect(dataTuc[0].nombre).toBe('Finca Tucumán Sur');
  });

  it('POST /api/v1/lotes debe registrar lote con fincaId, superficie en ha y GeoJSON', async () => {
    // 1. Crear Finca previa
    const fincaRes = await app.inject({
      method: 'POST',
      url: '/api/v1/fincas',
      payload: {
        nombre: 'Finca Don Pedro',
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: 200,
      },
    });
    const finca = JSON.parse(fincaRes.body).data;

    // 2. Crear Lote vinculado a la Finca con Polígono GeoJSON
    const loteRes = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-GEO001',
        producto: 'Frutilla San Andreas',
        variedad: 'Día Neutro',
        cantidadInicial: 8000,
        unidadMedida: 'KG',
        fincaId: finca.id,
        superficieHa: 4.5,
        geometria: {
          type: 'Polygon',
          coordinates: [
            [
              [-65.3400, -26.9200],
              [-65.3380, -26.9200],
              [-65.3380, -26.9180],
              [-65.3400, -26.9180],
              [-65.3400, -26.9200],
            ],
          ],
        },
      },
    });

    expect(loteRes.statusCode).toBe(201);
    const lote = JSON.parse(loteRes.body).data;
    expect(lote.fincaId).toBe(finca.id);
    expect(lote.superficieHa).toBe(4.5);
    expect(lote.geometria.type).toBe('Polygon');
  });

  it('POST /api/v1/lotes debe rechazar geometría GeoJSON inválida (polígono no cerrado)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-ERRGEO',
        producto: 'Frutilla',
        cantidadInicial: 1000,
        unidadMedida: 'KG',
        geometria: {
          type: 'Polygon',
          coordinates: [
            [
              [-65.34, -26.92],
              [-65.33, -26.92],
              [-65.33, -26.91],
              // Falta cerrar con el primer vértice
            ],
          ],
        },
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
  });

  it('GET /api/v1/lotes debe ejecutar búsqueda filtrada combinada (estado, finca, superficie, producto)', async () => {
    const t0 = performance.now();

    // Crear Finca A y B
    const fincaARes = await app.inject({
      method: 'POST',
      url: '/api/v1/fincas',
      payload: {
        nombre: 'Finca Alfa',
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: 100,
      },
    });
    const fincaAId = JSON.parse(fincaARes.body).data.id;

    const fincaBRes = await app.inject({
      method: 'POST',
      url: '/api/v1/fincas',
      payload: {
        nombre: 'Finca Beta',
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: 100,
      },
    });
    const fincaBId = JSON.parse(fincaBRes.body).data.id;

    // Crear 3 lotes con distintas combinaciones
    await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-FLT01',
        producto: 'Arándano Emerald',
        cantidadInicial: 2000,
        unidadMedida: 'KG',
        fincaId: fincaAId,
        superficieHa: 2.5,
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-FLT02',
        producto: 'Arándano Jewel',
        cantidadInicial: 5000,
        unidadMedida: 'KG',
        fincaId: fincaAId,
        superficieHa: 8.0,
      },
    });

    await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-FLT03',
        producto: 'Frutilla',
        cantidadInicial: 3000,
        unidadMedida: 'KG',
        fincaId: fincaBId,
        superficieHa: 2.0,
      },
    });

    // Filtrar por Finca A y rango de superficie [1 ha, 5 ha]
    const resFiltrado = await app.inject({
      method: 'GET',
      url: `/api/v1/lotes?fincaId=${fincaAId}&superficieMinHa=1&superficieMaxHa=5&producto=Arándano`,
    });

    const elapsedMs = performance.now() - t0;

    expect(resFiltrado.statusCode).toBe(200);
    expect(elapsedMs).toBeLessThan(2000); // RNF-03: tiempo de respuesta < 2s

    const lotesResult = JSON.parse(resFiltrado.body).data;
    expect(lotesResult.length).toBe(1);
    expect(lotesResult[0].codigoLote).toBe('LOT-2026-FLT01');
    expect(lotesResult[0].superficieHa).toBe(2.5);
  });

  it('GET /api/v1/lotes/:id/ficha-imprimible debe retornar JSON completo para cartel de cabecera (RF-M1-11)', async () => {
    // 1. Crear Finca
    const fRes = await app.inject({
      method: 'POST',
      url: '/api/v1/fincas',
      payload: {
        nombre: 'Establecimiento El Trébol',
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: 150,
        renspa: '23.001.0.09999/01',
      },
    });
    const finca = JSON.parse(fRes.body).data;

    // 2. Crear Lote con Punto GPS
    const lRes = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-CAB01',
        producto: 'Frutilla Fronteras',
        variedad: 'Día Corto',
        cantidadInicial: 6000,
        unidadMedida: 'KG',
        fincaId: finca.id,
        superficieHa: 3.2,
        geometria: {
          type: 'Point',
          coordinates: [-65.34123, -26.92456],
        },
      },
    });
    const lote = JSON.parse(lRes.body).data;

    // 3. Obtener Ficha Imprimible
    const fichaRes = await app.inject({
      method: 'GET',
      url: `/api/v1/lotes/${lote.id}/ficha-imprimible`,
    });

    expect(fichaRes.statusCode).toBe(200);
    const body = JSON.parse(fichaRes.body);
    expect(body.success).toBe(true);

    const ficha = body.data;
    expect(ficha.codigoLote).toBe('LOT-2026-CAB01');
    expect(ficha.producto).toBe('Frutilla Fronteras');
    expect(ficha.variedad).toBe('Día Corto');
    expect(ficha.superficieHa).toBe(3.2);
    expect(ficha.finca.nombre).toBe('Establecimiento El Trébol');
    expect(ficha.finca.renspa).toBe('23.001.0.09999/01');
    expect(ficha.coordenadasFormateadas).toContain('GPS: Lat -26.92456, Lng -65.34123');
    expect(ficha.qrSvg).toContain('<svg');
    expect(ficha.qrDataUrl).toContain('data:image/png;base64');
  });

  it('GET /api/v1/lotes/:id/ficha-imprimible?format=html debe retornar documento HTML para impresión (RF-M1-11)', async () => {
    const lRes = await app.inject({
      method: 'POST',
      url: '/api/v1/lotes',
      payload: {
        codigoLote: 'LOT-2026-HTM01',
        producto: 'Limón',
        cantidadInicial: 10000,
        unidadMedida: 'KG',
        superficieHa: 12.0,
      },
    });
    const lote = JSON.parse(lRes.body).data;

    const htmlRes = await app.inject({
      method: 'GET',
      url: `/api/v1/lotes/${lote.id}/ficha-imprimible?format=html`,
    });

    expect(htmlRes.statusCode).toBe(200);
    expect(htmlRes.headers['content-type']).toContain('text/html');
    expect(htmlRes.body).toContain('CARTEL DE CABECERA DE LOTE');
    expect(htmlRes.body).toContain('LOT-2026-HTM01');
    expect(htmlRes.body).toContain('12 ha');
    expect(htmlRes.body).toContain('<svg');
    expect(htmlRes.body).toContain('@media print');
  });

  it('GET / debe incluir los componentes para Cartel de Cabecera y Filtros Avanzados (AGRUL-016)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('id="modal-ficha-cabecera"');
    expect(res.body).toContain('id="printable-cartel-cabecera"');
    expect(res.body).toContain('id="cartel-codigo"');
    expect(res.body).toContain('id="filtro-finca"');
    expect(res.body).toContain('id="filtro-sup-min"');
    expect(res.body).toContain('id="filtro-sup-max"');
  });
});


