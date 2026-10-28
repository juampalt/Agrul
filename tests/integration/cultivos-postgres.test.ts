import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { runMigrations } from '../../src/infrastructure/database/migrate.js';
import { autenticarOperadorPrueba, emitirSesionPrueba } from '../helpers/operador-postgres.fixture.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';

const connectionString = process.env.CULTIVOS_TEST_DATABASE_URL;
const datos = { nombre: 'Arándano', tipoCicloVida: 'PERENNE', descripcion: 'Cultivo de prueba' };
const usuario = {
  sub: 'a0000000-0000-4000-8000-000000000052', email: 'admin@example.test',
  nombre: 'Admin', apellido: 'Prueba', fincas: [],
};
let headers = { authorization: '' };
const inexistente = '00000000-0000-4000-8000-000000000052';

describe.skipIf(!connectionString)('AGRUL-052 CU07-CU10 con bootstrap y PostgreSQL reales', () => {
  const connection = createDatabaseConnection(connectionString);
  let app: FastifyInstance;

  beforeAll(async () => {
    const { rows } = await connection.pool.query<{ nombre: string }>('select current_database() as nombre');
    if (rows[0]?.nombre !== 'agrul_test_agrul_052_etapa1') {
      throw new Error('Esta suite solo puede modificar agrul_test_agrul_052_etapa1.');
    }
    await runMigrations(connectionString);
    app = crearServidorProduccion({ connectionString, logger: false }).app;
    await app.ready();
    headers = await autenticarOperadorPrueba(connection.pool, app, usuario);
  });

  beforeEach(async () => { await connection.pool.query('delete from cultivos'); });
  afterAll(async () => { await app?.close(); await connection.pool.end(); });

  async function crear(nombre = datos.nombre) {
    const response = await app.inject({ method: 'POST', url: '/api/v1/cultivos', headers, payload: { ...datos, nombre } });
    expect(response.statusCode).toBe(201);
    return response.json().data as { id: string; nombre: string };
  }

  it('CU07 registra, normaliza y persiste un cultivo activo', async () => {
    const creado = await crear(' Arándano ');
    const { rows } = await connection.pool.query('select * from cultivos where id = $1', [creado.id]);
    expect(rows[0]).toMatchObject({ id: creado.id, nombre: 'Arándano', tipo_ciclo_vida: 'PERENNE', estado: 'ACTIVO' });
  });

  it('resuelve altas concurrentes del mismo nombre con 201 y 409', async () => {
    const respuestas = await Promise.all([1, 2].map(() => app.inject({
      method: 'POST', url: '/api/v1/cultivos', headers, payload: datos,
    })));
    expect(respuestas.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    expect(respuestas.find((r) => r.statusCode === 409)?.json().error.code).toBe('CULTIVO_DUPLICADO');
    expect((await connection.pool.query('select count(*)::int as total from cultivos')).rows[0].total).toBe(1);
  });

  it('CU08 consulta por id y lista con filtros y paginación', async () => {
    const creado = await crear();
    await crear('Maíz');
    const consulta = await app.inject({ method: 'GET', url: `/api/v1/cultivos/${creado.id}`, headers });
    expect(consulta.statusCode).toBe(200);
    expect(consulta.json()).toMatchObject({ success: true, error: null, data: { ...datos, id: creado.id, estado: 'ACTIVO' } });
    expect(consulta.json().timestamp).toEqual(expect.any(String));
    const lista = await app.inject({ method: 'GET', url: '/api/v1/cultivos?estado=ACTIVO&limit=1&offset=1', headers });
    expect(lista.statusCode).toBe(200);
    expect(lista.json().data).toMatchObject([{ nombre: 'Maíz' }]);
  });

  it('CU09 modifica datos sin cambiar identidad ni reactivar un inactivo', async () => {
    const creado = await crear();
    await app.inject({ method: 'PATCH', url: `/api/v1/cultivos/${creado.id}/desactivar`, headers });
    const respuesta = await app.inject({ method: 'PUT', url: `/api/v1/cultivos/${creado.id}`, headers,
      payload: { nombre: 'Maíz', tipoCicloVida: 'ANUAL', descripcion: null } });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().data).toEqual({ id: creado.id, nombre: 'Maíz', tipoCicloVida: 'ANUAL', descripcion: null, estado: 'INACTIVO' });
    expect((await connection.pool.query('select nombre, estado from cultivos where id = $1', [creado.id])).rows[0])
      .toEqual({ nombre: 'Maíz', estado: 'INACTIVO' });
  });

  it('rechaza renombrar a un nombre ocupado sin alterar los datos', async () => {
    const creado = await crear();
    await crear('Maíz');
    const respuesta = await app.inject({ method: 'PUT', url: `/api/v1/cultivos/${creado.id}`, headers,
      payload: { ...datos, nombre: 'Maíz' } });
    expect(respuesta.statusCode).toBe(409);
    expect((await connection.pool.query('select nombre from cultivos where id = $1', [creado.id])).rows[0].nombre).toBe(datos.nombre);
  });

  it('CU10 desactiva sin borrar, permite consultar el histórico y conserva la unicidad', async () => {
    const creado = await crear();
    for (const intento of [1, 2]) {
      const respuesta = await app.inject({ method: 'PATCH', url: `/api/v1/cultivos/${creado.id}/desactivar`, headers });
      expect(respuesta.statusCode, `desactivación ${intento}`).toBe(200);
      expect(respuesta.json().data).toMatchObject({ ...datos, id: creado.id, estado: 'INACTIVO' });
    }
    expect((await app.inject({ method: 'GET', url: '/api/v1/cultivos?estado=ACTIVO', headers })).json().data).toEqual([]);
    expect((await app.inject({ method: 'GET', url: '/api/v1/cultivos?estado=INACTIVO', headers })).json().data).toHaveLength(1);
    expect((await app.inject({ method: 'POST', url: '/api/v1/cultivos', headers, payload: datos })).statusCode).toBe(409);
    expect((await app.inject({ method: 'DELETE', url: `/api/v1/cultivos/${creado.id}`, headers })).statusCode).toBe(405);
    expect((await connection.pool.query('select estado from cultivos where id = $1', [creado.id])).rows[0].estado).toBe('INACTIVO');
  });

  it('recupera los datos desde otra instancia del servidor real', async () => {
    const creado = await crear();
    const otra = crearServidorProduccion({ connectionString, logger: false }).app;
    try {
      const respuesta = await otra.inject({ method: 'GET', url: `/api/v1/cultivos/${creado.id}`, headers });
      expect(respuesta.statusCode).toBe(200);
      expect(respuesta.json().data.nombre).toBe(datos.nombre);
    } finally { await otra.close(); }
  });

  it.each(['GET', 'PUT', 'PATCH'] as const)('devuelve 404 para cultivo inexistente en %s', async (method) => {
    const respuesta = await app.inject({ method, headers,
      url: `/api/v1/cultivos/${inexistente}${method === 'PATCH' ? '/desactivar' : ''}`,
      ...(method === 'PUT' ? { payload: datos } : {}),
    });
    expect(respuesta.statusCode).toBe(404);
    expect(respuesta.json().error.code).toBe('ENTITY_NOT_FOUND');
  });

  it.each([
    { ...datos, nombre: ' ' }, { ...datos, nombre: 'x'.repeat(41) },
    { ...datos, tipoCicloVida: 'OTRO' }, { ...datos, estado: 'INACTIVO' },
  ])('rechaza datos inválidos o campos no permitidos: %j', async (payload) => {
    const respuesta = await app.inject({ method: 'POST', url: '/api/v1/cultivos', headers, payload });
    expect(respuesta.statusCode).toBe(400);
    expect(respuesta.json()).toMatchObject({ success: false, data: null, error: { code: 'VALIDATION_ERROR' } });
  });

  it.each(['?estado=OTRO', '?limit=0', '?offset=-1', '?extra=1', '/no-uuid'])(
    'valida query y parámetros %s', async (sufijo) => {
      expect((await app.inject({ method: 'GET', url: `/api/v1/cultivos${sufijo}`, headers })).statusCode).toBe(400);
    });

  it('exige autenticación, rol Administrador y cambio de contraseña inicial', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/cultivos' })).statusCode).toBe(401);
    for (const perfil of ['ENCARGADO', 'ADMINISTRADOR'] as const) {
      const token = await emitirSesionPrueba(connection.pool, { ...usuario, perfil, debeCambiarPassword: perfil === 'ADMINISTRADOR' });
      const respuesta = await app.inject({ method: 'POST', url: '/api/v1/cultivos', payload: datos,
        headers: { authorization: `Bearer ${token}` } });
      expect(respuesta.statusCode).toBe(403);
    }
    expect((await connection.pool.query('select count(*)::int as total from cultivos')).rows[0].total).toBe(0);
  });

  it('PostgreSQL rechaza estados y tipos inválidos incluso sin pasar por HTTP', async () => {
    await expect(connection.pool.query("insert into cultivos(nombre, tipo_ciclo_vida) values ('Inválido', 'OTRO')"))
      .rejects.toMatchObject({ code: '23514' });
    await expect(connection.pool.query("insert into cultivos(nombre, tipo_ciclo_vida, estado) values ('Inválido', 'ANUAL', 'OTRO')"))
      .rejects.toMatchObject({ code: '23514' });
  });
});
