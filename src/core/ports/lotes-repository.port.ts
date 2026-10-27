import { Lote } from '../domain/entities/lote.entity.js';
import { CodigoLote } from '../domain/value-objects/codigo-lote.vo.js';

export interface ListarLotesFiltros {
  estado?: string;
  fincaId?: string;
  superficieMinHa?: number;
  superficieMaxHa?: number;
  producto?: string;
  codigo?: string;
  nombre?: string;
  sector?: string;
  estadoTerritorial?: string;
  limit?: number;
  offset?: number;
}

export interface LotesRepositoryPort {
  guardar(lote: Lote): Promise<void>;
  buscarPorId(id: string): Promise<Lote | null>;
  buscarPorCodigo(codigo: CodigoLote | string): Promise<Lote | null>;
  actualizar(lote: Lote): Promise<void>;
  existeCodigo(codigo: string): Promise<boolean>;
  listarTodos(filtro?: ListarLotesFiltros): Promise<Lote[]>;
  sumarSuperficieActiva?(fincaId: string, excluirLoteId?: string): Promise<number>;
}
