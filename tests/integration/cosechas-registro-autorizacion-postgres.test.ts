import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CosechasRegistroFixture } from '../helpers/cosechas-registro-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: autorización de cosechas persistidas', () => {
  const f = new CosechasRegistroFixture();
  let propio = '', ajeno = '';
  beforeAll(async () => {
    await f.preparar(url!);
    const a = await f.registrar(); expect(a.statusCode).toBe(201); propio = a.json().data.id;
    const b = await f.registrar({ ...f.datosCosecha(), cicloId: f.otroCicloId, fechaEfectiva: '2026-10-16' }, f.admin);
    expect(b.statusCode).toBe(201); ajeno = b.json().data.id;
  }, 30000);
  afterAll(() => f.cerrar());
  it('filtra SQL antes de paginar y no mezcla cosechas de otra finca', async () => {
    const lista = await f.app.inject({ method: 'GET', url: '/api/v1/cosechas?limit=1', headers: f.campo });
    expect(lista.statusCode).toBe(200); expect(lista.json().data.map((c: { id: string }) => c.id)).toEqual([propio]);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/cosechas/${propio}`, headers: f.campo })).statusCode).toBe(200);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/cosechas/${ajeno}`, headers: f.campo })).statusCode).toBe(403);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/cosechas/${ajeno}`, headers: f.admin })).statusCode).toBe(200);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/cosechas?cicloId=${f.otroCicloId}`, headers: f.campo })).json().data).toEqual([]);
  });
  it('niega el registro directo y programado de otra finca sin escribir', async () => {
    const directa = { ...f.datosCosecha(), cicloId: f.otroCicloId };
    expect((await f.registrar(directa)).statusCode).toBe(403);
    const j = await f.crear({ ...f.datos(), cicloId: f.otroCicloId }, f.admin); expect(j.statusCode).toBe(201);
    const { cicloId: _cicloId, ...pesaje } = f.datosCosecha();
    expect((await f.registrar({ ...pesaje, origen: 'PROGRAMADA', cosechaProgramadaId: j.json().data.id, versionProgramacion: 1 })).statusCode).toBe(403);
    expect((await f.pool.query('select id from cosechas where id=$1', [directa.operacionId])).rows).toEqual([]);
    expect((await f.pool.query('select estado from cosechas_programadas where id=$1', [j.json().data.id])).rows[0].estado).toBe('PENDIENTE');
  });
  it('un usuario sin asignaciones no consulta ni registra cosechas', async () => {
    expect((await f.app.inject({ method: 'GET', url: '/api/v1/cosechas', headers: f.sinFincas })).json().data).toEqual([]);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/cosechas/${propio}`, headers: f.sinFincas })).statusCode).toBe(403);
    expect((await f.registrar(f.datosCosecha(), f.sinFincas)).statusCode).toBe(403);
  });
  it.each(['operario', 'sistema'] as const)('niega el contrato al perfil %s', async perfil => {
    expect((await f.registrar(f.datosCosecha(), f[perfil])).statusCode).toBe(403);
    expect((await f.app.inject({ method: 'GET', url: '/api/v1/cosechas', headers: f[perfil] })).statusCode).toBe(403);
  });
  it('niega anónimos y JWT inválidos', async () => {
    expect((await f.app.inject({ method: 'GET', url: '/api/v1/cosechas' })).statusCode).toBe(401);
    expect((await f.registrar(f.datosCosecha(), { authorization: 'Bearer invalido' })).statusCode).toBe(401);
  });
  it('revalida la revocación de finca aun para una operación idempotente del mismo token', async () => {
    const datos = f.datosCosecha(); expect((await f.registrar(datos)).statusCode).toBe(201);
    await f.asignaciones.desasignarFinca(f.campoId, f.fincaId);
    try {
      expect((await f.app.inject({ method: 'GET', url: '/api/v1/cosechas', headers: f.campo })).json().data).toEqual([]);
      expect((await f.registrar(datos)).statusCode).toBe(403);
      expect((await f.app.inject({ method: 'GET', url: `/api/v1/cosechas/${propio}`, headers: f.campo })).statusCode).toBe(403);
    } finally { await f.asignaciones.asignarFincas(f.campoId, [f.fincaId]); }
  });
  it('rechaza el cambio inicial de contraseña pendiente', async () => {
    await f.pool.query('update usuarios set debe_cambiar_password=true where id=$1', [f.campoId]);
    try { expect((await f.registrar()).statusCode).toBe(403); }
    finally { await f.pool.query('update usuarios set debe_cambiar_password=false where id=$1', [f.campoId]); }
  });
  it('no acepta un token cuya sesión persistida fue revocada', async () => {
    await f.pool.query('delete from sesiones_usuarios where usuario_id=$1', [f.campoId]);
    expect((await f.registrar()).statusCode).toBe(401);
  });
});
