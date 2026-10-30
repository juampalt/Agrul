import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { JornadasPostgresFixture, RUTA_JORNADAS as ruta, URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: programación persistente desde bootstrap', () => {
  const f = new JornadasPostgresFixture();
  beforeAll(() => f.preparar(url!), 30000);
  afterAll(() => f.cerrar());
  it('programa con trazabilidad al ciclo/plantación/lote sin crear stock ni kg reales', async () => {
    const datos = f.datos();
    const res = await f.crear(datos);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ success: true, error: null, data: {
      id: datos.operacionId, cicloId: f.cicloId, cantidadEstimadaKg: 100.25, estado: 'PENDIENTE', version: 1,
    } });
    const { rows } = await f.pool.query(`select j.cantidad_estimada_kg,l.finca_id from cosechas_programadas j
      join ciclos_productivos c on c.id=j.ciclo_id join plantaciones p on p.id=c.plantacion_id
      join lotes l on l.id=p.lote_id where j.id=$1`, [datos.operacionId]);
    expect(rows[0]).toEqual({ cantidad_estimada_kg: '100.25', finca_id: f.fincaId });
    expect((await f.pool.query('select count(*)::int as n from movimientos_inventario')).rows[0].n).toBe(0);
    expect((await f.pool.query('select count(*)::int as n from eventos_trazabilidad')).rows[0].n).toBe(0);
    const historial = await f.app.inject({ method: 'GET', url: `${ruta}/${datos.operacionId}/historial`, headers: f.campo });
    expect(historial.statusCode).toBe(200);
    expect(historial.json().data).toEqual([expect.objectContaining({ operacion: 'PROGRAMACION', actorId: f.campoId,
      anterior: null, nuevo: expect.objectContaining({ ciclo_id: f.cicloId, version: 1 }) })]);
  });
  it('reprograma y cancela conservando los tres snapshots y los actores', async () => {
    const id = (await f.crear()).json().data.id;
    const cambio = await f.app.inject({ method: 'PATCH', url: `${ruta}/${id}/reprogramar`, headers: f.campo,
      payload: { version: 1, fechaPrevista: '2026-11-20', responsableId: f.adminId } });
    expect(cambio.statusCode).toBe(200);
    expect(cambio.json().data).toMatchObject({ fechaPrevista: '2026-11-20', responsableId: f.adminId, version: 2 });
    const cancelada = await f.app.inject({ method: 'PATCH', url: `${ruta}/${id}/cancelar`, headers: f.admin,
      payload: { version: 2, motivoCancelacion: '  Lluvia intensa  ' } });
    expect(cancelada.statusCode).toBe(200);
    const detalle = await f.app.inject({ method: 'GET', url: `${ruta}/${id}`, headers: f.campo });
    expect(detalle.json().data).toMatchObject({ estado: 'CANCELADA', motivoCancelacion: 'Lluvia intensa', version: 3, cantidadEstimadaKg: 100.25 });
    const h = await f.app.inject({ method: 'GET', url: `${ruta}/${id}/historial`, headers: f.campo });
    expect(h.json().data.map((r: { operacion: string }) => r.operacion)).toEqual(['PROGRAMACION', 'REPROGRAMACION', 'CANCELACION']);
    expect(h.json().data[2]).toMatchObject({ actorId: f.adminId, anterior: { estado: 'PENDIENTE', version: 2 }, nuevo: { estado: 'CANCELADA', version: 3 } });
    expect((await f.app.inject({ method: 'PATCH', url: `${ruta}/${id}/reprogramar`, headers: f.admin,
      payload: { version: 3, fechaPrevista: '2026-11-21' } })).statusCode).toBe(422);
  });
  it('filtra por ciclo, responsable, estado y fecha antes de paginar', async () => {
    const datos = { ...f.datos(), fechaPrevista: '2027-01-02' };
    await f.crear(datos);
    const res = await f.app.inject({ method: 'GET', headers: f.campo,
      url: `${ruta}?cicloId=${f.cicloId}&responsableId=${f.campoId}&estado=PENDIENTE&desde=2027-01-01&hasta=2027-01-31&limit=1&offset=0` });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.map((j: { id: string }) => j.id)).toEqual([datos.operacionId]);
    const segunda = await f.app.inject({ method: 'GET', url: `${ruta}?desde=2027-01-01&limit=1&offset=1`, headers: f.campo });
    expect(segunda.json().data).toEqual([]);
  });
  it('reintentar la misma operación no duplica jornadas ni historial, aun tras reprogramarla', async () => {
    const datos = f.datos(); await f.crear(datos);
    await f.app.inject({ method: 'PATCH', url: `${ruta}/${datos.operacionId}/reprogramar`, headers: f.campo,
      payload: { version: 1, fechaPrevista: '2026-11-21' } });
    expect((await f.crear(datos)).statusCode).toBe(201);
    expect((await f.pool.query('select count(*)::int as n from cosechas_programadas_historial where jornada_id=$1', [datos.operacionId])).rows[0].n).toBe(2);
    expect((await f.crear({ ...datos, cantidadEstimadaKg: 101 })).statusCode).toBe(409);
    expect((await f.crear(datos, f.admin)).statusCode).toBe(409);
  });
  it('reintenta UUID en mayúsculas sin duplicar la programación ni su historial', async () => {
    const datos = f.datos();
    const mayusculas = { ...datos, operacionId: datos.operacionId.toUpperCase(),
      cicloId: datos.cicloId.toUpperCase(), responsableId: datos.responsableId.toUpperCase() };
    for (let intento = 0; intento < 2; intento++) {
      expect((await f.app.inject({ method: 'POST', url: ruta, headers: f.campo, payload: mayusculas })).statusCode).toBe(201);
    }
    expect((await f.crear(datos)).statusCode).toBe(201);
    expect((await f.pool.query('select count(*)::int as n from cosechas_programadas_historial where jornada_id=$1', [datos.operacionId])).rows[0].n).toBe(1);
  });
  it.each([0, 0.01, 0.29, 99999999.99])('persiste exactamente %s kg estimados', async cantidadEstimadaKg => {
    const datos = { ...f.datos(), cantidadEstimadaKg };
    expect((await f.crear(datos)).statusCode).toBe(201);
    expect((await f.pool.query('select cantidad_estimada_kg from cosechas_programadas where id=$1', [datos.operacionId])).rows[0].cantidad_estimada_kg).toBe(cantidadEstimadaKg.toFixed(2));
  });
  it.each([-1, 0.001, 0.1 + 0.2, 100000000, '12.25'])('rechaza %s sin insertar ni redondear', async cantidadEstimadaKg => {
    const datos = { ...f.datos(), cantidadEstimadaKg };
    const res = await f.app.inject({ method: 'POST', url: ruta, headers: f.campo, payload: datos });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details[0].field).toBe('cantidadEstimadaKg');
    expect((await f.pool.query('select id from cosechas_programadas where id=$1', [datos.operacionId])).rows).toEqual([]);
  });
  it.each([
    { fechaPrevista: '2026-02-30' }, { responsableId: 'no-uuid' }, { sector: ' ' },
    { fincaId: randomUUID() }, { timestampServidor: '2026-10-29' }, { cantidadCosechadaKg: 100 },
  ])('rechaza contrato inválido %j antes de SQL', async cambio => {
    expect((await f.app.inject({ method: 'POST', url: ruta, headers: f.campo, payload: { ...f.datos(), ...cambio } })).statusCode).toBe(400);
  });
  it('rechaza ID inválido, ciclo inexistente, responsable inexistente y rango invertido', async () => {
    expect((await f.app.inject({ method: 'GET', url: `${ruta}/no-uuid`, headers: f.admin })).statusCode).toBe(400);
    expect((await f.crear({ ...f.datos(), cicloId: randomUUID() }, f.admin)).statusCode).toBe(404);
    expect((await f.crear({ ...f.datos(), responsableId: randomUUID() })).statusCode).toBe(422);
    expect((await f.app.inject({ method: 'GET', url: `${ruta}?desde=2026-11-02&hasta=2026-11-01`, headers: f.campo })).statusCode).toBe(400);
  });
  it('rechaza programación/reprogramación en ciclo finalizado y permite cancelar el pendiente', async () => {
    const ciclo = randomUUID();
    await f.pool.query(`insert into ciclos_productivos(id,plantacion_id,nombre_codigo,fecha_inicio_prevista,fecha_fin_prevista,responsable_seguimiento_id)
      select $1,plantacion_id,$2,fecha_inicio_prevista,fecha_fin_prevista,responsable_seguimiento_id from ciclos_productivos where id=$3`, [ciclo, `FIN-${ciclo.slice(0, 20)}`, f.cicloId]);
    const datos = { ...f.datos(), cicloId: ciclo };
    expect((await f.crear(datos)).statusCode).toBe(201);
    await f.pool.query("update ciclos_productivos set estado='FINALIZADO',fecha_inicio_efectiva='2026-10-01',fecha_fin_efectiva='2026-10-27' where id=$1", [ciclo]);
    expect((await f.crear(datos)).statusCode).toBe(201);
    expect((await f.pool.query('select count(*)::int as n from cosechas_programadas_historial where jornada_id=$1', [datos.operacionId])).rows[0].n).toBe(1);
    expect((await f.crear({ ...datos, operacionId: randomUUID() })).statusCode).toBe(422);
    expect((await f.app.inject({ method: 'PATCH', url: `${ruta}/${datos.operacionId}/reprogramar`, headers: f.campo,
      payload: { version: 1, fechaPrevista: '2026-11-21' } })).statusCode).toBe(422);
    expect((await f.app.inject({ method: 'PATCH', url: `${ruta}/${datos.operacionId}/cancelar`, headers: f.campo,
      payload: { version: 1, motivoCancelacion: 'Ciclo cerrado' } })).statusCode).toBe(200);
  });
  it('revierte la cabecera si falla la auditoría automática', async () => {
    const datos = { ...f.datos(), sector: 'FALLAR' };
    await f.pool.query("alter table cosechas_programadas_historial add constraint fallo_auditoria_test check(nuevo->>'sector' <> 'FALLAR')");
    try {
      expect((await f.crear(datos)).statusCode).toBe(422);
      expect((await f.pool.query('select id from cosechas_programadas where id=$1', [datos.operacionId])).rows).toEqual([]);
      expect((await f.pool.query('select id from cosechas_programadas_historial where jornada_id=$1', [datos.operacionId])).rows).toEqual([]);
    } finally { await f.pool.query('alter table cosechas_programadas_historial drop constraint fallo_auditoria_test'); }
  });
  it.each([
    'update cosechas_programadas_historial set actor_id=actor_id where jornada_id=$1',
    'delete from cosechas_programadas_historial where jornada_id=$1',
    'delete from cosechas_programadas where id=$1',
    "update cosechas_programadas set estado='EJECUTADA' where id=$1",
    "update cosechas_programadas set cantidad_estimada_kg=999 where id=$1",
  ])('protege estados e historial ante SQL directo: %s', async sql => {
    const id = (await f.crear()).json().data.id;
    await expect(f.pool.query(sql, [id])).rejects.toMatchObject({ code: '23514' });
    expect((await f.pool.query('select version from cosechas_programadas where id=$1', [id])).rows[0].version).toBe(1);
  });
  it('no permite fabricar historia ni truncar las bitácoras', async () => {
    const id = (await f.crear()).json().data.id;
    await expect(f.pool.query(`insert into cosechas_programadas_historial(jornada_id,operacion,actor_id,nuevo)
      values($1,'PROGRAMACION',$2,'{}')`, [id, f.adminId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('truncate cosechas_programadas_historial')).rejects.toMatchObject({ code: '23514' });
  });
  it('las FK impiden eliminar ciclo y responsable con jornadas históricas', async () => {
    await f.crear();
    await expect(f.pool.query('delete from ciclos_productivos where id=$1', [f.cicloId])).rejects.toMatchObject({ code: expect.stringMatching(/^(23503|23001)$/) });
    await expect(f.pool.query('delete from usuarios where id=$1', [f.campoId])).rejects.toMatchObject({ code: expect.stringMatching(/^(23503|23001)$/) });
    expect((await f.pool.query('select id from usuarios where id=$1', [f.campoId])).rows).toHaveLength(1);
  });
});
