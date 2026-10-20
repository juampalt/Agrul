import { describe, it, expect } from 'vitest';
import {
  StockMovimiento,
  MovimientoStockInvalidoError,
  StockInsuficienteSinJustificacionError,
} from '../../../src/core/domain/index.js';

describe('Domain Entity: StockMovimiento (AGRUL-043 / RN-10, RN-11, RF-M9-04, RF-M9-15)', () => {
  const validProps = {
    insumoId: 'ins-001',
    depositoId: 'dep-001',
    loteFabricacion: 'LOT-FAB-2026',
    tipoMovimiento: 'INGRESO_COMPRA' as const,
    cantidad: 50,
    unidadMedida: 'l',
    usuarioId: 'usr-001',
    claveIdempotencia: 'idem-key-12345',
  };

  it('debe instanciar correctamente un movimiento de stock válido', () => {
    const mov = StockMovimiento.crear(validProps);

    expect(mov.id).toBeDefined();
    expect(mov.insumoId).toBe('ins-001');
    expect(mov.depositoId).toBe('dep-001');
    expect(mov.loteFabricacion).toBe('LOT-FAB-2026');
    expect(mov.tipoMovimiento).toBe('INGRESO_COMPRA');
    expect(mov.cantidad).toBe(50);
    expect(mov.unidadMedida).toBe('L');
    expect(mov.usuarioId).toBe('usr-001');
    expect(mov.claveIdempotencia).toBe('idem-key-12345');
    expect(mov.esSaldoNegativo).toBe(false);
    expect(mov.motivoJustificacion).toBeNull();
    expect(mov.esEnvaseAbierto).toBe(false);
  });

  it('debe rechazar un movimiento sin insumoId o sin depositoId', () => {
    expect(() =>
      StockMovimiento.crear({
        ...validProps,
        insumoId: '',
      })
    ).toThrow(MovimientoStockInvalidoError);

    expect(() =>
      StockMovimiento.crear({
        ...validProps,
        depositoId: '   ',
      })
    ).toThrow(MovimientoStockInvalidoError);
  });

  it('debe rechazar un movimiento sin clave de idempotencia (RN-11 / RF-M9-06)', () => {
    expect(() =>
      StockMovimiento.crear({
        ...validProps,
        claveIdempotencia: '',
      })
    ).toThrow(MovimientoStockInvalidoError);
  });

  it('debe rechazar cantidad menor o igual a cero (RN-10)', () => {
    expect(() =>
      StockMovimiento.crear({
        ...validProps,
        cantidad: 0,
      })
    ).toThrow(MovimientoStockInvalidoError);

    expect(() =>
      StockMovimiento.crear({
        ...validProps,
        cantidad: -10,
      })
    ).toThrow(MovimientoStockInvalidoError);
  });

  it('debe exigir justificación explícita si el movimiento genera saldo negativo (RF-M9-15)', () => {
    expect(() =>
      StockMovimiento.crear({
        ...validProps,
        tipoMovimiento: 'SALIDA_CONSUMO',
        esSaldoNegativo: true,
        motivoJustificacion: undefined,
      })
    ).toThrow(StockInsuficienteSinJustificacionError);

    expect(() =>
      StockMovimiento.crear({
        ...validProps,
        tipoMovimiento: 'SALIDA_CONSUMO',
        esSaldoNegativo: true,
        motivoJustificacion: '   ',
      })
    ).toThrow(StockInsuficienteSinJustificacionError);

    const movJustificado = StockMovimiento.crear({
      ...validProps,
      tipoMovimiento: 'SALIDA_CONSUMO',
      esSaldoNegativo: true,
      motivoJustificacion: 'Aplicación urgente por plaga, remito pendiente de ingreso administrativo',
    });

    expect(movJustificado.esSaldoNegativo).toBe(true);
    expect(movJustificado.motivoJustificacion).toContain('Aplicación urgente por plaga');
  });

  it('debe identificar correctamente tipos de ingreso y egreso', () => {
    expect(StockMovimiento.esTipoIngreso('SALDO_INICIAL')).toBe(true);
    expect(StockMovimiento.esTipoIngreso('INGRESO_COMPRA')).toBe(true);
    expect(StockMovimiento.esTipoIngreso('DEVOLUCION')).toBe(true);
    expect(StockMovimiento.esTipoIngreso('SALIDA_CONSUMO')).toBe(false);

    expect(StockMovimiento.esTipoEgreso('SALIDA_CONSUMO')).toBe(true);
    expect(StockMovimiento.esTipoEgreso('PERDIDA')).toBe(true);
    expect(StockMovimiento.esTipoEgreso('INGRESO_COMPRA')).toBe(false);
  });

  it('debe permitir marcar envase abierto en unidad de consumo (RF-M9-13)', () => {
    const mov = StockMovimiento.crear({
      ...validProps,
      tipoMovimiento: 'SALIDA_CONSUMO',
      cantidad: 2.5,
      unidadMedida: 'L',
      esEnvaseAbierto: true,
    });

    expect(mov.esEnvaseAbierto).toBe(true);
    expect(mov.cantidad).toBe(2.5);
  });
});
