import { esEstimacionKgValida } from './cosecha-programada.entity.js';
import { PoscosechaInvalidaError, validarFechaPoscosecha } from './poscosecha.js';

export interface RegistrarCamara {
  operacionId: string; fincaId: string; nombre: string; descripcion: string | null; temperaturaObjetivoC: number | null;
}
export interface CamaraProduccion extends Omit<RegistrarCamara, 'operacionId'> { id: string; creadoPor: string; creadoEn: string }
export interface RegistrarMovimientoAlmacenamiento {
  operacionId: string; partidaProduccionId: string; camaraSectorId: string; tipoMovimiento: 'INGRESO' | 'SALIDA';
  cantidadKg: number; fechaMovimiento: string; responsableId: string; timestampCapturaLocal?: string;
}
export interface MovimientoAlmacenamiento extends Omit<RegistrarMovimientoAlmacenamiento, 'operacionId' | 'timestampCapturaLocal'> {
  id: string; registradoPor: string; creadoEn: string; timestampCapturaLocal: string;
}
export interface RegistrarDestinoProduccion {
  operacionId: string; partidaProduccionId: string; fechaDestino: string; tipoDestino: 'MERCADO_FRESCO' | 'INDUSTRIA' | 'OTRO';
  destinoEspecifico?: string; cantidadDestinadaKg: number; responsableId: string; timestampCapturaLocal?: string;
}
export interface DestinoProduccion extends Omit<RegistrarDestinoProduccion, 'operacionId' | 'timestampCapturaLocal'> {
  id: string; registradoPor: string; creadoEn: string; timestampCapturaLocal: string;
}
export interface SaldoCamaraProduccion {
  camaraSectorId: string; partidaProduccionId: string; clasificacionId: string; cosechaId: string; loteId: string;
  cantidadKg: number;
}
export function esTemperaturaObjetivoValida(valor: number): boolean {
  return Number.isFinite(valor) && Math.abs(valor) <= 999.99 && /^-?\d+(?:\.\d{1,2})?$/.test(String(valor));
}
export function validarCamara(datos: RegistrarCamara): RegistrarCamara {
  if (!datos.fincaId || !datos.nombre.trim() || datos.nombre.trim().length > 40 ||
      (datos.temperaturaObjetivoC !== null && !esTemperaturaObjetivoValida(datos.temperaturaObjetivoC))) {
    throw new PoscosechaInvalidaError('La cámara requiere finca, nombre de hasta 40 caracteres y temperatura representable con dos decimales si se informa.');
  }
  return { ...datos, nombre: datos.nombre.trim(), descripcion: datos.descripcion?.trim() ?? null };
}
export function validarMovimientoAlmacenamiento(datos: RegistrarMovimientoAlmacenamiento, hoy = new Date()): RegistrarMovimientoAlmacenamiento {
  validarFechaPoscosecha(datos.fechaMovimiento, hoy);
  if (!datos.partidaProduccionId || !datos.camaraSectorId || !datos.responsableId ||
      !['INGRESO', 'SALIDA'].includes(datos.tipoMovimiento)) throw new PoscosechaInvalidaError('Movimiento de cámara inválido.');
  validarKgPositivos(datos.cantidadKg);
  return { ...datos };
}
export const DESTINO_NO_REGISTRADO = 'No registrado';
export function validarDestinoProduccion(datos: RegistrarDestinoProduccion, hoy = new Date()): RegistrarDestinoProduccion & { destinoEspecifico: string } {
  validarFechaPoscosecha(datos.fechaDestino, hoy);
  if (!datos.partidaProduccionId || !datos.responsableId ||
      !['MERCADO_FRESCO', 'INDUSTRIA', 'OTRO'].includes(datos.tipoDestino)) throw new PoscosechaInvalidaError('El destino requiere partida, tipo de destino y responsable.');
  const especifico = datos.destinoEspecifico?.trim() ?? '';
  // CU53: el destino específico es opcional salvo para «Otro», que debe describir su finalidad.
  if (!especifico && datos.tipoDestino === 'OTRO') throw new PoscosechaInvalidaError('El destino «Otro» requiere describir su finalidad.');
  validarKgPositivos(datos.cantidadDestinadaKg);
  return { ...datos, destinoEspecifico: especifico || DESTINO_NO_REGISTRADO };
}
function validarKgPositivos(valor: number): void {
  if (!esEstimacionKgValida(valor) || valor <= 0) throw new PoscosechaInvalidaError('Los kg deben ser positivos, con hasta dos decimales y máximo 99999999.99.');
}
