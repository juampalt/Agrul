import { randomUUID } from 'node:crypto';
import { AuditoriaSeguridadLog } from '../../core/domain/entities/auditoria-seguridad-log.entity.js';
import { AuditoriaSeguridadRepositoryPort } from '../../core/ports/auditoria-seguridad-repository.port.js';
import {
  RegistrarAuditoriaInputDto,
  AuditoriaOutputDto,
  ConsultarAuditoriaInputDto,
  ConsultarAuditoriaOutputDto,
} from '../dtos/auditoria.dto.js';

export class RegistrarAuditoriaSeguridadUseCase {
  constructor(private readonly auditoriaRepo: AuditoriaSeguridadRepositoryPort) {}

  public async execute(input: RegistrarAuditoriaInputDto): Promise<AuditoriaOutputDto> {
    const id = input.id ?? randomUUID();

    const log = AuditoriaSeguridadLog.crear({
      id,
      usuarioId: input.usuarioId,
      usuarioEmail: input.usuarioEmail,
      accion: input.accion,
      entidad: input.entidad,
      entidadId: input.entidadId,
      valorPrevioJson: input.valorPrevioJson,
      valorNuevoJson: input.valorNuevoJson,
      ip: input.ip,
      userAgent: input.userAgent,
      timestamp: input.timestamp,
    });

    await this.auditoriaRepo.registrar(log);

    return {
      id: log.id,
      usuarioId: log.usuarioId ?? null,
      usuarioEmail: log.usuarioEmail ?? null,
      accion: log.accion,
      entidad: log.entidad,
      entidadId: log.entidadId ?? null,
      valorPrevioJson: log.valorPrevioJson ?? null,
      valorNuevoJson: log.valorNuevoJson ?? null,
      ip: log.ip ?? null,
      userAgent: log.userAgent ?? null,
      timestamp: log.timestamp,
    };
  }
}

export class ConsultarAuditoriaSeguridadUseCase {
  constructor(private readonly auditoriaRepo: AuditoriaSeguridadRepositoryPort) {}

  public async execute(input: ConsultarAuditoriaInputDto = {}): Promise<ConsultarAuditoriaOutputDto> {
    const { logs, total } = await this.auditoriaRepo.listar({
      usuarioId: input.usuarioId,
      accion: input.accion,
      entidad: input.entidad,
      entidadId: input.entidadId,
      fechaDesde: input.fechaDesde,
      fechaHasta: input.fechaHasta,
      limit: input.limit,
      offset: input.offset,
    });

    return {
      logs: logs.map((log) => ({
        id: log.id,
        usuarioId: log.usuarioId ?? null,
        usuarioEmail: log.usuarioEmail ?? null,
        accion: log.accion,
        entidad: log.entidad,
        entidadId: log.entidadId ?? null,
        valorPrevioJson: log.valorPrevioJson ?? null,
        valorNuevoJson: log.valorNuevoJson ?? null,
        ip: log.ip ?? null,
        userAgent: log.userAgent ?? null,
        timestamp: log.timestamp,
      })),
      total,
    };
  }
}

export class ObtenerAuditoriaPorIdUseCase {
  constructor(private readonly auditoriaRepo: AuditoriaSeguridadRepositoryPort) {}

  public async execute(id: string): Promise<AuditoriaOutputDto | null> {
    const log = await this.auditoriaRepo.obtenerPorId(id);
    if (!log) return null;

    return {
      id: log.id,
      usuarioId: log.usuarioId ?? null,
      usuarioEmail: log.usuarioEmail ?? null,
      accion: log.accion,
      entidad: log.entidad,
      entidadId: log.entidadId ?? null,
      valorPrevioJson: log.valorPrevioJson ?? null,
      valorNuevoJson: log.valorNuevoJson ?? null,
      ip: log.ip ?? null,
      userAgent: log.userAgent ?? null,
      timestamp: log.timestamp,
    };
  }
}
