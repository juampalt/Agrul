import { AuditoriaInvalidaError } from '../errors/domain.error.js';

export type AccionAuditoria =
  | 'LOGIN'
  | 'CREAR'
  | 'EDITAR'
  | 'ANULAR'
  | 'EMITIR_REPORTE'
  | 'BLOQUEO'
  | 'DESBLOQUEO'
  | 'CAMBIO_PASSWORD';

export interface AuditoriaSeguridadProps {
  id: string;
  usuarioId?: string | null;
  usuarioEmail?: string | null;
  accion: AccionAuditoria;
  entidad: string;
  entidadId?: string | null;
  valorPrevioJson?: Record<string, unknown> | null;
  valorNuevoJson?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  timestamp: string;
}

export interface CrearAuditoriaParams {
  id: string;
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

export class AuditoriaSeguridadLog {
  public static readonly ACCIONES_VALIDAS: AccionAuditoria[] = [
    'LOGIN',
    'CREAR',
    'EDITAR',
    'ANULAR',
    'EMITIR_REPORTE',
    'BLOQUEO',
    'DESBLOQUEO',
    'CAMBIO_PASSWORD',
  ];

  private constructor(private readonly props: AuditoriaSeguridadProps) {}

  public static crear(params: CrearAuditoriaParams): AuditoriaSeguridadLog {
    if (!params.id || params.id.trim().length === 0) {
      throw new AuditoriaInvalidaError('El ID del log de auditoría es obligatorio.');
    }

    if (!params.accion || !AuditoriaSeguridadLog.ACCIONES_VALIDAS.includes(params.accion)) {
      throw new AuditoriaInvalidaError(`La acción '${params.accion}' no es una acción de auditoría válida.`);
    }

    if (!params.entidad || params.entidad.trim().length === 0) {
      throw new AuditoriaInvalidaError('La entidad auditada es obligatoria.');
    }

    const ahora = params.timestamp ?? new Date().toISOString();

    return new AuditoriaSeguridadLog({
      id: params.id.trim(),
      usuarioId: params.usuarioId ? params.usuarioId.trim() : null,
      usuarioEmail: params.usuarioEmail ? params.usuarioEmail.trim().toLowerCase() : null,
      accion: params.accion,
      entidad: params.entidad.trim().toUpperCase(),
      entidadId: params.entidadId ? params.entidadId.trim() : null,
      valorPrevioJson: params.valorPrevioJson ?? null,
      valorNuevoJson: params.valorNuevoJson ?? null,
      ip: params.ip ? params.ip.trim() : null,
      userAgent: params.userAgent ? params.userAgent.trim() : null,
      timestamp: ahora,
    });
  }

  public static reconstituir(props: AuditoriaSeguridadProps): AuditoriaSeguridadLog {
    return new AuditoriaSeguridadLog({ ...props });
  }

  public get id(): string {
    return this.props.id;
  }

  public get usuarioId(): string | null | undefined {
    return this.props.usuarioId;
  }

  public get usuarioEmail(): string | null | undefined {
    return this.props.usuarioEmail;
  }

  public get accion(): AccionAuditoria {
    return this.props.accion;
  }

  public get entidad(): string {
    return this.props.entidad;
  }

  public get entidadId(): string | null | undefined {
    return this.props.entidadId;
  }

  public get valorPrevioJson(): Record<string, unknown> | null | undefined {
    return this.props.valorPrevioJson;
  }

  public get valorNuevoJson(): Record<string, unknown> | null | undefined {
    return this.props.valorNuevoJson;
  }

  public get ip(): string | null | undefined {
    return this.props.ip;
  }

  public get userAgent(): string | null | undefined {
    return this.props.userAgent;
  }

  public get timestamp(): string {
    return this.props.timestamp;
  }

  public toJSON() {
    return {
      id: this.props.id,
      usuarioId: this.props.usuarioId,
      usuarioEmail: this.props.usuarioEmail,
      accion: this.props.accion,
      entidad: this.props.entidad,
      entidadId: this.props.entidadId,
      valorPrevioJson: this.props.valorPrevioJson,
      valorNuevoJson: this.props.valorNuevoJson,
      ip: this.props.ip,
      userAgent: this.props.userAgent,
      timestamp: this.props.timestamp,
    };
  }
}
