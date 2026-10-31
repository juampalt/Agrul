import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { InsumosPostgresFixture, URL_INSUMOS } from '../helpers/insumos-postgres.fixture.js';
import { crearServidorProduccion } from '../../src/bootstrap.js';

const url = process.env.INSUMOS_TEST_DATABASE_URL;
if (url && url !== URL_INSUMOS) throw new Error('Destino de pruebas AGRUL-055 no autorizado.');

describe.skipIf(!url)('AGRUL-055 CU34–CU37: PostgreSQL y bootstrap real', () => {
  const f = new InsumosPostgresFixture();
  beforeAll(async () => { await f.preparar(url!); }, 30000);
  afterAll(async () => { await f.cerrar(); });
  const consultar = (id: string) => f.app.inject({ method: 'GET', url: `/api/v1/insumos/${id}`, headers: f.admin });
  const modificar = (id: string, payload = f.datos()) => f.app.inject({ method: 'PUT', url: `/api/v1/insumos/${id}`, headers: f.admin, payload });

  it('CU34 registra los campos canónicos y persiste el catálogo después de reiniciar el bootstrap', async () => {
    const datos = { ...f.datos('CU34-PERSISTE'), nombre: ' Producto ', tipoProducto: ' Mineral ', fabricanteMarca: ' Marca ' };
    const id = await f.crear(datos);
    const reinicio = crearServidorProduccion({ connectionString: f.aislado.connectionString, logger: false }).app;
    try {
      const res = await reinicio.inject({ method: 'GET', url: `/api/v1/insumos/${id}`, headers: f.admin });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ success: true, error: null, data: { ...datos, id, nombre: 'Producto', tipoProducto: 'Mineral', fabricanteMarca: 'Marca', estado: 'ACTIVO' } });
      expect((await f.pool.query('select nivel_minimo from insumos where id=$1', [id])).rows[0].nivel_minimo).toBe('10.25');
    } finally { await reinicio.close(); }
  });
  it('CU34 resuelve altas concurrentes con el mismo código: una sola fila y conflicto 409', async () => {
    const payload = f.datos('CU34-DUPLICADO');
    const alta = () => f.app.inject({ method: 'POST', url: '/api/v1/insumos', headers: f.admin, payload });
    const respuestas = await Promise.all([alta(), alta()]);
    expect(respuestas.map(r => r.statusCode).sort()).toEqual([201, 409]);
    expect(respuestas.find(r => r.statusCode === 409)!.json().error.code).toBe('CODIGO_INSUMO_DUPLICADO');
    expect((await f.pool.query('select id from insumos where codigo=$1', [payload.codigo])).rows).toHaveLength(1);
  });
  it('CU35 filtra y pagina en SQL con orden estable y permite consultar al encargado', async () => {
    for (const codigo of ['CU35-A', 'CU35-B']) await f.crear(f.datos(codigo));
    const res = await f.app.inject({ method: 'GET', url: '/api/v1/insumos?categoria=FERTILIZANTE&estado=ACTIVO&codigo=CU35-B&limit=1&offset=0', headers: f.encargado });
    expect(res.statusCode).toBe(200); expect(res.json().data).toHaveLength(1);
    expect(res.json().data[0].codigo).toBe('CU35-B');
    const id = res.json().data[0].id;
    expect((await f.app.inject({ method: 'GET', url: `/api/v1/insumos/${id}`, headers: f.encargado })).statusCode).toBe(200);
    const vacio = await f.app.inject({ method: 'GET', url: '/api/v1/insumos?codigo=CU35-B&offset=1', headers: f.admin });
    expect(vacio.json().data).toEqual([]);
  });
  it('CU36 modifica todos los campos y admite cambiar unidad antes de una aplicación', async () => {
    const original = f.datos('CU36-NUEVO'); const id = await f.crear(original);
    const datos = { ...original, nombre: 'Nuevo nombre', categoria: 'OTRO' as const, unidadMedida: 'L', nivelMinimo: 0 };
    const res = await modificar(id, datos);
    expect(res.statusCode).toBe(200); expect((await consultar(id)).json().data).toMatchObject({ ...datos, id, estado: 'ACTIVO', habilitadoParaNuevasAplicaciones: true, antecedentes: [] });
  });
  it('CU35 presenta los antecedentes de utilización y si está habilitado para nuevas aplicaciones', async () => {
    const vacio = await f.crear();
    expect((await consultar(vacio)).json().data).toMatchObject({ habilitadoParaNuevasAplicaciones: true, antecedentes: [],
      mensajeAntecedentes: 'No se encontraron aplicaciones registradas para el insumo.' });
    const id = await f.crear(); await f.aplicar(id);
    const detalle = (await consultar(id)).json().data;
    expect(detalle.antecedentes).toHaveLength(1);
    expect(detalle.antecedentes[0]).toMatchObject({ fechaAplicacion: '2026-10-15', cantidadUtilizada: 1, unidadMedida: 'kg' });
    expect(Object.keys(detalle.antecedentes[0])).toEqual(expect.arrayContaining(['loteId', 'codigoLote', 'cultivo', 'ciclo', 'actividadRealizadaId']));
    await f.app.inject({ method: 'PATCH', url: `/api/v1/insumos/${id}/desactivar`, headers: f.admin });
    expect((await consultar(id)).json().data).toMatchObject({ habilitadoParaNuevasAplicaciones: false });
    expect((await consultar(id)).json().data.antecedentes).toHaveLength(1);
  });
  it('CU36 RN-15 rechaza cambiar unidad tras aplicación y revierte todos los campos', async () => {
    const id = await f.crear(); await f.aplicar(id);
    const { habilitadoParaNuevasAplicaciones: _h, antecedentes: _a, mensajeAntecedentes: _m, ...antes } = (await consultar(id)).json().data;
    const res = await modificar(id, { ...antes, id: undefined, estado: undefined, unidadMedida: 'L' });
    expect(res.statusCode).toBe(422); expect(res.json().error.code).toBe('UNIDAD_INSUMO_INMUTABLE');
    expect((await consultar(id)).json().data).toMatchObject(antes);
    expect((await modificar(id, { ...antes, id: undefined, estado: undefined, nombre: 'Nombre corregido' })).statusCode).toBe(200);
  });
  it('CU36 RN-15 también rechaza SQL directo y conserva las referencias históricas', async () => {
    const id = await f.crear(); const { aplicacionId } = await f.aplicar(id);
    await expect(f.pool.query("update insumos set unidad_medida='L' where id=$1", [id])).rejects.toMatchObject({ code: '23514', constraint: 'insumos_unidad_inmutable' });
    await expect(f.pool.query('delete from aplicaciones_insumo_items where aplicacion_id=$1', [aplicacionId])).rejects.toThrow('VIOLACION_DE_INMUTABILIDAD');
    await expect(f.pool.query('update aplicaciones_insumo_items set cantidad_aplicada=2 where aplicacion_id=$1', [aplicacionId])).rejects.toThrow('VIOLACION_DE_INMUTABILIDAD');
  });
  it('CU37 desactiva sin borrar partidas/aplicaciones y reserva el código incluso inactivo', async () => {
    const datos = f.datos('CU37-HISTORICO'); const id = await f.crear(datos); const referencias = await f.aplicar(id);
    const antes = (await f.pool.query('select row_to_json(t) as fila from aplicaciones_insumo_items t where aplicacion_id=$1', [referencias.aplicacionId])).rows;
    const res = await f.app.inject({ method: 'PATCH', url: `/api/v1/insumos/${id}/desactivar`, headers: f.admin });
    expect(res.statusCode).toBe(200); expect(res.json().data.estado).toBe('INACTIVO');
    expect((await consultar(id)).json().data.estado).toBe('INACTIVO');
    expect((await f.pool.query('select row_to_json(t) as fila from aplicaciones_insumo_items t where aplicacion_id=$1', [referencias.aplicacionId])).rows).toEqual(antes);
    expect((await f.app.inject({ method: 'POST', url: '/api/v1/insumos', headers: f.admin, payload: datos })).statusCode).toBe(409);
    expect((await modificar(id, { ...datos, nombre: 'Histórico modificado' })).json().data.estado).toBe('INACTIVO');
    await expect(f.pool.query('delete from insumos where id=$1', [id])).rejects.toMatchObject({ code: expect.stringMatching(/^(23503|23001)$/) });
    expect((await consultar(id)).json().data.estado).toBe('INACTIVO');
  });
  it('CU36 el código es invariable: la modificación se rechaza completa y SQL directo también', async () => {
    const original = f.datos('CU36-UNICO-B'); const id = await f.crear(original);
    const antes = (await consultar(id)).json().data;
    const res = await modificar(id, { ...original, codigo: 'CU36-OTRO', nombre: 'No debe guardarse' });
    expect(res.statusCode).toBe(422); expect(res.json().error.code).toBe('CODIGO_INSUMO_INMUTABLE');
    expect((await consultar(id)).json().data).toEqual(antes);
    await expect(f.pool.query("update insumos set codigo='CU36-SQL' where id=$1", [id])).rejects.toMatchObject({ code: '23514', constraint: 'insumos_codigo_inmutable' });
  });
  it.each([-1, 0.001, 1e-10, 100000000])('rechaza nivel mínimo inválido %s sin insertar', async nivelMinimo => {
    const datos = { ...f.datos(), nivelMinimo };
    expect((await f.app.inject({ method: 'POST', url: '/api/v1/insumos', headers: f.admin, payload: datos })).statusCode).toBe(400);
    expect((await f.pool.query('select id from insumos where codigo=$1', [datos.codigo])).rows).toEqual([]);
  });
  it.each([0, 0.01, 99999999.99])('persiste los límites NUMERIC sin redondear: %s', async nivelMinimo => {
    const id = await f.crear({ ...f.datos(), nivelMinimo });
    expect((await consultar(id)).json().data.nivelMinimo).toBe(nivelMinimo);
  });
  it.each([{ codigo: '' }, { codigo: 'x'.repeat(16) }, { categoria: 'SEMILLA_PLANTIN' }, { nombre: ' ' },
    { unidadMedida: '' }, { estado: 'INACTIVO' }, { fincaId: randomUUID() }, { desconocido: true }])('valida campos y rechaza propiedades ajenas: %o', async cambios => {
    const res = await f.app.inject({ method: 'POST', url: '/api/v1/insumos', headers: f.admin, payload: { ...f.datos(), ...cambios } });
    expect(res.statusCode).toBe(400); expect(res.json().error.code).toBe('VALIDATION_ERROR');
  });
  it('valida UUID, filtros, cuerpos y recursos inexistentes', async () => {
    expect((await consultar('no-uuid')).statusCode).toBe(400);
    expect((await consultar(randomUUID())).statusCode).toBe(404);
    expect((await modificar(randomUUID())).statusCode).toBe(404);
    for (const query of ['limit=0', 'offset=-1', 'fincaId=otra', 'estado=OTRO']) {
      expect((await f.app.inject({ method: 'GET', url: `/api/v1/insumos?${query}`, headers: f.admin })).statusCode).toBe(400);
    }
    const id = await f.crear();
    expect((await f.app.inject({ method: 'PATCH', url: `/api/v1/insumos/${id}/desactivar`, headers: f.admin, payload: { estado: 'ACTIVO' } })).statusCode).toBe(400);
    expect((await f.app.inject({ method: 'PATCH', url: `/api/v1/insumos/${randomUUID()}/desactivar`, headers: f.admin })).statusCode).toBe(404);
  });
  it('exige autenticación para todas las operaciones y deniega mutaciones al encargado', async () => {
    const id = await f.crear();
    for (const headers of [undefined, f.encargado]) {
      const esperado = headers ? 403 : 401;
      expect((await f.app.inject({ method: 'POST', url: '/api/v1/insumos', headers, payload: f.datos() })).statusCode).toBe(esperado);
      expect((await f.app.inject({ method: 'PUT', url: `/api/v1/insumos/${id}`, headers, payload: f.datos() })).statusCode).toBe(esperado);
      expect((await f.app.inject({ method: 'PATCH', url: `/api/v1/insumos/${id}/desactivar`, headers })).statusCode).toBe(esperado);
    }
    for (const ruta of ['/api/v1/insumos', `/api/v1/insumos/${id}`]) {
      expect((await f.app.inject({ method: 'GET', url: ruta })).statusCode).toBe(401);
      expect((await f.app.inject({ method: 'GET', url: ruta, headers: f.sistema })).statusCode).toBe(403);
      expect((await f.app.inject({ method: 'GET', url: ruta, headers: { authorization: 'Bearer falso' } })).statusCode).toBe(401);
    }
  });
  it('revalida usuario y sesión persistidos con el mismo token', async () => {
    await f.pool.query("update usuarios set estado='INACTIVO' where id=$1", [f.encargadoId]);
    try {
      expect((await f.app.inject({ method: 'GET', url: '/api/v1/insumos', headers: f.encargado })).statusCode).toBe(403);
    } finally { await f.pool.query("update usuarios set estado='ACTIVO' where id=$1", [f.encargadoId]); }
  });
  it('sirve los endpoints por HTTP real y conserva el historial de la labor de AGRUL-054', async () => {
    const antes = (await f.pool.query('select row_to_json(t) as fila from actividades_realizadas t where id=$1', [f.actividadId])).rows;
    const datos = f.datos('CU34-HTTP');
    const alta = await fetch(`${f.direccion}/api/v1/insumos`, { method: 'POST', headers: { ...f.admin, 'content-type': 'application/json' }, body: JSON.stringify(datos) });
    expect(alta.status).toBe(201);
    const lista = await fetch(`${f.direccion}/api/v1/insumos?codigo=CU34-HTTP`, { headers: f.admin });
    expect(lista.status).toBe(200);
    expect(await lista.json()).toMatchObject({ data: [expect.objectContaining({ codigo: 'CU34-HTTP' })] });
    expect((await f.pool.query('select row_to_json(t) as fila from actividades_realizadas t where id=$1', [f.actividadId])).rows).toEqual(antes);
  });
});
