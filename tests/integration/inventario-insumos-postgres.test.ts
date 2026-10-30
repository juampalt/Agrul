import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { InventarioPostgresFixture } from '../helpers/inventario-postgres.fixture.js';
import { URL_INSUMOS } from '../helpers/insumos-postgres.fixture.js';

const url = process.env.INSUMOS_TEST_DATABASE_URL;
if (url && url !== URL_INSUMOS) throw new Error('Destino de inventario no autorizado.');
describe.skipIf(!url)('AGRUL-055: ingresos, movimientos, saldos y alertas PostgreSQL', () => {
  const f = new InventarioPostgresFixture();
  beforeAll(async () => { await f.preparar(url!); }, 30000);
  afterAll(async () => { await f.cerrar(); });

  it.each(['INGRESO', 'EXISTENCIA_INICIAL'] as const)('persiste partida, responsable real y movimiento %s en una sola operación', async tipoMovimiento => {
    const insumoId = await f.crear(); const datos = f.ingresoDatos(insumoId, { tipoMovimiento });
    const res = await f.ingresar(datos); expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ id: datos.operacionId, insumoId, fincaId: f.fincaId, cantidad: '10.00', responsableId: f.encargadoId, tipoMovimiento });
    const id = res.json().data.partidaId;
    expect(await f.saldo(id)).toBe('10.00');
    expect((await f.consultar(`partidas/${id}`)).json().data).toMatchObject({ fechaIngreso: datos.fechaIngreso, proveedor: datos.proveedor, unidadMedida: 'kg', fechaVencimiento: null });
    expect((await f.consultar(`movimientos/${datos.operacionId}`)).json().data).toEqual(res.json().data);
  });
  it('reintentos simultáneos de ingreso generan una sola partida y un solo movimiento', async () => {
    const insumoId = await f.crear(); const datos = f.ingresoDatos(insumoId);
    const respuestas = await Promise.all([f.ingresar(datos), f.ingresar(datos)]);
    expect(respuestas.map(r => r.statusCode)).toEqual([201, 201]);
    expect(respuestas[0].json().data).toEqual(respuestas[1].json().data);
    expect((await f.consultar(`partidas?insumoId=${insumoId}`)).json().data).toHaveLength(1);
    expect(await f.saldo(respuestas[0].json().data.partidaId)).toBe('10.00');
    expect((await f.ingresar({ ...datos, cantidad: 11 })).statusCode).toBe(409);
    expect((await f.ingresar(datos, f.admin)).statusCode).toBe(409);
  });
  it('registra ajustes y devolución de sobrantes sin usar con historial completo', async () => {
    const { partidaId } = await f.alta({ cantidad: 10 });
    for (const [tipoMovimiento, cantidad] of [['AJUSTE_NEGATIVO', 3], ['DEVOLUCION', 2], ['AJUSTE_POSITIVO', 1], ['PERDIDA', 4]] as const) {
      expect((await f.mover(partidaId, { tipoMovimiento, cantidad })).statusCode).toBe(201);
    }
    expect(await f.saldo(partidaId)).toBe('6.00');
    const movimientos = (await f.consultar(`movimientos?partidaId=${partidaId}`)).json().data;
    expect(movimientos).toHaveLength(5);
    expect(movimientos.every((m: { partidaId: string; responsableId: string }) => m.partidaId === partidaId && !!m.responsableId)).toBe(true);
  });
  it('RN-17 rechaza stock insuficiente aunque el motivo justifique el egreso', async () => {
    const { partidaId } = await f.alta({ cantidad: 1 });
    const res = await f.mover(partidaId, { cantidad: 1.01, motivo: 'Justificación explícita de salida superior al stock' });
    expect(res.statusCode).toBe(422); expect(await f.saldo(partidaId)).toBe('1.00');
    expect((await f.consultar(`movimientos?partidaId=${partidaId}`)).json().data).toHaveLength(1);
  });
  it('dos egresos simultáneos no pueden consumir el mismo stock dos veces', async () => {
    const { partidaId } = await f.alta({ cantidad: 10 });
    const res = await Promise.all([f.mover(partidaId, { cantidad: 6 }), f.mover(partidaId, { cantidad: 6 })]);
    expect(res.map(r => r.statusCode).sort()).toEqual([201, 422]); expect(await f.saldo(partidaId)).toBe('4.00');
    expect((await f.consultar(`movimientos?partidaId=${partidaId}`)).json().data).toHaveLength(2);
  });
  it('el mismo movimiento concurrente es idempotente y un cambio de cantidad produce 409', async () => {
    const { partidaId } = await f.alta(); const operacionId = randomUUID();
    const res = await Promise.all([f.mover(partidaId, { operacionId, cantidad: 2 }), f.mover(partidaId, { operacionId, cantidad: 2 })]);
    expect(res.map(r => r.statusCode)).toEqual([201, 201]); expect(res[0].json().data).toEqual(res[1].json().data);
    expect(await f.saldo(partidaId)).toBe('8.00');
    expect((await f.mover(partidaId, { operacionId, cantidad: 3 })).statusCode).toBe(409);
  });
  it('las cuentas decimales son exactas en PostgreSQL', async () => {
    const { partidaId } = await f.alta({ cantidad: 0.1 });
    expect((await f.mover(partidaId, { tipoMovimiento: 'AJUSTE_POSITIVO', cantidad: 0.2 })).statusCode).toBe(201);
    expect(await f.saldo(partidaId)).toBe('0.30');
    expect((await f.mover(partidaId, { cantidad: 0.3 })).statusCode).toBe(201); expect(await f.saldo(partidaId)).toBe('0.00');
  });
  it('rechaza el desbordamiento de saldo sin insertar el movimiento ni redondear cantidades', async () => {
    const { partidaId } = await f.alta({ cantidad: 99999999.99 });
    expect((await f.mover(partidaId, { tipoMovimiento: 'AJUSTE_POSITIVO', cantidad: 0.01 })).statusCode).toBe(422);
    expect(await f.saldo(partidaId)).toBe('99999999.99');
    expect((await f.consultar(`movimientos?partidaId=${partidaId}`)).json().data).toHaveLength(1);
  });
  it('conserva utilizables las partidas durante el día de su vencimiento en Tucumán', async () => {
    const { rows } = await f.pool.query<{ hoy: string }>("select to_char(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires','YYYY-MM-DD') as hoy");
    const { insumoId } = await f.alta({ cantidad: 3, fechaVencimiento: rows[0].hoy });
    expect((await f.consultar(`existencias?insumoId=${insumoId}&fincaId=${f.fincaId}`)).json().data[0]).toMatchObject({ stockFisico: '3.00', stockUtilizable: '3.00', stockVencido: '0' });
  });
  it('separa stock físico/utilizable/vencido, incluye partidas sin vencimiento y actualiza alertas', async () => {
    const insumoId = await f.crear({ ...f.datos(), nivelMinimo: 5 });
    const vencida = await f.alta({ insumoId, cantidad: 7, fechaVencimiento: '2000-01-01' });
    const util = await f.alta({ insumoId, cantidad: 2, fechaVencimiento: null });
    const ruta = `existencias?insumoId=${insumoId}&fincaId=${f.fincaId}`;
    expect((await f.consultar(ruta)).json().data).toEqual([expect.objectContaining({ stockFisico: '9.00', stockUtilizable: '2.00', stockVencido: '7.00', alertaStockMinimo: true, alertaVencimiento: true })]);
    expect((await f.mover(util.partidaId, { tipoMovimiento: 'AJUSTE_POSITIVO', cantidad: 4 })).statusCode).toBe(201);
    expect((await f.consultar(ruta)).json().data[0].alertaStockMinimo).toBe(false);
    expect((await f.mover(vencida.partidaId, { tipoMovimiento: 'PERDIDA', cantidad: 7 })).statusCode).toBe(201);
    expect((await f.consultar(`alertas?insumoId=${insumoId}&fincaId=${f.fincaId}`)).json().data).toEqual([]);
  });
  it('alerta al llegar al mínimo y detecta también insumos activos sin partidas', async () => {
    const insumoId = await f.crear({ ...f.datos(), nivelMinimo: 5 });
    const ruta = `alertas?insumoId=${insumoId}&fincaId=${f.fincaId}`;
    expect((await f.consultar(ruta)).json().data).toEqual([expect.objectContaining({ stockFisico: '0', alertaStockMinimo: true })]);
    await f.alta({ insumoId, cantidad: 5 });
    expect((await f.consultar(ruta)).json().data[0].alertaStockMinimo).toBe(true);
  });
  it('CU65 filtra el historial de movimientos por tipo y período sin alterar las existencias', async () => {
    const { insumoId } = await f.alta();
    const base = `movimientos?insumoId=${insumoId}&fincaId=${f.fincaId}`;
    const todos = (await f.consultar(base)).json().data;
    expect(todos.length).toBeGreaterThan(0);
    const ingresos = (await f.consultar(`${base}&tipoMovimiento=INGRESO`)).json().data;
    expect(ingresos.length).toBeGreaterThan(0);
    expect(ingresos.every((m: { tipoMovimiento: string }) => m.tipoMovimiento === 'INGRESO')).toBe(true);
    expect((await f.consultar(`${base}&tipoMovimiento=PERDIDA`)).json().data).toEqual([]);
    expect((await f.consultar(`${base}&desde=2999-01-01`)).json().data).toEqual([]);
    expect((await f.consultar(`${base}&desde=2020-01-01&hasta=2999-01-01`)).json().data).toHaveLength(todos.length);
    expect((await f.consultar(`${base}&desde=2026-02-01&hasta=2026-01-01`)).statusCode).toBe(400);
    const existencias = (await f.consultar(`existencias?insumoId=${insumoId}&fincaId=${f.fincaId}`)).json().data;
    expect(existencias[0].stockFisico).toBe('10.00');
  });
  it('no mezcla unidades cuando cambia el catálogo antes de aplicaciones', async () => {
    const { insumoId, partidaId } = await f.alta();
    const datos = { ...f.datos(), codigo: (await f.pool.query('select codigo from insumos where id=$1', [insumoId])).rows[0].codigo }; const cambio = await f.app.inject({ method: 'PUT', url: `/api/v1/insumos/${insumoId}`, headers: f.admin, payload: { ...datos, unidadMedida: 'L' } });
    expect(cambio.statusCode).toBe(200);
    await f.alta({ insumoId, cantidad: 2, unidadMedida: 'L' });
    const lista = (await f.consultar(`existencias?insumoId=${insumoId}&fincaId=${f.fincaId}`)).json().data;
    expect(lista).toHaveLength(2); expect(lista).toEqual(expect.arrayContaining([expect.objectContaining({ unidadMedida: 'kg', stockFisico: '10.00' }), expect.objectContaining({ unidadMedida: 'L', stockFisico: '2.00' })]));
    expect(lista.find((e: { unidadMedida: string }) => e.unidadMedida === 'kg').stockUtilizable).toBe('0');
    expect((await f.mover(partidaId, { unidadMedida: 'L' })).statusCode).toBe(422);
  });
  it('alerta falta de stock en la unidad vigente aunque solo queden partidas en otra unidad', async () => {
    const { insumoId } = await f.alta();
    const codigo = (await f.pool.query('select codigo from insumos where id=$1', [insumoId])).rows[0].codigo;
    const cambio = await f.app.inject({ method: 'PUT', url: `/api/v1/insumos/${insumoId}`, headers: f.admin,
      payload: { ...f.datos(), codigo, unidadMedida: 'L', nivelMinimo: 5 } });
    expect(cambio.statusCode).toBe(200);
    const ruta = `?insumoId=${insumoId}&fincaId=${f.fincaId}`;
    const existencias = (await f.consultar(`existencias${ruta}`)).json().data;
    expect(existencias).toEqual(expect.arrayContaining([
      expect.objectContaining({ unidadMedida: 'kg', stockFisico: '10.00', stockUtilizable: '0', alertaStockMinimo: false }),
      expect.objectContaining({ unidadMedida: 'L', stockFisico: '0', stockUtilizable: '0', alertaStockMinimo: true }),
    ]));
    expect((await f.consultar(`alertas${ruta}`)).json().data).toEqual([
      expect.objectContaining({ unidadMedida: 'L', stockFisico: '0', alertaStockMinimo: true }),
    ]);
    await f.alta({ insumoId, cantidad: 6, unidadMedida: 'L' });
    expect((await f.consultar(`alertas${ruta}`)).json().data).toEqual([]);
  });
  it('RN-16 bloquea UPDATE, DELETE y TRUNCATE del historial y cambios directos de saldo/origen', async () => {
    const { partidaId, movimientoId } = await f.alta();
    for (const sentencia of ['update movimientos_inventario set cantidad=2 where id=$1', 'delete from movimientos_inventario where id=$1']) {
      await expect(f.pool.query(sentencia, [movimientoId])).rejects.toThrow('VIOLACION_DE_INMUTABILIDAD');
    }
    await expect(f.pool.query('truncate movimientos_inventario')).rejects.toThrow('VIOLACION_DE_INMUTABILIDAD');
    await expect(f.pool.query('update partidas_insumo set cantidad_disponible=99 where id=$1', [partidaId])).rejects.toMatchObject({ code: '23514' });
    await expect(f.pool.query('update partidas_insumo set finca_id=$2 where id=$1', [partidaId, f.otraFincaId])).rejects.toMatchObject({ code: '23514' });
    expect(await f.saldo(partidaId)).toBe('10.00');
  });
  it.each([0, -1, 0.001, 1e-10, 100000000])('rechaza cantidades inválidas sin insertar: %s', async cantidad => {
    const insumoId = await f.crear(); expect((await f.ingresar(f.ingresoDatos(insumoId, { cantidad }))).statusCode).toBe(400);
    expect((await f.consultar(`partidas?insumoId=${insumoId}`)).json().data).toEqual([]);
  });
  it('rechaza unidades incompatibles, fechas inexistentes, catálogos inactivos y actores suministrados por el cliente', async () => {
    const insumoId = await f.crear(); const datos = f.ingresoDatos(insumoId);
    expect((await f.ingresar({ ...datos, unidadMedida: 'L' })).statusCode).toBe(422);
    expect((await f.ingresar({ ...datos, fechaIngreso: '2026-02-30' })).statusCode).toBe(400);
    const res = await f.app.inject({ method: 'POST', url: '/api/v1/inventario/ingresos', headers: f.admin, payload: { ...datos, responsableId: f.encargadoId } });
    expect(res.statusCode).toBe(400);
    await f.app.inject({ method: 'PATCH', url: `/api/v1/insumos/${insumoId}/desactivar`, headers: f.admin });
    expect((await f.ingresar(datos)).statusCode).toBe(422);
    expect((await f.ingresar({ ...datos, insumoId: randomUUID() })).statusCode).toBe(404);
  });
  it('rollback completo cuando falla la inserción final del movimiento', async () => {
    await f.pool.query(`create function fallo_inventario_fixture() returns trigger as $$ begin
      if NEW.motivo='Fallo deliberado' then raise exception 'Fallo de prueba'; end if; return NEW; end $$ language plpgsql;
      create trigger zz_fallo_inventario before insert on movimientos_inventario for each row execute function fallo_inventario_fixture()`);
    try {
      const insumoId = await f.crear(); const datos = f.ingresoDatos(insumoId, { motivo: 'Fallo deliberado' });
      expect((await f.ingresar(datos)).statusCode).toBe(500);
      expect((await f.consultar(`partidas?insumoId=${insumoId}`)).json().data).toEqual([]);
      const { partidaId } = await f.alta(); expect((await f.mover(partidaId, { motivo: 'Fallo deliberado' })).statusCode).toBe(500);
      expect(await f.saldo(partidaId)).toBe('10.00');
    } finally { await f.pool.query('drop trigger zz_fallo_inventario on movimientos_inventario; drop function fallo_inventario_fixture()'); }
  });
});
