import { describe, expect, it } from 'vitest';
import { DatosInsumo, Insumo, InsumoInvalidoError } from '../../../src/core/domain/entities/insumo.entity.js';

const datos: DatosInsumo = { codigo: ' F-01 ', nombre: ' Fertilizante ', categoria: 'FERTILIZANTE',
  unidadMedida: ' kg ', tipoProducto: null, fabricanteMarca: null, nivelMinimo: 0 };

describe('AGRUL-055: dominio del catálogo canónico', () => {
  it('normaliza el catálogo, inicia activo y no permite mutarlo desde la salida', () => {
    const insumo = Insumo.crear('id', datos);
    const copia = insumo.toJSON(); copia.nombre = 'Alterado';
    expect(insumo.toJSON()).toEqual({ ...datos, id: 'id', codigo: 'F-01', nombre: 'Fertilizante', unidadMedida: 'kg', estado: 'ACTIVO' });
  });
  it.each([NaN, Infinity, -Infinity, -1, 0.001, 1e-10, 0.29000000000000004, 1.234, 100000000])('rechaza nivel no representable: %s', nivelMinimo => {
    expect(() => Insumo.crear('id', { ...datos, nivelMinimo })).toThrow(InsumoInvalidoError);
  });
  it.each([0, 0.01, 0.29, 1.23, 99999999.99])('acepta sin redondear el nivel: %s', nivelMinimo => {
    expect(Insumo.crear('id', { ...datos, nivelMinimo }).toJSON().nivelMinimo).toBe(nivelMinimo);
  });
  it.each([{ codigo: '' }, { codigo: 'x'.repeat(16) }, { nombre: ' ' }, { unidadMedida: '' },
    { tipoProducto: ' ' }, { fabricanteMarca: 'x'.repeat(151) }])('rechaza campos inválidos: %o', cambios => {
    expect(() => Insumo.crear('id', { ...datos, ...cambios })).toThrow(InsumoInvalidoError);
  });
  it('conserva los datos históricos al reconstruir sin aplicar las reglas de alta', () => {
    const historico = { ...datos, id: 'histórico', estado: 'INACTIVO' as const, nivelMinimo: 1.234 };
    expect(Insumo.reconstituir(historico).toJSON()).toEqual(historico);
  });
});
