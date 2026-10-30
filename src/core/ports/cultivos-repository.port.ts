import { Cultivo, DatosCultivo, EstadoCultivo } from '../domain/entities/cultivo.entity.js';

export interface FiltrosCultivos {
  estado?: EstadoCultivo;
  /** Búsqueda por nombre (contiene, sin distinguir mayúsculas). */
  nombre?: string;
  tipoCicloVida?: 'ANUAL' | 'PERENNE';
  limit: number;
  offset: number;
}

export interface CultivosRepositoryPort {
  guardar(cultivo: Cultivo): Promise<void>;
  buscarPorId(id: string): Promise<Cultivo | null>;
  listar(filtros: FiltrosCultivos): Promise<Cultivo[]>;
  modificar(id: string, datos: DatosCultivo): Promise<Cultivo | null>;
  desactivar(id: string): Promise<Cultivo | null>;
  /** Variedades asociadas (activas e inactivas) con nombre y estado. */
  variedadesDe(cultivoId: string): Promise<{ id: string; nombre: string; estado: string }[]>;
}
