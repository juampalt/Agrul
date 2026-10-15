export interface RegistrarAplicacionLineaInputDto {
  insumoId: string;
  cantidadTotal: number;
  unidadMedidaId: string;
  dosisPorSuperficie?: number | null;
  dosisPorPlanta?: number | null;
  concentracion?: string | number | null;
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
