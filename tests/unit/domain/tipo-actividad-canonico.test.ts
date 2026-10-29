import { describe, it, expect } from 'vitest';
import {
  TipoActividad,
  TipoActividadInvalidoError,
} from '../../../src/core/domain/entities/tipo-actividad-canonico.entity.js';

describe('Dominio: TipoActividad (CU22–CU25 / AGRUL-054)', () => {
  const id = crypto.randomUUID();
  const cultivoId = crypto.randomUUID();

  it('crea un TipoActividad válido en estado ACTIVA por defecto', () => {
    const tipo = TipoActividad.crear({
      id,
      nombre: ' Poda de Verano ',
      categoria: 'MANTENIMIENTO',
      descripcion: 'Poda de aclareo e iluminación',
      cultivoIds: [cultivoId],
    });

    expect(tipo.id).toBe(id);
    expect(tipo.nombre).toBe('Poda de Verano');
    expect(tipo.categoria).toBe('MANTENIMIENTO');
    expect(tipo.descripcion).toBe('Poda de aclareo e iluminación');
    expect(tipo.estado).toBe('ACTIVA');
    expect(tipo.cultivoIds).toEqual([cultivoId]);
  });

  it('rechaza nombre vacío o de solo espacios', () => {
    expect(() => {
      TipoActividad.crear({
        id,
        nombre: '   ',
        categoria: 'RIEGO',
        descripcion: null,
      });
    }).toThrow(TipoActividadInvalidoError);
  });

  it('rechaza nombre de más de 40 caracteres', () => {
    expect(() => {
      TipoActividad.crear({
        id,
        nombre: 'A'.repeat(41),
        categoria: 'RIEGO',
        descripcion: null,
      });
    }).toThrow(TipoActividadInvalidoError);
  });

  it('rechaza categoría inválida', () => {
    expect(() => {
      TipoActividad.reconstituir({
        id,
        nombre: 'Riego',
        // @ts-expect-error probando valor inválido en runtime
        categoria: 'CATEGORIA_INEXISTENTE',
        descripcion: null,
        estado: 'ACTIVA',
        cultivoIds: [],
      });
    }).toThrow(TipoActividadInvalidoError);
  });

  it('permite desactivar conservando la integridad de datos', () => {
    const tipo = TipoActividad.reconstituir({
      id,
      nombre: 'Fertirriego',
      categoria: 'FERTILIZACION',
      descripcion: null,
      estado: 'INACTIVA',
      cultivoIds: [cultivoId],
    });

    expect(tipo.estado).toBe('INACTIVA');
    expect(tipo.toJSON()).toEqual({
      id,
      nombre: 'Fertirriego',
      categoria: 'FERTILIZACION',
      descripcion: null,
      estado: 'INACTIVA',
      cultivoIds: [cultivoId],
    });
  });
});
