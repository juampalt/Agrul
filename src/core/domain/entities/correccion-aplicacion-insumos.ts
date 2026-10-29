import { AplicacionInsumosInvalidaError, RegistrarAplicacionInsumos, validarAplicacionInsumos } from './aplicacion-insumos.js';
import { DomainError } from '../errors/domain.error.js';

export interface CorregirAplicacionInsumos {
  operacionId: string;
  motivoCorreccion: string;
  nuevaAplicacion: Omit<RegistrarAplicacionInsumos, 'operacionId'>;
}
export class ConflictoCorreccionAplicacionError extends DomainError {
  readonly code = 'CONFLICTO_CORRECCION_APLICACION';
  constructor() { super('La versión ya fue sustituida o la operación existe con otros datos.'); }
}
export class ConciliacionInventarioRequeridaError extends DomainError {
  readonly code = 'CONCILIACION_INVENTARIO_REQUERIDA';
  constructor() { super('No puede garantizarse la compensación: se requiere una conciliación explícita del inventario.'); }
}
export function validarCorreccionAplicacion(datos: CorregirAplicacionInsumos) {
  if (!datos.motivoCorreccion.trim() || datos.motivoCorreccion.length > 2000) throw new AplicacionInsumosInvalidaError('El motivo de corrección es obligatorio y admite hasta 2000 caracteres.');
  validarAplicacionInsumos({ ...datos.nuevaAplicacion, operacionId: datos.operacionId });
}
