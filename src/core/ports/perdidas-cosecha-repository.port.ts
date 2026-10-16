import { PerdidaCosecha } from '../domain/entities/perdida-cosecha.entity.js';

export interface ListarPerdidasCosechaFiltros {
  loteId?: string;
  cicloId?: string;
  cosechaId?: string;
  tipo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export interface PerdidasCosechaRepositoryPort {
  guardar(perdida: PerdidaCosecha): Promise<void>;
  buscarPorId(id: string): Promise<PerdidaCosecha | null>;
  listar(filtros?: ListarPerdidasCosechaFiltros): Promise<PerdidaCosecha[]>;
}
