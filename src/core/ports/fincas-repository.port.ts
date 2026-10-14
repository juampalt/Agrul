import { Finca } from '../domain/entities/finca.entity.js';

export interface ListarFincasFiltros {
  provincia?: string;
  departamento?: string;
  nombre?: string;
  limit?: number;
  offset?: number;
}

export interface FincasRepositoryPort {
  guardar(finca: Finca): Promise<void>;
  buscarPorId(id: string): Promise<Finca | null>;
  listarTodas(filtro?: ListarFincasFiltros): Promise<Finca[]>;
  existeNombre(nombre: string): Promise<boolean>;
}
