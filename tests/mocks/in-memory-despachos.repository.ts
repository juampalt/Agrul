import { DespachoDestino } from '../../src/core/domain/entities/despacho-destino.entity.js';
import { DespachosRepositoryPort, DespachosFiltros } from '../../src/core/ports/despachos-repository.port.js';

export class InMemoryDespachosRepository implements DespachosRepositoryPort {
  private despachos: Map<string, DespachoDestino> = new Map();

  async guardar(despacho: DespachoDestino): Promise<void> {
    this.despachos.set(despacho.id, despacho);
  }

  async buscarPorId(id: string): Promise<DespachoDestino | null> {
    return this.despachos.get(id) ?? null;
  }

  async listarPorCosecha(cosechaId: string): Promise<DespachoDestino[]> {
    return Array.from(this.despachos.values()).filter(d => d.cosechaId === cosechaId);
  }

  async sumarCantidadPorCosecha(cosechaId: string): Promise<number> {
    const despachos = await this.listarPorCosecha(cosechaId);
    return despachos.reduce((sum, d) => sum + d.cantidadEnviadaKg, 0);
  }

  async listar(filtros?: DespachosFiltros): Promise<DespachoDestino[]> {
    let items = Array.from(this.despachos.values());

    if (filtros) {
      if (filtros.cosechaId) {
        items = items.filter(d => d.cosechaId === filtros.cosechaId);
      }
      if (filtros.destinatarioId) {
        items = items.filter(d => d.destinatarioId === filtros.destinatarioId);
      }
      if (filtros.tipoDestino) {
        items = items.filter(d => d.tipoDestino === filtros.tipoDestino);
      }
      if (filtros.fechaDesde) {
        items = items.filter(d => d.fecha >= filtros.fechaDesde!);
      }
      if (filtros.fechaHasta) {
        items = items.filter(d => d.fecha <= filtros.fechaHasta!);
      }
    }

    return items;
  }
}
