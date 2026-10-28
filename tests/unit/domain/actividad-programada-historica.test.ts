import { describe, expect, it } from 'vitest';
import { ActividadProgramada, ActividadProgramadaInvalidaError, ActividadProgramadaProps,
  EstadoActividadInvalidoError, EstadoActividadProgramada } from '../../../src/core/domain/entities/actividad-programada.entity.js';

describe('P1: reconstrucción histórica de programaciones', () => {
  const historica = (estado: EstadoActividadProgramada = 'PENDIENTE'): ActividadProgramadaProps => ({
    id: 'historica', cicloId: 'ciclo', tipoActividadId: null, responsableId: null, fechaProgramada: null,
    superficiePrevista: null, descripcion: null, estado, motivoCancelacion: null,
    creadoEn: '2026-10-01T00:00:00.000Z', actualizadoEn: '2026-10-01T00:00:00.000Z',
  });

  it.each(['PENDIENTE', 'EJECUTADA', 'CANCELADA'] as const)('recupera %s sin inventar tipo, fecha, responsable o motivo', estado => {
    const datos = historica(estado);
    const actividad = ActividadProgramada.reconstituir(datos);
    expect(actividad.toJSON()).toEqual(datos);
    expect(actividad.tipoActividadId).toBeNull(); expect(actividad.responsableId).toBeNull(); expect(actividad.fechaProgramada).toBeNull();
    datos.descripcion = 'Cambio externo';
    expect(actividad.descripcion).toBeNull();
  });

  it.each([null, '', '  Motivo original  '])('conserva literalmente el motivo histórico %s', motivoCancelacion => {
    const datos = { ...historica('CANCELADA'), motivoCancelacion, descripcion: '  Descripción original  ' };
    expect(ActividadProgramada.reconstituir(datos).toJSON()).toEqual(datos);
  });

  it('cancela un pendiente antiguo con motivo nuevo sin completar datos desconocidos', () => {
    const original = ActividadProgramada.reconstituir(historica());
    const cancelada = original.cancelar('  No se realizará  ');
    expect(cancelada.toJSON()).toMatchObject({ ...historica(), estado: 'CANCELADA', motivoCancelacion: 'No se realizará', actualizadoEn: expect.any(String) });
    expect(original.estado).toBe('PENDIENTE');
    expect(() => original.cancelar(' ')).toThrow(ActividadProgramadaInvalidaError);
  });

  it('reprograma únicamente los valores explícitos y mantiene el resto como desconocido', () => {
    const original = ActividadProgramada.reconstituir(historica());
    expect(original.reprogramar({ fechaProgramada: '2026-11-15' }).toJSON())
      .toMatchObject({ fechaProgramada: '2026-11-15', responsableId: null, tipoActividadId: null });
    expect(() => original.reprogramar({ fechaProgramada: '2026-02-30' })).toThrow(ActividadProgramadaInvalidaError);
    expect(() => original.reprogramar({ fechaProgramada: '2026-11-15', responsableId: '' })).toThrow(ActividadProgramadaInvalidaError);
  });

  it('no permite nuevas transiciones de un histórico ya cancelado', () => {
    const cancelada = ActividadProgramada.reconstituir(historica('CANCELADA'));
    expect(() => cancelada.cancelar('Motivo nuevo')).toThrow(EstadoActividadInvalidoError);
    expect(() => cancelada.reprogramar({ fechaProgramada: '2026-11-15' })).toThrow(EstadoActividadInvalidoError);
  });

  it('mantiene obligatorios tipo, fecha y responsable para altas nuevas', () => {
    const datos = { id: 'nueva', cicloId: 'ciclo', tipoActividadId: 'tipo', responsableId: 'usuario', fechaProgramada: '2026-11-15' };
    for (const cambio of [{ tipoActividadId: '' }, { responsableId: '' }, { fechaProgramada: '' }]) {
      expect(() => ActividadProgramada.programar({ ...datos, ...cambio })).toThrow(ActividadProgramadaInvalidaError);
    }
  });

  it('sigue exigiendo identidad y ciclo para recuperar una fila', () => {
    expect(() => ActividadProgramada.reconstituir({ ...historica(), id: '' })).toThrow(ActividadProgramadaInvalidaError);
    expect(() => ActividadProgramada.reconstituir({ ...historica(), cicloId: '' })).toThrow(ActividadProgramadaInvalidaError);
  });
});
