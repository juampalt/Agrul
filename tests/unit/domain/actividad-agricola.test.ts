import { describe, it, expect } from 'vitest';
import { ActividadAgricola } from '../../../src/core/domain/entities/actividad-agricola.entity.js';
import { FechaFuturaInvalidaError } from '../../../src/core/domain/errors/domain.error.js';

describe('Dominio: ActividadAgricola (AGRUL-021)', () => {
  const loteId = crypto.randomUUID();
  const cicloId = crypto.randomUUID();
  const tipoActividadId = crypto.randomUUID();
  const usuarioCargaId = crypto.randomUUID();
  const maquinariaId = crypto.randomUUID();
  const personalId = crypto.randomUUID();

  it('debe crear una ActividadAgricola válida con maquinaria y mano de obra', () => {
    const act = ActividadAgricola.registrar({
      id: crypto.randomUUID(),
      codigoActividad: 'ACT-2026-00010',
      tipoActividadId,
      loteId,
      cicloId,
      fechaHecho: '2026-10-10',
      hora: '08:30',
      usuarioCargaId,
      superficieTrabajadaHa: 3.5,
      maquinarias: [
        { maquinariaId, horasUso: 4.5 },
      ],
      manoDeObra: [
        {
          personalCuadrillaId: personalId,
          cantidadPersonas: 3,
          horasTrabajadas: 24,
          jornales: 3,
        },
      ],
      fechaReferenciaHoy: new Date('2026-10-14T12:00:00Z'),
    });

    expect(act.codigoActividad).toBe('ACT-2026-00010');
    expect(act.estado).toBe('REALIZADA');
    expect(act.superficieTrabajadaHa).toBe(3.5);
    expect(act.maquinarias.length).toBe(1);
    expect(act.maquinarias[0].horasUso).toBe(4.5);
    expect(act.manoDeObra.length).toBe(1);
    expect(act.manoDeObra[0].cantidadPersonas).toBe(3);
    expect(act.manoDeObra[0].jornales).toBe(3);
  });

  it('RN-04: debe rechazar fecha del hecho futura para actividades realizadas', () => {
    expect(() => {
      ActividadAgricola.registrar({
        id: crypto.randomUUID(),
        codigoActividad: 'ACT-2026-00011',
        tipoActividadId,
        loteId,
        cicloId,
        fechaHecho: '2026-10-20', // Futura respecto a hoy
        usuarioCargaId,
        superficieTrabajadaHa: 2.0,
        fechaReferenciaHoy: new Date('2026-10-14T12:00:00Z'),
      });
    }).toThrowError(FechaFuturaInvalidaError);
  });

  it('RN-04: debe permitir fechaHecho igual a hoy o en el pasado', () => {
    // Igual a hoy
    const actHoy = ActividadAgricola.registrar({
      id: crypto.randomUUID(),
      codigoActividad: 'ACT-2026-00012',
      tipoActividadId,
      loteId,
      cicloId,
      fechaHecho: '2026-10-14',
      usuarioCargaId,
      superficieTrabajadaHa: 1.0,
      fechaReferenciaHoy: new Date('2026-10-14T12:00:00Z'),
    });
    expect(actHoy.fechaHecho).toBe('2026-10-14');

    // En el pasado
    const actPasada = ActividadAgricola.registrar({
      id: crypto.randomUUID(),
      codigoActividad: 'ACT-2026-00013',
      tipoActividadId,
      loteId,
      cicloId,
      fechaHecho: '2026-09-01',
      usuarioCargaId,
      superficieTrabajadaHa: 1.0,
      fechaReferenciaHoy: new Date('2026-10-14T12:00:00Z'),
    });
    expect(actPasada.fechaHecho).toBe('2026-09-01');
  });

  it('debe rechazar superficie trabajada negativa o cero', () => {
    expect(() => {
      ActividadAgricola.registrar({
        id: crypto.randomUUID(),
        codigoActividad: 'ACT-2026-00014',
        tipoActividadId,
        loteId,
        cicloId,
        fechaHecho: '2026-10-10',
        usuarioCargaId,
        superficieTrabajadaHa: 0,
        fechaReferenciaHoy: new Date('2026-10-14T12:00:00Z'),
      });
    }).toThrow('La superficie trabajada en hectáreas debe ser mayor a cero.');
  });
});
