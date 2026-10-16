import { TipoPerdidaCosecha } from '../../core/domain/entities/perdida-cosecha.entity.js';

export interface RegistrarPerdidaCosechaInputDto {
  cosechaId?: string | null;
  loteId: string;
  cicloId?: string | null;
  fecha: string;
  tipo: TipoPerdidaCosecha | string;
  cantidadEstimadaKg: number;
  superficieAfectadaHa?: number | null;
  descripcion: string;
  responsableRegistroId?: string | null;
}

export interface PerdidaCosechaOutputDto {
  id: string;
  cosechaId: string | null;
  codigoTrazabilidadCosecha?: string | null;
  loteId: string;
  codigoLote?: string;
  cicloId: string | null;
  codigoCiclo?: string | null;
  fecha: string;
  tipo: string;
  cantidadEstimadaKg: number;
  superficieAfectadaHa: number | null;
  descripcion: string;
  responsableRegistroId: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ListarPerdidasCosechaFiltrosDto {
  loteId?: string;
  cicloId?: string;
  cosechaId?: string;
  tipo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}
