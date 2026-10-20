import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { CiclosRepositoryPort } from '../../core/ports/ciclos-repository.port.js';
import { LotesRepositoryPort } from '../../core/ports/lotes-repository.port.js';
import { CosechasRepositoryPort } from '../../core/ports/cosechas-repository.port.js';
import { AplicacionesRepositoryPort } from '../../core/ports/aplicaciones-repository.port.js';
import { InsumosCatalogoRepository } from '../../core/ports/insumos-catalogo-repository.port.js';
import { FincasRepositoryPort } from '../../core/ports/fincas-repository.port.js';
import { CicloProductivo } from '../../core/domain/entities/ciclo-productivo.entity.js';
import { InsumoCatalogo } from '../../core/domain/entities/insumo-catalogo.entity.js';
import {
  FiltrosComparadorCampanasDto,
  ModoComparacion,
  ComparativaCampanasResponseDto,
  ComparativaCampanasItemDto,
  ResumenComparativaCampanasDto,
  EficienciaInsumosResumenDto,
  EficienciaInsumoItemDto,
  DeltasComparativaDto,
  EficienciaInsumosResponseDto,
  TendenciaRendimiento,
} from '../dtos/comparador-campanas.dto.js';

export interface CompararCampanasDependencies {
  ciclosRepo: CiclosRepositoryPort;
  lotesRepo: LotesRepositoryPort;
  cosechasRepo: CosechasRepositoryPort;
  aplicacionesRepo: AplicacionesRepositoryPort;
  insumosRepo: InsumosCatalogoRepository;
  fincasRepo?: FincasRepositoryPort;
}

export class CompararCampanasUseCase {
  constructor(private readonly deps: CompararCampanasDependencies) {}

