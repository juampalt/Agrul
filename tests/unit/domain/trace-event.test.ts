import { describe, it, expect } from 'vitest';
import { TraceEvent, TraceEventInvalidoError } from '../../../src/core/domain/entities/trace-event.entity.js';
import { TipoEventoEnum } from '../../../src/core/domain/value-objects/tipo-evento.vo.js';

describe('TraceEvent Entity - Inmutabilidad y Validación', () => {
  const baseProps = {
    id: '11111111-1111-1111-1111-111111111111',
    loteId: '22222222-2222-2222-2222-222222222222',
    actorId: '33333333-3333-3333-3333-333333333333',
    ubicacionId: '44444444-4444-4444-4444-444444444444',
    tipoEvento: TipoEventoEnum.COSECHA,
    timestampCapturaLocal: '2026-10-03T18:00:00.000Z',
    payloadEspecifico: { kilosCosechados: 520, cuadrilla: 'Equipo A' },
  };

  it('debe instanciarse correctamente con datos válidos', () => {
    const evento = TraceEvent.crear(baseProps);

    expect(evento.id).toBe(baseProps.id);
    expect(evento.tipoEvento).toBe(TipoEventoEnum.COSECHA);
    expect(evento.timestampServidor).toBeDefined();
    expect(evento.estadoSincronizacion).toBe('SINCRONIZADO');
  });

  it('debe exigir eventoReferenciadoId si el evento es de tipo COMPENSACION', () => {
    expect(() => {
      TraceEvent.crear({
        ...baseProps,
        tipoEvento: TipoEventoEnum.COMPENSACION_ANULACION,
      });
    }).toThrow(TraceEventInvalidoError);

    const eventoCompensatorio = TraceEvent.crear({
      ...baseProps,
      tipoEvento: TipoEventoEnum.COMPENSACION_ANULACION,
      eventoReferenciadoId: '99999999-9999-9999-9999-999999999999',
    });

    expect(eventoCompensatorio.eventoReferenciadoId).toBe('99999999-9999-9999-9999-999999999999');
  });
});
