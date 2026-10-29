import { DomainError } from '../errors/domain.error.js';
import { validarNivelMinimo } from './insumo.entity.js';
import { esFechaProgramadaValida } from './actividad-programada.entity.js';

export const TIPOS_MOVIMIENTO_MANUAL = ['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'PERDIDA', 'DEVOLUCION'] as const;
export type TipoMovimientoManual = typeof TIPOS_MOVIMIENTO_MANUAL[number];
export type TipoMovimientoInventario = TipoMovimientoManual | 'INGRESO' | 'EXISTENCIA_INICIAL' | 'DEVOLUCION' | 'EGRESO_APLICACION' | 'REGULARIZACION_CORRECCION';
export interface IngresoInsumos {
  operacionId: string; fincaId: string; insumoId: string; cantidad: number; unidadMedida: string;
  fechaIngreso: string; proveedor: string; fechaVencimiento: string | null;
  tipoMovimiento: 'INGRESO' | 'EXISTENCIA_INICIAL'; motivo: string;
}
export interface MovimientoManual {
  operacionId: string; partidaId: string; cantidad: number; unidadMedida: string;
  tipoMovimiento: TipoMovimientoManual; fechaMovimiento: string; motivo: string;
}
export interface ActorInventario { usuarioId: string; fincaIds?: readonly string[] }
export interface MovimientoInventario {
  id: string; partidaId: string | null; fincaId: string; insumoId: string; cantidad: string;
  unidadMedida: string; tipoMovimiento: TipoMovimientoInventario; fechaMovimiento: string;
  motivo: string; responsableId: string;
}
export class InventarioInvalidoError extends DomainError { readonly code = 'INVENTARIO_INVALIDO'; }
export class OperacionInventarioDuplicadaError extends DomainError {
  readonly code = 'OPERACION_INVENTARIO_DUPLICADA';
  constructor() { super('La operación ya se registró con otros datos o responsable.'); }
}
export function validarCantidadInventario(valor: number): void {
  try { validarNivelMinimo(valor); } catch { throw new InventarioInvalidoError('Cantidad no representable como NUMERIC(10,2).'); }
  if (valor <= 0) throw new InventarioInvalidoError('La cantidad debe ser positiva.');
}
export function validarMovimientoInventario(datos: MovimientoManual | IngresoInsumos): void {
  validarCantidadInventario(datos.cantidad);
  const fecha = 'fechaIngreso' in datos ? datos.fechaIngreso : datos.fechaMovimiento;
  if (!esFechaProgramadaValida(fecha)) throw new InventarioInvalidoError('Fecha inexistente.');
  if (!datos.motivo.trim() || !datos.unidadMedida.trim()) throw new InventarioInvalidoError('Motivo y unidad obligatorios.');
  if ('fechaIngreso' in datos) {
    if (!['INGRESO', 'EXISTENCIA_INICIAL'].includes(datos.tipoMovimiento) || !datos.proveedor.trim()) throw new InventarioInvalidoError('Ingreso inválido.');
    if (datos.fechaVencimiento !== null && !esFechaProgramadaValida(datos.fechaVencimiento)) throw new InventarioInvalidoError('Vencimiento inexistente.');
  } else if (!TIPOS_MOVIMIENTO_MANUAL.includes(datos.tipoMovimiento)) throw new InventarioInvalidoError('Tipo de movimiento manual inválido.');
}
