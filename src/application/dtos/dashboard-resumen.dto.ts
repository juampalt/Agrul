export interface FiltrosDashboardResumenDto {
  fincaId?: string;
  temporada?: string;
  desde?: string;
  hasta?: string;
  fechaReferenciaHoy?: Date | string;
}

export interface KpiLotesEnProduccionDto {
  totalLotes: number;
  lotesActivos: number;
  superficieTotalHa: number;
  superficieEnProduccionHa: number;
  ciclosEnCurso: number;
}

export interface KpiProduccionAcumuladaDto {
  totalKilosCosechados: number;
  totalKilosComercializables: number;
  totalKilosDescarte: number;
  porcentajeDescarte: number;
  totalCosechas: number;
}

export type NivelAlertaStock = 'CRITICO' | 'BAJO' | 'NORMAL';

export interface AlertaStockInsumoItemDto {
  insumoId: string;
  nombreComercial: string;
  categoria: string;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  consumoAcumulado: number;
  nivelAlerta: NivelAlertaStock;
}

export interface KpiAlertasStockDto {
  totalInsumosMonitoreados: number;
  insumosStockCritico: number;
  insumosStockBajo: number;
  alertas: AlertaStockInsumoItemDto[];
}

export type EstadoUrgenciaActividad = 'VENCIDA' | 'PROXIMA_A_VENCER' | 'PLANIFICADA';

export interface ActividadPendienteItemDto {
  actividadId: string;
  codigoActividad: string;
  loteId: string;
  codigoLote: string;
  tipoActividadId: string;
  tipoActividadNombre?: string;
  fechaPlanificada: string;
  estado: string;
  diasRetraso: number;
  urgencia: EstadoUrgenciaActividad;
}

export interface KpiActividadesDto {
  totalActividades: number;
  pendientesPlanificadas: number;
  vencidas: number;
  proximasAVencer7Dias: number;
  items: ActividadPendienteItemDto[];
}

export interface GraficoEvolucionCosechaDto {
  labels: string[];
  datasets: {
    kilosBrutos: number[];
    kilosComercializables: number[];
    kilosDescarte: number[];
  };
}

export interface GraficoConsumoInsumosDto {
  categorias: string[];
  volumenTotal: number[];
  unidades: string[];
  porcentajes: number[];
}

export interface GraficoRendimientoCultivoDto {
  cultivos: string[];
  rendimientoBrutoKgHa: number[];
  rendimientoComercialKgHa: number[];
}

export interface CostoOperativoLoteDto {
  loteId: string;
  codigoLote: string;
  cultivo: string;
  superficieHa: number;
  kilosCosechados: number;
  costoInsumos: number;
  costoManoObra: number;
  costoMaquinaria: number;
  costoTotalEstimado: number;
  costoPorHectarea: number;
  costoPorKiloCosechado: number;
}

export interface DashboardResumenDto {
  kpis: {
    lotesEnProduccion: KpiLotesEnProduccionDto;
    produccionAcumulada: KpiProduccionAcumuladaDto;
    alertasStockInsumos: KpiAlertasStockDto;
    actividadesVencidasOPendientes: KpiActividadesDto;
  };
  graficos: {
    evolucionCosecha: GraficoEvolucionCosechaDto;
    consumoInsumosPorCategoria: GraficoConsumoInsumosDto;
    rendimientoPorCultivo: GraficoRendimientoCultivoDto;
  };
  costosPorLote: CostoOperativoLoteDto[];
  timestamp: string;
}
