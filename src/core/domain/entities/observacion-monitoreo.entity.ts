import { FechaFuturaInvalidaError, DomainError } from '../errors/domain.error.js';

export class SintomasMonitoreoInvalidoError extends DomainError {
  public readonly code = 'INVALID_MONITORING_SYMPTOMS';

  constructor(mensaje: string = 'La descripción de los síntomas observados es obligatoria.') {
    super(mensaje);
  }
}

export interface ObservacionMonitoreoProps {
  id: string;
  loteId: string;
  cicloId: string;
  fecha: string;
  sintomas: string;
  plagas?: string | null;
  estadoCultivo: string;
  fotosUrls: string[];
  usuarioId: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface CrearObservacionMonitoreoParams {
  id: string;
  loteId: string;
  cicloId: string;
  fecha: string;
  sintomas: string;
  plagas?: string | null;
  estadoCultivo?: string;
  fotosUrls?: string[];
  usuarioId: string;
  fechaReferenciaHoy?: Date;
}

/**
 * Entidad de dominio que representa una observación o monitoreo de campo fitosanitario.
 * Cumple con RF-M3-11 y valida RN-04 (fecha no futura).
 */
export class ObservacionMonitoreo {
  private constructor(private props: ObservacionMonitoreoProps) {}

  public static crear(params: CrearObservacionMonitoreoParams): ObservacionMonitoreo {
    if (!params.id) {
      throw new Error('El id de la observación de monitoreo es obligatorio.');
    }
    if (!params.loteId) {
      throw new Error('El loteId es obligatorio.');
    }
    if (!params.cicloId) {
      throw new Error('El cicloId es obligatorio.');
    }
    if (!params.usuarioId) {
      throw new Error('El usuarioId es obligatorio.');
    }
    if (!params.sintomas || params.sintomas.trim().length < 3) {
      throw new SintomasMonitoreoInvalidoError('La descripción de síntomas debe contener al menos 3 caracteres.');
    }

    // Regla RN-04: La fecha de la observación de monitoreo no puede ser futura
    const hoyRef = params.fechaReferenciaHoy ?? new Date();
    const fechaHoyStr = hoyRef.toISOString().split('T')[0];
    const fechaStr = params.fecha.includes('T') ? params.fecha.split('T')[0] : params.fecha;

    if (fechaStr > fechaHoyStr) {
      throw new FechaFuturaInvalidaError(params.fecha);
    }

    const ahora = new Date().toISOString();

    return new ObservacionMonitoreo({
      id: params.id,
      loteId: params.loteId,
      cicloId: params.cicloId,
      fecha: fechaStr,
      sintomas: params.sintomas.trim(),
      plagas: params.plagas ? params.plagas.trim() : null,
      estadoCultivo: (params.estadoCultivo ?? 'GENERAL').trim().toUpperCase(),
      fotosUrls: params.fotosUrls ? [...params.fotosUrls] : [],
      usuarioId: params.usuarioId,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  public static reconstituir(props: ObservacionMonitoreoProps): ObservacionMonitoreo {
    return new ObservacionMonitoreo({
      ...props,
      fotosUrls: [...props.fotosUrls],
    });
  }

  public get id(): string { return this.props.id; }
  public get loteId(): string { return this.props.loteId; }
  public get cicloId(): string { return this.props.cicloId; }
  public get fecha(): string { return this.props.fecha; }
  public get sintomas(): string { return this.props.sintomas; }
  public get plagas(): string | null | undefined { return this.props.plagas; }
  public get estadoCultivo(): string { return this.props.estadoCultivo; }
  public get fotosUrls(): string[] { return [...this.props.fotosUrls]; }
  public get usuarioId(): string { return this.props.usuarioId; }
  public get creadoEn(): string { return this.props.creadoEn; }
  public get actualizadoEn(): string { return this.props.actualizadoEn; }

  public toJSON(): ObservacionMonitoreoProps {
    return {
      ...this.props,
      fotosUrls: [...this.props.fotosUrls],
    };
  }
}
