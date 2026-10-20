import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';
import { CosechasRepositoryPort } from '../../core/ports/cosechas-repository.port.js';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import { ActividadesRepositoryPort } from '../../core/ports/actividades-repository.port.js';
import { CatalogosActividadesRepositoryPort } from '../../core/ports/catalogos-actividades-repository.port.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import {
  FiltrosIndicadoresProduccionDto,
  IndicadoresProduccionResponseDto,
  IndicadoresCicloDetalleDto,
  IndicadoresLoteDetalleDto,
  IndicadorCicloItemDto,
  IndicadorLoteItemDto,
  IndicadorCultivoItemDto,
  ResumenGlobalIndicadoresDto,
  LaboresPorCategoriaDto,
} from '../dtos/indicadores-produccion.dto.js';
import { CicloProductivo } from '../../core/domain/entities/ciclo-productivo.entity.js';
import { Cosecha } from '../../core/domain/entities/cosecha.entity.js';

export interface CalcularMetricasProduccionDependencies {
  lotesRepo: LotesRepositoryPort;
  ciclosRepo: CiclosRepositoryPort;
  cosechasRepo: CosechasRepositoryPort;
  fincasRepo?: FincasRepositoryPort;
  actividadesRepo?: ActividadesRepositoryPort;
  catalogosRepo?: CatalogosActividadesRepositoryPort;
}

export class CalcularMetricasProduccionUseCase {
  constructor(private readonly deps: CalcularMetricasProduccionDependencies) {}

