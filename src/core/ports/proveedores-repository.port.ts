import { Proveedor } from '../domain/entities/proveedor.entity.js';

export interface FiltrosListarProveedores {
  activo?: boolean;
  busqueda?: string;
}

export interface ProveedoresRepositoryPort {
  guardar(proveedor: Proveedor): Promise<void>;
  buscarPorId(id: string): Promise<Proveedor | null>;
  buscarPorCuit(cuit: string): Promise<Proveedor | null>;
  listar(filtros?: FiltrosListarProveedores): Promise<Proveedor[]>;
  existePorCuit(cuit: string, excluirId?: string): Promise<boolean>;
}
