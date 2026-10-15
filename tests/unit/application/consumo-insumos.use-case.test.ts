import { describe, it, expect, beforeEach } from 'vitest';
import { CalcularConsumoInsumosCicloUseCase } from '../../../src/application/use-cases/consumo-insumos.use-cases.js';
import { RegistrarAplicacionUseCase } from '../../../src/application/use-cases/aplicaciones.use-cases.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryAplicacionesRepository } from '../../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryActividadesRepository } from '../../mocks/in-memory-actividades.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { InsumoCatalogo } from '../../../src/core/domain/entities/insumo-catalogo.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { ActividadAgricola } from '../../../src/core/domain/entities/actividad-agricola.entity.js';
import { EntidadNoEncontradaError } from '../../../src/core/domain/errors/domain.error.js';

describe('Caso de Uso: CalcularConsumoInsumosCicloUseCase (AGRUL-027 / RF-M4-10 / RNF-03)', () => {
  let lotesRepo: InMemoryLotesRepository;
  let aplicacionesRepo: InMemoryAplicacionesRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let actividadesRepo: InMemoryActividadesRepository;
  let ciclosRepo: InMemoryCiclosRepository;
  let registrarAplicacionUseCase: RegistrarAplicacionUseCase;
  let calcularConsumoInsumosCicloUseCase: CalcularConsumoInsumosCicloUseCase;

  let loteId: string;
  let cicloId: string;
  let actividad1Id: string;
  let actividad2Id: string;
  let insumoUreaId: string;
  let insumoGlifosatoId: string;

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    aplicacionesRepo = new InMemoryAplicacionesRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();
    actividadesRepo = new InMemoryActividadesRepository();
    ciclosRepo = new InMemoryCiclosRepository();

    registrarAplicacionUseCase = new RegistrarAplicacionUseCase(
      aplicacionesRepo,
      actividadesRepo,
      lotesRepo,
      ciclosRepo,
      insumosRepo
    );

    calcularConsumoInsumosCicloUseCase = new CalcularConsumoInsumosCicloUseCase(
      ciclosRepo,
      aplicacionesRepo,
      insumosRepo
    );

    // 1. Crear Lote
    loteId = crypto.randomUUID();
    const lote = Lote.crear({
      id: loteId,
      codigoLote: 'LOT-2026-99001',
      producto: 'Arándano O\'Neal',
      variedad: 'O\'Neal',
      cantidadInicial: 10000,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote);

    // 2. Crear Ciclo Productivo con superficieCultivadaHa = 5.0
    cicloId = crypto.randomUUID();
    const ciclo = CicloProductivo.crear({
      id: cicloId,
      codigoCiclo: 'CICLO-2026-ARA-01',
      loteId,
      cultivo: 'Arándano',
      variedad: 'O\'Neal',
      estado: 'ABIERTO',
      superficieCultivadaHa: 5.0,
      fechaInicio: '2026-08-01',
    });
    await ciclosRepo.guardar(ciclo);

    // 3. Crear Actividades Agrícolas
    actividad1Id = crypto.randomUUID();
    const act1 = ActividadAgricola.registrar({
      id: actividad1Id,
      codigoActividad: 'ACT-2026-001',
      tipoActividadId: crypto.randomUUID(),
      loteId,
      cicloId,
      fechaHecho: '2026-08-10',
      usuarioCargaId: crypto.randomUUID(),
      superficieTrabajadaHa: 5.0,
    });
    await actividadesRepo.guardar(act1);

    actividad2Id = crypto.randomUUID();
    const act2 = ActividadAgricola.registrar({
      id: actividad2Id,
      codigoActividad: 'ACT-2026-002',
      tipoActividadId: crypto.randomUUID(),
      loteId,
      cicloId,
      fechaHecho: '2026-08-20',
      usuarioCargaId: crypto.randomUUID(),
      superficieTrabajadaHa: 5.0,
    });
    await actividadesRepo.guardar(act2);

    // 4. Crear Insumos en Catálogo
    insumoUreaId = crypto.randomUUID();
    const insumoUrea = InsumoCatalogo.crear({
      id: insumoUreaId,
      nombreComercial: 'Urea Granulada 46%',
      categoria: 'FERTILIZANTE',
      unidadMedidaId: 'KG',
      presentacion: 'Bolsa 50kg',
    });
    await insumosRepo.guardar(insumoUrea);

    insumoGlifosatoId = crypto.randomUUID();
    const insumoGlifosato = InsumoCatalogo.crear({
      id: insumoGlifosatoId,
      nombreComercial: 'Herbicida Total 48%',
      categoria: 'FITOSANITARIO',
      unidadMedidaId: 'L',
      presentacion: 'Bidón 20L',
      fichaFitosanitaria: {
        principioActivo: 'Glifosato 48%',
        periodoCarenciaDias: 14,
        periodoReingresoHoras: 24,
        nroRegistroSenasa: 'SENASA-12345',
      },
    });
    await insumosRepo.guardar(insumoGlifosato);
  });

  it('debe calcular correctamente el consumo acumulado total y por hectárea agrupado por insumo (RF-M4-10)', async () => {
    // Aplicación 1: 50 kg de Urea
    await registrarAplicacionUseCase.execute({
      actividadId: actividad1Id,
      loteId,
      cicloId,
      fecha: '2026-08-10',
      metodo: 'FERTIRRIEGO',
      motivo: 'Fertilización inicial de brotación',
      equipoAplicacion: 'Bomba de inyección dosificadora',
      lineas: [
        {
          insumoId: insumoUreaId,
          cantidadTotal: 50,
          unidadMedidaId: 'KG',
          dosisPorSuperficie: 10,
        },
      ],
    });

    // Aplicación 2: 25 kg de Urea y 10 L de Glifosato (Mezcla/Caldo)
    await registrarAplicacionUseCase.execute({
      actividadId: actividad2Id,
      loteId,
      cicloId,
      fecha: '2026-08-20',
      metodo: 'FOLIAR',
      motivo: 'Refuerzo nutricional y control de malezas',
      equipoAplicacion: 'Pulverizador de arrastre 2000L',
      lineas: [
        {
          insumoId: insumoUreaId,
          cantidadTotal: 25,
          unidadMedidaId: 'KG',
          dosisPorSuperficie: 5,
        },
        {
          insumoId: insumoGlifosatoId,
          cantidadTotal: 10,
          unidadMedidaId: 'L',
          dosisPorSuperficie: 2,
        },
      ],
    });

    const resultado = await calcularConsumoInsumosCicloUseCase.execute(cicloId);

    expect(resultado.cicloId).toBe(cicloId);
    expect(resultado.codigoCiclo).toBe('CICLO-2026-ARA-01');
    expect(resultado.loteId).toBe(loteId);
    expect(resultado.superficieCultivadaHa).toBe(5.0);
    expect(resultado.estadoCiclo).toBe('ABIERTO');
    expect(resultado.totalAplicaciones).toBe(2);
    expect(resultado.totalInsumosDistintos).toBe(2);
    expect(resultado.insumos).toHaveLength(2);

    // Urea: Total = 50 + 25 = 75 kg. Por ha = 75 / 5 = 15 kg/ha. En 2 aplicaciones.
    const itemUrea = resultado.insumos.find(i => i.insumoId === insumoUreaId);
    expect(itemUrea).toBeDefined();
    expect(itemUrea?.nombreComercial).toBe('Urea Granulada 46%');
    expect(itemUrea?.categoria).toBe('FERTILIZANTE');
    expect(itemUrea?.unidadMedidaId).toBe('KG');
    expect(itemUrea?.cantidadTotalConsumida).toBe(75);
    expect(itemUrea?.cantidadPorHectarea).toBe(15);
    expect(itemUrea?.numeroAplicaciones).toBe(2);

    // Glifosato: Total = 10 L. Por ha = 10 / 5 = 2 L/ha. En 1 aplicación.
    const itemGlifosato = resultado.insumos.find(i => i.insumoId === insumoGlifosatoId);
    expect(itemGlifosato).toBeDefined();
    expect(itemGlifosato?.nombreComercial).toBe('Herbicida Total 48%');
    expect(itemGlifosato?.categoria).toBe('FITOSANITARIO');
    expect(itemGlifosato?.unidadMedidaId).toBe('L');
    expect(itemGlifosato?.cantidadTotalConsumida).toBe(10);
    expect(itemGlifosato?.cantidadPorHectarea).toBe(2);
    expect(itemGlifosato?.numeroAplicaciones).toBe(1);

    // Ordenamiento: El insumo con mayor consumo total debe ser el primero
    expect(resultado.insumos[0].insumoId).toBe(insumoUreaId);
  });

  it('debe devolver métricas en cero cuando un ciclo productivo no tiene aplicaciones', async () => {
    const resultado = await calcularConsumoInsumosCicloUseCase.execute(cicloId);

    expect(resultado.cicloId).toBe(cicloId);
    expect(resultado.totalAplicaciones).toBe(0);
    expect(resultado.totalInsumosDistintos).toBe(0);
    expect(resultado.insumos).toEqual([]);
  });

  it('debe arrojar EntidadNoEncontradaError si el cicloId no existe', async () => {
    const fakeCicloId = crypto.randomUUID();

    await expect(calcularConsumoInsumosCicloUseCase.execute(fakeCicloId)).rejects.toThrow(
      EntidadNoEncontradaError
    );
  });

  it('debe aislar los consumos exclusivamente al ciclo consultado', async () => {
    // Registrar aplicación en ciclo 1
    await registrarAplicacionUseCase.execute({
      actividadId: actividad1Id,
      loteId,
      cicloId,
      fecha: '2026-08-10',
      metodo: 'FERTIRRIEGO',
      motivo: 'Abono base',
      equipoAplicacion: 'Bomba',
      lineas: [
        {
          insumoId: insumoUreaId,
          cantidadTotal: 40,
          unidadMedidaId: 'KG',
        },
      ],
    });

    // Crear otro ciclo en el mismo lote
    const ciclo2Id = crypto.randomUUID();
    const ciclo2 = CicloProductivo.crear({
      id: ciclo2Id,
      codigoCiclo: 'CICLO-2026-ARA-02',
      loteId,
      cultivo: 'Arándano',
      estado: 'ABIERTO',
      superficieCultivadaHa: 10.0,
      fechaInicio: '2026-09-01',
    });
    await ciclosRepo.guardar(ciclo2);

    const act3Id = crypto.randomUUID();
    const act3 = ActividadAgricola.registrar({
      id: act3Id,
      codigoActividad: 'ACT-2026-003',
      tipoActividadId: crypto.randomUUID(),
      loteId,
      cicloId: ciclo2Id,
      fechaHecho: '2026-09-10',
      usuarioCargaId: crypto.randomUUID(),
      superficieTrabajadaHa: 10.0,
    });
    await actividadesRepo.guardar(act3);

    // Registrar aplicación en ciclo 2
    await registrarAplicacionUseCase.execute({
      actividadId: act3Id,
      loteId,
      cicloId: ciclo2Id,
      fecha: '2026-09-10',
      metodo: 'FERTIRRIEGO',
      motivo: 'Abono ciclo 2',
      equipoAplicacion: 'Bomba',
      lineas: [
        {
          insumoId: insumoUreaId,
          cantidadTotal: 100,
          unidadMedidaId: 'KG',
        },
      ],
    });

    // Consultar ciclo 1: debe tener solo 40 kg (y 40 / 5 = 8 kg/ha)
    const resCiclo1 = await calcularConsumoInsumosCicloUseCase.execute(cicloId);
    expect(resCiclo1.totalAplicaciones).toBe(1);
    expect(resCiclo1.insumos[0].cantidadTotalConsumida).toBe(40);
    expect(resCiclo1.insumos[0].cantidadPorHectarea).toBe(8);

    // Consultar ciclo 2: debe tener 100 kg (y 100 / 10 = 10 kg/ha)
    const resCiclo2 = await calcularConsumoInsumosCicloUseCase.execute(ciclo2Id);
    expect(resCiclo2.totalAplicaciones).toBe(1);
    expect(resCiclo2.insumos[0].cantidadTotalConsumida).toBe(100);
    expect(resCiclo2.insumos[0].cantidadPorHectarea).toBe(10);
  });
});
