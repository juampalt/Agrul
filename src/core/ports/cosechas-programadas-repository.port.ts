import { DatosProgramacionCosecha, EstadoJornadaCosecha, JornadaCosecha } from '../domain/entities/cosecha-programada.entity.js';

export interface FiltrosJornadasCosecha {
  fincaIds?: readonly string[];
  cicloId?: string;
  responsableId?: string;
  estado?: EstadoJornadaCosecha;
  desde?: string;
  hasta?: string;
  limit: number;
  offset: number;
}
export interface HistorialJornadaCosecha {
  id: string;
  jornadaId: string;
  operacion: 'PROGRAMACION' | 'REPROGRAMACION' | 'CANCELACION';
  actorId: string;
  anterior: Record<string, unknown> | null;
  nuevo: Record<string, unknown>;
  registradoEn: string;
}
export interface CosechasProgramadasRepositoryPort {
  programar(id: string, datos: DatosProgramacionCosecha, actorId: string): Promise<JornadaCosecha>;
  buscarPorId(id: string): Promise<JornadaCosecha | null>;
  listar(filtros: FiltrosJornadasCosecha): Promise<JornadaCosecha[]>;
  actualizar(jornada: JornadaCosecha, version: number, actorId: string): Promise<JornadaCosecha>;
  historial(id: string, limit: number, offset: number): Promise<HistorialJornadaCosecha[]>;
}
