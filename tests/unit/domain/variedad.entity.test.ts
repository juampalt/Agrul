import { describe, expect, it } from 'vitest';
import { Variedad, VariedadInvalidaError } from '../../../src/core/domain/entities/variedad.entity.js';

describe('Variedad (AGRUL-052)', () => {
  const datos = { id: 'variedad', cultivoId: 'cultivo', nombre: ' Emerald ', descripcion: null };

  it('nace activa, normaliza el nombre y devuelve una copia de los datos', () => {
    const variedad = Variedad.crear(datos);
    const json = variedad.toJSON();
    expect(json).toMatchObject({ nombre: 'Emerald', estado: 'ACTIVO', cultivoId: 'cultivo' });
    json.estado = 'INACTIVO';
    expect(variedad.toJSON().estado).toBe('ACTIVO');
  });

  it.each(['', '   ', 'x'.repeat(41)])('rechaza el nombre inválido %j', (nombre) => {
    expect(() => Variedad.crear({ ...datos, nombre })).toThrow(VariedadInvalidaError);
  });

  it('requiere un cultivo de origen', () => {
    expect(() => Variedad.crear({ ...datos, cultivoId: ' ' })).toThrow(VariedadInvalidaError);
  });

  it('reconstituye el estado inactivo sin perder identidad ni cultivo', () => {
    expect(Variedad.reconstituir({ ...datos, estado: 'INACTIVO' }).toJSON())
      .toEqual({ ...datos, nombre: 'Emerald', estado: 'INACTIVO' });
  });
});
