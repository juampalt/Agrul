import { PerdidaCosecha } from '../../src/core/domain/entities/perdida-cosecha.entity.js';
import {
  ListarPerdidasCosechaFiltros,
  PerdidasCosechaRepositoryPort,
} from '../../src/core/ports/perdidas-cosecha-repository.port.js';

export class InMemoryPerdidasCosechaRepository implements PerdidasCosechaRepositoryPort {
  private items: Map<string, PerdidaCosecha> = new Map();

  public async guardar(perdida: PerdidaCosecha): Promise<void> {
    this.items.set(perdida.id, perdida);
  }

  public async buscarPorId(id: string): Promise<PerdidaCosecha | null> {
    const item = this.items.get(id);
    return item ? PerdidaCosecha.reconstituir(item.toJSON()) : null;
  }

  public async listar(filtros?: ListarPerdidasCosechaFiltros): Promise<PerdidaCosecha[]> {
    let result = Array.from(this.items.values());

    if (filtros?.loteId) {
      result = result.filter(p => p.loteId === filtros.loteId);
    }
    if (filtros?.cicloId) {
      result = result.filter(p => p.cicloId === filtros.cicloId);
    }
    if (filtros?.cosechaId) {
      result = result.filter(p => p.cosechaId === filtros.cosechaId);
    }
    if (filtros?.tipo) {
      result = result.filter(p => p.tipo.toUpperCase() === filtros.tipo!.toUpperCase());
    }
    if (filtros?.fechaDesde) {
      result = result.filter(p => p.fecha >= filtros.fechaDesde!);
    }
    if (filtros?.fechaHasta) {
      result = result.filter(p => p.fecha <= filtros.fechaHasta!);
    }

    return result.map(p => PerdidaCosecha.reconstituir(p.toJSON()));
  }
}
