import { InventarioFisico } from '../../src/core/domain/entities/inventario-fisico.entity.js';
import {
  InventariosFisicosRepositoryPort,
  FiltrosListarInventariosFisicos,
} from '../../src/core/ports/inventarios-fisicos-repository.port.js';

export class InMemoryInventariosFisicosRepository implements InventariosFisicosRepositoryPort {
  private items: Map<string, InventarioFisico> = new Map();

  public async guardar(inventario: InventarioFisico): Promise<InventarioFisico> {
    this.items.set(inventario.id, inventario);
    return inventario;
  }

  public async buscarPorId(id: string): Promise<InventarioFisico | null> {
    const item = this.items.get(id);
    return item ? InventarioFisico.crear(item.toJSON()) : null;
  }

  public async buscarPorClaveIdempotencia(clave: string): Promise<InventarioFisico | null> {
    for (const item of this.items.values()) {
      if (item.claveIdempotencia === clave) {
        return InventarioFisico.crear(item.toJSON());
      }
    }
    return null;
  }

  public async listar(filtros?: FiltrosListarInventariosFisicos): Promise<InventarioFisico[]> {
    let result = Array.from(this.items.values());

    if (filtros?.insumoId) {
      result = result.filter(i => i.insumoId === filtros.insumoId);
    }
    if (filtros?.depositoId) {
      result = result.filter(i => i.depositoId === filtros.depositoId);
    }
    if (filtros?.loteFabricacion) {
      result = result.filter(i => i.loteFabricacion === filtros.loteFabricacion);
    }
    if (filtros?.usuarioId) {
      result = result.filter(i => i.usuarioId === filtros.usuarioId);
    }
    if (filtros?.desde) {
      result = result.filter(i => i.fecha >= filtros.desde!);
    }
    if (filtros?.hasta) {
      result = result.filter(i => i.fecha <= filtros.hasta!);
    }

    result.sort((a, b) => b.fecha.localeCompare(a.fecha));

    return result.map(i => InventarioFisico.crear(i.toJSON()));
  }
}
