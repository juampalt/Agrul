import { ActividadAgricola } from '../domain/entities/actividad-agricola.entity.js';

export interface ListarActividadesFiltros {
  loteId?: string;
  cicloId?: string;
  tipoActividadId?: string;
  estado?: string;
  desde?: string;
  hasta?: string;
}

export interface ActividadesRepositoryPort {
  guardar(actividad: ActividadAgricola): Promise<void>;
  buscarPorId(id: string): Promise<ActividadAgricola | null>;
  buscarPorCodigo(codigo: string): Promise<ActividadAgricola | null>;
  listar(filtros?: ListarActividadesFiltros): Promise<ActividadAgricola[]>;
  siguienteCodigo(): Promise<string>;
}
