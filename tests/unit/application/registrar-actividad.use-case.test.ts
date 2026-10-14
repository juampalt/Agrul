import { describe, it, expect, beforeEach } from 'vitest';
import { RegistrarActividadEjecutadaUseCase } from '../../../src/application/use-cases/actividades-agricolas.use-cases.js';
import { InMemoryActividadesRepository } from '../../mocks/in-memory-actividades.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { InMemoryCatalogosActividadesRepository } from '../../mocks/in-memory-catalogos-actividades.repository.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { PersonalCuadrilla } from '../../../src/core/domain/entities/personal-cuadrilla.entity.js';
import { Maquinaria } from '../../../src/core/domain/entities/maquinaria.entity.js';
import {
  EntidadNoEncontradaError,
  InconsistenciaLoteCicloError,
  CicloNoAbiertoError,
  FechaFuturaInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Caso de Uso: RegistrarActividadEjecutadaUseCase (AGRUL-021)', () => {
  let actividadesRepo: InMemoryActividadesRepository;
  let lotesRepo: InMemoryLotesRepository;
  let ciclosRepo: InMemoryCiclosRepository;
  let catalogosRepo: InMemoryCatalogosActividadesRepository;
  let useCase: RegistrarActividadEjecutadaUseCase;

  let loteId: string;
  let cicloAbiertoId: string;
  let tipoActividadId: string;
  let tractorId: string;
  let cuadrillaId: string;
  const usuarioCargaId = crypto.randomUUID();

  beforeEach(async () => {
    actividadesRepo = new InMemoryActividadesRepository();
    lotesRepo = new InMemoryLotesRepository();
    ciclosRepo = new InMemoryCiclosRepository();
    catalogosRepo = new InMemoryCatalogosActividadesRepository();

    useCase = new RegistrarActividadEjecutadaUseCase(
      actividadesRepo,
      lotesRepo,
      ciclosRepo,
      catalogosRepo
    );

    // 1. Crear Lote
    loteId = crypto.randomUUID();
    const lote = Lote.crear({
      id: loteId,
      codigoLote: 'LOT-2026-ACT01',
      producto: 'Frutilla San Andreas',
      cantidadInicial: 5000,
      unidadMedida: 'KG',
      superficieHa: 4.5,
    });
    await lotesRepo.guardar(lote);

    // 2. Crear Ciclo Productivo ABIERTO
    cicloAbiertoId = crypto.randomUUID();
    const ciclo = CicloProductivo.crear({
      id: cicloAbiertoId,
      codigoCiclo: 'CICLO-2026-0001',
      loteId,
      cultivo: 'Frutilla',
      variedad: 'San Andreas',
      estado: 'ABIERTO',
      superficieCultivadaHa: 4.5,
      fechaInicio: '2026-03-01',
    });
    await ciclosRepo.guardar(ciclo);

    // 3. Obtener un tipo de actividad pre-cargado
    const tipos = await catalogosRepo.listarTiposActividad();
    tipoActividadId = tipos[0].id; // e.g. PREPARACION_SUELO

    // 4. Crear Maquinaria y Personal
    tractorId = crypto.randomUUID();
    await catalogosRepo.guardarMaquinaria(
      Maquinaria.crear({
        id: tractorId,
        identificacion: 'Tractor New Holland TT4.75',
        tipo: 'TRACTOR',
        condicion: 'PROPIO',
      })
    );

    cuadrillaId = crypto.randomUUID();
    await catalogosRepo.guardarPersonal(
      PersonalCuadrilla.crear({
        id: cuadrillaId,
        nombre: 'Cuadrilla de Poda y Cuidado',
        tipo: 'CUADRILLA',
      })
    );
  });

  it('RF-M3-02 / RF-M3-04: debe registrar labor ejecutada adoptando por defecto la superficie del ciclo si no se especifica', async () => {
    const result = await useCase.execute({
      tipoActividadId,
      loteId,
      cicloId: cicloAbiertoId,
      fechaHecho: '2026-10-10',
      usuarioCargaId,
      // superficieTrabajadaHa no se envía
      maquinarias: [
        { maquinariaId: tractorId, horasUso: 3 },
      ],
      manoDeObra: [
        {
          personalCuadrillaId: cuadrillaId,
          cantidadPersonas: 4,
          horasTrabajadas: 32,
          jornales: 4,
        },
      ],
    });

    expect(result.id).toBeDefined();
    expect(result.codigoActividad).toMatch(/^ACT-\d{4}-\d{5}$/);
    expect(result.loteId).toBe(loteId);
    expect(result.cicloId).toBe(cicloAbiertoId);
    expect(result.estado).toBe('REALIZADA');
    // Adopta la superficie del ciclo (4.5 ha)
    expect(result.superficieTrabajadaHa).toBe(4.5);
    // Maquinaria y mano de obra
    expect(result.maquinarias.length).toBe(1);
    expect(result.maquinarias[0].horasUso).toBe(3);
    expect(result.manoDeObra.length).toBe(1);
    expect(result.manoDeObra[0].jornales).toBe(4);
  });

  it('RF-M3-04: debe respetar la superficieTrabajadaHa especificada explícitamente', async () => {
    const result = await useCase.execute({
      tipoActividadId,
      loteId,
      cicloId: cicloAbiertoId,
      fechaHecho: '2026-10-10',
      usuarioCargaId,
      superficieTrabajadaHa: 2.0, // Parcial
    });

    expect(result.superficieTrabajadaHa).toBe(2.0);
  });

  it('RN-01: debe rechazar actividad si el ciclo productivo pertenece a otro lote', async () => {
    // Crear otro lote distinto
    const otroLoteId = crypto.randomUUID();
    const otroLote = Lote.crear({
      id: otroLoteId,
      codigoLote: 'LOT-2026-ACT99',
      producto: 'Arándano',
      cantidadInicial: 1000,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(otroLote);

    await expect(
      useCase.execute({
        tipoActividadId,
        loteId: otroLoteId, // Inconsistencia con cicloAbiertoId
        cicloId: cicloAbiertoId,
        fechaHecho: '2026-10-10',
        usuarioCargaId,
      })
    ).rejects.toThrowError(InconsistenciaLoteCicloError);
  });

  it('RN-03: debe rechazar actividad si el ciclo productivo está CERRADO o PLANIFICADO', async () => {
    // 1. Ciclo cerrado
    const cicloCerradoId = crypto.randomUUID();
    const cicloCerrado = CicloProductivo.crear({
      id: cicloCerradoId,
      codigoCiclo: 'CICLO-2026-CERR',
      loteId,
      cultivo: 'Frutilla',
      estado: 'CERRADO',
      superficieCultivadaHa: 4.5,
      fechaInicio: '2026-01-01',
      fechaFin: '2026-06-30',
    });
    await ciclosRepo.guardar(cicloCerrado);

    await expect(
      useCase.execute({
        tipoActividadId,
        loteId,
        cicloId: cicloCerradoId,
        fechaHecho: '2026-10-10',
        usuarioCargaId,
      })
    ).rejects.toThrowError(CicloNoAbiertoError);

    // 2. Ciclo planificado
    const cicloPlanificadoId = crypto.randomUUID();
    const cicloPlanificado = CicloProductivo.crear({
      id: cicloPlanificadoId,
      codigoCiclo: 'CICLO-2026-PLAN',
      loteId,
      cultivo: 'Frutilla',
      estado: 'PLANIFICADO',
      superficieCultivadaHa: 4.5,
      fechaInicio: '2026-11-01',
    });
    await ciclosRepo.guardar(cicloPlanificado);

    await expect(
      useCase.execute({
        tipoActividadId,
        loteId,
        cicloId: cicloPlanificadoId,
        fechaHecho: '2026-10-10',
        usuarioCargaId,
      })
    ).rejects.toThrowError(CicloNoAbiertoError);
  });

  it('RN-04: debe rechazar actividad con fechaHecho en el futuro', async () => {
    await expect(
      useCase.execute({
        tipoActividadId,
        loteId,
        cicloId: cicloAbiertoId,
        fechaHecho: '2099-12-31', // Fecha claramente futura
        usuarioCargaId,
      })
    ).rejects.toThrowError(FechaFuturaInvalidaError);
  });

  it('debe arrojar EntidadNoEncontradaError si el lote o ciclo no existen', async () => {
    await expect(
      useCase.execute({
        tipoActividadId,
        loteId: crypto.randomUUID(),
        cicloId: cicloAbiertoId,
        fechaHecho: '2026-10-10',
        usuarioCargaId,
      })
    ).rejects.toThrowError(EntidadNoEncontradaError);

    await expect(
      useCase.execute({
        tipoActividadId,
        loteId,
        cicloId: crypto.randomUUID(),
        fechaHecho: '2026-10-10',
        usuarioCargaId,
      })
    ).rejects.toThrowError(EntidadNoEncontradaError);
  });
});
