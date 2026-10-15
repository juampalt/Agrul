import { ObservacionMonitoreo } from '../../../core/domain/entities/observacion-monitoreo.entity.js';
import {
  ObservacionesMonitoreoRepositoryPort,
  ListarObservacionesMonitoreoFiltros,
} from '../../../core/ports/observaciones-monitoreo-repository.port.js';

export class InMemoryObservacionesMonitoreoRepository implements ObservacionesMonitoreoRepositoryPort {
  private observaciones: Map<string, ObservacionMonitoreo> = new Map();

  public async guardar(observacion: ObservacionMonitoreo): Promise<void> {
    this.observaciones.set(observacion.id, observacion);
  }

  public async buscarPorId(id: string): Promise<ObservacionMonitoreo | null> {
    const obs = this.observaciones.get(id);
    return obs ? ObservacionMonitoreo.reconstituir(obs.toJSON()) : null;
  }

  public async listar(filtros?: ListarObservacionesMonitoreoFiltros): Promise<ObservacionMonitoreo[]> {
    let result = Array.from(this.observaciones.values());

    if (filtros?.loteId) {
      result = result.filter(o => o.loteId === filtros.loteId);
    }
    if (filtros?.cicloId) {
      result = result.filter(o => o.cicloId === filtros.cicloId);
    }
    if (filtros?.usuarioId) {
      result = result.filter(o => o.usuarioId === filtros.usuarioId);
    }
    if (filtros?.desde) {
      result = result.filter(o => o.fecha >= filtros.desde!);
    }
    if (filtros?.hasta) {
      result = result.filter(o => o.fecha <= filtros.hasta!);
    }

    return result.map(o => ObservacionMonitoreo.reconstituir(o.toJSON()));
  }
}
