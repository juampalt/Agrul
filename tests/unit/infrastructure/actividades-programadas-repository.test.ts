import { describe, expect, it, vi, beforeEach } from 'vitest';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../../src/infrastructure/database/schema/tables.js';
import { ActividadProgramada, ConflictoActividadProgramadaError } from '../../../src/core/domain/entities/actividad-programada.entity.js';
import { DrizzleActividadesProgramadasRepository } from '../../../src/infrastructure/database/repositories/drizzle-actividades-programadas.repository.js';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
// Driver simulado: estas pruebas nunca crean conexiones ni consultan credenciales.
vi.mock('pg', () => ({ default: { Pool: class { query = query; } } }));

describe('Escrituras de actividades programadas sin PostgreSQL', () => {
  const repo = new DrizzleActividadesProgramadasRepository(drizzle(new pg.Pool(), { schema }));
  const actividad = () => ActividadProgramada.reconstituir(ActividadProgramada.programar({
    id: 'a0000000-0000-4000-8000-000000000054',
    cicloId: 'b0000000-0000-4000-8000-000000000054',
    tipoActividadId: 'c0000000-0000-4000-8000-000000000054',
    responsableId: 'd0000000-0000-4000-8000-000000000054',
    fechaProgramada: '2026-11-15',
  }).toJSON(), '42');
  beforeEach(() => query.mockReset());

  it.each([0.001, 1000000])('rechaza superficie %s antes de enviar SQL aunque provenga de reconstrucción', async (superficiePrevista) => {
    const reconstruida = ActividadProgramada.reconstituir({ ...actividad().toJSON(), superficiePrevista });
    await expect(repo.guardar(reconstruida)).rejects.toMatchObject({ code: 'ACTIVIDAD_PROGRAMADA_INVALIDA' });
    expect(query).not.toHaveBeenCalled();
  });

  it('persiste superficie omitida como NULL sin invocar toFixed sobre undefined', async () => {
    query.mockResolvedValue({ rows: [] });
    await expect(repo.guardar(actividad())).resolves.toBeUndefined();
    expect(query.mock.calls[0][1]).toContain(null);
  });

  it('condiciona la escritura al estado persistido PENDIENTE y confirma la fila actualizada', async () => {
    query.mockResolvedValue({ rows: [{ id: actividad().id }] });
    await expect(repo.actualizar(actividad().reprogramar({ fechaProgramada: '2026-11-20' }))).resolves.toBeUndefined();
    const [config, params] = query.mock.calls[0];
    expect(config.text).toMatch(/where \("actividades_programadas"\."id" = \$\d+ and "actividades_programadas"\."estado" = \$\d+ and "actividades_programadas"\.xmin::text = \$\d+\) returning "id"/);
    expect(params.slice(-3)).toEqual([actividad().id, 'PENDIENTE', '42']);
  });

  it.each(['reprogramar', 'cancelar'])('rechaza %s cuando la fila dejó de estar pendiente tras la lectura', async (operacion) => {
    const leida = actividad();
    const modificada = operacion === 'cancelar'
      ? leida.cancelar('Lluvia')
      : leida.reprogramar({ fechaProgramada: '2026-11-20' });
    // Simula que el UPDATE condicional no encontró una fila pendiente.
    query.mockResolvedValue({ rows: [] });
    await expect(repo.actualizar(modificada)).rejects.toBeInstanceOf(ConflictoActividadProgramadaError);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('rechaza escrituras sin una versión leída de persistencia', async () => {
    const sinVersion = ActividadProgramada.reconstituir(actividad().toJSON()).cancelar('Lluvia');
    await expect(repo.actualizar(sinVersion)).rejects.toBeInstanceOf(ConflictoActividadProgramadaError);
    expect(query).not.toHaveBeenCalled();
  });

  it('cancelar solo actualiza estado, motivo y timestamp, sin restaurar otros campos', async () => {
    query.mockResolvedValue({ rows: [{ id: actividad().id }] });
    await repo.actualizar(actividad().cancelar('Lluvia'));
    const sentencia = query.mock.calls[0][0].text.split(' where ')[0];
    expect(sentencia).toContain('"motivo_cancelacion"');
    for (const campo of ['fecha_programada', 'responsable_id', 'tipo_actividad_id', 'superficie_prevista', 'descripcion']) {
      expect(sentencia).not.toContain(`"${campo}"`);
    }
  });
});