  /**
   * Genera el informe global de métricas de producción, rendimientos y descarte (RF-M7-01, RF-M7-02, RF-M7-07, RF-M7-08, RF-M7-09).
   */
  public async execute(filtros: FiltrosIndicadoresProduccionDto = {}): Promise<IndicadoresProduccionResponseDto> {
    // 1. Cargar Fincas para resolución de nombres
    const fincasMap = new Map<string, string>();
    if (this.deps.fincasRepo) {
      try {
        const fincas = await this.deps.fincasRepo.listarTodas();
        for (const f of fincas) {
          fincasMap.set(f.id, f.nombre);
        }
      } catch {
        // Fallback silencioso
      }
    }

    // 2. Obtener lotes según filtros
    let lotes = await this.deps.lotesRepo.listarTodos();
    if (filtros.fincaId) {
      lotes = lotes.filter(l => l.fincaId === filtros.fincaId);
    }
    if (filtros.loteId) {
      lotes = lotes.filter(l => l.id === filtros.loteId);
    }
    const lotesMap = new Map(lotes.map(l => [l.id, l]));

    // 3. Obtener ciclos según filtros
    let ciclos: CicloProductivo[] = [];
    if (filtros.cicloId) {
      const c = await this.deps.ciclosRepo.buscarPorId(filtros.cicloId);
      if (c) ciclos = [c];
    } else if (filtros.loteId) {
      ciclos = await this.deps.ciclosRepo.buscarPorLote(filtros.loteId);
    } else {
      ciclos = await this.deps.ciclosRepo.listar({
        cultivo: filtros.cultivo,
        variedad: filtros.variedad,
        estado: filtros.estadoCiclo as any,
      });
    }

    // Filtrar ciclos que pertenezcan a los lotes válidos
    ciclos = ciclos.filter(c => lotesMap.has(c.loteId));

    if (filtros.cultivo) {
      const cultLower = filtros.cultivo.toLowerCase();
      ciclos = ciclos.filter(c => c.cultivo.toLowerCase().includes(cultLower));
    }
    if (filtros.variedad) {
      const varLower = filtros.variedad.toLowerCase();
      ciclos = ciclos.filter(c => c.variedad?.toLowerCase().includes(varLower));
    }
    if (filtros.estadoCiclo) {
      ciclos = ciclos.filter(c => c.estado === filtros.estadoCiclo);
    }

    // 4. Mapear tipos de actividad si el catálogo está disponible
    const categoriasActividadMap = new Map<string, string>();
    if (this.deps.catalogosRepo) {
      try {
        const tipos = await this.deps.catalogosRepo.listarTiposActividad();
        for (const t of tipos) {
          categoriasActividadMap.set(t.id, t.categoria);
        }
      } catch {
        // Fallback
      }
    }

    // 5. Procesar métricas por ciclo
    const desglosePorCiclo: IndicadorCicloItemDto[] = [];

    for (const ciclo of ciclos) {
      const lote = lotesMap.get(ciclo.loteId);
      const fincaNombre = lote?.fincaId ? fincasMap.get(lote.fincaId) ?? null : null;

      // Obtener cosechas activas del ciclo
      const cosechasCiclo = await this.deps.cosechasRepo.listar({
        cicloId: ciclo.id,
        fechaDesde: filtros.desde,
        fechaHasta: filtros.hasta,
      });
      const cosechasActivas = cosechasCiclo.filter(c => c.estaActiva());

      const totalKilosCosechados = cosechasActivas.reduce((acc, c) => acc + c.cantidadCosechadaKg, 0);
      const totalKilosComercializables = cosechasActivas.reduce((acc, c) => acc + c.cantidadComercializableKg, 0);
      const totalKilosDescarte = cosechasActivas.reduce((acc, c) => acc + c.cantidadDescarteKg, 0);

      const porcentajeDescarte = totalKilosCosechados > 0
        ? Math.round((totalKilosDescarte / totalKilosCosechados) * 10000) / 100
        : 0;

      const supHa = ciclo.superficieCultivadaHa;
      const rendimientoBrutoKgHa = supHa > 0
        ? Math.round((totalKilosCosechados / supHa) * 100) / 100
        : 0;
      const rendimientoComercializableKgHa = supHa > 0
        ? Math.round((totalKilosComercializables / supHa) * 100) / 100
        : 0;

      // Tasa de prendimiento de plantas (RF-M7-09)
      const tasaPrendimiento = ciclo.calcularTasaPrendimiento();
      const prendimientoPlantas = {
        plantasPlantadas: ciclo.plantasPlantadas ?? null,
        plantasVivas: ciclo.plantasVivas ?? null,
        plantasRepuestas: ciclo.plantasRepuestas ?? null,
        tasaPrendimientoPorcentaje: tasaPrendimiento,
      };

      // Desglose de labores (RF-M7-08)
      const labores = await this.obtenerLaboresCiclo(ciclo.id, categoriasActividadMap);

      desglosePorCiclo.push({
        cicloId: ciclo.id,
        codigoCiclo: ciclo.codigoCiclo,
        loteId: ciclo.loteId,
        codigoLote: lote?.codigoLote?.value ?? ciclo.loteId,
        fincaId: lote?.fincaId ?? null,
        fincaNombre,
        cultivo: ciclo.cultivo,
        variedad: ciclo.variedad ?? null,
        estadoCiclo: ciclo.estado,
        superficieCultivadaHa: supHa,
        fechaInicio: ciclo.fechaInicio,
        fechaFin: ciclo.fechaFin ?? null,
        totalKilosCosechados: Math.round(totalKilosCosechados * 100) / 100,
        totalKilosComercializables: Math.round(totalKilosComercializables * 100) / 100,
        totalKilosDescarte: Math.round(totalKilosDescarte * 100) / 100,
        porcentajeDescarte,
        rendimientoBrutoKgHa,
        rendimientoComercializableKgHa,
        prendimientoPlantas,
        labores,
        cantidadCosechas: cosechasActivas.length,
      });
    }

    // 6. Agregación por Lote
    const desglosePorLoteMap = new Map<string, {
      loteId: string;
      codigoLote: string;
      fincaId: string | null;
      fincaNombre: string | null;
      producto: string;
      variedad: string | null;
      superficieHa: number | null;
      ciclosCount: number;
      totalCosechado: number;
      totalComercializable: number;
      totalDescarte: number;
    }>();

    for (const c of desglosePorCiclo) {
      const lote = lotesMap.get(c.loteId);
      const existing = desglosePorLoteMap.get(c.loteId);
      if (!existing) {
        desglosePorLoteMap.set(c.loteId, {
          loteId: c.loteId,
          codigoLote: c.codigoLote,
          fincaId: c.fincaId,
          fincaNombre: c.fincaNombre,
          producto: lote?.producto ?? c.cultivo,
          variedad: lote?.variedad ?? c.variedad,
          superficieHa: lote?.superficieHa ?? c.superficieCultivadaHa,
          ciclosCount: 1,
          totalCosechado: c.totalKilosCosechados,
          totalComercializable: c.totalKilosComercializables,
          totalDescarte: c.totalKilosDescarte,
        });
      } else {
        existing.ciclosCount += 1;
        existing.totalCosechado += c.totalKilosCosechados;
        existing.totalComercializable += c.totalKilosComercializables;
        existing.totalDescarte += c.totalKilosDescarte;
      }
    }

    const desglosePorLote: IndicadorLoteItemDto[] = Array.from(desglosePorLoteMap.values()).map(l => {
      const sup = l.superficieHa && l.superficieHa > 0 ? l.superficieHa : 1;
      const pctDescarte = l.totalCosechado > 0
        ? Math.round((l.totalDescarte / l.totalCosechado) * 10000) / 100
        : 0;
      const rendBruto = Math.round((l.totalCosechado / sup) * 100) / 100;
      const rendNeto = Math.round((l.totalComercializable / sup) * 100) / 100;

      return {
        loteId: l.loteId,
        codigoLote: l.codigoLote,
        fincaId: l.fincaId,
        fincaNombre: l.fincaNombre,
        producto: l.producto,
        variedad: l.variedad,
        superficieHa: l.superficieHa,
        totalCiclos: l.ciclosCount,
        totalKilosCosechados: Math.round(l.totalCosechado * 100) / 100,
        totalKilosComercializables: Math.round(l.totalComercializable * 100) / 100,
        totalKilosDescarte: Math.round(l.totalDescarte * 100) / 100,
        porcentajeDescarte: pctDescarte,
        rendimientoBrutoKgHa: rendBruto,
        rendimientoComercializableKgHa: rendNeto,
      };
    });

    // 7. Agregación por Cultivo
    const desglosePorCultivoMap = new Map<string, {
      cultivo: string;
      superficieHa: number;
      totalCosechado: number;
      totalComercializable: number;
      totalDescarte: number;
      ciclosCount: number;
      lotesSet: Set<string>;
    }>();

    for (const c of desglosePorCiclo) {
      const existing = desglosePorCultivoMap.get(c.cultivo);
      if (!existing) {
        desglosePorCultivoMap.set(c.cultivo, {
          cultivo: c.cultivo,
          superficieHa: c.superficieCultivadaHa,
          totalCosechado: c.totalKilosCosechados,
          totalComercializable: c.totalKilosComercializables,
          totalDescarte: c.totalKilosDescarte,
          ciclosCount: 1,
          lotesSet: new Set([c.loteId]),
        });
      } else {
        existing.superficieHa += c.superficieCultivadaHa;
        existing.totalCosechado += c.totalKilosCosechados;
        existing.totalComercializable += c.totalKilosComercializables;
        existing.totalDescarte += c.totalKilosDescarte;
        existing.ciclosCount += 1;
        existing.lotesSet.add(c.loteId);
      }
    }

    const desglosePorCultivo: IndicadorCultivoItemDto[] = Array.from(desglosePorCultivoMap.values()).map(cu => {
      const sup = cu.superficieHa > 0 ? cu.superficieHa : 1;
      const pctDescarte = cu.totalCosechado > 0
        ? Math.round((cu.totalDescarte / cu.totalCosechado) * 10000) / 100
        : 0;
      return {
        cultivo: cu.cultivo,
        superficieTotalHa: Math.round(cu.superficieHa * 100) / 100,
        totalKilosCosechados: Math.round(cu.totalCosechado * 100) / 100,
        totalKilosComercializables: Math.round(cu.totalComercializable * 100) / 100,
        totalKilosDescarte: Math.round(cu.totalDescarte * 100) / 100,
        porcentajeDescarte: pctDescarte,
        rendimientoPromedioKgHa: Math.round((cu.totalCosechado / sup) * 100) / 100,
        rendimientoComercializableKgHa: Math.round((cu.totalComercializable / sup) * 100) / 100,
        totalCiclos: cu.ciclosCount,
        totalLotes: cu.lotesSet.size,
      };
    });

    // 8. Resumen Global Consolidado
    const superficieTotalHa = desglosePorCiclo.reduce((acc, c) => acc + c.superficieCultivadaHa, 0);
    const totalKilosCosechados = desglosePorCiclo.reduce((acc, c) => acc + c.totalKilosCosechados, 0);
    const totalKilosComercializables = desglosePorCiclo.reduce((acc, c) => acc + c.totalKilosComercializables, 0);
    const totalKilosDescarte = desglosePorCiclo.reduce((acc, c) => acc + c.totalKilosDescarte, 0);
    const totalCosechas = desglosePorCiclo.reduce((acc, c) => acc + c.cantidadCosechas, 0);

    const porcentajeDescarteGlobal = totalKilosCosechados > 0
      ? Math.round((totalKilosDescarte / totalKilosCosechados) * 10000) / 100
      : 0;

    const rendimientoPromedioKgHa = superficieTotalHa > 0
      ? Math.round((totalKilosCosechados / superficieTotalHa) * 100) / 100
      : 0;

    const rendimientoComercializableKgHa = superficieTotalHa > 0
      ? Math.round((totalKilosComercializables / superficieTotalHa) * 100) / 100
      : 0;

    // Promedio ponderado de tasa de prendimiento
    const ciclosConPrendimiento = desglosePorCiclo.filter(c => c.prendimientoPlantas.tasaPrendimientoPorcentaje !== null);
    let tasaPrendimientoPromedioPorcentaje: number | null = null;
    if (ciclosConPrendimiento.length > 0) {
      const sum = ciclosConPrendimiento.reduce((acc, c) => acc + c.prendimientoPlantas.tasaPrendimientoPorcentaje!, 0);
      tasaPrendimientoPromedioPorcentaje = Math.round((sum / ciclosConPrendimiento.length) * 100) / 100;
    }

    const resumenGlobal: ResumenGlobalIndicadoresDto = {
      superficieTotalHa: Math.round(superficieTotalHa * 100) / 100,
      totalKilosCosechados: Math.round(totalKilosCosechados * 100) / 100,
      totalKilosComercializables: Math.round(totalKilosComercializables * 100) / 100,
      totalKilosDescarte: Math.round(totalKilosDescarte * 100) / 100,
      porcentajeDescarteGlobal,
      rendimientoPromedioKgHa,
      rendimientoComercializableKgHa,
      totalCosechas,
      totalCiclos: desglosePorCiclo.length,
      totalLotes: desglosePorLote.length,
      tasaPrendimientoPromedioPorcentaje,
    };

    return {
      filtrosAplicados: { ...filtros },
      fechaCalculoUtc: new Date().toISOString(),
      resumenGlobal,
      desglosePorCiclo,
      desglosePorLote,
      desglosePorCultivo,
    };
  }

