import { describe, it, expect } from 'vitest';
import { CodigoLote, FormatoCodigoLoteInvalidoError } from '../../../src/core/domain/value-objects/codigo-lote.vo.js';

describe('Value Object - CodigoLote', () => {
  it('debe crear un código de lote válido', () => {
    const codigo = CodigoLote.crear('LOT-2026-00042');
    expect(codigo.value).toBe('LOT-2026-00042');
  });

  it('debe normalizar espacios y mayúsculas', () => {
    const codigo = CodigoLote.crear('  lot-2026-abc1  ');
    expect(codigo.value).toBe('LOT-2026-ABC1');
  });

  it('debe arrojar error si el formato es inválido', () => {
    expect(() => CodigoLote.crear('12345')).toThrow(FormatoCodigoLoteInvalidoError);
    expect(() => CodigoLote.crear('LOTE-INCORRECTO')).toThrow(FormatoCodigoLoteInvalidoError);
  });

  it('debe generar códigos con prefijo y secuencial', () => {
    const anio = new Date().getFullYear();
    const generado = CodigoLote.generar('HARV', 15);
    expect(generado.value).toBe(`HARV-${anio}-00015`);
  });
});
