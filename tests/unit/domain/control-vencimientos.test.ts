import { describe, it, expect } from 'vitest';
import {
  InventarioFisico,
  InsumoVencidoError,
  InventarioFisicoInvalidoError,
  StockMovimiento,
} from '../../../src/core/domain/index.js';

describe('Domain: Control de Vencimientos, Inventario Físico y Pérdidas (AGRUL-045)', () => {
  describe('InsumoVencidoError (RF-M9-10)', () => {
    it('debe crear el error con el mensaje y código estandarizado INSUMO_VENCIDO', () => {
      const error = new InsumoVencidoError('ins-fito-01', 'LOT-FAB-2025', '2025-10-15');

      expect(error.code).toBe('INSUMO_VENCIDO');
      expect(error.insumoId).toBe('ins-fito-01');
      expect(error.loteFabricacion).toBe('LOT-FAB-2025');
      expect(error.fechaVencimiento).toBe('2025-10-15');
      expect(error.message).toContain('LOT-FAB-2025');
      expect(error.message).toContain('venció el');
      expect(error.message).toContain('RF-M9-10');
    });
  });

  describe('InventarioFisico Entity (RF-M9-11)', () => {
    it('debe instanciar correctamente un inventario físico con ajuste por diferencia positiva (SOBRANTE)', () => {
      const inventario = InventarioFisico.crear({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        loteFabricacion: 'LOT-A',
        cantidadSistema: 100,
        cantidadFisica: 115,
        unidadMedida: 'KG',
        motivo: 'Recuento trimestral con sobrante verificado',
        usuarioId: 'usr-encargado-1',
        claveIdempotencia: 'idem-inv-1',
        movimientoStockId: 'mov-ajuste-01',
      });

      expect(inventario.id).toBeDefined();
      expect(inventario.cantidadSistema).toBe(100);
      expect(inventario.cantidadFisica).toBe(115);
      expect(inventario.diferencia).toBe(15);
      expect(inventario.tipoAjuste()).toBe('SOBRANTE');
      expect(inventario.requirioAjuste()).toBe(true);
      expect(inventario.movimientoStockId).toBe('mov-ajuste-01');
      expect(inventario.toJSON().tipoAjuste).toBe('SOBRANTE');
    });

    it('debe detectar ajuste por diferencia negativa (FALTANTE)', () => {
      const inventario = InventarioFisico.crear({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        cantidadSistema: 80,
        cantidadFisica: 75,
        unidadMedida: 'L',
        motivo: 'Diferencia de inventario por evaporación menor',
        usuarioId: 'usr-admin',
        claveIdempotencia: 'idem-inv-2',
      });

      expect(inventario.diferencia).toBe(-5);
      expect(inventario.tipoAjuste()).toBe('FALTANTE');
      expect(inventario.requirioAjuste()).toBe(true);
    });

    it('debe identificar un conteo sin diferencias (SIN_DIFERENCIA)', () => {
      const inventario = InventarioFisico.crear({
        insumoId: 'ins-001',
        depositoId: 'dep-001',
        cantidadSistema: 50,
        cantidadFisica: 50,
        unidadMedida: 'L',
        motivo: 'Inventario físico coincide al 100%',
        usuarioId: 'usr-admin',
        claveIdempotencia: 'idem-inv-3',
      });

      expect(inventario.diferencia).toBe(0);
      expect(inventario.tipoAjuste()).toBe('SIN_DIFERENCIA');
      expect(inventario.requirioAjuste()).toBe(false);
    });

    it('debe rechazar inventario físico con datos inválidos o incompletos', () => {
      expect(() =>
        InventarioFisico.crear({
          insumoId: '',
          depositoId: 'dep-001',
          cantidadSistema: 10,
          cantidadFisica: 10,
          unidadMedida: 'KG',
          motivo: 'Falla',
          usuarioId: 'usr-1',
          claveIdempotencia: 'k-1',
        })
      ).toThrow(InventarioFisicoInvalidoError);

      expect(() =>
        InventarioFisico.crear({
          insumoId: 'ins-1',
          depositoId: 'dep-001',
          cantidadSistema: 10,
          cantidadFisica: -5, // Cantidad negativa no permitida
          unidadMedida: 'KG',
          motivo: 'Falla',
          usuarioId: 'usr-1',
          claveIdempotencia: 'k-1',
        })
      ).toThrow(InventarioFisicoInvalidoError);

      expect(() =>
        InventarioFisico.crear({
          insumoId: 'ins-1',
          depositoId: 'dep-001',
          cantidadSistema: 10,
          cantidadFisica: 10,
          unidadMedida: 'KG',
          motivo: '', // Motivo vacío
          usuarioId: 'usr-1',
          claveIdempotencia: 'k-1',
        })
      ).toThrow(InventarioFisicoInvalidoError);
    });
  });

  describe('StockMovimiento con fechaVencimiento', () => {
    it('debe almacenar opcionalmente la fechaVencimiento en el movimiento', () => {
      const mov = StockMovimiento.crear({
        insumoId: 'ins-01',
        depositoId: 'dep-01',
        loteFabricacion: 'LOT-VENC-2027',
        fechaVencimiento: '2027-12-31',
        tipoMovimiento: 'INGRESO_COMPRA',
        cantidad: 50,
        unidadMedida: 'L',
        usuarioId: 'usr-1',
        claveIdempotencia: 'k-mov-venc',
      });

      expect(mov.fechaVencimiento).toBe('2027-12-31');
      expect(mov.toJSON().fechaVencimiento).toBe('2027-12-31');
    });
  });
});
