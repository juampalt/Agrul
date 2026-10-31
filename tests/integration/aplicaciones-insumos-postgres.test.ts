import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AplicacionesInsumosPostgresFixture } from '../helpers/aplicaciones-insumos-postgres.fixture.js';
import { URL_INSUMOS } from '../helpers/insumos-postgres.fixture.js';

const url = process.env.INSUMOS_TEST_DATABASE_URL;
if (url && url !== URL_INSUMOS) throw new Error('Destino de aplicaciones no autorizado.');
describe.skipIf(!url)('AGRUL-055: aplicaciones y consumo FEFO/FIFO PostgreSQL', () => {
  const f = new AplicacionesInsumosPostgresFixture();
  beforeAll(async () => { await f.preparar(url!); }, 30000);
  afterAll(async () => { await f.cerrar(); });
  const cero = { aplicaciones: 0, items: 0, movimientos: 0, eventos: 0 };

  it('consume primero el vencimiento más próximo, divide cantidades y conserva el origen en items, movimientos y evento', async () => {
    const insumoId = await f.crear();
    const proxima = await f.alta({ insumoId, cantidad: 2, fechaIngreso: '2026-10-02', fechaVencimiento: '2099-01-01' });
    const lejana = await f.alta({ insumoId, cantidad: 10, fechaIngreso: '2026-09-01', fechaVencimiento: '2099-02-01' });
    const sin = await f.alta({ insumoId, cantidad: 10, fechaIngreso: '2026-08-01' });
    const datos = f.datosAplicacion(insumoId, { items: [{ insumoId, cantidad: 3, unidadMedida: 'kg', dosis: 3 }] });
    const res = await f.registrarAplicacion(datos); expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ id: datos.operacionId, actividadRealizadaId: f.actividadId,
      responsableId: f.encargadoId, superficieTratada: '1.00', metodoAplicacion: datos.metodoAplicacion });
    expect(res.json().data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ partidaInsumoId: proxima.partidaId, cantidadAplicada: '2.00', dosis: '3.00' }),
      expect.objectContaining({ partidaInsumoId: lejana.partidaId, cantidadAplicada: '1.00', dosis: '3.00' }),
    ]));
    expect(res.json().data.items).toHaveLength(2);
    expect(await f.saldo(proxima.partidaId)).toBe('0.00'); expect(await f.saldo(lejana.partidaId)).toBe('9.00'); expect(await f.saldo(sin.partidaId)).toBe('10.00');
    expect(await f.conteos(datos.operacionId)).toEqual({ aplicaciones: 1, items: 2, movimientos: 2, eventos: 1 });
    for (const item of res.json().data.items) {
      expect(item.movimientoId).toBe(item.id);
      const movimiento = await f.consultar(`movimientos/${item.movimientoId}`);
      expect(movimiento.json().data).toMatchObject({ tipoMovimiento: 'EGRESO_APLICACION', partidaId: item.partidaInsumoId, cantidad: item.cantidadAplicada });
    }
    expect((await f.consultarAplicaciones(`/${datos.operacionId}`)).json().data).toEqual(res.json().data);
  });
  it('desempata por fecha de ingreso y luego UUID, dejando partidas sin vencimiento al final', async () => {
    const insumoId = await f.crear();
    const sin = await f.alta({ insumoId, cantidad: 10 });
    const vieja = await f.alta({ insumoId, cantidad: 1, fechaIngreso: '2026-09-01', fechaVencimiento: '2099-01-01' });
    const a = await f.alta({ insumoId, cantidad: 1, fechaVencimiento: '2099-01-01' });
    const b = await f.alta({ insumoId, cantidad: 1, fechaVencimiento: '2099-01-01' });
    const [primera, segunda] = [a.partidaId, b.partidaId].sort();
    const res = await f.registrarAplicacion(f.datosAplicacion(insumoId, { items: [{ insumoId, cantidad: 1.5, unidadMedida: 'kg', dosis: 1.5 }] }));
    expect(res.statusCode).toBe(201);
    expect(await f.saldo(vieja.partidaId)).toBe('0.00'); expect(await f.saldo(primera)).toBe('0.50'); expect(await f.saldo(segunda)).toBe('1.00'); expect(await f.saldo(sin.partidaId)).toBe('10.00');
  });
  it('excluye partidas vencidas y no toma stock de otra finca', async () => {
    const insumoId = await f.crear();
    const vencida = await f.alta({ insumoId, cantidad: 20, fechaVencimiento: '2000-01-01' });
    const ajena = await f.alta({ insumoId, cantidad: 20, fincaId: f.otraFincaId });
    const datos = f.datosAplicacion(insumoId); expect((await f.registrarAplicacion(datos)).statusCode).toBe(422);
    expect(await f.conteos(datos.operacionId)).toEqual(cero);
    expect(await f.saldo(vencida.partidaId)).toBe('20.00'); expect(await f.saldo(ajena.partidaId)).toBe('20.00');
  });
  it('acepta vencimiento de hoy y registra cantidades decimales exactas', async () => {
    const { rows } = await f.pool.query<{ hoy: string }>("select to_char(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires','YYYY-MM-DD') as hoy");
    const insumoId = await f.crear(); const a = await f.alta({ insumoId, cantidad: 0.1, fechaVencimiento: rows[0].hoy });
    const b = await f.alta({ insumoId, cantidad: 0.2 });
    const res = await f.registrarAplicacion(f.datosAplicacion(insumoId, { items: [{ insumoId, cantidad: 0.3, unidadMedida: 'kg', dosis: 0.3 }] }));
    expect(res.statusCode).toBe(201); expect(await f.saldo(a.partidaId)).toBe('0.00'); expect(await f.saldo(b.partidaId)).toBe('0.00');
  });
  it('revierte todos los insumos si el último carece de stock', async () => {
    const primero = await f.alta(); const segundo = await f.crear();
    const datos = f.datosAplicacion(primero.insumoId, { items: [{ insumoId: primero.insumoId, cantidad: 1, unidadMedida: 'kg', dosis: 1 },
      { insumoId: segundo, cantidad: 1, unidadMedida: 'kg', dosis: 1 }] });
    expect((await f.registrarAplicacion(datos)).statusCode).toBe(422);
    expect(await f.saldo(primero.partidaId)).toBe('10.00'); expect(await f.conteos(datos.operacionId)).toEqual(cero);
  });
  it('CU38 rechaza una superficie tratada mayor que la trabajada en la actividad y no consume stock', async () => {
    const { insumoId, partidaId } = await f.alta();
    const exceso = f.datosAplicacion(insumoId, { superficieTratada: 1.01 });
    expect((await f.registrarAplicacion(exceso)).statusCode).toBe(422);
    expect(await f.saldo(partidaId)).toBe('10.00'); expect(await f.conteos(exceso.operacionId)).toEqual(cero);
    expect((await f.registrarAplicacion(f.datosAplicacion(insumoId, { superficieTratada: 1 }))).statusCode).toBe(201);
  });
  it('dos aplicaciones simultáneas no consumen más stock del disponible', async () => {
    const { insumoId, partidaId } = await f.alta({ cantidad: 10 });
    const datos = () => f.datosAplicacion(insumoId, { items: [{ insumoId, cantidad: 6, unidadMedida: 'kg', dosis: 6 }] });
    const res = await Promise.all([f.registrarAplicacion(datos()), f.registrarAplicacion(datos())]);
    expect(res.map(r => r.statusCode).sort()).toEqual([201, 422]); expect(await f.saldo(partidaId)).toBe('4.00');
  });
  it('serializa una aplicación con un egreso manual sobre la misma partida', async () => {
    const { insumoId, partidaId } = await f.alta({ cantidad: 10 });
    const datos = f.datosAplicacion(insumoId, { items: [{ insumoId, cantidad: 6, unidadMedida: 'kg', dosis: 6 }] });
    const res = await Promise.all([f.registrarAplicacion(datos), f.mover(partidaId, { cantidad: 6 })]);
    expect(res.map(r => r.statusCode).sort()).toEqual([201, 422]); expect(await f.saldo(partidaId)).toBe('4.00');
    expect((await f.consultar(`movimientos?partidaId=${partidaId}`)).json().data).toHaveLength(2);
  });
  it('un reintento simultáneo genera una aplicación, un descuento y un evento', async () => {
    const { insumoId, partidaId } = await f.alta(); const datos = f.datosAplicacion(insumoId);
    const res = await Promise.all([f.registrarAplicacion(datos), f.registrarAplicacion(datos)]);
    expect(res.map(r => r.statusCode)).toEqual([201, 201]); expect(res[0].json().data).toEqual(res[1].json().data);
    expect(await f.saldo(partidaId)).toBe('9.00'); expect(await f.conteos(datos.operacionId)).toEqual({ aplicaciones: 1, items: 1, movimientos: 1, eventos: 1 });
    expect((await f.registrarAplicacion({ ...datos, motivoAplicacion: 'Otro motivo' })).statusCode).toBe(409);
    expect((await f.registrarAplicacion(datos, f.admin)).statusCode).toBe(409);
  });
  it('bloquea insumos en orden común aunque las solicitudes los declaren en orden contrario', async () => {
    const a = await f.alta({ cantidad: 2 }); const b = await f.alta({ cantidad: 2 });
    const items = [a, b].map(x => ({ insumoId: x.insumoId, cantidad: 1, unidadMedida: 'kg', dosis: 1 }));
    const res = await Promise.all([f.registrarAplicacion(f.datosAplicacion(a.insumoId, { items })), f.registrarAplicacion(f.datosAplicacion(b.insumoId, { items: [...items].reverse() }))]);
    expect(res.map(r => r.statusCode)).toEqual([201, 201]); expect(await f.saldo(a.partidaId)).toBe('0.00'); expect(await f.saldo(b.partidaId)).toBe('0.00');
  });
  it('rechaza unidades incompatibles y catálogo inactivo, sin aplicaciones parciales', async () => {
    const { insumoId, partidaId } = await f.alta();
    const datos = f.datosAplicacion(insumoId, { items: [{ insumoId, cantidad: 1, unidadMedida: 'L', dosis: 1 }] });
    expect((await f.registrarAplicacion(datos)).statusCode).toBe(422);
    await f.app.inject({ method: 'PATCH', url: `/api/v1/insumos/${insumoId}/desactivar`, headers: f.admin });
    expect((await f.registrarAplicacion(f.datosAplicacion(insumoId))).statusCode).toBe(422); expect(await f.saldo(partidaId)).toBe('10.00');
  });
  it('RN-14 exige una labor realizada y no acepta IDs de programaciones o recursos inexistentes', async () => {
    const { insumoId } = await f.alta();
    expect((await f.registrarAplicacion(f.datosAplicacion(insumoId, { actividadRealizadaId: randomUUID() }))).statusCode).toBe(404);
    expect((await f.registrarAplicacion(f.datosAplicacion(randomUUID()))).statusCode).toBe(404);
  });
  it('revierte stock, aplicación, items y movimientos si falla el evento de trazabilidad', async () => {
    const { insumoId, partidaId } = await f.alta(); const datos = f.datosAplicacion(insumoId);
    await f.pool.query(`create function fallo_evento_aplicacion_fixture() returns trigger as $$ begin
      if NEW.tipo_evento='APLICACION_INSUMOS' then raise exception 'Fallo controlado'; end if; return NEW; end $$ language plpgsql;
      create trigger zz_fallo_evento_aplicacion before insert on eventos_trazabilidad for each row execute function fallo_evento_aplicacion_fixture()`);
    try { expect((await f.registrarAplicacion(datos)).statusCode).toBe(500); expect(await f.saldo(partidaId)).toBe('10.00'); expect(await f.conteos(datos.operacionId)).toEqual(cero); }
    finally { await f.pool.query('drop trigger zz_fallo_evento_aplicacion on eventos_trazabilidad; drop function fallo_evento_aplicacion_fixture()'); }
  });
});
