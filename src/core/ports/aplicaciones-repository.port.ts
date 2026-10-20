import { AplicacionAgricola } from '../domain/entities/aplicacion-agricola.entity.js';

export interface ListarAplicacionesFiltros {
  loteId?: string;
  cicloId?: string;
  actividadId?: string;
  insumoId?: string;
  loteInsumoId?: string;
  numeroLote?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface AplicacionesRepositoryPort {
  guardar(aplicacion: AplicacionAgricola): Promise<void>;
  buscarPorId(id: string): Promise<AplicacionAgricola | null>;
  listar(filtros?: ListarAplicacionesFiltros): Promise<AplicacionAgricola[]>;
}
