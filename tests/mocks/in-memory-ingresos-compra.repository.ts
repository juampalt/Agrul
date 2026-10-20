import { IngresoCompraInsumo } from '../../src/core/domain/entities/ingreso-compra-insumo.entity.js';
import {
  IngresosCompraRepositoryPort,
  FiltrosListarIngresosCompra,
} from '../../src/core/ports/ingresos-compra-repository.port.js';

export class InMemoryIngresosCompraRepository implements IngresosCompraRepositoryPort {
  private ingresos: Map<string, IngresoCompraInsumo> = new Map();

  async guardar(ingreso: IngresoCompraInsumo): Promise<void> {
    this.ingresos.set(ingreso.id, ingreso);
  }

  async buscarPorId(id: string): Promise<IngresoCompraInsumo | null> {
    return this.ingresos.get(id) ?? null;
  }

  async listar(filtros?: FiltrosListarIngresosCompra): Promise<IngresoCompraInsumo[]> {
    let items = Array.from(this.ingresos.values());

    if (filtros) {
      if (filtros.insumoId) {
        items = items.filter((i) => i.insumoId === filtros.insumoId);
      }
      if (filtros.proveedorId) {
        items = items.filter((i) => i.proveedorId === filtros.proveedorId);
      }
      if (filtros.depositoId) {
        items = items.filter((i) => i.depositoId === filtros.depositoId);
      }
      if (filtros.loteFabricacion) {
        items = items.filter((i) => i.loteFabricacion === filtros.loteFabricacion);
      }
    }

    return items;
  }
}
