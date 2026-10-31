import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PoscosechaFixture } from '../helpers/poscosecha-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';
import { ClasificacionProduccion } from '../../src/core/domain/entities/poscosecha.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056 CU47/CU48: clasificación exacta y descarte', () => {
  const f = new PoscosechaFixture();
  beforeAll(() => f.preparar(url!), 30000); afterAll(() => f.cerrar());
  it('clasifica en fresco/industria/descarte y crea solo partidas aprovechables con todo el linaje', async () => {
    const cosechaId = await f.cosecha(), datos = f.datosClasificacion(cosechaId);
    const res = await f.clasificar(datos); expect(res.statusCode).toBe(201);
    const salida = res.json<{ data: ClasificacionProduccion }>().data;
    expect(salida).toMatchObject({ id: datos.operacionId, cosechaId, kgFresco: 6, kgIndustria: 3, kgDescarte: 1 });
    expect(salida.partidas.map(p => [p.categoria, p.cantidadInicialKg]).sort()).toEqual([['FRESCO', 6], ['INDUSTRIA', 3]]);
    expect(salida.partidas.every(p => p.cosechaId === cosechaId && p.cicloId === f.cicloId && p.clasificacionId === salida.id)).toBe(true);
    expect(salida.partidas.every(p => p.cantidadDisponibleKg === p.cantidadInicialKg && p.cantidadAcondicionadaKg === 0)).toBe(true);
    const { rows } = await f.pool.query("select actor_id,ubicacion_id,payload_especifico from eventos_trazabilidad where payload_especifico->>'clasificacionId'=$1 and tipo_evento='CLASIFICACION'", [salida.id]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actor_id: f.campoId, ubicacion_id: f.fincaId, payload_especifico: { cosechaId, kgDescarte: 1, motivosDescarte: ['Daño de fruta'] } });
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/clasificaciones/${salida.id}`, headers: f.campo })).statusCode).toBe(200);
  });
  it('CU47 guarda observaciones y exige que los kg por causa sumen el descarte', async () => {
    const cosechaId = await f.cosecha();
    const base = { ...f.datosClasificacion(cosechaId), motivosDescarte: [] as string[] };
    const mal = { ...base, descartePorCausa: [{ causa: 'Golpes', kg: 0.4 }] };
    expect((await f.clasificar(mal)).statusCode).toBeGreaterThanOrEqual(400);
    expect((await f.pool.query('select id from clasificaciones where id=$1', [mal.operacionId])).rows).toEqual([]);
    const ok = { ...base, operacionId: randomUUID(), observaciones: ' Lote con granizo ',
      descartePorCausa: [{ causa: 'Golpes', kg: 0.4 }, { causa: 'Plaga', kg: 0.6 }] };
    const res = await f.clasificar(ok); expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ observaciones: 'Lote con granizo', motivosDescarte: ['Golpes', 'Plaga'],
      descartePorCausa: [{ causa: 'Golpes', kg: 0.4 }, { causa: 'Plaga', kg: 0.6 }] });
  });
  it('acepta clasificaciones parciales y no permite superar el acumulado cosechado', async () => {
    const cosechaId = await f.cosecha();
    const parcial = () => ({ ...f.datosClasificacion(cosechaId), cantidadRecibidaKg: 5, kgFresco: 3, kgIndustria: 1, kgDescarte: 1 });
    expect((await f.clasificar(parcial())).statusCode).toBe(201);
    expect((await f.clasificar(parcial())).statusCode).toBe(201);
    expect((await f.clasificar(parcial())).statusCode).toBe(422);
    expect((await f.pool.query('select sum(cantidad_recibida_kg)::text as kg from clasificaciones where cosecha_id=$1', [cosechaId])).rows[0].kg).toBe('10.00');
  });
  it('acepta 0.10 + 0.20 = 0.30 en dominio y PostgreSQL', async () => {
    const cosechaId = await f.cosecha(0.3);
    const res = await f.clasificar({ ...f.datosClasificacion(cosechaId), cantidadRecibidaKg: 0.3, kgFresco: 0.1, kgIndustria: 0.2, kgDescarte: 0, motivosDescarte: [] });
    expect(res.statusCode).toBe(201);
    expect(res.json().data.partidas.map((p: { cantidadInicialKg: number }) => p.cantidadInicialKg).sort()).toEqual([0.1, 0.2]);
  });
  it('una recepción totalmente descartada no crea ninguna partida', async () => {
    const cosechaId = await f.cosecha();
    const res = await f.clasificar({ ...f.datosClasificacion(cosechaId), kgFresco: 0, kgIndustria: 0, kgDescarte: 10 });
    expect(res.statusCode).toBe(201); expect(res.json().data.partidas).toEqual([]);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/partidas-produccion?cosechaId=${cosechaId}`, headers: f.campo })).json().data).toEqual([]);
  });
  it('el reintento devuelve las mismas partidas sin duplicar hechos, y otro contenido/actor recibe 409', async () => {
    const datos = f.datosClasificacion(await f.cosecha());
    const a = await f.clasificar(datos), b = await f.clasificar(datos);
    expect(a.statusCode).toBe(201); expect(b.statusCode).toBe(201);
    expect(b.json().data.partidas).toEqual(a.json().data.partidas);
    expect((await f.clasificar({ ...datos, motivosDescarte: ['Otra causa'] })).statusCode).toBe(409);
    expect((await f.clasificar(datos, f.admin)).statusCode).toBe(409);
    expect((await f.pool.query("select count(*)::int as n from eventos_trazabilidad where tipo_evento='CLASIFICACION' and payload_especifico->>'clasificacionId'=$1", [datos.operacionId])).rows[0].n).toBe(1);
  });
  it.each([{ kgFresco: 5.99 }, { motivosDescarte: [] }, { fechaClasificacion: '2026-10-14' }, { fechaClasificacion: '9999-01-01' }])('rechaza regla de negocio %j sin partidas', async cambio => {
    const datos = { ...f.datosClasificacion(await f.cosecha()), ...cambio };
    expect((await f.clasificar(datos)).statusCode).toBe(422);
    expect((await f.pool.query('select id from clasificaciones where id=$1', [datos.operacionId])).rows).toEqual([]);
  });
  it.each([{ kgFresco: -1 }, { kgFresco: 0.001 }, { kgIndustria: 100000000 }, { motivosDescarte: [' '] }, { fincaId: randomUUID() }, { fechaClasificacion: '2026-02-30' }])('rechaza contrato inválido %j', async cambio => {
    const payload = { ...f.datosClasificacion(await f.cosecha()), ...cambio };
    expect((await f.app.inject({ method: 'POST', url: '/api/v1/clasificaciones', headers: f.campo, payload })).statusCode).toBe(400);
  });
  it('filtra clasificaciones y partidas por cosecha, categoría y página', async () => {
    const cosechaId = await f.cosecha(), res = await f.clasificar(f.datosClasificacion(cosechaId));
    expect(res.statusCode).toBe(201);
    const lista = await f.app.inject({ method: 'GET', url: `/api/v1/clasificaciones?cosechaId=${cosechaId}&desde=2026-10-16&hasta=2026-10-16&limit=1`, headers: f.campo });
    expect(lista.statusCode).toBe(200); expect(lista.json().data).toHaveLength(1);
    const partidas = await f.app.inject({ method: 'GET', url: `/api/v1/partidas-produccion?clasificacionId=${res.json().data.id}&categoria=INDUSTRIA&limit=1`, headers: f.campo });
    expect(partidas.json().data).toEqual([expect.objectContaining({ categoria: 'INDUSTRIA', cantidadDisponibleKg: 3 })]);
  });
  it('si falla el evento revierte clasificación y partidas, y deja el saldo para reintentar', async () => {
    const datos = f.datosClasificacion(await f.cosecha());
    await f.pool.query("alter table eventos_trazabilidad add constraint fallo_clasificacion_test check(tipo_evento<>'CLASIFICACION') not valid");
    try {
      expect((await f.clasificar(datos)).statusCode).toBe(422);
      expect((await f.pool.query('select id from clasificaciones where id=$1', [datos.operacionId])).rows).toEqual([]);
      expect((await f.pool.query('select id from partidas_produccion where clasificacion_id=$1', [datos.operacionId])).rows).toEqual([]);
    } finally { await f.pool.query('alter table eventos_trazabilidad drop constraint fallo_clasificacion_test'); }
    expect((await f.clasificar(datos)).statusCode).toBe(201);
  });
  it('rechaza INSERT tardío de partidas y mutaciones de historia por SQL directo', async () => {
    const datos = f.datosClasificacion(await f.cosecha()), res = await f.clasificar(datos); expect(res.statusCode).toBe(201);
    await expect(f.pool.query("insert into partidas_produccion(clasificacion_id,categoria,cantidad_inicial_kg,cantidad_disponible_kg) values($1,'FRESCO',1,1)", [datos.operacionId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('update clasificaciones set kg_fresco=5 where id=$1', [datos.operacionId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('delete from clasificaciones where id=$1', [datos.operacionId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('update partidas_produccion set cantidad_disponible_kg=99 where clasificacion_id=$1', [datos.operacionId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('truncate clasificaciones cascade')).rejects.toMatchObject({ code: '23514' });
  });
});
