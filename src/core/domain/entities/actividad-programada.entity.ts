import { DomainError } from '../errors/domain.error.js';

export type EstadoActividadProgramada = 'PENDIENTE' | 'EJECUTADA' | 'CANCELADA';

export interface DatosProgramacionActividad {
  cicloId: string;
  tipoActividadId: string;
  fechaProgramada: string;
  responsableId: string;
  superficiePrevista?: number | null;
  descripcion?: string | null;
}

export interface ActividadProgramadaProps extends DatosProgramacionActividad {
  superficiePrevista: number | null;
  descripcion: string | null;
  id: string;
  estado: EstadoActividadProgramada;
  motivoCancelacion: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export class ActividadProgramadaInvalidaError extends DomainError {
  readonly code = 'ACTIVIDAD_PROGRAMADA_INVALIDA';
}

export class EstadoActividadInvalidoError extends DomainError {
  readonly code = 'ESTADO_ACTIVIDAD_INVALIDO';
}

export class ActividadProgramada {
  private constructor(private readonly props: ActividadProgramadaProps) {}

  static programar(datos: DatosProgramacionActividad & { id: string }): ActividadProgramada {
    const ahora = new Date().toISOString();
    return ActividadProgramada.reconstituir({
      ...datos,
      superficiePrevista: datos.superficiePrevista ?? null,
      descripcion: datos.descripcion?.trim() ?? null,
      estado: 'PENDIENTE',
      motivoCancelacion: null,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }

  static reconstituir(props: ActividadProgramadaProps): ActividadProgramada {
    if (!props.cicloId) {
      throw new ActividadProgramadaInvalidaError('El ID del ciclo productivo es obligatorio.');
    }
    if (!props.tipoActividadId) {
      throw new ActividadProgramadaInvalidaError('El ID del tipo de actividad es obligatorio.');
    }
    if (!props.responsableId) {
      throw new ActividadProgramadaInvalidaError('El ID del responsable es obligatorio.');
    }
    if (!esFechaProgramadaValida(props.fechaProgramada)) {
      throw new ActividadProgramadaInvalidaError('La fecha programada debe tener formato YYYY-MM-DD válido.');
    }
    if (props.superficiePrevista != null && (!Number.isFinite(props.superficiePrevista) || props.superficiePrevista <= 0)) {
      throw new ActividadProgramadaInvalidaError('La superficie prevista en hectáreas debe ser mayor a cero.');
    }
    if (!['PENDIENTE', 'EJECUTADA', 'CANCELADA'].includes(props.estado)) {
      throw new ActividadProgramadaInvalidaError(`Estado inválido: '${props.estado}'.`);
    }
    if (props.estado === 'CANCELADA') {
      const motivo = props.motivoCancelacion?.trim();
      if (!motivo || motivo.length === 0) {
        throw new ActividadProgramadaInvalidaError('Toda actividad cancelada debe incluir obligatoriamente el motivo de cancelación (RN-12).');
      }
    }

    return new ActividadProgramada({
      ...props,
      superficiePrevista: props.superficiePrevista !== null && props.superficiePrevista !== undefined ? Number(props.superficiePrevista) : null,
      descripcion: props.descripcion?.trim() ?? null,
      motivoCancelacion: props.motivoCancelacion?.trim() ?? null,
    });
  }

  get id(): string { return this.props.id; }
  get cicloId(): string { return this.props.cicloId; }
  get tipoActividadId(): string { return this.props.tipoActividadId; }
  get fechaProgramada(): string { return this.props.fechaProgramada; }
  get responsableId(): string { return this.props.responsableId; }
  get superficiePrevista(): number | null { return this.props.superficiePrevista ?? null; }
  get descripcion(): string | null { return this.props.descripcion ?? null; }
  get estado(): EstadoActividadProgramada { return this.props.estado; }
  get motivoCancelacion(): string | null { return this.props.motivoCancelacion ?? null; }
  get creadoEn(): string { return this.props.creadoEn; }
  get actualizadoEn(): string { return this.props.actualizadoEn; }

  reprogramar(params: { fechaProgramada: string; responsableId?: string }): ActividadProgramada {
    if (this.props.estado !== 'PENDIENTE') {
      throw new EstadoActividadInvalidoError(`Solo se pueden reprogramar actividades en estado PENDIENTE. Estado actual: '${this.props.estado}'.`);
    }
    if (!esFechaProgramadaValida(params.fechaProgramada)) {
      throw new ActividadProgramadaInvalidaError('La nueva fecha programada debe tener formato YYYY-MM-DD válido.');
    }

    return ActividadProgramada.reconstituir({
      ...this.props,
      fechaProgramada: params.fechaProgramada,
      responsableId: params.responsableId ?? this.props.responsableId,
      actualizadoEn: new Date().toISOString(),
    });
  }

  cancelar(motivo: string): ActividadProgramada {
    if (this.props.estado !== 'PENDIENTE') {
      throw new EstadoActividadInvalidoError(`Solo se pueden cancelar actividades en estado PENDIENTE. Estado actual: '${this.props.estado}'.`);
    }
    const motivoLimpio = motivo?.trim();
    if (!motivoLimpio || motivoLimpio.length === 0) {
      throw new ActividadProgramadaInvalidaError('El motivo de cancelación es obligatorio (RN-12).');
    }

    return ActividadProgramada.reconstituir({
      ...this.props,
      estado: 'CANCELADA',
      motivoCancelacion: motivoLimpio,
      actualizadoEn: new Date().toISOString(),
    });
  }

  toJSON(): ActividadProgramadaProps {
    return { ...this.props };
  }
}

export function esFechaProgramadaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha.startsWith('0000')) return false;
  const instante = new Date(`${fecha}T00:00:00.000Z`);
  return Number.isFinite(instante.getTime()) && instante.toISOString().slice(0, 10) === fecha;
}
