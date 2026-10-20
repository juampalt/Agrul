import { AuditoriaSeguridadLog, AccionAuditoria } from '../domain/entities/auditoria-seguridad-log.entity.js';

export interface FiltrosAuditoria {
  usuarioId?: string;
  accion?: AccionAuditoria;
  entidad?: string;
  entidadId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  limit?: number;
  offset?: number;
}

export interface AuditoriaSeguridadRepositoryPort {
  registrar(log: AuditoriaSeguridadLog): Promise<void>;
  listar(filtros?: FiltrosAuditoria): Promise<{ logs: AuditoriaSeguridadLog[]; total: number }>;
  obtenerPorId(id: string): Promise<AuditoriaSeguridadLog | null>;
}