  /**
   * Ejecuta la comparación multidimensional de campañas (RF-M7-03, RF-M7-04, RF-M7-05, RF-M7-06, RF-M7-10, RF-M7-11).
   */
  public async comparar(filtros: FiltrosComparadorCampanasDto = {}): Promise<ComparativaCampanasResponseDto> {
    // 1. Determinar modo de comparación
    const modo: ModoComparacion = filtros.modo ?? (
      filtros.loteId ? 'INTERCAMPANA_LOTE' :
      filtros.temporada ? 'INTERLOTE_CAMPANA' :
      'PERSONALIZADA'
    );

    // 2. Pre-cargar fincas y lotes para enriquecer metadatos
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

    let lotes = await this.deps.lotesRepo.listarTodos();
    if (filtros.fincaId) {
      lotes = lotes.filter(l => l.fincaId === filtros.fincaId);
    }
    if (filtros.loteId) {
      lotes = lotes.filter(l => l.id === filtros.loteId);
    }
    const lotesMap = new Map(lotes.map(l => [l.id, l]));

    // 3. Pre-cargar catálogo de insumos
    const todosInsumos = await this.deps.insumosRepo.listar();
    const insumosMap = new Map(todosInsumos.map(i => [i.id, i]));

    // 4. Obtener ciclos a comparar
    let ciclos: CicloProductivo[] = [];
    if (filtros.cicloIds && filtros.cicloIds.length > 0) {
      for (const id of filtros.cicloIds) {
        const c = await this.deps.ciclosRepo.buscarPorId(id);
        if (c) ciclos.push(c);
      }
    } else if (filtros.loteId) {
      ciclos = await this.deps.ciclosRepo.buscarPorLote(filtros.loteId);
    } else {
      ciclos = await this.deps.ciclosRepo.listar({
        cultivo: filtros.cultivo,
        variedad: filtros.variedad,
        temporada: filtros.temporada,
      });
    }

    // Filtrar ciclos según filtros adicionales y pertenencia a lotes válidos
    ciclos = ciclos.filter(c => lotesMap.has(c.loteId));

    if (filtros.temporada) {
      const tempLower = filtros.temporada.toLowerCase();
      ciclos = ciclos.filter(c => c.temporada.toLowerCase() === tempLower);
    }
    if (filtros.cultivo) {
      const cultLower = filtros.cultivo.toLowerCase();
      ciclos = ciclos.filter(c => c.cultivo.toLowerCase().includes(cultLower));
    }
    if (filtros.variedad) {
      const varLower = filtros.variedad.toLowerCase();
      ciclos = ciclos.filter(c => c.variedad?.toLowerCase().includes(varLower));
    }
    if (filtros.desde) {
      ciclos = ciclos.filter(c => c.fechaInicio >= filtros.desde!);
    }
    if (filtros.hasta) {
      ciclos = ciclos.filter(c => c.fechaInicio <= filtros.hasta!);
    }

    // 5. Procesar métricas básicas y de insumo-producto por cada ciclo
    const itemsSinDeltas: Omit<ComparativaCampanasItemDto, 'deltas'>[] = [];

    for (const ciclo of ciclos) {
      const lote = lotesMap.get(ciclo.loteId);
      const fincaNombre = lote?.fincaId ? fincasMap.get(lote.fincaId) ?? undefined : undefined;

      // Cosechas activas del ciclo
      const cosechas = await this.deps.cosechasRepo.listar({ cicloId: ciclo.id });
      const cosechasActivas = cosechas.filter(c => c.estaActiva());

      const kilosBrutos = Math.round(cosechasActivas.reduce((acc, c) => acc + c.cantidadCosechadaKg, 0) * 100) / 100;
      const kilosNetos = Math.round(cosechasActivas.reduce((acc, c) => acc + c.cantidadComercializableKg, 0) * 100) / 100;
      const kilosDescarte = Math.round(cosechasActivas.reduce((acc, c) => acc + c.cantidadDescarteKg, 0) * 100) / 100;

      const porcentajeDescarte = kilosBrutos > 0
        ? Math.round((kilosDescarte / kilosBrutos) * 10000) / 100
        : 0;

      const supHa = ciclo.superficieCultivadaHa > 0 ? ciclo.superficieCultivadaHa : 1;
      const rendimientoBrutoKgHa = Math.round((kilosBrutos / supHa) * 100) / 100;
      const rendimientoComercialKgHa = Math.round((kilosNetos / supHa) * 100) / 100;

      // Eficiencia agronómica e insumo-producto (RF-M7-05)
      const eficienciaInsumos = await this.calcularEficienciaInsumosCiclo(ciclo, kilosBrutos, insumosMap);

      // Distinción de estado cerrado vs en curso (RF-M7-11)
      const esProvisional = ciclo.esProvisional();
      const advertenciaEstadoParcial = esProvisional
        ? 'Métricas provisionales: ciclo en curso con cosecha o labores parciales'
        : null;

      itemsSinDeltas.push({
        cicloId: ciclo.id,
        codigoCiclo: ciclo.codigoCiclo,
        loteId: ciclo.loteId,
        codigoLote: lote?.codigoLote?.value ?? ciclo.loteId,
        nombreLote: lote?.codigoLote?.value ?? ciclo.loteId,
        fincaId: lote?.fincaId ?? null,
        fincaNombre: fincaNombre ?? null,
        nombreFinca: fincaNombre ?? null,
        cultivo: ciclo.cultivo,
        variedad: ciclo.variedad ?? undefined,
        superficieHectareas: ciclo.superficieCultivadaHa,
        temporada: ciclo.temporada,
        fechaInicio: ciclo.fechaInicio,
        fechaFin: ciclo.fechaFin ?? null,
        estado: ciclo.estado,
        esProvisional,
        advertenciaEstadoParcial,
        kilosBrutos,
        kilosNetos,
        kilosDescarte,
        porcentajeDescarte,
        rendimientoBrutoKgHa,
        rendimientoComercialKgHa,
        eficienciaInsumos,
      });
    }

    // 6. Ordenamiento según el modo
    if (modo === 'INTERCAMPANA_LOTE') {
      // Orden cronológico ascendente para evaluar evolución histórica
      itemsSinDeltas.sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
    } else if (modo === 'INTERLOTE_CAMPANA') {
      // Ranking descendente de rendimiento bruto
      itemsSinDeltas.sort((a, b) => b.rendimientoBrutoKgHa - a.rendimientoBrutoKgHa);
    } else {
      // Personalizada: orden cronológico
      itemsSinDeltas.sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
    }

    // 7. Calcular métricas promedio de referencia (RF-M7-04 / RF-M7-06)
    const superficieTotalHectareas = Math.round(itemsSinDeltas.reduce((acc, i) => acc + i.superficieHectareas, 0) * 100) / 100;
    const totalKilosBrutos = Math.round(itemsSinDeltas.reduce((acc, i) => acc + i.kilosBrutos, 0) * 100) / 100;
    const totalKilosNetos = Math.round(itemsSinDeltas.reduce((acc, i) => acc + i.kilosNetos, 0) * 100) / 100;
    const totalKilosDescarte = Math.round(itemsSinDeltas.reduce((acc, i) => acc + i.kilosDescarte, 0) * 100) / 100;
    const totalInsumos = Math.round(itemsSinDeltas.reduce((acc, i) => acc + i.eficienciaInsumos.totalVolumenInsumos, 0) * 100) / 100;

    const promedioRendimientoBrutoKgHa = superficieTotalHectareas > 0
      ? Math.round((totalKilosBrutos / superficieTotalHectareas) * 100) / 100
      : 0;

    const promedioRendimientoComercialKgHa = superficieTotalHectareas > 0
      ? Math.round((totalKilosNetos / superficieTotalHectareas) * 100) / 100
      : 0;

    const promedioPorcentajeDescarte = totalKilosBrutos > 0
      ? Math.round((totalKilosDescarte / totalKilosBrutos) * 10000) / 100
      : 0;

    const promedioEficienciaGlobalKgPorUnidad = totalInsumos > 0
      ? Math.round((totalKilosBrutos / totalInsumos) * 100) / 100
      : 0;

    // 8. Calcular deltas y variaciones porcentuales (RF-M7-06)
    const items: ComparativaCampanasItemDto[] = [];

    for (let index = 0; index < itemsSinDeltas.length; index++) {
      const current = itemsSinDeltas[index];
      let deltas: DeltasComparativaDto;

      if (modo === 'INTERCAMPANA_LOTE') {
        if (index === 0) {
          // Primer ciclo histórico no tiene campaña anterior
          deltas = {
            deltaRendimientoBrutoPorcentaje: null,
            deltaRendimientoComercialPorcentaje: null,
            deltaDescartePuntosPorcentuales: null,
            deltaEficienciaInsumosPorcentaje: null,
            variacionVsMediaCampanaRendimientoPorcentaje: promedioRendimientoBrutoKgHa > 0
              ? Math.round(((current.rendimientoBrutoKgHa - promedioRendimientoBrutoKgHa) / promedioRendimientoBrutoKgHa) * 10000) / 100
              : 0,
            variacionVsMediaCampanaDescartePuntos: Math.round((current.porcentajeDescarte - promedioPorcentajeDescarte) * 100) / 100,
          };
        } else {
          const anterior = itemsSinDeltas[index - 1];
          const deltaRendBruto = anterior.rendimientoBrutoKgHa > 0
            ? Math.round(((current.rendimientoBrutoKgHa - anterior.rendimientoBrutoKgHa) / anterior.rendimientoBrutoKgHa) * 10000) / 100
            : null;

          const deltaRendNeto = anterior.rendimientoComercialKgHa > 0
            ? Math.round(((current.rendimientoComercialKgHa - anterior.rendimientoComercialKgHa) / anterior.rendimientoComercialKgHa) * 10000) / 100
            : null;

          const deltaDescartePp = Math.round((current.porcentajeDescarte - anterior.porcentajeDescarte) * 100) / 100;

          const deltaEficiencia = anterior.eficienciaInsumos.eficienciaGlobalKgPorUnidad > 0
            ? Math.round(((current.eficienciaInsumos.eficienciaGlobalKgPorUnidad - anterior.eficienciaInsumos.eficienciaGlobalKgPorUnidad) / anterior.eficienciaInsumos.eficienciaGlobalKgPorUnidad) * 10000) / 100
            : null;

          deltas = {
            deltaRendimientoBrutoPorcentaje: deltaRendBruto,
            deltaRendimientoComercialPorcentaje: deltaRendNeto,
            deltaDescartePuntosPorcentuales: deltaDescartePp,
            deltaEficienciaInsumosPorcentaje: deltaEficiencia,
            variacionVsMediaCampanaRendimientoPorcentaje: promedioRendimientoBrutoKgHa > 0
              ? Math.round(((current.rendimientoBrutoKgHa - promedioRendimientoBrutoKgHa) / promedioRendimientoBrutoKgHa) * 10000) / 100
              : 0,
            variacionVsMediaCampanaDescartePuntos: Math.round((current.porcentajeDescarte - promedioPorcentajeDescarte) * 100) / 100,
          };
        }
      } else {
        // En modo INTERLOTE_CAMPANA o PERSONALIZADA, la comparación primaria es vs el promedio del grupo
        const deltaVsMediaRend = promedioRendimientoBrutoKgHa > 0
          ? Math.round(((current.rendimientoBrutoKgHa - promedioRendimientoBrutoKgHa) / promedioRendimientoBrutoKgHa) * 10000) / 100
          : 0;

        const deltaVsMediaDescarte = Math.round((current.porcentajeDescarte - promedioPorcentajeDescarte) * 100) / 100;

        const deltaVsMediaNeto = promedioRendimientoComercialKgHa > 0
          ? Math.round(((current.rendimientoComercialKgHa - promedioRendimientoComercialKgHa) / promedioRendimientoComercialKgHa) * 10000) / 100
          : 0;

        const deltaVsMediaEficiencia = promedioEficienciaGlobalKgPorUnidad > 0
          ? Math.round(((current.eficienciaInsumos.eficienciaGlobalKgPorUnidad - promedioEficienciaGlobalKgPorUnidad) / promedioEficienciaGlobalKgPorUnidad) * 10000) / 100
          : 0;

        deltas = {
          deltaRendimientoBrutoPorcentaje: deltaVsMediaRend,
          deltaRendimientoComercialPorcentaje: deltaVsMediaNeto,
          deltaDescartePuntosPorcentuales: deltaVsMediaDescarte,
          deltaEficienciaInsumosPorcentaje: deltaVsMediaEficiencia,
          variacionVsMediaCampanaRendimientoPorcentaje: deltaVsMediaRend,
          variacionVsMediaCampanaDescartePuntos: deltaVsMediaDescarte,
        };
      }

      items.push({
        ...current,
        deltas,
      });
    }

    // 9. Resumen y mejores valores
    let mejorRendimientoCicloId: string | null = null;
    let mejorRendimientoCodigoCiclo: string | null = null;
    let mejorEficienciaCicloId: string | null = null;
    let mejorEficienciaCodigoCiclo: string | null = null;

    if (items.length > 0) {
      const topRend = [...items].sort((a, b) => b.rendimientoBrutoKgHa - a.rendimientoBrutoKgHa)[0];
      if (topRend && topRend.rendimientoBrutoKgHa > 0) {
        mejorRendimientoCicloId = topRend.cicloId;
        mejorRendimientoCodigoCiclo = topRend.codigoCiclo;
      }

      const topEficiencia = [...items].sort((a, b) => b.eficienciaInsumos.eficienciaGlobalKgPorUnidad - a.eficienciaInsumos.eficienciaGlobalKgPorUnidad)[0];
      if (topEficiencia && topEficiencia.eficienciaInsumos.eficienciaGlobalKgPorUnidad > 0) {
        mejorEficienciaCicloId = topEficiencia.cicloId;
        mejorEficienciaCodigoCiclo = topEficiencia.codigoCiclo;
      }
    }

    // 10. Cálculo de tendencia
    const tendenciaRendimiento = this.determinarTendencia(items);

    const resumen: ResumenComparativaCampanasDto = {
      totalCiclosComparados: items.length,
      superficieTotalHectareas,
      totalKilosBrutos,
      totalKilosNetos,
      promedioRendimientoBrutoKgHa,
      promedioRendimientoComercialKgHa,
      promedioPorcentajeDescarte,
      promedioEficienciaGlobalKgPorUnidad,
      mejorRendimientoCicloId,
      mejorRendimientoCodigoCiclo,
      mejorEficienciaCicloId,
      mejorEficienciaCodigoCiclo,
      tendenciaRendimiento,
    };

    return {
      modo,
      filtrosAplicados: { ...filtros, modo },
      resumen,
      items,
    };
  }

