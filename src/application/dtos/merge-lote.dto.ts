import { LoteResponseDTO } from './lote.dto.js';
import { TraceEventResponseDTO } from './evento.dto.js';
import { GenealogiaRelacionDTO } from './split-lote.dto.js';

export interface PadreAporteInputDTO {
  loteId: string;
  cantidad: number;
}

export interface NuevoLoteMergeInputDTO {
  codigoLote?: string;
  producto: string;
  variedad?: string | null;
  unidadMedida: string;
}

export interface FusionarLotesInputDTO {
  padres: PadreAporteInputDTO[];
  nuevoLote: NuevoLoteMergeInputDTO;
  actorId: string;
  ubicacionId: string;
  motivo?: string;
  timestampCapturaLocal?: string;
}

export interface FusionarLotesResponseDTO {
  loteHijo: LoteResponseDTO;
  lotesPadres: LoteResponseDTO[];
  aristasGenealogia: GenealogiaRelacionDTO[];
  eventosOrigen: TraceEventResponseDTO[];
  eventoRecepcion: TraceEventResponseDTO;
}
