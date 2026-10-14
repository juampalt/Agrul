import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';

describe('API Integration Tests (Fastify HTTP Surface)', () => {
  let app: FastifyInstance;
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();

    app = buildApp({
      lotesRepo,
      eventosRepo,
      genealogiaRepo,
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
});

