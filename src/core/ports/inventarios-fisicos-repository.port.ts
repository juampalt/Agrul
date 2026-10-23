import { InventarioFisico } from '../domain/entities/inventario-fisico.entity.js';

export interface FiltrosListarInventariosFisicos {
  insumoId?: string;
  depositoId?: string;
  loteFabricacion?: string;
  usuarioId?: string;
  desde?: string;
  hasta?: string;
}

export interface InventariosFisicosRepositoryPort {
  guardar(inventario: InventarioFisico): Promise<InventarioFisico>;
  buscarPorId(id: string): Promise<InventarioFisico | null>;
  buscarPorClaveIdempotencia(clave: string): Promise<InventarioFisico | null>;
  listar(filtros?: FiltrosListarInventariosFisicos): Promise<InventarioFisico[]>;
}
