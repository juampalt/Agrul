import { describe, expect, it } from 'vitest';
import { RegistrarCosecha, validarPesajeCosecha } from '../../../src/core/domain/entities/cosecha-registrada.js';

const datos: RegistrarCosecha = { operacionId: 'operacion', origen: 'NO_PROGRAMADA', cicloId: 'ciclo',
  numeroPasada: 1, sector: ' Norte ', cantidadCosechadaKg: 10.25, responsableId: 'responsable', fechaEfectiva: '2026-10-15' };
const hoy = new Date('2026-10-29T12:00:00Z');
describe('Pesajes reales separados de estimaciones y clasificación', () => {
  it.each([0.01, 0.29, 10.25, 99999999.99])('conserva exactamente %s kg reales', cantidadCosechadaKg => {
    expect(validarPesajeCosecha({ ...datos, cantidadCosechadaKg }, hoy)).toEqual({ ...datos, cantidadCosechadaKg, sector: 'Norte' });
  });
  it.each([0, -1, 0.001, 0.1 + 0.2, 100000000, Infinity, NaN])('rechaza el pesaje %s sin redondearlo', cantidadCosechadaKg => {
    expect(() => validarPesajeCosecha({ ...datos, cantidadCosechadaKg }, hoy)).toThrow();
  });
  it.each([0, -1, 1.5, 2147483648])('rechaza pasada %s', numeroPasada => {
    expect(() => validarPesajeCosecha({ ...datos, numeroPasada }, hoy)).toThrow();
  });
  it.each(['2026-02-30', '2026-10-30', '0000-01-01'])('rechaza fecha inválida o futura %s', fechaEfectiva => {
    expect(() => validarPesajeCosecha({ ...datos, fechaEfectiva }, hoy)).toThrow();
  });
  it('distingue el día local de UTC y conserva la captura informada', () => {
    const captura = '2026-10-28T22:59:00-03:00';
    expect(() => validarPesajeCosecha({ ...datos, fechaEfectiva: '2026-10-29' }, new Date('2026-10-29T01:00:00Z'))).toThrow();
    expect(validarPesajeCosecha({ ...datos, timestampCapturaLocal: captura }, hoy).timestampCapturaLocal).toBe(captura);
  });
  it('requiere responsable, sector y una captura válida si se informa', () => {
    expect(() => validarPesajeCosecha({ ...datos, responsableId: '' }, hoy)).toThrow();
    expect(() => validarPesajeCosecha({ ...datos, sector: ' ' }, hoy)).toThrow();
    expect(() => validarPesajeCosecha({ ...datos, timestampCapturaLocal: 'inválida' }, hoy)).toThrow();
  });
});
