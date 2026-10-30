import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CorreccionesAplicacionesPostgresFixture } from '../helpers/correcciones-aplicaciones-postgres.fixture.js';
import { URL_INSUMOS } from '../helpers/insumos-postgres.fixture.js';

const url = process.env.INSUMOS_TEST_DATABASE_URL;
if (url && url !== URL_INSUMOS) throw new Error('Destino de correcciones no autorizado.');
describe.skipIf(!url)('AGRUL-055 CU40: compensación atómica, versiones e historia', () => {
  const f = new CorreccionesAplicacionesPostgresFixture();
  beforeAll(async () => { await f.preparar(url!); }, 30000);
  afterAll(async () => { await f.cerrar(); });

  it('restituye el egreso exacto, reaplica FIFO y conserva inalterados todos los hechos originales', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original(6);
    const antes = await f.hechos(aplicacion.id); const datos = f.datosCorreccion(insumoId, 4);
    const res = await f.corregir(aplicacion.id, datos); expect(res.statusCode).toBe(201);
    const c = res.json().data;
    expect(c).toMatchObject({ id: datos.operacionId, aplicacionAnteriorId: aplicacion.id, motivo: datos.motivoCorreccion, responsableId: f.encargadoId });
    expect(c.registradoEn).toBeTruthy(); expect(c.aplicacionNuevaId).not.toBe(aplicacion.id);
    expect(c.movimientos).toEqual([expect.objectContaining({ partidaId, cantidad: '6.00', movimientoCompensadoId: aplicacion.items[0].movimientoId })]);
    expect(await f.saldo(partidaId)).toBe('6.00'); expect(await f.hechos(aplicacion.id)).toEqual(antes);
    const vieja = (await f.consultarAplicaciones(`/${aplicacion.id}`)).json().data;
    const nueva = (await f.consultarAplicaciones(`/${c.aplicacionNuevaId}`)).json().data;
    expect(vieja.versionSiguienteId).toBe(c.aplicacionNuevaId); expect(nueva.versionAnteriorId).toBe(aplicacion.id);
    expect(nueva.items[0].cantidadAplicada).toBe('4.00');
    expect((await f.consultarAplicaciones(`?insumoId=${insumoId}`)).json().data.map((a: { id: string }) => a.id)).toEqual([c.aplicacionNuevaId]);
    expect((await f.consultarAplicaciones(`?insumoId=${insumoId}&incluirHistoricas=true`)).json().data).toHaveLength(2);
    expect((await f.consultarAplicaciones(`/${aplicacion.id}/correcciones`)).json().data).toEqual([c]);
    const evento = (await f.pool.query("select evento_referenciado_id,payload_especifico from eventos_trazabilidad where tipo_evento='CORRECCION' and payload_especifico->>'correccionId'=$1", [c.id])).rows[0];
    expect(evento.evento_referenciado_id).toBe(c.eventoOriginalId); expect(evento.payload_especifico.aplicacionNuevaId).toBe(c.aplicacionNuevaId);
  });
  it('admite correcciones sucesivas únicamente sobre la versión vigente', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original();
    const primera = await f.corregir(aplicacion.id, f.datosCorreccion(insumoId, 3)); expect(primera.statusCode).toBe(201);
    const intermedia = primera.json().data.aplicacionNuevaId; const hechos = await f.hechos(intermedia);
    const segunda = await f.corregir(intermedia, f.datosCorreccion(insumoId, 5)); expect(segunda.statusCode).toBe(201);
    expect(await f.saldo(partidaId)).toBe('5.00'); expect(await f.hechos(intermedia)).toEqual(hechos);
    expect((await f.corregir(aplicacion.id, f.datosCorreccion(insumoId, 1))).statusCode).toBe(409);
    expect((await f.consultarAplicaciones(`?insumoId=${insumoId}&incluirHistoricas=true`)).json().data).toHaveLength(3);
    expect((await f.consultarAplicaciones(`/${intermedia}/correcciones`)).json().data).toHaveLength(2);
  });
  it('no invalida un egreso posterior: conserva su hecho y concilia el saldo sin reescribir su fecha', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original(6);
    const posterior = await f.mover(partidaId, { cantidad: 3 }); expect(posterior.statusCode).toBe(201);
    const id = posterior.json().data.id; const antes = (await f.pool.query('select to_jsonb(m) as fila from movimientos_inventario m where id=$1', [id])).rows;
    const res = await f.corregir(aplicacion.id, f.datosCorreccion(insumoId, 4)); expect(res.statusCode).toBe(201);
    expect(await f.saldo(partidaId)).toBe('3.00');
    expect((await f.pool.query('select to_jsonb(m) as fila from movimientos_inventario m where id=$1', [id])).rows).toEqual(antes);
    const { rows } = await f.pool.query(`select bool_and(fecha_movimiento=(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date) as actual
      from movimientos_inventario where correccion_id=$1 or aplicacion_item_id in
      (select id from aplicaciones_insumo_items where aplicacion_id=$2)`, [res.json().data.id, res.json().data.aplicacionNuevaId]);
    expect(rows[0].actual).toBe(true);
  });
  it('rechaza una cantidad que invadiría consumos posteriores y revierte toda la corrección', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original(6);
    expect((await f.mover(partidaId, { cantidad: 3 })).statusCode).toBe(201);
    const datos = f.datosCorreccion(insumoId, 8); const antes = await f.hechos(aplicacion.id);
    expect((await f.corregir(aplicacion.id, datos)).statusCode).toBe(422);
    expect(await f.saldo(partidaId)).toBe('1.00'); expect(await f.hechos(aplicacion.id)).toEqual(antes);
    expect((await f.pool.query('select id from correcciones_aplicaciones_insumo where id=$1', [datos.operacionId])).rows).toEqual([]);
    expect((await f.consultarAplicaciones(`?insumoId=${insumoId}&incluirHistoricas=true`)).json().data).toHaveLength(1);
  });
  it('devuelve cantidades a todas las partidas originales, aunque el consumo corregido cambie de partida', async () => {
    const insumoId = await f.crear(); const a = await f.alta({ insumoId, cantidad: 2, fechaVencimiento: '2099-01-01' });
    const b = await f.alta({ insumoId, cantidad: 8, fechaVencimiento: '2099-02-01' });
    const res = await f.registrarAplicacion(f.datosAplicacion(insumoId, { items: [{ insumoId, cantidad: 4, unidadMedida: 'kg', dosis: 4 }] })); expect(res.statusCode).toBe(201);
    const c = await f.corregir(res.json().data.id, f.datosCorreccion(insumoId, 3)); expect(c.statusCode).toBe(201);
    expect(c.json().data.movimientos).toEqual(expect.arrayContaining([expect.objectContaining({ partidaId: a.partidaId, cantidad: '2.00' }), expect.objectContaining({ partidaId: b.partidaId, cantidad: '2.00' })]));
    expect(await f.saldo(a.partidaId)).toBe('0.00'); expect(await f.saldo(b.partidaId)).toBe('7.00');
  });
  it('recalcula FEFO con el stock utilizable actual en lugar de conservar la asignación vieja', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original();
    const prioritaria = await f.alta({ insumoId, cantidad: 3, fechaVencimiento: '2099-01-01' });
    const res = await f.corregir(aplicacion.id, f.datosCorreccion(insumoId, 2)); expect(res.statusCode).toBe(201);
    expect(await f.saldo(partidaId)).toBe('10.00'); expect(await f.saldo(prioritaria.partidaId)).toBe('1.00');
    const nueva = (await f.consultarAplicaciones(`/${res.json().data.aplicacionNuevaId}`)).json().data;
    expect(nueva.items).toEqual([expect.objectContaining({ partidaInsumoId: prioritaria.partidaId, cantidadAplicada: '2.00' })]);
  });
  it('rechaza históricos sin procedencia en vez de inventar disponibilidad', async () => {
    const historica = await f.aplicacion(); const { insumoId } = await f.alta();
    const res = await f.corregir(historica, f.datosCorreccion(insumoId)); expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('CONCILIACION_INVENTARIO_REQUERIDA');
  });
  it('rollback completo si falla el evento de corrección después de compensar y reaplicar', async () => {
    const { aplicacion, insumoId, partidaId } = await f.original(); const datos = f.datosCorreccion(insumoId, 2);
    await f.pool.query(`create function fallo_correccion_fixture() returns trigger as $$ begin
      if NEW.tipo_evento='CORRECCION' then raise exception 'Fallo controlado'; end if; return NEW; end $$ language plpgsql;
      create trigger zz_fallo_correccion before insert on eventos_trazabilidad for each row execute function fallo_correccion_fixture()`);
    try {
      expect((await f.corregir(aplicacion.id, datos)).statusCode).toBe(500); expect(await f.saldo(partidaId)).toBe('6.00');
      expect((await f.consultarAplicaciones(`?insumoId=${insumoId}&incluirHistoricas=true`)).json().data).toHaveLength(1);
      expect((await f.pool.query('select id from correcciones_aplicaciones_insumo where id=$1', [datos.operacionId])).rows).toEqual([]);
    } finally { await f.pool.query('drop trigger zz_fallo_correccion on eventos_trazabilidad; drop function fallo_correccion_fixture()'); }
  });
});
