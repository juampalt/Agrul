import { describe, it, expect } from 'vitest';
import { ObservacionMeteorologica } from '../../../src/core/domain/entities/observacion-meteorologica.entity.js';
import {
  ObservacionMeteorologicaInvalidaError,
  FechaFuturaInvalidaError,
} from '../../../src/core/domain/errors/domain.error.js';

describe('Dominio: ObservacionMeteorologica (Módulo 10 SGTA / RN-28)', () => {
  const fincaValidaId = '11111111-1111-1111-1111-111111111111';
  const fechaHoy = new Date('2026-10-27T10:00:00.000Z');

  it('debe crear una observación meteorológica con valores físicos válidos dentro de rangos', () => {
    const obs = ObservacionMeteorologica.crear(
      {
        fincaId: fincaValidaId,
        fechaHoraObservacion: '2026-10-27T08:30:00.000Z',
        temperaturaC: 22.4,
        humedadRelativa: 68.5,
        precipitacionesMm: 12.0,
        observaciones: 'Llovizna matutina en Lules',
      },
      fechaHoy
    );

    expect(obs.id).toBeDefined();
    expect(obs.fincaId).toBe(fincaValidaId);
    expect(obs.fechaHoraObservacion).toBe('2026-10-27T08:30:00.000Z');
    expect(obs.temperaturaC).toBe(22.4);
    expect(obs.humedadRelativa).toBe(68.5);
    expect(obs.precipitacionesMm).toBe(12.0);
    expect(obs.observaciones).toBe('Llovizna matutina en Lules');
  });

  it('debe rechazar si falta el fincaId', () => {
    expect(() =>
      ObservacionMeteorologica.crear(
        {
          fincaId: '   ',
          fechaHoraObservacion: '2026-10-27T08:30:00.000Z',
          temperaturaC: 20,
          humedadRelativa: 50,
          precipitacionesMm: 0,
        },
        fechaHoy
      )
    ).toThrow(ObservacionMeteorologicaInvalidaError);
  });

  it('debe rechazar si la fecha y hora de observación es futura respecto al momento de carga', () => {
    expect(() =>
      ObservacionMeteorologica.crear(
        {
          fincaId: fincaValidaId,
          fechaHoraObservacion: '2026-10-27T12:00:00.000Z', // 2 horas en el futuro
          temperaturaC: 20,
          humedadRelativa: 50,
          precipitacionesMm: 0,
        },
        fechaHoy
      )
    ).toThrow(FechaFuturaInvalidaError);
  });

  it('debe rechazar humedad relativa negativa (RN-28)', () => {
    expect(() =>
      ObservacionMeteorologica.crear(
        {
          fincaId: fincaValidaId,
          fechaHoraObservacion: '2026-10-27T08:30:00.000Z',
          temperaturaC: 25,
          humedadRelativa: -5,
          precipitacionesMm: 0,
        },
        fechaHoy
      )
    ).toThrow(ObservacionMeteorologicaInvalidaError);
  });

  it('debe rechazar humedad relativa superior a 100% (RN-28)', () => {
    expect(() =>
      ObservacionMeteorologica.crear(
        {
          fincaId: fincaValidaId,
          fechaHoraObservacion: '2026-10-27T08:30:00.000Z',
          temperaturaC: 25,
          humedadRelativa: 100.5,
          precipitacionesMm: 0,
        },
        fechaHoy
      )
    ).toThrow(ObservacionMeteorologicaInvalidaError);
  });

  it('debe rechazar precipitaciones negativas (RN-28)', () => {
    expect(() =>
      ObservacionMeteorologica.crear(
        {
          fincaId: fincaValidaId,
          fechaHoraObservacion: '2026-10-27T08:30:00.000Z',
          temperaturaC: 25,
          humedadRelativa: 70,
          precipitacionesMm: -1.0,
        },
        fechaHoy
      )
    ).toThrow(ObservacionMeteorologicaInvalidaError);
  });

  it('debe rechazar temperaturas fuera del rango físico plausible (-50°C a 65°C)', () => {
    expect(() =>
      ObservacionMeteorologica.crear(
        {
          fincaId: fincaValidaId,
          fechaHoraObservacion: '2026-10-27T08:30:00.000Z',
          temperaturaC: 75.0,
          humedadRelativa: 40,
          precipitacionesMm: 0,
        },
        fechaHoy
      )
    ).toThrow(ObservacionMeteorologicaInvalidaError);
  });

  it('debe permitir reconstituir una observación previa sin validaciones restrictivas', () => {
    const obs = ObservacionMeteorologica.reconstituir({
      id: 'obs-1',
      fincaId: fincaValidaId,
      fechaHoraObservacion: '2026-10-26T18:00:00.000Z',
      temperaturaC: 18.0,
      humedadRelativa: 80,
      precipitacionesMm: 5.0,
      observaciones: null,
      responsableId: null,
      creadoEn: '2026-10-26T18:05:00.000Z',
      actualizadoEn: '2026-10-26T18:05:00.000Z',
    });

    expect(obs.id).toBe('obs-1');
    expect(obs.temperaturaC).toBe(18.0);
  });
});
