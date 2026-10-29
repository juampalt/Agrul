import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InsumosPostgresFixture, URL_INSUMOS } from '../helpers/insumos-postgres.fixture.js';

const url = process.env.INSUMOS_TEST_DATABASE_URL;
if (url && url !== URL_INSUMOS) throw new Error('Destino de pruebas AGRUL-055 no autorizado.');
const insertar = `insert into aplicaciones_insumo_items(aplicacion_id,insumo_id,partida_insumo_id,cantidad_aplicada,dosis) values($1,$2,$3,1,1)`;

describe.skipIf(!url)('AGRUL-055 RN-15: concurrencia y rollback PostgreSQL', () => {
  const f = new InsumosPostgresFixture();
  beforeAll(async () => { await f.preparar(url!); }, 30000);
  afterAll(async () => { await f.cerrar(); });

  async function esperarBloqueo(pid: number) {
    const inicio = Date.now();
    while (Date.now() - inicio < 5000) {
      const { rows } = await f.pool.query<{ bloqueado: boolean }>('select cardinality(pg_blocking_pids($1)) > 0 as bloqueado', [pid]);
      if (rows[0].bloqueado) return;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    throw new Error('La segunda conexión no esperó el bloqueo de la primera.');
  }

  it('una aplicación confirmada impide cambiar unidad desde una segunda conexión que estaba esperando', async () => {
    const id = await f.crear(); const partida = await f.partida(id); const aplicacion = await f.aplicacion();
    const a = await f.pool.connect(); const b = await f.pool.connect();
    try {
      await a.query('begin'); await a.query(insertar, [aplicacion, id, partida]);
      const pid = (await b.query<{ pid: number }>('select pg_backend_pid() as pid')).rows[0].pid;
      const cambio = b.query("update insumos set unidad_medida='L' where id=$1", [id]).then(() => null, (error: unknown) => error);
      await esperarBloqueo(pid); await a.query('commit');
      expect(await cambio).toMatchObject({ code: '23514', constraint: 'insumos_unidad_inmutable' });
      expect((await f.pool.query('select unidad_medida from insumos where id=$1', [id])).rows[0].unidad_medida).toBe('kg');
    } finally { await a.query('rollback'); a.release(); b.release(); }
  });
  it('una aplicación espera un cambio de unidad anterior y luego bloquea cambios posteriores', async () => {
    const id = await f.crear(); const partida = await f.partida(id); const aplicacion = await f.aplicacion();
    const a = await f.pool.connect(); const b = await f.pool.connect();
    try {
      await a.query('begin'); await a.query("update insumos set unidad_medida='L' where id=$1", [id]);
      const pid = (await b.query<{ pid: number }>('select pg_backend_pid() as pid')).rows[0].pid;
      const registro = b.query(insertar, [aplicacion, id, partida]);
      await esperarBloqueo(pid); await a.query('commit'); await registro;
      await expect(f.pool.query("update insumos set unidad_medida='kg' where id=$1", [id])).rejects.toMatchObject({ code: '23514' });
      expect((await f.pool.query('select unidad_medida from insumos where id=$1', [id])).rows[0].unidad_medida).toBe('L');
    } finally { await a.query('rollback'); a.release(); b.release(); }
  });
  it('el rollback de un registro fallido libera el bloqueo y no deja aplicaciones ficticias', async () => {
    const id = await f.crear(); const partida = await f.partida(id); const aplicacion = await f.aplicacion();
    const a = await f.pool.connect(); const b = await f.pool.connect();
    try {
      await a.query('begin'); await a.query(insertar, [aplicacion, id, partida]);
      const pid = (await b.query<{ pid: number }>('select pg_backend_pid() as pid')).rows[0].pid;
      const cambio = b.query("update insumos set unidad_medida='L' where id=$1", [id]);
      await esperarBloqueo(pid); await a.query('rollback'); await cambio;
      expect((await f.pool.query('select id from aplicaciones_insumo_items where insumo_id=$1', [id])).rows).toEqual([]);
      expect((await f.pool.query('select unidad_medida from insumos where id=$1', [id])).rows[0].unidad_medida).toBe('L');
    } finally { await a.query('rollback'); a.release(); b.release(); }
  });
  it('rechaza referencias inexistentes, cruce de partida/insumo y cantidades inválidas', async () => {
    const id = await f.crear(); const otro = await f.crear(); const partida = await f.partida(otro); const aplicacion = await f.aplicacion();
    await expect(f.pool.query(insertar, [aplicacion, id, partida])).rejects.toMatchObject({ code: expect.stringMatching(/^(23503|23001)$/) });
    await expect(f.pool.query('update partidas_insumo set cantidad_disponible=-1 where id=$1', [partida])).rejects.toMatchObject({ code: '23514' });
    expect((await f.pool.query('select cantidad_disponible from partidas_insumo where id=$1', [partida])).rows[0].cantidad_disponible).toBe('10.00');
    expect((await f.pool.query('select id from aplicaciones_insumo_items where insumo_id=$1', [id])).rows).toEqual([]);
  });
});
