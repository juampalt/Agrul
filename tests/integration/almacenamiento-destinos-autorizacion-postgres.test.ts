import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AlmacenamientoProduccionFixture } from '../helpers/almacenamiento-produccion-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';
import { RegistrarCamara, RegistrarDestinoProduccion, RegistrarMovimientoAlmacenamiento } from '../../src/core/domain/entities/almacenamiento-produccion.js';
import { ClasificacionProduccion } from '../../src/core/domain/entities/poscosecha.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
const rutas = ['almacenamiento/camaras', 'almacenamiento/movimientos', 'destinos-produccion'] as const;
describe.skipIf(!url)('AGRUL-056: fincas y sesiones de cámaras y destinos', () => {
  const f = new AlmacenamientoProduccionFixture();
  let propia: string, ajena: string, partida: string, otraPartida: string;
  let camaraOriginal: RegistrarCamara, movimientoOriginal: RegistrarMovimientoAlmacenamiento, destinoOriginal: RegistrarDestinoProduccion;
  const ids = { 'almacenamiento/camaras': '', 'almacenamiento/movimientos': '', 'destinos-produccion': '' };
  beforeAll(async () => {
    await f.preparar(url!); partida = await f.partida();
    camaraOriginal = { ...f.datosCamara(), nombre: `Z-${randomUUID()}` };
    const a = await f.registrarCamara(camaraOriginal); expect(a.statusCode).toBe(201); propia = a.json().data.id;
    movimientoOriginal = f.datosMovimiento(partida, propia); expect((await f.mover(movimientoOriginal)).statusCode).toBe(201);
    destinoOriginal = f.datosDestino(partida, 2); expect((await f.destinar(destinoOriginal)).statusCode).toBe(201);
    const h = await f.registrar({ ...f.datosCosecha(), cicloId: f.otroCicloId, cantidadCosechadaKg: 10 }, f.admin); expect(h.statusCode).toBe(201);
    const c = await f.clasificar({ ...f.datosClasificacion(h.json().data.id), kgFresco: 10, kgIndustria: 0, kgDescarte: 0, motivosDescarte: [] }, f.admin);
    expect(c.statusCode).toBe(201); otraPartida = c.json<{ data: ClasificacionProduccion }>().data.partidas[0].id;
    const b = await f.registrarCamara({ ...f.datosCamara(f.otraFincaId), nombre: `A-${randomUUID()}` }, f.admin); expect(b.statusCode).toBe(201); ajena = b.json().data.id;
    const mov = await f.mover({ ...f.datosMovimiento(otraPartida, ajena, 4), fechaMovimiento: '2026-10-18' }, f.admin); expect(mov.statusCode).toBe(201);
    const dest = await f.destinar({ ...f.datosDestino(otraPartida, 1), fechaDestino: '2026-10-20' }, f.admin); expect(dest.statusCode).toBe(201);
    ids['almacenamiento/camaras'] = ajena; ids['almacenamiento/movimientos'] = mov.json().data.id; ids['destinos-produccion'] = dest.json().data.id;
  }, 30000);
  afterAll(() => f.cerrar());
  it.each(rutas)('filtra %s antes de paginar y oculta detalle ajeno', async ruta => {
    const lista = await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}?limit=1`, headers: f.campo });
    expect(lista.statusCode).toBe(200); expect(lista.json().data).toHaveLength(1);
    const propio = ruta === 'almacenamiento/camaras' ? propia : ruta === 'almacenamiento/movimientos' ? movimientoOriginal.operacionId : destinoOriginal.operacionId;
    expect(lista.json().data[0].id).toBe(propio);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}/${ids[ruta]}`, headers: f.campo })).statusCode).toBe(404);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}/${ids[ruta]}`, headers: f.admin })).statusCode).toBe(200);
  });
  it('no expone saldos de otras fincas aunque se filtre su cámara o finca', async () => {
    const own = await f.app.inject({ method: 'GET', url: '/api/v1/almacenamiento/saldos?limit=1', headers: f.campo });
    expect(own.json().data).toEqual([expect.objectContaining({ camaraSectorId: propia, partidaProduccionId: partida, cantidadKg: 3 })]);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/almacenamiento/saldos?camaraSectorId=${ajena}`, headers: f.campo })).json().data).toEqual([]);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/almacenamiento/camaras?fincaId=${f.otraFincaId}`, headers: f.campo })).json().data).toEqual([]);
  });
  it('niega escrituras ajenas y vínculos de cámara/partida entre fincas', async () => {
    expect((await f.registrarCamara(f.datosCamara(f.otraFincaId))).statusCode).toBe(403);
    expect((await f.mover(f.datosMovimiento(otraPartida, ajena))).statusCode).toBe(403);
    expect((await f.mover(f.datosMovimiento(partida, ajena))).statusCode).toBe(403);
    expect((await f.mover(f.datosMovimiento(partida, ajena), f.admin)).statusCode).toBe(422);
    expect((await f.destinar(f.datosDestino(otraPartida))).statusCode).toBe(403);
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 5, cantidadEnCamaraKg: 3, cantidadDestinadaKg: 2 });
  });
  it('usuarios sin asignaciones no consultan saldos ni registran operaciones', async () => {
    for (const ruta of [...rutas, 'almacenamiento/saldos']) expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}`, headers: f.sinFincas })).json().data).toEqual([]);
    expect((await f.registrarCamara(f.datosCamara(), f.sinFincas)).statusCode).toBe(403);
    expect((await f.mover(movimientoOriginal, f.sinFincas)).statusCode).toBe(403);
    expect((await f.destinar(destinoOriginal, f.sinFincas)).statusCode).toBe(403);
  });
  it.each(['operario', 'sistema'] as const)('niega lecturas y escrituras al perfil %s', async perfil => {
    for (const ruta of [...rutas, 'almacenamiento/saldos']) expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}`, headers: f[perfil] })).statusCode).toBe(403);
    expect((await f.registrarCamara(f.datosCamara(), f[perfil])).statusCode).toBe(403);
    expect((await f.mover(movimientoOriginal, f[perfil])).statusCode).toBe(403);
    expect((await f.destinar(destinoOriginal, f[perfil])).statusCode).toBe(403);
  });
  it('revalida finca revocada con el mismo token incluso en reintentos idempotentes', async () => {
    await f.asignaciones.desasignarFinca(f.campoId, f.fincaId);
    try {
      expect((await f.registrarCamara(camaraOriginal)).statusCode).toBe(403);
      expect((await f.mover(movimientoOriginal)).statusCode).toBe(403); expect((await f.destinar(destinoOriginal)).statusCode).toBe(403);
      expect((await f.app.inject({ method: 'GET', url: '/api/v1/almacenamiento/saldos', headers: f.campo })).json().data).toEqual([]);
    } finally { await f.asignaciones.asignarFincas(f.campoId, [f.fincaId]); }
  });
  it('rechaza anónimos, token inválido y ampliación del alcance desde el cliente', async () => {
    for (const ruta of [...rutas, 'almacenamiento/saldos']) {
      expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}` })).statusCode).toBe(401);
      expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}`, headers: { authorization: 'Bearer falso' } })).statusCode).toBe(401);
      expect((await f.app.inject({ method: 'GET', url: `/api/v1/${ruta}?fincaIds=${f.otraFincaId}`, headers: f.campo })).statusCode).toBe(400);
    }
  });
  it('exige cambio inicial de contraseña y sesión persistida vigente', async () => {
    await f.pool.query('update usuarios set debe_cambiar_password=true where id=$1', [f.campoId]);
    expect((await f.destinar(destinoOriginal)).statusCode).toBe(403);
    await f.pool.query('update usuarios set debe_cambiar_password=false where id=$1', [f.campoId]);
    await f.pool.query('delete from sesiones_usuarios where usuario_id=$1', [f.campoId]);
    expect((await f.mover(movimientoOriginal)).statusCode).toBe(401);
  });
});
