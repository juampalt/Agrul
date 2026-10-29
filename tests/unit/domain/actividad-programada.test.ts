import { describe, it, expect } from 'vitest';
import {
  ActividadProgramada,
  ActividadProgramadaInvalidaError,
  EstadoActividadInvalidoError,
} from '../../../src/core/domain/entities/actividad-programada.entity.js';
import { ProgramarActividadSchema, ReprogramarActividadSchema, ConsultarActividadesProgramadasSchema } from '../../../src/infrastructure/http/schemas/actividades-programadas.schema.js';

describe('Dominio: ActividadProgramada (CU26–CU29 / AGRUL-054)', () => {
  const id = crypto.randomUUID();
  const cicloId = crypto.randomUUID();
  const tipoActividadId = crypto.randomUUID();
  const responsableId = crypto.randomUUID();
  const datos = { id, cicloId, tipoActividadId, responsableId, fechaProgramada: '2026-11-15' };

  it.each(['2026-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-00-10', '2026-01-00', '0000-01-01'])('rechaza fecha inexistente %s en dominio y HTTP', (fechaProgramada) => {
    expect(() => ActividadProgramada.programar({ ...datos, fechaProgramada })).toThrow(ActividadProgramadaInvalidaError);
    expect(() => ActividadProgramada.programar(datos).reprogramar({ fechaProgramada })).toThrow(ActividadProgramadaInvalidaError);
    const { id: _id, ...body } = datos;
    expect(ProgramarActividadSchema.safeParse({ ...body, fechaProgramada }).success).toBe(false);
    expect(ReprogramarActividadSchema.safeParse({ fechaProgramada }).success).toBe(false);
    expect(ConsultarActividadesProgramadasSchema.safeParse({ desde: fechaProgramada }).success).toBe(false);
    expect(ConsultarActividadesProgramadasSchema.safeParse({ hasta: fechaProgramada }).success).toBe(false);
  });

  it.each(['2028-02-29', '2000-02-29', '2026-04-30'])('acepta fecha existente %s', (fechaProgramada) => {
    expect(ActividadProgramada.programar({ ...datos, fechaProgramada }).fechaProgramada).toBe(fechaProgramada);
    expect(ReprogramarActividadSchema.safeParse({ fechaProgramada }).success).toBe(true);
  });

  it.each([undefined, null])('normaliza superficie omitida o nula (%s)', (superficiePrevista) => {
    expect(ActividadProgramada.programar({ ...datos, superficiePrevista }).toJSON().superficiePrevista).toBeNull();
  });

  it.each([NaN, Infinity, -Infinity, -1, 0])('rechaza superficie no finita o no positiva (%s)', (superficiePrevista) => {
    expect(() => ActividadProgramada.programar({ ...datos, superficiePrevista })).toThrow(ActividadProgramadaInvalidaError);
  });

  it('programa una actividad válida en estado PENDIENTE por defecto', () => {
    const act = ActividadProgramada.programar({
      id,
      cicloId,
      tipoActividadId,
      responsableId,
      fechaProgramada: '2026-11-15',
      superficiePrevista: 4.5,
      descripcion: 'Aplicación de riego por goteo programada',
    });

    expect(act.id).toBe(id);
    expect(act.cicloId).toBe(cicloId);
    expect(act.tipoActividadId).toBe(tipoActividadId);
    expect(act.responsableId).toBe(responsableId);
    expect(act.fechaProgramada).toBe('2026-11-15');
    expect(act.superficiePrevista).toBe(4.5);
    expect(act.estado).toBe('PENDIENTE');
    expect(act.motivoCancelacion).toBeNull();
  });

  it('rechaza fecha programada con formato inválido', () => {
    expect(() => {
      ActividadProgramada.programar({
        id,
        cicloId,
        tipoActividadId,
        responsableId,
        fechaProgramada: '15/11/2026',
      });
    }).toThrow(ActividadProgramadaInvalidaError);
  });

  it('rechaza superficie prevista menor o igual a cero', () => {
    expect(() => {
      ActividadProgramada.programar({
        id,
        cicloId,
        tipoActividadId,
        responsableId,
        fechaProgramada: '2026-11-15',
        superficiePrevista: 0,
      });
    }).toThrow(ActividadProgramadaInvalidaError);
  });

  it('permite reprogramar cambiando fecha y responsable en estado PENDIENTE', () => {
    const act = ActividadProgramada.programar({
      id,
      cicloId,
      tipoActividadId,
      responsableId,
      fechaProgramada: '2026-11-15',
    });

    const nuevoResponsableId = crypto.randomUUID();
    const reprogramada = act.reprogramar({
      fechaProgramada: '2026-11-20',
      responsableId: nuevoResponsableId,
    });

    expect(reprogramada.fechaProgramada).toBe('2026-11-20');
    expect(reprogramada.responsableId).toBe(nuevoResponsableId);
    expect(reprogramada.estado).toBe('PENDIENTE');
  });

  it('permite cancelar justificando con motivo obligatorio (RN-12)', () => {
    const act = ActividadProgramada.programar({
      id,
      cicloId,
      tipoActividadId,
      responsableId,
      fechaProgramada: '2026-11-15',
    });

    const cancelada = act.cancelar('Lluvia intensa impidió el ingreso de maquinaria');

    expect(cancelada.estado).toBe('CANCELADA');
    expect(cancelada.motivoCancelacion).toBe('Lluvia intensa impidió el ingreso de maquinaria');
  });

  it('rechaza cancelación sin motivo (RN-12)', () => {
    const act = ActividadProgramada.programar({
      id,
      cicloId,
      tipoActividadId,
      responsableId,
      fechaProgramada: '2026-11-15',
    });

    expect(() => {
      act.cancelar('   ');
    }).toThrow(ActividadProgramadaInvalidaError);
  });

  it('rechaza reprogramar una actividad que ya fue cancelada', () => {
    const act = ActividadProgramada.programar({
      id,
      cicloId,
      tipoActividadId,
      responsableId,
      fechaProgramada: '2026-11-15',
    });
    const cancelada = act.cancelar('Motivo de prueba');

    expect(() => {
      cancelada.reprogramar({ fechaProgramada: '2026-11-25' });
    }).toThrow(EstadoActividadInvalidoError);
  });
});
