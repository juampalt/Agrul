import { ObservacionMonitoreo } from '../domain/entities/observacion-monitoreo.entity.js';

export interface ListarObservacionesMonitoreoFiltros {
  loteId?: string;
  cicloId?: string;
  usuarioId?: string;
  desde?: string;
  hasta?: string;
}

export interface ObservacionesMonitoreoRepositoryPort {
  guardar(observacion: ObservacionMonitoreo): Promise<void>;
  buscarPorId(id: string): Promise<ObservacionMonitoreo | null>;
  listar(filtros?: ListarObservacionesMonitoreoFiltros): Promise<ObservacionMonitoreo[]>;
}
