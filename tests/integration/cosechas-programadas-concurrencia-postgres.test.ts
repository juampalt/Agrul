import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JornadasPostgresFixture, RUTA_JORNADAS as ruta, URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: concurrencia y atomicidad PostgreSQL', () => {
  const f = new JornadasPostgresFixture();
  beforeAll(() => f.preparar(url!), 30000);
  afterAll(() => f.cerrar());
  const cambiar = (id: string, fechaPrevista: string) => f.app.inject({ method: 'PATCH', url: `${ruta}/${id}/reprogramar`,
    headers: f.campo, payload: { version: 1, fechaPrevista } });
  const historia = async (id: string) => (await f.pool.query('select operacion,nuevo from cosechas_programadas_historial where jornada_id=$1 order by registrado_en,id', [id])).rows;

  it('dos solicitudes con la misma clave generan una sola jornada y un solo hecho', async () => {
    const datos = f.datos();
    const resultados = await Promise.all([f.crear(datos), f.crear(datos)]);
    expect(resultados.map(r => r.statusCode)).toEqual([201, 201]);
    expect(await historia(datos.operacionId)).toHaveLength(1);
    expect((await f.pool.query('select id from cosechas_programadas where id=$1', [datos.operacionId])).rows).toHaveLength(1);
  });
  it('dos reprogramaciones sobre la misma versión producen un éxito y un conflicto', async () => {
    const id = (await f.crear()).json().data.id;
    const resultados = await Promise.all([cambiar(id, '2026-11-20'), cambiar(id, '2026-11-21')]);
    expect(resultados.map(r => r.statusCode).sort()).toEqual([200, 409]);
    const ganadora = resultados.find(r => r.statusCode === 200)!.json().data;
    expect((await f.pool.query('select fecha_prevista::text,version from cosechas_programadas where id=$1', [id])).rows[0]).toEqual({ fecha_prevista: ganadora.fechaPrevista, version: 2 });
    expect(await historia(id)).toHaveLength(2);
  });
  it.each([true, false])('alta SQL externa con la misma clave conserva un solo hecho, commit=%s', async confirmar => {
    const datos = f.datos();
    const writer = await f.pool.connect();
    let resultado: Promise<Awaited<ReturnType<typeof f.crear>>> | undefined;
    try {
      await writer.query('begin');
      const pid = (await writer.query('select pg_backend_pid() as pid')).rows[0].pid;
      await writer.query(`insert into cosechas_programadas(id,ciclo_id,fecha_prevista,responsable_id,sector,cantidad_estimada_kg,actualizado_por)
        values($1,$2,$3,$4,$5,$6,$4)`, [datos.operacionId, datos.cicloId, datos.fechaPrevista, datos.responsableId, datos.sector, datos.cantidadEstimadaKg]);
      resultado = Promise.resolve(f.crear(datos));
      let bloqueada = false;
      const inicio = Date.now();
      while (Date.now() - inicio < 3000) {
        bloqueada = (await f.pool.query('select 1 from pg_stat_activity where datname=current_database() and $1=any(pg_blocking_pids(pid))', [pid])).rows.length > 0;
        if (bloqueada) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(bloqueada).toBe(true);
      await writer.query(confirmar ? 'commit' : 'rollback');
      expect((await resultado).statusCode).toBe(confirmar ? 409 : 201);
      expect(await historia(datos.operacionId)).toHaveLength(1);
      expect((await f.crear(datos)).statusCode).toBe(201);
    } finally {
      await writer.query('rollback'); writer.release();
      await resultado;
    }
  });
  it('cancelación y reprogramación concurrentes no pierden ni pisan cambios', async () => {
    const id = (await f.crear()).json().data.id;
    const resultados = await Promise.all([
      cambiar(id, '2026-11-20'),
      f.app.inject({ method: 'PATCH', url: `${ruta}/${id}/cancelar`, headers: f.campo,
        payload: { version: 1, motivoCancelacion: 'Lluvia' } }),
    ]);
    expect(resultados.map(r => r.statusCode).sort()).toEqual([200, 409]);
    const h = await historia(id);
    expect(h).toHaveLength(2);
    expect(h[1].nuevo.version).toBe(2);
    const { rows } = await f.pool.query('select estado,fecha_prevista::text from cosechas_programadas where id=$1', [id]);
    expect(h[1].nuevo).toMatchObject(rows[0]);
  });
  it('una escritura SQL externa incrementa la versión y rechaza una intención obsoleta', async () => {
    const id = (await f.crear()).json().data.id;
    await f.pool.query("update cosechas_programadas set fecha_prevista='2026-11-22' where id=$1", [id]);
    expect((await cambiar(id, '2026-11-20')).statusCode).toBe(409);
    expect(await historia(id)).toHaveLength(2);
  });
  it('ordena el historial por versión aunque una transacción anterior confirme después', async () => {
    const writer = await f.pool.connect();
    try {
      await writer.query('begin');
      await writer.query('select now()'); // Fija un inicio anterior a la programación.
      const id = (await f.crear()).json().data.id;
      await writer.query("update cosechas_programadas set fecha_prevista='2026-11-22' where id=$1", [id]);
      await writer.query('commit');
      const res = await f.app.inject({ method: 'GET', url: `${ruta}/${id}/historial`, headers: f.campo });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.map((h: { nuevo: { version: number } }) => h.nuevo.version)).toEqual([1, 2]);
    } finally { await writer.query('rollback'); writer.release(); }
  });
  it('un fallo al auditar la reprogramación revierte también versión y fecha', async () => {
    const id = (await f.crear()).json().data.id;
    await f.pool.query("alter table cosechas_programadas_historial add constraint fallo_cambio_test check(nuevo->>'fecha_prevista' <> '2026-11-25')");
    try {
      expect((await cambiar(id, '2026-11-25')).statusCode).toBe(422);
      expect((await f.pool.query('select fecha_prevista::text,version from cosechas_programadas where id=$1', [id])).rows[0]).toEqual({ fecha_prevista: '2026-11-15', version: 1 });
      expect(await historia(id)).toHaveLength(1);
    } finally { await f.pool.query('alter table cosechas_programadas_historial drop constraint fallo_cambio_test'); }
  });
  it.each([true, false])('serializa programación contra un cierre de ciclo con commit=%s', async confirmar => {
    const writer = await f.pool.connect();
    let pendiente: ReturnType<typeof f.crear> | undefined;
    const datos = f.datos();
    try {
      await writer.query('begin');
      const pid = (await writer.query('select pg_backend_pid() as pid')).rows[0].pid;
      await writer.query("update ciclos_productivos set estado='FINALIZADO',fecha_inicio_efectiva='2026-10-01',fecha_fin_efectiva='2026-10-27' where id=$1", [f.cicloId]);
      pendiente = f.crear(datos);
      // inject es thenable: iniciar la solicitud antes de observar el bloqueo.
      const resultado = Promise.resolve(pendiente);
      const inicio = Date.now();
      let bloqueada = false;
      while (Date.now() - inicio < 3000) {
        bloqueada = (await f.pool.query('select 1 from pg_stat_activity where datname=current_database() and $1=any(pg_blocking_pids(pid))', [pid])).rows.length > 0;
        if (bloqueada) break;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(bloqueada).toBe(true);
      await writer.query(confirmar ? 'commit' : 'rollback');
      expect((await resultado).statusCode).toBe(confirmar ? 422 : 201);
      expect(await historia(datos.operacionId)).toHaveLength(confirmar ? 0 : 1);
    } finally {
      await writer.query('rollback'); writer.release();
      await pendiente;
      // Restaurar solo el ciclo propio para el siguiente caso, sin tocar historia.
      await f.pool.query("update ciclos_productivos set estado='PLANIFICADO',fecha_inicio_efectiva=null,fecha_fin_efectiva=null where id=$1", [f.cicloId]);
    }
  });
});
