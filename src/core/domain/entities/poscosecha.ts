import { DomainError } from '../errors/domain.error.js';
import { LocalizacionTucumanService } from '../services/localizacion-tucuman.service.js';
import { esEstimacionKgValida, esFechaCosechaValida } from './cosecha-programada.entity.js';

export interface RegistrarClasificacion {
  operacionId: string; cosechaId: string; fechaClasificacion: string; cantidadRecibidaKg: number;
  kgFresco: number; kgIndustria: number; kgDescarte: number;
  /** Causas del descarte; si no se informan kg por causa, solo se admite una causa (recibe todo el descarte). */
  motivosDescarte: string[];
  /** CU47: kg descartados por causa; su suma debe coincidir con `kgDescarte`. */
  descartePorCausa?: { causa: string; kg: number }[] | null;
  observaciones?: string | null;
  responsableId: string; timestampCapturaLocal?: string;
}
export interface RegistrarAcondicionamiento {
  operacionId: string; partidaProduccionId: string; fechaAcondicionamiento: string;
  tipoAcondicionamiento: string; tipoEnvase?: string; cantidadKg: number; cantidadEnvases?: number | null;
  observaciones?: string | null;
  responsableId: string; timestampCapturaLocal?: string;
}
export interface PartidaProduccion {
  id: string; clasificacionId: string; cosechaId: string; loteId: string; cicloId: string;
  categoria: 'FRESCO' | 'INDUSTRIA'; cantidadInicialKg: number; cantidadDisponibleKg: number;
  cantidadAcondicionadaKg: number; cantidadSinAcondicionarKg: number;
  cantidadEnCamaraKg: number; cantidadDestinadaKg: number; cantidadFisicaKg: number; cantidadAcondicionableKg: number;
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
  const porCausa = datos.descartePorCausa?.map(item => ({ causa: item.causa.trim(), kg: item.kg })) ?? null;
  const motivos = porCausa ? porCausa.map(item => item.causa) : datos.motivosDescarte.map(motivo => motivo.trim());
  if (!datos.responsableId || motivos.some(motivo => !motivo) || (datos.kgDescarte > 0 && !motivos.length)) {
    throw new PoscosechaInvalidaError('La clasificación requiere responsable y causas de todo descarte.');
  }
  if (datos.kgDescarte === 0 && motivos.length) throw new PoscosechaInvalidaError('No se informan causas cuando no hay descarte.');
  if (new Set(motivos.map(motivo => motivo.toLowerCase())).size !== motivos.length) {
    throw new PoscosechaInvalidaError('Las causas de descarte no pueden repetirse.');
  }
  let detalle: { causa: string; kg: number }[] | null = null;
  if (datos.kgDescarte > 0) {
    if (porCausa) {
      if (!porCausa.every(item => esEstimacionKgValida(item.kg) && item.kg > 0)) {
        throw new PoscosechaInvalidaError('Los kg de cada causa de descarte deben ser positivos, con hasta dos decimales.');
      }
      const suma = porCausa.reduce((total, item) => total + BigInt(item.kg.toFixed(2).replace('.', '')), 0n);
      if (suma !== centesimas[3]) throw new PoscosechaInvalidaError('Los kg por causa deben coincidir exactamente con el total descartado.');
      detalle = porCausa;
    } else if (motivos.length === 1) {
      detalle = [{ causa: motivos[0], kg: datos.kgDescarte }];
    } else {
      throw new PoscosechaInvalidaError('Con más de una causa de descarte hay que informar los kg de cada una.');
    }
  }
  return { ...datos, motivosDescarte: motivos, descartePorCausa: detalle, observaciones: datos.observaciones?.trim() || null };
}
export const ENVASE_SIN_ESPECIFICAR = 'Sin especificar';
export function validarAcondicionamiento(datos: RegistrarAcondicionamiento, hoy = new Date()): RegistrarAcondicionamiento & { tipoEnvase: string } {
  validarFechaPoscosecha(datos.fechaAcondicionamiento, hoy);
  if (!esEstimacionKgValida(datos.cantidadKg) || datos.cantidadKg <= 0 ||
      (datos.cantidadEnvases != null && (!Number.isInteger(datos.cantidadEnvases) || datos.cantidadEnvases < 1 || datos.cantidadEnvases > 2147483647)) ||
      !datos.tipoAcondicionamiento.trim() || !datos.responsableId) {
    throw new PoscosechaInvalidaError('El acondicionamiento requiere kg positivos exactos, tipo de preparación y responsable; los envases, si se informan, deben ser enteros positivos.');
  }
  // CU49: envase y cantidad de envases son opcionales; sin dato queda constancia explícita.
  return { ...datos, tipoEnvase: datos.tipoEnvase?.trim() || ENVASE_SIN_ESPECIFICAR, cantidadEnvases: datos.cantidadEnvases ?? null,
    tipoAcondicionamiento: datos.tipoAcondicionamiento.trim(), observaciones: datos.observaciones?.trim() || null };
}
