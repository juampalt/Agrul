import { CategoriaActividad } from '../../core/domain/entities/tipo-actividad.entity.js';
import { TipoPersonal } from '../../core/domain/entities/personal-cuadrilla.entity.js';
import { CondicionMaquinaria, TipoMaquinaria } from '../../core/domain/entities/maquinaria.entity.js';

// --- Tipos de Actividad ---
export interface CrearTipoActividadInputDTO {
  nombre: string;
  categoria?: CategoriaActividad;
  descripcion?: string | null;
  requiereMaquinaria?: boolean;
  requiereInsumos?: boolean;
  activo?: boolean;
}

export interface TipoActividadResponseDTO {
  id: string;
  nombre: string;
  categoria: CategoriaActividad;
  descripcion?: string | null;
  requiereMaquinaria: boolean;
  requiereInsumos: boolean;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

// --- Personal y Cuadrillas ---
export interface CrearPersonalInputDTO {
  nombre: string;
  tipo?: TipoPersonal;
  dniOIdentificacion?: string | null;
  usuarioId?: string | null;
  telefono?: string | null;
  activo?: boolean;
}

export interface PersonalResponseDTO {
  id: string;
  nombre: string;
  tipo: TipoPersonal;
  dniOIdentificacion?: string | null;
  usuarioId?: string | null;
  telefono?: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

// --- Maquinaria ---
export interface CrearMaquinariaInputDTO {
  identificacion: string;
  tipo?: TipoMaquinaria;
  condicion?: CondicionMaquinaria;
  marcaModelo?: string | null;
  activo?: boolean;
}

export interface MaquinariaResponseDTO {
  id: string;
  identificacion: string;
  tipo: TipoMaquinaria;
  condicion: CondicionMaquinaria;
  marcaModelo?: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}
