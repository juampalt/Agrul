import { describe, it, expect } from 'vitest';
import { EventoClimaticoSGTA } from '../../../src/core/domain/entities/evento-climatico-sgta.entity.js';
import {
  EventoClimaticoAdversoInvalidoError,
  FechaFuturaInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Dominio: EventoClimaticoSGTA (Módulo 10 SGTA / CU69 - CU70)', () => {
  const fincaId = '11111111-1111-1111-1111-111111111111';
  const lote1Id = '22222222-2222-2222-2222-222222222222';
  const lote2Id = '33333333-3333-3333-3333-333333333333';
  const hoyRef = new Date('2026-10-27T12:00:00.000Z');

  it('debe crear un evento climático adverso asociando múltiples lotes y sus daños', () => {
    const evt = EventoClimaticoSGTA.crear(
      {
        fincaId,
        tipoEvento: 'GRANIZO',
        fecha: '2026-10-26',
        descripcion: 'Tormenta severa de granizo en sectores sur y este',
        lotesAfectados: [
          {
            loteId: lote1Id,
            descripcionDano: 'Defoliación parcial en sector frutillas',
            superficieAfectadaHa: 1.5,
            porcentajeDano: 25.0,
          },
          {
            loteId: lote2Id,
            descripcionDano: 'Rotura de túneles plásticos y daño leve en fruta',
            superficieAfectadaHa: 0.8,
            porcentajeDano: 15.0,
          },
        ],
      },
      hoyRef
    );

    expect(evt.id).toBeDefined();
    expect(evt.fincaId).toBe(fincaId);
    expect(evt.tipoEvento).toBe('GRANIZO');
    expect(evt.lotesAfectados).toHaveLength(2);
    expect(evt.lotesAfectados[0].loteId).toBe(lote1Id);
    expect(evt.lotesAfectados[0].porcentajeDano).toBe(25.0);
    expect(evt.lotesAfectados[1].superficieAfectadaHa).toBe(0.8);
  });

  it('debe rechazar si la fecha del evento es futura', () => {
    expect(() =>
      EventoClimaticoSGTA.crear(
        {
          fincaId,
          tipoEvento: 'HELADA',
          fecha: '2026-10-28',
          descripcion: 'Helada tardía',
          lotesAfectados: [{ loteId: lote1Id, descripcionDano: 'Hojas quemadas' }],
        },
        hoyRef
      )
    ).toThrow(FechaFuturaInvalidaError);
  });

  it('debe rechazar si no se especifica ningún lote afectado (CU69)', () => {
    expect(() =>
      EventoClimaticoSGTA.crear(
        {
          fincaId,
          tipoEvento: 'VIENTO_FUERTE',
          fecha: '2026-10-26',
          descripcion: 'Ráfagas de 80 km/h',
          lotesAfectados: [],
        },
        hoyRef
      )
    ).toThrow(EventoClimaticoAdversoInvalidoError);
  });

  it('debe rechazar si se repite un lote afectado dentro del mismo siniestro', () => {
    expect(() =>
      EventoClimaticoSGTA.crear(
        {
          fincaId,
          tipoEvento: 'LLUVIA_INTENSA',
          fecha: '2026-10-26',
          descripcion: 'Inundación temporal de zanjas',
          lotesAfectados: [
            { loteId: lote1Id, descripcionDano: 'Anegamiento inicial' },
            { loteId: lote1Id, descripcionDano: 'Daño en raíces' },
          ],
        },
        hoyRef
      )
    ).toThrow(EventoClimaticoAdversoInvalidoError);
  });

  it('debe rechazar porcentaje de daño menor a 0 o mayor a 100', () => {
    expect(() =>
      EventoClimaticoSGTA.crear(
        {
          fincaId,
          tipoEvento: 'HELADA',
          fecha: '2026-10-26',
          descripcion: 'Helada negra',
          lotesAfectados: [{ loteId: lote1Id, descripcionDano: 'Pérdida total', porcentajeDano: 120 }],
        },
        hoyRef
      )
    ).toThrow(EventoClimaticoAdversoInvalidoError);
  });

  it('debe rechazar superficie afectada negativa o cero', () => {
    expect(() =>
      EventoClimaticoSGTA.crear(
        {
          fincaId,
          tipoEvento: 'HELADA',
          fecha: '2026-10-26',
          descripcion: 'Helada negra',
          lotesAfectados: [{ loteId: lote1Id, descripcionDano: 'Flores quemadas', superficieAfectadaHa: 0 }],
        },
        hoyRef
      )
    ).toThrow(EventoClimaticoAdversoInvalidoError);
  });
});
