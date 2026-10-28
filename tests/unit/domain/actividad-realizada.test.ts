import { describe, expect, it } from 'vitest';
import { ActividadProgramada } from '../../../src/core/domain/entities/actividad-programada.entity.js';
import { ActividadRealizada, ContextoEjecucionProgramada } from '../../../src/core/domain/entities/actividad-realizada.entity.js';

describe('CU30: ejecución de una programación', () => {
  const datos = { actividadProgramadaId: 'programada', responsableId: 'usuario', fechaEjecucion: '2026-10-15', superficieTrabajadaHa: 1.25 };
  const hoy = new Date('2026-10-28T15:00:00Z');
  const contexto = (): ContextoEjecucionProgramada => ({
    programada: ActividadProgramada.programar({ id: 'programada', cicloId: 'ciclo', tipoActividadId: 'tipo', responsableId: 'usuario', fechaProgramada: '2026-10-15' }).toJSON(),
    ciclo: { id: 'ciclo', loteId: 'lote', estado: 'ACTIVO', fechaInicio: '2026-10-01', fechaFin: '2026-10-27' },
    responsableActivo: true,
  });

  const datosDirectos = () => {
    const { actividadProgramadaId: _programada, ...comunes } = datos;
    return { ...comunes, cicloId: 'ciclo', tipoActividadId: 'tipo' };
  };
  const contextoDirecto = () => {
    const { programada: _programada, ...comunes } = contexto();
    return { ...comunes, tipoActivo: true };
  };

  it('registra NO_PROGRAMADA con vínculo nulo y mismas reglas de atribución', () => {
    expect(ActividadRealizada.directa('directa', datosDirectos(), contextoDirecto(), hoy).toJSON())
      .toMatchObject({ origen: 'NO_PROGRAMADA', actividadProgramadaId: null, cicloId: 'ciclo', loteId: 'lote', tipoActividadId: 'tipo' });
  });

  it('rechaza tipo inactivo y ciclo inconsistente en el registro directo', () => {
    expect(() => ActividadRealizada.directa('directa', datosDirectos(), { ...contextoDirecto(), tipoActivo: false }, hoy)).toThrow();
    expect(() => ActividadRealizada.directa('directa', { ...datosDirectos(), cicloId: 'otro' }, contextoDirecto(), hoy)).toThrow();
  });

  it.each(['2026-09-30', '2026-02-30', '2099-10-15'])('el registro directo rechaza fecha inválida %s', (fechaEjecucion) => {
    expect(() => ActividadRealizada.directa('directa', { ...datosDirectos(), fechaEjecucion }, contextoDirecto(), hoy)).toThrow();
  });

  it('el registro directo rechaza ciclo no activo, responsable inactivo y superficie no representable', () => {
    const ctx = contextoDirecto();
    expect(() => ActividadRealizada.directa('directa', datosDirectos(), { ...ctx, ciclo: { ...ctx.ciclo, estado: 'FINALIZADO' } }, hoy)).toThrow();
    expect(() => ActividadRealizada.directa('directa', datosDirectos(), { ...ctx, responsableActivo: false }, hoy)).toThrow();
    expect(() => ActividadRealizada.directa('directa', { ...datosDirectos(), superficieTrabajadaHa: 0.001 }, ctx, hoy)).toThrow();
  });

  it('reconstituye hechos históricos sin exigir que el ciclo siga activo', () => {
    const original = ActividadRealizada.directa('directa', datosDirectos(), contextoDirecto(), hoy).toJSON();
    expect(ActividadRealizada.reconstituir(original).toJSON()).toEqual(original);
    expect(ActividadRealizada.reconstituir({ ...original, actividadProgramadaId: 'programada' }).toJSON().origen).toBe('PROGRAMADA');
  });

  it('deriva lote, ciclo y tipo desde la programación y conserva los valores reales', () => {
    expect(ActividadRealizada.desdeProgramada('hecho', datos, contexto(), hoy).toJSON()).toMatchObject({
      ...datos, id: 'hecho', loteId: 'lote', cicloId: 'ciclo', tipoActividadId: 'tipo', duracionHoras: null,
    });
  });

  it.each(['CANCELADA', 'EJECUTADA'] as const)('rechaza programación %s', (estado) => {
    const ctx = contexto(); ctx.programada.estado = estado;
    expect(() => ActividadRealizada.desdeProgramada('hecho', datos, ctx, hoy)).toThrow();
  });

  it.each(['PLANIFICADO', 'FINALIZADO'])('rechaza ciclo %s', (estado) => {
    const ctx = contexto(); ctx.ciclo.estado = estado;
    expect(() => ActividadRealizada.desdeProgramada('hecho', datos, ctx, hoy)).toThrow();
  });

  it.each(['2026-02-30', '2026-09-30', '2026-10-28', '2026-10-29'])('rechaza fecha inexistente, fuera del ciclo o futura: %s', (fechaEjecucion) => {
    expect(() => ActividadRealizada.desdeProgramada('hecho', { ...datos, fechaEjecucion }, contexto(), hoy)).toThrow();
  });

  it('rechaza responsable inactivo o programación de otro ciclo', () => {
    const ctx = contexto(); ctx.responsableActivo = false;
    expect(() => ActividadRealizada.desdeProgramada('hecho', datos, ctx, hoy)).toThrow();
    ctx.responsableActivo = true; ctx.ciclo.id = 'otro';
    expect(() => ActividadRealizada.desdeProgramada('hecho', datos, ctx, hoy)).toThrow();
  });

  it.each([NaN, Infinity, 0, -1, 0.001, 1e-10, 1000000])('rechaza superficie no representable: %s', (superficieTrabajadaHa) => {
    expect(() => ActividadRealizada.desdeProgramada('hecho', { ...datos, superficieTrabajadaHa }, contexto(), hoy)).toThrow();
  });

  it.each([0, -1, Infinity, 0.001, 1000])('rechaza duración inválida: %s', (duracionHoras) => {
    expect(() => ActividadRealizada.desdeProgramada('hecho', { ...datos, duracionHoras }, contexto(), hoy)).toThrow();
  });

  it('aísla los datos específicos de las mutaciones del llamador', () => {
    const datosEspecificos = { riego: { litros: 100 } };
    const actividad = ActividadRealizada.desdeProgramada('hecho', { ...datos, datosEspecificos }, contexto(), hoy);
    datosEspecificos.riego.litros = 200;
    const dto = actividad.toJSON(); dto.datosEspecificos.riego = {};
    expect(actividad.toJSON().datosEspecificos).toEqual({ riego: { litros: 100 } });
  });
});
