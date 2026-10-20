import { Proveedor } from '../../src/core/domain/entities/proveedor.entity.js';
import {
  ProveedoresRepositoryPort,
  FiltrosListarProveedores,
} from '../../src/core/ports/proveedores-repository.port.js';

export class InMemoryProveedoresRepository implements ProveedoresRepositoryPort {
  private proveedores: Map<string, Proveedor> = new Map();

  async guardar(proveedor: Proveedor): Promise<void> {
    this.proveedores.set(proveedor.id, proveedor);
  }

  async buscarPorId(id: string): Promise<Proveedor | null> {
    return this.proveedores.get(id) ?? null;
  }

  async buscarPorCuit(cuit: string): Promise<Proveedor | null> {
    const normalizado = cuit.trim();
    for (const p of this.proveedores.values()) {
      if (p.cuit && p.cuit.trim() === normalizado) {
        return p;
      }
    }
    return null;
  }

  async existePorCuit(cuit: string, excluirId?: string): Promise<boolean> {
    const normalizado = cuit.trim();
    for (const p of this.proveedores.values()) {
      if (excluirId && p.id === excluirId) {
        continue;
      }
      if (p.cuit && p.cuit.trim() === normalizado) {
        return true;
      }
    }
    return false;
  }

  async listar(filtros?: FiltrosListarProveedores): Promise<Proveedor[]> {
    let items = Array.from(this.proveedores.values());

    if (filtros) {
      if (filtros.activo !== undefined) {
        items = items.filter((p) => p.activo === filtros.activo);
      }
      if (filtros.busqueda) {
        const s = filtros.busqueda.toLowerCase();
        items = items.filter(
          (p) =>
            p.razonSocial.toLowerCase().includes(s) ||
            (p.cuit && p.cuit.toLowerCase().includes(s)) ||
            (p.contacto && p.contacto.toLowerCase().includes(s)) ||
            (p.email && p.email.toLowerCase().includes(s))
        );
      }
    }

    return items;
  }
}
