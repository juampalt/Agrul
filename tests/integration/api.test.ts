import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryFincasRepository } from '../mocks/in-memory-fincas.repository.js';
import { InMemoryCatalogosActividadesRepository } from '../mocks/in-memory-catalogos-actividades.repository.js';
import { InMemoryActividadesRepository } from '../mocks/in-memory-actividades.repository.js';
import { InMemoryCiclosRepository } from '../mocks/in-memory-ciclos.repository.js';
import { InMemoryObservacionesMonitoreoRepository } from '../mocks/in-memory-observaciones-monitoreo.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryAplicacionesRepository } from '../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryCosechasRepository } from '../mocks/in-memory-cosechas.repository.js';
import { InMemoryDestinatariosRepository } from '../mocks/in-memory-destinatarios.repository.js';
import { InMemoryDespachosRepository } from '../mocks/in-memory-despachos.repository.js';
import { CicloProductivo } from '../../src/core/domain/entities/ciclo-productivo.entity.js';
import { TipoActividad } from '../../src/core/domain/entities/tipo-actividad.entity.js';

describe('API Integration Tests (Fastify HTTP Surface)', () => {
  let app: FastifyInstance;
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let fincasRepo: InMemoryFincasRepository;
  let catalogosRepo: InMemoryCatalogosActividadesRepository;
  let actividadesRepo: InMemoryActividadesRepository;
  let ciclosRepo: InMemoryCiclosRepository;
  let observacionesRepo: InMemoryObservacionesMonitoreoRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let aplicacionesRepo: InMemoryAplicacionesRepository;
  let cosechasRepo: InMemoryCosechasRepository;
  let destinatariosRepo: InMemoryDestinatariosRepository;
  let despachosRepo: InMemoryDespachosRepository;

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();
    fincasRepo = new InMemoryFincasRepository();
    catalogosRepo = new InMemoryCatalogosActividadesRepository();
    actividadesRepo = new InMemoryActividadesRepository();
    ciclosRepo = new InMemoryCiclosRepository();
    observacionesRepo = new InMemoryObservacionesMonitoreoRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();
    aplicacionesRepo = new InMemoryAplicacionesRepository();
    cosechasRepo = new InMemoryCosechasRepository();
    destinatariosRepo = new InMemoryDestinatariosRepository();
    despachosRepo = new InMemoryDespachosRepository();

    app = buildApp({
      lotesRepo,
      eventosRepo,
      genealogiaRepo,
      fincasRepo,
      catalogosRepo,
      actividadesRepo,
      ciclosRepo,
      observacionesRepo,
      insumosRepo,
      aplicacionesRepo,
      cosechasRepo,
      destinatariosRepo,
      despachosRepo,
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

  // ==========================================================================
  // AGRUL-020: Catálogos de Tipos de Actividad, Personal, Cuadrillas y Maquinaria
  // ==========================================================================

  describe('Módulo 3: Catálogos Agrícolas (AGRUL-020)', () => {
    it('GET /api/v1/catalogos/tipos-actividad debe listar el catálogo estándar precargado (RF-M3-01 / RNF-13)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/catalogos/tipos-actividad',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(10);

      // Verificar que incluya tipos agrícolas indispensables
      const nombres = body.data.map((t: { nombre: string }) => t.nombre);
      expect(nombres).toContain('Preparación de Suelo / Arado');
      expect(nombres).toContain('Siembra y Plantación');
      expect(nombres).toContain('Riego y Fertirriego');
      expect(nombres).toContain('Fertilización de Fondo / Foliar');
      expect(nombres).toContain('Control de Malezas / Deshierbe');
      expect(nombres).toContain('Aplicación Fitosanitaria (Plagas y Enfermedades)');
      expect(nombres).toContain('Cosecha Manual');
    });

    it('POST /api/v1/catalogos/tipos-actividad debe registrar un nuevo tipo y responder 201 Created', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/tipos-actividad',
        payload: {
          nombre: 'Instalación de Manta Térmica Antihelada',
          categoria: 'MANEJO',
          descripcion: 'Colocación de tela no tejida para protección contra heladas invernales en frutilla.',
          requiereMaquinaria: false,
          requiereInsumos: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.nombre).toBe('Instalación de Manta Térmica Antihelada');
      expect(body.data.categoria).toBe('MANEJO');
      expect(body.data.requiereInsumos).toBe(true);
      expect(body.data.activo).toBe(true);
    });

    it('POST /api/v1/catalogos/tipos-actividad debe rechazar nombre vacío con 400 Bad Request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/tipos-actividad',
        payload: {
          nombre: '', // Nombre vacío
          categoria: 'MANEJO',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    it('GET /api/v1/catalogos/tipos-actividad?categoria=SANIDAD debe filtrar por categoría', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/catalogos/tipos-actividad?categoria=SANIDAD',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      body.data.forEach((t: { categoria: string }) => {
        expect(t.categoria).toBe('SANIDAD');
      });
    });

    it('POST /api/v1/catalogos/personal debe registrar un trabajador individual (RF-M3-03)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/personal',
        payload: {
          nombre: 'Juan Carlos Mansilla',
          tipo: 'INDIVIDUAL',
          dniOIdentificacion: '30.123.456',
          telefono: '+54 381 4123456',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.nombre).toBe('Juan Carlos Mansilla');
      expect(body.data.tipo).toBe('INDIVIDUAL');
      expect(body.data.usuarioId).toBeNull();
      expect(body.data.activo).toBe(true);
    });

    it('POST /api/v1/catalogos/personal debe registrar una cuadrilla asociada a un usuario del sistema (RF-M3-03)', async () => {
      const usuarioId = crypto.randomUUID();

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/personal',
        payload: {
          nombre: 'Cuadrilla Norte - Cosecheros Temporarios',
          tipo: 'CUADRILLA',
          usuarioId: usuarioId,
          telefono: '+54 381 5998877',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.nombre).toBe('Cuadrilla Norte - Cosecheros Temporarios');
      expect(body.data.tipo).toBe('CUADRILLA');
      expect(body.data.usuarioId).toBe(usuarioId);
    });

    it('POST /api/v1/catalogos/personal debe rechazar usuarioId no UUID o nombre vacío', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/personal',
        payload: {
          nombre: 'Pedro',
          usuarioId: 'no-es-uuid',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    it('GET /api/v1/catalogos/personal debe listar y filtrar por tipo CUADRILLA', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/personal',
        payload: {
          nombre: 'Cuadrilla Test A',
          tipo: 'CUADRILLA',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/personal',
        payload: {
          nombre: 'Operario Individual Test',
          tipo: 'INDIVIDUAL',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/catalogos/personal?tipo=CUADRILLA',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      body.data.forEach((p: { tipo: string }) => {
        expect(p.tipo).toBe('CUADRILLA');
      });
    });

    it('POST /api/v1/catalogos/maquinaria debe registrar maquinaria con condición PROPIO, ALQUILADO o SERVICIO_CONTRATADO (RF-M3-06)', async () => {
      // 1. Maquinaria propia
      const resPropia = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/maquinaria',
        payload: {
          identificacion: 'Tractor John Deere 5075E (Nº Interno 01)',
          tipo: 'TRACTOR',
          condicion: 'PROPIO',
          marcaModelo: 'John Deere 5075E 4WD',
        },
      });

      expect(resPropia.statusCode).toBe(201);
      const dataPropia = JSON.parse(resPropia.body).data;
      expect(dataPropia.identificacion).toContain('Tractor John Deere');
      expect(dataPropia.condicion).toBe('PROPIO');

      // 2. Maquinaria de servicio contratado
      const resServicio = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/maquinaria',
        payload: {
          identificacion: 'Pulverizadora Autopropulsada Metalfor',
          tipo: 'PULVERIZADORA',
          condicion: 'SERVICIO_CONTRATADO',
          marcaModelo: 'Metalfor Multiple 3000',
        },
      });

      expect(resServicio.statusCode).toBe(201);
      const dataServicio = JSON.parse(resServicio.body).data;
      expect(dataServicio.condicion).toBe('SERVICIO_CONTRATADO');

      // 3. Maquinaria alquilada
      const resAlquilado = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/maquinaria',
        payload: {
          identificacion: 'Atomizadora de Arrastre 2000L',
          tipo: 'ATOMIZADORA',
          condicion: 'ALQUILADO',
        },
      });

      expect(resAlquilado.statusCode).toBe(201);
      expect(JSON.parse(resAlquilado.body).data.condicion).toBe('ALQUILADO');
    });

    it('POST /api/v1/catalogos/maquinaria debe rechazar condición inválida con 400 Bad Request', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/maquinaria',
        payload: {
          identificacion: 'Desmalezadora',
          condicion: 'PRESTADO_POR_VECINO', // No permitida
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    it('GET /api/v1/catalogos/maquinaria debe listar y filtrar por condición PROPIO', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/maquinaria',
        payload: {
          identificacion: 'Tractor Fendt Test',
          tipo: 'TRACTOR',
          condicion: 'PROPIO',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/maquinaria',
        payload: {
          identificacion: 'Cosechadora Alquilada Test',
          tipo: 'COSECHADORA',
          condicion: 'ALQUILADO',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/catalogos/maquinaria?condicion=PROPIO',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      body.data.forEach((m: { condicion: string }) => {
        expect(m.condicion).toBe('PROPIO');
      });
    });

    it('GET /api/v1/catalogos/maquinaria/:id debe obtener el detalle por identificador', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/maquinaria',
        payload: {
          identificacion: 'Motocultivador Honda F501',
          tipo: 'MOTOCULTIVADOR',
          condicion: 'PROPIO',
        },
      });
      const created = JSON.parse(createRes.body).data;

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/catalogos/maquinaria/${created.id}`,
      });

      expect(getRes.statusCode).toBe(200);
      const body = JSON.parse(getRes.body);
      expect(body.data.id).toBe(created.id);
      expect(body.data.identificacion).toBe('Motocultivador Honda F501');
    });

    it('GET /api/v1/catalogos/maquinaria/:id inexistente debe responder 404 Not Found', async () => {
      const randomId = crypto.randomUUID();
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/catalogos/maquinaria/${randomId}`,
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('ENTITY_NOT_FOUND');
    });
  });

  describe('Módulo 3: Registro de Actividades y Labores Agrícolas (AGRUL-021)', () => {
    let testLoteId: string;
    let testCicloAbiertoId: string;
    let testTipoActividadId: string;
    let testMaquinariaId: string;
    let testPersonalId: string;
    const testUsuarioId = crypto.randomUUID();

    beforeEach(async () => {
      // 1. Crear lote vía API
      const loteRes = await app.inject({
        method: 'POST',
        url: '/api/v1/lotes',
        payload: {
          codigoLote: 'LOT-2026-INTACT',
          producto: 'Frutilla Albión',
          cantidadInicial: 2000,
          unidadMedida: 'KG',
          superficieHa: 3.0,
        },
      });
      testLoteId = JSON.parse(loteRes.body).data.id;

      // 2. Crear ciclo productivo ABIERTO en ciclosRepo
      testCicloAbiertoId = crypto.randomUUID();
      await ciclosRepo.guardar(
        CicloProductivo.crear({
          id: testCicloAbiertoId,
          codigoCiclo: 'CICLO-2026-INT01',
          loteId: testLoteId,
          cultivo: 'Frutilla',
          variedad: 'Albión',
          estado: 'ABIERTO',
          superficieCultivadaHa: 3.0,
          fechaInicio: '2026-04-01',
        })
      );

      // 3. Obtener tipo de actividad estándar del catálogo
      const tiposRes = await app.inject({
        method: 'GET',
        url: '/api/v1/catalogos/tipos-actividad',
      });
      testTipoActividadId = JSON.parse(tiposRes.body).data[0].id;

      // 4. Crear maquinaria y cuadrilla
      const maqRes = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/maquinaria',
        payload: {
          identificacion: 'Tractor Agrícola JD 6110M',
          tipo: 'TRACTOR',
          condicion: 'PROPIO',
        },
      });
      testMaquinariaId = JSON.parse(maqRes.body).data.id;

      const persRes = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/personal',
        payload: {
          nombre: 'Cuadrilla Cosecha San Pedro',
          tipo: 'CUADRILLA',
        },
      });
      testPersonalId = JSON.parse(persRes.body).data.id;
    });

    it('POST /api/v1/actividades debe registrar labor ejecutada vinculada a lote y ciclo productivo abierto (RF-M3-02 / RN-01)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: testTipoActividadId,
          loteId: testLoteId,
          cicloId: testCicloAbiertoId,
          fechaHecho: '2026-10-10',
          hora: '07:30',
          usuarioCargaId: testUsuarioId,
          trabajadorResponsableId: testPersonalId,
          observaciones: 'Desmalezado manual y mecánico intensivo',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.codigoActividad).toMatch(/^ACT-\d{4}-\d{5}$/);
      expect(body.data.loteId).toBe(testLoteId);
      expect(body.data.cicloId).toBe(testCicloAbiertoId);
      expect(body.data.estado).toBe('REALIZADA');
      // RF-M3-04: por defecto adopta la superficie del ciclo (3.0 ha)
      expect(body.data.superficieTrabajadaHa).toBe(3.0);
    });

    it('POST /api/v1/actividades debe registrar maquinaria utilizada con horas y mano de obra con jornales (RF-M3-05 / RF-M3-15)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: testTipoActividadId,
          loteId: testLoteId,
          cicloId: testCicloAbiertoId,
          fechaHecho: '2026-10-12',
          usuarioCargaId: testUsuarioId,
          superficieTrabajadaHa: 1.5,
          maquinarias: [
            {
              maquinariaId: testMaquinariaId,
              horasUso: 5.5,
            },
          ],
          manoDeObra: [
            {
              personalCuadrillaId: testPersonalId,
              cantidadPersonas: 6,
              horasTrabajadas: 48,
              jornales: 6,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const data = JSON.parse(res.body).data;
      expect(data.superficieTrabajadaHa).toBe(1.5);
      expect(data.maquinarias.length).toBe(1);
      expect(data.maquinarias[0].maquinariaId).toBe(testMaquinariaId);
      expect(data.maquinarias[0].horasUso).toBe(5.5);
      expect(data.manoDeObra.length).toBe(1);
      expect(data.manoDeObra[0].personalCuadrillaId).toBe(testPersonalId);
      expect(data.manoDeObra[0].cantidadPersonas).toBe(6);
      expect(data.manoDeObra[0].jornales).toBe(6);
    });

    it('POST /api/v1/actividades debe rechazar fecha futura con 422 Unprocessable Entity (RN-04)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: testTipoActividadId,
          loteId: testLoteId,
          cicloId: testCicloAbiertoId,
          fechaHecho: '2099-01-01', // Futura
          usuarioCargaId: testUsuarioId,
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FECHA_FUTURA_INVALIDA');
    });

    it('POST /api/v1/actividades debe rechazar ciclo productivo cerrado con 422 (RN-03)', async () => {
      const cicloCerradoId = crypto.randomUUID();
      await ciclosRepo.guardar(
        CicloProductivo.crear({
          id: cicloCerradoId,
          codigoCiclo: 'CICLO-2026-CERR-API',
          loteId: testLoteId,
          cultivo: 'Frutilla',
          estado: 'CERRADO',
          superficieCultivadaHa: 3.0,
          fechaInicio: '2026-01-01',
          fechaFin: '2026-05-01',
        })
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: testTipoActividadId,
          loteId: testLoteId,
          cicloId: cicloCerradoId,
          fechaHecho: '2026-10-10',
          usuarioCargaId: testUsuarioId,
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CICLO_NO_ABIERTO');
    });

    it('POST /api/v1/actividades debe rechazar inconsistencia si ciclo pertenece a otro lote (RN-01)', async () => {
      // Crear segundo lote
      const lote2Res = await app.inject({
        method: 'POST',
        url: '/api/v1/lotes',
        payload: {
          codigoLote: 'LOT-2026-INTOTRO',
          producto: 'Arándano',
          cantidadInicial: 500,
          unidadMedida: 'KG',
        },
      });
      const lote2Id = JSON.parse(lote2Res.body).data.id;

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: testTipoActividadId,
          loteId: lote2Id, // Lote diferente al del ciclo
          cicloId: testCicloAbiertoId,
          fechaHecho: '2026-10-10',
          usuarioCargaId: testUsuarioId,
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INCONSISTENCIA_LOTE_CICLO');
    });

    it('GET /api/v1/actividades/:id debe retornar detalle de actividad', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: testTipoActividadId,
          loteId: testLoteId,
          cicloId: testCicloAbiertoId,
          fechaHecho: '2026-10-10',
          usuarioCargaId: testUsuarioId,
        },
      });
      const createdId = JSON.parse(createRes.body).data.id;

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/actividades/${createdId}`,
      });

      expect(getRes.statusCode).toBe(200);
      const body = JSON.parse(getRes.body);
      expect(body.data.id).toBe(createdId);
      expect(body.data.loteId).toBe(testLoteId);
    });

    it('GET /api/v1/actividades?loteId=... debe listar actividades filtrando por lote', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: testTipoActividadId,
          loteId: testLoteId,
          cicloId: testCicloAbiertoId,
          fechaHecho: '2026-10-10',
          usuarioCargaId: testUsuarioId,
        },
      });

      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/actividades?loteId=${testLoteId}`,
      });

      expect(listRes.statusCode).toBe(200);
      const body = JSON.parse(listRes.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      body.data.forEach((act: { loteId: string }) => {
        expect(act.loteId).toBe(testLoteId);
      });
    });
  });

  // ==========================================================================
  // AGRUL-023: Monitoreo de Campo y Anulación Auditada de Labores
  // ==========================================================================
  describe('AGRUL-023: Endpoints de Monitoreo de Campo y Anulación', () => {
    const monLoteId = '77777777-7777-7777-7777-777777777777';
    const monCicloId = '88888888-8888-8888-8888-888888888888';
    const monTipoId = '99999999-9999-9999-9999-999999999999';
    const monUsuarioId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    beforeEach(async () => {
      // Lote
      await lotesRepo.guardar(
        (await import('../../src/core/domain/entities/lote.entity.js')).Lote.crear({
          id: monLoteId,
          codigoLote: 'LOT-2026-MON01',
          producto: 'Frutilla San Andreas',
          cantidadInicial: 2000,
          unidadMedida: 'KG',
        })
      );

      // Ciclo abierto
      await ciclosRepo.guardar(
        CicloProductivo.crear({
          id: monCicloId,
          codigoCiclo: 'CIC-2026-MON',
          loteId: monLoteId,
          cultivo: 'Frutilla',
          estado: 'ABIERTO',
          superficieCultivadaHa: 2.0,
          fechaInicio: '2026-02-01',
        })
      );

      // Tipo de actividad
      await catalogosRepo.guardarTipoActividad(
        TipoActividad.crear({
          id: monTipoId,
          nombre: 'Control Fitosanitario Monitoreo',
          categoria: 'SANIDAD',
          requiereMaquinaria: false,
          requiereInsumos: true,
        })
      );
    });

    it('POST /api/v1/monitoreo debe registrar una observación de campo y responder 201 Created', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/monitoreo',
        payload: {
          loteId: monLoteId,
          cicloId: monCicloId,
          fecha: '2026-10-14',
          sintomas: 'Presencia de oídio en hojas medias',
          plagas: 'Oídio (Podosphaera aphanis)',
          estadoCultivo: 'FLORACION',
          fotosUrls: ['https://storage.agrul.local/fotos/oidio-1.jpg'],
          usuarioId: monUsuarioId,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.sintomas).toBe('Presencia de oídio en hojas medias');
      expect(body.data.fotosUrls).toHaveLength(1);
    });

    it('GET /api/v1/monitoreo debe listar observaciones registradas', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/monitoreo',
        payload: {
          loteId: monLoteId,
          cicloId: monCicloId,
          fecha: '2026-10-14',
          sintomas: 'Presencia de trips',
          usuarioId: monUsuarioId,
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/monitoreo?loteId=${monLoteId}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].loteId).toBe(monLoteId);
    });

    it('POST /api/v1/actividades con observacionMonitoreoId debe vincular la actividad a la observación (RF-M3-10)', async () => {
      const obsRes = await app.inject({
        method: 'POST',
        url: '/api/v1/monitoreo',
        payload: {
          loteId: monLoteId,
          cicloId: monCicloId,
          fecha: '2026-10-14',
          sintomas: 'Botrytis detectada en frutos verdes',
          usuarioId: monUsuarioId,
        },
      });
      const obsId = JSON.parse(obsRes.body).data.id;

      const actRes = await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: monTipoId,
          loteId: monLoteId,
          cicloId: monCicloId,
          fechaHecho: '2026-10-14',
          usuarioCargaId: monUsuarioId,
          observacionMonitoreoId: obsId,
          observaciones: 'Pulverización fungicida preventiva',
        },
      });

      expect(actRes.statusCode).toBe(201);
      const act = JSON.parse(actRes.body).data;
      expect(act.observacionMonitoreoId).toBe(obsId);
    });

    it('POST /api/v1/actividades/:id/anular debe cancelar la actividad con motivo obligatorio (RF-M3-12, RN-05, RN-06)', async () => {
      const actRes = await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: monTipoId,
          loteId: monLoteId,
          cicloId: monCicloId,
          fechaHecho: '2026-10-14',
          usuarioCargaId: monUsuarioId,
        },
      });
      const actId = JSON.parse(actRes.body).data.id;

      const anularRes = await app.inject({
        method: 'POST',
        url: `/api/v1/actividades/${actId}/anular`,
        payload: {
          motivo: 'Lluvia torrencial lavó el producto fitosanitario aplicado',
          usuarioId: monUsuarioId,
        },
      });

      expect(anularRes.statusCode).toBe(200);
      const body = JSON.parse(anularRes.body);
      expect(body.success).toBe(true);
      expect(body.data.estado).toBe('CANCELADA');
      expect(body.data.motivoCancelacion).toBe(
        'Lluvia torrencial lavó el producto fitosanitario aplicado'
      );
    });

    it('POST /api/v1/actividades/:id/anular debe fallar con HTTP 400 si falta el motivo', async () => {
      const actRes = await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: monTipoId,
          loteId: monLoteId,
          cicloId: monCicloId,
          fechaHecho: '2026-10-14',
          usuarioCargaId: monUsuarioId,
        },
      });
      const actId = JSON.parse(actRes.body).data.id;

      const badRes = await app.inject({
        method: 'POST',
        url: `/api/v1/actividades/${actId}/anular`,
        payload: {
          motivo: 'ab', // Demasiado corto (min 3)
        },
      });

      expect(badRes.statusCode).toBe(400);
      const body = JSON.parse(badRes.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Catálogo de Insumos Fitosanitarios y Carencias (AGRUL-024 / RF-M4-01, RF-M4-02, RN-14)', () => {
    it('POST /api/v1/insumos debe registrar un insumo fitosanitario con ficha técnica (201 Created)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/insumos',
        payload: {
          nombreComercial: 'Captan 80 WG',
          categoria: 'FITOSANITARIO',
          unidadMedidaId: 'KG',
          presentacion: 'Bolsa 5kg',
          fichaFitosanitaria: {
            principioActivo: 'Captan',
            periodoCarenciaDias: 14,
            periodoReingresoHoras: 24,
            nroRegistroSenasa: 'SENASA-28941',
            toxicologia: 'Clase III - Cuidado (Banda Azul)',
          },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.nombreComercial).toBe('Captan 80 WG');
      expect(body.data.categoria).toBe('FITOSANITARIO');
      expect(body.data.fichaFitosanitaria.principioActivo).toBe('Captan');
      expect(body.data.fichaFitosanitaria.periodoCarenciaDias).toBe(14);
      expect(body.data.fichaFitosanitaria.periodoReingresoHoras).toBe(24);
      expect(body.data.fichaFitosanitaria.nroRegistroSenasa).toBe('SENASA-28941');
    });

    it('POST /api/v1/insumos debe fallar con 400 Bad Request si la categoría es FITOSANITARIO y falta la ficha técnica (RN-14)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/insumos',
        payload: {
          nombreComercial: 'Fungicida Sin Ficha',
          categoria: 'FITOSANITARIO',
          unidadMedidaId: 'LT',
          presentacion: 'Bidón 1L',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('POST /api/v1/insumos debe fallar con 409 Conflict si el nombre comercial ya existe', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/insumos',
        payload: {
          nombreComercial: 'Urea Perlada 46%',
          categoria: 'FERTILIZANTE',
          unidadMedidaId: 'KG',
          presentacion: 'Bolsa 50kg',
        },
      });

      const dupRes = await app.inject({
        method: 'POST',
        url: '/api/v1/insumos',
        payload: {
          nombreComercial: 'urea perlada 46%',
          categoria: 'FERTILIZANTE',
          unidadMedidaId: 'KG',
          presentacion: 'Bolsa 25kg',
        },
      });

      expect(dupRes.statusCode).toBe(409);
      const body = JSON.parse(dupRes.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INPUT_ALREADY_EXISTS');
    });

    it('GET /api/v1/insumos debe permitir listar y filtrar por categoría y estado', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/insumos',
        payload: {
          nombreComercial: 'Plantines Camarosa',
          categoria: 'SEMILLA_PLANTIN',
          unidadMedidaId: 'UNIDAD',
          presentacion: 'Bandeja 128',
        },
      });

      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/insumos?categoria=SEMILLA_PLANTIN',
      });

      expect(listRes.statusCode).toBe(200);
      const body = JSON.parse(listRes.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.every((i: { categoria: string }) => i.categoria === 'SEMILLA_PLANTIN')).toBe(true);
    });

    it('GET /api/v1/insumos/:id debe retornar el detalle del insumo o 404', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/insumos',
        payload: {
          nombreComercial: 'Ácido Fosfórico 85%',
          categoria: 'FERTILIZANTE',
          unidadMedidaId: 'LT',
          presentacion: 'Bidón 35kg',
        },
      });
      const id = JSON.parse(createRes.body).data.id;

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/insumos/${id}`,
      });

      expect(getRes.statusCode).toBe(200);
      const body = JSON.parse(getRes.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(id);
      expect(body.data.nombreComercial).toBe('Ácido Fosfórico 85%');

      const notFoundRes = await app.inject({
        method: 'GET',
        url: '/api/v1/insumos/00000000-0000-0000-0000-000000000000',
      });
      expect(notFoundRes.statusCode).toBe(404);
    });
  });

  describe('Módulo 4: Aplicaciones Agrícolas de Campo (AGRUL-025)', () => {
    let loteId: string;
    let cicloId: string;
    let actividadId: string;
    let insumo1Id: string;
    let insumo2Id: string;

    beforeEach(async () => {
      // 1. Crear lote
      const loteRes = await app.inject({
        method: 'POST',
        url: '/api/v1/lotes',
        payload: {
          codigoLote: 'LOT-2026-APL01',
          producto: 'Frutilla San Andreas',
          cantidadInicial: 8000,
          unidadMedida: 'KG',
        },
      });
      loteId = JSON.parse(loteRes.body).data.id;

      // 2. Crear ciclo abierto en el lote
      cicloId = crypto.randomUUID();
      await ciclosRepo.guardar(
        CicloProductivo.crear({
          id: cicloId,
          codigoCiclo: 'CICLO-2026-INT-01',
          loteId,
          cultivo: 'Frutilla',
          variedad: 'San Andreas',
          estado: 'ABIERTO',
          superficieCultivadaHa: 4.0,
          fechaInicio: '2026-03-01',
        })
      );

      // 3. Crear tipo de actividad y actividad agrícola
      const tipoActRes = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/tipos-actividad',
        payload: {
          nombre: 'Aplicación Fitosanitaria Preventiva',
          categoria: 'SANIDAD',
          requiereInsumos: true,
        },
      });
      const tipoId = JSON.parse(tipoActRes.body).data.id;

      const actRes = await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: tipoId,
          loteId,
          cicloId,
          fechaHecho: '2026-10-14',
          superficieTrabajadaHa: 4.0,
          usuarioCargaId: crypto.randomUUID(),
        },
      });
      actividadId = JSON.parse(actRes.body).data.id;

      // 4. Crear insumos en catálogo
      const ins1Res = await app.inject({
        method: 'POST',
        url: '/api/v1/insumos',
        payload: {
          nombreComercial: 'Fungicida Azoxistrobin 25%',
          categoria: 'FITOSANITARIO',
          unidadMedidaId: 'LT',
          presentacion: 'Bidón 5L',
          fichaFitosanitaria: {
            principioActivo: 'Azoxistrobin',
            periodoCarenciaDias: 3,
            periodoReingresoHoras: 12,
            nroRegistroSenasa: 'SENASA-55891',
          },
        },
      });
      insumo1Id = JSON.parse(ins1Res.body).data.id;

      const ins2Res = await app.inject({
        method: 'POST',
        url: '/api/v1/insumos',
        payload: {
          nombreComercial: 'Bioestimulante Aminoácidos',
          categoria: 'FERTILIZANTE',
          unidadMedidaId: 'LT',
          presentacion: 'Bidón 20L',
        },
      });
      insumo2Id = JSON.parse(ins2Res.body).data.id;
    });

    it('POST /api/v1/aplicaciones debe registrar una aplicación monoproducto con dosis diferenciadas (RF-M4-03, RF-M4-04, RF-M4-11, RF-M4-12)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/aplicaciones',
        payload: {
          actividadId,
          loteId,
          cicloId,
          fecha: '2026-10-14',
          metodo: 'FOLIAR',
          motivo: 'Control preventivo de oídio y manchas foliares',
          equipoAplicacion: 'Pulverizadora de arrastre con picos antideriva',
          condicionesClima: {
            vientoKmH: 6.5,
            tempC: 22.0,
            lluviaMm: 0,
            observaciones: 'Viento calmo, aplicación matutina óptima',
          },
          lineas: [
            {
              insumoId: insumo1Id,
              cantidadTotal: 3.2,
              unidadMedidaId: 'LT',
              dosisPorSuperficie: 0.8, // 0.8 L/ha
              dosisPorPlanta: null,
              concentracion: '80 cc/100L',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.actividadId).toBe(actividadId);
      expect(body.data.loteId).toBe(loteId);
      expect(body.data.cicloId).toBe(cicloId);
      expect(body.data.equipoAplicacion).toContain('Pulverizadora de arrastre');
      expect(body.data.condicionesClima.tempC).toBe(22.0);
      expect(body.data.condicionesClima.vientoKmH).toBe(6.5);
      expect(body.data.esMezcla).toBe(false);
      expect(body.data.lineas).toHaveLength(1);
      expect(body.data.lineas[0].insumoId).toBe(insumo1Id);
      expect(body.data.lineas[0].nombreComercial).toBe('Fungicida Azoxistrobin 25%');
      expect(body.data.lineas[0].cantidadTotal).toBe(3.2);
      expect(body.data.lineas[0].dosisPorSuperficie).toBe(0.8);
      expect(body.data.lineas[0].concentracion).toBe('80 cc/100L');
    });

    it('POST /api/v1/aplicaciones debe registrar una mezcla (caldo) con múltiples insumos (RF-M4-06)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/aplicaciones',
        payload: {
          actividadId,
          loteId,
          cicloId,
          fecha: '2026-10-14',
          metodo: 'FOLIAR',
          motivo: 'Fungicida + Bioestimulante en caldo único',
          equipoAplicacion: 'Mochila manual a palanca',
          lineas: [
            {
              insumoId: insumo1Id,
              cantidadTotal: 2.0,
              unidadMedidaId: 'LT',
              dosisPorSuperficie: 0.5,
              concentracion: '100 cc/100L',
            },
            {
              insumoId: insumo2Id,
              cantidadTotal: 5.0,
              unidadMedidaId: 'LT',
              dosisPorSuperficie: 1.25,
              concentracion: '250 cc/100L',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.esMezcla).toBe(true);
      expect(body.data.lineas).toHaveLength(2);
      expect(body.data.lineas[0].nombreComercial).toBe('Fungicida Azoxistrobin 25%');
      expect(body.data.lineas[1].nombreComercial).toBe('Bioestimulante Aminoácidos');
    });

    it('POST /api/v1/aplicaciones debe rechazar con 422 si el ciclo productivo se encuentra CERRADO (RF-M4-05 / RN-03)', async () => {
      const cicloCerradoId = crypto.randomUUID();
      await ciclosRepo.guardar(
        CicloProductivo.crear({
          id: cicloCerradoId,
          codigoCiclo: 'CICLO-CERRADO-INT',
          loteId,
          cultivo: 'Frutilla',
          estado: 'CERRADO',
          superficieCultivadaHa: 4.0,
          fechaInicio: '2026-01-01',
          fechaFin: '2026-05-01',
        })
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/aplicaciones',
        payload: {
          actividadId,
          loteId,
          cicloId: cicloCerradoId,
          fecha: '2026-10-14',
          metodo: 'FOLIAR',
          motivo: 'Intento en ciclo cerrado',
          equipoAplicacion: 'Mochila',
          lineas: [
            {
              insumoId: insumo1Id,
              cantidadTotal: 2.0,
              unidadMedidaId: 'LT',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CICLO_NO_ABIERTO');
    });

    it('POST /api/v1/aplicaciones debe rechazar con 422 si la actividad no coincide con el lote/ciclo (RN-01)', async () => {
      const otroLoteRes = await app.inject({
        method: 'POST',
        url: '/api/v1/lotes',
        payload: {
          codigoLote: 'LOT-2026-APL02',
          producto: 'Arándano',
          cantidadInicial: 2000,
          unidadMedida: 'KG',
        },
      });
      const otroLoteId = JSON.parse(otroLoteRes.body).data.id;

      const otroCicloId = crypto.randomUUID();
      await ciclosRepo.guardar(
        CicloProductivo.crear({
          id: otroCicloId,
          codigoCiclo: 'CICLO-OTRO-01',
          loteId: otroLoteId,
          cultivo: 'Arándano',
          estado: 'ABIERTO',
          superficieCultivadaHa: 2.0,
          fechaInicio: '2026-02-01',
        })
      );

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/aplicaciones',
        payload: {
          actividadId, // Actividad pertenece a loteId original
          loteId: otroLoteId,
          cicloId: otroCicloId,
          fecha: '2026-10-14',
          metodo: 'FOLIAR',
          motivo: 'Inconsistencia lote/ciclo',
          equipoAplicacion: 'Mochila',
          lineas: [
            {
              insumoId: insumo1Id,
              cantidadTotal: 1.0,
              unidadMedidaId: 'LT',
            },
          ],
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INCONSISTENCIA_LOTE_CICLO');
    });

    it('POST /api/v1/aplicaciones debe rechazar con 400 Bad Request si faltan campos obligatorios o lineas está vacío', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/aplicaciones',
        payload: {
          actividadId,
          loteId,
          cicloId,
          fecha: '2026-10-14',
          metodo: 'FOLIAR',
          motivo: 'Sin equipo ni líneas',
          equipoAplicacion: '', // Vacío
          lineas: [],          // Vacío
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /api/v1/aplicaciones y GET /api/v1/aplicaciones/:id deben retornar listado y detalle con envelope', async () => {
      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/aplicaciones',
        payload: {
          actividadId,
          loteId,
          cicloId,
          fecha: '2026-10-14',
          metodo: 'FERTIRRIEGO',
          motivo: 'Aporte nutricional por goteo',
          equipoAplicacion: 'Cabezal de fertirriego automatizado con venturi',
          lineas: [
            {
              insumoId: insumo2Id,
              cantidadTotal: 25.0,
              unidadMedidaId: 'LT',
              dosisPorSuperficie: 6.25,
            },
          ],
        },
      });
      const appId = JSON.parse(postRes.body).data.id;

      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/aplicaciones?loteId=${loteId}`,
      });
      expect(listRes.statusCode).toBe(200);
      const listBody = JSON.parse(listRes.body);
      expect(listBody.success).toBe(true);
      expect(listBody.data.length).toBeGreaterThanOrEqual(1);

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/aplicaciones/${appId}`,
      });
      expect(getRes.statusCode).toBe(200);
      const getBody = JSON.parse(getRes.body);
      expect(getBody.success).toBe(true);
      expect(getBody.data.id).toBe(appId);
      expect(getBody.data.metodo).toBe('FERTIRRIEGO');
      expect(getBody.data.lineas[0].nombreComercial).toBe('Bioestimulante Aminoácidos');
    });
  });

  describe('Motor de Validación de Carencia, Reingreso y Recomendaciones Técnicas (AGRUL-026 / RF-M4-08, RF-M4-09, RN-14)', () => {
    let loteCarenciaId: string;
    let cicloCarenciaId: string;
    let actividadCarenciaId: string;
    let insumoCarenciaId: string;

    beforeEach(async () => {
      // 1. Crear lote
      const loteRes = await app.inject({
        method: 'POST',
        url: '/api/v1/lotes',
        payload: {
          codigoLote: 'LOT-2026-99001',
          producto: 'Cereza Lapins',
          variedad: 'Lapins Exportación',
          cantidadInicial: 8000,
          unidadMedida: 'KG',
        },
      });
      loteCarenciaId = JSON.parse(loteRes.body).data.id;

      // 2. Crear ciclo productivo abierto
      cicloCarenciaId = crypto.randomUUID();
      await ciclosRepo.guardar(
        CicloProductivo.crear({
          id: cicloCarenciaId,
          codigoCiclo: 'CICLO-CAR-2026',
          loteId: loteCarenciaId,
          cultivo: 'Cereza',
          variedad: 'Lapins',
          estado: 'ABIERTO',
          superficieCultivadaHa: 4.0,
          fechaInicio: '2026-09-01',
        })
      );

      // 3. Crear tipo de actividad y actividad agrícola
      const tipoActRes = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/tipos-actividad',
        payload: {
          nombre: 'Aplicación Fitosanitaria Carencia Test',
          categoria: 'SANIDAD',
          requiereInsumos: true,
        },
      });
      const tipoId = JSON.parse(tipoActRes.body).data.id;

      const actRes = await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: tipoId,
          loteId: loteCarenciaId,
          cicloId: cicloCarenciaId,
          fechaHecho: '2026-10-01',
          superficieTrabajadaHa: 4.0,
          usuarioCargaId: crypto.randomUUID(),
        },
      });
      actividadCarenciaId = JSON.parse(actRes.body).data.id;

      // 4. Crear insumo fitosanitario con 14 días de carencia
      const insumoRes = await app.inject({
        method: 'POST',
        url: '/api/v1/insumos',
        payload: {
          nombreComercial: 'Fungicida Carencia 14D',
          categoria: 'FITOSANITARIO',
          unidadMedidaId: 'KG',
          presentacion: 'Bolsa 5kg',
          fichaFitosanitaria: {
            principioActivo: 'Fenhexamid',
            periodoCarenciaDias: 14,
            periodoReingresoHoras: 24,
            nroRegistroSenasa: 'SENASA-F-9876',
            toxicologia: 'Clase IV - Verde',
          },
        },
      });
      insumoCarenciaId = JSON.parse(insumoRes.body).data.id;

      // 5. Registrar aplicación base en el lote aplicada el 2026-10-01
      await app.inject({
        method: 'POST',
        url: '/api/v1/aplicaciones',
        payload: {
          actividadId: actividadCarenciaId,
          loteId: loteCarenciaId,
          cicloId: cicloCarenciaId,
          fecha: '2026-10-01',
          metodo: 'FOLIAR',
          motivo: 'Tratamiento fitosanitario base con carencia',
          equipoAplicacion: 'Pulverizador de arrastre',
          lineas: [
            {
              insumoId: insumoCarenciaId,
              cantidadTotal: 3.5,
              unidadMedidaId: 'KG',
              dosisPorSuperficie: 0.875,
            },
          ],
        },
      });
    });

    it('POST /api/v1/aplicaciones debe registrar una aplicación con recomendación técnica profesional adjunta (RF-M4-08)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/aplicaciones',
        payload: {
          actividadId: actividadCarenciaId,
          loteId: loteCarenciaId,
          cicloId: cicloCarenciaId,
          fecha: '2026-10-02',
          metodo: 'FOLIAR',
          motivo: 'Control de monilia previo a cosecha',
          equipoAplicacion: 'Pulverizador de arrastre 2000L',
          lineas: [
            {
              insumoId: insumoCarenciaId,
              cantidadTotal: 3.5,
              unidadMedidaId: 'KG',
              dosisPorSuperficie: 0.875,
            },
          ],
          recomendacionTecnica: {
            agronomoEmisor: 'Ing. Agr. Florencia Gomez',
            nroMatricula: 'MP-7741-CPIA',
            documentoUrl: 'https://cdn.agrul.app/recetas/receta-fenhexamid-2026.pdf',
            firmaDigital: 'sig-sha256-fgomez',
            fechaEmision: '2026-09-30',
            observaciones: 'Respetar período de carencia estricto de 14 días según SENASA.',
          },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.recomendacionTecnica).toBeDefined();
      expect(body.data.recomendacionTecnica.agronomoEmisor).toBe('Ing. Agr. Florencia Gomez');
      expect(body.data.recomendacionTecnica.nroMatricula).toBe('MP-7741-CPIA');
      expect(body.data.recomendacionTecnica.documentoUrl).toContain('receta-fenhexamid-2026.pdf');
    });

    it('GET /api/v1/lotes/:id/carencia debe devolver 404 si el lote no existe', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/lotes/${crypto.randomUUID()}/carencia`,
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('ENTITY_NOT_FOUND');
    });

    it('GET /api/v1/lotes/:id/carencia debe emitir warning claro con producto, días restantes y fecha segura si fechaCosecha < fechaFinCarencia (RF-M4-09 / RN-14)', async () => {
      // Aplicación realizada el 2026-10-01 con 14 días de carencia -> fechaFinCarencia: 2026-10-15
      // Evaluar cosecha para el 2026-10-08 (restan 7 días)
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/lotes/${loteCarenciaId}/carencia?fecha=2026-10-08`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.loteId).toBe(loteCarenciaId);
      expect(body.data.fechaEvaluacion).toBe('2026-10-08');
      expect(body.data.aptoParaCosecha).toBe(false);
      expect(body.data.fechaSeguraCosecha).toBe('2026-10-15');
      expect(body.data.totalAlertasCarencia).toBe(1);

      const alerta = body.data.alertasCarencia[0];
      expect(alerta.nombreComercial).toBe('Fungicida Carencia 14D');
      expect(alerta.principioActivo).toBe('Fenhexamid');
      expect(alerta.periodoCarenciaDias).toBe(14);
      expect(alerta.fechaFinCarencia).toBe('2026-10-15');
      expect(alerta.diasRestantes).toBe(7);
      expect(alerta.mensajeAdvertencia).toContain('ADVERTENCIA DE SEGURIDAD ALIMENTARIA');
      expect(alerta.mensajeAdvertencia).toContain('restan 7 días de carencia');

      expect(body.data.advertencias).toHaveLength(1);
    });

    it('GET /api/v1/lotes/:id/carencia debe indicar lote apto si la fecha es igual o posterior a la fecha segura (2026-10-15)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/lotes/${loteCarenciaId}/carencia?fecha=2026-10-15`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.aptoParaCosecha).toBe(true);
      expect(body.data.totalAlertasCarencia).toBe(0);
      expect(body.data.alertasCarencia).toHaveLength(0);
      expect(body.data.fechaSeguraCosecha).toBeNull();
    });

    it('GET /api/v1/aplicaciones/carencia/lote/:id debe funcionar como alias de verificación de carencia', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/aplicaciones/carencia/lote/${loteCarenciaId}?fecha=2026-10-05`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.aptoParaCosecha).toBe(false);
      expect(body.data.fechaSeguraCosecha).toBe('2026-10-15');
      expect(body.data.alertasCarencia[0].diasRestantes).toBe(10);
    });
  });

  // ============================================================================
  // AGRUL-027: Consumo Acumulado de Insumos por Lote, Ciclo y Hectárea (RF-M4-10 / RNF-03)
  // ============================================================================
  describe('AGRUL-027: Consumo Acumulado de Insumos por Lote, Ciclo y Hectárea', () => {
    let loteAcumuladoId: string;
    let cicloAcumuladoId: string;
    let insumoNitrogenoId: string;
    let insumoFungicidaId: string;

    beforeEach(async () => {
      // 1. Crear Lote
      loteAcumuladoId = crypto.randomUUID();
      const loteRes = await app.inject({
        method: 'POST',
        url: '/api/v1/lotes',
        payload: {
          codigoLote: 'LOT-2026-99027',
          producto: 'Manzana Gala',
          variedad: 'Royal Gala',
          cantidadInicial: 25000,
          unidadMedida: 'KG',
        },
      });
      const loteBody = JSON.parse(loteRes.body);
      loteAcumuladoId = loteBody.data.id;

      // 2. Crear Ciclo Productivo en el repositorio (superficieCultivadaHa = 4.0)
      cicloAcumuladoId = crypto.randomUUID();
      const ciclo = CicloProductivo.crear({
        id: cicloAcumuladoId,
        codigoCiclo: 'CICLO-2026-GALA-01',
        loteId: loteAcumuladoId,
        cultivo: 'Manzana',
        variedad: 'Royal Gala',
        estado: 'ABIERTO',
        superficieCultivadaHa: 4.0,
        fechaInicio: '2026-08-01',
      });
      await ciclosRepo.guardar(ciclo);

      // 2.5 Crear tipo de actividad en el catálogo
      const tipoActRes = await app.inject({
        method: 'POST',
        url: '/api/v1/catalogos/tipos-actividad',
        payload: {
          nombre: 'Aplicación Acumulada AGRUL-027',
          categoria: 'SANIDAD',
          requiereInsumos: true,
        },
      });
      const tipoActId = JSON.parse(tipoActRes.body).data.id;

      // 3. Crear Actividades Agrícolas en el repositorio
      const act1Res = await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: tipoActId,
          loteId: loteAcumuladoId,
          cicloId: cicloAcumuladoId,
          fechaHecho: '2026-08-15',
          hora: '08:00',
          usuarioCargaId: crypto.randomUUID(),
          superficieTrabajadaHa: 4.0,
        },
      });
      const act1Body = JSON.parse(act1Res.body);

      const act2Res = await app.inject({
        method: 'POST',
        url: '/api/v1/actividades',
        payload: {
          tipoActividadId: tipoActId,
          loteId: loteAcumuladoId,
          cicloId: cicloAcumuladoId,
          fechaHecho: '2026-08-25',
          hora: '09:00',
          usuarioCargaId: crypto.randomUUID(),
          superficieTrabajadaHa: 4.0,
        },
      });
      const act2Body = JSON.parse(act2Res.body);

      // 4. Crear Insumos en Catálogo
      const ins1Res = await app.inject({
        method: 'POST',
        url: '/api/v1/insumos',
        payload: {
          nombreComercial: 'Nitrato de Calcio Agrícola',
          categoria: 'FERTILIZANTE',
          unidadMedidaId: 'KG',
          presentacion: 'Bolsa 25kg',
        },
      });
      insumoNitrogenoId = JSON.parse(ins1Res.body).data.id;

      const ins2Res = await app.inject({
        method: 'POST',
        url: '/api/v1/insumos',
        payload: {
          nombreComercial: 'Captan 80 WP Fungicida',
          categoria: 'FITOSANITARIO',
          unidadMedidaId: 'KG',
          presentacion: 'Caja 10kg',
          fichaFitosanitaria: {
            principioActivo: 'Captan',
            periodoCarenciaDias: 7,
            periodoReingresoHoras: 24,
            nroRegistroSenasa: 'SENASA-F-9988',
          },
        },
      });
      insumoFungicidaId = JSON.parse(ins2Res.body).data.id;

      // 5. Registrar Aplicación 1: 20 kg de Nitrato
      await app.inject({
        method: 'POST',
        url: '/api/v1/aplicaciones',
        payload: {
          actividadId: act1Body.data.id,
          loteId: loteAcumuladoId,
          cicloId: cicloAcumuladoId,
          fecha: '2026-08-15',
          metodo: 'FERTIRRIEGO',
          motivo: 'Aporte de calcio inicial',
          equipoAplicacion: 'Sistema de goteo presurizado',
          lineas: [
            {
              insumoId: insumoNitrogenoId,
              cantidadTotal: 20,
              unidadMedidaId: 'KG',
              dosisPorSuperficie: 5,
            },
          ],
        },
      });

      // 6. Registrar Aplicación 2: 12 kg de Nitrato y 6 kg de Captan (mezcla)
      await app.inject({
        method: 'POST',
        url: '/api/v1/aplicaciones',
        payload: {
          actividadId: act2Body.data.id,
          loteId: loteAcumuladoId,
          cicloId: cicloAcumuladoId,
          fecha: '2026-08-25',
          metodo: 'FOLIAR',
          motivo: 'Control fúngico y nutrición foliar',
          equipoAplicacion: 'Atomizador hidroneumático 1500L',
          lineas: [
            {
              insumoId: insumoNitrogenoId,
              cantidadTotal: 12,
              unidadMedidaId: 'KG',
              dosisPorSuperficie: 3,
            },
            {
              insumoId: insumoFungicidaId,
              cantidadTotal: 6,
              unidadMedidaId: 'KG',
              dosisPorSuperficie: 1.5,
            },
          ],
        },
      });
    });

    it('GET /api/v1/ciclos/:id/insumos-acumulados debe calcular métricas precisas por lote, ciclo y por ha (RF-M4-10)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/ciclos/${cicloAcumuladoId}/insumos-acumulados`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.error).toBeNull();
      expect(body.timestamp).toBeDefined();

      const data = body.data;
      expect(data.cicloId).toBe(cicloAcumuladoId);
      expect(data.codigoCiclo).toBe('CICLO-2026-GALA-01');
      expect(data.loteId).toBe(loteAcumuladoId);
      expect(data.superficieCultivadaHa).toBe(4.0);
      expect(data.estadoCiclo).toBe('ABIERTO');
      expect(data.totalAplicaciones).toBe(2);
      expect(data.totalInsumosDistintos).toBe(2);
      expect(data.insumos).toHaveLength(2);

      // Nitrato: 20 + 12 = 32 kg. Por ha = 32 / 4 = 8 kg/ha. En 2 aplicaciones.
      const nitrato = data.insumos.find((i: any) => i.insumoId === insumoNitrogenoId);
      expect(nitrato).toBeDefined();
      expect(nitrato.nombreComercial).toBe('Nitrato de Calcio Agrícola');
      expect(nitrato.categoria).toBe('FERTILIZANTE');
      expect(nitrato.unidadMedidaId).toBe('KG');
      expect(nitrato.cantidadTotalConsumida).toBe(32);
      expect(nitrato.cantidadPorHectarea).toBe(8);
      expect(nitrato.numeroAplicaciones).toBe(2);

      // Captan: 6 kg. Por ha = 6 / 4 = 1.5 kg/ha. En 1 aplicación.
      const captan = data.insumos.find((i: any) => i.insumoId === insumoFungicidaId);
      expect(captan).toBeDefined();
      expect(captan.nombreComercial).toBe('Captan 80 WP Fungicida');
      expect(captan.categoria).toBe('FITOSANITARIO');
      expect(captan.unidadMedidaId).toBe('KG');
      expect(captan.cantidadTotalConsumida).toBe(6);
      expect(captan.cantidadPorHectarea).toBe(1.5);
      expect(captan.numeroAplicaciones).toBe(1);

      // Orden descendente por cantidadTotalConsumida
      expect(data.insumos[0].insumoId).toBe(insumoNitrogenoId);
      expect(data.insumos[1].insumoId).toBe(insumoFungicidaId);
    });

    it('GET /api/v1/ciclos/:id/insumos-acumulados debe responder con métricas en cero si el ciclo no tiene aplicaciones', async () => {
      // Crear ciclo sin aplicaciones
      const cicloVacioId = crypto.randomUUID();
      const cicloVacio = CicloProductivo.crear({
        id: cicloVacioId,
        codigoCiclo: 'CICLO-2026-VACIO',
        loteId: loteAcumuladoId,
        cultivo: 'Manzana',
        superficieCultivadaHa: 2.5,
        fechaInicio: '2026-09-01',
      });
      await ciclosRepo.guardar(cicloVacio);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/ciclos/${cicloVacioId}/insumos-acumulados`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.totalAplicaciones).toBe(0);
      expect(body.data.totalInsumosDistintos).toBe(0);
      expect(body.data.insumos).toEqual([]);
    });

    it('GET /api/v1/ciclos/:id/insumos-acumulados debe devolver 404 si el ciclo no existe', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/ciclos/${crypto.randomUUID()}/insumos-acumulados`,
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('ENTITY_NOT_FOUND');
    });

    it('GET /api/v1/ciclos/:id/insumos-acumulados debe devolver 400 si el id no es un UUID válido', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/ciclos/ciclo-invalido-123/insumos-acumulados',
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ============================================================================
  // AGRUL-028: Registro de Cosechas, Descarte y Código de Trazabilidad Único (Módulo 5)
  // ============================================================================
  describe('AGRUL-028: Registro de Cosechas, Descarte y Código de Trazabilidad Único', () => {
    let loteCosechaId: string;
    let cicloCosechaId: string;

    beforeEach(async () => {
      // 1. Crear Lote
      const loteRes = await app.inject({
        method: 'POST',
        url: '/api/v1/lotes',
        payload: {
          codigoLote: 'LOT-2026-00028',
          producto: 'Cereza Lapins Export',
          variedad: 'Lapins',
          cantidadInicial: 1000,
          unidadMedida: 'KG',
        },
      });
      loteCosechaId = JSON.parse(loteRes.body).data.id;

      // 2. Crear Ciclo Productivo ABIERTO en el repositorio
      cicloCosechaId = crypto.randomUUID();
      const ciclo = CicloProductivo.crear({
        id: cicloCosechaId,
        codigoCiclo: 'CICLO-2026-CER-028',
        loteId: loteCosechaId,
        cultivo: 'Cereza',
        variedad: 'Lapins',
        estado: 'ABIERTO',
        superficieCultivadaHa: 5.0,
        fechaInicio: '2026-08-01',
      });
      await ciclosRepo.guardar(ciclo);
    });

    it('POST /api/v1/cosechas debe registrar una cosecha, asignar código algorítmico y responder 201 Created (RF-M5-01 / RN-07 / RN-08)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/cosechas',
        payload: {
          loteId: loteCosechaId,
          cicloId: cicloCosechaId,
          fecha: '2026-09-20',
          cantidadCosechadaKg: 2000,
          cantidadComercializableKg: 1750,
          cantidadDescarteKg: 250,
          motivoDescarte: 'CALIBRE_CHICO_Y_DANIO_MECANICO',
          observacionesCalidad: '18 Brix promedio, fruta firme',
          recipientes: [{ tipo: 'BIN', cantidad: 6 }],
          superficieCosechadaHa: 2.5,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.error).toBeNull();
      expect(body.timestamp).toBeDefined();

      const data = body.data;
      expect(data.id).toBeDefined();
      expect(data.codigoTrazabilidad).toBe('COS-L28-20260920-01');
      expect(data.loteId).toBe(loteCosechaId);
      expect(data.codigoLote).toBe('LOT-2026-00028');
      expect(data.cicloId).toBe(cicloCosechaId);
      expect(data.codigoCiclo).toBe('CICLO-2026-CER-028');
      expect(data.cantidadCosechadaKg).toBe(2000);
      expect(data.cantidadComercializableKg).toBe(1750);
      expect(data.cantidadDescarteKg).toBe(250);
      expect(data.porcentajeComercializable).toBe(87.5);
      expect(data.porcentajeDescarte).toBe(12.5);
      expect(data.motivoDescarte).toBe('CALIBRE_CHICO_Y_DANIO_MECANICO');
      expect(data.recipientes).toEqual([{ tipo: 'BIN', cantidad: 6 }]);
      expect(data.superficieCosechadaHa).toBe(2.5);
    });

    it('POST /api/v1/cosechas cosechas sucesivas en la misma fecha deben recibir secuencias correlativas (RN-08 / RF-M5-04)', async () => {
      // Cosecha 1
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/cosechas',
        payload: {
          loteId: loteCosechaId,
          cicloId: cicloCosechaId,
          fecha: '2026-09-20',
          cantidadCosechadaKg: 1000,
          cantidadComercializableKg: 900,
          cantidadDescarteKg: 100,
          motivoDescarte: 'PICAZON_PAJARO',
        },
      });
      expect(res1.statusCode).toBe(201);
      expect(JSON.parse(res1.body).data.codigoTrazabilidad).toBe('COS-L28-20260920-01');

      // Cosecha 2
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/cosechas',
        payload: {
          loteId: loteCosechaId,
          cicloId: cicloCosechaId,
          fecha: '2026-09-20',
          cantidadCosechadaKg: 800,
          cantidadComercializableKg: 800,
          cantidadDescarteKg: 0,
        },
      });
      expect(res2.statusCode).toBe(201);
      expect(JSON.parse(res2.body).data.codigoTrazabilidad).toBe('COS-L28-20260920-02');
    });

    it('POST /api/v1/cosechas debe fallar con HTTP 422 si la suma comercializable + descarte != total (RN-09)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/cosechas',
        payload: {
          loteId: loteCosechaId,
          cicloId: cicloCosechaId,
          fecha: '2026-09-20',
          cantidadCosechadaKg: 1000,
          cantidadComercializableKg: 700,
          cantidadDescarteKg: 200, // 700 + 200 = 900 != 1000
          motivoDescarte: 'DANIO',
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('DESGLOSE_COSECHA_INVALIDO');
    });

    it('POST /api/v1/cosechas debe fallar con HTTP 422 si descarte > 0 y falta motivoDescarte (RF-M5-02)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/cosechas',
        payload: {
          loteId: loteCosechaId,
          cicloId: cicloCosechaId,
          fecha: '2026-09-20',
          cantidadCosechadaKg: 1000,
          cantidadComercializableKg: 900,
          cantidadDescarteKg: 100,
          motivoDescarte: null,
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('COSECHA_INVALIDA');
    });

    it('GET /api/v1/cosechas debe listar cosechas registradas y filtrar por lote y ciclo', async () => {
      // Registrar 1 cosecha
      await app.inject({
        method: 'POST',
        url: '/api/v1/cosechas',
        payload: {
          loteId: loteCosechaId,
          cicloId: cicloCosechaId,
          fecha: '2026-09-20',
          cantidadCosechadaKg: 600,
          cantidadComercializableKg: 600,
          cantidadDescarteKg: 0,
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/cosechas?loteId=${loteCosechaId}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].codigoTrazabilidad).toBe('COS-L28-20260920-01');
    });

    it('GET /api/v1/cosechas/:id debe retornar la cosecha o 404 si no existe', async () => {
      const postRes = await app.inject({
        method: 'POST',
        url: '/api/v1/cosechas',
        payload: {
          loteId: loteCosechaId,
          cicloId: cicloCosechaId,
          fecha: '2026-09-20',
          cantidadCosechadaKg: 500,
          cantidadComercializableKg: 500,
          cantidadDescarteKg: 0,
        },
      });
      const id = JSON.parse(postRes.body).data.id;

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/cosechas/${id}`,
      });
      expect(getRes.statusCode).toBe(200);
      expect(JSON.parse(getRes.body).data.id).toBe(id);

      const notFoundRes = await app.inject({
        method: 'GET',
        url: `/api/v1/cosechas/${crypto.randomUUID()}`,
      });
      expect(notFoundRes.statusCode).toBe(404);
      expect(JSON.parse(notFoundRes.body).error.code).toBe('ENTITY_NOT_FOUND');
    });
  });

  // ============================================================================
  // AGRUL-029: Asignación de Destinos, Saldo Comercializable y Despachos BPA (Módulo 5)
  // ============================================================================
  describe('AGRUL-029: Asignación de Destinos, Saldo Comercializable y Despachos BPA', () => {
    let loteId: string;
    let cicloId: string;
    let cosechaId: string;
    let destinatarioEmpaqueId: string;
    let destinatarioIndustriaId: string;

    beforeEach(async () => {
      // 1. Crear Lote
      const loteRes = await app.inject({
        method: 'POST',
        url: '/api/v1/lotes',
        payload: {
          codigoLote: 'LOT-2026-00029',
          producto: 'Pera Williams Export',
          variedad: 'Williams',
          cantidadInicial: 5000,
          unidadMedida: 'KG',
        },
      });
      loteId = JSON.parse(loteRes.body).data.id;

      // 2. Crear Ciclo Productivo ABIERTO
      cicloId = crypto.randomUUID();
      const ciclo = CicloProductivo.crear({
        id: cicloId,
        codigoCiclo: 'CICLO-2026-PER-029',
        loteId,
        cultivo: 'Pera',
        variedad: 'Williams',
        estado: 'ABIERTO',
        superficieCultivadaHa: 8.0,
        fechaInicio: '2026-08-01',
      });
      await ciclosRepo.guardar(ciclo);

      // 3. Crear Cosecha: 3000 kg total, 2500 kg comercializable, 500 kg descarte
      const cosechaRes = await app.inject({
        method: 'POST',
        url: '/api/v1/cosechas',
        payload: {
          loteId,
          cicloId,
          fecha: '2026-09-20',
          cantidadCosechadaKg: 3000,
          cantidadComercializableKg: 2500,
          cantidadDescarteKg: 500,
          motivoDescarte: 'CALIBRE_DEFICITARIO_Y_GOLPE',
        },
      });
      cosechaId = JSON.parse(cosechaRes.body).data.id;

      // 4. Crear Destinatarios en el catálogo (RF-M5-08)
      const dest1Res = await app.inject({
        method: 'POST',
        url: '/api/v1/destinatarios',
        payload: {
          nombre: 'Empaque y Exportación Patagonia Frut S.A.',
          tipo: 'EMPAQUE',
          cuit: '30-71456789-3',
          direccion: 'Parque Industrial Lote 12',
          localidad: 'Villa Regina',
          provincia: 'Río Negro',
        },
      });
      destinatarioEmpaqueId = JSON.parse(dest1Res.body).data.id;

      const dest2Res = await app.inject({
        method: 'POST',
        url: '/api/v1/destinatarios',
        payload: {
          nombre: 'Industria Concentrados del Valle',
          tipo: 'INDUSTRIA',
          cuit: '30-65432198-1',
          localidad: 'Cinco Saltos',
          provincia: 'Río Negro',
        },
      });
      destinatarioIndustriaId = JSON.parse(dest2Res.body).data.id;
    });

    it('POST /api/v1/destinatarios y GET /api/v1/destinatarios deben gestionar el catálogo de compradores (RF-M5-08)', async () => {
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/v1/destinatarios?activo=true',
      });

      expect(listRes.statusCode).toBe(200);
      const body = JSON.parse(listRes.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);

      const empaque = body.data.find((d: any) => d.id === destinatarioEmpaqueId);
      expect(empaque).toBeDefined();
      expect(empaque.nombre).toBe('Empaque y Exportación Patagonia Frut S.A.');
      expect(empaque.tipo).toBe('EMPAQUE');
      expect(empaque.activo).toBe(true);
    });

    it('POST /api/v1/cosechas/:id/despachos debe registrar envío con actualización inmediata del saldo remanente (RF-M5-07 / RF-M5-09 / RF-M5-10)', async () => {
      // Despacho de 1500 kg de los 2500 kg comercializables
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/cosechas/${cosechaId}/despachos`,
        payload: {
          destinatarioId: destinatarioEmpaqueId,
          tipoDestino: 'EMPAQUE',
          cantidadEnviadaKg: 1500,
          fecha: '2026-09-22',
          nroGuiaRemito: 'REM-0002-00012345',
          renspaFinca: '16.023.0.00142/00',
          productor: 'Frutícola Patagónica S.R.L.',
          precinto: 'PREC-ARG-9901',
          chofer: 'Juan Carlos Pereyra',
          patenteCamion: 'AD 123 CD',
          temperaturaTransporteC: 3.5,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.error).toBeNull();

      // Datos del despacho
      const despacho = body.data.despacho;
      expect(despacho.id).toBeDefined();
      expect(despacho.cosechaId).toBe(cosechaId);
      expect(despacho.destinatarioId).toBe(destinatarioEmpaqueId);
      expect(despacho.cantidadEnviadaKg).toBe(1500);
      expect(despacho.nroGuiaRemito).toBe('REM-0002-00012345');
      expect(despacho.renspaFinca).toBe('16.023.0.00142/00');
      expect(despacho.productor).toBe('Frutícola Patagónica S.R.L.');

      // Métricas de saldo calculadas en tiempo real (RF-M5-09)
      const saldo = body.data.saldo;
      expect(saldo.cosechaId).toBe(cosechaId);
      expect(saldo.cantidadComercializableKg).toBe(2500);
      expect(saldo.totalDespachadoKg).toBe(1500);
      expect(saldo.saldoRemanenteKg).toBe(1000);
      expect(saldo.porcentajeDespachado).toBe(60);
    });

    it('POST /api/v1/despachos debe permitir despachos sucesivos deduciendo acumulativamente el saldo (RF-M5-07 / RF-M5-09)', async () => {
      // Envío 1: 1500 kg
      await app.inject({
        method: 'POST',
        url: '/api/v1/despachos',
        payload: {
          cosechaId,
          destinatarioId: destinatarioEmpaqueId,
          tipoDestino: 'EMPAQUE',
          cantidadEnviadaKg: 1500,
          fecha: '2026-09-22',
          nroGuiaRemito: 'REM-0002-00012346',
          renspaFinca: '16.023.0.00142/00',
          productor: 'Frutícola Patagónica S.R.L.',
        },
      });

      // Envío 2: 1000 kg (agota el saldo comercializable de 2500 kg)
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/despachos',
        payload: {
          cosechaId,
          destinatarioId: destinatarioIndustriaId,
          tipoDestino: 'INDUSTRIA',
          cantidadEnviadaKg: 1000,
          fecha: '2026-09-23',
          nroGuiaRemito: 'REM-0002-00012347',
          renspaFinca: '16.023.0.00142/00',
          productor: 'Frutícola Patagónica S.R.L.',
        },
      });

      expect(res2.statusCode).toBe(201);
      const body2 = JSON.parse(res2.body);
      expect(body2.data.saldo.totalDespachadoKg).toBe(2500);
      expect(body2.data.saldo.saldoRemanenteKg).toBe(0);
      expect(body2.data.saldo.porcentajeDespachado).toBe(100);
      expect(body2.data.saldo.despachos).toHaveLength(2);
    });

    it('POST /api/v1/despachos debe rechazar con HTTP 422 si se intenta despachar más del saldo comercializable (RN-09)', async () => {
      // Comercializable: 2500 kg. Intento de enviar 2600 kg.
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/despachos',
        payload: {
          cosechaId,
          destinatarioId: destinatarioEmpaqueId,
          tipoDestino: 'EMPAQUE',
          cantidadEnviadaKg: 2600,
          fecha: '2026-09-22',
          nroGuiaRemito: 'REM-0002-00012348',
          renspaFinca: '16.023.0.00142/00',
          productor: 'Frutícola Patagónica S.R.L.',
        },
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('SALDO_COMERCIALIZABLE_EXCEDIDO');
      expect(body.error.message).toContain('Saldo comercializable insuficiente');
    });

    it('POST /api/v1/despachos debe rechazar con HTTP 400 si faltan datos requeridos por BPA (RF-M5-10)', async () => {
      // Omisión de nroGuiaRemito y renspaFinca
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/despachos',
        payload: {
          cosechaId,
          destinatarioId: destinatarioEmpaqueId,
          tipoDestino: 'EMPAQUE',
          cantidadEnviadaKg: 500,
          fecha: '2026-09-22',
          // nroGuiaRemito omitido
          // renspaFinca omitido
          productor: 'Frutícola Patagónica S.R.L.',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('GET /api/v1/cosechas/:id/saldo debe reportar el balance en tiempo real (RF-M5-09)', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/v1/cosechas/${cosechaId}/despachos`,
        payload: {
          destinatarioId: destinatarioEmpaqueId,
          tipoDestino: 'EMPAQUE',
          cantidadEnviadaKg: 800,
          fecha: '2026-09-22',
          nroGuiaRemito: 'REM-0002-00012349',
          renspaFinca: '16.023.0.00142/00',
          productor: 'Frutícola Patagónica S.R.L.',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/cosechas/${cosechaId}/saldo`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.cosechaId).toBe(cosechaId);
      expect(body.data.cantidadComercializableKg).toBe(2500);
      expect(body.data.totalDespachadoKg).toBe(800);
      expect(body.data.saldoRemanenteKg).toBe(1700);
      expect(body.data.porcentajeDespachado).toBe(32);
      expect(body.data.despachos).toHaveLength(1);
    });

    it('GET /api/v1/despachos/:id debe retornar el detalle de un despacho o 404 si no existe', async () => {
      const postRes = await app.inject({
        method: 'POST',
        url: `/api/v1/cosechas/${cosechaId}/despachos`,
        payload: {
          destinatarioId: destinatarioEmpaqueId,
          tipoDestino: 'EXPORTACION',
          cantidadEnviadaKg: 400,
          fecha: '2026-09-22',
          nroGuiaRemito: 'REM-0002-00012350',
          renspaFinca: '16.023.0.00142/00',
          productor: 'Frutícola Patagónica S.R.L.',
        },
      });
      const despachoId = JSON.parse(postRes.body).data.despacho.id;

      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/despachos/${despachoId}`,
      });
      expect(getRes.statusCode).toBe(200);
      const body = JSON.parse(getRes.body);
      expect(body.data.id).toBe(despachoId);
      expect(body.data.nroGuiaRemito).toBe('REM-0002-00012350');

      const notFoundRes = await app.inject({
        method: 'GET',
        url: `/api/v1/despachos/${crypto.randomUUID()}`,
      });
      expect(notFoundRes.statusCode).toBe(404);
      expect(JSON.parse(notFoundRes.body).error.code).toBe('ENTITY_NOT_FOUND');
    });
  });
});




