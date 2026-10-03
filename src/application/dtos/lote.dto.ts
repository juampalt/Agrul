import { EstadoLote } from '../../core/domain/value-objects/estado-lote.vo.js';

export interface CrearLoteInputDTO {
  codigoLote?: string; // Opcional, si no viene se autogenera
  producto: string;
  variedad?: string | null;
  cantidadInicial: number;
  unidadMedida: string;
}

export interface LoteResponseDTO {
  id: string;
  codigoLote: string;
  producto: string;
  variedad: string | null;
  estadoActual: EstadoLote;
  cantidadActual: number;
  unidadMedida: string;
  creadoEn: string;
  actualizadoEn: string;
}
