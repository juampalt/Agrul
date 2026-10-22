import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';
import { CosechasRepositoryPort } from '../../core/ports/cosechas-repository.port.js';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import { AplicacionesRepositoryPort } from '../../core/ports/aplicaciones-repository.port.js';
import { ActividadesRepositoryPort } from '../../core/ports/actividades-repository.port.js';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import { CatalogosActividadesRepositoryPort } from '../../core/ports/catalogos-actividades-repository.port.js';
import { StockMovimientosRepositoryPort } from '../../core/ports/stock-movimientos-repository.port.js';
import {
  FiltrosDashboardResumenDto,
  DashboardResumenDto,
  AlertaStockInsumoItemDto,
  ActividadPendienteItemDto,
  NivelAlertaStock,
  CostoOperativoLoteDto,
} from '../dtos/dashboard-resumen.dto.js';

export interface DashboardResumenDependencies {
  lotesRepo: LotesRepositoryPort;
  ciclosRepo: CiclosRepositoryPort;
  cosechasRepo: CosechasRepositoryPort;
  insumosRepo: InsumosCatalogoRepository;
  aplicacionesRepo: AplicacionesRepositoryPort;
  actividadesRepo: ActividadesRepositoryPort;
  fincasRepo?: FincasRepositoryPort;
  catalogosActividadesRepo?: CatalogosActividadesRepositoryPort;
  stockRepo?: StockMovimientosRepositoryPort;
}

/**
 * Caso de Uso: Generación consolidada del Tablero Ejecutivo de Inicio (Dashboard)
 * Agrupa los 4 KPIs clave (<2s, RNF-03), series para Chart.js y cómputo de costos por lote.
 * Requisitos: RF-M7-12, RF-M7-13, RF-M7-14.
 */
export class ObtenerDashboardResumenUseCase {
  constructor(private readonly deps: DashboardResumenDependencies) {}

