import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PoscosechaFixture } from '../helpers/poscosecha-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: conservación de masa bajo concurrencia', () => {
  const f = new PoscosechaFixture();
  beforeAll(() => f.preparar(url!), 30000); afterAll(() => f.cerrar());
  const siete = (cosechaId: string) => ({ ...f.datosClasificacion(cosechaId), cantidadRecibidaKg: 7, kgFresco: 7, kgIndustria: 0, kgDescarte: 0, motivosDescarte: [] });
  it('dos clasificaciones que compiten por los mismos kilos no superan el pesaje', async () => {
    const id = await f.cosecha();
    const resultados = await Promise.all([f.clasificar(siete(id)), f.clasificar(siete(id))]);
    expect(resultados.map(r => r.statusCode).sort()).toEqual([201, 422]);
    expect((await f.pool.query('select sum(cantidad_recibida_kg)::text as kg from clasificaciones where cosecha_id=$1', [id])).rows[0].kg).toBe('7.00');
    expect((await f.pool.query('select sum(p.cantidad_inicial_kg)::text as kg from partidas_produccion p join clasificaciones c on c.id=p.clasificacion_id where c.cosecha_id=$1', [id])).rows[0].kg).toBe('7.00');
  });
  it('dos reintentos simultáneos de clasificación generan las mismas partidas una sola vez', async () => {
    const datos = f.datosClasificacion(await f.cosecha());
    const resultados = await Promise.all([f.clasificar(datos), f.clasificar(datos)]);
    expect(resultados.map(r => r.statusCode)).toEqual([201, 201]);
    expect(resultados[0].json().data.partidas).toEqual(resultados[1].json().data.partidas);
    expect((await f.pool.query('select count(*)::int as n from partidas_produccion where clasificacion_id=$1', [datos.operacionId])).rows[0].n).toBe(2);
  });
  it('dos empaques concurrentes no consumen dos veces los mismos kilos sin acondicionar', async () => {
    const partida = await f.partida();
    const resultados = await Promise.all([f.acondicionar(f.datosAcondicionamiento(partida, 7)), f.acondicionar(f.datosAcondicionamiento(partida, 7))]);
    expect(resultados.map(r => r.statusCode).sort()).toEqual([201, 422]);
    const detalle = await f.app.inject({ method: 'GET', url: `/api/v1/partidas-produccion/${partida}`, headers: f.campo });
    expect(detalle.json().data).toMatchObject({ cantidadAcondicionadaKg: 7, cantidadSinAcondicionarKg: 3, cantidadDisponibleKg: 10 });
  });
  it('reintentar simultáneamente un empaque conserva un solo hecho', async () => {
    const datos = f.datosAcondicionamiento(await f.partida());
    expect((await Promise.all([f.acondicionar(datos), f.acondicionar(datos)])).map(r => r.statusCode)).toEqual([201, 201]);
    expect((await f.pool.query('select count(*)::int as n from acondicionamientos where id=$1', [datos.operacionId])).rows[0].n).toBe(1);
    expect((await f.pool.query("select count(*)::int as n from eventos_trazabilidad where payload_especifico->>'acondicionamientoId'=$1", [datos.operacionId])).rows[0].n).toBe(1);
  });
  it.each([true, false])('clasificación SQL externa concurrente, commit=%s', async confirmar => {
    const cosecha = await f.cosecha(), datos = siete(cosecha), writer = await f.pool.connect();
    let pendiente: ReturnType<typeof f.clasificar> | undefined;
    try {
      await writer.query('begin');
      const pid = (await writer.query('select pg_backend_pid() as pid')).rows[0].pid;
      await writer.query(`insert into clasificaciones(id,cosecha_id,fecha_clasificacion,cantidad_recibida_kg,kg_fresco,kg_industria,kg_descarte,motivos_descarte,responsable_id,registrado_por,solicitud)
        values($1,$2,'2026-10-16',7,7,0,0,'[]',$3,$3,'{}')`, [randomUUID(), cosecha, f.campoId]);
      pendiente = f.clasificar(datos); const resultado = Promise.resolve(pendiente);
      await esperarBloqueo(pid);
      await writer.query(confirmar ? 'commit' : 'rollback');
      expect((await resultado).statusCode).toBe(confirmar ? 422 : 201);
      expect((await f.pool.query('select sum(cantidad_recibida_kg)::text as kg from clasificaciones where cosecha_id=$1', [cosecha])).rows[0].kg).toBe('7.00');
    } finally { await writer.query('rollback'); writer.release(); await pendiente; }
  });
  it.each([true, false])('acondicionamiento SQL externo concurrente, commit=%s', async confirmar => {
    const partida = await f.partida(), datos = f.datosAcondicionamiento(partida, 7), writer = await f.pool.connect();
    let pendiente: ReturnType<typeof f.acondicionar> | undefined;
    try {
      await writer.query('begin');
      const pid = (await writer.query('select pg_backend_pid() as pid')).rows[0].pid;
      await writer.query(`insert into acondicionamientos(id,partida_produccion_id,fecha_acondicionamiento,tipo_acondicionamiento,tipo_envase,cantidad_kg,cantidad_envases,responsable_id,registrado_por,solicitud)
        values($1,$2,'2026-10-17','Manual','Caja',7,1,$3,$3,'{}')`, [randomUUID(), partida, f.campoId]);
      pendiente = f.acondicionar(datos); const resultado = Promise.resolve(pendiente);
      await esperarBloqueo(pid);
      await writer.query(confirmar ? 'commit' : 'rollback');
      expect((await resultado).statusCode).toBe(confirmar ? 422 : 201);
      expect((await f.pool.query('select sum(cantidad_kg)::text as kg from acondicionamientos where partida_produccion_id=$1', [partida])).rows[0].kg).toBe('7.00');
    } finally { await writer.query('rollback'); writer.release(); await pendiente; }
  });
  async function esperarBloqueo(pid: number) {
    let bloqueada = false; const inicio = Date.now();
    while (Date.now() - inicio < 3000) {
      bloqueada = (await f.pool.query('select 1 from pg_stat_activity where datname=current_database() and $1=any(pg_blocking_pids(pid))', [pid])).rows.length > 0;
      if (bloqueada) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(bloqueada).toBe(true);
  }
});
