import { describe, it, expect, beforeEach } from 'vitest';
import { CalcularMetricasProduccionUseCase } from '../../../src/application/use-cases/calcular-metricas-produccion.use-case.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { InMemoryCosechasRepository } from '../../mocks/in-memory-cosechas.repository.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryActividadesRepository } from '../../mocks/in-memory-actividades.repository.js';
import { InMemoryCatalogosActividadesRepository } from '../../mocks/in-memory-catalogos-actividades.repository.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { Cosecha } from '../../../src/core/domain/entities/cosecha.entity.js';
import { CodigoTrazabilidadCosecha } from '../../../src/core/domain/value-objects/codigo-trazabilidad-cosecha.vo.js';
import { ActividadAgricola } from '../../../src/core/domain/entities/actividad-agricola.entity.js';
import { TipoActividad } from '../../../src/core/domain/entities/tipo-actividad.entity.js';
import { EntidadNoEncontradaError } from '../../../src/core/domain/errors/domain.error.js';

describe('Caso de Uso: CalcularMetricasProduccionUseCase (AGRUL-035 / RF-M7-01, RF-M7-02, RF-M7-07, RF-M7-08, RF-M7-09, RN-09)', () => {
  let ciclosRepo: InMemoryCiclosRepository;
  let cosechasRepo: InMemoryCosechasRepository;
  let lotesRepo: InMemoryLotesRepository;
  let actividadesRepo: InMemoryActividadesRepository;
  let catalogosRepo: InMemoryCatalogosActividadesRepository;
  let useCase: CalcularMetricasProduccionUseCase;

  const FINCA_1 = 'finca-valle-de-uco';
  const FINCA_2 = 'finca-maipu';

  let lote1: Lote;
  let lote2: Lote;
  let ciclo1: CicloProductivo;
  let ciclo2: CicloProductivo;
  let tipoRiego: TipoActividad;
  let tipoSanidad: TipoActividad;

  beforeEach(async () => {
    ciclosRepo = new InMemoryCiclosRepository();
    cosechasRepo = new InMemoryCosechasRepository();
    lotesRepo = new InMemoryLotesRepository();
    actividadesRepo = new InMemoryActividadesRepository();
    catalogosRepo = new InMemoryCatalogosActividadesRepository();

    useCase = new CalcularMetricasProduccionUseCase({
      lotesRepo,
      ciclosRepo,
      cosechasRepo,
      actividadesRepo,
      catalogosRepo,
    });

    // Lotes
    lote1 = Lote.crear({
      id: 'lote-1',
      codigoLote: 'LOT-2026-00001',
      fincaId: FINCA_1,
      superficieHa: 2.5,
      producto: 'Uva',
      variedad: 'Malbec',
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote1);

    lote2 = Lote.crear({
      id: 'lote-2',
      codigoLote: 'LOT-2026-00002',
      fincaId: FINCA_2,
      superficieHa: 4.0,
      producto: 'Uva',
      variedad: 'Cabernet Sauvignon',
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote2);

    // Ciclos Productivos
    ciclo1 = CicloProductivo.crear({
      id: 'ciclo-1',
      codigoCiclo: 'CICLO-2026-MALBEC-01',
      loteId: lote1.id,
      cultivo: 'Vid',
      variedad: 'Malbec',
      superficieCultivadaHa: 2.5,
      fechaInicio: '2025-09-01',
      plantasPlantadas: 10000,
      plantasVivas: 9200,
      plantasRepuestas: 300,
    });
    await ciclosRepo.guardar(ciclo1);

    ciclo2 = CicloProductivo.crear({
      id: 'ciclo-2',
      codigoCiclo: 'CICLO-2026-CAB-01',
      loteId: lote2.id,
      cultivo: 'Vid',
      variedad: 'Cabernet Sauvignon',
      superficieCultivadaHa: 4.0,
      fechaInicio: '2025-09-15',
    });
    await ciclosRepo.guardar(ciclo2);

    // Catálogos de actividades
    tipoRiego = TipoActividad.crear({
      id: 'tipo-riego-1',
      nombre: 'Riego por Goteo',
      categoria: 'RIEGO',
    });
    await catalogosRepo.guardarTipoActividad(tipoRiego);

    tipoSanidad = TipoActividad.crear({
      id: 'tipo-sanidad-1',
      nombre: 'Curación Preventiva',
      categoria: 'SANIDAD',
    });
    await catalogosRepo.guardarTipoActividad(tipoSanidad);
  });

  it('debe calcular correctamente el rendimiento por hectárea (bruto y comercializable) y el porcentaje de descarte (RN-09)', async () => {
    // Cosecha 1: 10,000 kg total, 9,500 comercializable, 500 descarte
    const c1 = Cosecha.crear({
      id: 'cos-1',
      codigoTrazabilidad: CodigoTrazabilidadCosecha.generar('LOT-2026-00001', '2026-03-10', 1),
      loteId: lote1.id,
      cicloId: ciclo1.id,
      fecha: '2026-03-10',
      cantidadCosechadaKg: 10000,
      cantidadComercializableKg: 9500,
      cantidadDescarteKg: 500,
      motivoDescarte: 'DESCARTE_TAMANO',
      superficieCosechadaHa: 2.5,
    });
    await cosechasRepo.guardar(c1);

    // Cosecha 2: 5,000 kg total, 4,500 comercializable, 500 descarte
    const c2 = Cosecha.crear({
      id: 'cos-2',
      codigoTrazabilidad: CodigoTrazabilidadCosecha.generar('LOT-2026-00001', '2026-03-20', 2),
      loteId: lote1.id,
      cicloId: ciclo1.id,
      fecha: '2026-03-20',
      cantidadCosechadaKg: 5000,
      cantidadComercializableKg: 4500,
      cantidadDescarteKg: 500,
      motivoDescarte: 'GOLPE_SOL',
      superficieCosechadaHa: 2.5,
    });
    await cosechasRepo.guardar(c2);

    const resultado = await useCase.execute({ cicloId: ciclo1.id });

    // Verificaciones globales
    expect(resultado.resumenGlobal.totalKilosCosechados).toBe(15000);
    expect(resultado.resumenGlobal.totalKilosComercializables).toBe(14000);
    expect(resultado.resumenGlobal.totalKilosDescarte).toBe(1000);
    // Porcentaje de descarte: (1000 / 15000) * 100 = 6.67%
    expect(resultado.resumenGlobal.porcentajeDescarteGlobal).toBe(6.67);
    // Rendimiento bruto: 15000 / 2.5 ha = 6000 kg/ha
    expect(resultado.resumenGlobal.rendimientoPromedioKgHa).toBe(6000);
    // Rendimiento comercializable: 14000 / 2.5 ha = 5600 kg/ha
    expect(resultado.resumenGlobal.rendimientoComercializableKgHa).toBe(5600);

    // Verificación en el desglose de ciclo
    expect(resultado.desglosePorCiclo).toHaveLength(1);
    const itemCiclo = resultado.desglosePorCiclo[0];
    expect(itemCiclo.cicloId).toBe(ciclo1.id);
    expect(itemCiclo.superficieCultivadaHa).toBe(2.5);
    expect(itemCiclo.totalKilosCosechados).toBe(15000);
    expect(itemCiclo.totalKilosComercializables).toBe(14000);
    expect(itemCiclo.totalKilosDescarte).toBe(1000);
    expect(itemCiclo.porcentajeDescarte).toBe(6.67);
    expect(itemCiclo.rendimientoBrutoKgHa).toBe(6000);
    expect(itemCiclo.rendimientoComercializableKgHa).toBe(5600);
  });

  it('debe excluir cosechas anuladas de los cálculos de rendimiento y descarte', async () => {
    // Cosecha activa: 4,000 kg, 400 kg descarte
    const activa = Cosecha.crear({
      id: 'cos-activa',
      codigoTrazabilidad: CodigoTrazabilidadCosecha.generar('LOT-2026-00001', '2026-03-10', 1),
      loteId: lote1.id,
      cicloId: ciclo1.id,
      fecha: '2026-03-10',
      cantidadCosechadaKg: 4000,
      cantidadComercializableKg: 3600,
      cantidadDescarteKg: 400,
      motivoDescarte: 'DESCARTE_CALIBRE',
    });
    await cosechasRepo.guardar(activa);

    // Cosecha anulada: 10,000 kg, no debe computarse
    const anulada = Cosecha.crear({
      id: 'cos-anulada',
      codigoTrazabilidad: CodigoTrazabilidadCosecha.generar('LOT-2026-00001', '2026-03-11', 2),
      loteId: lote1.id,
      cicloId: ciclo1.id,
      fecha: '2026-03-11',
      cantidadCosechadaKg: 10000,
      cantidadComercializableKg: 9000,
      cantidadDescarteKg: 1000,
      motivoDescarte: 'ERROR_LOGISTICA',
    });
    anulada.anular('Error en balanza de pesaje', 'Supervisor');
    await cosechasRepo.guardar(anulada);

    const resultado = await useCase.execute({ cicloId: ciclo1.id });

    expect(resultado.resumenGlobal.totalKilosCosechados).toBe(4000);
    expect(resultado.resumenGlobal.totalKilosDescarte).toBe(400);
    expect(resultado.resumenGlobal.porcentajeDescarteGlobal).toBe(10);
    expect(resultado.resumenGlobal.rendimientoPromedioKgHa).toBe(1600); // 4000 / 2.5
    expect(resultado.resumenGlobal.rendimientoComercializableKgHa).toBe(1440); // 3600 / 2.5
  });

  it('debe calcular la tasa de prendimiento de plantines y reposición (RF-M7-09)', async () => {
    const resultado = await useCase.execute({ cicloId: ciclo1.id });
    const itemCiclo = resultado.desglosePorCiclo[0];

    expect(itemCiclo.prendimientoPlantas).not.toBeNull();
    expect(itemCiclo.prendimientoPlantas.plantasPlantadas).toBe(10000);
    expect(itemCiclo.prendimientoPlantas.plantasVivas).toBe(9200);
    expect(itemCiclo.prendimientoPlantas.plantasRepuestas).toBe(300);
    // (9200 / 10000) * 100 = 92%
    expect(itemCiclo.prendimientoPlantas.tasaPrendimientoPorcentaje).toBe(92);

    // Ciclo 2 sin plantines registrados
    const resultado2 = await useCase.execute({ cicloId: ciclo2.id });
    const itemCiclo2 = resultado2.desglosePorCiclo[0];
    expect(itemCiclo2.prendimientoPlantas.tasaPrendimientoPorcentaje).toBeNull();
  });

  it('debe consolidar y clasificar labores por categoría y estado (RF-M7-08)', async () => {
    // Actividad 1: Riego Realizada
    const act1 = ActividadAgricola.registrar({
      id: 'act-1',
      codigoActividad: 'ACT-2026-001',
      loteId: lote1.id,
      cicloId: ciclo1.id,
      tipoActividadId: tipoRiego.id,
      fechaHecho: '2026-01-10',
      usuarioCargaId: 'user-1',
      superficieTrabajadaHa: 2.5,
      estado: 'REALIZADA',
    });
    await actividadesRepo.guardar(act1);

    // Actividad 2: Riego Planificada
    const act2 = ActividadAgricola.registrar({
      id: 'act-2',
      codigoActividad: 'ACT-2026-002',
      loteId: lote1.id,
      cicloId: ciclo1.id,
      tipoActividadId: tipoRiego.id,
      fechaHecho: '2026-02-10',
      usuarioCargaId: 'user-1',
      superficieTrabajadaHa: 2.5,
      estado: 'PLANIFICADA',
    });
    await actividadesRepo.guardar(act2);

    // Actividad 3: Sanidad Realizada
    const act3 = ActividadAgricola.registrar({
      id: 'act-3',
      codigoActividad: 'ACT-2026-003',
      loteId: lote1.id,
      cicloId: ciclo1.id,
      tipoActividadId: tipoSanidad.id,
      fechaHecho: '2026-01-20',
      usuarioCargaId: 'user-1',
      superficieTrabajadaHa: 2.5,
      estado: 'REALIZADA',
    });
    await actividadesRepo.guardar(act3);

    const resultado = await useCase.execute({ cicloId: ciclo1.id });
    const itemCiclo = resultado.desglosePorCiclo[0];

    expect(itemCiclo.labores.totalLabores).toBe(3);
    expect(itemCiclo.labores.conteoPorEstado['REALIZADA']).toBe(2);
    expect(itemCiclo.labores.conteoPorEstado['PLANIFICADA']).toBe(1);

    expect(itemCiclo.labores.conteoPorCategoria['RIEGO']).toBe(2);
    expect(itemCiclo.labores.conteoPorCategoria['SANIDAD']).toBe(1);
  });

  it('debe filtrar correctamente por fincaId, cultivo y estadoCiclo', async () => {
    // Filtro finca 1
    const resFinca1 = await useCase.execute({ fincaId: FINCA_1 });
    expect(resFinca1.desglosePorCiclo).toHaveLength(1);
    expect(resFinca1.desglosePorCiclo[0].cicloId).toBe(ciclo1.id);

    // Filtro finca 2
    const resFinca2 = await useCase.execute({ fincaId: FINCA_2 });
    expect(resFinca2.desglosePorCiclo).toHaveLength(1);
    expect(resFinca2.desglosePorCiclo[0].cicloId).toBe(ciclo2.id);

    // Filtro variedad
    const resVar = await useCase.execute({ variedad: 'Malbec' });
    expect(resVar.desglosePorCiclo).toHaveLength(1);
    expect(resVar.desglosePorCiclo[0].variedad).toBe('Malbec');
  });

  it('debe obtener el detalle individual de un ciclo con su lista de cosechas y descarte unitario', async () => {
    const c1 = Cosecha.crear({
      id: 'cos-det-1',
      codigoTrazabilidad: CodigoTrazabilidadCosecha.generar('LOT-2026-00001', '2026-03-01', 1),
      loteId: lote1.id,
      cicloId: ciclo1.id,
      fecha: '2026-03-01',
      cantidadCosechadaKg: 1000,
      cantidadComercializableKg: 900,
      cantidadDescarteKg: 100,
      motivoDescarte: 'DESCARTE_MANCHAS',
    });
    await cosechasRepo.guardar(c1);

    const detalle = await useCase.obtenerIndicadoresCiclo(ciclo1.id);
    expect(detalle.ciclo.id).toBe(ciclo1.id);
    expect(detalle.metricasProduccion.totalKilosCosechados).toBe(1000);
    expect(detalle.metricasProduccion.porcentajeDescarte).toBe(10);
    expect(detalle.cosechas).toHaveLength(1);
    expect(detalle.cosechas[0].cosechaId).toBe('cos-det-1');
    expect(detalle.cosechas[0].porcentajeDescarte).toBe(10);
  });

  it('debe arrojar EntidadNoEncontradaError si se solicita un ciclo inexistente', async () => {
    await expect(useCase.obtenerIndicadoresCiclo('ciclo-inexistente')).rejects.toThrow(EntidadNoEncontradaError);
  });

  it('debe obtener el rendimiento consolidado por lote a través de múltiples ciclos', async () => {
    // Cosecha en ciclo 1
    const c1 = Cosecha.crear({
      id: 'cos-lote-1',
      codigoTrazabilidad: CodigoTrazabilidadCosecha.generar('LOT-2026-00001', '2026-03-01', 1),
      loteId: lote1.id,
      cicloId: ciclo1.id,
      fecha: '2026-03-01',
      cantidadCosechadaKg: 5000,
      cantidadComercializableKg: 4500,
      cantidadDescarteKg: 500,
      motivoDescarte: 'DEFECTOS_MENORES',
    });
    await cosechasRepo.guardar(c1);

    const detalleLote = await useCase.obtenerIndicadoresLote(lote1.id);
    expect(detalleLote.lote.id).toBe(lote1.id);
    expect(detalleLote.lote.superficieHa).toBe(2.5);
    expect(detalleLote.metricasConsolidadas.totalKilosCosechados).toBe(5000);
    expect(detalleLote.metricasConsolidadas.porcentajeDescarte).toBe(10);
    expect(detalleLote.metricasConsolidadas.rendimientoBrutoKgHa).toBe(2000); // 5000 / 2.5
    expect(detalleLote.metricasConsolidadas.rendimientoComercializableKgHa).toBe(1800); // 4500 / 2.5
    expect(detalleLote.ciclos).toHaveLength(1);
  });

  it('debe manejar ciclos y lotes con 0 kg cosechados o superficie 0 sin producir errores ni NaN', async () => {
    const loteCero = Lote.crear({
      id: 'lote-cero',
      codigoLote: 'LOT-2026-00000',
      fincaId: FINCA_1,
      superficieHa: 0,
      producto: 'Oliva',
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(loteCero);

    const cicloCero = CicloProductivo.crear({
      id: 'ciclo-cero',
      codigoCiclo: 'CICLO-2026-CERO-01',
      loteId: loteCero.id,
      cultivo: 'Olivo',
      superficieCultivadaHa: 1.0,
      fechaInicio: '2026-01-01',
    });
    await ciclosRepo.guardar(cicloCero);

    const resultado = await useCase.execute({ cicloId: cicloCero.id });
    expect(resultado.resumenGlobal.rendimientoPromedioKgHa).toBe(0);
    expect(resultado.resumenGlobal.porcentajeDescarteGlobal).toBe(0);
    expect(resultado.desglosePorCiclo[0].rendimientoBrutoKgHa).toBe(0);
    expect(resultado.desglosePorCiclo[0].porcentajeDescarte).toBe(0);
  });
});
