import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AlmacenamientoProduccionFixture } from '../helpers/almacenamiento-produccion-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: concurrencia compartida de cámaras y destinos', () => {
  const f = new AlmacenamientoProduccionFixture();
  beforeAll(() => f.preparar(url!), 30000); afterAll(() => f.cerrar());
  async function conservar(partida: string) {
    const p = await f.estadoPartida(partida);
    expect(p.cantidadDisponibleKg + p.cantidadEnCamaraKg + p.cantidadDestinadaKg).toBe(p.cantidadInicialKg);
    expect(p.cantidadDisponibleKg).toBeGreaterThanOrEqual(0); expect(p.cantidadEnCamaraKg).toBeGreaterThanOrEqual(0);
    return p;
  }
  it('ingreso y destino simultáneos no consumen los mismos kilos exteriores', async () => {
    const partida = await f.partida(), camara = await f.camara();
    const resultados = await Promise.all([f.mover(f.datosMovimiento(partida, camara, 7)), f.destinar(f.datosDestino(partida, 7))]);
    expect(resultados.map(r => r.statusCode).sort()).toEqual([201, 422]);
    expect((await conservar(partida)).cantidadDisponibleKg).toBe(3);
  });
  it('dos ingresos a cámaras distintas comparten el saldo de la partida', async () => {
    const partida = await f.partida(), a = await f.camara(), b = await f.camara();
    const resultados = await Promise.all([f.mover(f.datosMovimiento(partida, a, 7)), f.mover(f.datosMovimiento(partida, b, 7))]);
    expect(resultados.map(r => r.statusCode).sort()).toEqual([201, 422]);
    expect(await conservar(partida)).toMatchObject({ cantidadDisponibleKg: 3, cantidadEnCamaraKg: 7 });
  });
  it('dos salidas concurrentes no retiran dos veces lo almacenado', async () => {
    const partida = await f.partida(), camara = await f.camara(); await f.mover(f.datosMovimiento(partida, camara, 10));
    const resultados = await Promise.all([f.mover(f.datosMovimiento(partida, camara, 7, 'SALIDA')), f.mover(f.datosMovimiento(partida, camara, 7, 'SALIDA'))]);
    expect(resultados.map(r => r.statusCode).sort()).toEqual([201, 422]);
    expect(await conservar(partida)).toMatchObject({ cantidadDisponibleKg: 7, cantidadEnCamaraKg: 3 });
  });
  it('dos destinos concurrentes no generan egresos duplicados', async () => {
    const partida = await f.partida();
    const resultados = await Promise.all([f.destinar(f.datosDestino(partida, 7)), f.destinar(f.datosDestino(partida, 7))]);
    expect(resultados.map(r => r.statusCode).sort()).toEqual([201, 422]);
    expect(await conservar(partida)).toMatchObject({ cantidadDisponibleKg: 3, cantidadDestinadaKg: 7 });
  });
  it.each(['movimiento', 'destino'] as const)('dos reintentos de %s conservan un solo evento y descuento', async tipo => {
    const partida = await f.partida();
    const datosM = f.datosMovimiento(partida, await f.camara()), datosD = f.datosDestino(partida);
    const resultados = tipo === 'movimiento' ? await Promise.all([f.mover(datosM), f.mover(datosM)]) : await Promise.all([f.destinar(datosD), f.destinar(datosD)]);
    expect(resultados.map(r => r.statusCode)).toEqual([201, 201]);
    expect((await conservar(partida)).cantidadDisponibleKg).toBe(7);
    const campo = tipo === 'movimiento' ? 'movimientoAlmacenamientoId' : 'destinoProduccionId';
    const id = tipo === 'movimiento' ? datosM.operacionId : datosD.operacionId;
    expect((await f.pool.query('select count(*)::int as n from eventos_trazabilidad where payload_especifico->>$1=$2', [campo, id])).rows[0].n).toBe(1);
  });
  it.each([true, false])('destino SQL concurrente contra ingreso HTTP, commit=%s', async confirmar => {
    const partida = await f.partida(), camara = await f.camara(), writer = await f.pool.connect();
    let pendiente: ReturnType<typeof f.mover> | undefined;
    try {
      await writer.query('begin'); const pid = (await writer.query('select pg_backend_pid() as pid')).rows[0].pid;
      await writer.query(`insert into destinos_produccion(id,partida_produccion_id,fecha_destino,tipo_destino,destino_especifico,cantidad_destinada_kg,responsable_id,registrado_por,solicitud)
        values($1,$2,'2026-10-19','OTRO','SQL real',7,$3,$3,'{}')`, [randomUUID(), partida, f.campoId]);
      pendiente = f.mover(f.datosMovimiento(partida, camara, 7)); const resultado = Promise.resolve(pendiente);
      await esperarBloqueo(pid); await writer.query(confirmar ? 'commit' : 'rollback');
      expect((await resultado).statusCode).toBe(confirmar ? 422 : 201);
      expect(await conservar(partida)).toMatchObject({ cantidadDisponibleKg: 3, cantidadDestinadaKg: confirmar ? 7 : 0, cantidadEnCamaraKg: confirmar ? 0 : 7 });
    } finally { await writer.query('rollback'); writer.release(); await pendiente; }
  });
  it.each([true, false])('ingreso SQL concurrente contra destino HTTP, commit=%s', async confirmar => {
    const partida = await f.partida(), camara = await f.camara(), writer = await f.pool.connect();
    let pendiente: ReturnType<typeof f.destinar> | undefined;
    try {
      await writer.query('begin'); const pid = (await writer.query('select pg_backend_pid() as pid')).rows[0].pid;
      await writer.query(`insert into movimientos_almacenamiento(id,partida_produccion_id,camara_sector_id,tipo_movimiento,cantidad_kg,fecha_movimiento,responsable_id,registrado_por,solicitud)
        values($1,$2,$3,'INGRESO',7,'2026-10-17',$4,$4,'{}')`, [randomUUID(), partida, camara, f.campoId]);
      pendiente = f.destinar(f.datosDestino(partida, 7)); const resultado = Promise.resolve(pendiente);
      await esperarBloqueo(pid); await writer.query(confirmar ? 'commit' : 'rollback');
      expect((await resultado).statusCode).toBe(confirmar ? 422 : 201);
      expect(await conservar(partida)).toMatchObject({ cantidadDisponibleKg: 3, cantidadEnCamaraKg: confirmar ? 7 : 0, cantidadDestinadaKg: confirmar ? 0 : 7 });
    } finally { await writer.query('rollback'); writer.release(); await pendiente; }
  });
  async function esperarBloqueo(pid: number) {
    let bloqueada = false; const inicio = Date.now();
    while (Date.now() - inicio < 3000) {
      bloqueada = (await f.pool.query('select 1 from pg_stat_activity where datname=current_database() and $1=any(pg_blocking_pids(pid))', [pid])).rows.length > 0;
      if (bloqueada) break; await new Promise(resolve => setTimeout(resolve, 10));
    }
    expect(bloqueada).toBe(true);
  }
});
