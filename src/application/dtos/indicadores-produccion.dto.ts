export interface FiltrosIndicadoresProduccionDto {
  fincaId?: string;
  loteId?: string;
  cicloId?: string;
  cultivo?: string;
  variedad?: string;
  desde?: string;
  hasta?: string;
  estadoCiclo?: string;
}

export interface IndicadorPrendimientoDto {
  plantasPlantadas: number | null;
  plantasVivas: number | null;
  plantasRepuestas: number | null;
  tasaPrendimientoPorcentaje: number | null;
}

export interface LaboresPorCategoriaDto {
  conteoPorCategoria: Record<string, number>;
  conteoPorEstado: Record<string, number>;
  totalLabores: number;
}

export interface IndicadorCicloItemDto {
  cicloId: string;
  codigoCiclo: string;
  loteId: string;
  codigoLote: string;
  fincaId: string | null;
  fincaNombre: string | null;
  cultivo: string;
  variedad: string | null;
  estadoCiclo: string;
  superficieCultivadaHa: number;
  fechaInicio: string;
  fechaFin: string | null;
  totalKilosCosechados: number;
  totalKilosComercializables: number;
  totalKilosDescarte: number;
  porcentajeDescarte: number;
  rendimientoBrutoKgHa: number;
  rendimientoComercializableKgHa: number;
  prendimientoPlantas: IndicadorPrendimientoDto;
  labores: LaboresPorCategoriaDto;
  cantidadCosechas: number;
}

export interface IndicadorLoteItemDto {
  loteId: string;
  codigoLote: string;
  fincaId: string | null;
  fincaNombre: string | null;
  producto: string;
  variedad: string | null;
  superficieHa: number | null;
  totalCiclos: number;
  totalKilosCosechados: number;
  totalKilosComercializables: number;
  totalKilosDescarte: number;
  porcentajeDescarte: number;
  rendimientoBrutoKgHa: number;
  rendimientoComercializableKgHa: number;
}

export interface IndicadorCultivoItemDto {
  cultivo: string;
  superficieTotalHa: number;
  totalKilosCosechados: number;
  totalKilosComercializables: number;
  totalKilosDescarte: number;
  porcentajeDescarte: number;
  rendimientoPromedioKgHa: number;
  rendimientoComercializableKgHa: number;
  totalCiclos: number;
  totalLotes: number;
}

export interface ResumenGlobalIndicadoresDto {
  superficieTotalHa: number;
  totalKilosCosechados: number;
  totalKilosComercializables: number;
  totalKilosDescarte: number;
  porcentajeDescarteGlobal: number;
  rendimientoPromedioKgHa: number;
  rendimientoComercializableKgHa: number;
  totalCosechas: number;
  totalCiclos: number;
  totalLotes: number;
  tasaPrendimientoPromedioPorcentaje: number | null;
}

export interface IndicadoresProduccionResponseDto {
  filtrosAplicados: FiltrosIndicadoresProduccionDto;
  fechaCalculoUtc: string;
  resumenGlobal: ResumenGlobalIndicadoresDto;
  desglosePorCiclo: IndicadorCicloItemDto[];
  desglosePorLote: IndicadorLoteItemDto[];
  desglosePorCultivo: IndicadorCultivoItemDto[];
}

export interface IndicadoresCicloDetalleDto {
  ciclo: {
    id: string;
    codigoCiclo: string;
    loteId: string;
    codigoLote: string;
    fincaId: string | null;
    fincaNombre: string | null;
    cultivo: string;
    variedad: string | null;
    estado: string;
    superficieCultivadaHa: number;
    fechaInicio: string;
    fechaFin: string | null;
  };
  metricasProduccion: {
    totalKilosCosechados: number;
    totalKilosComercializables: number;
    totalKilosDescarte: number;
    porcentajeDescarte: number;
    rendimientoBrutoKgHa: number;
    rendimientoComercializableKgHa: number;
  };
  prendimientoPlantines: IndicadorPrendimientoDto;
  laboresCulturales: LaboresPorCategoriaDto;
  cosechas: {
    cosechaId: string;
    codigoTrazabilidad: string;
    fecha: string;
    cantidadCosechadaKg: number;
    cantidadComercializableKg: number;
    cantidadDescarteKg: number;
    porcentajeDescarte: number;
    motivoDescarte: string | null;
    estado: string;
  }[];
}

export interface IndicadoresLoteDetalleDto {
  lote: {
    id: string;
    codigoLote: string;
    fincaId: string | null;
    fincaNombre: string | null;
    producto: string;
    variedad: string | null;
    superficieHa: number | null;
  };
  metricasConsolidadas: {
    totalKilosCosechados: number;
    totalKilosComercializables: number;
    totalKilosDescarte: number;
    porcentajeDescarte: number;
    rendimientoBrutoKgHa: number;
    rendimientoComercializableKgHa: number;
    totalCiclos: number;
    totalCosechas: number;
  };
  ciclos: IndicadorCicloItemDto[];
}
