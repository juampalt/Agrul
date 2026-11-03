import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryFincasRepository } from '../mocks/in-memory-fincas.repository.js';
import { InMemoryMeteorologiaRepository } from '../mocks/in-memory-meteorologia.repository.js';
import { InMemoryEventosClimaticosRepository } from '../mocks/in-memory-eventos-climaticos.repository.js';
import { Finca } from '../../src/core/domain/entities/finca.entity.js';
import { Lote } from '../../src/core/domain/entities/lote.entity.js';

describe('Integration Tests: Módulo 10 SGTA — Meteorología y Eventos Adversos (CU67 - CU70)', () => {
  let app: FastifyInstance;
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let fincasRepo: InMemoryFincasRepository;
  let meteorologiaRepo: InMemoryMeteorologiaRepository;
  let eventosClimaticosRepo: InMemoryEventosClimaticosRepository;

  const FINCA_ID = '10000000-0000-4000-8000-000000000001';
  const OTRA_FINCA_ID = '10000000-0000-4000-8000-000000000002';
  const LOTE_1_ID = '20000000-0000-4000-8000-000000000001';
  const LOTE_2_ID = '20000000-0000-4000-8000-000000000002';
  const LOTE_OTRA_FINCA_ID = '20000000-0000-4000-8000-000000000003';

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();
    fincasRepo = new InMemoryFincasRepository();
    meteorologiaRepo = new InMemoryMeteorologiaRepository();
    eventosClimaticosRepo = new InMemoryEventosClimaticosRepository();

    await fincasRepo.guardar(
      Finca.crear({
        id: FINCA_ID,
        nombre: 'Finca SGTA Lules',
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: 120,
      })
    );

    await fincasRepo.guardar(
      Finca.crear({
        id: OTRA_FINCA_ID,
        nombre: 'Finca Tafí Viejo',
        localidad: 'Tafí Viejo',
        departamento: 'Tafí Viejo',
        provincia: 'Tucumán',
        superficieTotalHa: 80,
      })
    );

    await lotesRepo.guardar(
      Lote.crear({
        id: LOTE_1_ID,
        codigoLote: 'LOT-2026-00010',
        producto: 'Frutilla',
        variedad: 'Camarosa',
        cantidadInicial: 2000,
        unidadMedida: 'KG',
        fincaId: FINCA_ID,
      })
    );

    await lotesRepo.guardar(
      Lote.crear({
        id: LOTE_2_ID,
        codigoLote: 'LOT-2026-00011',
        producto: 'Arándano',
        variedad: 'O’Neal',
        cantidadInicial: 1500,
        unidadMedida: 'KG',
        fincaId: FINCA_ID,
      })
    );

    await lotesRepo.guardar(
      Lote.crear({
        id: LOTE_OTRA_FINCA_ID,
        codigoLote: 'LOT-2026-00012',
        producto: 'Limón',
        variedad: 'Genova',
        cantidadInicial: 3000,
        unidadMedida: 'KG',
        fincaId: OTRA_FINCA_ID,
      })
    );

    app = buildApp({
      lotesRepo,
      eventosRepo,
      genealogiaRepo,
      fincasRepo,
      meteorologiaRepo,
      eventosClimaticosRepo,
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('CU67: POST /api/v1/meteorologia (confirmarRegistroMeteorologico)', () => {
    it('debe registrar una observación meteorológica exitosamente y responder 201 Created con Envelope', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/meteorologia',
        payload: {
          fincaId: FINCA_ID,
          fechaHoraObservacion: '2026-10-25T09:00:00.000Z',
          temperaturaC: 22.5,
          humedadRelativa: 60.0,
          precipitacionesMm: 0.0,
          observaciones: 'Viento calmo, visibilidad óptima',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.fincaId).toBe(FINCA_ID);
      expect(body.data.temperaturaC).toBe(22.5);
      expect(body.data.humedadRelativa).toBe(60.0);
      expect(body.error).toBeNull();
      expect(body.timestamp).toBeDefined();
    });

    it('debe rechazar con 400 Bad Request si la humedad es físicamente inválida (>100% o negativa, RN-28)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/meteorologia',
        payload: {
          fincaId: FINCA_ID,
          fechaHoraObservacion: '2026-10-25T09:00:00.000Z',
          temperaturaC: 22.5,
          humedadRelativa: 120.0, // Inválido
          precipitacionesMm: 0.0,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debe rechazar con 400 Bad Request si la lluvia es negativa (RN-28)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/meteorologia',
        payload: {
          fincaId: FINCA_ID,
          fechaHoraObservacion: '2026-10-25T09:00:00.000Z',
          temperaturaC: 22.5,
          humedadRelativa: 60.0,
          precipitacionesMm: -5.0, // Inválido
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });

    it('debe rechazar con 409 Conflict ante registros duplicados en la misma finca y fecha/hora (RN-28)', async () => {
      const payload = {
        fincaId: FINCA_ID,
        fechaHoraObservacion: '2026-10-25T11:00:00.000Z',
        temperaturaC: 24.0,
        humedadRelativa: 50.0,
        precipitacionesMm: 0.0,
      };

      const primerResp = await app.inject({
        method: 'POST',
        url: '/api/v1/meteorologia',
        payload,
      });
      expect(primerResp.statusCode).toBe(201);

      const segundoResp = await app.inject({
        method: 'POST',
        url: '/api/v1/meteorologia',
        payload,
      });
      expect(segundoResp.statusCode).toBe(409);
      const body = segundoResp.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('OBSERVACION_METEOROLOGICA_DUPLICADA');
    });

    it('debe responder 404 Not Found si la finca no existe', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/meteorologia',
        payload: {
          fincaId: '99999999-9999-4999-8999-999999999999',
          fechaHoraObservacion: '2026-10-25T09:00:00.000Z',
          temperaturaC: 20.0,
          humedadRelativa: 60.0,
          precipitacionesMm: 0.0,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('ENTITY_NOT_FOUND');
    });
  });

  describe('CU68: GET /api/v1/meteorologia', () => {
    it('debe devolver historial de observaciones de la finca con 200 OK y envelope', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/meteorologia',
        payload: {
          fincaId: FINCA_ID,
          fechaHoraObservacion: '2026-10-24T08:00:00.000Z',
          temperaturaC: 18.0,
          humedadRelativa: 75.0,
          precipitacionesMm: 10.0,
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/meteorologia',
        payload: {
          fincaId: FINCA_ID,
          fechaHoraObservacion: '2026-10-25T08:00:00.000Z',
          temperaturaC: 20.0,
          humedadRelativa: 70.0,
          precipitacionesMm: 0.0,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/meteorologia?fincaId=${FINCA_ID}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].fechaHoraObservacion).toBe('2026-10-25T08:00:00.000Z');
    });

    it('debe responder 400 Bad Request si no se especifica fincaId', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/meteorologia',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });
  });

  describe('CU69: POST /api/v1/eventos-climaticos (confirmarRegistroEvento Multilote)', () => {
    it('debe registrar un evento adverso afectando a múltiples parcelas con 201 Created', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/eventos-climaticos',
        payload: {
          fincaId: FINCA_ID,
          tipoEvento: 'GRANIZO',
          fecha: '2026-10-26',
          descripcion: 'Granizo mediano durante 10 minutos',
          lotesAfectados: [
            {
              loteId: LOTE_1_ID,
              descripcionDano: 'Pérdida de fruta madura',
              superficieAfectadaHa: 1.5,
              porcentajeDano: 30.0,
            },
            {
              loteId: LOTE_2_ID,
              descripcionDano: 'Rotura de brotes tiernos',
              superficieAfectadaHa: 0.8,
              porcentajeDano: 15.0,
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.tipoEvento).toBe('GRANIZO');
      expect(body.data.lotesAfectados).toHaveLength(2);
      expect(body.data.lotesAfectados[0].porcentajeDano).toBe(30.0);
    });

    it('debe rechazar con 422 Unprocessable Entity si un lote pertenece a otra finca', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/eventos-climaticos',
        payload: {
          fincaId: FINCA_ID,
          tipoEvento: 'HELADA',
          fecha: '2026-10-26',
          descripcion: 'Helada tardía',
          lotesAfectados: [
            {
              loteId: LOTE_OTRA_FINCA_ID,
              descripcionDano: 'Quemado de flores',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(422);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('EVENTO_CLIMATICO_ADVERSO_INVALIDO');
    });

    it('debe rechazar con 400 Bad Request si la lista de lotes afectados está vacía', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/eventos-climaticos',
        payload: {
          fincaId: FINCA_ID,
          tipoEvento: 'VIENTO_FUERTE',
          fecha: '2026-10-26',
          descripcion: 'Viento zonda',
          lotesAfectados: [],
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });
  });

  describe('CU70: GET /api/v1/eventos-climaticos', () => {
    it('debe listar eventos adversos y permitir filtrar por loteId y tipoEvento', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/eventos-climaticos',
        payload: {
          fincaId: FINCA_ID,
          tipoEvento: 'HELADA',
          fecha: '2026-10-20',
          descripcion: 'Helada leve',
          lotesAfectados: [
            { loteId: LOTE_1_ID, descripcionDano: 'Hojas afectadas' },
          ],
        },
      });

      await app.inject({
        method: 'POST',
        url: '/api/v1/eventos-climaticos',
        payload: {
          fincaId: FINCA_ID,
          tipoEvento: 'GRANIZO',
          fecha: '2026-10-25',
          descripcion: 'Granizo sector norte',
          lotesAfectados: [
            { loteId: LOTE_2_ID, descripcionDano: 'Fruta dañada' },
          ],
        },
      });

      const respLote1 = await app.inject({
        method: 'GET',
        url: `/api/v1/eventos-climaticos?loteId=${LOTE_1_ID}`,
      });
      expect(respLote1.statusCode).toBe(200);
      const body1 = respLote1.json();
      expect(body1.success).toBe(true);
      expect(body1.data).toHaveLength(1);
      expect(body1.data[0].tipoEvento).toBe('HELADA');

      const respTipo = await app.inject({
        method: 'GET',
        url: '/api/v1/eventos-climaticos?tipoEvento=GRANIZO',
      });
      expect(respTipo.statusCode).toBe(200);
      const body2 = respTipo.json();
      expect(body2.data).toHaveLength(1);
      expect(body2.data[0].tipoEvento).toBe('GRANIZO');
    });
  });
});
