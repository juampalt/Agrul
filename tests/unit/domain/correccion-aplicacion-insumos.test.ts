import { describe, expect, it } from 'vitest';
import { CorregirAplicacionInsumos, validarCorreccionAplicacion } from '../../../src/core/domain/entities/correccion-aplicacion-insumos.js';

const datos: CorregirAplicacionInsumos = { operacionId: 'op', motivoCorreccion: 'Error de cantidad verificado',
  nuevaAplicacion: { actividadRealizadaId: 'labor', superficieTratada: 1, metodoAplicacion: 'Manual', motivoAplicacion: 'Fertilización',
    observaciones: null, items: [{ insumoId: 'insumo', cantidad: 1, unidadMedida: 'kg', dosis: 1 }] } };
describe('AGRUL-055 CU40: contrato de corrección', () => {
  it('admite un motivo explícito y una nueva versión válida', () => { expect(() => validarCorreccionAplicacion(datos)).not.toThrow(); });
  it.each(['', ' ', 'x'.repeat(2001)])('rechaza motivo inválido', motivoCorreccion => {
    expect(() => validarCorreccionAplicacion({ ...datos, motivoCorreccion })).toThrow();
  });
  it('valida las cantidades de la versión reemplazante', () => {
    expect(() => validarCorreccionAplicacion({ ...datos, nuevaAplicacion: { ...datos.nuevaAplicacion, items: [] } })).toThrow();
    expect(() => validarCorreccionAplicacion({ ...datos, nuevaAplicacion: { ...datos.nuevaAplicacion, superficieTratada: 0 } })).toThrow();
  });
});
