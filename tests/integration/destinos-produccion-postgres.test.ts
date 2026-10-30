import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AlmacenamientoProduccionFixture } from '../helpers/almacenamiento-produccion-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056 CU53/CU54: destinos desde disponibilidad exterior', () => {
  const f = new AlmacenamientoProduccionFixture();
  beforeAll(() => f.preparar(url!), 30000); afterAll(() => f.cerrar());
  it('solo destina kilos exteriores y requiere salida previa de la cámara', async () => {
    const partida = await f.partida(), camara = await f.camara();
    expect((await f.mover(f.datosMovimiento(partida, camara, 8))).statusCode).toBe(201);
    expect((await f.destinar(f.datosDestino(partida, 3))).statusCode).toBe(422);
    expect((await f.mover(f.datosMovimiento(partida, camara, 1, 'SALIDA'))).statusCode).toBe(201);
    expect((await f.destinar(f.datosDestino(partida, 3))).statusCode).toBe(201);
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 0, cantidadEnCamaraKg: 7, cantidadDestinadaKg: 3, cantidadFisicaKg: 7 });
  });
  it.each(['MERCADO_FRESCO', 'INDUSTRIA', 'OTRO'] as const)('registra destino %s con responsable, destinatario y linaje', async tipoDestino => {
    const partida = await f.partida(), datos = { ...f.datosDestino(partida, 2), tipoDestino };
    const res = await f.destinar(datos); expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ id: datos.operacionId, tipoDestino, destinoEspecifico: 'Mercado de prueba', responsableId: f.campoId });
    const origen = await f.estadoPartida(partida);
    const evento = (await f.pool.query("select actor_id,ubicacion_id,payload_especifico from eventos_trazabilidad where payload_especifico->>'destinoProduccionId'=$1", [datos.operacionId])).rows[0];
    expect(evento).toMatchObject({ actor_id: f.campoId, ubicacion_id: f.fincaId,
      payload_especifico: { cosechaId: origen.cosechaId, clasificacionId: origen.clasificacionId, partidaProduccionId: partida, cantidadDestinadaKg: 2, tipoDestino } });
  });
  it('CU53 el destino específico es opcional salvo «Otro»; CU54 totaliza kg por tipo sin sumarlos a la cosecha', async () => {
    const partida = await f.partida();
    const { destinoEspecifico: _omitido, ...base } = f.datosDestino(partida, 2);
    const fresco = await f.destinar({ ...base, operacionId: randomUUID(), tipoDestino: 'MERCADO_FRESCO' });
    expect(fresco.statusCode).toBe(201); expect(fresco.json().data.destinoEspecifico).toBe('No registrado');
    expect((await f.destinar({ ...base, operacionId: randomUUID(), tipoDestino: 'INDUSTRIA', cantidadDestinadaKg: 1 })).statusCode).toBe(201);
    expect((await f.destinar({ ...base, operacionId: randomUUID(), tipoDestino: 'OTRO' })).statusCode).toBe(400);
    const totales = await f.app.inject({ method: 'GET', url: `/api/v1/destinos-produccion/totales?partidaProduccionId=${partida}`, headers: f.campo });
    expect(totales.statusCode).toBe(200);
    expect(totales.json().data).toEqual({ porTipo: [{ tipoDestino: 'INDUSTRIA', cantidadDestinos: 1, totalKg: 1 }, { tipoDestino: 'MERCADO_FRESCO', cantidadDestinos: 1, totalKg: 2 }], totalDestinadoKg: 3 });
  });
  it('acumula destinos parciales y no duplica el consumo ante reintentos', async () => {
    const partida = await f.partida(), datos = f.datosDestino(partida, 2);
    expect((await f.destinar(datos)).statusCode).toBe(201); expect((await f.destinar(datos)).statusCode).toBe(201);
    expect((await f.destinar({ ...datos, cantidadDestinadaKg: 3 })).statusCode).toBe(409);
    expect((await f.destinar(f.datosDestino(partida, 3))).statusCode).toBe(201);
    expect((await f.destinar(f.datosDestino(partida, 6))).statusCode).toBe(422);
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 5, cantidadDestinadaKg: 5, cantidadFisicaKg: 5 });
    expect((await f.pool.query("select count(*)::int as n from eventos_trazabilidad where payload_especifico->>'destinoProduccionId'=$1", [datos.operacionId])).rows[0].n).toBe(1);
  });
  it('consulta detalle y filtra por partida, cosecha, tipo y fecha', async () => {
    const partida = await f.partida(), datos = f.datosDestino(partida); await f.destinar(datos);
    const origen = await f.estadoPartida(partida);
    const lista = await f.app.inject({ method: 'GET', url: `/api/v1/destinos-produccion?partidaProduccionId=${partida}&cosechaId=${origen.cosechaId}&tipoDestino=MERCADO_FRESCO&desde=2026-10-19&hasta=2026-10-19&limit=1`, headers: f.campo });
    expect(lista.statusCode).toBe(200); expect(lista.json().data.map((d: { id: string }) => d.id)).toEqual([datos.operacionId]);
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/destinos-produccion/${datos.operacionId}`, headers: f.campo })).statusCode).toBe(200);
  });
  it.each([0.01, 0.29, 99999999.99])('destina %s kg exactamente y agota el saldo físico', async cantidad => {
    const partida = await f.partida(cantidad);
    expect((await f.destinar(f.datosDestino(partida, cantidad))).statusCode).toBe(201);
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 0, cantidadDestinadaKg: cantidad, cantidadFisicaKg: 0 });
  });
  it('rechaza un destino retroactivo que consumiría fruta aún almacenada en esa fecha', async () => {
    const partida = await f.partida(), camara = await f.camara();
    expect((await f.mover({ ...f.datosMovimiento(partida, camara, 10), fechaMovimiento: '2026-10-20' })).statusCode).toBe(201);
    expect((await f.mover({ ...f.datosMovimiento(partida, camara, 6, 'SALIDA'), fechaMovimiento: '2026-10-22' })).statusCode).toBe(201);
    expect((await f.destinar({ ...f.datosDestino(partida, 5), fechaDestino: '2026-10-21' })).statusCode).toBe(422);
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 6, cantidadEnCamaraKg: 4, cantidadDestinadaKg: 0 });
  });
  it('rechaza una salida retroactiva que volvería negativo un día intermedio de la cámara', async () => {
    const partida = await f.partida(), camara = await f.camara();
    expect((await f.mover(f.datosMovimiento(partida, camara, 10))).statusCode).toBe(201);
    expect((await f.mover(f.datosMovimiento(partida, camara, 8, 'SALIDA'))).statusCode).toBe(201);
    expect((await f.mover({ ...f.datosMovimiento(partida, camara, 8), fechaMovimiento: '2026-10-19' })).statusCode).toBe(201);
    expect((await f.mover({ ...f.datosMovimiento(partida, camara, 5, 'SALIDA'), fechaMovimiento: '2026-10-17' })).statusCode).toBe(422);
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 0, cantidadEnCamaraKg: 10 });
  });
  it('si falla la auditoría revierte el destino y su proyección', async () => {
    const partida = await f.partida(), datos = f.datosDestino(partida);
    await f.pool.query("alter table eventos_trazabilidad add constraint fallo_destino_test check(tipo_evento<>'DESTINO_PRODUCCION') not valid");
    try {
      expect((await f.destinar(datos)).statusCode).toBe(422);
      expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 10, cantidadDestinadaKg: 0, cantidadFisicaKg: 10 });
      expect((await f.pool.query('select id from destinos_produccion where id=$1', [datos.operacionId])).rows).toEqual([]);
    } finally { await f.pool.query('alter table eventos_trazabilidad drop constraint fallo_destino_test'); }
  });
  it.each([{ cantidadDestinadaKg: 0 }, { cantidadDestinadaKg: 0.001 }, { destinoEspecifico: ' ' }, { tipoDestino: 'VENTA' }, { fincaId: randomUUID() }])('rechaza contrato inválido %j', async cambio => {
    const payload = { ...f.datosDestino(await f.partida()), ...cambio };
    expect((await f.app.inject({ method: 'POST', url: '/api/v1/destinos-produccion', headers: f.campo, payload })).statusCode).toBe(400);
  });
  it('no permite alterar historia ni devolver stock mediante UPDATE/DELETE', async () => {
    const partida = await f.partida(), datos = f.datosDestino(partida, 4); await f.destinar(datos);
    await expect(f.pool.query('update destinos_produccion set cantidad_destinada_kg=1 where id=$1', [datos.operacionId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('delete from destinos_produccion where id=$1', [datos.operacionId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('truncate destinos_produccion')).rejects.toMatchObject({ code: '23514' });
    expect(await f.estadoPartida(partida)).toMatchObject({ cantidadDisponibleKg: 6, cantidadDestinadaKg: 4 });
  });
});
