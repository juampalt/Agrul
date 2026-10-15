export interface RecipienteCosechaDto {
  tipo: string;
  cantidad: number;
}

export interface RegistrarCosechaInputDto {
  loteId: string;
  cicloId: string;
  fecha: string;
  cantidadCosechadaKg: number;
  cantidadComercializableKg: number;
  cantidadDescarteKg: number;
  motivoDescarte?: string | null;
  observacionesCalidad?: string | null;
  responsableId?: string | null;
  cuadrillaId?: string | null;
  recipientes?: RecipienteCosechaDto[] | null;
  superficieCosechadaHa?: number | null;
}

export interface CosechaOutputDto {
  id: string;
  codigoTrazabilidad: string;
  loteId: string;
  codigoLote?: string;
  cicloId: string;
  codigoCiclo?: string;
  fecha: string;
  cantidadCosechadaKg: number;
  cantidadComercializableKg: number;
  cantidadDescarteKg: number;
  porcentajeComercializable: number;
  porcentajeDescarte: number;
  motivoDescarte: string | null;
  observacionesCalidad: string | null;
  responsableId: string | null;
  cuadrillaId: string | null;
  recipientes: RecipienteCosechaDto[] | null;
  superficieCosechadaHa: number | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ListarCosechasFiltrosDto {
  loteId?: string;
  cicloId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
