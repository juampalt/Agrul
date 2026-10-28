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
  datosEspecificos?: Record<string, unknown>;
}

export interface ContextoEjecucionProgramada {
  programada: ActividadProgramadaProps;
  ciclo: { id: string; loteId: string; estado: string; fechaInicio: string; fechaFin: string };
  responsableActivo: boolean;
}

export interface ActividadRealizadaProps {
  id: string;
  actividadProgramadaId: string;
  cicloId: string;
  loteId: string;
  tipoActividadId: string;
  responsableId: string;
  fechaEjecucion: string;
  superficieTrabajadaHa: number;
  duracionHoras: number | null;
  descripcionTrabajo: string | null;
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
      id, actividadProgramadaId: programada.id, cicloId: ciclo.id, loteId: ciclo.loteId,
      tipoActividadId: programada.tipoActividadId, responsableId: datos.responsableId,
      fechaEjecucion: datos.fechaEjecucion, superficieTrabajadaHa: datos.superficieTrabajadaHa,
      duracionHoras: datos.duracionHoras ?? null, descripcionTrabajo: datos.descripcionTrabajo?.trim() ?? null,
      datosEspecificos: structuredClone(datos.datosEspecificos ?? {}),
    });
  }

  toJSON(): ActividadRealizadaProps { return structuredClone(this.props); }
}

function esDecimalPositivo(valor: number, maximo: number): boolean {
  return Number.isFinite(valor) && valor > 0 && valor <= maximo && Number(valor.toFixed(2)) === valor;
}
