import { EstadoLote } from '../../core/domain/value-objects/estado-lote.vo.js';
import { GeoJSONGeometry } from '../../core/domain/value-objects/geojson.vo.js';

export interface CrearLoteInputDTO {
  codigoLote?: string; // Opcional, si no viene se autogenera
  producto: string;
  variedad?: string | null;
  cantidadInicial: number;
  unidadMedida: string;
  fincaId?: string | null;
  superficieHa?: number | null;
  geometria?: GeoJSONGeometry | null;
}

export interface LoteResponseDTO {
  id: string;
  codigoLote: string;
  producto: string;
  variedad: string | null;
  estadoActual: EstadoLote;
  cantidadActual: number;
  unidadMedida: string;
  fincaId?: string | null;
  superficieHa?: number | null;
  geometria?: GeoJSONGeometry | null;
  creadoEn: string;
  actualizadoEn: string;
}