  /**
   * Obtiene el reporte detallado de indicadores para un ciclo específico.
   */
  public async obtenerIndicadoresCiclo(cicloId: string): Promise<IndicadoresCicloDetalleDto> {
    const ciclo = await this.deps.ciclosRepo.buscarPorId(cicloId);
    if (!ciclo) {
      throw new EntidadNoEncontradaError('CicloProductivo', cicloId);
    }

    const lote = await this.deps.lotesRepo.buscarPorId(ciclo.loteId);
    let fincaNombre: string | null = null;
    if (lote?.fincaId && this.deps.fincasRepo) {
      try {
        const finca = await this.deps.fincasRepo.buscarPorId(lote.fincaId);
        fincaNombre = finca?.nombre ?? null;
      } catch {
        // Fallback
      }
    }

    // Cosechas del ciclo
    const cosechas = await this.deps.cosechasRepo.listar({ cicloId: ciclo.id });
    const cosechasActivas = cosechas.filter(c => c.estaActiva());

    const totalKilosCosechados = cosechasActivas.reduce((acc, c) => acc + c.cantidadCosechadaKg, 0);
    const totalKilosComercializables = cosechasActivas.reduce((acc, c) => acc + c.cantidadComercializableKg, 0);
    const totalKilosDescarte = cosechasActivas.reduce((acc, c) => acc + c.cantidadDescarteKg, 0);

    const porcentajeDescarte = totalKilosCosechados > 0
      ? Math.round((totalKilosDescarte / totalKilosCosechados) * 10000) / 100
      : 0;

    const supHa = ciclo.superficieCultivadaHa;
    const rendimientoBrutoKgHa = supHa > 0
      ? Math.round((totalKilosCosechados / supHa) * 100) / 100
      : 0;
    const rendimientoComercializableKgHa = supHa > 0
      ? Math.round((totalKilosComercializables / supHa) * 100) / 100
      : 0;

    // Prendimiento (RF-M7-09)
    const tasaPrendimiento = ciclo.calcularTasaPrendimiento();
    const prendimientoPlantines = {
      plantasPlantadas: ciclo.plantasPlantadas ?? null,
      plantasVivas: ciclo.plantasVivas ?? null,
      plantasRepuestas: ciclo.plantasRepuestas ?? null,
      tasaPrendimientoPorcentaje: tasaPrendimiento,
    };

    // Labores (RF-M7-08)
    const categoriasActividadMap = new Map<string, string>();
    if (this.deps.catalogosRepo) {
      try {
        const tipos = await this.deps.catalogosRepo.listarTiposActividad();
        for (const t of tipos) {
          categoriasActividadMap.set(t.id, t.categoria);
        }
      } catch {
        // Fallback
      }
    }
    const laboresCulturales = await this.obtenerLaboresCiclo(ciclo.id, categoriasActividadMap);

    // Detalle de cosechas con % de descarte individual (RF-M7-07)
    const cosechasDto = cosechas.map(c => {
      const pct = c.cantidadCosechadaKg > 0
        ? Math.round((c.cantidadDescarteKg / c.cantidadCosechadaKg) * 10000) / 100
        : 0;
      return {
        cosechaId: c.id,
        codigoTrazabilidad: c.codigoTrazabilidad.value,
        fecha: c.fecha,
        cantidadCosechadaKg: c.cantidadCosechadaKg,
        cantidadComercializableKg: c.cantidadComercializableKg,
        cantidadDescarteKg: c.cantidadDescarteKg,
        porcentajeDescarte: pct,
        motivoDescarte: c.motivoDescarte ?? null,
        estado: c.estado,
      };
    });

    return {
      ciclo: {
        id: ciclo.id,
        codigoCiclo: ciclo.codigoCiclo,
        loteId: ciclo.loteId,
        codigoLote: lote?.codigoLote?.value ?? ciclo.loteId,
        fincaId: lote?.fincaId ?? null,
        fincaNombre,
        cultivo: ciclo.cultivo,
        variedad: ciclo.variedad ?? null,
        estado: ciclo.estado,
        superficieCultivadaHa: supHa,
        fechaInicio: ciclo.fechaInicio,
        fechaFin: ciclo.fechaFin ?? null,
      },
      metricasProduccion: {
        totalKilosCosechados: Math.round(totalKilosCosechados * 100) / 100,
        totalKilosComercializables: Math.round(totalKilosComercializables * 100) / 100,
        totalKilosDescarte: Math.round(totalKilosDescarte * 100) / 100,
        porcentajeDescarte,
        rendimientoBrutoKgHa,
        rendimientoComercializableKgHa,
      },
      prendimientoPlantines,
      laboresCulturales,
      cosechas: cosechasDto,
    };
  }

