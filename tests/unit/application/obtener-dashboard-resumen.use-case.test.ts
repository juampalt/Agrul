import { describe, it, expect, beforeEach } from 'vitest';
import { ObtenerDashboardResumenUseCase } from '../../../src/application/use-cases/obtener-dashboard-resumen.use-case.js';
import { InMemoryLotesRepository } from '../../mocks/in-memory-lotes.repository.js';
import { InMemoryCiclosRepository } from '../../mocks/in-memory-ciclos.repository.js';
import { InMemoryCosechasRepository } from '../../mocks/in-memory-cosechas.repository.js';
import { InMemoryInsumosCatalogoRepository } from '../../mocks/in-memory-insumos-catalogo.repository.js';
import { InMemoryAplicacionesRepository } from '../../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryActividadesRepository } from '../../mocks/in-memory-actividades.repository.js';
import { InMemoryFincasRepository } from '../../mocks/in-memory-fincas.repository.js';
import { InMemoryCatalogosActividadesRepository } from '../../mocks/in-memory-catalogos-actividades.repository.js';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { CicloProductivo } from '../../../src/core/domain/entities/ciclo-productivo.entity.js';
import { Cosecha } from '../../../src/core/domain/entities/cosecha.entity.js';
import { CodigoTrazabilidadCosecha } from '../../../src/core/domain/value-objects/codigo-trazabilidad-cosecha.vo.js';
import { InsumoCatalogo } from '../../../src/core/domain/entities/insumo-catalogo.entity.js';
import { AplicacionAgricola } from '../../../src/core/domain/entities/aplicacion-agricola.entity.js';
import { ActividadAgricola } from '../../../src/core/domain/entities/actividad-agricola.entity.js';
import { Finca } from '../../../src/core/domain/entities/finca.entity.js';
import { TipoActividad } from '../../../src/core/domain/entities/tipo-actividad.entity.js';

