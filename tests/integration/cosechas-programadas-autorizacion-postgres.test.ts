import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JornadasPostgresFixture, RUTA_JORNADAS as ruta, URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: roles, fincas y sesiones persistidas', () => {
  const f = new JornadasPostgresFixture();
  let propio: string, ajeno: string;
  beforeAll(async () => {
    await f.preparar(url!);
    propio = (await f.crear({ ...f.datos(), fechaPrevista: '2026-11-15' })).json().data.id;
    const res = await f.crear({ ...f.datos(), cicloId: f.otroCicloId, fechaPrevista: '2026-11-01' }, f.admin);
    expect(res.statusCode).toBe(201); ajeno = res.json().data.id;
  }, 30000);
  afterAll(() => f.cerrar());
  it('filtra la finca en SQL antes de paginar y permite al administrador consultar ambas', async () => {
    const lista = await f.app.inject({ method: 'GET', url: `${ruta}?limit=1`, headers: f.campo });
    expect(lista.statusCode).toBe(200);
    expect(lista.json().data.map((j: { id: string }) => j.id)).toEqual([propio]);
    expect((await f.app.inject({ method: 'GET', url: `${ruta}/${propio}`, headers: f.campo })).statusCode).toBe(200);
    expect((await f.app.inject({ method: 'GET', url: `${ruta}/${ajeno}`, headers: f.admin })).statusCode).toBe(200);
    expect((await f.app.inject({ method: 'GET', url: `${ruta}?cicloId=${f.otroCicloId}`, headers: f.campo })).json().data).toEqual([]);
  });
  it('niega crear, leer, reprogramar, cancelar o consultar historia de otra finca sin mutaciones', async () => {
    const antes = (await f.pool.query('select * from cosechas_programadas where id=$1', [ajeno])).rows;
    expect((await f.crear({ ...f.datos(), cicloId: f.otroCicloId })).statusCode).toBe(403);
    for (const suffix of ['', '/historial']) {
      expect((await f.app.inject({ method: 'GET', url: `${ruta}/${ajeno}${suffix}`, headers: f.campo })).statusCode).toBe(403);
    }
    expect((await f.app.inject({ method: 'PATCH', url: `${ruta}/${ajeno}/reprogramar`, headers: f.campo,
      payload: { version: 1, fechaPrevista: '2026-11-20' } })).statusCode).toBe(403);
    expect((await f.app.inject({ method: 'PATCH', url: `${ruta}/${ajeno}/cancelar`, headers: f.campo,
      payload: { version: 1, motivoCancelacion: 'Intento ajeno' } })).statusCode).toBe(403);
    expect((await f.pool.query('select * from cosechas_programadas where id=$1', [ajeno])).rows).toEqual(antes);
  });
  it('no permite usar una clave idempotente para leer una finca ajena', async () => {
    const datos = { ...f.datos(), cicloId: f.otroCicloId };
    expect((await f.crear(datos, f.admin)).statusCode).toBe(201);
    expect((await f.crear(datos, f.campo)).statusCode).toBe(403);
    expect((await f.crear({ ...datos, cicloId: f.cicloId }, f.campo)).statusCode).toBe(409);
  });
  it('un encargado sin asignaciones no obtiene recursos ni puede programar', async () => {
    expect((await f.app.inject({ method: 'GET', url: ruta, headers: f.sinFincas })).json().data).toEqual([]);
    expect((await f.app.inject({ method: 'GET', url: `${ruta}/${propio}`, headers: f.sinFincas })).statusCode).toBe(403);
    expect((await f.crear(f.datos(), f.sinFincas)).statusCode).toBe(403);
  });
  it.each(['operario', 'sistema'] as const)('niega lectura y escritura al rol %s', async rol => {
    expect((await f.app.inject({ method: 'GET', url: ruta, headers: f[rol] })).statusCode).toBe(403);
    expect((await f.crear(f.datos(), f[rol])).statusCode).toBe(403);
  });
  it('niega anónimos y tokens falsos', async () => {
    expect((await f.app.inject({ method: 'GET', url: ruta })).statusCode).toBe(401);
    expect((await f.app.inject({ method: 'GET', url: ruta, headers: { authorization: 'Bearer invalido' } })).statusCode).toBe(401);
    expect((await f.crear(f.datos(), { authorization: '' })).statusCode).toBe(401);
  });
  it('revalida las asignaciones revocadas con el mismo token', async () => {
    await f.asignaciones.desasignarFinca(f.campoId, f.fincaId);
    try {
      expect((await f.app.inject({ method: 'GET', url: ruta, headers: f.campo })).json().data).toEqual([]);
      expect((await f.app.inject({ method: 'GET', url: `${ruta}/${propio}`, headers: f.campo })).statusCode).toBe(403);
      expect((await f.crear()).statusCode).toBe(403);
    } finally { await f.asignaciones.asignarFincas(f.campoId, [f.fincaId]); }
  });
  it('niega operación cuando se exige cambio de contraseña inicial', async () => {
    await f.pool.query('update usuarios set debe_cambiar_password=true where id=$1', [f.campoId]);
    try { expect((await f.crear()).statusCode).toBe(403); }
    finally { await f.pool.query('update usuarios set debe_cambiar_password=false where id=$1', [f.campoId]); }
  });
  it('rechaza asignar como responsable a un usuario inactivo', async () => {
    await f.pool.query("update usuarios set estado='INACTIVO' where id=$1", [f.operarioId]);
    try {
      expect((await f.crear({ ...f.datos(), responsableId: f.operarioId }, f.admin)).statusCode).toBe(422);
    } finally { await f.pool.query("update usuarios set estado='ACTIVO' where id=$1", [f.operarioId]); }
  });
});