  /**
   * Obtiene el reporte consolidado de rendimiento y métricas históricas de un lote.
   */
  public async obtenerIndicadoresLote(loteId: string): Promise<IndicadoresLoteDetalleDto> {
    const lote = await this.deps.lotesRepo.buscarPorId(loteId) 
      ?? await this.deps.lotesRepo.buscarPorCodigo(loteId);

    if (!lote) {
      throw new EntidadNoEncontradaError('Lote', loteId);
    }

    let fincaNombre: string | null = null;
    if (lote.fincaId && this.deps.fincasRepo) {
      try {
        const finca = await this.deps.fincasRepo.buscarPorId(lote.fincaId);
        fincaNombre = finca?.nombre ?? null;
      } catch {
        // Fallback
      }
    }

    const resultadoGeneral = await this.execute({ loteId: lote.id });
    const ciclosDelLote = resultadoGeneral.desglosePorCiclo.filter(c => c.loteId === lote.id);

    const totalKilosCosechados = ciclosDelLote.reduce((acc, c) => acc + c.totalKilosCosechados, 0);
    const totalKilosComercializables = ciclosDelLote.reduce((acc, c) => acc + c.totalKilosComercializables, 0);
    const totalKilosDescarte = ciclosDelLote.reduce((acc, c) => acc + c.totalKilosDescarte, 0);
    const totalCosechas = ciclosDelLote.reduce((acc, c) => acc + c.cantidadCosechas, 0);

    const supHa = lote.superficieHa && lote.superficieHa > 0
      ? lote.superficieHa
      : (ciclosDelLote[0]?.superficieCultivadaHa ?? 1);

    const porcentajeDescarte = totalKilosCosechados > 0
      ? Math.round((totalKilosDescarte / totalKilosCosechados) * 10000) / 100
      : 0;

    const rendimientoBrutoKgHa = supHa > 0
      ? Math.round((totalKilosCosechados / supHa) * 100) / 100
      : 0;

    const rendimientoComercializableKgHa = supHa > 0
      ? Math.round((totalKilosComercializables / supHa) * 100) / 100
      : 0;

    return {
      lote: {
        id: lote.id,
        codigoLote: lote.codigoLote.value,
        fincaId: lote.fincaId ?? null,
        fincaNombre,
        producto: lote.producto,
        variedad: lote.variedad ?? null,
        superficieHa: lote.superficieHa ?? null,
      },
      metricasConsolidadas: {
        totalKilosCosechados: Math.round(totalKilosCosechados * 100) / 100,
        totalKilosComercializables: Math.round(totalKilosComercializables * 100) / 100,
        totalKilosDescarte: Math.round(totalKilosDescarte * 100) / 100,
        porcentajeDescarte,
        rendimientoBrutoKgHa,
        rendimientoComercializableKgHa,
        totalCiclos: ciclosDelLote.length,
        totalCosechas,
      },
      ciclos: ciclosDelLote,
    };
  }

