import { DomainError } from '../errors/domain.error.js';
import { LocalizacionTucumanService } from '../services/localizacion-tucuman.service.js';
import { esEstimacionKgValida, esFechaCosechaValida } from './cosecha-programada.entity.js';

export interface DatosPesajeCosecha {
  operacionId: string;
  fechaEfectiva: string;
  numeroPasada: number;
  cantidadCosechadaKg: number;
  responsableId: string;
  /** Opcional: si falta y hay jornada, se toma el de la jornada; si no, «Sin especificar». */
  sector?: string;
  observaciones?: string | null;
  timestampCapturaLocal?: string;
}
export type RegistrarCosecha = DatosPesajeCosecha & (
  { origen: 'PROGRAMADA'; cosechaProgramadaId: string; versionProgramacion: number }
  | { origen: 'NO_PROGRAMADA'; cicloId: string }
);
export interface ActorCosechas { usuarioId: string; fincaIds?: readonly string[] }
export interface CosechaRegistrada {
  id: string;
  codigoTrazabilidad: string;
  cicloId: string;
  loteId: string;
  cosechaProgramadaId: string | null;
  fecha: string;
  fechaEfectiva: string | null;
  numeroPasada: number | null;
  sector: string | null;
  observaciones: string | null;
  origen: 'PROGRAMADA' | 'NO_PROGRAMADA' | null;
  cantidadCosechadaKg: number;
  cantidadComercializableKg: number | null;
  cantidadDescarteKg: number | null;
  responsableId: string | null;
  registradoPor: string | null;
  timestampCapturaLocal: string | null;
  creadoEn: string;
  estado: string;
}
export class RegistroCosechaInvalidoError extends DomainError { readonly code = 'REGISTRO_COSECHA_INVALIDO'; }
export class ConflictoRegistroCosechaError extends DomainError {
  readonly code = 'REGISTRO_COSECHA_CONFLICTO';
  constructor() { super('La operación, pasada o jornada ya fue registrada, o cambió la programación consultada.'); }
}
export function validarPesajeCosecha(datos: RegistrarCosecha, hoy = new Date()): RegistrarCosecha {
  if (!esFechaCosechaValida(datos.fechaEfectiva) || datos.fechaEfectiva > LocalizacionTucumanService.extraerFechaLocal(hoy) ||
      !esEstimacionKgValida(datos.cantidadCosechadaKg) || datos.cantidadCosechadaKg <= 0 ||
      !Number.isInteger(datos.numeroPasada) || datos.numeroPasada < 1 || datos.numeroPasada > 2147483647 ||
      !datos.responsableId) {
    throw new RegistroCosechaInvalidoError('La cosecha requiere fecha real no futura, kg positivos con hasta dos decimales, pasada positiva y responsable.');
  }
  if (datos.origen === 'PROGRAMADA' && (!datos.cosechaProgramadaId || !Number.isInteger(datos.versionProgramacion) || datos.versionProgramacion < 1)) {
    throw new RegistroCosechaInvalidoError('El registro programado requiere jornada y versión vigente.');
  }
  if (datos.origen === 'NO_PROGRAMADA' && !datos.cicloId) throw new RegistroCosechaInvalidoError('La cosecha directa requiere ciclo.');
  if (datos.timestampCapturaLocal && !Number.isFinite(Date.parse(datos.timestampCapturaLocal))) {
    throw new RegistroCosechaInvalidoError('La captura local debe ser un timestamp válido.');
  }
  return { ...datos, sector: datos.sector?.trim() || undefined, observaciones: datos.observaciones?.trim() || null };
}
