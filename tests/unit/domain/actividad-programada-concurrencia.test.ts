import { describe, expect, it } from 'vitest';
import { ActividadProgramada } from '../../../src/core/domain/entities/actividad-programada.entity.js';

describe('P2: token opaco de lectura', () => {
  const nueva = () => ActividadProgramada.programar({ id: 'actividad', cicloId: 'ciclo', tipoActividadId: 'tipo',
    responsableId: 'responsable', fechaProgramada: '2026-10-15' });

  it('el alta no simula una versión persistida', () => {
    expect(nueva().versionPersistida).toBeUndefined();
  });

  it('reprogramar y cancelar mantienen la versión del registro leído', () => {
    const leida = ActividadProgramada.reconstituir(nueva().toJSON(), 'revision-leida');
    expect(leida.reprogramar({ fechaProgramada: '2026-10-20' }).versionPersistida).toBe('revision-leida');
    expect(leida.cancelar('Lluvia').versionPersistida).toBe('revision-leida');
    expect(leida.fechaProgramada).toBe('2026-10-15'); expect(leida.estado).toBe('PENDIENTE');
  });

  it('la versión no se serializa en el contrato HTTP ni altera datos históricos', () => {
    const props = { ...nueva().toJSON(), tipoActividadId: null, responsableId: null, fechaProgramada: null };
    const leida = ActividadProgramada.reconstituir(props, 'revision-historica');
    expect(leida.toJSON()).toEqual(props);
    expect(leida.cancelar('No se realizará').versionPersistida).toBe('revision-historica');
    expect(leida.toJSON()).not.toHaveProperty('versionPersistida');
  });
});
