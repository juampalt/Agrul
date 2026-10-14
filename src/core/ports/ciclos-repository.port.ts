import { CicloProductivo } from '../domain/entities/ciclo-productivo.entity.js';

export interface CiclosRepositoryPort {
  guardar(ciclo: CicloProductivo): Promise<void>;
  buscarPorId(id: string): Promise<CicloProductivo | null>;
  buscarPorCodigo(codigo: string): Promise<CicloProductivo | null>;
  buscarPorLote(loteId: string): Promise<CicloProductivo[]>;
  buscarCicloAbiertoPorLote(loteId: string): Promise<CicloProductivo | null>;
  siguienteCodigo(): Promise<string>;
}
