export interface RegistrarObservacionMonitoreoInputDto {
  loteId: string;
  cicloId: string;
  fecha: string;
  sintomas: string;
  plagas?: string | null;
  estadoCultivo?: string;
  fotosUrls?: string[];
  usuarioId: string;
}

export interface ObservacionMonitoreoOutputDto {
  id: string;
  loteId: string;
  cicloId: string;
  fecha: string;
  sintomas: string;
  plagas: string | null;
  estadoCultivo: string;
  fotosUrls: string[];
  usuarioId: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface ListarObservacionesMonitoreoFiltrosDto {
  loteId?: string;
  cicloId?: string;
  usuarioId?: string;
  desde?: string;
  hasta?: string;
}
