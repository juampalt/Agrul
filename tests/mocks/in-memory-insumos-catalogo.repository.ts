import { InsumoCatalogo } from '../../src/core/domain/entities/insumo-catalogo.entity.js';
import {
  InsumosCatalogoRepository,
  FiltrosListarInsumos,
} from '../../src/core/ports/insumos-catalogo-repository.port.js';

export class InMemoryInsumosCatalogoRepository implements InsumosCatalogoRepository {
  private insumos: Map<string, InsumoCatalogo> = new Map();

  public async guardar(insumo: InsumoCatalogo): Promise<void> {
    this.insumos.set(insumo.id, insumo);
  }

  public async buscarPorId(id: string): Promise<InsumoCatalogo | null> {
    const item = this.insumos.get(id);
    return item ? InsumoCatalogo.reconstituir(item.toJSON()) : null;
  }

  public async listar(filtros?: FiltrosListarInsumos): Promise<InsumoCatalogo[]> {
    let result = Array.from(this.insumos.values());

    if (filtros?.categoria) {
      result = result.filter(i => i.categoria === filtros.categoria);
    }
    if (filtros?.activo !== undefined) {
      result = result.filter(i => i.activo === filtros.activo);
    }

    return result.map(i => InsumoCatalogo.reconstituir(i.toJSON()));
  }

  public async existePorNombreComercial(nombreComercial: string, excluirId?: string): Promise<boolean> {
    const normalizado = nombreComercial.trim().toLowerCase();
    for (const item of this.insumos.values()) {
      if (excluirId && item.id === excluirId) {
        continue;
      }
      if (item.nombreComercial.trim().toLowerCase() === normalizado) {
        return true;
      }
    }
    return false;
  }
}
