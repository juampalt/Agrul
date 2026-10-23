import { describe, it, expect } from 'vitest';
import {
  EventoClimaticoAdverso,
  TipoSiniestroClimatico,
} from '../../../src/core/domain/entities/evento-climatico-adverso.entity.js';
import {
  EventoClimaticoAdversoInvalidoError,
  FechaFuturaInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('EventoClimaticoAdverso (RF-M10-11, RN-04)', () => {
  const hoyRef = new Date('2026-10-23T12:00:00Z');

  it('debe crear un evento climático adverso válido con registro fotográfico y daño estimado', () => {
    const evento = EventoClimaticoAdverso.crear(
      {
        id: 'evt-granizo-1',
        fincaId: 'finca-lules-1',
        loteId: 'lote-arandanos-1',
        fecha: '2026-10-22',
        tipoSiniestro: 'GRANIZO',
        danoEstimadoPct: 35.5,
        superficieAfectadaHa: 4.2,
        fotosUrls: ['https://storage.agrul.com/fotos/granizo1.jpg', 'https://storage.agrul.com/fotos/granizo2.jpg'],
        descripcion: 'Tormenta de granizo en seco durante 10 minutos, afectando brotes tiernos y frutos cuajados.',
        usuarioId: 'usr-encargado-1',
      },
      hoyRef
    );

    expect(evento.id).toBe('evt-granizo-1');
    expect(evento.fincaId).toBe('finca-lules-1');
    expect(evento.loteId).toBe('lote-arandanos-1');
    expect(evento.fecha).toBe('2026-10-22');
    expect(evento.tipoSiniestro).toBe('GRANIZO');
    expect(evento.danoEstimadoPct).toBe(35.5);
    expect(evento.superficieAfectadaHa).toBe(4.2);
    expect(evento.fotosUrls).toHaveLength(2);
    expect(evento.descripcion).toContain('Tormenta de granizo');
    expect(evento.usuarioId).toBe('usr-encargado-1');
  });

  it('debe rechazar eventos con fecha futura arrojando FechaFuturaInvalidaError (RN-04)', () => {
    expect(() => {
      EventoClimaticoAdverso.crear(
        {
          id: 'evt-futuro',
          fincaId: 'finca-1',
          loteId: 'lote-1',
          fecha: '2026-10-25', // Futuro respecto a hoyRef (2026-10-23)
          tipoSiniestro: 'HELADA',
          danoEstimadoPct: 20,
          descripcion: 'Helada tardía futura',
        },
        hoyRef
      );
    }).toThrow(FechaFuturaInvalidaError);
  });

  it('debe rechazar porcentaje de daño negativo o superior al 100% (RF-M10-11)', () => {
    expect(() => {
      EventoClimaticoAdverso.crear(
        {
          id: 'evt-1',
          fincaId: 'finca-1',
          loteId: 'lote-1',
          fecha: '2026-10-20',
          tipoSiniestro: 'HELADA',
          danoEstimadoPct: -5,
          descripcion: 'Daño negativo inválido',
        },
        hoyRef
      );
    }).toThrow(EventoClimaticoAdversoInvalidoError);

    expect(() => {
      EventoClimaticoAdverso.crear(
        {
          id: 'evt-2',
          fincaId: 'finca-1',
          loteId: 'lote-1',
          fecha: '2026-10-20',
          tipoSiniestro: 'CALOR_EXTREMO',
          danoEstimadoPct: 105,
          descripcion: 'Daño mayor a 100% inválido',
        },
        hoyRef
      );
    }).toThrow(EventoClimaticoAdversoInvalidoError);
  });

  it('debe rechazar tipos de siniestro desconocidos', () => {
    expect(() => {
      EventoClimaticoAdverso.crear(
        {
          id: 'evt-3',
          fincaId: 'finca-1',
          loteId: 'lote-1',
          fecha: '2026-10-20',
          tipoSiniestro: 'METEORITO' as TipoSiniestroClimatico,
          danoEstimadoPct: 50,
          descripcion: 'Siniestro no tipificado',
        },
        hoyRef
      );
    }).toThrow(EventoClimaticoAdversoInvalidoError);
  });

  it('debe rechazar descripciones vacías o ausentes', () => {
    expect(() => {
      EventoClimaticoAdverso.crear(
        {
          id: 'evt-4',
          fincaId: 'finca-1',
          loteId: 'lote-1',
          fecha: '2026-10-20',
          tipoSiniestro: 'INUNDACION',
          danoEstimadoPct: 40,
          descripcion: '   ',
        },
        hoyRef
      );
    }).toThrow(EventoClimaticoAdversoInvalidoError);
  });

  it('debe rechazar superficie afectada negativa', () => {
    expect(() => {
      EventoClimaticoAdverso.crear(
        {
          id: 'evt-5',
          fincaId: 'finca-1',
          loteId: 'lote-1',
          fecha: '2026-10-20',
          tipoSiniestro: 'VIENTO_FUERTE',
          danoEstimadoPct: 15,
          superficieAfectadaHa: -2,
          descripcion: 'Viento zonda con ráfagas',
        },
        hoyRef
      );
    }).toThrow(EventoClimaticoAdversoInvalidoError);
  });

  it('debe permitir reconstituir un evento adverso preservando todas sus propiedades', () => {
    const props = {
      id: 'evt-reconstituido',
      fincaId: 'finca-1',
      loteId: 'lote-1',
      fecha: '2026-10-15',
      tipoSiniestro: 'HELADA' as TipoSiniestroClimatico,
      danoEstimadoPct: 50,
      superficieAfectadaHa: 10,
      fotosUrls: ['https://example.com/foto.jpg'],
      descripcion: 'Helada negra severa',
      usuarioId: 'usr-1',
      creadoEn: '2026-10-15T10:00:00.000Z',
      actualizadoEn: '2026-10-15T10:00:00.000Z',
    };

    const evento = EventoClimaticoAdverso.reconstituir(props);
    expect(evento.toJSON()).toEqual(props);
  });
});