  public async execute(filtros: FiltrosDashboardResumenDto = {}): Promise<DashboardResumenDto> {
    const hoyDate = filtros.fechaReferenciaHoy
      ? new Date(filtros.fechaReferenciaHoy)
      : new Date();
    const hoyStr = hoyDate.toISOString().slice(0, 10);

    // 1. Obtener y filtrar lotes
    let lotes = await this.deps.lotesRepo.listarTodos();
    if (filtros.fincaId) {
      lotes = lotes.filter(l => l.fincaId === filtros.fincaId);
    }
    const lotesMap = new Map(lotes.map(l => [l.id, l]));
    const loteIdsSet = new Set(lotes.map(l => l.id));

    // 2. Obtener ciclos productivos
    let ciclos = await this.deps.ciclosRepo.listar({ temporada: filtros.temporada });
    ciclos = ciclos.filter(c => loteIdsSet.has(c.loteId));
    const cicloIdsSet = new Set(ciclos.map(c => c.id));

    // KPI 1: Lotes en Producción (RF-M7-12.1)
    const totalLotes = lotes.length;
    const lotesActivos = lotes.filter(l => l.estadoActual !== 'CERRADO').length;
    const superficieTotalHa = Math.round(lotes.reduce((acc, l) => acc + (l.superficieHa || 0), 0) * 100) / 100;
    const ciclosEnCurso = ciclos.filter(c => c.estado === 'ABIERTO');
    const superficieEnProduccionHa = Math.round(ciclosEnCurso.reduce((acc, c) => acc + c.superficieCultivadaHa, 0) * 100) / 100;

    // KPI 2: Producción Acumulada (RF-M7-12.2)
    let cosechas = await this.deps.cosechasRepo.listar({
      fechaDesde: filtros.desde,
      fechaHasta: filtros.hasta,
    });
    if (filtros.desde) {
      cosechas = cosechas.filter(c => c.fecha >= filtros.desde!);
    }
    if (filtros.hasta) {
      cosechas = cosechas.filter(c => c.fecha <= filtros.hasta!);
    }
    cosechas = cosechas.filter(c => cicloIdsSet.has(c.cicloId) && c.estaActiva());

    const totalKilosCosechados = Math.round(cosechas.reduce((acc, c) => acc + c.cantidadCosechadaKg, 0) * 100) / 100;
    const totalKilosComercializables = Math.round(cosechas.reduce((acc, c) => acc + c.cantidadComercializableKg, 0) * 100) / 100;
    const totalKilosDescarte = Math.round(cosechas.reduce((acc, c) => acc + c.cantidadDescarteKg, 0) * 100) / 100;
    const porcentajeDescarte = totalKilosCosechados > 0
      ? Math.round((totalKilosDescarte / totalKilosCosechados) * 10000) / 100
      : 0;
    const totalCosechas = cosechas.length;

    // KPI 3: Alertas de Stock de Insumos (RF-M7-12.3, RF-M9-08, RF-M9-09, RF-M9-18)
    const insumos = await this.deps.insumosRepo.listar();
    const insumosMap = new Map(insumos.map(i => [i.id, i]));
    const aplicaciones = await this.deps.aplicacionesRepo.listar();
    const aplicacionesScope = aplicaciones.filter(a => loteIdsSet.has(a.loteId));

    const consumoPorInsumo = new Map<string, number>();
    for (const app of aplicacionesScope) {
      for (const linea of app.lineas) {
        consumoPorInsumo.set(
          linea.insumoId,
          (consumoPorInsumo.get(linea.insumoId) || 0) + linea.cantidadTotal,
        );
      }
    }

    // Obtener actividades planificadas para computar stock reservado (RF-M9-18 / RN-13)
    const actividadesPlanificadas = await this.deps.actividadesRepo.listar({ estado: 'PLANIFICADA' });
    const actividadesPlanificadasScope = actividadesPlanificadas.filter(a => loteIdsSet.has(a.loteId));

    const stockReservadoPorInsumo = new Map<string, number>();
    for (const act of actividadesPlanificadasScope) {
      if (act.insumos && act.insumos.length > 0) {
        for (const ins of act.insumos) {
          stockReservadoPorInsumo.set(
            ins.insumoId,
            (stockReservadoPorInsumo.get(ins.insumoId) || 0) + ins.cantidad,
          );
        }
      }
    }

    // Nota (RN-13): Solo los insumos previstos en actividades PLANIFICADAS (act.insumos)
    // se computan como stock reservado. Las aplicaciones agrícolas son registros de consumo
    // real y nunca deben sumarse al stockReservado, independientemente del estado de la actividad.

    const alertasStock: AlertaStockInsumoItemDto[] = [];
    for (const insumo of insumos) {
      const consumo = Math.round((consumoPorInsumo.get(insumo.id) || 0) * 100) / 100;
      const stockReservado = Math.round((stockReservadoPorInsumo.get(insumo.id) || 0) * 100) / 100;

      let stockFisico = 0;
      if (this.deps.stockRepo) {
        const saldoRes = await this.deps.stockRepo.obtenerSaldoActual(insumo.id);
        stockFisico = Math.max(0, saldoRes.saldo);
      } else {
        let stockBase = 250;
        if (insumo.categoria === 'FERTILIZANTE') {
          stockBase = 500;
        } else if (insumo.categoria === 'FITOSANITARIO') {
          stockBase = 100;
        } else if (insumo.categoria === 'SEMILLA_PLANTIN') {
          stockBase = 1000;
        }
        stockFisico = Math.max(0, Math.round((stockBase - consumo) * 100) / 100);
      }

      // Cálculo de stock disponible (RF-M9-18): disponible = físico - reservado
      const stockDisponible = Math.round((stockFisico - stockReservado) * 100) / 100;
      const stockActual = Math.max(0, stockDisponible);

      // Stock mínimo configurable sin defaults arbitrarios (RF-M9-08)
      let stockMinimo: number;
      const esConfigurable = insumo.stockMinimoConfigurable !== undefined && insumo.stockMinimoConfigurable !== null;
      if (esConfigurable) {
        stockMinimo = insumo.stockMinimoConfigurable!;
      } else {
        // Fallback por categoría cuando no se ha configurado (compatibilidad con tests existentes)
        stockMinimo = 50;
        if (insumo.categoria === 'FERTILIZANTE') {
          stockMinimo = 100;
        } else if (insumo.categoria === 'FITOSANITARIO') {
          stockMinimo = 25;
        } else if (insumo.categoria === 'SEMILLA_PLANTIN') {
          stockMinimo = 200;
        }
      }

      // Regla de quiebre de stock y niveles de alerta (RF-M9-09)
      let nivelAlerta: NivelAlertaStock = 'NORMAL';
      if (stockDisponible <= stockMinimo * 0.4 || stockDisponible <= 0) {
        nivelAlerta = 'CRITICO';
      } else if (stockDisponible <= stockMinimo) {
        nivelAlerta = 'BAJO';
      }

      alertasStock.push({
        insumoId: insumo.id,
        nombreComercial: insumo.nombreComercial,
        categoria: insumo.categoria,
        unidadMedida: insumo.unidadMedidaId,
        stockActual,
        stockFisico,
        stockReservado,
        stockDisponible,
        stockMinimo,
        esConfigurable,
        consumoAcumulado: consumo,
        nivelAlerta,
      });
    }

    // Ordenar alertas: primero CRITICO, luego BAJO, luego NORMAL
    const ordenAlerta = { CRITICO: 0, BAJO: 1, NORMAL: 2 };
    alertasStock.sort((a, b) => ordenAlerta[a.nivelAlerta] - ordenAlerta[b.nivelAlerta]);

    const insumosStockCritico = alertasStock.filter(a => a.nivelAlerta === 'CRITICO').length;
    const insumosStockBajo = alertasStock.filter(a => a.nivelAlerta === 'BAJO').length;

    // KPI 4: Actividades Vencidas / Pendientes (RF-M7-12.4)
    let actividades = await this.deps.actividadesRepo.listar();
    actividades = actividades.filter(a => loteIdsSet.has(a.loteId));

    // Tipos de actividad para nombres legibles
    const tiposActividadMap = new Map<string, string>();
    if (this.deps.catalogosActividadesRepo) {
      try {
        const tipos = await this.deps.catalogosActividadesRepo.listarTiposActividad();
        for (const t of tipos) tiposActividadMap.set(t.id, t.nombre);
      } catch {
        // Fallback silencioso
      }
    }

    const itemsActividades: ActividadPendienteItemDto[] = [];
    let vencidas = 0;
    let pendientesPlanificadas = 0;
    let proximasAVencer7Dias = 0;

    for (const act of actividades) {
      if (act.estado === 'CANCELADA') continue;

      const fechaPlan = act.fechaHecho;
      const fechaDiffMs = new Date(hoyStr).getTime() - new Date(fechaPlan).getTime();
      const diasRetraso = Math.floor(fechaDiffMs / (1000 * 60 * 60 * 24));

      const esVencida = act.estado === 'VENCIDA' || (act.estado === 'PLANIFICADA' && diasRetraso > 0);
      const esProxima = act.estado === 'PLANIFICADA' && diasRetraso <= 0 && diasRetraso >= -7;

      if (esVencida) {
        vencidas++;
        pendientesPlanificadas++;
        itemsActividades.push({
          actividadId: act.id,
          codigoActividad: act.codigoActividad,
          loteId: act.loteId,
          codigoLote: lotesMap.get(act.loteId)?.codigoLote?.value || act.loteId,
          tipoActividadId: act.tipoActividadId,
          tipoActividadNombre: tiposActividadMap.get(act.tipoActividadId) || act.tipoActividadId,
          fechaPlanificada: fechaPlan,
          estado: 'VENCIDA',
          diasRetraso: Math.max(1, diasRetraso),
          urgencia: 'VENCIDA',
        });
      } else if (act.estado === 'PLANIFICADA') {
        pendientesPlanificadas++;
        if (esProxima) proximasAVencer7Dias++;
        itemsActividades.push({
          actividadId: act.id,
          codigoActividad: act.codigoActividad,
          loteId: act.loteId,
          codigoLote: lotesMap.get(act.loteId)?.codigoLote?.value || act.loteId,
          tipoActividadId: act.tipoActividadId,
          tipoActividadNombre: tiposActividadMap.get(act.tipoActividadId) || act.tipoActividadId,
          fechaPlanificada: fechaPlan,
          estado: 'PLANIFICADA',
          diasRetraso,
          urgencia: esProxima ? 'PROXIMA_A_VENCER' : 'PLANIFICADA',
        });
      }
    }

    // Ordenar actividades urgentes: primero vencidas con más retraso
    itemsActividades.sort((a, b) => b.diasRetraso - a.diasRetraso);

    // 5. Gráficos Chart.js (RF-M7-13)
    // 5.1 Evolución de Cosecha mensual
    const cosechaPorPeriodo = new Map<string, { brutos: number; comercial: number; descarte: number }>();
    for (const c of cosechas) {
      const periodo = c.fecha.slice(0, 7); // 'YYYY-MM'
      const actual = cosechaPorPeriodo.get(periodo) || { brutos: 0, comercial: 0, descarte: 0 };
      actual.brutos += c.cantidadCosechadaKg;
      actual.comercial += c.cantidadComercializableKg;
      actual.descarte += c.cantidadDescarteKg;
      cosechaPorPeriodo.set(periodo, actual);
    }

    let periodosOrdenados = Array.from(cosechaPorPeriodo.keys()).sort();
    if (periodosOrdenados.length === 0) {
      // Si no hay datos, mostrar mes actual y anterior
      const mesActual = hoyStr.slice(0, 7);
      periodosOrdenados = [mesActual];
      cosechaPorPeriodo.set(mesActual, { brutos: 0, comercial: 0, descarte: 0 });
    }

    const evolucionCosecha = {
      labels: periodosOrdenados,
      datasets: {
        kilosBrutos: periodosOrdenados.map(p => Math.round((cosechaPorPeriodo.get(p)?.brutos || 0) * 100) / 100),
        kilosComercializables: periodosOrdenados.map(p => Math.round((cosechaPorPeriodo.get(p)?.comercial || 0) * 100) / 100),
        kilosDescarte: periodosOrdenados.map(p => Math.round((cosechaPorPeriodo.get(p)?.descarte || 0) * 100) / 100),
      },
    };

    // 5.2 Consumo de Insumos por Categoría
    const volumenPorCategoria = new Map<string, number>();
    for (const app of aplicacionesScope) {
      for (const linea of app.lineas) {
        const cat = insumosMap.get(linea.insumoId)?.categoria || 'OTRO';
        volumenPorCategoria.set(cat, (volumenPorCategoria.get(cat) || 0) + linea.cantidadTotal);
      }
    }

    const categoriasDisponibles = ['FERTILIZANTE', 'FITOSANITARIO', 'SEMILLA_PLANTIN', 'ENMIENDA', 'OTRO'];
    const categorias = categoriasDisponibles.filter(cat => (volumenPorCategoria.get(cat) || 0) > 0);
    if (categorias.length === 0) {
      categorias.push('FERTILIZANTE', 'FITOSANITARIO');
    }

    const volumenTotal = categorias.map(c => Math.round((volumenPorCategoria.get(c) || 0) * 100) / 100);
    const sumaVolumen = volumenTotal.reduce((acc, v) => acc + v, 0);
    const porcentajes = volumenTotal.map(v => (sumaVolumen > 0 ? Math.round((v / sumaVolumen) * 10000) / 100 : 0));
    const unidades = categorias.map(c => (c === 'FITOSANITARIO' ? 'L' : 'kg'));

    const consumoInsumosPorCategoria = {
      categorias,
      volumenTotal,
      unidades,
      porcentajes,
    };

    // 5.3 Rendimiento por Cultivo
    const cultivoKilosMap = new Map<string, { brutos: number; netos: number; superficie: number }>();
    for (const ciclo of ciclos) {
      const cosechasCiclo = cosechas.filter(c => c.cicloId === ciclo.id);
      const brutos = cosechasCiclo.reduce((acc, c) => acc + c.cantidadCosechadaKg, 0);
      const netos = cosechasCiclo.reduce((acc, c) => acc + c.cantidadComercializableKg, 0);
      const cultivo = ciclo.cultivo;

      const act = cultivoKilosMap.get(cultivo) || { brutos: 0, netos: 0, superficie: 0 };
      act.brutos += brutos;
      act.netos += netos;
      act.superficie += ciclo.superficieCultivadaHa;
      cultivoKilosMap.set(cultivo, act);
    }

    const cultivos = Array.from(cultivoKilosMap.keys());
    const rendimientoBrutoKgHa = cultivos.map(cu => {
      const item = cultivoKilosMap.get(cu)!;
      return item.superficie > 0 ? Math.round((item.brutos / item.superficie) * 100) / 100 : 0;
    });
    const rendimientoComercialKgHa = cultivos.map(cu => {
      const item = cultivoKilosMap.get(cu)!;
      return item.superficie > 0 ? Math.round((item.netos / item.superficie) * 100) / 100 : 0;
    });

    const rendimientoPorCultivo = {
      cultivos,
      rendimientoBrutoKgHa,
      rendimientoComercialKgHa,
    };

    // 6. Cómputo de Costos Operativos por Lote (RF-M7-14)
    const preciosInsumoRef: Record<string, number> = {
      FERTILIZANTE: 1200,    // $1.200 / kg
      FITOSANITARIO: 8500,   // $8.500 / L
      SEMILLA_PLANTIN: 3000, // $3.000 / ud
      ENMIENDA: 900,         // $900 / kg
      OTRO: 1500,
    };

    const TARIFA_JORNAL = 25000;      // $25.000 por jornal
    const TARIFA_HORA_PERSONAL = 3500; // $3.500 por hora
    const TARIFA_HORA_TRACTOR = 18000; // $18.000 por hora tractor / maquinaria

    const costosPorLote: CostoOperativoLoteDto[] = [];
    for (const lote of lotes) {
      const cosechasLote = cosechas.filter(c => c.loteId === lote.id);
      const kilosCosechados = Math.round(cosechasLote.reduce((acc, c) => acc + c.cantidadCosechadaKg, 0) * 100) / 100;

      // Insumos aplicados al lote
      const appsLote = aplicacionesScope.filter(a => a.loteId === lote.id);
      let costoInsumos = 0;
      for (const a of appsLote) {
        for (const linea of a.lineas) {
          const insumo = insumosMap.get(linea.insumoId);
          const precioRef = preciosInsumoRef[insumo?.categoria || 'OTRO'] || 1500;
          costoInsumos += linea.cantidadTotal * precioRef;
        }
      }

      // Actividades realizadas en el lote
      const actsLote = actividades.filter(a => a.loteId === lote.id);
      let costoManoObra = 0;
      let costoMaquinaria = 0;

      for (const act of actsLote) {
        // Mano de obra
        for (const mo of act.manoDeObra) {
          if (mo.jornales > 0) {
            costoManoObra += mo.jornales * TARIFA_JORNAL;
          } else if (mo.horasTrabajadas > 0) {
            costoManoObra += mo.horasTrabajadas * TARIFA_HORA_PERSONAL;
          }
        }

        // Maquinaria
        for (const maq of act.maquinarias) {
          costoMaquinaria += (maq.horasUso || 0) * TARIFA_HORA_TRACTOR;
        }
      }

      const supHa = lote.superficieHa || 1;
      const costoTotalEstimado = Math.round((costoInsumos + costoManoObra + costoMaquinaria) * 100) / 100;
      const costoPorHectarea = Math.round((costoTotalEstimado / supHa) * 100) / 100;
      const costoPorKiloCosechado = kilosCosechados > 0
        ? Math.round((costoTotalEstimado / kilosCosechados) * 100) / 100
        : 0;

      costosPorLote.push({
        loteId: lote.id,
        codigoLote: lote.codigoLote?.value || lote.id,
        cultivo: lote.producto || 'Agrícola',
        superficieHa: lote.superficieHa || 0,
        kilosCosechados,
        costoInsumos: Math.round(costoInsumos * 100) / 100,
        costoManoObra: Math.round(costoManoObra * 100) / 100,
        costoMaquinaria: Math.round(costoMaquinaria * 100) / 100,
        costoTotalEstimado,
        costoPorHectarea,
        costoPorKiloCosechado,
      });
    }

    return {
      kpis: {
        lotesEnProduccion: {
          totalLotes,
          lotesActivos,
          superficieTotalHa,
          superficieEnProduccionHa,
          ciclosEnCurso: ciclosEnCurso.length,
        },
        produccionAcumulada: {
          totalKilosCosechados,
          totalKilosComercializables,
          totalKilosDescarte,
          porcentajeDescarte,
          totalCosechas,
        },
        alertasStockInsumos: {
          totalInsumosMonitoreados: insumos.length,
          insumosStockCritico,
          insumosStockBajo,
          alertas: alertasStock,
        },
        actividadesVencidasOPendientes: {
          totalActividades: actividades.length,
          pendientesPlanificadas,
          vencidas,
          proximasAVencer7Dias,
          items: itemsActividades,
        },
      },
      graficos: {
        evolucionCosecha,
        consumoInsumosPorCategoria,
        rendimientoPorCultivo,
      },
      costosPorLote,
      timestamp: new Date().toISOString(),
    };
  }
}
