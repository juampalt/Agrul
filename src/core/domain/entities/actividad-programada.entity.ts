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

export interface ActividadProgramadaProps extends Omit<DatosProgramacionActividad, 'tipoActividadId' | 'fechaProgramada' | 'responsableId'> {
  // La migración 0015 conserva estos campos nulos en registros anteriores.
  tipoActividadId: string | null;
  fechaProgramada: string | null;
  responsableId: string | null;
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

export class ConflictoActividadProgramadaError extends DomainError {
  readonly code = 'ACTIVIDAD_PROGRAMADA_DESACTUALIZADA';
  constructor() { super('La actividad cambió desde su lectura o ya no está pendiente. Volvé a consultarla antes de modificarla.'); }
}

export class ActividadProgramada {
  private constructor(private readonly props: ActividadProgramadaProps, private readonly revisionLectura?: string) {}

  static programar(datos: DatosProgramacionActividad & { id: string }): ActividadProgramada {
    if (!datos.tipoActividadId) throw new ActividadProgramadaInvalidaError('El ID del tipo de actividad es obligatorio.');
    if (!datos.responsableId) throw new ActividadProgramadaInvalidaError('El ID del responsable es obligatorio.');
    if (!esFechaProgramadaValida(datos.fechaProgramada)) {
      throw new ActividadProgramadaInvalidaError('La fecha programada debe tener formato YYYY-MM-DD válido.');
    }
    if (datos.superficiePrevista != null && (!Number.isFinite(datos.superficiePrevista) || datos.superficiePrevista <= 0)) {
      throw new ActividadProgramadaInvalidaError('La superficie prevista en hectáreas debe ser mayor a cero.');
    }
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

  static reconstituir(props: ActividadProgramadaProps, versionPersistida?: string): ActividadProgramada {
    if (!props.id) throw new ActividadProgramadaInvalidaError('El ID de la actividad es obligatorio.');
    if (!props.cicloId) {
      throw new ActividadProgramadaInvalidaError('El ID del ciclo productivo es obligatorio.');
    }
    if (!['PENDIENTE', 'EJECUTADA', 'CANCELADA'].includes(props.estado)) {
      throw new ActividadProgramadaInvalidaError(`Estado inválido: '${props.estado}'.`);
    }
    // Recuperar hechos no aplica reglas de alta ni inventa valores para campos
    // desconocidos. Las operaciones validan exclusivamente los datos que cambian.
    return new ActividadProgramada({ ...props }, versionPersistida);
  }

  get id(): string { return this.props.id; }
  get cicloId(): string { return this.props.cicloId; }
  get tipoActividadId(): string | null { return this.props.tipoActividadId; }
  get fechaProgramada(): string | null { return this.props.fechaProgramada; }
  get responsableId(): string | null { return this.props.responsableId; }
  get superficiePrevista(): number | null { return this.props.superficiePrevista ?? null; }
  get descripcion(): string | null { return this.props.descripcion ?? null; }
  get estado(): EstadoActividadProgramada { return this.props.estado; }
  get motivoCancelacion(): string | null { return this.props.motivoCancelacion ?? null; }
  get creadoEn(): string { return this.props.creadoEn; }
  get actualizadoEn(): string { return this.props.actualizadoEn; }
  /** Token opaco del adaptador, válido para el ciclo interno de lectura/escritura. */
  get versionPersistida(): string | undefined { return this.revisionLectura; }

  reprogramar(params: { fechaProgramada: string; responsableId?: string }): ActividadProgramada {
    if (this.props.estado !== 'PENDIENTE') {
      throw new EstadoActividadInvalidoError(`Solo se pueden reprogramar actividades en estado PENDIENTE. Estado actual: '${this.props.estado}'.`);
    }
    if (!esFechaProgramadaValida(params.fechaProgramada)) {
      throw new ActividadProgramadaInvalidaError('La nueva fecha programada debe tener formato YYYY-MM-DD válido.');
    }
    if (params.responsableId !== undefined && !params.responsableId) {
      throw new ActividadProgramadaInvalidaError('El nuevo responsable no puede estar vacío.');
    }

    return ActividadProgramada.reconstituir({
      ...this.props,
      fechaProgramada: params.fechaProgramada,
      responsableId: params.responsableId ?? this.props.responsableId,
      actualizadoEn: new Date().toISOString(),
    }, this.revisionLectura);
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
    }, this.revisionLectura);
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
