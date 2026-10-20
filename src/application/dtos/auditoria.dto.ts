import { AccionAuditoria } from '../../core/domain/entities/auditoria-seguridad-log.entity.js';

export interface RegistrarAuditoriaInputDto {
  id?: string;
  usuarioId?: string | null;
  usuarioEmail?: string | null;
  accion: AccionAuditoria;
  entidad: string;
  entidadId?: string | null;
  valorPrevioJson?: Record<string, unknown> | null;
  valorNuevoJson?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  timestamp?: string;
}

export interface AuditoriaOutputDto {
  id: string;
  usuarioId: string | null;
  usuarioEmail: string | null;
  accion: AccionAuditoria;
  entidad: string;
  entidadId: string | null;
  valorPrevioJson: Record<string, unknown> | null;
  valorNuevoJson: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  timestamp: string;
}

export interface ConsultarAuditoriaInputDto {
  usuarioId?: string;
  accion?: AccionAuditoria;
  entidad?: string;
  entidadId?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  limit?: number;
  offset?: number;
}

export interface ConsultarAuditoriaOutputDto {
  logs: AuditoriaOutputDto[];
  total: number;
}
