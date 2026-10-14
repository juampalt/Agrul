import { TipoActividad, CategoriaActividad } from '../domain/entities/tipo-actividad.entity.js';
import { PersonalCuadrilla, TipoPersonal } from '../domain/entities/personal-cuadrilla.entity.js';
import { Maquinaria, CondicionMaquinaria, TipoMaquinaria } from '../domain/entities/maquinaria.entity.js';

export interface ListarTiposActividadFiltros {
  activo?: boolean;
  categoria?: CategoriaActividad | string;
  nombre?: string;
}

export interface ListarPersonalFiltros {
  activo?: boolean;
  tipo?: TipoPersonal;
  nombre?: string;
}

export interface ListarMaquinariaFiltros {
  activo?: boolean;
  condicion?: CondicionMaquinaria | string;
  tipo?: TipoMaquinaria | string;
  identificacion?: string;
}

export interface CatalogosActividadesRepositoryPort {
  // Tipos de Actividad
  guardarTipoActividad(tipo: TipoActividad): Promise<void>;
  buscarTipoActividadPorId(id: string): Promise<TipoActividad | null>;
  listarTiposActividad(filtro?: ListarTiposActividadFiltros): Promise<TipoActividad[]>;
  actualizarTipoActividad(tipo: TipoActividad): Promise<void>;

  // Personal y Cuadrillas
  guardarPersonal(personal: PersonalCuadrilla): Promise<void>;
  buscarPersonalPorId(id: string): Promise<PersonalCuadrilla | null>;
  listarPersonal(filtro?: ListarPersonalFiltros): Promise<PersonalCuadrilla[]>;
  actualizarPersonal(personal: PersonalCuadrilla): Promise<void>;

  // Maquinaria Agrícola
  guardarMaquinaria(maquinaria: Maquinaria): Promise<void>;
  buscarMaquinariaPorId(id: string): Promise<Maquinaria | null>;
  listarMaquinaria(filtro?: ListarMaquinariaFiltros): Promise<Maquinaria[]>;
  actualizarMaquinaria(maquinaria: Maquinaria): Promise<void>;
}
