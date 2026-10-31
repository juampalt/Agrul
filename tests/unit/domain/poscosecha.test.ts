import { describe, expect, it } from 'vitest';
import { RegistrarClasificacion, validarAcondicionamiento, validarClasificacion } from '../../../src/core/domain/entities/poscosecha.js';

const hoy = new Date('2026-10-30T12:00:00Z');
const clasificacion: RegistrarClasificacion = { operacionId: 'operacion', cosechaId: 'cosecha', fechaClasificacion: '2026-10-16',
  cantidadRecibidaKg: 0.3, kgFresco: 0.1, kgIndustria: 0.2, kgDescarte: 0, motivosDescarte: [], responsableId: 'responsable' };
const acondicionamiento = { operacionId: 'operacion', partidaProduccionId: 'partida', fechaAcondicionamiento: '2026-10-17',
  tipoAcondicionamiento: ' Empaque ', tipoEnvase: ' Bandeja ', cantidadKg: 0.3, cantidadEnvases: 2, responsableId: 'responsable' };
describe('RN-20–RN-22: balance exacto y acondicionamiento', () => {
  it('acepta 0.10 + 0.20 = 0.30 sin tolerancias de punto flotante', () => {
    expect(validarClasificacion(clasificacion, hoy)).toEqual({ ...clasificacion, descartePorCausa: null, observaciones: null });
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
    expect(validarAcondicionamiento(acondicionamiento, hoy)).toEqual({ ...acondicionamiento, tipoAcondicionamiento: 'Empaque', tipoEnvase: 'Bandeja', observaciones: null });
  });
  it.each([0, -1, 0.001, 100000000])('rechaza acondicionamiento de %s kg', cantidadKg => {
    expect(() => validarAcondicionamiento({ ...acondicionamiento, cantidadKg }, hoy)).toThrow();
  });
  it.each([0, -1, 1.5, 2147483648])('rechaza cantidad de envases %s', cantidadEnvases => {
    expect(() => validarAcondicionamiento({ ...acondicionamiento, cantidadEnvases }, hoy)).toThrow();
  });
  it('CU49: el envase y su cantidad son opcionales', () => {
    const datos = validarAcondicionamiento({ ...acondicionamiento, tipoEnvase: ' ', cantidadEnvases: null }, hoy);
    expect(datos).toMatchObject({ tipoEnvase: 'Sin especificar', cantidadEnvases: null });
  });
  it('CU47: los kg por causa deben sumar el descarte total', () => {
    const base = { ...clasificacion, kgFresco: 0, kgIndustria: 0.1, kgDescarte: 0.2 };
    const ok = validarClasificacion({ ...base, motivosDescarte: [], descartePorCausa: [{ causa: 'Golpes', kg: 0.1 }, { causa: 'Plaga', kg: 0.1 }] }, hoy);
    expect(ok.motivosDescarte).toEqual(['Golpes', 'Plaga']);
    expect(ok.descartePorCausa).toEqual([{ causa: 'Golpes', kg: 0.1 }, { causa: 'Plaga', kg: 0.1 }]);
    expect(() => validarClasificacion({ ...base, motivosDescarte: [], descartePorCausa: [{ causa: 'Golpes', kg: 0.1 }] }, hoy)).toThrow();
    expect(() => validarClasificacion({ ...base, motivosDescarte: ['Golpes', 'Plaga'] }, hoy)).toThrow();
    expect(() => validarClasificacion({ ...base, motivosDescarte: [], descartePorCausa: [{ causa: 'Golpes', kg: 0.1 }, { causa: 'golpes', kg: 0.1 }] }, hoy)).toThrow();
    expect(validarClasificacion({ ...base, motivosDescarte: ['Golpes'] }, hoy).descartePorCausa).toEqual([{ causa: 'Golpes', kg: 0.2 }]);
  });
  it('requiere preparación y responsable', () => {
    expect(() => validarAcondicionamiento({ ...acondicionamiento, responsableId: '' }, hoy)).toThrow();
  });
});
