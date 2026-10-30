import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AlmacenamientoProduccionFixture } from '../helpers/almacenamiento-produccion-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056 CU50–CU52: cámaras y conservación de existencias', () => {
  const f = new AlmacenamientoProduccionFixture();
  beforeAll(() => f.preparar(url!), 30000); afterAll(() => f.cerrar());
  it('mantiene inicial = exterior + en cámaras + destinada durante ingreso, salida y despacho', async () => {
    const partida = await f.partida(), camara = await f.camara();
    expect((await f.mover(f.datosMovimiento(partida, camara, 7))).statusCode).toBe(201);
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadInicialKg: 10, cantidadDisponibleKg: 3, cantidadEnCamaraKg: 7, cantidadDestinadaKg: 0, cantidadFisicaKg: 10, cantidadAcondicionableKg: 3 });
    expect((await f.mover(f.datosMovimiento(partida, camara, 2, 'SALIDA'))).statusCode).toBe(201);
    expect((await f.destinar(f.datosDestino(partida, 4))).statusCode).toBe(201);
    const saldo = await f.estadoPartida(partida);
    expect(saldo).toMatchObject({ cantidadDisponibleKg: 1, cantidadEnCamaraKg: 5, cantidadDestinadaKg: 4, cantidadFisicaKg: 6 });
    expect(saldo.cantidadDisponibleKg + saldo.cantidadEnCamaraKg + saldo.cantidadDestinadaKg).toBe(saldo.cantidadInicialKg);
    expect((await f.acondicionar(f.datosAcondicionamiento(partida, 2))).statusCode).toBe(422);
  });
  it('conserva temperatura nula distinta de cero y no duplica el registro de una cámara', async () => {
    const datos = { ...f.datosCamara(), temperaturaObjetivoC: null };
    expect((await f.registrarCamara(datos)).statusCode).toBe(201);
    expect((await f.registrarCamara(datos)).json().data).toMatchObject({ id: datos.operacionId, temperaturaObjetivoC: null });
    expect((await f.registrarCamara({ ...datos, nombre: 'Otra cámara' })).statusCode).toBe(409);
    const cero = await f.registrarCamara({ ...f.datosCamara(), temperaturaObjetivoC: 0 });
    expect(cero.statusCode).toBe(201); expect(cero.json().data.temperaturaObjetivoC).toBe(0);
  });
  it('no permite retirar de otra cámara ni de otra partida y bloquea saldo insuficiente', async () => {
    const partida = await f.partida(), otra = await f.partida(), camara = await f.camara(), vacia = await f.camara();
    expect((await f.mover(f.datosMovimiento(partida, camara, 6))).statusCode).toBe(201);
    expect((await f.mover(f.datosMovimiento(partida, vacia, 1, 'SALIDA'))).statusCode).toBe(422);
    expect((await f.mover(f.datosMovimiento(otra, camara, 1, 'SALIDA'))).statusCode).toBe(422);
    expect((await f.mover(f.datosMovimiento(partida, camara, 7, 'SALIDA'))).statusCode).toBe(422);
    expect((await f.mover(f.datosMovimiento(partida, vacia, 5))).statusCode).toBe(422);
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 4, cantidadEnCamaraKg: 6 });
  });
  it('reintentar un movimiento no duplica kilos, evento ni proyección', async () => {
    const partida = await f.partida(), datos = f.datosMovimiento(partida, await f.camara(), 4);
    expect((await f.mover(datos)).statusCode).toBe(201); expect((await f.mover(datos)).statusCode).toBe(201);
    expect((await f.mover({ ...datos, cantidadKg: 5 })).statusCode).toBe(409);
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 6, cantidadEnCamaraKg: 4 });
    expect((await f.pool.query("select count(*)::int as n from eventos_trazabilidad where payload_especifico->>'movimientoAlmacenamientoId'=$1", [datos.operacionId])).rows[0].n).toBe(1);
  });
  it('consulta historial, saldos por cámara y partida, y linaje persistido', async () => {
    const partida = await f.partida(), camara = await f.camara(), entrada = f.datosMovimiento(partida, camara, 5);
    expect((await f.mover(entrada)).statusCode).toBe(201);
    expect((await f.mover(f.datosMovimiento(partida, camara, 2, 'SALIDA'))).statusCode).toBe(201);
    const lista = await f.app.inject({ method: 'GET', url: `/api/v1/almacenamiento/movimientos?partidaProduccionId=${partida}&camaraSectorId=${camara}&tipoMovimiento=INGRESO&desde=2026-10-17&hasta=2026-10-17&limit=1`, headers: f.campo });
    expect(lista.statusCode).toBe(200); expect(lista.json().data.map((m: { id: string }) => m.id)).toEqual([entrada.operacionId]);
    const saldo = await f.app.inject({ method: 'GET', url: `/api/v1/almacenamiento/saldos?partidaProduccionId=${partida}&camaraSectorId=${camara}`, headers: f.campo });
    expect(saldo.statusCode).toBe(200); expect(saldo.json().data).toEqual([expect.objectContaining({ cantidadKg: 3, partidaProduccionId: partida, camaraSectorId: camara })]);
    const detalle = await f.app.inject({ method: 'GET', url: `/api/v1/almacenamiento/movimientos/${entrada.operacionId}`, headers: f.campo });
    expect(detalle.statusCode).toBe(200);
    const { rows } = await f.pool.query("select actor_id,ubicacion_id,payload_especifico from eventos_trazabilidad where payload_especifico->>'movimientoAlmacenamientoId'=$1", [entrada.operacionId]);
    const origen = await f.estadoPartida(partida);
    expect(rows[0]).toMatchObject({ actor_id: f.campoId, ubicacion_id: f.fincaId, payload_especifico: { clasificacionId: origen.clasificacionId, cosechaId: origen.cosechaId, cantidadKg: 5 } });
  });
  it.each([0.01, 0.29, 99999999.99])('ingresa y retira %s kg exactamente', async cantidad => {
    const partida = await f.partida(cantidad), camara = await f.camara();
    expect((await f.mover(f.datosMovimiento(partida, camara, cantidad))).statusCode).toBe(201);
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 0, cantidadEnCamaraKg: cantidad });
    expect((await f.mover(f.datosMovimiento(partida, camara, cantidad, 'SALIDA'))).statusCode).toBe(201);
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: cantidad, cantidadEnCamaraKg: 0, cantidadFisicaKg: cantidad });
  });
  it('rechaza una salida fechada antes de su ingreso, sin alterar el saldo actual', async () => {
    const partida = await f.partida(), camara = await f.camara();
    expect((await f.mover({ ...f.datosMovimiento(partida, camara, 5), fechaMovimiento: '2026-10-20' })).statusCode).toBe(201);
    expect((await f.mover(f.datosMovimiento(partida, camara, 2, 'SALIDA'))).statusCode).toBe(422);
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 5, cantidadEnCamaraKg: 5 });
  });
  it('si falla el evento revierte movimiento y saldo exterior', async () => {
    const partida = await f.partida(), datos = f.datosMovimiento(partida, await f.camara());
    await f.pool.query("alter table eventos_trazabilidad add constraint fallo_almacen_test check(tipo_evento<>'ALMACENAMIENTO') not valid");
    try {
      expect((await f.mover(datos)).statusCode).toBe(422);
      expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 10, cantidadEnCamaraKg: 0 });
      expect((await f.pool.query('select id from movimientos_almacenamiento where id=$1', [datos.operacionId])).rows).toEqual([]);
    } finally { await f.pool.query('alter table eventos_trazabilidad drop constraint fallo_almacen_test'); }
  });
  it.each([{ cantidadKg: 0 }, { cantidadKg: 0.001 }, { tipoMovimiento: 'TRANSFERENCIA' }, { registradoPor: randomUUID() }, { fechaMovimiento: '2026-02-30' }])('rechaza contrato inválido %j', async cambio => {
    const payload = { ...f.datosMovimiento(await f.partida(), await f.camara()), ...cambio };
    expect((await f.app.inject({ method: 'POST', url: '/api/v1/almacenamiento/movimientos', headers: f.campo, payload })).statusCode).toBe(400);
  });
  it('conserva bitácora y proyección frente a cambios SQL externos', async () => {
    const partida = await f.partida(), datos = f.datosMovimiento(partida, await f.camara()); await f.mover(datos);
    await expect(f.pool.query('update movimientos_almacenamiento set cantidad_kg=9 where id=$1', [datos.operacionId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('delete from movimientos_almacenamiento where id=$1', [datos.operacionId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('update partidas_produccion set cantidad_disponible_kg=10 where id=$1', [partida])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('truncate movimientos_almacenamiento')).rejects.toMatchObject({ code: '23514' });
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 7, cantidadEnCamaraKg: 3 });
  });
});
