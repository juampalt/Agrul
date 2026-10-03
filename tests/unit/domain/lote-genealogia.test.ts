import { describe, it, expect } from 'vitest';
import { LoteGenealogia, RelacionGenealogicaInvalidaError } from '../../../src/core/domain/entities/lote-genealogia.entity.js';

describe('LoteGenealogia Entity - Grafo N:M y Linaje', () => {
  const baseProps = {
    id: 'aaaabbbb-cccc-dddd-eeee-ffffffffffff',
    lotePadreId: '11111111-1111-1111-1111-111111111111',
    loteHijoId: '22222222-2222-2222-2222-222222222222',
    cantidadAportada: 450.5,
    unidadMedida: 'KG',
    motivoRelacion: 'SPLIT' as const,
  };

  it('debe registrar un vínculo genealógico válido', () => {
    const relacion = LoteGenealogia.crear(baseProps);

    expect(relacion.lotePadreId).toBe(baseProps.lotePadreId);
    expect(relacion.loteHijoId).toBe(baseProps.loteHijoId);
    expect(relacion.cantidadAportada).toBe(450.5);
    expect(relacion.motivoRelacion).toBe('SPLIT');
  });

  it('debe prohibir que un lote sea padre de sí mismo (ciclos)', () => {
    expect(() => {
      LoteGenealogia.crear({
        ...baseProps,
        lotePadreId: 'SAME-ID-1234',
        loteHijoId: 'SAME-ID-1234',
      });
    }).toThrow(RelacionGenealogicaInvalidaError);
  });

  it('debe prohibir cantidades menores o iguales a cero', () => {
    expect(() => {
      LoteGenealogia.crear({
        ...baseProps,
        cantidadAportada: 0,
      });
    }).toThrow(RelacionGenealogicaInvalidaError);

    expect(() => {
      LoteGenealogia.crear({
        ...baseProps,
        cantidadAportada: -10,
      });
    }).toThrow(RelacionGenealogicaInvalidaError);
  });
});
