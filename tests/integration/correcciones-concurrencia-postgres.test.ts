import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { CorreccionesAplicacionesPostgresFixture } from '../helpers/correcciones-aplicaciones-postgres.fixture.js';
import { URL_INSUMOS } from '../helpers/insumos-postgres.fixture.js';

const url = process.env.INSUMOS_TEST_DATABASE_URL;
if (url && url !== URL_INSUMOS) throw new Error('Destino de correcciones no autorizado.');
describe.skipIf(!url)('AGRUL-055 CU40: concurrencia, idempotencia y protección del commit', () => {
  const f = new CorreccionesAplicacionesPostgresFixture();
  beforeAll(async () => { await f.preparar(url!); }, 30000);
  afterAll(async () => { await f.cerrar(); });
  it('dos correcciones diferentes sustituyen una versión como máximo una vez', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original();
    const res = await Promise.all([f.corregir(aplicacion.id, f.datosCorreccion(insumoId, 2)), f.corregir(aplicacion.id, f.datosCorreccion(insumoId, 3))]);
    expect(res.map(r => r.statusCode).sort()).toEqual([201, 409]);
    const ganadora = res.find(r => r.statusCode === 201)!.json().data;
    const nueva = (await f.consultarAplicaciones(`/${ganadora.aplicacionNuevaId}`)).json().data;
    expect(Number(await f.saldo(partidaId))).toBe(10 - Number(nueva.items[0].cantidadAplicada));
    expect((await f.pool.query('select id from correcciones_aplicaciones_insumo where aplicacion_anterior_id=$1', [aplicacion.id])).rows).toHaveLength(1);
  });
  it('SQL directo no agrega consumos a versiones confirmadas ni sustituidas, incluso durante una corrección', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original();
    const agregar = () => f.pool.query(`insert into aplicaciones_insumo_items
      (aplicacion_id,insumo_id,partida_insumo_id,cantidad_aplicada,dosis) values($1,$2,$3,1,1)`,
    [aplicacion.id, insumoId, partidaId]);
    const antes = await f.hechos(aplicacion.id);
    await expect(agregar()).rejects.toMatchObject({ code: '23514', constraint: 'aplicacion_items_confirmados' });
    expect(await f.saldo(partidaId)).toBe('6.00');
    const [correccion, intento] = await Promise.all([
      f.corregir(aplicacion.id, f.datosCorreccion(insumoId, 2)),
      agregar().then(() => null, (error: unknown) => error),
    ]);
    expect(correccion.statusCode).toBe(201);
    expect(intento).toMatchObject({ code: '23514', constraint: 'aplicacion_items_confirmados' });
    await expect(agregar()).rejects.toMatchObject({ code: '23514', constraint: 'aplicacion_items_confirmados' });
    expect(await f.hechos(aplicacion.id)).toEqual(antes);
    expect(await f.saldo(partidaId)).toBe('8.00');
  });
  it('dos reintentos idénticos compensan y reaplican una sola vez', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original(); const datos = f.datosCorreccion(insumoId, 2);
    const res = await Promise.all([f.corregir(aplicacion.id, datos), f.corregir(aplicacion.id, datos)]);
    expect(res.map(r => r.statusCode)).toEqual([201, 201]); expect(res[0].json().data).toEqual(res[1].json().data);
    expect(await f.saldo(partidaId)).toBe('8.00');
    expect((await f.pool.query('select id from movimientos_inventario where movimiento_compensado_id=$1', [aplicacion.items[0].movimientoId])).rows).toHaveLength(1);
    expect((await f.corregir(aplicacion.id, { ...datos, motivoCorreccion: 'Otro motivo' })).statusCode).toBe(409);
    expect((await f.corregir(aplicacion.id, datos, f.admin)).statusCode).toBe(409);
  });
  it('un egreso posterior concurrente y una corrección no comprometen el mismo saldo', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original();
    const res = await Promise.all([f.corregir(aplicacion.id, f.datosCorreccion(insumoId, 8)), f.mover(partidaId, { cantidad: 3 })]);
    expect(res.map(r => r.statusCode).sort()).toEqual([201, 422]);
    expect(await f.saldo(partidaId)).toBe(res[0].statusCode === 201 ? '2.00' : '3.00');
  });
  it('correcciones de distintas aplicaciones bloquean insumos en un orden común', async () => {
    const a = await f.alta(); const b = await f.alta();
    const items = [a, b].map(x => ({ insumoId: x.insumoId, cantidad: 1, unidadMedida: 'kg', dosis: 1 }));
    const primera = await f.registrarAplicacion(f.datosAplicacion(a.insumoId, { items }));
    const segunda = await f.registrarAplicacion(f.datosAplicacion(b.insumoId, { items: [...items].reverse() }));
    expect(primera.statusCode).toBe(201); expect(segunda.statusCode).toBe(201);
    const datos = f.datosCorreccion(a.insumoId); datos.nuevaAplicacion.items = items.map(i => ({ ...i, cantidad: 2, dosis: 2 }));
    const inversa = f.datosCorreccion(b.insumoId); inversa.nuevaAplicacion.items = [...datos.nuevaAplicacion.items].reverse();
    const res = await Promise.all([f.corregir(primera.json().data.id, datos), f.corregir(segunda.json().data.id, inversa)]);
    expect(res.map(r => r.statusCode)).toEqual([201, 201]); expect(await f.saldo(a.partidaId)).toBe('6.00'); expect(await f.saldo(b.partidaId)).toBe('6.00');
  });
  it('SQL directo no puede duplicar la devolución ni cambiar su cantidad', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original(); const datos = f.datosCorreccion(insumoId, 2);
    expect((await f.corregir(aplicacion.id, datos)).statusCode).toBe(201);
    const insertar = `insert into movimientos_inventario(insumo_id,finca_id,partida_id,tipo_movimiento,cantidad,unidad_medida,fecha_movimiento,motivo,responsable_id,solicitud,correccion_id,movimiento_compensado_id)
      values($1,$2,$3,'REGULARIZACION_CORRECCION',$4,'kg','2026-10-29','Intento duplicado',$5,'{}',$6,$7)`;
    const argumentos = [insumoId, f.fincaId, partidaId, 4, f.encargadoId, datos.operacionId, aplicacion.items[0].movimientoId];
    await expect(f.pool.query(insertar, argumentos)).rejects.toMatchObject({ code: '23505' });
    await expect(f.pool.query(insertar, [...argumentos.slice(0, 3), 3, ...argumentos.slice(4)])).rejects.toMatchObject({ code: '23514' });
    expect(await f.saldo(partidaId)).toBe('8.00');
  });
  it('rechaza en el commit una corrección SQL incompleta, sin dejar una versión sustituida', async () => {
    const { aplicacion, partidaId } = await f.original();
    const evento = (await f.pool.query("select id from eventos_trazabilidad where tipo_evento='APLICACION_INSUMOS' and payload_especifico->>'aplicacionId'=$1", [aplicacion.id])).rows[0].id;
    const cliente = await f.pool.connect(); const id = randomUUID();
    try {
      await cliente.query('begin');
      await cliente.query(`insert into correcciones_aplicaciones_insumo(id,aplicacion_anterior_id,aplicacion_nueva_id,evento_original_id,motivo,responsable_id,solicitud)
        values($1,$2,$3,$4,'Incompleta',$5,'{}')`, [id, aplicacion.id, randomUUID(), evento, f.encargadoId]);
      await expect(cliente.query('commit')).rejects.toMatchObject({ code: expect.stringMatching(/^(23503|23514)$/) });
    } finally { await cliente.query('rollback'); cliente.release(); }
    expect(await f.saldo(partidaId)).toBe('6.00');
    expect((await f.consultarAplicaciones(`/${aplicacion.id}`)).json().data.versionSiguienteId).toBeNull();
    expect((await f.pool.query('select id from correcciones_aplicaciones_insumo where id=$1', [id])).rows).toEqual([]);
  });
  it('la auditoría de correcciones es inmutable en PostgreSQL', async () => {
    const { aplicacion, insumoId } = await f.original(); const datos = f.datosCorreccion(insumoId, 2);
    expect((await f.corregir(aplicacion.id, datos)).statusCode).toBe(201);
    await expect(f.pool.query("update correcciones_aplicaciones_insumo set motivo='Cambiado' where id=$1", [datos.operacionId])).rejects.toThrow('VIOLACION_DE_INMUTABILIDAD');
    await expect(f.pool.query('delete from correcciones_aplicaciones_insumo where id=$1', [datos.operacionId])).rejects.toThrow('VIOLACION_DE_INMUTABILIDAD');
  });
});
