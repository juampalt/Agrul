import { DomainError } from '../errors/domain.error.js';

export type EstadoJornadaCosecha = 'PENDIENTE' | 'EJECUTADA' | 'CANCELADA';
export interface DatosProgramacionCosecha {
  cicloId: string;
  fechaPrevista: string;
  responsableId: string;
  /** Opcional en el documento; sin dato se guarda «Sin especificar». */
  sector?: string;
  cantidadEstimadaKg?: number | null;
  observaciones?: string | null;
}
export interface JornadaCosecha extends DatosProgramacionCosecha {
  id: string;
  estado: EstadoJornadaCosecha;
  motivoCancelacion: string | null;
  version: number;
  actualizadoPor: string;
  creadoEn: string;
  actualizadoEn: string;
}
export class ProgramacionCosechaInvalidaError extends DomainError {
  readonly code = 'PROGRAMACION_COSECHA_INVALIDA';
}
export class ConflictoProgramacionCosechaError extends DomainError {
  readonly code = 'PROGRAMACION_COSECHA_DESACTUALIZADA';
  constructor() { super('La jornada cambió o la operación ya existe con otros datos. Consultá su versión vigente.'); }
}
export function esFechaCosechaValida(fecha: string): boolean {
  const fechaUtc = new Date(`${fecha}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha.slice(0, 4) !== '0000' &&
    !Number.isNaN(fechaUtc.getTime()) && fechaUtc.toISOString().slice(0, 10) === fecha;
}
export function esEstimacionKgValida(cantidad: number): boolean {
  return Number.isFinite(cantidad) && cantidad >= 0 && cantidad <= 99999999.99 &&
    /^\d+(?:\.\d{1,2})?$/.test(String(cantidad));
}
export const SECTOR_SIN_ESPECIFICAR = 'Sin especificar';
export const MOTIVO_SIN_INFORMAR = 'Sin motivo informado';
export function validarProgramacionCosecha<T extends DatosProgramacionCosecha>(datos: T): T & { sector: string; cantidadEstimadaKg: number | null; observaciones: string | null } {
  const estimacion = datos.cantidadEstimadaKg ?? null;
  if (!datos.cicloId || !datos.responsableId || !esFechaCosechaValida(datos.fechaPrevista) ||
      (estimacion !== null && !esEstimacionKgValida(estimacion))) {
    throw new ProgramacionCosechaInvalidaError('Se requieren ciclo, responsable y fecha válida; los kg estimados, si se informan, no pueden ser negativos y admiten hasta dos decimales.');
  }
  return { ...datos, cicloId: datos.cicloId.toLowerCase(), responsableId: datos.responsableId.toLowerCase(),
    sector: datos.sector?.trim() || SECTOR_SIN_ESPECIFICAR, cantidadEstimadaKg: estimacion,
    observaciones: datos.observaciones?.trim() || null };
}
export interface DatosReprogramacionCosecha {
  fechaPrevista: string;
  responsableId?: string;
  sector?: string;
  cantidadEstimadaKg?: number | null;
  observaciones?: string | null;
}
export function reprogramarCosecha(jornada: JornadaCosecha, datos: DatosReprogramacionCosecha): JornadaCosecha {
  exigirPendiente(jornada);
  const informados = Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== undefined));
  const nueva = { ...jornada, ...informados };
  return { ...nueva, ...validarProgramacionCosecha(nueva) };
}
export function cancelarJornadaCosecha(jornada: JornadaCosecha, motivo?: string | null): JornadaCosecha {
  exigirPendiente(jornada);
  // El motivo es opcional en el documento; sin él queda constancia explícita.
  return { ...jornada, estado: 'CANCELADA', motivoCancelacion: motivo?.trim() || MOTIVO_SIN_INFORMAR };
}
function exigirPendiente(jornada: JornadaCosecha): void {
  if (jornada.estado !== 'PENDIENTE') throw new ProgramacionCosechaInvalidaError('Solo se modifica una jornada pendiente.');
}
