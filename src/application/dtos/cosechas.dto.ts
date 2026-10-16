import { ResultadoVerificacionCarenciaDto } from './aplicaciones.dto.js';
import { EstadoCosecha } from '../../core/domain/entities/cosecha.entity.js';

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

export interface RegistrarCosechaRapidaInputDto {
  loteId: string; // UUID o código de lote (ej: LOT-2026-00001)
  cantidadCosechadaKg: number; // Obligatorio 1/4 (RF-M5-13)
  cantidadComercializableKg: number; // Obligatorio 2/4 (RF-M5-13)
  fecha?: string; // Obligatorio 3/4 (autocompleta hoy YYYY-MM-DD si se omite)
  cicloId?: string; // Autocompleta ciclo activo del lote si se omite (RF-M5-13)
  cantidadDescarteKg?: number; // Autocalculado como (cosechada - comercializable) si se omite
  motivoDescarte?: string | null;
  observacionesCalidad?: string | null;
  responsableId?: string | null;
  cuadrillaId?: string | null;
  recipientes?: RecipienteCosechaDto[] | null;
  superficieCosechadaHa?: number | null;
}

export interface CambioHistorialCosechaDto {
  campo: string;
  valorAnterior: any;
  valorNuevo: any;
}

export interface HistorialModificacionCosechaDto {
  fechaModificacion: string;
  usuarioId: string;
  motivo: string;
  cambios: CambioHistorialCosechaDto[];
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
  estado: EstadoCosecha;
  motivoAnulacion: string | null;
  usuarioAnulacionId: string | null;
  anuladoEn: string | null;
  historialModificaciones: HistorialModificacionCosechaDto[];
  alertaCarencia?: ResultadoVerificacionCarenciaDto | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ListarCosechasFiltrosDto {
  loteId?: string;
  cicloId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: EstadoCosecha;
}

export interface AnularCosechaInputDto {
  cosechaId: string;
  usuarioId: string;
  motivo: string;
}

export interface ModificarCosechaInputDto {
  cosechaId: string;
  usuarioId: string;
  motivo: string;
  cantidadCosechadaKg?: number;
  cantidadComercializableKg?: number;
  cantidadDescarteKg?: number;
  motivoDescarte?: string | null;
  observacionesCalidad?: string | null;
  responsableId?: string | null;
  cuadrillaId?: string | null;
  recipientes?: RecipienteCosechaDto[] | null;
  superficieCosechadaHa?: number | null;
}
