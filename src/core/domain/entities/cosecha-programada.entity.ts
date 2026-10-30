import { DomainError } from '../errors/domain.error.js';

export type EstadoJornadaCosecha = 'PENDIENTE' | 'EJECUTADA' | 'CANCELADA';
export interface DatosProgramacionCosecha {
  cicloId: string;
  fechaPrevista: string;
  responsableId: string;
  sector: string;
  cantidadEstimadaKg: number;
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
export function validarProgramacionCosecha(datos: DatosProgramacionCosecha): DatosProgramacionCosecha {
  if (!datos.cicloId || !datos.responsableId || !esFechaCosechaValida(datos.fechaPrevista) ||
      !datos.sector.trim() || !esEstimacionKgValida(datos.cantidadEstimadaKg)) {
    throw new ProgramacionCosechaInvalidaError('Se requieren ciclo, responsable, sector, fecha válida y kg estimados no negativos con hasta dos decimales.');
  }
  return { ...datos, cicloId: datos.cicloId.toLowerCase(), responsableId: datos.responsableId.toLowerCase(), sector: datos.sector.trim() };
}
export function reprogramarCosecha(jornada: JornadaCosecha, datos: { fechaPrevista: string; responsableId?: string }): JornadaCosecha {
  exigirPendiente(jornada);
  const nueva = { ...jornada, ...datos };
  return { ...nueva, ...validarProgramacionCosecha(nueva) };
}
export function cancelarJornadaCosecha(jornada: JornadaCosecha, motivo: string): JornadaCosecha {
  exigirPendiente(jornada);
  if (!motivo.trim()) throw new ProgramacionCosechaInvalidaError('El motivo de cancelación es obligatorio.');
  return { ...jornada, estado: 'CANCELADA', motivoCancelacion: motivo.trim() };
}
function exigirPendiente(jornada: JornadaCosecha): void {
  if (jornada.estado !== 'PENDIENTE') throw new ProgramacionCosechaInvalidaError('Solo se modifica una jornada pendiente.');
}
