import { Cosecha } from '../domain/entities/cosecha.entity.js';

export interface ListarCosechasFiltros {
  loteId?: string;
  cicloId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  estado?: string;
}

export interface CosechasRepositoryPort {
  guardar(cosecha: Cosecha): Promise<void>;
  buscarPorId(id: string): Promise<Cosecha | null>;
  buscarPorCodigo(codigo: string): Promise<Cosecha | null>;
  listar(filtros?: ListarCosechasFiltros): Promise<Cosecha[]>;
  contarPorLoteYFecha(loteId: string, fecha: string): Promise<number>;
}
