import { DatosInsumo, Insumo } from '../domain/entities/insumo.entity.js';

export interface FiltrosInsumos {
  categoria?: DatosInsumo['categoria'];
  estado?: 'ACTIVO' | 'INACTIVO';
  codigo?: string;
  nombre?: string;
  limit: number;
  offset: number;
}

export interface AntecedenteInsumo {
  aplicacionId: string; fechaAplicacion: string; loteId: string; codigoLote: string; cultivoId: string; cultivo: string;
  cicloId: string; ciclo: string; actividadRealizadaId: string; cantidadUtilizada: number; unidadMedida: string;
}

export interface InsumosRepositoryPort {
  /** CU35: aplicaciones vigentes del insumo, limitadas a las fincas visibles cuando se informan. */
  antecedentes?(insumoId: string, fincaIds?: readonly string[]): Promise<AntecedenteInsumo[]>;
  guardar(insumo: Insumo): Promise<void>;
  buscarPorId(id: string): Promise<Insumo | null>;
  listar(filtros: FiltrosInsumos): Promise<Insumo[]>;
  modificar(id: string, datos: DatosInsumo): Promise<Insumo | null>;
  desactivar(id: string): Promise<Insumo | null>;
}
