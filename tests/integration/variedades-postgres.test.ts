import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { runMigrations } from '../../src/infrastructure/database/migrate.js';
import { autenticarOperadorPrueba, emitirSesionPrueba } from '../helpers/operador-postgres.fixture.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';

const connectionString = process.env.VARIEDADES_TEST_DATABASE_URL;
const usuario = {
  sub: 'a0000000-0000-4000-8000-000000000053', email: 'admin@example.test',
  nombre: 'Admin', apellido: 'Prueba', fincas: [],
};
let headers = { authorization: '' };
const inexistente = '00000000-0000-4000-8000-000000000053';
const datos = { nombre: 'Emerald', descripcion: 'Variedad de prueba' };

describe.skipIf(!connectionString)('AGRUL-052 CU11-CU14 con bootstrap y PostgreSQL reales', () => {
  const connection = createDatabaseConnection(connectionString);
  let app: FastifyInstance;
  let cultivoId: string;

  beforeAll(async () => {
    const { rows } = await connection.pool.query<{ nombre: string }>('select current_database() as nombre');
    if (rows[0]?.nombre !== 'agrul_test_agrul_052_etapa2') {
      throw new Error('Esta suite solo puede modificar agrul_test_agrul_052_etapa2.');
    }
    await runMigrations(connectionString);
    app = crearServidorProduccion({ connectionString, logger: false }).app;
    await app.ready();
    headers = await autenticarOperadorPrueba(connection.pool, app, usuario);
  });
  beforeEach(async () => {
    await connection.pool.query('delete from variedades');
    await connection.pool.query('delete from cultivos');
    cultivoId = await crearCultivo('Arándano');
  });
  afterAll(async () => { await app?.close(); await connection.pool.end(); });

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

  it('CU13 modifica datos sin cambiar identidad, cultivo ni estado inactivo', async () => {
    const creada = await crear();
    await app.inject({ method: 'PATCH', url: `/api/v1/variedades/${creada.id}/desactivar`, headers });
    const respuesta = await app.inject({ method: 'PUT', url: `/api/v1/variedades/${creada.id}`, headers,
      payload: { nombre: 'Snowchaser', descripcion: null } });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().data).toEqual({ id: creada.id, cultivoId, nombre: 'Snowchaser', descripcion: null, estado: 'INACTIVO' });
    expect((await connection.pool.query('select nombre, cultivo_id, estado from variedades where id = $1', [creada.id])).rows[0])
      .toEqual({ nombre: 'Snowchaser', cultivo_id: cultivoId, estado: 'INACTIVO' });
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
    for (const intento of [1, 2]) {
      const respuesta = await app.inject({ method: 'PATCH', url: `/api/v1/variedades/${creada.id}/desactivar`, headers });
      expect(respuesta.statusCode, `desactivación ${intento}`).toBe(200);
      expect(respuesta.json().data).toMatchObject({ ...datos, id: creada.id, cultivoId, estado: 'INACTIVO' });
    }
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
    const otra = crearServidorProduccion({ connectionString, logger: false }).app;
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
      const token = await emitirSesionPrueba(connection.pool, { ...usuario, perfil, debeCambiarPassword: perfil === 'ADMINISTRADOR' });
      expect((await app.inject({ method: 'POST', url: '/api/v1/variedades', payload: { ...datos, cultivoId },
        headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(403);
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
