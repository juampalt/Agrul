export interface RegistrarObservacionMeteorologicaInputDto {
  fincaId: string;
  fechaHoraObservacion: string;
  temperaturaC: number;
  humedadRelativa: number;
  precipitacionesMm: number;
  observaciones?: string | null;
  responsableId?: string | null;
}

export interface ObservacionMeteorologicaOutputDto {
  id: string;
  fincaId: string;
  fechaHoraObservacion: string;
  temperaturaC: number;
  humedadRelativa: number;
  precipitacionesMm: number;
  observaciones: string | null;
  responsableId: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ListarObservacionesMeteorologicasInputDto {
  fincaId: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface LoteAfectadoInputDto {
  loteId: string;
  descripcionDano: string;
  superficieAfectadaHa?: number | null;
  porcentajeDano?: number | null;
}

export interface RegistrarEventoClimaticoInputDto {
  fincaId: string;
  tipoEvento: 'HELADA' | 'GRANIZO' | 'LLUVIA_INTENSA' | 'VIENTO_FUERTE' | 'OTRO';
  fecha: string;
  descripcion: string;
  responsableId?: string | null;
  lotesAfectados: LoteAfectadoInputDto[];
}

export interface EventoClimaticoSGTAOutputDto {
  id: string;
  fincaId: string;
  tipoEvento: string;
  fecha: string;
  descripcion: string;
  responsableId: string | null;
  lotesAfectados: Array<{
    loteId: string;
    descripcionDano: string;
    superficieAfectadaHa: number | null;
    porcentajeDano: number | null;
  }>;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ListarEventosClimaticosSGTAInputDto {
  fincaId?: string;
  loteId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  tipoEvento?: 'HELADA' | 'GRANIZO' | 'LLUVIA_INTENSA' | 'VIENTO_FUERTE' | 'OTRO';
}
