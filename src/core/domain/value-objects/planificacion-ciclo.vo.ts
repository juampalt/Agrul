import { DomainError } from '../errors/domain.error.js';
import { LocalizacionTucumanService } from '../services/localizacion-tucuman.service.js';

export type EstadoCicloPlanificado = 'PLANIFICADO' | 'ACTIVO' | 'FINALIZADO';
export interface DatosPlanificacionCiclo {
  plantacionId: string;
  nombreCodigo: string;
  fechaInicioPrevista: string;
  fechaFinPrevista: string;
  responsableSeguimientoId: string;
  observaciones: string | null;
}
export interface PlanificacionCiclo extends DatosPlanificacionCiclo {
  fechaInicioEfectiva: string | null;
  fechaFinEfectiva: string | null;
}
export interface CicloPlanificadoDTO extends PlanificacionCiclo {
  id: string;
  estado: EstadoCicloPlanificado;
}
export class CicloProductivoInvalidoError extends DomainError {
  readonly code = 'CICLO_PRODUCTIVO_INVALIDO';
}
export class CodigoCicloDuplicadoError extends DomainError {
  readonly code = 'CODIGO_CICLO_DUPLICADO';
  constructor() { super('Ya existe un ciclo con el nombre/código indicado.'); }
}

export function validarFechaCiclo(fecha: string, efectiva = false, hoy = new Date()): void {
  const utc = new Date(`${fecha}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(utc.getTime()) || utc.toISOString().slice(0, 10) !== fecha) {
    throw new CicloProductivoInvalidoError('La fecha debe ser una fecha de calendario válida (YYYY-MM-DD).');
  }
  if (efectiva && fecha > LocalizacionTucumanService.extraerFechaLocal(hoy)) {
    throw new CicloProductivoInvalidoError('Las fechas efectivas del ciclo no pueden ser futuras.');
  }
}

export function crearPlanificacionCiclo(datos: DatosPlanificacionCiclo, fechaPlantacion: string): PlanificacionCiclo {
  validarFechaCiclo(datos.fechaInicioPrevista);
  validarFechaCiclo(datos.fechaFinPrevista);
  if (!datos.nombreCodigo.trim() || datos.nombreCodigo.trim().length > 30) {
    throw new CicloProductivoInvalidoError('El nombre/código del ciclo debe tener entre 1 y 30 caracteres.');
  }
  if (!datos.plantacionId || !datos.responsableSeguimientoId) {
    throw new CicloProductivoInvalidoError('La plantación y el responsable de seguimiento son obligatorios.');
  }
  if (datos.fechaInicioPrevista < fechaPlantacion || datos.fechaFinPrevista < datos.fechaInicioPrevista) {
    throw new CicloProductivoInvalidoError('Las fechas previstas deben respetar el orden plantación, inicio y fin.');
  }
  return { ...datos, nombreCodigo: datos.nombreCodigo.trim(), fechaInicioEfectiva: null, fechaFinEfectiva: null };
}
