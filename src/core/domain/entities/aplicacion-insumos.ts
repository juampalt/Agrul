import { DomainError } from '../errors/domain.error.js';
import { validarCantidadInventario } from './inventario-insumos.js';

export interface InsumoAplicado {
  insumoId: string; cantidad: number; unidadMedida: string; dosis: number;
}
export interface RegistrarAplicacionInsumos {
  operacionId: string; actividadRealizadaId: string; superficieTratada: number;
  metodoAplicacion: string; motivoAplicacion: string; observaciones: string | null; items: InsumoAplicado[];
}
export class AplicacionInsumosInvalidaError extends DomainError { readonly code = 'APLICACION_INSUMOS_INVALIDA'; }
export class AplicacionInsumosDuplicadaError extends DomainError {
  readonly code = 'APLICACION_INSUMOS_DUPLICADA';
  constructor() { super('La operación de aplicación ya existe con otros datos o responsable.'); }
}
export function validarMedidaAplicacion(valor: number) {
  validarCantidadInventario(valor);
  if (valor > 999999.99) throw new AplicacionInsumosInvalidaError('Superficie y dosis deben ser representables como NUMERIC(8,2).');
}
export function validarAplicacionInsumos(datos: RegistrarAplicacionInsumos) {
  validarMedidaAplicacion(datos.superficieTratada);
  if (!datos.metodoAplicacion.trim() || !datos.motivoAplicacion.trim() || !datos.items.length) {
    throw new AplicacionInsumosInvalidaError('Método, motivo e insumos son obligatorios.');
  }
  const ids = new Set<string>();
  for (const item of datos.items) {
    validarCantidadInventario(item.cantidad); validarMedidaAplicacion(item.dosis);
    if (!item.unidadMedida.trim() || ids.has(item.insumoId.toLowerCase())) {
      throw new AplicacionInsumosInvalidaError('Unidad obligatoria; cada insumo se declara una sola vez.');
    }
    ids.add(item.insumoId.toLowerCase());
  }
}
export interface PartidaParaConsumo {
  id: string; cantidadDisponible: string; fechaIngreso: string; fechaVencimiento: string | null;
}
function centesimas(valor: string): bigint {
  const [entero, fraccion = ''] = valor.split('.');
  return BigInt(entero) * 100n + BigInt(fraccion.padEnd(2, '0'));
}
function decimal(valor: bigint) { return `${valor / 100n}.${String(valor % 100n).padStart(2, '0')}`; }

/** Orden confirmado por el usuario el 2026-10-29; solo recibe partidas utilizables. */
export function planificarConsumo(partidas: readonly PartidaParaConsumo[], cantidad: number) {
  validarCantidadInventario(cantidad);
  let pendiente = centesimas(cantidad.toFixed(2));
  const ordenadas = [...partidas].sort((a, b) => {
    if (a.fechaVencimiento !== b.fechaVencimiento) {
      if (a.fechaVencimiento === null) return 1;
      if (b.fechaVencimiento === null) return -1;
      return a.fechaVencimiento < b.fechaVencimiento ? -1 : 1;
    }
    return a.fechaIngreso < b.fechaIngreso ? -1 : a.fechaIngreso > b.fechaIngreso ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  const consumos: { partidaId: string; cantidad: string }[] = [];
  for (const partida of ordenadas) {
    if (pendiente === 0n) break;
    const saldo = centesimas(partida.cantidadDisponible);
    const consumo = saldo < pendiente ? saldo : pendiente;
    if (consumo > 0n) { consumos.push({ partidaId: partida.id, cantidad: decimal(consumo) }); pendiente -= consumo; }
  }
  if (pendiente !== 0n) throw new AplicacionInsumosInvalidaError('Stock utilizable insuficiente para la aplicación.');
  return consumos;
}
