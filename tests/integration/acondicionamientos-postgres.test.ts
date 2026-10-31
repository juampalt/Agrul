import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PoscosechaFixture } from '../helpers/poscosecha-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';
import { ClasificacionProduccion } from '../../src/core/domain/entities/poscosecha.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056 CU49: acondicionamiento sin duplicación física', () => {
  const f = new PoscosechaFixture();
  beforeAll(() => f.preparar(url!), 30000); afterAll(() => f.cerrar());
  const consultar = (id: string) => f.app.inject({ method: 'GET', url: `/api/v1/partidas-produccion/${id}`, headers: f.campo });
  it('registra empaque y deriva kilos acondicionados sin crear ni descontar otra existencia física', async () => {
    const partida = await f.partida(), datos = f.datosAcondicionamiento(partida);
    const res = await f.acondicionar(datos); expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ cantidadKg: 3, cantidadEnvases: 2, tipoEnvase: 'Bandeja' });
    const detalle = await consultar(partida); expect(detalle.statusCode).toBe(200);
    expect(detalle.json().data).toMatchObject({ cantidadInicialKg: 10, cantidadDisponibleKg: 10,
      cantidadAcondicionadaKg: 3, cantidadSinAcondicionarKg: 7 });
    const { rows } = await f.pool.query("select payload_especifico from eventos_trazabilidad where payload_especifico->>'acondicionamientoId'=$1", [datos.operacionId]);
    expect(rows).toHaveLength(1); expect(rows[0].payload_especifico).toMatchObject({ partidaProduccionId: partida, cantidadKg: 3 });
    expect(rows[0].payload_especifico.cosechaId).toBe(detalle.json().data.cosechaId);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/acondicionamientos/${datos.operacionId}`, headers: f.campo })).statusCode).toBe(200);
  });
  it('CU49 admite envase y cantidad de envases ausentes y guarda observaciones', async () => {
    const partida = await f.partida();
    const { tipoEnvase: _t, cantidadEnvases: _c, ...base } = f.datosAcondicionamiento(partida, 2);
    const res = await f.acondicionar({ ...base, observaciones: ' Sin bandejas ' } as never);
    expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ tipoEnvase: 'Sin especificar', cantidadEnvases: null, observaciones: 'Sin bandejas' });
  });
  it('admite empaque parcial hasta agotar el saldo pendiente y bloquea reempaquetar los mismos kilos', async () => {
    const partida = await f.partida();
    expect((await f.acondicionar(f.datosAcondicionamiento(partida, 3))).statusCode).toBe(201);
    expect((await f.acondicionar(f.datosAcondicionamiento(partida, 7))).statusCode).toBe(201);
    expect((await f.acondicionar(f.datosAcondicionamiento(partida, 0.01))).statusCode).toBe(422);
    expect((await consultar(partida)).json().data).toMatchObject({ cantidadDisponibleKg: 10, cantidadAcondicionadaKg: 10, cantidadSinAcondicionarKg: 0 });
  });
  it('permite acondicionar industria y jamás crea una partida para descarte', async () => {
    const res = await f.clasificar(f.datosClasificacion(await f.cosecha())); expect(res.statusCode).toBe(201);
    const partidas = res.json<{ data: ClasificacionProduccion }>().data.partidas;
    const industria = partidas.find(p => p.categoria === 'INDUSTRIA');
    expect(industria).toBeDefined();
    expect((await f.acondicionar(f.datosAcondicionamiento(industria!.id, 3))).statusCode).toBe(201);
    expect((await f.acondicionar(f.datosAcondicionamiento(randomUUID()))).statusCode).toBe(404);
  });
  it('reintentar no consume otro saldo y cambiar el contenido bajo la misma clave produce 409', async () => {
    const partida = await f.partida(), datos = f.datosAcondicionamiento(partida);
    expect((await f.acondicionar(datos)).statusCode).toBe(201); expect((await f.acondicionar(datos)).statusCode).toBe(201);
    expect((await f.acondicionar({ ...datos, cantidadKg: 4 })).statusCode).toBe(409);
    expect((await consultar(partida)).json().data.cantidadAcondicionadaKg).toBe(3);
  });
  it('filtra por partida, cosecha, fechas y página con el acumulado correcto distinto de cero', async () => {
    const partida = await f.partida(), datos = f.datosAcondicionamiento(partida); await f.acondicionar(datos);
    const cosechaId = (await consultar(partida)).json().data.cosechaId;
    const lista = await f.app.inject({ method: 'GET', url: `/api/v1/acondicionamientos?partidaProduccionId=${partida}&cosechaId=${cosechaId}&desde=2026-10-17&hasta=2026-10-17&limit=1`, headers: f.campo });
    expect(lista.statusCode).toBe(200); expect(lista.json().data.map((a: { id: string }) => a.id)).toEqual([datos.operacionId]);
    const partidas = await f.app.inject({ method: 'GET', url: `/api/v1/partidas-produccion?cosechaId=${cosechaId}`, headers: f.campo });
    expect(partidas.json().data[0]).toMatchObject({ cantidadAcondicionadaKg: 3, cantidadSinAcondicionarKg: 7 });
  });
  it.each([0.01, 0.29, 99999999.99])('conserva %s kg sin redondear y sin sumar el empaque al stock', async cantidad => {
    const partida = await f.partida(cantidad);
    expect((await f.acondicionar(f.datosAcondicionamiento(partida, cantidad))).statusCode).toBe(201);
    expect((await consultar(partida)).json().data).toMatchObject({ cantidadDisponibleKg: cantidad, cantidadAcondicionadaKg: cantidad, cantidadSinAcondicionarKg: 0 });
  });
  it.each([{ cantidadKg: 0 }, { cantidadKg: 0.001 }, { cantidadEnvases: 0 }, { cantidadEnvases: 1.5 }, { tipoEnvase: ' ' }, { categoria: 'DESCARTE' }, { registradoPor: randomUUID() }])('rechaza contrato inválido %j', async cambio => {
    const payload = { ...f.datosAcondicionamiento(await f.partida()), ...cambio };
    expect((await f.app.inject({ method: 'POST', url: '/api/v1/acondicionamientos', headers: f.campo, payload })).statusCode).toBe(400);
  });
  it.each(['2026-10-15', '9999-01-01'])('rechaza fecha fuera de la secuencia real %s', async fechaAcondicionamiento => {
    const datos = { ...f.datosAcondicionamiento(await f.partida()), fechaAcondicionamiento };
    expect((await f.acondicionar(datos)).statusCode).toBe(422);
  });
  it('si falla el evento no consume el saldo de acondicionamiento', async () => {
    const partida = await f.partida(), datos = f.datosAcondicionamiento(partida);
    await f.pool.query("alter table eventos_trazabilidad add constraint fallo_acondicionamiento_test check(tipo_evento<>'ACONDICIONAMIENTO') not valid");
    try {
      expect((await f.acondicionar(datos)).statusCode).toBe(422);
      expect((await consultar(partida)).json().data).toMatchObject({ cantidadAcondicionadaKg: 0, cantidadSinAcondicionarKg: 10, cantidadDisponibleKg: 10 });
      expect((await f.pool.query('select id from acondicionamientos where id=$1', [datos.operacionId])).rows).toEqual([]);
    } finally { await f.pool.query('alter table eventos_trazabilidad drop constraint fallo_acondicionamiento_test'); }
  });
  it('impide modificar o eliminar el empaque histórico y preserva la partida referenciada', async () => {
    const partida = await f.partida(), datos = f.datosAcondicionamiento(partida); await f.acondicionar(datos);
    await expect(f.pool.query('update acondicionamientos set cantidad_kg=99 where id=$1', [datos.operacionId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('delete from acondicionamientos where id=$1', [datos.operacionId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('delete from partidas_produccion where id=$1', [partida])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('truncate acondicionamientos')).rejects.toMatchObject({ code: '23514' });
    expect((await consultar(partida)).statusCode).toBe(200);
  });
});
