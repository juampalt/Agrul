import { describe, expect, it } from 'vitest';
import { InventarioInvalidoError, MovimientoManual, validarCantidadInventario, validarMovimientoInventario } from '../../../src/core/domain/entities/inventario-insumos.js';

describe('AGRUL-055: cantidades y movimientos de inventario', () => {
  it.each([0, -1, NaN, Infinity, 0.001, 1e-10, 100000000])('rechaza cantidad %s', valor => {
    expect(() => validarCantidadInventario(valor)).toThrow(InventarioInvalidoError);
  });
  it.each([0.01, 0.29, 1, 99999999.99])('acepta cantidad exacta %s', valor => {
    expect(() => validarCantidadInventario(valor)).not.toThrow();
  });
  const datos: MovimientoManual = { operacionId: 'operacion', partidaId: 'partida', cantidad: 1, unidadMedida: 'kg',
    fechaMovimiento: '2026-10-29', tipoMovimiento: 'DEVOLUCION', motivo: 'Sobrante sin usar' };
  it('admite la devolución de insumos sin usar definida por el usuario', () => {
    expect(() => validarMovimientoInventario(datos)).not.toThrow();
  });
  it.each([{ fechaMovimiento: '2026-02-30' }, { motivo: ' ' }, { unidadMedida: '' }])('rechaza datos inválidos %o', cambios => {
    expect(() => validarMovimientoInventario({ ...datos, ...cambios })).toThrow(InventarioInvalidoError);
  });
});
