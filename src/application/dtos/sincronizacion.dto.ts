export interface EventoOfflineItemDto {
  idLocalTemporal: string;
  loteId: string;
  actorId: string;
  ubicacionId: string;
  tipoEvento: string;
  timestampCapturaLocal: string;
  payloadEspecifico: Record<string, unknown>;
  eventoReferenciadoId?: string | null;
}

export interface SincronizarBatchOfflineInputDto {
  dispositivoId: string;
  eventos: EventoOfflineItemDto[];
}

export interface SincronizarBatchOfflineOutputDto {
  dispositivoId: string;
  totalRecibidos: number;
  insertados: number;
  fallidos: string[];
}
