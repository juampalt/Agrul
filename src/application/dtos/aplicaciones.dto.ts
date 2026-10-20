export interface RegistrarAplicacionLineaInputDto {
  insumoId: string;
  cantidadTotal: number;
  unidadMedidaId: string;
  dosisPorSuperficie?: number | null;
  dosisPorPlanta?: number | null;
  concentracion?: string | number | null;
  numeroLote?: string | null;
  loteInsumoId?: string | null;
}

export interface CondicionesClimaDto {
  vientoKmH?: number | null;
  tempC?: number | null;
  lluviaMm?: number | null;
  observaciones?: string | null;
}

export interface RecomendacionTecnicaDto {
  agronomoEmisor: string;
  nroMatricula?: string | null;
  documentoUrl?: string | null;
  firmaDigital?: string | null;
  fechaEmision?: string | null;
  observaciones?: string | null;
}

export interface RegistrarAplicacionInputDto {
  actividadId: string;
  loteId: string;
  cicloId: string;
  fecha: string;
  responsableId?: string | null;
  metodo: string;
  motivo: string;
  equipoAplicacion: string;
  condicionesClima?: CondicionesClimaDto | null;
  lineas: RegistrarAplicacionLineaInputDto[];
  recomendacionTecnica?: RecomendacionTecnicaDto | null; // RF-M4-08
}

export interface AplicacionLineaOutputDto {
  id: string;
  insumoId: string;
  nombreComercial?: string;
  categoriaInsumo?: string;
  cantidadTotal: number;
  unidadMedidaId: string;
  dosisPorSuperficie?: number | null;
  dosisPorPlanta?: number | null;
  concentracion?: string | null;
  numeroLote?: string | null;
  loteInsumoId?: string | null;
}

export interface AplicacionOutputDto {
  id: string;
  actividadId: string;
  loteId: string;
  cicloId: string;
  fecha: string;
  responsableId?: string | null;
  metodo: string;
  motivo: string;
  equipoAplicacion: string;
  condicionesClima?: CondicionesClimaDto | null;
  lineas: AplicacionLineaOutputDto[];
  recomendacionTecnica?: RecomendacionTecnicaDto | null; // RF-M4-08
  esMezcla: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ListarAplicacionesFiltrosDto {
  loteId?: string;
  cicloId?: string;
  actividadId?: string;
  insumoId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface AlertaCarenciaDto {
  aplicacionId: string;
  fechaAplicacion: string;
  insumoId: string;
  nombreComercial: string;
  principioActivo: string;
  nroRegistroSenasa: string;
  periodoCarenciaDias: number;
  fechaFinCarencia: string;
  diasRestantes: number;
  fechaEvaluacion: string;
  mensajeAdvertencia: string;
}

export interface AlertaReingresoDto {
  aplicacionId: string;
  fechaAplicacion: string;
  insumoId: string;
  nombreComercial: string;
  periodoReingresoHoras: number;
  fechaFinReingreso: string;
  horasRestantes: number;
  fechaEvaluacion: string;
  mensajeAdvertencia: string;
}

export interface ResultadoVerificacionCarenciaDto {
  loteId: string;
  fechaEvaluacion: string;
  aptoParaCosecha: boolean;
  aptoParaReingreso: boolean;
  fechaSeguraCosecha: string | null;
  totalAplicacionesEvaluadas: number;
  totalAlertasCarencia: number;
  alertasCarencia: AlertaCarenciaDto[];
  alertasReingreso: AlertaReingresoDto[];
  advertencias: string[];
}

export interface VerificarCarenciaLoteInputDto {
  loteId: string;
  fecha?: string;
}

// ============================================================================
// AGRUL-027: Consumo Acumulado de Insumos por Lote, Ciclo y Hectárea (RF-M4-10)
// ============================================================================

export interface InsumoConsumoAcumuladoItemDto {
  insumoId: string;
  nombreComercial?: string;
  categoria?: string;
  unidadMedidaId: string;
  cantidadTotalConsumida: number;
  cantidadPorHectarea: number;
  numeroAplicaciones: number;
}

export interface ConsumoInsumosCicloOutputDto {
  cicloId: string;
  codigoCiclo: string;
  loteId: string;
  superficieCultivadaHa: number;
  estadoCiclo: string;
  totalInsumosDistintos: number;
  totalAplicaciones: number;
  insumos: InsumoConsumoAcumuladoItemDto[];
}
