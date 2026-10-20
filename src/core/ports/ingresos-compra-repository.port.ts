import { IngresoCompraInsumo } from '../domain/entities/ingreso-compra-insumo.entity.js';

export interface FiltrosListarIngresosCompra {
  insumoId?: string;
  proveedorId?: string;
  depositoId?: string;
  loteFabricacion?: string;
}

export interface IngresosCompraRepositoryPort {
  guardar(ingreso: IngresoCompraInsumo): Promise<void>;
  buscarPorId(id: string): Promise<IngresoCompraInsumo | null>;
  listar(filtros?: FiltrosListarIngresosCompra): Promise<IngresoCompraInsumo[]>;
}