  /**
   * Helper privado para desglosar actividades por categoría y estado (RF-M7-08).
   */
  private async obtenerLaboresCiclo(
    cicloId: string,
    categoriasMap: Map<string, string>
  ): Promise<LaboresPorCategoriaDto> {
    const conteoPorCategoria: Record<string, number> = {
      SUELO: 0,
      SIEMBRA: 0,
      RIEGO: 0,
      NUTRICION: 0,
      SANIDAD: 0,
      MANEJO: 0,
      COSECHA: 0,
      MANTENIMIENTO: 0,
      OTRO: 0,
    };

    const conteoPorEstado: Record<string, number> = {
      REALIZADA: 0,
      PLANIFICADA: 0,
      VENCIDA: 0,
      CANCELADA: 0,
    };

    if (!this.deps.actividadesRepo) {
      return { conteoPorCategoria, conteoPorEstado, totalLabores: 0 };
    }

    try {
      const actividades = await this.deps.actividadesRepo.listar({ cicloId });

      for (const act of actividades) {
        // Estado
        if (conteoPorEstado[act.estado] !== undefined) {
          conteoPorEstado[act.estado] += 1;
        } else {
          conteoPorEstado[act.estado] = 1;
        }

        // Categoría
        const categoria = categoriasMap.get(act.tipoActividadId) ?? 'OTRO';
        if (conteoPorCategoria[categoria] !== undefined) {
          conteoPorCategoria[categoria] += 1;
        } else {
          conteoPorCategoria[categoria] = 1;
        }
      }

      return {
        conteoPorCategoria,
        conteoPorEstado,
        totalLabores: actividades.length,
      };
    } catch {
      return { conteoPorCategoria, conteoPorEstado, totalLabores: 0 };
    }
  }
}
