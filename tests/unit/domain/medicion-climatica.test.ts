import { describe, it, expect } from 'vitest';
import { MedicionClimatica } from '../../../src/core/domain/entities/medicion-climatica.entity.js';
import {
  MedicionClimaticaInvalidaError,
  FechaFuturaInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Domain Entity: MedicionClimatica (AGRUL-046 / Módulo 10)', () => {
  const FINCA_ID = 'f0000000-0000-4000-8000-000000000001';
  const FECHA_HOY = new Date('2026-10-23T12:00:00Z');

  describe('Creación y Registro Manual (RF-M10-01, RF-M10-02)', () => {
    it('debe crear una medición meteorológica válida con datos completos y fuente explícita', () => {
      const medicion = MedicionClimatica.crear({
        fincaId: FINCA_ID,
        fecha: '2026-10-22',
        tempMinC: 12.5,
        tempMaxC: 25.0,
        precipitacionMm: 15.2,
        humedadRelativaPct: 78.5,
        vientoKmH: 14.0,
        fuenteDato: 'ESTACION_PROPIA',
        observaciones: 'Llovizna leve durante la mañana',
        fechaReferenciaHoy: FECHA_HOY,
      });

      expect(medicion.id).toBeDefined();
      expect(medicion.fincaId).toBe(FINCA_ID);
      expect(medicion.fecha).toBe('2026-10-22');
      expect(medicion.precipitacionMm).toBe(15.2);
      expect(medicion.tempMinC).toBe(12.5);
      expect(medicion.tempMaxC).toBe(25.0);
      expect(medicion.tempMediaC).toBe(18.75); // Cálculo automático
      expect(medicion.humedadRelativaPct).toBe(78.5);
      expect(medicion.vientoKmH).toBe(14.0);
      expect(medicion.huboHelada).toBe(false);
      expect(medicion.huboGranizo).toBe(false);
      expect(medicion.fuenteDato).toBe('ESTACION_PROPIA');
      expect(medicion.esCorreccion).toBe(false);
    });

    it('debe detectar automáticamente helada si la temperatura mínima es menor o igual a cero', () => {
      const medicion = MedicionClimatica.crear({
        fincaId: FINCA_ID,
        fecha: '2026-07-15',
        tempMinC: -2.3,
        tempMaxC: 14.0,
        precipitacionMm: 0,
        fuenteDato: 'MEDICION_PROPIA',
        fechaReferenciaHoy: FECHA_HOY,
      });

      expect(medicion.tempMinC).toBe(-2.3);
      expect(medicion.huboHelada).toBe(true);
    });

    it('debe rechazar fuente de datos inválida', () => {
      expect(() =>
        MedicionClimatica.crear({
          fincaId: FINCA_ID,
          fecha: '2026-10-20',
          precipitacionMm: 0,
          fuenteDato: 'FUENTE_INEXISTENTE' as any,
          fechaReferenciaHoy: FECHA_HOY,
        })
      ).toThrow(MedicionClimaticaInvalidaError);
    });
  });

  describe('Validaciones de Integridad Física (RF-M10-05)', () => {
    it('debe rechazar precipitación negativa', () => {
      expect(() =>
        MedicionClimatica.crear({
          fincaId: FINCA_ID,
          fecha: '2026-10-20',
          precipitacionMm: -5.0,
          fuenteDato: 'MEDICION_PROPIA',
          fechaReferenciaHoy: FECHA_HOY,
        })
      ).toThrow(MedicionClimaticaInvalidaError);
    });

    it('debe rechazar humedad relativa negativa o superior a 100%', () => {
      expect(() =>
        MedicionClimatica.crear({
          fincaId: FINCA_ID,
          fecha: '2026-10-20',
          precipitacionMm: 0,
          humedadRelativaPct: -1,
          fuenteDato: 'MEDICION_PROPIA',
          fechaReferenciaHoy: FECHA_HOY,
        })
      ).toThrow(MedicionClimaticaInvalidaError);

      expect(() =>
        MedicionClimatica.crear({
          fincaId: FINCA_ID,
          fecha: '2026-10-20',
          precipitacionMm: 0,
          humedadRelativaPct: 105.0,
          fuenteDato: 'MEDICION_PROPIA',
          fechaReferenciaHoy: FECHA_HOY,
        })
      ).toThrow(MedicionClimaticaInvalidaError);
    });

    it('debe rechazar velocidad de viento negativa', () => {
      expect(() =>
        MedicionClimatica.crear({
          fincaId: FINCA_ID,
          fecha: '2026-10-20',
          precipitacionMm: 0,
          vientoKmH: -10,
          fuenteDato: 'MEDICION_PROPIA',
          fechaReferenciaHoy: FECHA_HOY,
        })
      ).toThrow(MedicionClimaticaInvalidaError);
    });

    it('debe rechazar inconsistencia térmica cuando tempMin > tempMax', () => {
      expect(() =>
        MedicionClimatica.crear({
          fincaId: FINCA_ID,
          fecha: '2026-10-20',
          tempMinC: 28.0,
          tempMaxC: 15.0,
          precipitacionMm: 0,
          fuenteDato: 'MEDICION_PROPIA',
          fechaReferenciaHoy: FECHA_HOY,
        })
      ).toThrow(MedicionClimaticaInvalidaError);
    });

    it('debe rechazar fechas futuras según RN-04', () => {
      expect(() =>
        MedicionClimatica.crear({
          fincaId: FINCA_ID,
          fecha: '2026-10-25', // Futura respecto a FECHA_HOY (2026-10-23)
          precipitacionMm: 0,
          fuenteDato: 'MEDICION_PROPIA',
          fechaReferenciaHoy: FECHA_HOY,
        })
      ).toThrow(FechaFuturaInvalidaError);
    });
  });

  describe('Inmutabilidad Histórica y Correcciones Auditadas (RF-M10-06 / RN-06)', () => {
    it('debe generar una corrección inmutable vinculada al ID original preservando los datos previos', () => {
      const original = MedicionClimatica.crear({
        fincaId: FINCA_ID,
        fecha: '2026-10-20',
        tempMinC: 10.0,
        tempMaxC: 22.0,
        precipitacionMm: 5.0,
        fuenteDato: 'MEDICION_PROPIA',
        observaciones: 'Lectura inicial',
        fechaReferenciaHoy: FECHA_HOY,
      });

      const correccion = original.corregir({
        motivoCorreccion: 'Calibración de pluviómetro: se corrigieron 3mm por rebalse no considerado',
        precipitacionMm: 8.0,
        fechaReferenciaHoy: FECHA_HOY,
      });

      expect(correccion.id).not.toBe(original.id);
      expect(correccion.esCorreccion).toBe(true);
      expect(correccion.medicionOriginalId).toBe(original.id);
      expect(correccion.motivoCorreccion).toContain('Calibración de pluviómetro');
      expect(correccion.precipitacionMm).toBe(8.0);
      expect(correccion.tempMinC).toBe(10.0); // Conserva los valores no alterados
      expect(original.precipitacionMm).toBe(5.0); // Inmutable
    });

    it('debe rechazar una corrección si no se provee motivo explícito', () => {
      const original = MedicionClimatica.crear({
        fincaId: FINCA_ID,
        fecha: '2026-10-20',
        precipitacionMm: 5.0,
        fuenteDato: 'MEDICION_PROPIA',
        fechaReferenciaHoy: FECHA_HOY,
      });

      expect(() =>
        original.corregir({
          motivoCorreccion: '',
          precipitacionMm: 10,
          fechaReferenciaHoy: FECHA_HOY,
        })
      ).toThrow(MedicionClimaticaInvalidaError);
    });
  });
});
