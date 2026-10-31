import { DomainError } from '../errors/domain.error.js';
import { ActividadProgramadaProps } from './actividad-programada.entity.js';
import { validarFechaCiclo } from '../value-objects/planificacion-ciclo.vo.js';

export interface DatosEjecucionProgramada {
  actividadProgramadaId: string;
  responsableId: string;
  fechaEjecucion: string;
  superficieTrabajadaHa: number;
  duracionHoras?: number | null;
  descripcionTrabajo?: string | null;
  /** CU33: monitoreo del mismo ciclo al que responde la labor. */
  monitoreoId?: string | null;
  datosEspecificos?: Record<string, unknown>;
}

export interface ContextoEjecucionProgramada {
  programada: ActividadProgramadaProps;
  ciclo: { id: string; loteId: string; estado: string; fechaInicio: string; fechaFin: string };
  responsableActivo: boolean;
}

export interface DatosEjecucionDirecta extends Omit<DatosEjecucionProgramada, 'actividadProgramadaId'> {
  cicloId: string;
  tipoActividadId: string;
}

export interface ContextoEjecucionDirecta extends Omit<ContextoEjecucionProgramada, 'programada'> {
  tipoActivo: boolean;
}

export interface ActividadRealizadaProps {
  id: string;
  actividadProgramadaId: string | null;
  cicloId: string;
  loteId: string;
  tipoActividadId: string;
  responsableId: string;
  fechaEjecucion: string;
  superficieTrabajadaHa: number;
  duracionHoras: number | null;
  descripcionTrabajo: string | null;
  monitoreoId?: string | null;
  datosEspecificos: Record<string, unknown>;
}

export class EjecucionActividadInvalidaError extends DomainError {
  readonly code = 'EJECUCION_ACTIVIDAD_INVALIDA';
}

export class ActividadRealizada {
  private constructor(private readonly props: ActividadRealizadaProps) {}

  static desdeProgramada(id: string, datos: DatosEjecucionProgramada, contexto: ContextoEjecucionProgramada, hoy = new Date()): ActividadRealizada {
    const { programada, ciclo } = contexto;
    if (programada.id !== datos.actividadProgramadaId || programada.cicloId !== ciclo.id || !ciclo.loteId || !programada.tipoActividadId) {
      throw new EjecucionActividadInvalidaError('La programación debe pertenecer al ciclo y lote indicados.');
    }
    if (programada.estado !== 'PENDIENTE') {
      throw new EjecucionActividadInvalidaError('Solo puede ejecutarse una actividad PENDIENTE.');
    }
    return ActividadRealizada.crear(id, datos, contexto, programada.id, programada.tipoActividadId, hoy);
  }

  static directa(id: string, datos: DatosEjecucionDirecta, contexto: ContextoEjecucionDirecta, hoy = new Date()): ActividadRealizada {
    if (!contexto.tipoActivo || !datos.tipoActividadId || datos.cicloId !== contexto.ciclo.id || !contexto.ciclo.loteId) {
      throw new EjecucionActividadInvalidaError('El registro directo requiere un tipo activo y un ciclo vinculado al lote.');
    }
    return ActividadRealizada.crear(id, datos, contexto, null, datos.tipoActividadId, hoy);
  }

  // Las lecturas históricas no revalidan el estado actual del ciclo o responsable.
  static reconstituir(props: ActividadRealizadaProps): ActividadRealizada {
    return new ActividadRealizada(structuredClone(props));
  }

  private static crear(id: string, datos: Omit<DatosEjecucionProgramada, 'actividadProgramadaId'>,
    contexto: Omit<ContextoEjecucionProgramada, 'programada'>, actividadProgramadaId: string | null, tipoActividadId: string, hoy: Date): ActividadRealizada {
    const { ciclo } = contexto;
    if (ciclo.estado !== 'ACTIVO' || !contexto.responsableActivo || !datos.responsableId) {
      throw new EjecucionActividadInvalidaError('La ejecución requiere ciclo ACTIVO y responsable activo (RN-11).');
    }
    validarFechaCiclo(datos.fechaEjecucion, true, hoy);
    if (datos.fechaEjecucion < ciclo.fechaInicio || datos.fechaEjecucion > ciclo.fechaFin) {
      throw new EjecucionActividadInvalidaError('La fecha de ejecución debe estar comprendida en el ciclo.');
    }
    // Se preservan exactamente los valores representables en NUMERIC(8,2)/(5,2).
    if (!esDecimalPositivo(datos.superficieTrabajadaHa, 999999.99)
      || (datos.duracionHoras != null && !esDecimalPositivo(datos.duracionHoras, 999.99))) {
      throw new EjecucionActividadInvalidaError('Superficie y duración deben ser positivas, finitas y tener hasta dos decimales dentro del rango permitido.');
    }
    return new ActividadRealizada({
      id, actividadProgramadaId, cicloId: ciclo.id, loteId: ciclo.loteId,
      tipoActividadId, responsableId: datos.responsableId,
      fechaEjecucion: datos.fechaEjecucion, superficieTrabajadaHa: datos.superficieTrabajadaHa,
      duracionHoras: datos.duracionHoras ?? null, descripcionTrabajo: datos.descripcionTrabajo?.trim() ?? null,
      monitoreoId: datos.monitoreoId ?? null,
      datosEspecificos: structuredClone(datos.datosEspecificos ?? {}),
    });
  }

  toJSON(): ActividadRealizadaProps & { origen: 'PROGRAMADA' | 'NO_PROGRAMADA' } {
    return { ...structuredClone(this.props), origen: this.props.actividadProgramadaId === null ? 'NO_PROGRAMADA' : 'PROGRAMADA' };
  }
}

function esDecimalPositivo(valor: number, maximo: number): boolean {
  return Number.isFinite(valor) && valor > 0 && valor <= maximo && Number(valor.toFixed(2)) === valor;
}
