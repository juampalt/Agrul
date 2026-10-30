import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { CosechasRegistroFixture } from '../helpers/cosechas-registro-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: concurrencia del registro de cosechas', () => {
  const f = new CosechasRegistroFixture();
  beforeAll(() => f.preparar(url!), 30000); afterAll(() => f.cerrar());
  const eventos = async (id: string) => (await f.pool.query("select count(*)::int as n from eventos_trazabilidad where payload_especifico->>'cosechaId'=$1", [id])).rows[0].n;
  it('dos reintentos simultáneos crean un solo pesaje y un solo evento', async () => {
    const datos = f.datosCosecha();
    const resultados = await Promise.all([f.registrar(datos), f.registrar(datos)]);
    expect(resultados.map(r => r.statusCode)).toEqual([201, 201]);
    expect(await eventos(datos.operacionId)).toBe(1);
    expect((await f.pool.query('select id from cosechas where id=$1', [datos.operacionId])).rows).toHaveLength(1);
  });
  it('dos operaciones para la misma pasada del ciclo no duplican kilos', async () => {
    const datos = f.datosCosecha(), otra = { ...datos, operacionId: randomUUID() };
    const resultados = await Promise.all([f.registrar(datos), f.registrar(otra)]);
    expect(resultados.map(r => r.statusCode).sort()).toEqual([201, 409]);
    expect(await eventos(datos.operacionId) + await eventos(otra.operacionId)).toBe(1);
    expect((await f.pool.query('select sum(cantidad_cosechada_kg) as kg from cosechas where ciclo_id=$1 and numero_pasada=$2', [f.cicloId, datos.numeroPasada])).rows[0].kg).toBe('10.2500');
  });
  it('dos ejecuciones de una jornada producen una sola cosecha y una sola transición', async () => {
    const datos = await f.datosProgramada(), otra = { ...datos, operacionId: randomUUID(), numeroPasada: f.datosCosecha().numeroPasada };
    const resultados = await Promise.all([f.registrar(datos), f.registrar(otra)]);
    expect(resultados.map(r => r.statusCode).sort()).toEqual([201, 409]);
    expect((await f.pool.query('select id from cosechas where cosecha_programada_id=$1', [datos.cosechaProgramadaId])).rows).toHaveLength(1);
    expect((await f.pool.query("select count(*)::int as n from cosechas_programadas_historial where jornada_id=$1 and operacion='EJECUCION'", [datos.cosechaProgramadaId])).rows[0].n).toBe(1);
  });
  it('cancelación y ejecución simultáneas conservan una sola decisión confirmada', async () => {
    const datos = await f.datosProgramada();
    const resultados = await Promise.all([
      f.registrar(datos), f.app.inject({ method: 'PATCH', url: `/api/v1/cosechas-programadas/${datos.cosechaProgramadaId}/cancelar`,
        headers: f.campo, payload: { version: 1, motivoCancelacion: 'Lluvia concurrente' } }),
    ]);
    expect(resultados.filter(r => r.statusCode === 409)).toHaveLength(1);
    expect(resultados.filter(r => [200, 201].includes(r.statusCode))).toHaveLength(1);
    const { rows } = await f.pool.query('select estado,version from cosechas_programadas where id=$1', [datos.cosechaProgramadaId]);
    expect(rows[0].version).toBe(2);
    expect(await eventos(datos.operacionId)).toBe(rows[0].estado === 'EJECUTADA' ? 1 : 0);
    expect((await f.pool.query('select count(*)::int as n from cosechas_programadas_historial where jornada_id=$1', [datos.cosechaProgramadaId])).rows[0].n).toBe(2);
  });
  it('si falla auditar la ejecución, tampoco persisten cosecha ni evento', async () => {
    const datos = await f.datosProgramada();
    await f.pool.query("alter table cosechas_programadas_historial add constraint fallo_ejecucion_test check(operacion <> 'EJECUCION') not valid");
    try {
      expect((await f.registrar(datos)).statusCode).toBe(422);
      expect(await eventos(datos.operacionId)).toBe(0);
      expect((await f.pool.query('select id from cosechas where id=$1', [datos.operacionId])).rows).toHaveLength(0);
      expect((await f.pool.query('select estado,version from cosechas_programadas where id=$1', [datos.cosechaProgramadaId])).rows[0]).toEqual({ estado: 'PENDIENTE', version: 1 });
    } finally { await f.pool.query('alter table cosechas_programadas_historial drop constraint fallo_ejecucion_test'); }
  });
  it.each([true, false])('serializa registro contra cierre de ciclo, commit=%s', async confirmar => {
    const writer = await f.pool.connect();
    let pendiente: ReturnType<typeof f.registrar> | undefined;
    const datos = f.datosCosecha();
    try {
      await writer.query('begin');
      const pid = (await writer.query('select pg_backend_pid() as pid')).rows[0].pid;
      await writer.query("update ciclos_productivos set estado='FINALIZADO',fecha_fin_efectiva='2026-10-27' where id=$1", [f.cicloId]);
      pendiente = f.registrar(datos); const resultado = Promise.resolve(pendiente);
      let bloqueada = false;
      const inicio = Date.now();
      while (Date.now() - inicio < 3000) {
        bloqueada = (await f.pool.query('select 1 from pg_stat_activity where datname=current_database() and $1=any(pg_blocking_pids(pid))', [pid])).rows.length > 0;
        if (bloqueada) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(bloqueada).toBe(true);
      await writer.query(confirmar ? 'commit' : 'rollback');
      expect((await resultado).statusCode).toBe(confirmar ? 422 : 201);
      expect(await eventos(datos.operacionId)).toBe(confirmar ? 0 : 1);
    } finally {
      await writer.query('rollback'); writer.release(); await pendiente;
      await f.pool.query("update ciclos_productivos set estado='ACTIVO',fecha_fin_efectiva=null where id=$1", [f.cicloId]);
    }
  });
});
