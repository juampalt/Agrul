import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from '../helpers/esquema-postgres-aislado.fixture.js';
import { autenticarOperadorPrueba, emitirSesionPrueba } from '../helpers/operador-postgres.fixture.js';

const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;
const usuario = {
  sub: 'a0000000-0000-4000-8000-000000000053', email: 'admin@example.test',
  nombre: 'Admin', apellido: 'Prueba', fincas: [],
};
let headers = { authorization: '' };
const inexistente = '00000000-0000-4000-8000-000000000053';
const datos = { nombre: 'Emerald', descripcion: 'Variedad de prueba' };

describe.skipIf(!connectionString)('AGRUL-052 CU11-CU14 con bootstrap y PostgreSQL reales', () => {
  let aislado: Awaited<ReturnType<typeof crearEsquemaPostgresAislado>> | undefined;
  let connection: ReturnType<typeof createDatabaseConnection>;
  let app: FastifyInstance;
  let cultivoId: string;
  let estadoPublico: unknown;
  const snapshotPublico = async () => (await connection.pool.query(`select
    md5(coalesce((select jsonb_agg(to_jsonb(c) order by id)::text from public.cultivos c),'')) as cultivos,
    md5(coalesce((select jsonb_agg(to_jsonb(v) order by id)::text from public.variedades v),'')) as variedades`)).rows;

  beforeAll(async () => {
    if (!connectionString) throw new Error('Se requiere conexión explícita.');
    aislado = await crearEsquemaPostgresAislado(connectionString);
    connection = aislado.connection;
    estadoPublico = await snapshotPublico();
    app = crearServidorProduccion({ connectionString: aislado.connectionString, logger: false }).app;
    await app.ready();
    headers = await autenticarOperadorPrueba(connection.pool, app, usuario);
  }, 60000);
  beforeEach(async () => {
    await connection.pool.query('delete from variedades');
    await connection.pool.query('delete from cultivos');
    cultivoId = await crearCultivo('Arándano');
  });
  afterAll(async () => {
    try {
      await app?.close();
      if (aislado) expect(await snapshotPublico()).toEqual(estadoPublico);
    } finally { await aislado?.cerrar(); }
  });

  async function crearCultivo(nombre: string) {
    const respuesta = await app.inject({ method: 'POST', url: '/api/v1/cultivos', headers,
      payload: { nombre, tipoCicloVida: 'PERENNE' } });
    expect(respuesta.statusCode).toBe(201);
    return respuesta.json<{ data: { id: string } }>().data.id;
  }

  async function crear(nombre = datos.nombre, origen = cultivoId) {
    const respuesta = await app.inject({ method: 'POST', url: '/api/v1/variedades', headers,
      payload: { ...datos, nombre, cultivoId: origen } });
    expect(respuesta.statusCode).toBe(201);
    return respuesta.json<{ data: { id: string } }>().data;
  }

  it('CU11 registra una variedad activa asociada a un cultivo persistido', async () => {
    const creada = await crear(' Emerald ');
    expect((await connection.pool.query('select * from variedades where id = $1', [creada.id])).rows[0])
      .toMatchObject({ id: creada.id, cultivo_id: cultivoId, nombre: 'Emerald', estado: 'ACTIVO', descripcion: datos.descripcion });
  });

  it('devuelve 404 si el cultivo de origen no existe', async () => {
    const respuesta = await app.inject({ method: 'POST', url: '/api/v1/variedades', headers,
      payload: { ...datos, cultivoId: inexistente } });
    expect(respuesta.statusCode).toBe(404);
    expect(respuesta.json().error.code).toBe('ENTITY_NOT_FOUND');
    expect((await connection.pool.query('select count(*)::int as total from variedades')).rows[0].total).toBe(0);
  });

  it('permite el mismo nombre en diferentes cultivos', async () => {
    await crear();
    await crear(datos.nombre, await crearCultivo('Frambuesa'));
    expect((await connection.pool.query('select count(*)::int as total from variedades')).rows[0].total).toBe(2);
  });

  it('resuelve altas concurrentes duplicadas dentro de un cultivo con 201 y 409', async () => {
    const respuestas = await Promise.all([1, 2].map(() => app.inject({ method: 'POST', url: '/api/v1/variedades',
      headers, payload: { ...datos, cultivoId } })));
    expect(respuestas.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    expect(respuestas.find((r) => r.statusCode === 409)?.json().error.code).toBe('VARIEDAD_DUPLICADA');
  });

  it('CU12 consulta por id y combina filtros de cultivo, estado y paginación', async () => {
    const creada = await crear();
    await crear('Snowchaser');
    await crear('Otra', await crearCultivo('Otro cultivo'));
    const consulta = await app.inject({ method: 'GET', url: `/api/v1/variedades/${creada.id}`, headers });
    expect(consulta.statusCode).toBe(200);
    expect(consulta.json()).toMatchObject({ success: true, error: null,
      data: { ...datos, id: creada.id, cultivoId, estado: 'ACTIVO' }, timestamp: expect.any(String) });
    const lista = await app.inject({ method: 'GET', headers,
      url: `/api/v1/variedades?cultivoId=${cultivoId}&estado=ACTIVO&limit=1&offset=1` });
    expect(lista.statusCode).toBe(200);
    expect(lista.json().data).toMatchObject([{ nombre: 'Snowchaser', cultivoId }]);
  });

  it('CU13 modifica una variedad activa y rechaza modificar una inactiva o de un cultivo inactivo', async () => {
    const creada = await crear();
    const activa = await app.inject({ method: 'PUT', url: `/api/v1/variedades/${creada.id}`, headers,
      payload: { nombre: ' Snow   chaser ', descripcion: null } });
    expect(activa.statusCode).toBe(200);
    expect(activa.json().data).toEqual({ id: creada.id, cultivoId, nombre: 'Snow chaser', descripcion: null, estado: 'ACTIVO' });
    await app.inject({ method: 'PATCH', url: `/api/v1/variedades/${creada.id}/desactivar`, headers });
    const inactiva = await app.inject({ method: 'PUT', url: `/api/v1/variedades/${creada.id}`, headers,
      payload: { nombre: 'Otra', descripcion: null } });
    expect(inactiva.statusCode).toBe(422);
    expect((await connection.pool.query('select nombre, cultivo_id, estado from variedades where id = $1', [creada.id])).rows[0])
      .toEqual({ nombre: 'Snow chaser', cultivo_id: cultivoId, estado: 'INACTIVO' });
    const otra = await crear('Duke');
    await app.inject({ method: 'PATCH', url: `/api/v1/cultivos/${cultivoId}/desactivar`, headers });
    expect((await app.inject({ method: 'PUT', url: `/api/v1/variedades/${otra.id}`, headers,
      payload: { nombre: 'Duke 2', descripcion: null } })).statusCode).toBe(422);
  });

  it('CU12 busca por nombre e informa si la variedad está disponible para nuevas plantaciones', async () => {
    const activa = await crear('Emerald'); const inactiva = await crear('Duke');
    await app.inject({ method: 'PATCH', url: `/api/v1/variedades/${inactiva.id}/desactivar`, headers });
    const detalle = async (id: string) => (await app.inject({ method: 'GET', url: `/api/v1/variedades/${id}`, headers })).json().data;
    expect(await detalle(activa.id)).toMatchObject({ cultivoEstado: 'ACTIVO', disponibleParaNuevasPlantaciones: true });
    expect(await detalle(inactiva.id)).toMatchObject({ disponibleParaNuevasPlantaciones: false });
    const buscar = (await app.inject({ method: 'GET', url: `/api/v1/variedades?cultivoId=${cultivoId}&nombre=EMER`, headers })).json().data;
    expect(buscar.map((v: { id: string }) => v.id)).toEqual([activa.id]);
    await app.inject({ method: 'PATCH', url: `/api/v1/cultivos/${cultivoId}/desactivar`, headers });
    expect(await detalle(activa.id)).toMatchObject({ estado: 'ACTIVO', cultivoEstado: 'INACTIVO', disponibleParaNuevasPlantaciones: false });
  });

  it('CU11 no registra variedades en un cultivo inactivo y el nombre no distingue mayúsculas dentro del cultivo', async () => {
    await crear('Emerald');
    expect((await app.inject({ method: 'POST', url: '/api/v1/variedades', headers,
      payload: { ...datos, cultivoId, nombre: 'EMERALD' } })).statusCode).toBe(409);
    await app.inject({ method: 'PATCH', url: `/api/v1/cultivos/${cultivoId}/desactivar`, headers });
    expect((await app.inject({ method: 'POST', url: '/api/v1/variedades', headers,
      payload: { ...datos, cultivoId, nombre: 'Nueva' } })).statusCode).toBe(422);
  });

  it('rechaza renombrar a una variedad existente sin modificar el registro', async () => {
    const creada = await crear();
    await crear('Snowchaser');
    const respuesta = await app.inject({ method: 'PUT', url: `/api/v1/variedades/${creada.id}`, headers,
      payload: { ...datos, nombre: 'Snowchaser' } });
    expect(respuesta.statusCode).toBe(409);
    expect((await connection.pool.query('select nombre from variedades where id = $1', [creada.id])).rows[0].nombre).toBe(datos.nombre);
  });

  it('CU14 desactiva sin borrar y mantiene la unicidad entre inactivos', async () => {
    const creada = await crear();
    const respuesta = await app.inject({ method: 'PATCH', url: `/api/v1/variedades/${creada.id}/desactivar`, headers });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().data).toMatchObject({ ...datos, id: creada.id, cultivoId, estado: 'INACTIVO' });
    expect((await app.inject({ method: 'PATCH', url: `/api/v1/variedades/${creada.id}/desactivar`, headers })).statusCode).toBe(422);
    expect((await app.inject({ method: 'GET', url: '/api/v1/variedades?estado=ACTIVO', headers })).json().data).toEqual([]);
    expect((await app.inject({ method: 'GET', url: '/api/v1/variedades?estado=INACTIVO', headers })).json().data).toHaveLength(1);
    expect((await app.inject({ method: 'POST', url: '/api/v1/variedades', headers, payload: { ...datos, cultivoId } })).statusCode).toBe(409);
    expect((await app.inject({ method: 'DELETE', url: `/api/v1/variedades/${creada.id}`, headers })).statusCode).toBe(405);
  });

  it('RN-05 conserva el vínculo histórico al desactivar cultivo y variedad', async () => {
    const creada = await crear();
    expect((await app.inject({ method: 'PATCH', url: `/api/v1/cultivos/${cultivoId}/desactivar`, headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PATCH', url: `/api/v1/variedades/${creada.id}/desactivar`, headers })).statusCode).toBe(200);
    const { rows } = await connection.pool.query(
      'select v.cultivo_id, v.estado as variedad_estado, c.estado as cultivo_estado from variedades v join cultivos c on c.id = v.cultivo_id where v.id = $1', [creada.id]);
    expect(rows[0]).toEqual({ cultivo_id: cultivoId, variedad_estado: 'INACTIVO', cultivo_estado: 'INACTIVO' });
    const otra = crearServidorProduccion({ connectionString: aislado!.connectionString, logger: false }).app;
    try {
      const consulta = await otra.inject({ method: 'GET', url: `/api/v1/variedades/${creada.id}`, headers });
      expect(consulta.statusCode).toBe(200);
      expect(consulta.json().data).toMatchObject({ id: creada.id, cultivoId, estado: 'INACTIVO' });
    } finally { await otra.close(); }
  });

  it.each(['GET', 'PUT', 'PATCH'] as const)('devuelve 404 en %s para una variedad inexistente', async (method) => {
    const respuesta = await app.inject({ method, headers,
      url: `/api/v1/variedades/${inexistente}${method === 'PATCH' ? '/desactivar' : ''}`,
      ...(method === 'PUT' ? { payload: datos } : {}),
    });
    expect(respuesta.statusCode).toBe(404);
  });

  it.each([
    { ...datos, nombre: ' ' }, { ...datos, nombre: 'x'.repeat(41) },
    { ...datos, cultivoId: 'no-uuid' }, { ...datos, estado: 'INACTIVO' },
  ])('rechaza datos inválidos o campos no permitidos: %j', async (payload) => {
    const respuesta = await app.inject({ method: 'POST', url: '/api/v1/variedades', headers, payload: { cultivoId, ...payload } });
    expect(respuesta.statusCode).toBe(400);
    expect(respuesta.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('no permite cambiar el cultivo de origen por modificación', async () => {
    const creada = await crear();
    const respuesta = await app.inject({ method: 'PUT', url: `/api/v1/variedades/${creada.id}`, headers,
      payload: { ...datos, cultivoId: await crearCultivo('Otro cultivo') } });
    expect(respuesta.statusCode).toBe(400);
    expect((await connection.pool.query('select cultivo_id from variedades where id = $1', [creada.id])).rows[0].cultivo_id).toBe(cultivoId);
  });

  it.each(['?cultivoId=no-uuid', '?estado=OTRO', '?limit=0', '?offset=-1', '?extra=1', '/no-uuid'])(
    'valida query y parámetros %s', async (sufijo) => {
      expect((await app.inject({ method: 'GET', url: `/api/v1/variedades${sufijo}`, headers })).statusCode).toBe(400);
    });

  it('reutiliza autenticación, rol Administrador y cambio de contraseña obligatorio', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/variedades' })).statusCode).toBe(401);
    for (const perfil of ['ENCARGADO', 'ADMINISTRADOR'] as const) {
      try {
        await connection.pool.query('update usuarios set perfil=$1,debe_cambiar_password=$2 where id=$3', [perfil, perfil === 'ADMINISTRADOR', usuario.sub]);
        const token = await emitirSesionPrueba(connection.pool, { ...usuario, perfil, debeCambiarPassword: perfil === 'ADMINISTRADOR' });
        expect((await app.inject({ method: 'POST', url: '/api/v1/variedades', payload: { ...datos, cultivoId },
          headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(403);
      } finally {
        await connection.pool.query("update usuarios set perfil='ADMINISTRADOR',debe_cambiar_password=false where id=$1", [usuario.sub]);
        headers = await autenticarOperadorPrueba(connection.pool, app, usuario);
      }
    }
  });

  it('la base bloquea huérfanos, estados inválidos y borrado del cultivo referenciado', async () => {
    await crear();
    await expect(connection.pool.query('delete from cultivos where id = $1', [cultivoId])).rejects.toMatchObject({ code: expect.stringMatching(/^(23001|23503)$/) });
    expect((await connection.pool.query('select id from cultivos where id=$1', [cultivoId])).rows).toHaveLength(1);
    await expect(connection.pool.query("insert into variedades(cultivo_id, nombre) values ($1, 'Huérfana')", [inexistente]))
      .rejects.toMatchObject({ code: '23503' });
    await expect(connection.pool.query("insert into variedades(cultivo_id, nombre, estado) values ($1, 'Inválida', 'OTRO')", [cultivoId]))
      .rejects.toMatchObject({ code: '23514' });
  });
});
