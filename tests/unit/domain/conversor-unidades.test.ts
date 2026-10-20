import { describe, it, expect } from 'vitest';
import { InsumoUnidadEquivalencia } from '../../../src/core/domain/entities/insumo-unidad-equivalencia.entity.js';
import { ConversorUnidadesService } from '../../../src/core/domain/services/conversor-unidades.service.js';
import {
  UnidadConversionInvalidaError,
  InsumoEquivalenciaInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Servicio de Dominio: ConversorUnidadesService (AGRUL-041 / RN-12, RF-M9-01, RF-M9-14)', () => {
  describe('InsumoUnidadEquivalencia Entity', () => {
    it('debe crear una equivalencia válida con factor multiplicador y densidad', () => {
      const eq = InsumoUnidadEquivalencia.crear({
        id: 'eq-001',
        insumoId: 'ins-fertilizante-01',
        unidadCompra: 'Bidon 20L',
        unidadConsumo: 'L',
        factorMultiplicador: 20,
        densidadKgL: 1.25,
      });

      expect(eq.id).toBe('eq-001');
      expect(eq.insumoId).toBe('ins-fertilizante-01');
      expect(eq.unidadCompra).toBe('BIDON 20L');
      expect(eq.unidadConsumo).toBe('L');
      expect(eq.factorMultiplicador).toBe(20);
      expect(eq.densidadKgL).toBe(1.25);
    });

    it('debe rechazar factor multiplicador menor o igual a 0', () => {
      expect(() =>
        InsumoUnidadEquivalencia.crear({
          id: 'eq-002',
          insumoId: 'ins-01',
          unidadCompra: 'BIDON_20L',
          unidadConsumo: 'L',
          factorMultiplicador: 0,
        })
      ).toThrow(InsumoEquivalenciaInvalidaError);
    });

    it('debe rechazar densidad menor o igual a 0', () => {
      expect(() =>
        InsumoUnidadEquivalencia.crear({
          id: 'eq-003',
          insumoId: 'ins-01',
          unidadCompra: 'BIDON_20L',
          unidadConsumo: 'L',
          factorMultiplicador: 20,
          densidadKgL: -1.2,
        })
      ).toThrow(InsumoEquivalenciaInvalidaError);
    });
  });

  describe('Conversiones Métricas Estándar', () => {
    it('debe retornar la misma cantidad cuando origen y destino coinciden', () => {
      const res = ConversorUnidadesService.convertir({
        cantidad: 15.5,
        unidadOrigen: 'L',
        unidadDestino: 'L',
      });

      expect(res.cantidadConvertida).toBe(15.5);
      expect(res.factorAplicado).toBe(1);
    });

    it('debe convertir unidades de volumen métricas (L <-> ML)', () => {
      const aMl = ConversorUnidadesService.convertir({
        cantidad: 2.5,
        unidadOrigen: 'L',
        unidadDestino: 'ML',
      });
      expect(aMl.cantidadConvertida).toBe(2500);

      const aLitros = ConversorUnidadesService.convertir({
        cantidad: 750,
        unidadOrigen: 'ML',
        unidadDestino: 'L',
      });
      expect(aLitros.cantidadConvertida).toBe(0.75);
    });

    it('debe convertir unidades de masa métricas (KG <-> G <-> TN)', () => {
      const aGramos = ConversorUnidadesService.convertir({
        cantidad: 4,
        unidadOrigen: 'KG',
        unidadDestino: 'G',
      });
      expect(aGramos.cantidadConvertida).toBe(4000);

      const aToneladas = ConversorUnidadesService.convertir({
        cantidad: 5000,
        unidadOrigen: 'KG',
        unidadDestino: 'TN',
      });
      expect(aToneladas.cantidadConvertida).toBe(5);
    });
  });

  describe('Regla de Negocio RN-12 / RF-M9-14: Conversión Litros <-> Kg', () => {
    it('debe rechazar la conversión automática de L a KG si NO existe densidad registrada', () => {
      expect(() =>
        ConversorUnidadesService.convertir({
          cantidad: 10,
          unidadOrigen: 'L',
          unidadDestino: 'KG',
          densidadKgL: null,
          equivalencias: [],
        })
      ).toThrow(UnidadConversionInvalidaError);
    });

    it('debe rechazar la conversión automática de KG a L si NO existe densidad registrada', () => {
      expect(() =>
        ConversorUnidadesService.convertir({
          cantidad: 10,
          unidadOrigen: 'KG',
          unidadDestino: 'L',
        })
      ).toThrow(UnidadConversionInvalidaError);
    });

    it('debe permitir la conversión L -> KG cuando se suministra densidad (kg = L * densidad)', () => {
      // Insumo fertilizante líquido denso: 1.25 kg/L
      // 10 L * 1.25 kg/L = 12.5 kg
      const res = ConversorUnidadesService.convertir({
        cantidad: 10,
        unidadOrigen: 'L',
        unidadDestino: 'KG',
        densidadKgL: 1.25,
      });

      expect(res.cantidadConvertida).toBe(12.5);
      expect(res.densidadUtilizada).toBe(1.25);
    });

    it('debe permitir la conversión KG -> L cuando se suministra densidad (L = kg / densidad)', () => {
      // 25 kg / 1.25 kg/L = 20 L
      const res = ConversorUnidadesService.convertir({
        cantidad: 25,
        unidadOrigen: 'KG',
        unidadDestino: 'L',
        densidadKgL: 1.25,
      });

      expect(res.cantidadConvertida).toBe(20);
      expect(res.densidadUtilizada).toBe(1.25);
    });

    it('debe permitir la conversión ML -> G con densidad registrada', () => {
      // 1000 ML = 1 L -> con densidad 1.15 kg/L = 1.15 kg = 1150 G
      const res = ConversorUnidadesService.convertir({
        cantidad: 1000,
        unidadOrigen: 'ML',
        unidadDestino: 'G',
        densidadKgL: 1.15,
      });

      expect(res.cantidadConvertida).toBe(1150);
    });
  });

  describe('Equivalencias de Presentación Comercial (RF-M9-01)', () => {
    const eqBidon20L = InsumoUnidadEquivalencia.crear({
      id: 'eq-b20',
      insumoId: 'ins-01',
      unidadCompra: 'BIDON_20L',
      unidadConsumo: 'L',
      factorMultiplicador: 20,
      densidadKgL: 1.2,
    });

    it('debe convertir de unidad de compra a unidad de consumo directamente (BIDON_20L -> L)', () => {
      const res = ConversorUnidadesService.convertir({
        cantidad: 3,
        unidadOrigen: 'BIDON_20L',
        unidadDestino: 'L',
        equivalencias: [eqBidon20L],
      });

      // 3 bidones de 20L = 60 L
      expect(res.cantidadConvertida).toBe(60);
      expect(res.factorAplicado).toBe(20);
    });

    it('debe convertir de unidad de consumo a unidad de compra inversamente (L -> BIDON_20L)', () => {
      const res = ConversorUnidadesService.convertir({
        cantidad: 100,
        unidadOrigen: 'L',
        unidadDestino: 'BIDON_20L',
        equivalencias: [eqBidon20L],
      });

      // 100 L / 20 = 5 bidones
      expect(res.cantidadConvertida).toBe(5);
    });

    it('debe encadenar conversión de unidad de compra a submúltiplo métrico (BIDON_20L -> ML)', () => {
      const res = ConversorUnidadesService.convertir({
        cantidad: 1,
        unidadOrigen: 'BIDON_20L',
        unidadDestino: 'ML',
        equivalencias: [eqBidon20L],
      });

      // 1 bidón = 20 L = 20,000 ML
      expect(res.cantidadConvertida).toBe(20000);
    });

    it('debe convertir unidad de compra a masa usando la densidad de la equivalencia (BIDON_20L -> KG)', () => {
      const res = ConversorUnidadesService.convertir({
        cantidad: 2,
        unidadOrigen: 'BIDON_20L',
        unidadDestino: 'KG',
        equivalencias: [eqBidon20L],
      });

      // 2 bidones = 40 L; 40 L * 1.2 kg/L = 48 KG
      expect(res.cantidadConvertida).toBe(48);
      expect(res.densidadUtilizada).toBe(1.2);
    });

    it('debe arrojar UnidadConversionInvalidaError si se intenta convertir entre unidades sin equivalencia registrada', () => {
      expect(() =>
        ConversorUnidadesService.convertir({
          cantidad: 10,
          unidadOrigen: 'TAMBOR_200L',
          unidadDestino: 'L',
          equivalencias: [eqBidon20L],
        })
      ).toThrow(UnidadConversionInvalidaError);
    });
  });
});
