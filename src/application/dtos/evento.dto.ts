import { TipoEvento } from '../../core/domain/value-objects/tipo-evento.vo.js';

export interface RegistrarEventoInputDTO {
  loteId: string;
  actorId: string;
  ubicacionId: string;
  tipoEvento: TipoEvento;
  timestampCapturaLocal?: string; // ISO string, si no viene se asume now()
  payloadEspecifico: Record<string, unknown>;
  eventoReferenciadoId?: string | null;
}

export interface TraceEventResponseDTO {
  id: string;
  loteId: string;
  actorId: string;
  ubicacionId: string;
  tipoEvento: TipoEvento;
  timestampCapturaLocal: string;
  timestampServidor: string;
  payloadEspecifico: Record<string, unknown>;
  eventoReferenciadoId: string | null;
  estadoSincronizacion: string;
}
