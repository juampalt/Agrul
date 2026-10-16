import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryPerdidasCosechaRepository } from '../../mocks/in-memory-perdidas-cosecha.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { InMemoryCosechasRepository } from '../../mocks/in-memory-cosechas.repository.js';
import {
  RegistrarPerdidaCosechaUseCase,
  ListarPerdidasCosechaUseCase,
  ObtenerPerdidaCosechaPorIdUseCase,
} from '../../../src/application/use-cases/perdidas-cosecha.use-cases.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { Cosecha } from '../../../src/core/domain/entities/cosecha.entity.js';
import {
  EntidadNoEncontradaError,
  InconsistenciaLoteCicloError,
  CosechaInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Casos de Uso: Pérdidas e Incidentes Climáticos (AGRUL-030 / RF-M5-14)', () => {
  let perdidasRepo: InMemoryPerdidasCosechaRepository;
  let lotesRepo: InMemoryLotesRepository;
  let ciclosRepo: InMemoryCiclosRepository;
  let cosechasRepo: InMemoryCosechasRepository;

  let registrarUC: RegistrarPerdidaCosechaUseCase;
  let listarUC: ListarPerdidasCosechaUseCase;
  let obtenerUC: ObtenerPerdidaCosechaPorIdUseCase;

  const hoyRef = new Date('2026-10-15T12:00:00Z');

  let lote1: Lote;
  let ciclo1: CicloProductivo;
  let cosecha1: Cosecha;

  beforeEach(async () => {
    perdidasRepo = new InMemoryPerdidasCosechaRepository();
    lotesRepo = new InMemoryLotesRepository();
    ciclosRepo = new InMemoryCiclosRepository();
    cosechasRepo = new InMemoryCosechasRepository();

    registrarUC = new RegistrarPerdidaCosechaUseCase(perdidasRepo, lotesRepo, ciclosRepo, cosechasRepo);
    listarUC = new ListarPerdidasCosechaUseCase(perdidasRepo, lotesRepo, ciclosRepo, cosechasRepo);
    obtenerUC = new ObtenerPerdidaCosechaPorIdUseCase(perdidasRepo, lotesRepo, ciclosRepo, cosechasRepo);

    lote1 = Lote.crear({
      id: crypto.randomUUID(),
      codigoLote: 'LOT-2026-001',
      producto: 'Pera Williams',
      cantidadInicial: 5000,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote1);

    ciclo1 = CicloProductivo.crear({
      id: crypto.randomUUID(),
      codigoCiclo: 'CICLO-2026-PERAS-01',
      loteId: lote1.id,
      cultivo: 'Pera Williams',
      superficieCultivadaHa: 10,
      fechaInicio: '2026-08-01',
    });
    await ciclosRepo.guardar(ciclo1);

    cosecha1 = Cosecha.crear({
      id: crypto.randomUUID(),
      codigoTrazabilidad: 'COS-L01-20260920-01',
      loteId: lote1.id,
      cicloId: ciclo1.id,
      fecha: '2026-09-20',
      cantidadCosechadaKg: 2000,
      cantidadComercializableKg: 1800,
      cantidadDescarteKg: 200,
      motivoDescarte: 'CALIBRE',
      fechaReferenciaHoy: hoyRef,
    });
    await cosechasRepo.guardar(cosecha1);
  });

  describe('RegistrarPerdidaCosechaUseCase', () => {
    it('debe registrar exitosamente una pérdida asociada a un lote y ciclo', async () => {
      const output = await registrarUC.execute(
        {
          loteId: lote1.id,
          cicloId: ciclo1.id,
          fecha: '2026-10-05',
          tipo: 'GRANIZO',
          cantidadEstimadaKg: 1500,
          superficieAfectadaHa: 2.5,
          descripcion: 'Tormenta de granizo causó caída masiva de frutos.',
        },
        hoyRef
      );

      expect(output.id).toBeDefined();
      expect(output.codigoLote).toBe('LOT-2026-001');
      expect(output.codigoCiclo).toBe('CICLO-2026-PERAS-01');
      expect(output.tipo).toBe('GRANIZO');
      expect(output.cantidadEstimadaKg).toBe(1500);

      const enRepo = await perdidasRepo.buscarPorId(output.id);
      expect(enRepo).not.toBeNull();
      expect(enRepo?.descripcion).toContain('Tormenta de granizo');
    });

    it('debe registrar una pérdida vinculada a una cosecha específica', async () => {
      const output = await registrarUC.execute(
        {
          cosechaId: cosecha1.id,
          loteId: lote1.id,
          cicloId: ciclo1.id,
          fecha: '2026-09-21',
          tipo: 'ROBO',
          cantidadEstimadaKg: 250,
          descripcion: 'Sustracción nocturna de cajones cosechados en pie de lote.',
        },
        hoyRef
      );

      expect(output.cosechaId).toBe(cosecha1.id);
      expect(output.codigoTrazabilidadCosecha).toBe('COS-L01-20260920-01');
      expect(output.tipo).toBe('ROBO');
    });

    it('debe fallar si el lote no existe', async () => {
      await expect(
        registrarUC.execute({
          loteId: crypto.randomUUID(),
          fecha: '2026-10-01',
          tipo: 'HELADA',
          cantidadEstimadaKg: 100,
          descripcion: 'Helada',
        })
      ).rejects.toThrow(EntidadNoEncontradaError);
    });

    it('debe fallar si el ciclo productivo no corresponde al lote', async () => {
      const loteOtro = Lote.crear({
        id: crypto.randomUUID(),
        codigoLote: 'LOT-2026-002',
        producto: 'Manzana Gala',
        cantidadInicial: 2000,
        unidadMedida: 'KG',
      });
      await lotesRepo.guardar(loteOtro);

      await expect(
        registrarUC.execute({
          loteId: loteOtro.id,
          cicloId: ciclo1.id, // Pertenece a lote1
          fecha: '2026-10-01',
          tipo: 'HELADA',
          cantidadEstimadaKg: 100,
          descripcion: 'Helada',
        })
      ).rejects.toThrow(InconsistenciaLoteCicloError);
    });

    it('debe fallar si la cosecha vinculada no corresponde al lote', async () => {
      const loteOtro = Lote.crear({
        id: crypto.randomUUID(),
        codigoLote: 'LOT-2026-002',
        producto: 'Manzana Gala',
        cantidadInicial: 2000,
        unidadMedida: 'KG',
      });
      await lotesRepo.guardar(loteOtro);

      await expect(
        registrarUC.execute({
          cosechaId: cosecha1.id, // Pertenece a lote1
          loteId: loteOtro.id,
          fecha: '2026-10-01',
          tipo: 'HELADA',
          cantidadEstimadaKg: 100,
          descripcion: 'Helada',
        })
      ).rejects.toThrow(CosechaInvalidaError);
    });
  });

  describe('ListarPerdidasCosechaUseCase & ObtenerPerdidaCosechaPorIdUseCase', () => {
    it('debe listar y filtrar pérdidas correctamente', async () => {
      await registrarUC.execute(
        {
          loteId: lote1.id,
          fecha: '2026-10-01',
          tipo: 'HELADA',
          cantidadEstimadaKg: 400,
          descripcion: 'Helada 1',
        },
        hoyRef
      );

      await registrarUC.execute(
        {
          loteId: lote1.id,
          fecha: '2026-10-05',
          tipo: 'GRANIZO',
          cantidadEstimadaKg: 800,
          descripcion: 'Granizo 1',
        },
        hoyRef
      );

      const todas = await listarUC.execute();
      expect(todas).toHaveLength(2);

      const filtradasHelada = await listarUC.execute({ tipo: 'HELADA' });
      expect(filtradasHelada).toHaveLength(1);
      expect(filtradasHelada[0].tipo).toBe('HELADA');

      const porId = await obtenerUC.execute(filtradasHelada[0].id);
      expect(porId.id).toBe(filtradasHelada[0].id);
      expect(porId.cantidadEstimadaKg).toBe(400);
    });
  });
});
