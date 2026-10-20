import { InsumoUnidadEquivalencia } from '../domain/entities/insumo-unidad-equivalencia.entity.js';

export interface InsumoEquivalenciasRepositoryPort {
  guardar(equivalencia: InsumoUnidadEquivalencia): Promise<void>;
  buscarPorId(id: string): Promise<InsumoUnidadEquivalencia | null>;
  listarPorInsumo(insumoId: string): Promise<InsumoUnidadEquivalencia[]>;
  buscarEquivalencia(insumoId: string, unidadCompra: string, unidadConsumo: string): Promise<InsumoUnidadEquivalencia | null>;
  eliminar(id: string): Promise<void>;
}
