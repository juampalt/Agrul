import { CicloProductivo, EstadoCiclo } from '../domain/entities/ciclo-productivo.entity.js';

export interface ListarCiclosFiltros {
  loteId?: string;
  cultivo?: string;
  variedad?: string;
  estado?: EstadoCiclo;
  temporada?: string;
}

export interface CiclosRepositoryPort {
  guardar(ciclo: CicloProductivo): Promise<void>;
  buscarPorId(id: string): Promise<CicloProductivo | null>;
  buscarPorCodigo(codigo: string): Promise<CicloProductivo | null>;
  buscarPorLote(loteId: string): Promise<CicloProductivo[]>;
  buscarCicloAbiertoPorLote(loteId: string): Promise<CicloProductivo | null>;
  listar(filtros?: ListarCiclosFiltros): Promise<CicloProductivo[]>;
  siguienteCodigo(): Promise<string>;
}
