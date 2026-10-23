import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryFincasRepository } from '../mocks/in-memory-fincas.repository.js';
import { InMemoryMedicionesClimaticasRepository } from '../mocks/in-memory-mediciones-climaticas.repository.js';
import { InMemoryEventosClimaticosAdversosRepository } from '../mocks/in-memory-eventos-climaticos-adversos.repository.js';
import { Finca } from '../../src/core/domain/entities/finca.entity.js';
import { Lote } from '../../src/core/domain/entities/lote.entity.js';
import { CodigoLote } from '../../src/core/domain/value-objects/codigo-lote.vo.js';

describe('Integration Tests: Contexto Climático, Siniestros y Serie Histórica (AGRUL-048 / RF-M10-07, RF-M10-10, RF-M10-11, RF-M10-12, RF-M10-13)', () => {
  let app: FastifyInstance;
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let fincasRepo: InMemoryFincasRepository;
  let climaRepo: InMemoryMedicionesClimaticasRepository;
  let eventosAdversosRepo: InMemoryEventosClimaticosAdversosRepository;

  const FINCA_ID = 'f0000000-0000-4000-8000-000000000001';
  const LOTE_ID = 'e0000000-0000-4000-8000-000000000001';

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();
    fincasRepo = new InMemoryFincasRepository();
    climaRepo = new InMemoryMedicionesClimaticasRepository();
    eventosAdversosRepo = new InMemoryEventosClimaticosAdversosRepository();

    await fincasRepo.guardar(
      Finca.crear({
        id: FINCA_ID,
        nombre: 'Finca San José de Lules',
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: 100,
        renspa: '23.001.0.00123/00',
      })
    );

    await lotesRepo.guardar(
      Lote.crear({
        id: LOTE_ID,
        codigoLote: CodigoLote.crear('LOT-2026-001'),
        producto: 'Frutilla',
        variedad: 'San Andreas',
        cantidadInicial: 2500,
        unidadMedida: 'KG',
        fincaId: FINCA_ID,
        superficieHa: 8.5,
      })
    );

    app = buildApp({
      lotesRepo,
      eventosRepo,
      genealogiaRepo,
      fincasRepo,
      medicionesClimaticasRepo: climaRepo,
      eventosClimaticosAdversosRepo: eventosAdversosRepo,
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/fincas/:id/clima-contexto (RF-M10-10)', () => {
    it('debe devolver contexto climático de la finca con evaluación de pulverización y sugerencia de riego', async () => {
      // Registrar medición del día
      await app.inject({
        method: 'POST',
        url: '/api/v1/clima/mediciones',
        payload: {
          fincaId: FINCA_ID,
          fecha: '2026-10-20',
          tempMinC: 14,
          tempMaxC: 24,
          precipitacionMm: 2,
          humedadRelativaPct: 60,
          vientoKmH: 10,
          fuenteDato: 'ESTACION_PROPIA',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/fincas/${FINCA_ID}/clima-contexto?fecha=2026-10-20`,
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data.fincaId).toBe(FINCA_ID);
      expect(json.data.fecha).toBe('2026-10-20');
      expect(json.data.aptoPulverizacion).toBe(true);
      expect(json.data.estadoPulverizacion).toBe('OPTIMO');
      expect(json.data.vientoKmH).toBe(10);
      expect(json.data.humedadRelativaPct).toBe(60);
      expect(json.data.lluviaUltimas24hMm).toBe(2);
      expect(json.data.sugerenciaRiego).toContain('Sin precipitaciones significativas');
    });

    it('debe advertir DESFAVORABLE ante viento crítico (> 20 km/h) por riesgo de deriva', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/v1/clima/mediciones',
        payload: {
          fincaId: FINCA_ID,
          fecha: '2026-10-21',
          tempMinC: 15,
          tempMaxC: 25,
          precipitacionMm: 0,
          humedadRelativaPct: 55,
          vientoKmH: 24, // Viento fuerte
          fuenteDato: 'ESTACION_PROPIA',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/fincas/${FINCA_ID}/clima-contexto?fecha=2026-10-21`,
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.data.aptoPulverizacion).toBe(false);
      expect(json.data.estadoPulverizacion).toBe('DESFAVORABLE');
      expect(json.data.advertencias.some((adv: string) => adv.includes('Viento fuerte'))).toBe(true);
    });
  });

  describe('POST /api/v1/clima/eventos-adversos (RF-M10-11)', () => {
    it('debe registrar un evento climático adverso (siniestro) con fotos y daño estimado', async () => {
      const payload = {
        fincaId: FINCA_ID,
        loteId: LOTE_ID,
        fecha: '2026-10-18',
        tipoSiniestro: 'GRANIZO',
        danoEstimadoPct: 45,
        superficieAfectadaHa: 5.5,
        fotosUrls: ['https://s3.agrul.com/evidencias/granizo-lote1.jpg'],
        descripcion: 'Tormenta severa de granizo con defoliación del 40% y rotura de flores.',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/clima/eventos-adversos',
        payload,
      });

      expect(response.statusCode).toBe(201);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data.id).toBeDefined();
      expect(json.data.tipoSiniestro).toBe('GRANIZO');
      expect(json.data.danoEstimadoPct).toBe(45);
      expect(json.data.superficieAfectadaHa).toBe(5.5);
      expect(json.data.fotosUrls).toHaveLength(1);
    });

    it('debe rechazar siniestros con porcentajes de daño fuera de rango (RF-M10-11)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/clima/eventos-adversos',
        payload: {
          fincaId: FINCA_ID,
          loteId: LOTE_ID,
          fecha: '2026-10-18',
          tipoSiniestro: 'HELADA',
          danoEstimadoPct: 150, // Inválido (> 100)
          descripcion: 'Helada',
        },
      });

      expect(response.statusCode).toBe(400);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(false);
    });
  });

  describe('GET /api/v1/clima/eventos-adversos y GET por ID', () => {
    it('debe listar y consultar siniestros registrados', async () => {
      // Registrar evento
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/clima/eventos-adversos',
        payload: {
          fincaId: FINCA_ID,
          loteId: LOTE_ID,
          fecha: '2026-10-10',
          tipoSiniestro: 'HELADA',
          danoEstimadoPct: 30,
          descripcion: 'Helada tardía de primavera',
        },
      });
      const created = JSON.parse(createRes.body).data;

      // Listar
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/clima/eventos-adversos?loteId=${LOTE_ID}`,
      });
      expect(listRes.statusCode).toBe(200);
      const listJson = JSON.parse(listRes.body);
      expect(listJson.data).toHaveLength(1);
      expect(listJson.data[0].id).toBe(created.id);

      // Obtener por ID
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/v1/clima/eventos-adversos/${created.id}`,
      });
      expect(getRes.statusCode).toBe(200);
      const getJson = JSON.parse(getRes.body);
      expect(getJson.data.descripcion).toBe('Helada tardía de primavera');
    });
  });

  describe('GET /api/v1/clima/lotes/:loteId/resumen-ciclo (RF-M10-12)', () => {
    it('debe devolver el resumen agro-meteorológico consolidado del ciclo', async () => {
      // Registrar dos mediciones meteorológicas
      await app.inject({
        method: 'POST',
        url: '/api/v1/clima/mediciones',
        payload: {
          fincaId: FINCA_ID,
          fecha: '2026-10-01',
          tempMinC: 10,
          tempMaxC: 22,
          precipitacionMm: 15,
          fuenteDato: 'ESTACION_PROPIA',
        },
      });
      await app.inject({
        method: 'POST',
        url: '/api/v1/clima/mediciones',
        payload: {
          fincaId: FINCA_ID,
          fecha: '2026-10-05',
          tempMinC: -1, // Helada
          tempMaxC: 18,
          precipitacionMm: 0,
          fuenteDato: 'ESTACION_PROPIA',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/clima/lotes/${LOTE_ID}/resumen-ciclo?fechaDesde=2026-10-01&fechaHasta=2026-10-10`,
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data.loteId).toBe(LOTE_ID);
      expect(json.data.lluviaAcumuladaMm).toBe(15);
      expect(json.data.diasConLluvia).toBe(1);
      expect(json.data.diasHelada).toBe(1);
      expect(json.data.tempMinimaAbsoluta).toBe(-1);
    });
  });

  describe('GET /api/v1/clima/lotes/:loteId/serie-historica (RF-M10-07 / RF-M10-13)', () => {
    it('debe devolver la serie temporal cronológica continua con hitos agrícolas y meteorológicos integrados', async () => {
      // Medición día 1
      await app.inject({
        method: 'POST',
        url: '/api/v1/clima/mediciones',
        payload: {
          fincaId: FINCA_ID,
          fecha: '2026-10-01',
          tempMinC: 12,
          tempMaxC: 25,
          precipitacionMm: 10,
          fuenteDato: 'ESTACION_PROPIA',
        },
      });

      // Medición día 2
      await app.inject({
        method: 'POST',
        url: '/api/v1/clima/mediciones',
        payload: {
          fincaId: FINCA_ID,
          fecha: '2026-10-02',
          tempMinC: 14,
          tempMaxC: 27,
          precipitacionMm: 20,
          fuenteDato: 'ESTACION_PROPIA',
        },
      });

      // Siniestro día 2
      await app.inject({
        method: 'POST',
        url: '/api/v1/clima/eventos-adversos',
        payload: {
          fincaId: FINCA_ID,
          loteId: LOTE_ID,
          fecha: '2026-10-02',
          tipoSiniestro: 'INUNDACION',
          danoEstimadoPct: 20,
          descripcion: 'Anhegamiento por lluvia torrencial',
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/clima/lotes/${LOTE_ID}/serie-historica?fechaDesde=2026-10-01&fechaHasta=2026-10-02`,
      });

      expect(response.statusCode).toBe(200);
      const json = JSON.parse(response.body);
      expect(json.success).toBe(true);
      expect(json.data.serieDiaria).toHaveLength(2);

      // Día 1
      expect(json.data.serieDiaria[0].fecha).toBe('2026-10-01');
      expect(json.data.serieDiaria[0].lluviaAcumuladaMm).toBe(10);

      // Día 2 (acumula lluvia y tiene siniestro)
      expect(json.data.serieDiaria[1].fecha).toBe('2026-10-02');
      expect(json.data.serieDiaria[1].lluviaAcumuladaMm).toBe(30);
      expect(json.data.serieDiaria[1].hitos).toHaveLength(1);
      expect(json.data.serieDiaria[1].hitos[0].tipo).toBe('SINIESTRO');
      expect(json.data.serieDiaria[1].hitos[0].titulo).toContain('INUNDACION');

      expect(json.data.resumen.lluviaAcumuladaMm).toBe(30);
    });
  });
});
