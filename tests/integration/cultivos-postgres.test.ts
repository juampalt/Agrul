import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from '../helpers/esquema-postgres-aislado.fixture.js';
import { autenticarOperadorPrueba, emitirSesionPrueba } from '../helpers/operador-postgres.fixture.js';

const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;
const datos = { nombre: 'Arándano', tipoCicloVida: 'PERENNE', descripcion: 'Cultivo de prueba' };
const usuario = {
  sub: 'a0000000-0000-4000-8000-000000000052', email: 'admin@example.test',
  nombre: 'Admin', apellido: 'Prueba', fincas: [],
};
let headers = { authorization: '' };
const inexistente = '00000000-0000-4000-8000-000000000052';

describe.skipIf(!connectionString)('AGRUL-052 CU07-CU10 con bootstrap y PostgreSQL reales', () => {
  let aislado: Awaited<ReturnType<typeof crearEsquemaPostgresAislado>> | undefined;
  let connection: ReturnType<typeof createDatabaseConnection>;
  let app: FastifyInstance;
  let estadoPublico: unknown;
  const snapshotPublico = async () => (await connection.pool.query("select md5(coalesce(jsonb_agg(to_jsonb(c) order by id)::text,'')) as cultivos from public.cultivos c")).rows;

  beforeAll(async () => {
    if (!connectionString) throw new Error('Se requiere conexión explícita.');
    aislado = await crearEsquemaPostgresAislado(connectionString);
    connection = aislado.connection;
    estadoPublico = await snapshotPublico();
    app = crearServidorProduccion({ connectionString: aislado.connectionString, logger: false }).app;
    await app.ready();
    headers = await autenticarOperadorPrueba(connection.pool, app, usuario);
  }, 60000);

  beforeEach(async () => { await connection.pool.query('delete from variedades'); await connection.pool.query('delete from cultivos'); });
  afterAll(async () => {
    try {
      await app?.close();
      if (aislado) expect(await snapshotPublico()).toEqual(estadoPublico);
    } finally { await aislado?.cerrar(); }
  });

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

  it('CU09 modifica un cultivo activo conservando su identidad y rechaza modificar uno inactivo', async () => {
    const creado = await crear();
    const activo = await app.inject({ method: 'PUT', url: `/api/v1/cultivos/${creado.id}`, headers,
      payload: { nombre: '  Maíz   dulce ', tipoCicloVida: 'ANUAL', descripcion: null } });
    expect(activo.statusCode).toBe(200);
    expect(activo.json().data).toEqual({ id: creado.id, nombre: 'Maíz dulce', tipoCicloVida: 'ANUAL', descripcion: null, estado: 'ACTIVO' });
    await app.inject({ method: 'PATCH', url: `/api/v1/cultivos/${creado.id}/desactivar`, headers });
    const inactivo = await app.inject({ method: 'PUT', url: `/api/v1/cultivos/${creado.id}`, headers,
      payload: { nombre: 'Otro', tipoCicloVida: 'ANUAL', descripcion: null } });
    expect(inactivo.statusCode).toBe(422);
    expect((await connection.pool.query('select nombre, estado from cultivos where id = $1', [creado.id])).rows[0])
      .toEqual({ nombre: 'Maíz dulce', estado: 'INACTIVO' });
  });

  it('el nombre es único sin distinguir mayúsculas ni espacios sobrantes, incluso entre inactivos (CU07/CU09)', async () => {
    const creado = await crear('Frutilla');
    for (const nombre of ['frutilla', 'FRUTILLA', ' Frutilla ']) {
      expect((await app.inject({ method: 'POST', url: '/api/v1/cultivos', headers, payload: { ...datos, nombre } })).statusCode, nombre).toBe(409);
    }
    await app.inject({ method: 'PATCH', url: `/api/v1/cultivos/${creado.id}/desactivar`, headers });
    expect((await app.inject({ method: 'POST', url: '/api/v1/cultivos', headers, payload: { ...datos, nombre: 'fRuTiLlA' } })).statusCode).toBe(409);
  });

  it('conserva responsable, fecha y valores anteriores/nuevos de cada cambio (CU07, CU09, CU10)', async () => {
    const creado = await crear('Frutilla');
    await app.inject({ method: 'PUT', url: `/api/v1/cultivos/${creado.id}`, headers,
      payload: { nombre: 'Frutilla Albion', tipoCicloVida: 'ANUAL', descripcion: null } });
    await app.inject({ method: 'PATCH', url: `/api/v1/cultivos/${creado.id}/desactivar`, headers });
    const { rows } = await connection.pool.query(
      "select accion, usuario_id, valor_previo, valor_nuevo, creado_en from registro_cambios where entidad='CULTIVO' and entidad_id=$1 order by creado_en, id", [creado.id]);
    expect(rows.map(r => r.accion).sort()).toEqual(['DESACTIVAR', 'MODIFICAR', 'REGISTRAR']);
    expect(rows.every(r => r.usuario_id === usuario.sub && r.creado_en instanceof Date)).toBe(true);
    const modificar = rows.find(r => r.accion === 'MODIFICAR');
    expect(modificar.valor_previo).toMatchObject({ nombre: 'Frutilla', estado: 'ACTIVO' });
    expect(modificar.valor_nuevo).toMatchObject({ nombre: 'Frutilla Albion', estado: 'ACTIVO' });
    const desactivar = rows.find(r => r.accion === 'DESACTIVAR');
    expect(desactivar.valor_previo).toMatchObject({ estado: 'ACTIVO' });
    expect(desactivar.valor_nuevo).toMatchObject({ estado: 'INACTIVO' });
    expect(rows.find(r => r.accion === 'REGISTRAR').valor_previo).toBeNull();
    await expect(connection.pool.query("update registro_cambios set accion='X' where entidad_id=$1", [creado.id])).rejects.toThrow('VIOLACION_DE_INMUTABILIDAD');
  });

  it('CU08 busca por nombre, filtra por tipo y muestra las variedades asociadas con su estado', async () => {
    const arandano = await crear('Arándano Gigante');
    const frutilla = (await app.inject({ method: 'POST', url: '/api/v1/cultivos', headers, payload: { nombre: 'Frutilla', tipoCicloVida: 'ANUAL', descripcion: null } })).json().data;
    await app.inject({ method: 'POST', url: '/api/v1/variedades', headers, payload: { cultivoId: arandano.id, nombre: 'Emerald' } });
    const inactiva = (await app.inject({ method: 'POST', url: '/api/v1/variedades', headers, payload: { cultivoId: arandano.id, nombre: 'Duke' } })).json().data;
    await app.inject({ method: 'PATCH', url: `/api/v1/variedades/${inactiva.id}/desactivar`, headers });
    const nombres = async (q: string) => (await app.inject({ method: 'GET', url: `/api/v1/cultivos?${q}`, headers })).json().data.map((c: { nombre: string }) => c.nombre);
    expect(await nombres('nombre=GIGANTE')).toEqual(['Arándano Gigante']);
    expect(await nombres('tipoCicloVida=ANUAL')).toEqual(['Frutilla']);
    expect(await nombres('nombre=frut&tipoCicloVida=PERENNE')).toEqual([]);
    const detalle = (await app.inject({ method: 'GET', url: `/api/v1/cultivos/${arandano.id}`, headers })).json().data;
    expect(detalle.variedades).toEqual([
      expect.objectContaining({ nombre: 'Duke', estado: 'INACTIVO' }), expect.objectContaining({ nombre: 'Emerald', estado: 'ACTIVO' })]);
    expect((await app.inject({ method: 'GET', url: `/api/v1/cultivos/${frutilla.id}`, headers })).json().data.variedades).toEqual([]);
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
    const respuesta = await app.inject({ method: 'PATCH', url: `/api/v1/cultivos/${creado.id}/desactivar`, headers });
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().data).toMatchObject({ ...datos, id: creado.id, estado: 'INACTIVO' });
    // Una segunda desactivación se informa como operación inválida y no altera el registro.
    expect((await app.inject({ method: 'PATCH', url: `/api/v1/cultivos/${creado.id}/desactivar`, headers })).statusCode).toBe(422);
    expect((await app.inject({ method: 'GET', url: '/api/v1/cultivos?estado=ACTIVO', headers })).json().data).toEqual([]);
    expect((await app.inject({ method: 'GET', url: '/api/v1/cultivos?estado=INACTIVO', headers })).json().data).toHaveLength(1);
    expect((await app.inject({ method: 'POST', url: '/api/v1/cultivos', headers, payload: datos })).statusCode).toBe(409);
    expect((await app.inject({ method: 'DELETE', url: `/api/v1/cultivos/${creado.id}`, headers })).statusCode).toBe(405);
    expect((await connection.pool.query('select estado from cultivos where id = $1', [creado.id])).rows[0].estado).toBe('INACTIVO');
  });

  it('recupera los datos desde otra instancia del servidor real', async () => {
    const creado = await crear();
    const otra = crearServidorProduccion({ connectionString: aislado!.connectionString, logger: false }).app;
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
      try {
        await connection.pool.query('update usuarios set perfil=$1,debe_cambiar_password=$2 where id=$3', [perfil, perfil === 'ADMINISTRADOR', usuario.sub]);
        const token = await emitirSesionPrueba(connection.pool, { ...usuario, perfil, debeCambiarPassword: perfil === 'ADMINISTRADOR' });
        const respuesta = await app.inject({ method: 'POST', url: '/api/v1/cultivos', payload: datos,
          headers: { authorization: `Bearer ${token}` } });
        expect(respuesta.statusCode).toBe(403);
      } finally {
        await connection.pool.query("update usuarios set perfil='ADMINISTRADOR',debe_cambiar_password=false where id=$1", [usuario.sub]);
        headers = await autenticarOperadorPrueba(connection.pool, app, usuario);
      }
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
