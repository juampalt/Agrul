import { describe, expect, it } from 'vitest';
import { RegistrarClasificacion, validarAcondicionamiento, validarClasificacion } from '../../../src/core/domain/entities/poscosecha.js';

const hoy = new Date('2026-10-30T12:00:00Z');
const clasificacion: RegistrarClasificacion = { operacionId: 'operacion', cosechaId: 'cosecha', fechaClasificacion: '2026-10-16',
  cantidadRecibidaKg: 0.3, kgFresco: 0.1, kgIndustria: 0.2, kgDescarte: 0, motivosDescarte: [], responsableId: 'responsable' };
const acondicionamiento = { operacionId: 'operacion', partidaProduccionId: 'partida', fechaAcondicionamiento: '2026-10-17',
  tipoAcondicionamiento: ' Empaque ', tipoEnvase: ' Bandeja ', cantidadKg: 0.3, cantidadEnvases: 2, responsableId: 'responsable' };
describe('RN-20–RN-22: balance exacto y acondicionamiento', () => {
  it('acepta 0.10 + 0.20 = 0.30 sin tolerancias de punto flotante', () => {
    expect(validarClasificacion(clasificacion, hoy)).toEqual(clasificacion);
  });
  it('acepta recepción totalmente descartada con causas, sin inventar fruta aprovechable', () => {
    const datos = { ...clasificacion, kgFresco: 0, kgIndustria: 0, kgDescarte: 0.3, motivosDescarte: ['  Golpes  '] };
    expect(validarClasificacion(datos, hoy).motivosDescarte).toEqual(['Golpes']);
  });
  it.each([0, -1, 0.301, 0.1 + 0.2, Infinity, NaN, 100000000])('rechaza recepción inválida %s', cantidadRecibidaKg => {
    expect(() => validarClasificacion({ ...clasificacion, cantidadRecibidaKg }, hoy)).toThrow();
  });
  it.each([0.09, 0.11, -0.1])('rechaza el desbalance o cantidad negativa fresco=%s', kgFresco => {
    expect(() => validarClasificacion({ ...clasificacion, kgFresco }, hoy)).toThrow();
  });
  it('rechaza descarte sin causa y no modifica las causas originales', () => {
    expect(() => validarClasificacion({ ...clasificacion, kgFresco: 0, kgDescarte: 0.1 }, hoy)).toThrow();
    expect(() => validarClasificacion({ ...clasificacion, motivosDescarte: [' '] }, hoy)).toThrow();
    expect(clasificacion.motivosDescarte).toEqual([]);
  });
  it.each(['2026-02-30', '9999-01-01'])('rechaza fecha de clasificación %s', fechaClasificacion => {
    expect(() => validarClasificacion({ ...clasificacion, fechaClasificacion }, hoy)).toThrow();
  });
  it('normaliza preparación/envase sin cambiar los kilos ni deducir peso por envase', () => {
    expect(validarAcondicionamiento(acondicionamiento, hoy)).toEqual({ ...acondicionamiento, tipoAcondicionamiento: 'Empaque', tipoEnvase: 'Bandeja' });
  });
  it.each([0, -1, 0.001, 100000000])('rechaza acondicionamiento de %s kg', cantidadKg => {
    expect(() => validarAcondicionamiento({ ...acondicionamiento, cantidadKg }, hoy)).toThrow();
  });
  it.each([0, -1, 1.5, 2147483648])('rechaza cantidad de envases %s', cantidadEnvases => {
    expect(() => validarAcondicionamiento({ ...acondicionamiento, cantidadEnvases }, hoy)).toThrow();
  });
  it('requiere preparación, envase y responsable', () => {
    expect(() => validarAcondicionamiento({ ...acondicionamiento, tipoEnvase: ' ' }, hoy)).toThrow();
    expect(() => validarAcondicionamiento({ ...acondicionamiento, responsableId: '' }, hoy)).toThrow();
  });
});