  /**
   * Obtiene la relación insumo-producto y desglose de eficiencia agronómica para un ciclo específico (RF-M7-05).
   */
  public async obtenerEficienciaInsumos(cicloId: string): Promise<EficienciaInsumosResponseDto> {
    const ciclo = await this.deps.ciclosRepo.buscarPorId(cicloId);
    if (!ciclo) {
      throw new EntidadNoEncontradaError('CicloProductivo', cicloId);
    }

    const todosInsumos = await this.deps.insumosRepo.listar();
    const insumosMap = new Map(todosInsumos.map(i => [i.id, i]));

    const cosechas = await this.deps.cosechasRepo.listar({ cicloId: ciclo.id });
    const cosechasActivas = cosechas.filter(c => c.estaActiva());
    const kilosCosechados = Math.round(cosechasActivas.reduce((acc, c) => acc + c.cantidadCosechadaKg, 0) * 100) / 100;

    const eficiencia = await this.calcularEficienciaInsumosCiclo(ciclo, kilosCosechados, insumosMap);

    const esProvisional = ciclo.esProvisional();
    const advertenciaEstadoParcial = esProvisional
      ? 'Métricas provisionales: ciclo en curso con cosecha o labores parciales'
      : null;

    return {
      cicloId: ciclo.id,
      codigoCiclo: ciclo.codigoCiclo,
      temporada: ciclo.temporada,
      cultivo: ciclo.cultivo,
      kilosCosechados,
      superficieHectareas: ciclo.superficieCultivadaHa,
      esProvisional,
      advertenciaEstadoParcial,
      eficiencia,
    };
  }

