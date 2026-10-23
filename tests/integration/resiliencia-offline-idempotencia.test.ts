import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryCosechasRepository } from '../mocks/in-memory-cosechas.repository.js';
import { InMemoryCiclosRepository } from '../mocks/in-memory-ciclos.repository.js';
import { Lote } from '../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../src/core/domain/entities/ciclo-productivo.entity.js';

describe('Integration Tests: Resiliencia Offline, Idempotencia y Sincronización Batch (AGRUL-049 / RNF-02, RN-11, RF-M9-06)', () => {
  let app: FastifyInstance;
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let cosechasRepo: InMemoryCosechasRepository;
  let ciclosRepo: InMemoryCiclosRepository;

  let lote: Lote;
  let ciclo: CicloProductivo;

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();
    cosechasRepo = new InMemoryCosechasRepository();
    ciclosRepo = new InMemoryCiclosRepository();

    lote = Lote.crear({
      id: crypto.randomUUID(),
      codigoLote: 'LOT-2026-00001',
      producto: 'Frutilla San Andreas',
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote);

    ciclo = CicloProductivo.crear({
      id: crypto.randomUUID(),
      codigoCiclo: 'CICLO-LULES-2026',
      loteId: lote.id,
      cultivo: 'Frutilla San Andreas',
      superficieCultivadaHa: 3.5,
      fechaInicio: '2026-05-01',
    });
    await ciclosRepo.guardar(ciclo);

    app = buildApp({
      lotesRepo,
      eventosRepo,
      genealogiaRepo,
      cosechasRepo,
      ciclosRepo,
    });

    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Entrega de Script Cliente de Resiliencia Offline', () => {
    it('debe servir el archivo offline-manager.js con headers adecuados', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/offline-manager.js',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/javascript');
      expect(response.body).toContain('AgrulOfflineManager');
      expect(response.body).toContain('window.AgrulOffline');
    });
  });

  describe('Idempotencia en Cosecha Rápida Móvil (RNF-02 / RN-11 / RF-M9-06)', () => {
    it('debe tolerar reintentos por cortes de red rural sin duplicar cosechas ni stock', async () => {
      const claveIdempotencia = 'idem-rural-lules-uuid-001';

      const payload = {
        loteId: lote.id,
        cicloId: ciclo.id,
        fecha: '2026-10-23',
        cantidadCosechadaKg: 520,
        cantidadComercializableKg: 500,
        cantidadDescarteKg: 20,
        observacionesCalidad: 'Cosecha recolectada en finca rural Lules con conectividad intermitente',
        claveIdempotencia,
      };

      // 1. Envío inicial (registro exitoso en servidor)
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/cosechas/rapida',
        payload,
      });

      expect(res1.statusCode).toBe(201);
      const body1 = res1.json();
      expect(body1.success).toBe(true);
      expect(body1.data.id).toBeDefined();
      expect(body1.data.claveIdempotencia).toBe(claveIdempotencia);
      expect(body1.data.cantidadComercializableKg).toBe(500);

      const cosechaOriginalId = body1.data.id;

      // 2. Reintento idéntico (simulando que el cliente perdió la conexión antes de recibir el 201)
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/cosechas/rapida',
        payload,
      });

      expect([200, 201]).toContain(res2.statusCode);
      const body2 = res2.json();
      expect(body2.success).toBe(true);
      expect(body2.data.id).toBe(cosechaOriginalId);
      expect(body2.data.claveIdempotencia).toBe(claveIdempotencia);

      // 3. Verificación de no-duplicación en persistencia
      const cosechasRegistradas = await cosechasRepo.listar();
      expect(cosechasRegistradas).toHaveLength(1);
      expect(cosechasRegistradas[0].id).toBe(cosechaOriginalId);
      expect(cosechasRegistradas[0].claveIdempotencia).toBe(claveIdempotencia);
    });

    it('debe aplicar idempotencia también en el formulario estándar de cosechas', async () => {
      const claveIdempotencia = 'idem-rural-lules-standard-002';

      const payload = {
        loteId: lote.id,
        cicloId: ciclo.id,
        fecha: '2026-10-23',
        cantidadCosechadaKg: 750,
        cantidadComercializableKg: 720,
        cantidadDescarteKg: 30,
        motivoDescarte: 'Fruta sobremadura',
        claveIdempotencia,
      };

      // Intento 1
      const res1 = await app.inject({
        method: 'POST',
        url: '/api/v1/cosechas',
        payload,
      });
      expect(res1.statusCode).toBe(201);
      const id1 = res1.json().data.id;

      // Reintento 2
      const res2 = await app.inject({
        method: 'POST',
        url: '/api/v1/cosechas',
        payload,
      });
      expect([200, 201]).toContain(res2.statusCode);
      expect(res2.json().data.id).toBe(id1);

      // Debe haber exactamente 1 registro para esta clave
      const cosechas = await cosechasRepo.listar();
      const conClave = cosechas.filter(c => c.claveIdempotencia === claveIdempotencia);
      expect(conClave).toHaveLength(1);
    });
  });

  describe('Sincronización Batch de Eventos Offline (POST /api/v1/eventos/sincronizar)', () => {
    const ACTOR_ID = 'a0000000-0000-4000-8000-000000000001';
    const UBICACION_ID = 'b0000000-0000-4000-8000-000000000001';

    it('debe procesar lote de eventos capturados fuera de línea y persistirlos', async () => {
      const payload = {
        dispositivoId: 'tablet-lules-01',
        eventos: [
          {
            idLocalTemporal: 'ev-offline-01',
            loteId: lote.id,
            actorId: ACTOR_ID,
            ubicacionId: UBICACION_ID,
            tipoEvento: 'COSECHA',
            timestampCapturaLocal: '2026-10-23T14:30:00.000Z',
            payloadEspecifico: { motivo: 'Inicio de monitoreo offline' },
          },
          {
            idLocalTemporal: 'ev-offline-02',
            loteId: lote.id,
            actorId: ACTOR_ID,
            ubicacionId: UBICACION_ID,
            tipoEvento: 'RECEPCION',
            timestampCapturaLocal: '2026-10-23T15:00:00.000Z',
            payloadEspecifico: { estadoFoliar: 'Óptimo', plagasDetectadas: 0 },
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/eventos/sincronizar',
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.dispositivoId).toBe('tablet-lules-01');
      expect(body.data.totalRecibidos).toBe(2);
      expect(body.data.insertados).toBe(2);
      expect(body.data.fallidos).toHaveLength(0);

      // Verificar que los eventos se encuentren en el repositorio
      const eventosEnLote = await eventosRepo.listarPorLote(lote.id);
      expect(eventosEnLote.length).toBeGreaterThanOrEqual(2);
      const e1 = eventosEnLote.find(e => e.actorId === ACTOR_ID && e.tipoEvento === 'COSECHA');
      expect(e1).toBeDefined();
      expect(e1?.timestampCapturaLocal).toBe('2026-10-23T14:30:00.000Z');
      expect(e1?.estadoSincronizacion).toBe('PENDIENTE_AUDITORIA_OFFLINE');
    });

    it('debe reportar errores individuales en ítems inválidos sin abortar el batch', async () => {
      const payload = {
        dispositivoId: 'rugged-phone-02',
        eventos: [
          {
            idLocalTemporal: 'ev-valido',
            loteId: lote.id,
            actorId: ACTOR_ID,
            ubicacionId: UBICACION_ID,
            tipoEvento: 'COSECHA',
            timestampCapturaLocal: '2026-10-23T16:00:00.000Z',
            payloadEspecifico: {},
          },
          {
            idLocalTemporal: 'ev-invalido',
            loteId: lote.id,
            actorId: ACTOR_ID,
            ubicacionId: UBICACION_ID,
            tipoEvento: 'TIPO_DESCONOCIDO_INVALIDO',
            timestampCapturaLocal: '2026-10-23T16:05:00.000Z',
            payloadEspecifico: {},
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/eventos/sincronizar',
        payload,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.totalRecibidos).toBe(2);
      expect(body.data.insertados).toBe(1);
      expect(body.data.fallidos).toHaveLength(1);
      expect(body.data.fallidos).toContain('ev-invalido');
    });
  });
});
