import { describe, expect, it } from 'vitest';
import { ActividadProgramada, ActividadProgramadaInvalidaError } from '../../../src/core/domain/entities/actividad-programada.entity.js';
import { ProgramarActividadSchema } from '../../../src/infrastructure/http/schemas/actividades-programadas.schema.js';

const datos = {
  id: 'a0000000-0000-4000-8000-000000000054',
  cicloId: 'b0000000-0000-4000-8000-000000000054',
  tipoActividadId: 'c0000000-0000-4000-8000-000000000054',
  responsableId: 'd0000000-0000-4000-8000-000000000054',
  fechaProgramada: '2026-11-15',
};
const { id: _id, ...solicitud } = datos;

describe('Superficie prevista sin redondeos', () => {
  it.each([0.01, 0.1, 0.29, 0.3, 1, 1.2, 1.23, 999999.98, 999999.99])('conserva exactamente %s ha', (superficiePrevista) => {
    expect(ActividadProgramada.programar({ ...datos, superficiePrevista }).toJSON().superficiePrevista).toBe(superficiePrevista);
    expect(ProgramarActividadSchema.parse({ ...solicitud, superficiePrevista }).superficiePrevista).toBe(superficiePrevista);
  });

  it.each([0, -0, -1, 0.001, 0.004, 0.005, 0.009, 1e-10, Number.MIN_VALUE, 0.1 + 0.2, 999999.999, 1000000, 1e20, NaN, Infinity, -Infinity])('rechaza %s ha en dominio y contrato HTTP', (superficiePrevista) => {
    expect(() => ActividadProgramada.programar({ ...datos, superficiePrevista })).toThrow(ActividadProgramadaInvalidaError);
    expect(ProgramarActividadSchema.safeParse({ ...solicitud, superficiePrevista }).success).toBe(false);
  });

  it.each([null, undefined])('conserva superficie desconocida %s como null', (superficiePrevista) => {
    expect(ActividadProgramada.programar({ ...datos, superficiePrevista }).toJSON().superficiePrevista).toBeNull();
    expect(ProgramarActividadSchema.safeParse({ ...solicitud, superficiePrevista }).success).toBe(true);
  });

  it('rechaza cadenas sin convertirlas a números', () => {
    expect(ProgramarActividadSchema.safeParse({ ...solicitud, superficiePrevista: '1.23' }).success).toBe(false);
  });
});
