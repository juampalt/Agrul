import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PoscosechaFixture } from '../helpers/poscosecha-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';
import { ClasificacionProduccion, RegistrarAcondicionamiento, RegistrarClasificacion } from '../../src/core/domain/entities/poscosecha.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
const rutas = ['clasificaciones', 'partidas-produccion', 'acondicionamientos'] as const;
describe.skipIf(!url)('AGRUL-056: permisos de poscosecha por finca, recurso y sesión', () => {
  const f = new PoscosechaFixture();
  const ids = { propio: { clasificaciones: '', 'partidas-produccion': '', acondicionamientos: '' },
    ajeno: { clasificaciones: '', 'partidas-produccion': '', acondicionamientos: '' } };
  let originalC: RegistrarClasificacion, originalA: RegistrarAcondicionamiento, otraCosecha: string;
  beforeAll(async () => {
    await f.preparar(url!);
    for (const tipo of ['propio', 'ajeno'] as const) {
      const ajeno = tipo === 'ajeno';
      const cosecha = await f.registrar({ ...f.datosCosecha(), cicloId: ajeno ? f.otroCicloId : f.cicloId }, ajeno ? f.admin : f.campo);
      expect(cosecha.statusCode).toBe(201); const cosechaId = cosecha.json().data.id;
      if (ajeno) otraCosecha = cosechaId;
      const datos = { ...f.datosClasificacion(cosechaId), kgFresco: 10, kgIndustria: 0, kgDescarte: 0,
        motivosDescarte: [], fechaClasificacion: ajeno ? '2026-10-17' : '2026-10-16' };
      const clasificada = await f.clasificar(datos, ajeno ? f.admin : f.campo); expect(clasificada.statusCode).toBe(201);
      const c = clasificada.json<{ data: ClasificacionProduccion }>().data;
      ids[tipo].clasificaciones = c.id; ids[tipo]['partidas-produccion'] = c.partidas[0].id;
      const empaque = { ...f.datosAcondicionamiento(c.partidas[0].id), fechaAcondicionamiento: ajeno ? '2026-10-18' : '2026-10-17' };
      const a = await f.acondicionar(empaque, ajeno ? f.admin : f.campo); expect(a.statusCode).toBe(201);
      ids[tipo].acondicionamientos = a.json().data.id;
      if (!ajeno) { originalC = datos; originalA = empaque; }
    }
  }, 30000);
  afterAll(() => f.cerrar());
  it.each(rutas)('filtra %s antes de paginar y oculta detalle ajeno', async ruta => {
    const lista = await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}?limit=1`, headers: f.campo });
    expect(lista.statusCode).toBe(200); expect(lista.json().data.map((r: { id: string }) => r.id)).toEqual([ids.propio[ruta]]);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}/${ids.ajeno[ruta]}`, headers: f.campo })).statusCode).toBe(404);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}/${ids.ajeno[ruta]}`, headers: f.admin })).statusCode).toBe(200);
  });
  it('niega clasificar o acondicionar otra finca sin alterar saldos', async () => {
    expect((await f.clasificar(f.datosClasificacion(otraCosecha))).statusCode).toBe(403);
    expect((await f.acondicionar(f.datosAcondicionamiento(ids.ajeno['partidas-produccion']))).statusCode).toBe(403);
    const p = await f.app.inject({ method: 'GET', url: `/api/v1/partidas-produccion/${ids.ajeno['partidas-produccion']}`, headers: f.admin });
    expect(p.json().data).toMatchObject({ cantidadDisponibleKg: 10, cantidadAcondicionadaKg: 3 });
  });
  it('niega a usuarios sin asignaciones', async () => {
    for (const ruta of rutas) expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}`, headers: f.sinFincas })).json().data).toEqual([]);
    expect((await f.clasificar(originalC, f.sinFincas)).statusCode).toBe(403);
    expect((await f.acondicionar(originalA, f.sinFincas)).statusCode).toBe(403);
  });
  it.each(['operario', 'sistema'] as const)('niega lectura y escritura al perfil %s', async perfil => {
    for (const ruta of rutas) expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}`, headers: f[perfil] })).statusCode).toBe(403);
    expect((await f.clasificar(originalC, f[perfil])).statusCode).toBe(403);
    expect((await f.acondicionar(originalA, f[perfil])).statusCode).toBe(403);
  });
  it('revalida revocaciones también en reintentos con la misma clave y token', async () => {
    await f.asignaciones.desasignarFinca(f.campoId, f.fincaId);
    try {
      for (const ruta of rutas) expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}`, headers: f.campo })).json().data).toEqual([]);
      expect((await f.clasificar(originalC)).statusCode).toBe(403); expect((await f.acondicionar(originalA)).statusCode).toBe(403);
    } finally { await f.asignaciones.asignarFincas(f.campoId, [f.fincaId]); }
  });
  it('no acepta alcance de finca desde el cliente ni tokens falsos', async () => {
    for (const ruta of rutas) {
      expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}?fincaIds=${f.otraFincaId}`, headers: f.campo })).statusCode).toBe(400);
      expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}`, headers: { authorization: 'Bearer invalido' } })).statusCode).toBe(401);
      expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}` })).statusCode).toBe(401);
    }
  });
  it('requiere responsable activo para hechos nuevos', async () => {
    const datos = f.datosClasificacion(await f.cosecha());
    await f.pool.query("update usuarios set estado='INACTIVO' where id=$1", [f.operarioId]);
    try {
      expect((await f.clasificar({ ...datos, responsableId: f.operarioId })).statusCode).toBe(422);
      expect((await f.acondicionar({ ...f.datosAcondicionamiento(ids.propio['partidas-produccion']), responsableId: f.operarioId })).statusCode).toBe(422);
    } finally { await f.pool.query("update usuarios set estado='ACTIVO' where id=$1", [f.operarioId]); }
  });
  it('rechaza una sesión persistida que ya fue revocada', async () => {
    await f.pool.query('delete from sesiones_usuarios where usuario_id=$1', [f.campoId]);
    expect((await f.clasificar(originalC)).statusCode).toBe(401);
    expect((await f.acondicionar(originalA)).statusCode).toBe(401);
  });
});
