import { ContextoMonitoreo, Monitoreo } from '../domain/entities/monitoreo.entity.js';

export interface FiltrosMonitoreos {
  cicloId?: string;
  loteId?: string;
  responsableId?: string;
  etapaFenologica?: string;
  estadoGeneralCultivo?: string;
  tipoObservacion?: string;
  desde?: string;
  hasta?: string;
  limit: number;
  offset: number;
}

export interface MonitoreosRepositoryPort {
  registrar(cicloId: string, responsableId: string, crear: (contexto: ContextoMonitoreo) => Monitoreo): Promise<Monitoreo>;
  buscarPorId(id: string): Promise<Monitoreo | null>;
  listar(filtros: FiltrosMonitoreos): Promise<Monitoreo[]>;
}
