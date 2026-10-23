import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryFincasRepository } from '../mocks/in-memory-fincas.repository.js';
import { InMemoryMedicionesClimaticasRepository } from '../mocks/in-memory-mediciones-climaticas.repository.js';
import { Finca } from '../../src/core/domain/entities/finca.entity.js';

describe('Integration Tests: Clima y Agro-meteorología (AGRUL-046 / RF-M10-01, RF-M10-02, RF-M10-04, RF-M10-05, RF-M10-06)', () => {
  let app: FastifyInstance;
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let fincasRepo: InMemoryFincasRepository;
  let climaRepo: InMemoryMedicionesClimaticasRepository;

  const FINCA_ID = 'f0000000-0000-4000-8000-000000000001';

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();
    fincasRepo = new InMemoryFincasRepository();
    climaRepo = new InMemoryMedicionesClimaticasRepository();

    await fincasRepo.guardar(
      Finca.crear({
        id: FINCA_ID,
        nombre: 'Finca Lules Clima',
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: 100,
        renspa: '23.001.0.00123/00',
      })
    );

    app = buildApp({
      lotesRepo,
      eventosRepo,
      genealogiaRepo,
      fincasRepo,
      medicionesClimaticasRepo: climaRepo,
    });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/clima/mediciones (RF-M10-01, RF-M10-02, RF-M10-05)', () => {
    it('debe registrar una medición meteorológica diaria manual y responder 201 Created con envelope', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/clima/mediciones',
        payload: {
          fincaId: FINCA_ID,
          fecha: '2026-10-20',
          tempMinC: 13.0,
          tempMaxC: 26.5,
          precipitacionMm: 12.0,
          humedadRelativaPct: 75.0,
          vientoKmH: 15.0,
          huboHelada: false,
          huboGranizo: false,
          fuenteDato: 'ESTACION_PROPIA',
          observaciones: 'Lluvia matutina moderada',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.fincaId).toBe(FINCA_ID);
      expect(body.data.fecha).toBe('2026-10-20');
      expect(body.data.precipitacionMm).toBe(12.0);
      expect(body.data.tempMediaC).toBe(19.75); // (13 + 26.5) / 2
      expect(body.data.fuenteDato).toBe('ESTACION_PROPIA');
      expect(body.data.esCorreccion).toBe(false);
    });

    it('debe rechazar con 422 e MEDICION_CLIMATICA_INVALIDA si la precipitación es negativa (RF-M10-05)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/clima/mediciones',
        payload: {
          fincaId: FINCA_ID,
          fecha: '2026-10-20',
          tempMinC: 15.0,
          tempMaxC: 25.0,
          precipitacionMm: -10.0,
          fuenteDato: 'MEDICION_PROPIA',
        },
      });

      expect(response.statusCode).toBe(400); // Rechazado por Zod schema sintáctico o 422
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });

    it('debe rechazar con 422 e MEDICION_CLIMATICA_INVALIDA si la temperatura mínima supera a la máxima (RF-M10-05)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/clima/mediciones',
        payload: {
          fincaId: FINCA_ID,
          fecha: '2026-10-20',
          tempMinC: 30.0,
          tempMaxC: 18.0,
          precipitacionMm: 0,
          fuenteDato: 'MEDICION_PROPIA',
        },
      });

      expect(response.statusCode).toBe(422);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('MEDICION_CLIMATICA_INVALIDA');
      expect(body.error.message).toContain('Inconsistencia térmica');
    });

    it('debe rechazar con 422 si la fecha de la medición es futura (RN-04)', async () => {
      const fechaFutura = '2099-12-31';
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/clima/mediciones',
        payload: {
          fincaId: FINCA_ID,
          fecha: fechaFutura,
          precipitacionMm: 0,
          fuenteDato: 'MEDICION_PROPIA',
        },
      });

      expect(response.statusCode).toBe(422);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FECHA_FUTURA_INVALIDA');
    });
  });

  describe('POST /api/v1/clima/mediciones/:id/corregir (RF-M10-06 / RN-06)', () => {
    it('debe generar una corrección inmutable auditada con motivo obligatorio', async () => {
      // 1. Registro inicial
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/v1/clima/mediciones',
        payload: {
          fincaId: FINCA_ID,
          fecha: '2026-10-18',
          tempMinC: 14.0,
          tempMaxC: 25.0,
          precipitacionMm: 0,
          fuenteDato: 'MEDICION_PROPIA',
        },
      });
      const originalId = regRes.json().data.id;

      // 2. Corrección auditada
      const corrRes = await app.inject({
        method: 'POST',
        url: `/api/v1/clima/mediciones/${originalId}/corregir`,
        payload: {
          motivoCorreccion: 'Ajuste de pluviómetro: se detectó lectura retenida de 6.5mm',
          precipitacionMm: 6.5,
        },
      });

      expect(corrRes.statusCode).toBe(201);
      const corrBody = corrRes.json();
      expect(corrBody.success).toBe(true);
      expect(corrBody.data.id).not.toBe(originalId);
      expect(corrBody.data.esCorreccion).toBe(true);
      expect(corrBody.data.medicionOriginalId).toBe(originalId);
      expect(corrBody.data.precipitacionMm).toBe(6.5);
      expect(corrBody.data.motivoCorreccion).toContain('Ajuste de pluviómetro');
    });
  });

  describe('POST /api/v1/clima/importar-csv (RF-M10-04, RF-M10-05)', () => {
    it('debe importar archivo CSV por batch y devolver estadísticas de procesamiento', async () => {
      const csvData = `fecha,temp_min,temp_max,precipitacion,humedad,viento,fuente
2026-10-01,10.0,22.0,0.0,60,10,ESTACION_PROPIA
2026-10-02,11.5,23.0,15.5,80,18,ESTACION_PROPIA
2026-10-03,13.0,25.0,5.0,75,12,ESTACION_PROPIA`;

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/clima/importar-csv',
        payload: {
          fincaId: FINCA_ID,
          contenidoCsv: csvData,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.totalFilas).toBe(3);
      expect(body.data.filasImportadas).toBe(3);
      expect(body.data.filasFallidas).toBe(0);
      expect(body.data.mediciones).toHaveLength(3);
    });

    it('debe reportar errores por fila sin abortar las filas válidas', async () => {
      const csvData = `fecha,temp_min,temp_max,precipitacion,humedad
2026-10-08,12.0,24.0,10.0,70
2026-10-09,28.0,15.0,0.0,65`; // tempMin > tempMax (inconsistencia)

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/clima/importar-csv',
        payload: {
          fincaId: FINCA_ID,
          contenidoCsv: csvData,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.totalFilas).toBe(2);
      expect(body.data.filasImportadas).toBe(1);
      expect(body.data.filasFallidas).toBe(1);
      expect(body.data.errores[0].error).toContain('Inconsistencia térmica');
    });
  });

  describe('GET /api/v1/clima/mediciones y consultas (RF-M10-06)', () => {
    it('debe listar mediciones y permitir consultar el historial de versiones', async () => {
      // 1. Crear medición
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/clima/mediciones',
        payload: {
          fincaId: FINCA_ID,
          fecha: '2026-10-15',
          precipitacionMm: 2.0,
          fuenteDato: 'ESTACION_PROPIA',
        },
      });
      const medId = createRes.json().data.id;

      // 2. Corregir medición
      await app.inject({
        method: 'POST',
        url: `/api/v1/clima/mediciones/${medId}/corregir`,
        payload: {
          motivoCorreccion: 'Corrección de precipitación',
          precipitacionMm: 4.5,
        },
      });

      // 3. Listar vigentes
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/v1/clima/mediciones?fincaId=${FINCA_ID}&soloVigentes=true`,
      });

      expect(listRes.statusCode).toBe(200);
      const listBody = listRes.json();
      expect(listBody.data).toHaveLength(1);
      expect(listBody.data[0].precipitacionMm).toBe(4.5);

      // 4. Consultar historial de correcciones
      const histRes = await app.inject({
        method: 'GET',
        url: `/api/v1/clima/mediciones/${medId}/historial`,
      });

      expect(histRes.statusCode).toBe(200);
      const histBody = histRes.json();
      expect(histBody.data).toHaveLength(2);
    });
  });
});
