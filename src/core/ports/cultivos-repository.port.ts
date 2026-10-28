import { Cultivo, DatosCultivo, EstadoCultivo } from '../domain/entities/cultivo.entity.js';

export interface FiltrosCultivos {
  estado?: EstadoCultivo;
  limit: number;
  offset: number;
}

export interface CultivosRepositoryPort {
  guardar(cultivo: Cultivo): Promise<void>;
  buscarPorId(id: string): Promise<Cultivo | null>;
  listar(filtros: FiltrosCultivos): Promise<Cultivo[]>;
  modificar(id: string, datos: DatosCultivo): Promise<Cultivo | null>;
  desactivar(id: string): Promise<Cultivo | null>;
}
