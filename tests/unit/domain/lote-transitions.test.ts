import { describe, it, expect } from 'vitest';
import { Lote } from '../../../src/core/domain/entities/lote.entity.js';
import { EstadoLoteEnum } from '../../../src/core/domain/value-objects/estado-lote.vo.js';
import { TipoEventoEnum } from '../../../src/core/domain/value-objects/tipo-evento.vo.js';
import { CantidadInsuficienteError, InvalidStateTransitionError } from '../../../src/core/domain/errors/domain.error.js';

describe('Lote Aggregate - Ciclo de Vida y Transiciones', () => {
  const loteParams = {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    codigoLote: 'LOT-2026-00001',
    producto: 'Arándano Emerald',
    variedad: 'Premium',
    cantidadInicial: 1000,
    unidadMedida: 'KG',
  };

  it('debe inicializarse en estado CREADO con cantidad positiva', () => {
    const lote = Lote.crear(loteParams);

    expect(lote.estadoActual).toBe(EstadoLoteEnum.CREADO);
    expect(lote.cantidadActual).toBe(1000);
    expect(lote.producto).toBe('Arándano Emerald');
  });

  it('debe avanzar a EN_PROCESO al aplicar evento de PROCESO', () => {
    const lote = Lote.crear(loteParams);
    lote.aplicarEvento(TipoEventoEnum.PROCESO);

    expect(lote.estadoActual).toBe(EstadoLoteEnum.EN_PROCESO);
  });

  it('debe avanzar a EMBALADO y luego a DESPACHADO', () => {
    const lote = Lote.crear(loteParams);
    lote.aplicarEvento(TipoEventoEnum.PROCESO);
    lote.aplicarEvento(TipoEventoEnum.EMBALAJE);
    expect(lote.estadoActual).toBe(EstadoLoteEnum.EMBALADO);

    lote.aplicarEvento(TipoEventoEnum.DESPACHO);
    expect(lote.estadoActual).toBe(EstadoLoteEnum.DESPACHADO);
  });

  it('debe rechazar eventos comunes cuando el lote está CERRADO', () => {
    const lote = Lote.crear(loteParams);
    lote.cerrarLote();

    expect(lote.estadoActual).toBe(EstadoLoteEnum.CERRADO);
    expect(() => lote.aplicarEvento(TipoEventoEnum.PROCESO)).toThrow(InvalidStateTransitionError);
  });

  it('debe descontar cantidad correctamente', () => {
    const lote = Lote.crear(loteParams);
    lote.descontarCantidad(350);

    expect(lote.cantidadActual).toBe(650);
  });

  it('debe arrojar CantidadInsuficienteError si se solicita más de lo disponible', () => {
    const lote = Lote.crear(loteParams);

    expect(() => lote.descontarCantidad(1200)).toThrow(CantidadInsuficienteError);
  });
});
