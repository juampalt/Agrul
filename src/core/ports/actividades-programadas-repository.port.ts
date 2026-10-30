import { ActividadProgramada, EstadoActividadProgramada } from '../domain/entities/actividad-programada.entity.js';

export interface FiltrosActividadesProgramadas {
  /** Alcance interno derivado de la sesión; no forma parte del contrato HTTP. */
  fincaIds?: readonly string[];
  cicloId?: string;
  loteId?: string;
  tipoActividadId?: string;
  responsableId?: string;
  estado?: EstadoActividadProgramada;
  desde?: string;
  hasta?: string;
  limit: number;
  offset: number;
}

export interface ActividadesProgramadasRepositoryPort {
  guardar(actividad: ActividadProgramada): Promise<void>;
  buscarPorId(id: string): Promise<ActividadProgramada | null>;
  listar(filtros: FiltrosActividadesProgramadas): Promise<ActividadProgramada[]>;
  /** Requiere la versión de lectura; rechaza cambios concurrentes sin reintentar. */
  actualizar(actividad: ActividadProgramada): Promise<void>;
}
