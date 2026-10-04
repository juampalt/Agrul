import { LoteResponseDTO } from './lote.dto.js';
import { TraceEventResponseDTO } from './evento.dto.js';

export interface HijoSplitInputDTO {
  codigoLote?: string;
  producto?: string;
  variedad?: string | null;
  cantidad: number;
  unidadMedida?: string;
}

export interface DividirLoteInputDTO {
  loteId: string;
  actorId: string;
  ubicacionId: string;
  hijos: HijoSplitInputDTO[];
  motivo?: string;
  timestampCapturaLocal?: string;
}

export interface GenealogiaRelacionDTO {
  id: string;
  lotePadreId: string;
  loteHijoId: string;
  cantidadAportada: number;
  unidadMedida: string;
  motivoRelacion: string;
  fechaUtc: string;
}

export interface DividirLoteResponseDTO {
  lotePadre: LoteResponseDTO;
  lotesHijos: LoteResponseDTO[];
  aristasGenealogia: GenealogiaRelacionDTO[];
  eventoSplit: TraceEventResponseDTO;
}
