import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AplicacionesInsumosPostgresFixture } from '../helpers/aplicaciones-insumos-postgres.fixture.js';
import { URL_INSUMOS } from '../helpers/insumos-postgres.fixture.js';

const url = process.env.INSUMOS_TEST_DATABASE_URL;
if (url && url !== URL_INSUMOS) throw new Error('Destino de aplicaciones no autorizado.');
describe.skipIf(!url)('AGRUL-055: autorización, validación y protección SQL de aplicaciones', () => {
  const f = new AplicacionesInsumosPostgresFixture();
  beforeAll(async () => { await f.preparar(url!); }, 30000);
  afterAll(async () => { await f.cerrar(); });

  it('filtra por finca antes de paginar y no entrega ni registra aplicaciones ajenas', async () => {
    const { insumoId } = await f.alta(); const datos = f.datosAplicacion(insumoId);
    expect((await f.registrarAplicacion(datos)).statusCode).toBe(201);
    const laborAjena = await f.crearLaborAjena(); await f.alta({ insumoId, fincaId: f.otraFincaId });
    const datosAjena = f.datosAplicacion(insumoId, { actividadRealizadaId: laborAjena });
    expect((await f.registrarAplicacion(datosAjena)).statusCode).toBe(403);
    expect((await f.registrarAplicacion(datosAjena, f.admin)).statusCode).toBe(201);
    const lista = await f.consultarAplicaciones(`?insumoId=${insumoId}&limit=1`);
    expect(lista.statusCode).toBe(200); expect(lista.json().data.map((a: { id: string }) => a.id)).toEqual([datos.operacionId]);
    expect((await f.consultarAplicaciones(`/${datosAjena.operacionId}`)).statusCode).toBe(404);
    expect((await f.consultarAplicaciones(`?fincaId=${f.otraFincaId}`)).json().data).toEqual([]);
    expect((await f.consultarAplicaciones(`?actividadRealizadaId=${laborAjena}`)).json().data).toEqual([]);
    expect((await f.consultarAplicaciones(`/${datosAjena.operacionId}`, f.admin)).statusCode).toBe(200);
  });
  it('niega operaciones a usuarios sin asignaciones y aplica revocación al mismo token, también en reintentos', async () => {
    const { insumoId } = await f.alta(); const datos = f.datosAplicacion(insumoId);
    expect((await f.registrarAplicacion(datos, f.sinAsignaciones)).statusCode).toBe(403);
    expect((await f.registrarAplicacion(datos)).statusCode).toBe(201);
    expect((await f.consultarAplicaciones(`/${datos.operacionId}`, f.sinAsignaciones)).statusCode).toBe(404);
    expect((await f.consultarAplicaciones('', f.sinAsignaciones)).json().data).toEqual([]);
    await f.pool.query('update usuario_finca_asignacion set activo=false where usuario_id=$1 and finca_id=$2', [f.encargadoId, f.fincaId]);
    try {
      expect((await f.registrarAplicacion(datos)).statusCode).toBe(403);
      expect((await f.consultarAplicaciones(`/${datos.operacionId}`)).statusCode).toBe(404);
    } finally { await f.pool.query('update usuario_finca_asignacion set activo=true where usuario_id=$1 and finca_id=$2', [f.encargadoId, f.fincaId]); }
    expect(await f.conteos(datos.operacionId)).toEqual({ aplicaciones: 1, items: 1, movimientos: 1, eventos: 1 });
  });
  it('exige sesión persistida y rol operativo en altas, detalle y listados', async () => {
    const { insumoId } = await f.alta(); const datos = f.datosAplicacion(insumoId);
    expect((await f.app.inject({ method: 'POST', url: '/api/v1/aplicaciones-insumos', payload: datos })).statusCode).toBe(401);
    expect((await f.registrarAplicacion(datos, f.sistema)).statusCode).toBe(403);
    for (const ruta of ['', `/${datos.operacionId}`]) {
      expect((await f.app.inject({ method: 'GET', url: `/api/v1/aplicaciones-insumos${ruta}` })).statusCode).toBe(401);
      expect((await f.consultarAplicaciones(ruta, f.sistema)).statusCode).toBe(403);
      expect((await f.consultarAplicaciones(ruta, { authorization: 'Bearer inválido' })).statusCode).toBe(401);
    }
  });
  it.each([0, -1, 0.001, 1e-10, 100000000])('rechaza cantidad inválida %s sin persistir', async cantidad => {
    const { insumoId, partidaId } = await f.alta(); const datos = f.datosAplicacion(insumoId, { items: [{ insumoId, cantidad, unidadMedida: 'kg', dosis: 1 }] });
    expect((await f.registrarAplicacion(datos)).statusCode).toBe(400);
    expect(await f.saldo(partidaId)).toBe('10.00'); expect((await f.conteos(datos.operacionId)).aplicaciones).toBe(0);
  });
  it.each([0.001, 1000000])('rechaza dosis y superficie fuera de NUMERIC(8,2): %s', async valor => {
    const { insumoId } = await f.alta();
    expect((await f.registrarAplicacion(f.datosAplicacion(insumoId, { superficieTratada: valor }))).statusCode).toBe(400);
    expect((await f.registrarAplicacion(f.datosAplicacion(insumoId, { items: [{ insumoId, cantidad: 1, unidadMedida: 'kg', dosis: valor }] }))).statusCode).toBe(400);
  });
  it('rechaza insumos duplicados, propiedades ajenas, UUID inválidos y filtros ignorados', async () => {
    const { insumoId } = await f.alta(); const datos = f.datosAplicacion(insumoId);
    expect((await f.registrarAplicacion({ ...datos, items: [datos.items[0], datos.items[0]] })).statusCode).toBe(400);
    for (const campo of ['responsableId', 'fincaId', 'partidaId']) {
      expect((await f.app.inject({ method: 'POST', url: '/api/v1/aplicaciones-insumos', headers: f.admin, payload: { ...datos, [campo]: randomUUID() } })).statusCode).toBe(400);
    }
    expect((await f.registrarAplicacion({ ...datos, actividadRealizadaId: 'sin-uuid' })).statusCode).toBe(400);
    expect((await f.consultarAplicaciones('/sin-uuid')).statusCode).toBe(400);
    expect((await f.consultarAplicaciones(`/${randomUUID()}`)).statusCode).toBe(404);
    for (const query of ['limit=0', 'offset=-1', 'ignorado=si', 'insumoId=sin-uuid']) expect((await f.consultarAplicaciones(`?${query}`)).statusCode).toBe(400);
  });
  it('SQL directo no permite aplicar una partida vencida ni inventar un egreso sin item', async () => {
    const { insumoId, partidaId } = await f.alta({ fechaVencimiento: '2000-01-01' }); const appId = await f.aplicacion();
    await expect(f.pool.query(`insert into aplicaciones_insumo_items(aplicacion_id,insumo_id,partida_insumo_id,cantidad_aplicada,dosis)
      values($1,$2,$3,1,1)`, [appId, insumoId, partidaId])).rejects.toMatchObject({ code: '23514' });
    expect(await f.saldo(partidaId)).toBe('10.00');
    await expect(f.pool.query(`insert into movimientos_inventario(insumo_id,finca_id,partida_id,tipo_movimiento,cantidad,unidad_medida,fecha_movimiento,motivo,responsable_id,solicitud)
      values($1,$2,$3,'EGRESO_APLICACION',1,'kg','2026-10-29','Sin item',$4,'{}')`, [insumoId, f.fincaId, partidaId, f.adminId])).rejects.toMatchObject({ code: '23514' });
    expect(await f.saldo(partidaId)).toBe('10.00');
  });
  it('preserva aplicaciones, items y eventos inmutables y mantiene RN-15 desde el registro real', async () => {
    const { insumoId } = await f.alta(); const datos = f.datosAplicacion(insumoId);
    const res = await f.registrarAplicacion(datos); expect(res.statusCode).toBe(201);
    for (const sentencia of ['update aplicaciones_insumo set motivo_aplicacion=\'Otro\' where id=$1', 'delete from aplicaciones_insumo where id=$1']) {
      await expect(f.pool.query(sentencia, [datos.operacionId])).rejects.toThrow('VIOLACION_DE_INMUTABILIDAD');
    }
    await expect(f.pool.query('delete from aplicaciones_insumo_items where aplicacion_id=$1', [datos.operacionId])).rejects.toThrow('VIOLACION_DE_INMUTABILIDAD');
    await expect(f.pool.query("update eventos_trazabilidad set tipo_evento='OTRO' where payload_especifico->>'aplicacionId'=$1", [datos.operacionId])).rejects.toThrow('VIOLACION_DE_INMUTABILIDAD');
    await expect(f.pool.query("delete from eventos_trazabilidad where payload_especifico->>'aplicacionId'=$1", [datos.operacionId])).rejects.toThrow('VIOLACION_DE_INMUTABILIDAD');
    await expect(f.pool.query("update insumos set unidad_medida='L' where id=$1", [insumoId])).rejects.toMatchObject({ code: '23514', constraint: 'insumos_unidad_inmutable' });
    expect((await f.consultarAplicaciones(`/${datos.operacionId}`)).json().data).toEqual(res.json().data);
  });
});