  /**
   * Helper privado para computar las métricas de eficiencia agronómica e insumo-producto (RF-M7-05).
   */
  private async calcularEficienciaInsumosCiclo(
    ciclo: CicloProductivo,
    kilosCosecha: number,
    insumosMap: Map<string, InsumoCatalogo>
  ): Promise<EficienciaInsumosResumenDto> {
    const aplicaciones = await this.deps.aplicacionesRepo.listar({ cicloId: ciclo.id });

    // Agrupar cantidades por insumo
    const consumoPorInsumo = new Map<string, {
      insumoId: string;
      cantidadTotal: number;
      unidadMedida: string;
    }>();

    for (const app of aplicaciones) {
      for (const linea of app.lineas) {
        const actual = consumoPorInsumo.get(linea.insumoId);
        if (actual) {
          actual.cantidadTotal += linea.cantidadTotal;
        } else {
          consumoPorInsumo.set(linea.insumoId, {
            insumoId: linea.insumoId,
            cantidadTotal: linea.cantidadTotal,
            unidadMedida: linea.unidadMedidaId,
          });
        }
      }
    }

    const supHa = ciclo.superficieCultivadaHa > 0 ? ciclo.superficieCultivadaHa : 1;
    const toneladasCosecha = kilosCosecha > 0 ? kilosCosecha / 1000 : 0;

    let totalVolumenInsumos = 0;
    let totalFertilizantesKg = 0;
    let totalFitosanitariosLitros = 0;
    const desglosePorInsumo: EficienciaInsumoItemDto[] = [];

    for (const item of consumoPorInsumo.values()) {
      const insumo = insumosMap.get(item.insumoId);
      const categoria = insumo?.categoria ?? 'OTRO';
      const nombreComercial = insumo?.nombreComercial ?? `Insumo ${item.insumoId}`;
      const presentacion = insumo?.presentacion ?? 'N/A';
      const cantidad = item.cantidadTotal;

      totalVolumenInsumos += cantidad;

      if (categoria === 'FERTILIZANTE') {
        totalFertilizantesKg += cantidad;
      } else if (categoria === 'FITOSANITARIO') {
        totalFitosanitariosLitros += cantidad;
      }

      const dosisPorHectarea = Math.round((cantidad / supHa) * 10000) / 10000;
      const dosisPorToneladaCosechada = toneladasCosecha > 0
        ? Math.round((cantidad / toneladasCosecha) * 10000) / 10000
        : 0;

      const eficienciaKgPorUnidad = cantidad > 0
        ? Math.round((kilosCosecha / cantidad) * 100) / 100
        : 0;

      desglosePorInsumo.push({
        insumoId: item.insumoId,
        nombreComercial,
        categoria,
        tipo: presentacion,
        cantidadTotalAplicada: Math.round(cantidad * 100) / 100,
        unidadMedida: item.unidadMedida || insumo?.unidadMedidaId || 'UNIDAD',
        dosisPorHectarea,
        dosisPorToneladaCosechada,
        eficienciaKgPorUnidad,
      });
    }

    // Ordenar desglose de mayor a menor cantidad aplicada
    desglosePorInsumo.sort((a, b) => b.cantidadTotalAplicada - a.cantidadTotalAplicada);

    const totalVolumenRedondeado = Math.round(totalVolumenInsumos * 100) / 100;
    const totalFertilizantesRedondeado = Math.round(totalFertilizantesKg * 100) / 100;
    const totalFitosanitariosRedondeado = Math.round(totalFitosanitariosLitros * 100) / 100;

    const eficienciaGlobalKgPorUnidad = totalVolumenRedondeado > 0
      ? Math.round((kilosCosecha / totalVolumenRedondeado) * 100) / 100
      : 0;

    const eficienciaFertilizanteKgPorKg = totalFertilizantesRedondeado > 0
      ? Math.round((kilosCosecha / totalFertilizantesRedondeado) * 100) / 100
      : 0;

    const eficienciaFitosanitarioKgPorLitro = totalFitosanitariosRedondeado > 0
      ? Math.round((kilosCosecha / totalFitosanitariosRedondeado) * 100) / 100
      : 0;

    const intensidadAplicacionUnidadesPorHa = supHa > 0
      ? Math.round((totalVolumenRedondeado / supHa) * 100) / 100
      : 0;

    const intensidadAplicacionUnidadesPorTonelada = toneladasCosecha > 0
      ? Math.round((totalVolumenRedondeado / toneladasCosecha) * 100) / 100
      : 0;

    return {
      totalVolumenInsumos: totalVolumenRedondeado,
      totalFertilizantesKg: totalFertilizantesRedondeado,
      totalFitosanitariosLitros: totalFitosanitariosRedondeado,
      eficienciaGlobalKgPorUnidad,
      eficienciaFertilizanteKgPorKg,
      eficienciaFitosanitarioKgPorLitro,
      intensidadAplicacionUnidadesPorHa,
      intensidadAplicacionUnidadesPorTonelada,
      desglosePorInsumo,
    };
  }

  /**
   * Helper para evaluar la tendencia del rendimiento a lo largo de los ciclos comparados.
   */
  private determinarTendencia(items: ComparativaCampanasItemDto[]): TendenciaRendimiento {
    if (items.length < 2) {
      return 'ESTABLE';
    }

    // Ordenar cronológicamente para evaluar progresión en el tiempo
    const cronologico = [...items].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));

    let aumentos = 0;
    let disminuciones = 0;
    let estables = 0;

    for (let i = 1; i < cronologico.length; i++) {
      const prev = cronologico[i - 1].rendimientoBrutoKgHa;
      const curr = cronologico[i].rendimientoBrutoKgHa;
      const cambioRelativo = prev > 0 ? (curr - prev) / prev : 0;

      if (cambioRelativo > 0.03) {
        aumentos++;
      } else if (cambioRelativo < -0.03) {
        disminuciones++;
      } else {
        estables++;
      }
    }

    if (aumentos > 0 && disminuciones === 0) return 'ASCENDENTE';
    if (disminuciones > 0 && aumentos === 0) return 'DESCENDENTE';
    if (estables === cronologico.length - 1) return 'ESTABLE';
    return 'VARIABLE';
  }
}
