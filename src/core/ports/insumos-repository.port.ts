import { DatosInsumo, Insumo } from '../domain/entities/insumo.entity.js';

export interface FiltrosInsumos {
  categoria?: DatosInsumo['categoria'];
  estado?: 'ACTIVO' | 'INACTIVO';
  codigo?: string;
  limit: number;
  offset: number;
}

export interface InsumosRepositoryPort {
  guardar(insumo: Insumo): Promise<void>;
  buscarPorId(id: string): Promise<Insumo | null>;
  listar(filtros: FiltrosInsumos): Promise<Insumo[]>;
  modificar(id: string, datos: DatosInsumo): Promise<Insumo | null>;
  desactivar(id: string): Promise<Insumo | null>;
}
