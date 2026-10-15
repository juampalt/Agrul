import { InsumoCatalogo, CategoriaInsumo } from '../domain/entities/insumo-catalogo.entity.js';

export interface FiltrosListarInsumos {
  categoria?: CategoriaInsumo;
  activo?: boolean;
}

export interface InsumosCatalogoRepository {
  guardar(insumo: InsumoCatalogo): Promise<void>;
  buscarPorId(id: string): Promise<InsumoCatalogo | null>;
  listar(filtros?: FiltrosListarInsumos): Promise<InsumoCatalogo[]>;
  existePorNombreComercial(nombreComercial: string, excluirId?: string): Promise<boolean>;
}
