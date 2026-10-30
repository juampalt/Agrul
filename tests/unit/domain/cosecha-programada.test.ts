import { describe, expect, it } from 'vitest';
import {
  cancelarJornadaCosecha, esEstimacionKgValida, esFechaCosechaValida, JornadaCosecha,
  reprogramarCosecha, validarProgramacionCosecha,
} from '../../../src/core/domain/entities/cosecha-programada.entity.js';

const jornada: JornadaCosecha = {
  id: 'jornada', cicloId: 'ciclo', responsableId: 'responsable', fechaPrevista: '2026-11-01',
  sector: 'Norte', cantidadEstimadaKg: 100.25, estado: 'PENDIENTE', motivoCancelacion: null,
  version: 1, actualizadoPor: 'actor', creadoEn: '2026-10-29T12:00:00Z', actualizadoEn: '2026-10-29T12:00:00Z',
};
describe('Jornadas de cosecha: estimaciones separadas y transiciones', () => {
  it.each([0, 0.01, 0.29, 100.25, 99999999.99])('conserva la estimación %s sin redondear', cantidadEstimadaKg => {
    expect(validarProgramacionCosecha({ ...jornada, cantidadEstimadaKg }).cantidadEstimadaKg).toBe(cantidadEstimadaKg);
  });
  it.each([-1, 0.001, 0.1 + 0.2, 1e-10, 100000000, Infinity, NaN])('rechaza estimación inválida %s', cantidadEstimadaKg => {
    expect(esEstimacionKgValida(cantidadEstimadaKg)).toBe(false);
    expect(() => validarProgramacionCosecha({ ...jornada, cantidadEstimadaKg })).toThrow();
  });
  it.each(['2026-02-30', '2026-13-01', '2026-1-01', '0000-01-01', '2026-11-01T00:00:00Z'])('rechaza fecha inexistente o no canónica %s', fecha => {
    expect(esFechaCosechaValida(fecha)).toBe(false);
  });
  it('reprograma sin cambiar ciclo, sector ni estimación y conserva el objeto anterior', () => {
    const nueva = reprogramarCosecha(jornada, { fechaPrevista: '2028-02-29', responsableId: 'otro' });
    expect(nueva).toEqual({ ...jornada, fechaPrevista: '2028-02-29', responsableId: 'otro' });
    expect(jornada.fechaPrevista).toBe('2026-11-01');
  });
  it('cancela con motivo y conserva la programación original', () => {
    const cancelada = cancelarJornadaCosecha(jornada, '  Lluvia  ');
    expect(cancelada).toEqual({ ...jornada, estado: 'CANCELADA', motivoCancelacion: 'Lluvia' });
    expect(() => reprogramarCosecha(cancelada, { fechaPrevista: '2026-11-02' })).toThrow();
    expect(() => cancelarJornadaCosecha(cancelada, 'Otra vez')).toThrow();
  });
  it('no permite cancelar sin motivo ni reprogramar una jornada ejecutada', () => {
    expect(() => cancelarJornadaCosecha(jornada, ' ')).toThrow();
    expect(() => reprogramarCosecha({ ...jornada, estado: 'EJECUTADA' }, { fechaPrevista: '2026-11-02' })).toThrow();
  });
});
