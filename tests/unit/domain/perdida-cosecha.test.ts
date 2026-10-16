import { describe, it, expect } from 'vitest';
import {
  PerdidaCosecha,
  TIPOS_PERDIDA_VALIDOS,
} from '../../../src/core/domain/entities/perdida-cosecha.entity.js';
import {
  FechaFuturaInvalidaError,
  PerdidaCosechaInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Entidad de Dominio: PerdidaCosecha (AGRUL-030 / RF-M5-14)', () => {
  const hoyRef = new Date('2026-10-15T12:00:00Z');

  it('debe registrar un evento de pérdida climática válido', () => {
    const perdida = PerdidaCosecha.crear({
      id: crypto.randomUUID(),
      loteId: crypto.randomUUID(),
      cicloId: crypto.randomUUID(),
      fecha: '2026-10-10',
      tipo: 'GRANIZO',
      cantidadEstimadaKg: 2500,
      superficieAfectadaHa: 3.2,
      descripcion: 'Granizada severa afectó el 30% de la canopia y tiró fruta al suelo.',
      fechaReferenciaHoy: hoyRef,
    });

    expect(perdida.tipo).toBe('GRANIZO');
    expect(perdida.cantidadEstimadaKg).toBe(2500);
    expect(perdida.superficieAfectadaHa).toBe(3.2);
    expect(perdida.descripcion).toContain('Granizada severa');
    expect(perdida.fecha).toBe('2026-10-10');
  });

  it('debe aceptar todos los tipos de pérdidas válidos', () => {
    for (const tipo of TIPOS_PERDIDA_VALIDOS) {
      const p = PerdidaCosecha.crear({
        id: crypto.randomUUID(),
        loteId: crypto.randomUUID(),
        fecha: '2026-10-10',
        tipo,
        cantidadEstimadaKg: 100,
        descripcion: `Incidente tipo ${tipo}`,
        fechaReferenciaHoy: hoyRef,
      });
      expect(p.tipo).toBe(tipo);
    }
  });

  it('debe rechazar un tipo de pérdida no contemplado en el dominio', () => {
    expect(() =>
      PerdidaCosecha.crear({
        id: crypto.randomUUID(),
        loteId: crypto.randomUUID(),
        fecha: '2026-10-10',
        tipo: 'METEORITO_DESCONOCIDO',
        cantidadEstimadaKg: 100,
        descripcion: 'Evento inexplicable',
        fechaReferenciaHoy: hoyRef,
      })
    ).toThrow(PerdidaCosechaInvalidaError);
  });

  it('debe rechazar cantidades estimadas negativas o cero', () => {
    expect(() =>
      PerdidaCosecha.crear({
        id: crypto.randomUUID(),
        loteId: crypto.randomUUID(),
        fecha: '2026-10-10',
        tipo: 'HELADA',
        cantidadEstimadaKg: 0,
        descripcion: 'Helada tardía',
        fechaReferenciaHoy: hoyRef,
      })
    ).toThrow(PerdidaCosechaInvalidaError);

    expect(() =>
      PerdidaCosecha.crear({
        id: crypto.randomUUID(),
        loteId: crypto.randomUUID(),
        fecha: '2026-10-10',
        tipo: 'HELADA',
        cantidadEstimadaKg: -50,
        descripcion: 'Helada tardía',
        fechaReferenciaHoy: hoyRef,
      })
    ).toThrow(PerdidaCosechaInvalidaError);
  });

  it('debe rechazar superficies afectadas negativas o cero si se especifican', () => {
    expect(() =>
      PerdidaCosecha.crear({
        id: crypto.randomUUID(),
        loteId: crypto.randomUUID(),
        fecha: '2026-10-10',
        tipo: 'VIENTO',
        cantidadEstimadaKg: 200,
        superficieAfectadaHa: 0,
        descripcion: 'Viento zonda con caída de fruta',
        fechaReferenciaHoy: hoyRef,
      })
    ).toThrow(PerdidaCosechaInvalidaError);
  });

  it('debe rechazar fechas futuras para el registro de pérdidas (RN-04)', () => {
    expect(() =>
      PerdidaCosecha.crear({
        id: crypto.randomUUID(),
        loteId: crypto.randomUUID(),
        fecha: '2026-10-25', // posterior a hoyRef (2026-10-15)
        tipo: 'PLAGA',
        cantidadEstimadaKg: 500,
        descripcion: 'Ataque de mosca de los frutos',
        fechaReferenciaHoy: hoyRef,
      })
    ).toThrow(FechaFuturaInvalidaError);
  });

  it('debe exigir loteId y descripción no vacíos', () => {
    expect(() =>
      PerdidaCosecha.crear({
        id: crypto.randomUUID(),
        loteId: '',
        fecha: '2026-10-10',
        tipo: 'ROBO',
        cantidadEstimadaKg: 300,
        descripcion: 'Sustracción de fruta cosechada',
        fechaReferenciaHoy: hoyRef,
      })
    ).toThrow(PerdidaCosechaInvalidaError);

    expect(() =>
      PerdidaCosecha.crear({
        id: crypto.randomUUID(),
        loteId: crypto.randomUUID(),
        fecha: '2026-10-10',
        tipo: 'ROBO',
        cantidadEstimadaKg: 300,
        descripcion: '   ',
        fechaReferenciaHoy: hoyRef,
      })
    ).toThrow(PerdidaCosechaInvalidaError);
  });

  it('debe reconstituir correctamente desde toJSON()', () => {
    const original = PerdidaCosecha.crear({
      id: crypto.randomUUID(),
      cosechaId: crypto.randomUUID(),
      loteId: crypto.randomUUID(),
      cicloId: crypto.randomUUID(),
      fecha: '2026-10-08',
      tipo: 'ENFERMEDAD',
      cantidadEstimadaKg: 1200,
      superficieAfectadaHa: 1.8,
      descripcion: 'Monilia post-cosecha en fruta almacenada temporalmente',
      responsableRegistroId: crypto.randomUUID(),
      fechaReferenciaHoy: hoyRef,
    });

    const json = original.toJSON();
    const reconstituida = PerdidaCosecha.reconstituir(json);

    expect(reconstituida.id).toBe(original.id);
    expect(reconstituida.cosechaId).toBe(original.cosechaId);
    expect(reconstituida.loteId).toBe(original.loteId);
    expect(reconstituida.tipo).toBe('ENFERMEDAD');
    expect(reconstituida.cantidadEstimadaKg).toBe(1200);
    expect(reconstituida.superficieAfectadaHa).toBe(1.8);
    expect(reconstituida.descripcion).toBe(original.descripcion);
  });
});
