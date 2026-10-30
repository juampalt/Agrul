import { describe, expect, it } from 'vitest';
import { PartidaParaConsumo, RegistrarAplicacionInsumos, planificarConsumo, validarAplicacionInsumos } from '../../../src/core/domain/entities/aplicacion-insumos.js';

const partida = (id: string, cantidadDisponible: string, fechaVencimiento: string | null, fechaIngreso = '2026-10-01'): PartidaParaConsumo => ({ id, cantidadDisponible, fechaVencimiento, fechaIngreso });
describe('AGRUL-055: planificación de consumo y aplicación', () => {
  it('consume vencimiento más próximo, luego ingreso y UUID; deja sin vencimiento al final', () => {
    const partidas = [partida('sin', '10.00', null), partida('lejano', '10.00', '2099-02-01'),
      partida('b', '1.00', '2099-01-01'), partida('a', '1.00', '2099-01-01'), partida('antes', '1.00', '2099-01-01', '2026-09-01')];
    const copia = [...partidas];
    expect(planificarConsumo(partidas, 3.5)).toEqual([{ partidaId: 'antes', cantidad: '1.00' }, { partidaId: 'a', cantidad: '1.00' },
      { partidaId: 'b', cantidad: '1.00' }, { partidaId: 'lejano', cantidad: '0.50' }]);
    expect(partidas).toEqual(copia);
    expect(planificarConsumo(partidas, 14).at(-1)).toEqual({ partidaId: 'sin', cantidad: '1.00' });
  });
  it('resuelve cantidades decimales y límites sin errores de punto flotante', () => {
    expect(planificarConsumo([partida('a', '0.10', null), partida('b', '0.20', null)], 0.3)).toEqual([
      { partidaId: 'a', cantidad: '0.10' }, { partidaId: 'b', cantidad: '0.20' }]);
    expect(planificarConsumo([partida('a', '99999999.99', null)], 99999999.99)[0].cantidad).toBe('99999999.99');
  });
  it('rechaza un plan parcial si falta stock', () => {
    expect(() => planificarConsumo([partida('a', '1.00', null)], 1.01)).toThrow('Stock utilizable insuficiente');
  });
  const datos: RegistrarAplicacionInsumos = { operacionId: 'op', actividadRealizadaId: 'labor', superficieTratada: 1,
    metodoAplicacion: 'Manual', motivoAplicacion: 'Fertilización', observaciones: null,
    items: [{ insumoId: 'insumo', cantidad: 1, unidadMedida: 'kg', dosis: 1 }] };
  it('acepta los datos canónicos', () => { expect(() => validarAplicacionInsumos(datos)).not.toThrow(); });
  it.each([0, -1, NaN, Infinity, 0.001, 1e-10, 1000000])('rechaza superficie inválida %s', superficieTratada => {
    expect(() => validarAplicacionInsumos({ ...datos, superficieTratada })).toThrow();
  });
  it.each([0, -1, 0.001, 1000000])('rechaza dosis inválida %s', dosis => {
    expect(() => validarAplicacionInsumos({ ...datos, items: [{ ...datos.items[0], dosis }] })).toThrow();
  });
  it('rechaza arrays vacíos, insumos duplicados y datos requeridos vacíos', () => {
    expect(() => validarAplicacionInsumos({ ...datos, items: [] })).toThrow();
    expect(() => validarAplicacionInsumos({ ...datos, items: [datos.items[0], datos.items[0]] })).toThrow();
    expect(() => validarAplicacionInsumos({ ...datos, metodoAplicacion: '' })).toThrow();
    expect(() => validarAplicacionInsumos({ ...datos, items: [{ ...datos.items[0], unidadMedida: '' }] })).toThrow();
  });
});
