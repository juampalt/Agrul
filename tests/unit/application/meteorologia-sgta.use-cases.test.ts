import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryMeteorologiaRepository } from '../../mocks/in-memory-meteorologia.repository.js';
import { InMemoryEventosClimaticosRepository } from '../../mocks/in-memory-eventos-climaticos.repository.js';
import { InMemoryFincasRepository } from '../../mocks/in-memory-fincas.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { Finca } from '../../../src/core/domain/entities/finca.entity.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import {
  ConfirmarRegistroMeteorologicoUseCase,
  ConsultarObservacionesMeteorologicasUseCase,
  ConfirmarRegistroEventoUseCase,
  ConsultarEventosClimaticosUseCase,
} from '../../../src/application/use-cases/meteorologia-sgta.use-cases.js';
import {
  EntidadNoEncontradaError,
  ObservacionMeteorologicaDuplicadaError,
  EventoClimaticoAdversoInvalidoError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Casos de Uso Módulo 10 SGTA: Meteorología y Eventos Climáticos Adversos (CU67 - CU70)', () => {
  let meteorologiaRepo: InMemoryMeteorologiaRepository;
  let eventosClimaticosRepo: InMemoryEventosClimaticosRepository;
  let fincasRepo: InMemoryFincasRepository;
  let lotesRepo: InMemoryLotesRepository;

  let confirmarMeteoUC: ConfirmarRegistroMeteorologicoUseCase;
  let consultarMeteoUC: ConsultarObservacionesMeteorologicasUseCase;
  let confirmarEventoUC: ConfirmarRegistroEventoUseCase;
  let consultarEventosUC: ConsultarEventosClimaticosUseCase;

  const FINCA_ID = 'f0000000-0000-4000-8000-000000000001';
  const FINCA_OTRA_ID = 'f0000000-0000-4000-8000-000000000002';
  const LOTE_1_ID = 'l0000000-0000-4000-8000-000000000001';
  const LOTE_2_ID = 'l0000000-0000-4000-8000-000000000002';
  const LOTE_OTRA_FINCA_ID = 'l0000000-0000-4000-8000-000000000003';

  const HOY_REF = new Date('2026-10-27T14:00:00.000Z');

  beforeEach(async () => {
    meteorologiaRepo = new InMemoryMeteorologiaRepository();
    eventosClimaticosRepo = new InMemoryEventosClimaticosRepository();
    fincasRepo = new InMemoryFincasRepository();
    lotesRepo = new InMemoryLotesRepository();

    await fincasRepo.guardar(
      Finca.crear({
        id: FINCA_ID,
        nombre: 'Finca La Frontera Lules',
        localidad: 'Lules',
        departamento: 'Lules',
        provincia: 'Tucumán',
        superficieTotalHa: 150,
      })
    );

    await fincasRepo.guardar(
      Finca.crear({
        id: FINCA_OTRA_ID,
        nombre: 'Finca Los Nogales',
        localidad: 'Famaillá',
        departamento: 'Famaillá',
        provincia: 'Tucumán',
        superficieTotalHa: 80,
      })
    );

    await lotesRepo.guardar(
      Lote.crear({
        id: LOTE_1_ID,
        codigoLote: 'LOT-2026-00001',
        producto: 'Frutilla',
        variedad: 'San Andreas',
        cantidadInicial: 1000,
        unidadMedida: 'KG',
        fincaId: FINCA_ID,
      })
    );

    await lotesRepo.guardar(
      Lote.crear({
        id: LOTE_2_ID,
        codigoLote: 'LOT-2026-00002',
        producto: 'Arándano',
        variedad: 'Emerald',
        cantidadInicial: 1500,
        unidadMedida: 'KG',
        fincaId: FINCA_ID,
      })
    );

    await lotesRepo.guardar(
      Lote.crear({
        id: LOTE_OTRA_FINCA_ID,
        codigoLote: 'LOT-2026-00003',
        producto: 'Limón',
        variedad: 'Eureka',
        cantidadInicial: 2000,
        unidadMedida: 'KG',
        fincaId: FINCA_OTRA_ID,
      })
    );

    confirmarMeteoUC = new ConfirmarRegistroMeteorologicoUseCase(meteorologiaRepo, fincasRepo);
    consultarMeteoUC = new ConsultarObservacionesMeteorologicasUseCase(meteorologiaRepo, fincasRepo);
    confirmarEventoUC = new ConfirmarRegistroEventoUseCase(eventosClimaticosRepo, fincasRepo, lotesRepo);
    consultarEventosUC = new ConsultarEventosClimaticosUseCase(eventosClimaticosRepo);
  });

  describe('CU67: confirmarRegistroMeteorologico', () => {
    it('debe registrar exitosamente una observación meteorológica para una finca', async () => {
      const res = await confirmarMeteoUC.execute(
        {
          fincaId: FINCA_ID,
          fechaHoraObservacion: '2026-10-27T08:00:00.000Z',
          temperaturaC: 21.5,
          humedadRelativa: 65,
          precipitacionesMm: 0,
          observaciones: 'Cielo despejado sin viento',
        },
        HOY_REF
      );

      expect(res.id).toBeDefined();
      expect(res.fincaId).toBe(FINCA_ID);
      expect(res.temperaturaC).toBe(21.5);
      expect(res.humedadRelativa).toBe(65);
    });

    it('debe rechazar con EntidadNoEncontradaError si la finca no existe', async () => {
      await expect(
        confirmarMeteoUC.execute({
          fincaId: 'f9999999-9999-4999-8999-999999999999',
          fechaHoraObservacion: '2026-10-27T08:00:00.000Z',
          temperaturaC: 20,
          humedadRelativa: 50,
          precipitacionesMm: 0,
        })
      ).rejects.toThrow(EntidadNoEncontradaError);
    });

    it('debe rechazar por colisión horaria si ya existe un registro para la misma finca y fecha/hora (RN-28)', async () => {
      await confirmarMeteoUC.execute(
        {
          fincaId: FINCA_ID,
          fechaHoraObservacion: '2026-10-27T08:00:00.000Z',
          temperaturaC: 21.5,
          humedadRelativa: 65,
          precipitacionesMm: 0,
        },
        HOY_REF
      );

      await expect(
        confirmarMeteoUC.execute(
          {
            fincaId: FINCA_ID,
            fechaHoraObservacion: '2026-10-27T08:00:00.000Z',
            temperaturaC: 22.0,
            humedadRelativa: 60,
            precipitacionesMm: 2,
          },
          HOY_REF
        )
      ).rejects.toThrow(ObservacionMeteorologicaDuplicadaError);
    });
  });

  describe('CU68: consultarObservacionesMeteorologicas', () => {
    it('debe listar observaciones históricas de la finca filtradas por rango', async () => {
      await confirmarMeteoUC.execute(
        {
          fincaId: FINCA_ID,
          fechaHoraObservacion: '2026-10-25T10:00:00.000Z',
          temperaturaC: 19.0,
          humedadRelativa: 70,
          precipitacionesMm: 15,
        },
        HOY_REF
      );

      await confirmarMeteoUC.execute(
        {
          fincaId: FINCA_ID,
          fechaHoraObservacion: '2026-10-26T10:00:00.000Z',
          temperaturaC: 23.0,
          humedadRelativa: 55,
          precipitacionesMm: 0,
        },
        HOY_REF
      );

      const todas = await consultarMeteoUC.execute({ fincaId: FINCA_ID });
      expect(todas).toHaveLength(2);
      expect(todas[0].fechaHoraObservacion).toBe('2026-10-26T10:00:00.000Z');

      const filtradas = await consultarMeteoUC.execute({
        fincaId: FINCA_ID,
        fechaDesde: '2026-10-26T00:00:00.000Z',
      });
      expect(filtradas).toHaveLength(1);
      expect(filtradas[0].temperaturaC).toBe(23.0);
    });
  });

  describe('CU69: confirmarRegistroEvento (Siniestro Multilote)', () => {
    it('debe registrar un evento adverso afectando a múltiples lotes de la finca', async () => {
      const res = await confirmarEventoUC.execute(
        {
          fincaId: FINCA_ID,
          tipoEvento: 'GRANIZO',
          fecha: '2026-10-26',
          descripcion: 'Granizada fuerte sobre zona de frutillas y arándanos',
          lotesAfectados: [
            {
              loteId: LOTE_1_ID,
              descripcionDano: 'Daño en hojas y flores',
              superficieAfectadaHa: 1.2,
              porcentajeDano: 20,
            },
            {
              loteId: LOTE_2_ID,
              descripcionDano: 'Rotura de ramas finas',
              superficieAfectadaHa: 0.5,
              porcentajeDano: 10,
            },
          ],
        },
        HOY_REF
      );

      expect(res.id).toBeDefined();
      expect(res.tipoEvento).toBe('GRANIZO');
      expect(res.lotesAfectados).toHaveLength(2);
      expect(res.lotesAfectados[0].loteId).toBe(LOTE_1_ID);
      expect(res.lotesAfectados[1].loteId).toBe(LOTE_2_ID);
    });

    it('debe rechazar si un lote afectado pertenece a otra finca', async () => {
      await expect(
        confirmarEventoUC.execute(
          {
            fincaId: FINCA_ID,
            tipoEvento: 'HELADA',
            fecha: '2026-10-26',
            descripcion: 'Helada general',
            lotesAfectados: [
              {
                loteId: LOTE_OTRA_FINCA_ID,
                descripcionDano: 'Hojas heladas',
              },
            ],
          },
          HOY_REF
        )
      ).rejects.toThrow(EventoClimaticoAdversoInvalidoError);
    });
  });

  describe('CU70: consultarEventosClimaticos', () => {
    it('debe listar y filtrar eventos adversos por lote y período', async () => {
      await confirmarEventoUC.execute(
        {
          fincaId: FINCA_ID,
          tipoEvento: 'GRANIZO',
          fecha: '2026-10-20',
          descripcion: 'Tormenta 1',
          lotesAfectados: [{ loteId: LOTE_1_ID, descripcionDano: 'Daño leve' }],
        },
        HOY_REF
      );

      await confirmarEventoUC.execute(
        {
          fincaId: FINCA_ID,
          tipoEvento: 'HELADA',
          fecha: '2026-10-25',
          descripcion: 'Tormenta 2',
          lotesAfectados: [{ loteId: LOTE_2_ID, descripcionDano: 'Daño severo' }],
        },
        HOY_REF
      );

      const eventosLote1 = await consultarEventosUC.execute({ loteId: LOTE_1_ID });
      expect(eventosLote1).toHaveLength(1);
      expect(eventosLote1[0].tipoEvento).toBe('GRANIZO');

      const eventosHelada = await consultarEventosUC.execute({ tipoEvento: 'HELADA' });
      expect(eventosHelada).toHaveLength(1);
      expect(eventosHelada[0].tipoEvento).toBe('HELADA');
    });
  });
});
