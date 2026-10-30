import { DomainError } from '../errors/domain.error.js';
import { LocalizacionTucumanService } from '../services/localizacion-tucuman.service.js';
import { esEstimacionKgValida, esFechaCosechaValida } from './cosecha-programada.entity.js';

export interface RegistrarClasificacion {
  operacionId: string; cosechaId: string; fechaClasificacion: string; cantidadRecibidaKg: number;
  kgFresco: number; kgIndustria: number; kgDescarte: number; motivosDescarte: string[];
  responsableId: string; timestampCapturaLocal?: string;
}
export interface RegistrarAcondicionamiento {
  operacionId: string; partidaProduccionId: string; fechaAcondicionamiento: string;
  tipoAcondicionamiento: string; tipoEnvase: string; cantidadKg: number; cantidadEnvases: number;
  responsableId: string; timestampCapturaLocal?: string;
}
export interface PartidaProduccion {
  id: string; clasificacionId: string; cosechaId: string; loteId: string; cicloId: string;
  categoria: 'FRESCO' | 'INDUSTRIA'; cantidadInicialKg: number; cantidadDisponibleKg: number;
  cantidadAcondicionadaKg: number; cantidadSinAcondicionarKg: number;
}
export interface ClasificacionProduccion extends Omit<RegistrarClasificacion, 'operacionId' | 'timestampCapturaLocal'> {
  id: string; registradoPor: string; creadoEn: string; timestampCapturaLocal: string; partidas: PartidaProduccion[];
}
export interface AcondicionamientoProduccion extends Omit<RegistrarAcondicionamiento, 'operacionId' | 'timestampCapturaLocal'> {
  id: string; registradoPor: string; creadoEn: string; timestampCapturaLocal: string;
}
export class PoscosechaInvalidaError extends DomainError { readonly code = 'POSCOSECHA_INVALIDA'; }
export class ConflictoPoscosechaError extends DomainError {
  readonly code = 'POSCOSECHA_CONFLICTO';
  constructor() { super('La clave de operación ya se utilizó con otros datos o actor.'); }
}
export function validarFechaPoscosecha(fecha: string, hoy = new Date()): void {
  if (!esFechaCosechaValida(fecha) || fecha > LocalizacionTucumanService.extraerFechaLocal(hoy)) {
    throw new PoscosechaInvalidaError('La operación requiere una fecha real válida y no futura.');
  }
}
export function validarClasificacion(datos: RegistrarClasificacion, hoy = new Date()): RegistrarClasificacion {
  validarFechaPoscosecha(datos.fechaClasificacion, hoy);
  const cantidades = [datos.cantidadRecibidaKg, datos.kgFresco, datos.kgIndustria, datos.kgDescarte];
  if (!cantidades.every(esEstimacionKgValida) || datos.cantidadRecibidaKg <= 0) {
    throw new PoscosechaInvalidaError('Los kg requieren hasta dos decimales dentro del rango NUMERIC(10,2), con recepción positiva.');
  }
  // Centésimas enteras: 0.10 + 0.20 conserva exactamente 0.30 sin tolerancias.
  const centesimas = cantidades.map(kg => BigInt(kg.toFixed(2).replace('.', '')));
  if (centesimas[0] !== centesimas[1] + centesimas[2] + centesimas[3]) {
    throw new PoscosechaInvalidaError('Los kg recibidos deben coincidir exactamente con fresco + industria + descarte (RN-20).');
  }
  const motivos = datos.motivosDescarte.map(motivo => motivo.trim());
  if (!datos.responsableId || motivos.some(motivo => !motivo) || (datos.kgDescarte > 0 && !motivos.length)) {
    throw new PoscosechaInvalidaError('La clasificación requiere responsable y causas de todo descarte.');
  }
  return { ...datos, motivosDescarte: motivos };
}
export function validarAcondicionamiento(datos: RegistrarAcondicionamiento, hoy = new Date()): RegistrarAcondicionamiento {
  validarFechaPoscosecha(datos.fechaAcondicionamiento, hoy);
  if (!esEstimacionKgValida(datos.cantidadKg) || datos.cantidadKg <= 0 ||
      !Number.isInteger(datos.cantidadEnvases) || datos.cantidadEnvases < 1 || datos.cantidadEnvases > 2147483647 ||
      !datos.tipoEnvase.trim() || !datos.tipoAcondicionamiento.trim() || !datos.responsableId) {
    throw new PoscosechaInvalidaError('El acondicionamiento requiere kg positivos exactos, tipo de preparación, envase, cantidad de envases y responsable.');
  }
  return { ...datos, tipoEnvase: datos.tipoEnvase.trim(), tipoAcondicionamiento: datos.tipoAcondicionamiento.trim() };
}
