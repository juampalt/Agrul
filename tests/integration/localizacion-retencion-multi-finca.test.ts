import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { InMemoryLotesRepository } from '../mocks/in-memory-lotes.repository.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryFincasRepository } from '../mocks/in-memory-fincas.repository.js';
import { InMemoryCosechasRepository } from '../mocks/in-memory-cosechas.repository.js';
import { InMemoryCiclosRepository } from '../mocks/in-memory-ciclos.repository.js';
import { Lote } from '../../src/core/domain/entities/lote.entity.js';
import { Finca } from '../../src/core/domain/entities/finca.entity.js';
import { Cosecha } from '../../src/core/domain/entities/cosecha.entity.js';
import { CicloProductivo } from '../../src/core/domain/entities/ciclo-productivo.entity.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';
import { LocalizacionTucumanService } from '../../src/core/domain/services/localizacion-tucuman.service.js';

describe('Integration Tests: Localización Tucumán UTC-3, Retención BPA 3 Años y Multi-Finca (AGRUL-050 / RNF-12, RNF-06, RNF-16, RN-05)', () => {
  let app: FastifyInstance;
  let lotesRepo: InMemoryLotesRepository;
  let eventosRepo: InMemoryEventosRepository;
  let genealogiaRepo: InMemoryGenealogiaRepository;
  let fincasRepo: InMemoryFincasRepository;
  let cosechasRepo: InMemoryCosechasRepository;
  let ciclosRepo: InMemoryCiclosRepository;

  const FINCA_LULES_ID = '11111111-1111-4111-8111-111111111111';
  const FINCA_FAMAILLA_ID = '22222222-2222-4222-8222-222222222222';
  const ORG_TUCUMAN_ID = '33333333-3333-4333-8333-333333333333';
  const ORG_SALTA_ID = '44444444-4444-4444-8444-444444444444';

  let tokenEncargadoLules: string;
  let tokenAdminGlobal: string;
  let testLote: Lote;

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    eventosRepo = new InMemoryEventosRepository(lotesRepo);
    genealogiaRepo = new InMemoryGenealogiaRepository();
    fincasRepo = new InMemoryFincasRepository();
    cosechasRepo = new InMemoryCosechasRepository();
    ciclosRepo = new InMemoryCiclosRepository();

    // Registrar Fincas
    await fincasRepo.guardar(
      Finca.crear({
        id: FINCA_LULES_ID,
        nombre: 'Finca San Gabriel - Lules',
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: 80,
      })
    );

    await fincasRepo.guardar(
      Finca.crear({
        id: FINCA_FAMAILLA_ID,
        nombre: 'Finca Los Manantiales - Famaillá',
        localidad: 'Famaillá',
        departamento: 'Famaillá',
        provincia: 'Tucumán',
        superficieTotalHa: 120,
      })
    );

    // Lote de prueba
    testLote = Lote.crear({
      id: crypto.randomUUID(),
      codigoLote: 'LOT-2026-00099',
      producto: 'Frutilla San Andreas',
      cantidadInicial: 5000,
      unidadMedida: 'KG',
      fincaId: FINCA_LULES_ID,
    });
    await lotesRepo.guardar(testLote);

    const ciclo = CicloProductivo.crear({
      id: crypto.randomUUID(),
      codigoCiclo: 'CICLO-2026-LULES',
      loteId: testLote.id,
      cultivo: 'Frutilla',
      superficieCultivadaHa: 5,
      fechaInicio: '2026-04-01',
    });
    await ciclosRepo.guardar(ciclo);

    // Generar tokens de sesión
    tokenEncargadoLules = CryptoAuthService.generateToken({
      sub: 'usr-encargado-lules',
      email: 'encargado@lules.com',
      nombre: 'Carlos',
      apellido: 'Encargado',
      perfil: 'ENCARGADO',
      fincas: [FINCA_LULES_ID],
      organizacionId: ORG_TUCUMAN_ID,
      debeCambiarPassword: false,
    });

    tokenAdminGlobal = CryptoAuthService.generateToken({
      sub: 'usr-admin-global',
      email: 'admin@agrul.com',
      nombre: 'Administrador',
      apellido: 'Global',
      perfil: 'ADMINISTRADOR',
      fincas: [],
      organizacionId: ORG_TUCUMAN_ID,
      debeCambiarPassword: false,
    });

    app = buildApp({
      lotesRepo,
      eventosRepo,
      genealogiaRepo,
      fincasRepo,
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

  describe('RNF-12: Localización Oficial (Tucumán UTC-3) y Preservación de Fecha a las 23:30 hs', () => {
    it('GET /api/v1/localizacion/config debe responder 200 con la configuración oficial del sistema', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/localizacion/config',
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);

      expect(json.success).toBe(true);
      expect(json.data.zonaHoraria).toBe('America/Argentina/Tucuman');
      expect(json.data.offsetString).toBe('-03:00');
      expect(json.data.formatoFechaVisual).toBe('DD/MM/YYYY');
      expect(json.data.unidadesMetricasOficiales).toEqual({
        masa: 'kg',
        volumen: 'L',
        superficie: 'ha',
        temperatura: '°C',
        precipitacion: 'mm',
        velocidadViento: 'km/h',
      });
      expect(json.data.politicaRetencionMinimaAnosBPA).toBe(3);
      expect(json.data.borradoFisicoPermitido).toBe(false);
    });

    it('Toda respuesta HTTP debe incluir los encabezados X-Timezone, X-Timezone-Offset y X-Date-Format', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-timezone']).toBe('America/Argentina/Tucuman');
      expect(res.headers['x-timezone-offset']).toBe('-03:00');
      expect(res.headers['x-date-format']).toBe('DD/MM/YYYY');
    });

    it('Prueba de guardado a las 23:30 hs no altera la fecha del evento (RNF-12)', async () => {
      // Evento ocurrido a las 23:30 hs en Tucumán (UTC-3)
      // Representación ISO con offset: 2026-10-24T23:30:00-03:00
      const timestamp2330 = '2026-10-24T23:30:00-03:00';

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/lotes/${testLote.id}/eventos`,
        payload: {
          actorId: crypto.randomUUID(),
          ubicacionId: crypto.randomUUID(),
          tipoEvento: 'COSECHA',
          timestampCapturaLocal: timestamp2330,
          payloadEspecifico: { kilosCosechados: 1200 },
        },
      });

      expect(res.statusCode).toBe(201);
      const json = JSON.parse(res.body);

      expect(json.success).toBe(true);
      expect(json.data.timestampCapturaLocal).toBe(timestamp2330);

      // Verificamos que al extraer la fecha local en Tucumán corresponda exactamente al día 24/10/2026
      const fechaLocalExtraida = LocalizacionTucumanService.extraerFechaLocal(json.data.timestampCapturaLocal);
      expect(fechaLocalExtraida).toBe('2026-10-24');

      const fechaVisual = LocalizacionTucumanService.formatearFechaVisual(json.data.timestampCapturaLocal);
      expect(fechaVisual).toBe('24/10/2026');
    });
  });

  describe('RNF-06 / RN-05: Bloqueo de DELETE Físico y Retención de 3 Años BPA', () => {
    it('DELETE /api/v1/lotes/:id debe ser rechazado con 405 Method Not Allowed y código DELETE_FISICO_PROHIBIDO_BPA', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/lotes/${testLote.id}`,
      });

      expect(res.statusCode).toBe(405);
      const json = JSON.parse(res.body);

      expect(json.success).toBe(false);
      expect(json.error.code).toBe('DELETE_FISICO_PROHIBIDO_BPA');
      expect(json.error.message).toContain('retención mínima de 3 años obligatoria, RNF-06 / RN-05');
      expect(json.error.details.retencionMinimaAnos).toBe(3);
    });

    it('DELETE /api/v1/cosechas/:id debe ser rechazado con 405 Method Not Allowed', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/cosechas/${crypto.randomUUID()}`,
      });

      expect(res.statusCode).toBe(405);
      const json = JSON.parse(res.body);
      expect(json.error.code).toBe('DELETE_FISICO_PROHIBIDO_BPA');
    });

    it('DELETE /api/v1/actividades/:id debe ser rechazado con 405 Method Not Allowed', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/actividades/${crypto.randomUUID()}`,
      });

      expect(res.statusCode).toBe(405);
      const json = JSON.parse(res.body);
      expect(json.error.code).toBe('DELETE_FISICO_PROHIBIDO_BPA');
    });

    it('DELETE /api/v1/stock/movimientos/:id debe ser rechazado con 405 Method Not Allowed', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/stock/movimientos/${crypto.randomUUID()}`,
      });

      expect(res.statusCode).toBe(405);
      const json = JSON.parse(res.body);
      expect(json.error.code).toBe('DELETE_FISICO_PROHIBIDO_BPA');
    });

    it('DELETE /api/v1/clima/mediciones/:id debe ser rechazado con 405 Method Not Allowed', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/clima/mediciones/${crypto.randomUUID()}`,
      });

      expect(res.statusCode).toBe(405);
      const json = JSON.parse(res.body);
      expect(json.error.code).toBe('DELETE_FISICO_PROHIBIDO_BPA');
    });
  });

  describe('RNF-16: Aislamiento Estricto Multi-Finca y Soporte Multi-Organización', () => {
    it('Encargado asignado únicamente a Finca Lules puede consultar su propia finca (200 OK)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fincas/${FINCA_LULES_ID}`,
        headers: {
          authorization: `Bearer ${tokenEncargadoLules}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(FINCA_LULES_ID);
    });

    it('Encargado asignado a Finca Lules recibe 403 Forbidden al intentar acceder a Finca Famaillá (RF-M8-05 / RN-16)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/fincas/${FINCA_FAMAILLA_ID}`,
        headers: {
          authorization: `Bearer ${tokenEncargadoLules}`,
        },
      });

      expect(res.statusCode).toBe(403);
      const json = JSON.parse(res.body);
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('ACCESO_DENEGADO_FINCA');
      expect(json.error.message).toContain('no tiene autorización para operar o consultar la finca');
    });

    it('Administrador Global tiene acceso irrestricto transversal a cualquier finca (RN-16)', async () => {
      const resLules = await app.inject({
        method: 'GET',
        url: `/api/v1/fincas/${FINCA_LULES_ID}`,
        headers: {
          authorization: `Bearer ${tokenAdminGlobal}`,
        },
      });
      expect(resLules.statusCode).toBe(200);

      const resFamailla = await app.inject({
        method: 'GET',
        url: `/api/v1/fincas/${FINCA_FAMAILLA_ID}`,
        headers: {
          authorization: `Bearer ${tokenAdminGlobal}`,
        },
      });
      expect(resFamailla.statusCode).toBe(200);
    });
  });
});
