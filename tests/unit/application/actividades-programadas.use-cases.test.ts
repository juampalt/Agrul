import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CancelarActividadUseCase, ConsultarActividadesProgramadasUseCase, ReprogramarActividadUseCase } from '../../../src/application/use-cases/actividades-programadas.use-cases.js';
import { CicloConActividadesPendientesError, VerificarCierreCicloUseCase } from '../../../src/application/use-cases/verificar-cierre-ciclo.use-case.js';
import { ActividadProgramada, ActividadProgramadaInvalidaError, EstadoActividadInvalidoError } from '../../../src/core/domain/entities/actividad-programada.entity.js';
import { EntidadNoEncontradaError } from '../../../src/core/domain/errors/domain.error.js';
import { ActividadesProgramadasRepositoryPort } from '../../../src/core/ports/actividades-programadas-repository.port.js';

describe('CU27–CU29: casos de uso sin PostgreSQL', () => {
  let filas: Map<string, ActividadProgramada>;
  let repo: ActividadesProgramadasRepositoryPort;
  const crear = (id = 'actividad', cicloId = 'ciclo') => ActividadProgramada.programar({
    id, cicloId, tipoActividadId: 'tipo', responsableId: 'responsable', fechaProgramada: '2026-11-15',
  });

  beforeEach(() => {
    filas = new Map([['actividad', crear()]]);
    repo = {
      guardar: vi.fn(async (actividad) => { filas.set(actividad.id, actividad); }),
      buscarPorId: vi.fn(async (id) => filas.get(id) ?? null),
      listar: vi.fn(async () => [...filas.values()]),
      actualizar: vi.fn(async (actividad) => { filas.set(actividad.id, actividad); }),
    };
  });

  it('consulta el detalle sin mutar la actividad persistida', async () => {
    const resultado = await new ConsultarActividadesProgramadasUseCase(repo).obtenerPorId('actividad');
    expect(resultado).toEqual(filas.get('actividad')?.toJSON());
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it('delega los filtros y devuelve datos serializados', async () => {
    const filtros = { cicloId: 'ciclo', responsableId: 'responsable', limit: 10, offset: 20 };
    const resultado = await new ConsultarActividadesProgramadasUseCase(repo).execute(filtros);
    expect(repo.listar).toHaveBeenCalledWith(filtros);
    expect(resultado[0]).toEqual(filas.get('actividad')?.toJSON());
  });

  it.each(['consultar', 'reprogramar', 'cancelar'])('rechaza %s de una actividad inexistente sin escribir', async (operacion) => {
    const resultado = operacion === 'consultar'
      ? new ConsultarActividadesProgramadasUseCase(repo).obtenerPorId('ausente')
      : operacion === 'reprogramar'
        ? new ReprogramarActividadUseCase(repo).execute('ausente', { fechaProgramada: '2026-11-20' })
        : new CancelarActividadUseCase(repo).execute('ausente', 'Lluvia');
    await expect(resultado).rejects.toBeInstanceOf(EntidadNoEncontradaError);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it('reprograma preservando responsable, estado y objeto original', async () => {
    const original = filas.get('actividad');
    const resultado = await new ReprogramarActividadUseCase(repo).execute('actividad', { fechaProgramada: '2026-11-20' });
    expect(resultado).toMatchObject({ fechaProgramada: '2026-11-20', responsableId: 'responsable', estado: 'PENDIENTE' });
    expect(filas.get('actividad')?.fechaProgramada).toBe('2026-11-20');
    expect(original?.fechaProgramada).toBe('2026-11-15');
  });

  it('rechaza una fecha inexistente sin persistir cambios', async () => {
    await expect(new ReprogramarActividadUseCase(repo).execute('actividad', { fechaProgramada: '2026-02-30' }))
      .rejects.toBeInstanceOf(ActividadProgramadaInvalidaError);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it('cancela conservando la actividad y el motivo normalizado para consulta', async () => {
    await new CancelarActividadUseCase(repo).execute('actividad', '  Lluvia intensa  ');
    expect(filas.size).toBe(1);
    expect(await new ConsultarActividadesProgramadasUseCase(repo).obtenerPorId('actividad'))
      .toMatchObject({ estado: 'CANCELADA', motivoCancelacion: 'Lluvia intensa' });
  });

  it('rechaza una cancelación sin motivo sin escribir', async () => {
    await expect(new CancelarActividadUseCase(repo).execute('actividad', '  '))
      .rejects.toBeInstanceOf(ActividadProgramadaInvalidaError);
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it.each(['reprogramar', 'cancelar'])('no permite %s una actividad ya cancelada', async (operacion) => {
    filas.set('actividad', crear().cancelar('Lluvia'));
    const resultado = operacion === 'reprogramar'
      ? new ReprogramarActividadUseCase(repo).execute('actividad', { fechaProgramada: '2026-11-20' })
      : new CancelarActividadUseCase(repo).execute('actividad', 'Otro motivo');
    await expect(resultado).rejects.toBeInstanceOf(EstadoActividadInvalidoError);
    expect(repo.actualizar).not.toHaveBeenCalled();
    expect(filas.get('actividad')?.motivoCancelacion).toBe('Lluvia');
  });

  it('propaga un conflicto de persistencia sin devolver una reprogramación exitosa', async () => {
    const conflicto = new EstadoActividadInvalidoError('Otra solicitud canceló la actividad.');
    repo.actualizar = vi.fn().mockRejectedValue(conflicto);
    await expect(new ReprogramarActividadUseCase(repo).execute('actividad', { fechaProgramada: '2026-11-20' }))
      .rejects.toBe(conflicto);
    expect(filas.get('actividad')?.fechaProgramada).toBe('2026-11-15');
  });

  it('RN-09 mantiene el bloqueo al reprogramar y lo libera al cancelar, aislando ciclos', async () => {
    filas.set('otra', crear('otra', 'otro-ciclo'));
    const cierre = new VerificarCierreCicloUseCase({
      tienePendientes: async (cicloId) => [...filas.values()].some((a) => a.cicloId === cicloId && a.estado === 'PENDIENTE'),
    });
    await expect(cierre.execute('ciclo')).rejects.toBeInstanceOf(CicloConActividadesPendientesError);
    await new ReprogramarActividadUseCase(repo).execute('actividad', { fechaProgramada: '2026-11-20' });
    await expect(cierre.execute('ciclo')).rejects.toBeInstanceOf(CicloConActividadesPendientesError);
    await new CancelarActividadUseCase(repo).execute('actividad', 'Lluvia');
    await expect(cierre.execute('ciclo')).resolves.toBeUndefined();
    await expect(cierre.execute('otro-ciclo')).rejects.toBeInstanceOf(CicloConActividadesPendientesError);
  });
});
