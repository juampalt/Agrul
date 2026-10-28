import { describe, expect, it } from 'vitest';
import { Cultivo, CultivoInvalidoError } from '../../../src/core/domain/entities/cultivo.entity.js';

describe('Cultivo (AGRUL-052)', () => {
  const datos = { id: 'cultivo', nombre: ' Arándano ', tipoCicloVida: 'PERENNE' as const, descripcion: null };

  it('nace activo con nombre normalizado y devuelve una copia de sus datos', () => {
    const cultivo = Cultivo.crear(datos);
    const json = cultivo.toJSON();
    expect(json).toMatchObject({ nombre: 'Arándano', estado: 'ACTIVO' });
    json.estado = 'INACTIVO';
    expect(cultivo.toJSON().estado).toBe('ACTIVO');
  });

  it.each(['', '   ', 'x'.repeat(41)])('rechaza el nombre inválido %j', (nombre) => {
    expect(() => Cultivo.crear({ ...datos, nombre })).toThrow(CultivoInvalidoError);
  });

  it('reconstituye un cultivo inactivo preservando identidad y descripción', () => {
    expect(Cultivo.reconstituir({ ...datos, estado: 'INACTIVO' }).toJSON())
      .toEqual({ ...datos, nombre: 'Arándano', estado: 'INACTIVO' });
  });
});
