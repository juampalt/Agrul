import { DatosVariedad, EstadoVariedad, Variedad } from '../domain/entities/variedad.entity.js';

export interface FiltrosVariedades {
  cultivoId?: string;
  estado?: EstadoVariedad;
  /** Búsqueda por nombre (contiene, sin distinguir mayúsculas). */
  nombre?: string;
  limit: number;
  offset: number;
}

export interface VariedadesRepositoryPort {
  guardar(variedad: Variedad): Promise<void>;
  buscarPorId(id: string): Promise<Variedad | null>;
  listar(filtros: FiltrosVariedades): Promise<Variedad[]>;
  modificar(id: string, datos: DatosVariedad): Promise<Variedad | null>;
  desactivar(id: string): Promise<Variedad | null>;
}