describe('Caso de Uso: ObtenerDashboardResumenUseCase (AGRUL-037 / RF-M7-12, RF-M7-13, RF-M7-14)', () => {
  let lotesRepo: InMemoryLotesRepository;
  let ciclosRepo: InMemoryCiclosRepository;
  let cosechasRepo: InMemoryCosechasRepository;
  let insumosRepo: InMemoryInsumosCatalogoRepository;
  let aplicacionesRepo: InMemoryAplicacionesRepository;
  let actividadesRepo: InMemoryActividadesRepository;
  let fincasRepo: InMemoryFincasRepository;
  let catalogosRepo: InMemoryCatalogosActividadesRepository;
  let useCase: ObtenerDashboardResumenUseCase;

  const FECHA_HOY = '2026-10-20';

  beforeEach(async () => {
    lotesRepo = new InMemoryLotesRepository();
    ciclosRepo = new InMemoryCiclosRepository();
    cosechasRepo = new InMemoryCosechasRepository();
    insumosRepo = new InMemoryInsumosCatalogoRepository();
    aplicacionesRepo = new InMemoryAplicacionesRepository();
    actividadesRepo = new InMemoryActividadesRepository();
    fincasRepo = new InMemoryFincasRepository();
    catalogosRepo = new InMemoryCatalogosActividadesRepository();

    useCase = new ObtenerDashboardResumenUseCase({
      lotesRepo,
      ciclosRepo,
      cosechasRepo,
      insumosRepo,
      aplicacionesRepo,
      actividadesRepo,
      fincasRepo,
      catalogosActividadesRepo: catalogosRepo,
    });
  });

  it('1. Debe retornar estructura completa con valores en cero cuando el sistema no tiene datos', async () => {
    const resumen = await useCase.execute({ fechaReferenciaHoy: FECHA_HOY });

    expect(resumen.kpis.lotesEnProduccion.totalLotes).toBe(0);
    expect(resumen.kpis.lotesEnProduccion.lotesActivos).toBe(0);
    expect(resumen.kpis.produccionAcumulada.totalKilosCosechados).toBe(0);
    expect(resumen.kpis.alertasStockInsumos.totalInsumosMonitoreados).toBe(0);
    expect(resumen.kpis.actividadesVencidasOPendientes.totalActividades).toBe(0);
    expect(resumen.graficos.evolucionCosecha.labels.length).toBeGreaterThan(0);
    expect(resumen.costosPorLote).toHaveLength(0);
  });

  it('2. KPI 1: Debe calcular lotes en producción, activos y superficie cultivada', async () => {
    const finca = Finca.crear({
      id: 'f-1',
      nombre: 'Finca Norte',
      localidad: 'Maipú',
      departamento: 'Maipú',
      provincia: 'Mendoza',
      superficieTotalHa: 10,
    });
    await fincasRepo.guardar(finca);

    const lote1 = Lote.crear({
      id: 'l-1',
      codigoLote: 'LOT-2025-00001',
      producto: 'Vid',
      superficieHa: 3.5,
      cantidadInicial: 0,
      unidadMedida: 'KG',
      fincaId: 'f-1',
    });
    const lote2 = Lote.crear({
      id: 'l-2',
      codigoLote: 'LOT-2025-00002',
      producto: 'Olivo',
      superficieHa: 2.0,
      cantidadInicial: 0,
      unidadMedida: 'KG',
      fincaId: 'f-1',
    });
    await lotesRepo.guardar(lote1);
    await lotesRepo.guardar(lote2);

    const cicloActivo = CicloProductivo.crear({
      id: 'c-1',
      codigoCiclo: 'CICLO-2025-01',
      loteId: 'l-1',
      cultivo: 'Vid',
      estado: 'ABIERTO',
      superficieCultivadaHa: 3.5,
      fechaInicio: '2025-09-01',
    });
    await ciclosRepo.guardar(cicloActivo);

    const resumen = await useCase.execute({ fechaReferenciaHoy: FECHA_HOY });

    expect(resumen.kpis.lotesEnProduccion.totalLotes).toBe(2);
    expect(resumen.kpis.lotesEnProduccion.lotesActivos).toBe(2);
    expect(resumen.kpis.lotesEnProduccion.superficieTotalHa).toBe(5.5);
    expect(resumen.kpis.lotesEnProduccion.superficieEnProduccionHa).toBe(3.5);
    expect(resumen.kpis.lotesEnProduccion.ciclosEnCurso).toBe(1);
  });

  it('3. KPI 2: Debe acumular producción bruta, comercializable y porcentaje de descarte omitiendo anuladas', async () => {
    const lote = Lote.crear({
      id: 'l-1',
      codigoLote: 'LOT-2025-00003',
      producto: 'Manzana',
      superficieHa: 4.0,
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote);

    const ciclo = CicloProductivo.crear({
      id: 'c-1',
      codigoCiclo: 'CICLO-MANZANA-2025',
      loteId: 'l-1',
      cultivo: 'Manzana',
      superficieCultivadaHa: 4.0,
      fechaInicio: '2025-08-01',
    });
    await ciclosRepo.guardar(ciclo);

    // Cosecha 1: Activa (1000 kg total = 900 comercial + 100 descarte)
    const cosech1 = Cosecha.crear({
      id: 'cos-1',
      codigoTrazabilidad: CodigoTrazabilidadCosecha.crear('COS-L01-20250915-001'),
      loteId: 'l-1',
      cicloId: 'c-1',
      fecha: '2025-09-15',
      cantidadCosechadaKg: 1000,
      cantidadComercializableKg: 900,
      cantidadDescarteKg: 100,
      motivoDescarte: 'Golpe de sol leve',
    });
    // Cosecha 2: Activa (2000 kg total = 1800 comercial + 200 descarte)
    const cosech2 = Cosecha.crear({
      id: 'cos-2',
      codigoTrazabilidad: CodigoTrazabilidadCosecha.crear('COS-L01-20250920-002'),
      loteId: 'l-1',
      cicloId: 'c-1',
      fecha: '2025-09-20',
      cantidadCosechadaKg: 2000,
      cantidadComercializableKg: 1800,
      cantidadDescarteKg: 200,
      motivoDescarte: 'Calibre insuficiente',
    });
    // Cosecha 3: Anulada
    const cosech3 = Cosecha.crear({
      id: 'cos-3',
      codigoTrazabilidad: CodigoTrazabilidadCosecha.crear('COS-L01-20250925-003'),
      loteId: 'l-1',
      cicloId: 'c-1',
      fecha: '2025-09-25',
      cantidadCosechadaKg: 5000,
      cantidadComercializableKg: 5000,
      cantidadDescarteKg: 0,
    });
    cosech3.anular('Error de balanza', 'admin');

    await cosechasRepo.guardar(cosech1);
    await cosechasRepo.guardar(cosech2);
    await cosechasRepo.guardar(cosech3);

    const resumen = await useCase.execute({ fechaReferenciaHoy: FECHA_HOY });

    expect(resumen.kpis.produccionAcumulada.totalCosechas).toBe(2);
    expect(resumen.kpis.produccionAcumulada.totalKilosCosechados).toBe(3000);
    expect(resumen.kpis.produccionAcumulada.totalKilosComercializables).toBe(2700);
    expect(resumen.kpis.produccionAcumulada.totalKilosDescarte).toBe(300);
    expect(resumen.kpis.produccionAcumulada.porcentajeDescarte).toBe(10); // 300 / 3000 * 100
  });

  it('4. KPI 3: Debe monitorear stock y alertar niveles CRITICO y BAJO según consumo acumulado', async () => {
    const lote = Lote.crear({
      id: 'l-1',
      codigoLote: 'LOT-2025-00004',
      producto: 'Cereza',
      superficieHa: 2.0,
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote);

    const ciclo = CicloProductivo.crear({
      id: 'c-1',
      codigoCiclo: 'CICLO-01',
      loteId: 'l-1',
      cultivo: 'Cereza',
      superficieCultivadaHa: 2.0,
      fechaInicio: '2025-08-01',
    });
    await ciclosRepo.guardar(ciclo);

    // Insumo 1: Fitosanitario base 100, min 25
    const insumoCritico = InsumoCatalogo.crear({
      id: 'ins-1',
      nombreComercial: 'Fungicida Cúprico',
      categoria: 'FITOSANITARIO',
      unidadMedidaId: 'L',
      presentacion: 'Bidón 20L',
      fichaFitosanitaria: {
        principioActivo: 'Oxicloruro de Cobre',
        periodoCarenciaDias: 7,
        periodoReingresoHoras: 24,
        nroRegistroSenasa: 'SENASA-1234',
      },
    });

    // Insumo 2: Fertilizante base 500, min 100
    const insumoNormal = InsumoCatalogo.crear({
      id: 'ins-2',
      nombreComercial: 'Urea Granulada 46%',
      categoria: 'FERTILIZANTE',
      unidadMedidaId: 'KG',
      presentacion: 'Bolsa 50kg',
    });

    await insumosRepo.guardar(insumoCritico);
    await insumosRepo.guardar(insumoNormal);

    // Consumir 95 litros del insumo 1 (quedan 5 litros <= 25 * 0.4 => CRÍTICO)
    const aplicacion = AplicacionAgricola.crear({
      id: 'app-1',
      actividadId: 'act-1',
      loteId: 'l-1',
      cicloId: 'c-1',
      fecha: '2025-09-01',
      metodo: 'FOLIAR',
      motivo: 'Preventivo',
      equipoAplicacion: 'Pulverizadora',
      lineas: [
        {
          id: 'lin-1',
          insumoId: 'ins-1',
          cantidadTotal: 95,
          unidadMedidaId: 'L',
        },
      ],
    });
    await aplicacionesRepo.guardar(aplicacion);

    const resumen = await useCase.execute({ fechaReferenciaHoy: FECHA_HOY });

    expect(resumen.kpis.alertasStockInsumos.totalInsumosMonitoreados).toBe(2);
    expect(resumen.kpis.alertasStockInsumos.insumosStockCritico).toBe(1);

    const alertaCritica = resumen.kpis.alertasStockInsumos.alertas.find(a => a.insumoId === 'ins-1');
    expect(alertaCritica).toBeDefined();
    expect(alertaCritica?.nivelAlerta).toBe('CRITICO');
    expect(alertaCritica?.stockActual).toBe(5);
  });

  it('5. KPI 4: Debe detectar actividades vencidas, planificadas y próximas a vencer en 7 días', async () => {
    const lote = Lote.crear({
      id: 'l-1',
      codigoLote: 'LOT-2025-00005',
      producto: 'Uva',
      superficieHa: 1.0,
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote);

    const tipoPoda = TipoActividad.crear({
      id: 'tipo-poda',
      nombre: 'Poda Invernal',
      categoria: 'MANEJO',
      descripcion: 'Poda de formación',
    });
    await catalogosRepo.guardarTipoActividad(tipoPoda);

    // 1. Actividad vencida (planificada para 2026-10-10, hoy es 2026-10-20 => 10 días de retraso)
    const actVencida = ActividadAgricola.registrar({
      id: 'act-1',
      codigoActividad: 'ACT-2026-001',
      tipoActividadId: 'tipo-poda',
      loteId: 'l-1',
      cicloId: 'c-1',
      fechaHecho: '2026-10-10',
      usuarioCargaId: 'user-1',
      superficieTrabajadaHa: 1.0,
      estado: 'PLANIFICADA',
    });

    // 2. Actividad próxima a vencer (planificada para 2026-10-23 => a 3 días de hoy)
    const actProxima = ActividadAgricola.registrar({
      id: 'act-2',
      codigoActividad: 'ACT-2026-002',
      tipoActividadId: 'tipo-poda',
      loteId: 'l-1',
      cicloId: 'c-1',
      fechaHecho: '2026-10-23',
      usuarioCargaId: 'user-1',
      superficieTrabajadaHa: 1.0,
      estado: 'PLANIFICADA',
    });

    // 3. Actividad ya realizada
    const actRealizada = ActividadAgricola.registrar({
      id: 'act-3',
      codigoActividad: 'ACT-2026-003',
      tipoActividadId: 'tipo-poda',
      loteId: 'l-1',
      cicloId: 'c-1',
      fechaHecho: '2026-10-01',
      usuarioCargaId: 'user-1',
      superficieTrabajadaHa: 1.0,
      estado: 'REALIZADA',
      fechaReferenciaHoy: new Date(FECHA_HOY),
    });

    // 4. Actividad cancelada
    const actCancelada = ActividadAgricola.registrar({
      id: 'act-4',
      codigoActividad: 'ACT-2026-004',
      tipoActividadId: 'tipo-poda',
      loteId: 'l-1',
      cicloId: 'c-1',
      fechaHecho: '2026-10-05',
      usuarioCargaId: 'user-1',
      superficieTrabajadaHa: 1.0,
      estado: 'CANCELADA',
    });

    await actividadesRepo.guardar(actVencida);
    await actividadesRepo.guardar(actProxima);
    await actividadesRepo.guardar(actRealizada);
    await actividadesRepo.guardar(actCancelada);

    const resumen = await useCase.execute({ fechaReferenciaHoy: FECHA_HOY });

    expect(resumen.kpis.actividadesVencidasOPendientes.vencidas).toBe(1);
    expect(resumen.kpis.actividadesVencidasOPendientes.proximasAVencer7Dias).toBe(1);
    expect(resumen.kpis.actividadesVencidasOPendientes.pendientesPlanificadas).toBe(2);

    const vencidaItem = resumen.kpis.actividadesVencidasOPendientes.items.find(i => i.actividadId === 'act-1');
    expect(vencidaItem?.urgencia).toBe('VENCIDA');
    expect(vencidaItem?.diasRetraso).toBe(10);
  });

  it('6. Gráficos: Debe generar series temporales de cosecha y distribución de insumos', async () => {
    const lote = Lote.crear({
      id: 'l-1',
      codigoLote: 'LOT-2025-00006',
      producto: 'Nogal',
      superficieHa: 5.0,
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote);

    const ciclo = CicloProductivo.crear({
      id: 'c-1',
      codigoCiclo: 'CICLO-NOGAL',
      loteId: 'l-1',
      cultivo: 'Nogal',
      superficieCultivadaHa: 5.0,
      fechaInicio: '2025-01-01',
    });
    await ciclosRepo.guardar(ciclo);

    const cosech = Cosecha.crear({
      id: 'cos-1',
      codigoTrazabilidad: CodigoTrazabilidadCosecha.crear('COS-L01-20250410-001'),
      loteId: 'l-1',
      cicloId: 'c-1',
      fecha: '2025-04-10',
      cantidadCosechadaKg: 4000,
      cantidadComercializableKg: 3800,
      cantidadDescarteKg: 200,
      motivoDescarte: 'Cáscara manchada',
    });
    await cosechasRepo.guardar(cosech);

    const resumen = await useCase.execute({ fechaReferenciaHoy: FECHA_HOY });

    expect(resumen.graficos.evolucionCosecha.labels).toContain('2025-04');
    expect(resumen.graficos.rendimientoPorCultivo.cultivos).toContain('Nogal');
    expect(resumen.graficos.rendimientoPorCultivo.rendimientoBrutoKgHa[0]).toBe(800); // 4000 / 5 ha
  });

  it('7. Costos por Lote (RF-M7-14): Debe calcular costos de insumos, mano de obra y maquinaria', async () => {
    const lote = Lote.crear({
      id: 'l-1',
      codigoLote: 'LOT-2025-00007',
      producto: 'Vid',
      superficieHa: 2.0,
      cantidadInicial: 0,
      unidadMedida: 'KG',
    });
    await lotesRepo.guardar(lote);

    const ciclo = CicloProductivo.crear({
      id: 'c-1',
      codigoCiclo: 'CICLO-VID',
      loteId: 'l-1',
      cultivo: 'Vid',
      superficieCultivadaHa: 2.0,
      fechaInicio: '2025-01-01',
    });
    await ciclosRepo.guardar(ciclo);

    // Insumo fertilizante (100 kg * $1200 = $120.000)
    const insumo = InsumoCatalogo.crear({
      id: 'ins-fert',
      nombreComercial: 'Fertilizante NPK',
      categoria: 'FERTILIZANTE',
      unidadMedidaId: 'KG',
      presentacion: 'Bolsa 50kg',
    });
    await insumosRepo.guardar(insumo);

    const app = AplicacionAgricola.crear({
      id: 'app-1',
      actividadId: 'act-1',
      loteId: 'l-1',
      cicloId: 'c-1',
      fecha: '2025-02-15',
      metodo: 'FERTIRRIEGO',
      motivo: 'Nutrición',
      equipoAplicacion: 'Riego por goteo',
      lineas: [
        {
          id: 'lin-1',
          insumoId: 'ins-fert',
          cantidadTotal: 100,
          unidadMedidaId: 'KG',
        },
      ],
    });
    await aplicacionesRepo.guardar(app);

    // Actividad con mano de obra (2 jornales * $25.000 = $50.000) y maquinaria (5 horas tractor * $18.000 = $90.000)
    const actividad = ActividadAgricola.registrar({
      id: 'act-1',
      codigoActividad: 'ACT-001',
      tipoActividadId: 'tipo-desmalezado',
      loteId: 'l-1',
      cicloId: 'c-1',
      fechaHecho: '2025-02-15',
      usuarioCargaId: 'user-1',
      superficieTrabajadaHa: 2.0,
      estado: 'REALIZADA',
      fechaReferenciaHoy: new Date(FECHA_HOY),
      manoDeObra: [
        { personalCuadrillaId: 'p-1', cantidadPersonas: 2, horasTrabajadas: 16, jornales: 2 },
      ],
      maquinarias: [
        { maquinariaId: 'm-1', horasUso: 5 },
      ],
    });
    await actividadesRepo.guardar(actividad);

    // Cosecha de 1000 kg
    const cosecha = Cosecha.crear({
      id: 'cos-1',
      codigoTrazabilidad: CodigoTrazabilidadCosecha.crear('COS-L01-20250320-001'),
      loteId: 'l-1',
      cicloId: 'c-1',
      fecha: '2025-03-20',
      cantidadCosechadaKg: 1000,
      cantidadComercializableKg: 1000,
      cantidadDescarteKg: 0,
    });
    await cosechasRepo.guardar(cosecha);

    const resumen = await useCase.execute({ fechaReferenciaHoy: FECHA_HOY });
    const costoLote = resumen.costosPorLote.find(c => c.loteId === 'l-1');

    expect(costoLote).toBeDefined();
    expect(costoLote?.costoInsumos).toBe(120000);
    expect(costoLote?.costoManoObra).toBe(50000);
    expect(costoLote?.costoMaquinaria).toBe(90000);
    expect(costoLote?.costoTotalEstimado).toBe(260000); // 120k + 50k + 90k
    expect(costoLote?.costoPorHectarea).toBe(130000);   // 260k / 2 ha
    expect(costoLote?.costoPorKiloCosechado).toBe(260); // 260k / 1000 kg
  });
});
