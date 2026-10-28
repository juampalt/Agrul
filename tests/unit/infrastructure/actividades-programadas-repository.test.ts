import { describe, expect, it, vi, beforeEach } from 'vitest';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../../src/infrastructure/database/schema/tables.js';
import { ActividadProgramada, EstadoActividadInvalidoError } from '../../../src/core/domain/entities/actividad-programada.entity.js';
import { DrizzleActividadesProgramadasRepository } from '../../../src/infrastructure/database/repositories/drizzle-actividades-programadas.repository.js';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
// Driver simulado: estas pruebas nunca crean conexiones ni consultan credenciales.
vi.mock('pg', () => ({ default: { Pool: class { query = query; } } }));

describe('Escrituras de actividades programadas sin PostgreSQL', () => {
  const repo = new DrizzleActividadesProgramadasRepository(drizzle(new pg.Pool(), { schema }));
  const actividad = () => ActividadProgramada.programar({
    id: 'a0000000-0000-4000-8000-000000000054',
    cicloId: 'b0000000-0000-4000-8000-000000000054',
    tipoActividadId: 'c0000000-0000-4000-8000-000000000054',
    responsableId: 'd0000000-0000-4000-8000-000000000054',
    fechaProgramada: '2026-11-15',
  });
  beforeEach(() => query.mockReset());

  it('persiste superficie omitida como NULL sin invocar toFixed sobre undefined', async () => {
    query.mockResolvedValue({ rows: [] });
    await expect(repo.guardar(actividad())).resolves.toBeUndefined();
    expect(query.mock.calls[0][1]).toContain(null);
  });

  it('condiciona la escritura al estado persistido PENDIENTE y confirma la fila actualizada', async () => {
    query.mockResolvedValue({ rows: [{ id: actividad().id }] });
    await expect(repo.actualizar(actividad().reprogramar({ fechaProgramada: '2026-11-20' }))).resolves.toBeUndefined();
    const [config, params] = query.mock.calls[0];
    expect(config.text).toMatch(/where \("actividades_programadas"\."id" = \$\d+ and "actividades_programadas"\."estado" = \$\d+\) returning "id"/);
    expect(params.slice(-2)).toEqual([actividad().id, 'PENDIENTE']);
  });

  it.each(['reprogramar', 'cancelar'])('rechaza %s cuando la fila dejó de estar pendiente tras la lectura', async (operacion) => {
    const leida = actividad();
    const modificada = operacion === 'cancelar'
      ? leida.cancelar('Lluvia')
      : leida.reprogramar({ fechaProgramada: '2026-11-20' });
    // Simula que el UPDATE condicional no encontró una fila pendiente.
    query.mockResolvedValue({ rows: [] });
    await expect(repo.actualizar(modificada)).rejects.toBeInstanceOf(EstadoActividadInvalidoError);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
