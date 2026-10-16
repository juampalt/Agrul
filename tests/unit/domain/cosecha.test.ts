import { describe, it, expect } from 'vitest';
import { Cosecha } from '../../../src/core/domain/entities/cosecha.entity.js';
import { CodigoTrazabilidadCosecha, FormatoCodigoTrazabilidadInvalidoError } from '../../../src/core/domain/value-objects/codigo-trazabilidad-cosecha.vo.js';
import {
  CosechaInvalidaError,
  DesgloseCosechaInvalidoError,
  FechaFuturaInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Entidad de Dominio: Cosecha & CodigoTrazabilidadCosecha (AGRUL-028 / AGRUL-030 / Módulo 5)', () => {
  const hoyRef = new Date('2026-10-15T12:00:00Z');

  describe('Value Object CodigoTrazabilidadCosecha (RN-07 / RN-08)', () => {
    it('debe generar un código algorítmico válido con formato COS-L[nro]-[YYYYMMDD]-[secuencia]', () => {
      const codigo1 = CodigoTrazabilidadCosecha.generar('LOT-2026-003', '2026-09-15', 1);
      expect(codigo1.value).toBe('COS-L03-20260915-01');

      const codigo2 = CodigoTrazabilidadCosecha.generar('LOT-2026-99027', '2026-10-15', 2);
      expect(codigo2.value).toBe('COS-L99027-20261015-02');

      const codigo3 = CodigoTrazabilidadCosecha.generar('L04', '2026-08-01', 5);
      expect(codigo3.value).toBe('COS-L04-20260801-05');
    });

    it('debe validar y normalizar códigos conformes al formato requerido', () => {
      const cod = CodigoTrazabilidadCosecha.crear('cos-l03-20260915-01');
      expect(cod.value).toBe('COS-L03-20260915-01');
    });

    it('debe rechazar formatos inválidos arrojando FormatoCodigoTrazabilidadInvalidoError', () => {
      expect(() => CodigoTrazabilidadCosecha.crear('COS-INVALIDO')).toThrow(
        FormatoCodigoTrazabilidadInvalidoError
      );
      expect(() => CodigoTrazabilidadCosecha.crear('LOT-2026-001')).toThrow(
        FormatoCodigoTrazabilidadInvalidoError
      );
    });
  });

  describe('Invariantes de Cosecha (RN-09, RF-M5-01, RF-M5-02)', () => {
    it('debe registrar una cosecha válida cuando se cumple la invariante RN-09', () => {
      const cosecha = Cosecha.crear({
        id: crypto.randomUUID(),
        codigoTrazabilidad: 'COS-L03-20260915-01',
        loteId: crypto.randomUUID(),
        cicloId: crypto.randomUUID(),
        fecha: '2026-09-15',
        cantidadCosechadaKg: 1000,
        cantidadComercializableKg: 850,
        cantidadDescarteKg: 150,
        motivoDescarte: 'CALIBRE_CHICO_Y_DANIO_MECANICO',
        observacionesCalidad: 'Fruta firme, 14.5 Brix promedio',
        recipientes: [
          { tipo: 'BIN', cantidad: 3 },
          { tipo: 'CAJON', cantidad: 10 },
        ],
        superficieCosechadaHa: 1.5,
        fechaReferenciaHoy: hoyRef,
      });

      expect(cosecha.cantidadCosechadaKg).toBe(1000);
      expect(cosecha.cantidadComercializableKg).toBe(850);
      expect(cosecha.cantidadDescarteKg).toBe(150);
      expect(cosecha.porcentajeComercializable).toBe(85);
      expect(cosecha.porcentajeDescarte).toBe(15);
      expect(cosecha.motivoDescarte).toBe('CALIBRE_CHICO_Y_DANIO_MECANICO');
      expect(cosecha.codigoTrazabilidad.value).toBe('COS-L03-20260915-01');
      expect(cosecha.estado).toBe('ACTIVA');
      expect(cosecha.estaActiva()).toBe(true);
      expect(cosecha.estaAnulada()).toBe(false);
    });

    it('debe fallar con DesgloseCosechaInvalidoError si comercializable + descarte !== total (RN-09)', () => {
      expect(() =>
        Cosecha.crear({
          id: crypto.randomUUID(),
          codigoTrazabilidad: 'COS-L03-20260915-01',
          loteId: crypto.randomUUID(),
          cicloId: crypto.randomUUID(),
          fecha: '2026-09-15',
          cantidadCosechadaKg: 1000,
          cantidadComercializableKg: 800,
          cantidadDescarteKg: 150, // 800 + 150 = 950 != 1000
          motivoDescarte: 'MANCHAS',
          fechaReferenciaHoy: hoyRef,
        })
      ).toThrow(DesgloseCosechaInvalidoError);
    });

    it('debe exigir motivo de descarte si cantidadDescarteKg > 0 (RF-M5-02)', () => {
      expect(() =>
        Cosecha.crear({
          id: crypto.randomUUID(),
          codigoTrazabilidad: 'COS-L03-20260915-01',
          loteId: crypto.randomUUID(),
          cicloId: crypto.randomUUID(),
          fecha: '2026-09-15',
          cantidadCosechadaKg: 1000,
          cantidadComercializableKg: 900,
          cantidadDescarteKg: 100,
          motivoDescarte: undefined, // Falta justificación
          fechaReferenciaHoy: hoyRef,
        })
      ).toThrow(CosechaInvalidaError);
    });

    it('debe permitir cosecha con 0 kg de descarte sin exigir motivo', () => {
      const cosecha = Cosecha.crear({
        id: crypto.randomUUID(),
        codigoTrazabilidad: 'COS-L03-20260915-01',
        loteId: crypto.randomUUID(),
        cicloId: crypto.randomUUID(),
        fecha: '2026-09-15',
        cantidadCosechadaKg: 500,
        cantidadComercializableKg: 500,
        cantidadDescarteKg: 0,
        fechaReferenciaHoy: hoyRef,
      });

      expect(cosecha.cantidadComercializableKg).toBe(500);
      expect(cosecha.cantidadDescarteKg).toBe(0);
      expect(cosecha.motivoDescarte).toBeNull();
      expect(cosecha.porcentajeComercializable).toBe(100);
      expect(cosecha.porcentajeDescarte).toBe(0);
    });

    it('debe rechazar cantidades negativas o cantidad cosechada cero', () => {
      expect(() =>
        Cosecha.crear({
          id: crypto.randomUUID(),
          codigoTrazabilidad: 'COS-L03-20260915-01',
          loteId: crypto.randomUUID(),
          cicloId: crypto.randomUUID(),
          fecha: '2026-09-15',
          cantidadCosechadaKg: 0,
          cantidadComercializableKg: 0,
          cantidadDescarteKg: 0,
          fechaReferenciaHoy: hoyRef,
        })
      ).toThrow(CosechaInvalidaError);
    });

    it('debe rechazar fechas futuras para la cosecha (RN-04)', () => {
      expect(() =>
        Cosecha.crear({
          id: crypto.randomUUID(),
          codigoTrazabilidad: 'COS-L03-20261120-01',
          loteId: crypto.randomUUID(),
          cicloId: crypto.randomUUID(),
          fecha: '2026-11-20', // posterior a hoyRef (2026-10-15)
          cantidadCosechadaKg: 500,
          cantidadComercializableKg: 500,
          cantidadDescarteKg: 0,
          fechaReferenciaHoy: hoyRef,
        })
      ).toThrow(FechaFuturaInvalidaError);
    });

    it('debe reconstituir correctamente una entidad Cosecha desde toJSON()', () => {
      const original = Cosecha.crear({
        id: crypto.randomUUID(),
        codigoTrazabilidad: 'COS-L03-20260915-01',
        loteId: crypto.randomUUID(),
        cicloId: crypto.randomUUID(),
        fecha: '2026-09-15',
        cantidadCosechadaKg: 1200,
        cantidadComercializableKg: 1100,
        cantidadDescarteKg: 100,
        motivoDescarte: 'GOLPES',
        superficieCosechadaHa: 2.0,
        fechaReferenciaHoy: hoyRef,
      });

      const json = original.toJSON();
      const reconstituida = Cosecha.reconstituir(json);

      expect(reconstituida.id).toBe(original.id);
      expect(reconstituida.codigoTrazabilidad.value).toBe(original.codigoTrazabilidad.value);
      expect(reconstituida.cantidadCosechadaKg).toBe(1200);
      expect(reconstituida.cantidadComercializableKg).toBe(1100);
      expect(reconstituida.cantidadDescarteKg).toBe(100);
      expect(reconstituida.superficieCosechadaHa).toBe(2.0);
      expect(reconstituida.estado).toBe('ACTIVA');
    });
  });

  describe('Anulación Lógica Auditada (RF-M5-12 / RN-05 / RN-06)', () => {
    const usuarioId = crypto.randomUUID();

    it('debe anular lógicamente una cosecha registrando usuario, motivo y fecha sin borrado físico', () => {
      const cosecha = Cosecha.crear({
        id: crypto.randomUUID(),
        codigoTrazabilidad: 'COS-L03-20260915-01',
        loteId: crypto.randomUUID(),
        cicloId: crypto.randomUUID(),
        fecha: '2026-09-15',
        cantidadCosechadaKg: 1000,
        cantidadComercializableKg: 1000,
        cantidadDescarteKg: 0,
        fechaReferenciaHoy: hoyRef,
      });

      expect(cosecha.estaActiva()).toBe(true);

      cosecha.anular(usuarioId, 'Error en báscula de pesaje inicial', '2026-10-15T15:00:00Z');

      expect(cosecha.estado).toBe('ANULADA');
      expect(cosecha.estaActiva()).toBe(false);
      expect(cosecha.estaAnulada()).toBe(true);
      expect(cosecha.motivoAnulacion).toBe('Error en báscula de pesaje inicial');
      expect(cosecha.usuarioAnulacionId).toBe(usuarioId);
      expect(cosecha.anuladoEn).toBe('2026-10-15T15:00:00Z');
    });

    it('debe rechazar re-anular una cosecha ya anulada', () => {
      const cosecha = Cosecha.crear({
        id: crypto.randomUUID(),
        codigoTrazabilidad: 'COS-L03-20260915-01',
        loteId: crypto.randomUUID(),
        cicloId: crypto.randomUUID(),
        fecha: '2026-09-15',
        cantidadCosechadaKg: 500,
        cantidadComercializableKg: 500,
        cantidadDescarteKg: 0,
        fechaReferenciaHoy: hoyRef,
      });

      cosecha.anular(usuarioId, 'Primera anulación');

      expect(() => cosecha.anular(usuarioId, 'Segunda anulación')).toThrow(CosechaInvalidaError);
    });

    it('debe exigir motivo y usuarioId obligatorios para anular', () => {
      const cosecha = Cosecha.crear({
        id: crypto.randomUUID(),
        codigoTrazabilidad: 'COS-L03-20260915-01',
        loteId: crypto.randomUUID(),
        cicloId: crypto.randomUUID(),
        fecha: '2026-09-15',
        cantidadCosechadaKg: 500,
        cantidadComercializableKg: 500,
        cantidadDescarteKg: 0,
        fechaReferenciaHoy: hoyRef,
      });

      expect(() => cosecha.anular(usuarioId, '')).toThrow(CosechaInvalidaError);
      expect(() => cosecha.anular('', 'Motivo válido')).toThrow(CosechaInvalidaError);
    });
  });

  describe('Modificación Auditada (RF-M5-12 / RN-05 / RN-06)', () => {
    const usuarioId = crypto.randomUUID();

    it('debe modificar campos y registrar el historial de cambios con valores anteriores y nuevos', () => {
      const cosecha = Cosecha.crear({
        id: crypto.randomUUID(),
        codigoTrazabilidad: 'COS-L03-20260915-01',
        loteId: crypto.randomUUID(),
        cicloId: crypto.randomUUID(),
        fecha: '2026-09-15',
        cantidadCosechadaKg: 1000,
        cantidadComercializableKg: 850,
        cantidadDescarteKg: 150,
        motivoDescarte: 'CALIBRE',
        fechaReferenciaHoy: hoyRef,
      });

      cosecha.modificar(usuarioId, 'Ajuste tras reclasificación secundaria de calidad', {
        cantidadCosechadaKg: 1000,
        cantidadComercializableKg: 900,
        cantidadDescarteKg: 100,
        motivoDescarte: 'CALIBRE_REVISADO',
      });

      expect(cosecha.cantidadComercializableKg).toBe(900);
      expect(cosecha.cantidadDescarteKg).toBe(100);
      expect(cosecha.motivoDescarte).toBe('CALIBRE_REVISADO');
      expect(cosecha.historialModificaciones).toHaveLength(1);

      const historial = cosecha.historialModificaciones[0];
      expect(historial.usuarioId).toBe(usuarioId);
      expect(historial.motivo).toBe('Ajuste tras reclasificación secundaria de calidad');
      expect(historial.cambios).toEqual(
        expect.arrayContaining([
          { campo: 'cantidadComercializableKg', valorAnterior: 850, valorNuevo: 900 },
          { campo: 'cantidadDescarteKg', valorAnterior: 150, valorNuevo: 100 },
          { campo: 'motivoDescarte', valorAnterior: 'CALIBRE', valorNuevo: 'CALIBRE_REVISADO' },
        ])
      );
    });

    it('debe rechazar modificar una cosecha anulada', () => {
      const cosecha = Cosecha.crear({
        id: crypto.randomUUID(),
        codigoTrazabilidad: 'COS-L03-20260915-01',
        loteId: crypto.randomUUID(),
        cicloId: crypto.randomUUID(),
        fecha: '2026-09-15',
        cantidadCosechadaKg: 500,
        cantidadComercializableKg: 500,
        cantidadDescarteKg: 0,
        fechaReferenciaHoy: hoyRef,
      });

      cosecha.anular(usuarioId, 'Cosecha incorrecta');

      expect(() =>
        cosecha.modificar(usuarioId, 'Intento de modificar anulada', {
          cantidadCosechadaKg: 600,
          cantidadComercializableKg: 600,
        })
      ).toThrow(CosechaInvalidaError);
    });

    it('debe validar la invariante de desglose RN-09 en las modificaciones', () => {
      const cosecha = Cosecha.crear({
        id: crypto.randomUUID(),
        codigoTrazabilidad: 'COS-L03-20260915-01',
        loteId: crypto.randomUUID(),
        cicloId: crypto.randomUUID(),
        fecha: '2026-09-15',
        cantidadCosechadaKg: 1000,
        cantidadComercializableKg: 900,
        cantidadDescarteKg: 100,
        motivoDescarte: 'CALIBRE',
        fechaReferenciaHoy: hoyRef,
      });

      expect(() =>
        cosecha.modificar(usuarioId, 'Ajuste erróneo', {
          cantidadComercializableKg: 950, // 950 + 100 = 1050 != 1000
        })
      ).toThrow(DesgloseCosechaInvalidoError);
    });
  });
});
