import { EstadoCiclo } from '../../core/domain/entities/ciclo-productivo.entity.js';

export type ModoComparacion = 'INTERCAMPANA_LOTE' | 'INTERLOTE_CAMPANA' | 'PERSONALIZADA';

export type TendenciaRendimiento = 'ASCENDENTE' | 'DESCENDENTE' | 'ESTABLE' | 'VARIABLE';

export interface FiltrosComparadorCampanasDto {
  modo?: ModoComparacion;
  loteId?: string;
  fincaId?: string;
  temporada?: string;
  cultivo?: string;
  variedad?: string;
  desde?: string;
  hasta?: string;
  cicloIds?: string[];
}

export interface EficienciaInsumoItemDto {
  insumoId: string;
  nombreComercial: string;
  categoria: string;
  tipo: string;
  cantidadTotalAplicada: number;
  unidadMedida: string;
  dosisPorHectarea: number;
  dosisPorToneladaCosechada: number;
  eficienciaKgPorUnidad: number;
}

export interface EficienciaInsumosResumenDto {
  totalVolumenInsumos: number;
  totalFertilizantesKg: number;
  totalFitosanitariosLitros: number;
  eficienciaGlobalKgPorUnidad: number;
  eficienciaFertilizanteKgPorKg: number;
  eficienciaFitosanitarioKgPorLitro: number;
  intensidadAplicacionUnidadesPorHa: number;
  intensidadAplicacionUnidadesPorTonelada: number;
  desglosePorInsumo: EficienciaInsumoItemDto[];
}

export interface DeltasComparativaDto {
  deltaRendimientoBrutoPorcentaje: number | null;
  deltaRendimientoComercialPorcentaje: number | null;
  deltaDescartePuntosPorcentuales: number | null;
  deltaEficienciaInsumosPorcentaje: number | null;
  variacionVsMediaCampanaRendimientoPorcentaje?: number | null;
  variacionVsMediaCampanaDescartePuntos?: number | null;
}

export interface ComparativaCampanasItemDto {
  cicloId: string;
  codigoCiclo: string;
  loteId: string;
  codigoLote?: string;
  nombreLote?: string;
  fincaId?: string | null;
  fincaNombre?: string | null;
  nombreFinca?: string | null;
  cultivo: string;
  variedad?: string;
  superficieHectareas: number;
  temporada: string;
  fechaInicio: string;
  fechaFin?: string | null;
  estado: EstadoCiclo;
  esProvisional: boolean;
  advertenciaEstadoParcial?: string | null;
  kilosBrutos: number;
  kilosNetos: number;
  kilosDescarte: number;
  porcentajeDescarte: number;
  rendimientoBrutoKgHa: number;
  rendimientoComercialKgHa: number;
  eficienciaInsumos: EficienciaInsumosResumenDto;
  deltas: DeltasComparativaDto;
}

export interface ResumenComparativaCampanasDto {
  totalCiclosComparados: number;
  superficieTotalHectareas: number;
  totalKilosBrutos: number;
  totalKilosNetos: number;
  promedioRendimientoBrutoKgHa: number;
  promedioRendimientoComercialKgHa: number;
  promedioPorcentajeDescarte: number;
  promedioEficienciaGlobalKgPorUnidad: number;
  mejorRendimientoCicloId: string | null;
  mejorRendimientoCodigoCiclo: string | null;
  mejorEficienciaCicloId: string | null;
  mejorEficienciaCodigoCiclo: string | null;
  tendenciaRendimiento: TendenciaRendimiento;
}

export interface ComparativaCampanasResponseDto {
  modo: ModoComparacion;
  filtrosAplicados: FiltrosComparadorCampanasDto;
  resumen: ResumenComparativaCampanasDto;
  items: ComparativaCampanasItemDto[];
}

export interface EficienciaInsumosResponseDto {
  cicloId: string;
  codigoCiclo: string;
  temporada: string;
  cultivo: string;
  kilosCosechados: number;
  superficieHectareas: number;
  esProvisional: boolean;
  advertenciaEstadoParcial?: string | null;
  eficiencia: EficienciaInsumosResumenDto;
}
