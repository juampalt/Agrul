import { TipoActividad, DatosTipoActividad, EstadoTipoActividad, CategoriaTipoActividad } from '../domain/entities/tipo-actividad-canonico.entity.js';

export interface FiltrosTiposActividad {
  estado?: EstadoTipoActividad;
  categoria?: CategoriaTipoActividad;
  cultivoId?: string;
  limit: number;
  offset: number;
}

export interface TiposActividadRepositoryPort {
  guardar(tipo: TipoActividad): Promise<void>;
  buscarPorId(id: string): Promise<TipoActividad | null>;
  listar(filtros: FiltrosTiposActividad): Promise<TipoActividad[]>;
  modificar(id: string, datos: DatosTipoActividad): Promise<TipoActividad | null>;
  desactivar(id: string): Promise<TipoActividad | null>;
}
