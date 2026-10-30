import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { CosechasRegistroFixture } from '../helpers/cosechas-registro-postgres.fixture.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: registro de cosechas y pasadas reales', () => {
  const f = new CosechasRegistroFixture();
  beforeAll(() => f.preparar(url!), 30000); afterAll(() => f.cerrar());
  it('RN-18: registra cosecha directa y conserva origen, captura, responsable y kilos sin clasificar', async () => {
    const datos = f.datosCosecha(), res = await f.registrar(datos);
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ success: true, error: null, data: {
      id: datos.operacionId, origen: 'NO_PROGRAMADA', cicloId: f.cicloId, cosechaProgramadaId: null,
      cantidadCosechadaKg: 10.25, cantidadComercializableKg: null, cantidadDescarteKg: null, numeroPasada: datos.numeroPasada,
    } });
    const { rows } = await f.pool.query("select actor_id,ubicacion_id,payload_especifico,timestamp_captura_local from eventos_trazabilidad where payload_especifico->>'cosechaId'=$1", [datos.operacionId]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actor_id: f.campoId, ubicacion_id: f.fincaId,
      payload_especifico: { cicloId: f.cicloId, cantidadCosechadaKg: 10.25, unidadMedida: 'kg', numeroPasada: datos.numeroPasada } });
    expect(rows[0].timestamp_captura_local.toISOString()).toBe('2026-10-15T13:30:00.000Z');
    expect((await f.pool.query('select count(*)::int as n from movimientos_inventario')).rows[0].n).toBe(0);
  });
  it('ejecuta una jornada en la misma transacción y conserva la estimación separada del pesaje', async () => {
    const datos = await f.datosProgramada();
    const res = await f.registrar(datos); expect(res.statusCode).toBe(201);
    const { rows } = await f.pool.query('select estado,version,cantidad_estimada_kg from cosechas_programadas where id=$1', [datos.cosechaProgramadaId]);
    expect(rows[0]).toEqual({ estado: 'EJECUTADA', version: 2, cantidad_estimada_kg: '100.25' });
    expect(res.json().data.cantidadCosechadaKg).toBe(10.25);
    expect((await f.pool.query('select operacion from cosechas_programadas_historial where jornada_id=$1 order by (nuevo->>\'version\')::int', [datos.cosechaProgramadaId])).rows.map(r => r.operacion)).toEqual(['PROGRAMACION', 'EJECUCION']);
    expect((await f.registrar(datos)).statusCode).toBe(201);
    expect((await f.pool.query('select count(*)::int as n from cosechas_programadas_historial where jornada_id=$1', [datos.cosechaProgramadaId])).rows[0].n).toBe(2);
  });
  it('RN-19: conserva pasadas sucesivas de distintas fechas sin sobrescribir ni repetir códigos', async () => {
    const primero = f.datosCosecha(), segundo = { ...f.datosCosecha(), fechaEfectiva: '2026-10-16' };
    const a = await f.registrar(primero), b = await f.registrar(segundo);
    expect(a.statusCode).toBe(201); expect(b.statusCode).toBe(201);
    expect(a.json().data.codigoTrazabilidad).not.toBe(b.json().data.codigoTrazabilidad);
    const consulta = await f.app.inject({ method: 'GET', url: `/api/v1/cosechas/${primero.operacionId}`, headers: f.campo });
    expect(consulta.json().data).toMatchObject({ numeroPasada: primero.numeroPasada, fechaEfectiva: '2026-10-15', cantidadCosechadaKg: 10.25 });
    const listado = await f.app.inject({ method: 'GET', headers: f.campo,
      url: `/api/v1/cosechas?cicloId=${f.cicloId}&numeroPasada=${segundo.numeroPasada}&origen=NO_PROGRAMADA&desde=2026-10-16&hasta=2026-10-16&limit=1` });
    expect(listado.statusCode).toBe(200); expect(listado.json().data.map((c: { id: string }) => c.id)).toEqual([segundo.operacionId]);
  });
  it('no duplica una operación ni permite reutilizar su clave o la misma pasada con otros datos', async () => {
    const datos = f.datosCosecha(); expect((await f.registrar(datos)).statusCode).toBe(201);
    expect((await f.registrar(datos)).statusCode).toBe(201);
    expect((await f.registrar({ ...datos, cantidadCosechadaKg: 11 })).statusCode).toBe(409);
    expect((await f.registrar({ ...datos, operacionId: randomUUID() })).statusCode).toBe(409);
    expect((await f.pool.query("select count(*)::int as n from eventos_trazabilidad where payload_especifico->>'cosechaId'=$1", [datos.operacionId])).rows[0].n).toBe(1);
  });
  it('rechaza ejecutar una jornada cancelada o cuya versión fue reprogramada', async () => {
    const a = await f.datosProgramada(), b = await f.datosProgramada();
    await f.pool.query("update cosechas_programadas set estado='CANCELADA',motivo_cancelacion='Lluvia' where id=$1", [a.cosechaProgramadaId]);
    await f.pool.query("update cosechas_programadas set fecha_prevista='2026-11-20' where id=$1", [b.cosechaProgramadaId]);
    expect((await f.registrar(a)).statusCode).toBe(409); expect((await f.registrar(b)).statusCode).toBe(409);
    expect((await f.registrar({ ...b, versionProgramacion: 2 })).statusCode).toBe(201);
  });
  it('si falla el evento, revierte pesaje, ejecución e historial de la jornada', async () => {
    const datos = await f.datosProgramada();
    await f.pool.query("alter table eventos_trazabilidad add constraint fallo_evento_cosecha_test check(tipo_evento <> 'COSECHA') not valid");
    try {
      expect((await f.registrar(datos)).statusCode).toBe(422);
      expect((await f.pool.query('select id from cosechas where id=$1', [datos.operacionId])).rows).toEqual([]);
      expect((await f.pool.query('select estado,version from cosechas_programadas where id=$1', [datos.cosechaProgramadaId])).rows[0]).toEqual({ estado: 'PENDIENTE', version: 1 });
      expect((await f.pool.query('select count(*)::int as n from cosechas_programadas_historial where jornada_id=$1', [datos.cosechaProgramadaId])).rows[0].n).toBe(1);
    } finally { await f.pool.query('alter table eventos_trazabilidad drop constraint fallo_evento_cosecha_test'); }
  });
  it.each([0.01, 0.29, 99999999.99])('persiste %s kg exactamente', async cantidadCosechadaKg => {
    const datos = { ...f.datosCosecha(), cantidadCosechadaKg }; expect((await f.registrar(datos)).statusCode).toBe(201);
    expect((await f.pool.query('select cantidad_cosechada_kg from cosechas where id=$1', [datos.operacionId])).rows[0].cantidad_cosechada_kg).toBe(cantidadCosechadaKg.toFixed(4));
  });
  it.each([0, -1, 0.001, 0.1 + 0.2, 100000000, '10.25'])('rechaza pesaje inválido %s sin persistir', async cantidadCosechadaKg => {
    const datos = { ...f.datosCosecha(), cantidadCosechadaKg };
    const res = await f.app.inject({ method: 'POST', url: '/api/v1/cosechas', headers: f.campo, payload: datos });
    expect(res.statusCode).toBe(400);
    expect((await f.pool.query('select id from cosechas where id=$1', [datos.operacionId])).rows).toEqual([]);
  });
  it.each([
    { fincaId: randomUUID() }, { loteId: randomUUID() }, { cantidadComercializableKg: 10 },
    { cantidadEstimadaKg: 100 }, { registradoPor: randomUUID() }, { numeroPasada: 0 }, { fechaEfectiva: '2026-02-30' },
  ])('rechaza campos o valores ajenos al contrato: %j', async cambio => {
    expect((await f.app.inject({ method: 'POST', url: '/api/v1/cosechas', headers: f.campo, payload: { ...f.datosCosecha(), ...cambio } })).statusCode).toBe(400);
  });
  it('rechaza fecha futura, anterior al ciclo y responsable inexistente', async () => {
    expect((await f.registrar({ ...f.datosCosecha(), fechaEfectiva: '9999-01-01' })).statusCode).toBe(422);
    expect((await f.registrar({ ...f.datosCosecha(), fechaEfectiva: '2026-09-30' })).statusCode).toBe(422);
    expect((await f.registrar({ ...f.datosCosecha(), responsableId: randomUUID() })).statusCode).toBe(422);
  });
  it('la cosecha permanece consultable tras cerrar el ciclo y admite reintento autorizado sin otro evento', async () => {
    const datos = f.datosCosecha(); expect((await f.registrar(datos)).statusCode).toBe(201);
    await f.pool.query("update ciclos_productivos set estado='FINALIZADO',fecha_fin_efectiva='2026-10-27' where id=$1", [f.cicloId]);
    try {
      expect((await f.app.inject({ method: 'GET', url: `/api/v1/cosechas/${datos.operacionId}`, headers: f.campo })).statusCode).toBe(200);
      expect((await f.registrar(datos)).statusCode).toBe(201);
      expect((await f.registrar()).statusCode).toBe(422);
    } finally { await f.pool.query("update ciclos_productivos set estado='ACTIVO',fecha_fin_efectiva=null where id=$1", [f.cicloId]); }
  });
  it('bloquea modificación, eliminación y TRUNCATE de cosechas registradas', async () => {
    const datos = f.datosCosecha(); await f.registrar(datos);
    await expect(f.pool.query('update cosechas set cantidad_cosechada_kg=20 where id=$1', [datos.operacionId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('delete from cosechas where id=$1', [datos.operacionId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('truncate cosechas')).rejects.toMatchObject({ code: '23514' });
  });
});
