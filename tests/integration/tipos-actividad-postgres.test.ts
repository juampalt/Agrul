import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from '../helpers/esquema-postgres-aislado.fixture.js';
import { autenticarOperadorPrueba } from '../helpers/operador-postgres.fixture.js';

const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;
const aislado = connectionString ? await crearEsquemaPostgresAislado(connectionString) : undefined;
const urlAislada = aislado?.connectionString;
afterAll(async () => { await aislado?.cerrar(); });
const baseEsperada = connectionString ? new URL(connectionString).pathname.slice(1) : '';
if (connectionString && !['postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_054', 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055'].includes(connectionString ?? '')) {
  throw new Error('El catálogo solo admite la base descartable autorizada con el rol exclusivo y sin contraseña en URL.');
}
const marca = Buffer.from(randomUUID().replaceAll('-', ''), 'hex').toString('base64url');
const nombrePrueba = (nombre: string) => `${nombre.trim().slice(0, 17)} ${marca}`;

const usuarioAdmin = {
  sub: randomUUID(),
  email: `admin-${marca}@example.test`,
  nombre: 'Admin',
  apellido: 'Actividades',
  fincas: [],
};

const usuarioEncargado = {
  sub: randomUUID(),
  email: `encargado-${marca}@example.test`,
  nombre: 'Encargado',
  apellido: 'Campo',
  perfil: 'ENCARGADO_CAMPO',
  fincas: [],
};

let headersAdmin = { authorization: '' };
let headersEncargado = { authorization: '' };

describe.skipIf(!connectionString)('AGRUL-054 CU22-CU25: Tipos de Actividad Agrícola con PostgreSQL y bootstrap reales', () => {
  const connection = createDatabaseConnection(urlAislada);
  let app: FastifyInstance;
  let cultivoArandanoId: string;
  const tiposCreados: string[] = [];
  async function limpiarTiposPropios() {
    if (!tiposCreados.length) return;
    await connection.pool.query('delete from tipos_actividad_cultivos where tipo_actividad_id=ANY($1::uuid[])', [tiposCreados]);
    await connection.pool.query('delete from tipos_actividad where id=ANY($1::uuid[])', [tiposCreados]);
    tiposCreados.length = 0;
  }

  beforeAll(async () => {
    const { rows } = await connection.pool.query("select current_database() as db,current_user as usuario,current_setting('server_version_num')::int as version,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls from pg_roles where rolname=current_user");
    expect(rows[0]).toMatchObject({ db: baseEsperada, usuario: 'agrul_test_user', rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false });
    expect(rows[0].version).toBeGreaterThanOrEqual(180000);
    expect(rows[0].version).toBeLessThan(190000);

    app = crearServidorProduccion({ connectionString: urlAislada, logger: false }).app;
    await app.ready();
    headersAdmin = await autenticarOperadorPrueba(connection.pool, app, usuarioAdmin);
    headersEncargado = await autenticarOperadorPrueba(connection.pool, app, usuarioEncargado);

    // Crear un cultivo previo para pruebas de vinculación N:M
    const resCultivo = await app.inject({
      method: 'POST',
      url: '/api/v1/cultivos',
      headers: headersAdmin,
      payload: { nombre: nombrePrueba('Arándano Duke'), tipoCicloVida: 'PERENNE', descripcion: 'Variedad Duke' },
    });
    expect(resCultivo.statusCode).toBe(201);
    cultivoArandanoId = resCultivo.json().data.id;
  });

  beforeEach(limpiarTiposPropios);

  afterAll(async () => {
    try {
      await app?.close();
      await limpiarTiposPropios();
      if (cultivoArandanoId) await connection.pool.query('delete from cultivos where id=$1', [cultivoArandanoId]);
    } finally { await connection.pool.end(); }
  });

  async function crearTipo(payload: {
    nombre: string;
    categoria: string;
    descripcion?: string | null;
    cultivoIds?: string[];
  }) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tipos-actividad',
      headers: headersAdmin,
      payload: { ...payload, nombre: ` ${nombrePrueba(payload.nombre)} ` },
    });
    if (res.statusCode === 201) tiposCreados.push(res.json().data.id);
    return res;
  }

  it('CU22 registra, normaliza y persiste un tipo de actividad activo con cultivos asociados', async () => {
    const res = await crearTipo({
      nombre: ' Poda de Formación ',
      categoria: 'MANTENIMIENTO',
      descripcion: 'Poda invernal para ramas bajas',
      cultivoIds: [cultivoArandanoId],
    });

    expect(res.statusCode).toBe(201);
    const data = res.json().data;
    expect(data.nombre).toBe(nombrePrueba('Poda de Formación'));
    expect(data.categoria).toBe('MANTENIMIENTO');
    expect(data.estado).toBe('ACTIVA');
    expect(data.cultivoIds).toEqual([cultivoArandanoId]);

    const { rows } = await connection.pool.query('select * from tipos_actividad where id = $1', [data.id]);
    expect(rows[0]).toMatchObject({
      id: data.id,
      nombre: nombrePrueba('Poda de Formación'),
      categoria: 'MANTENIMIENTO',
      estado: 'ACTIVA',
    });

    const { rows: rowsRel } = await connection.pool.query(
      'select * from tipos_actividad_cultivos where tipo_actividad_id = $1',
      [data.id]
    );
    expect(rowsRel).toHaveLength(1);
    expect(rowsRel[0].cultivo_id).toBe(cultivoArandanoId);
  });

  it('CU22 rechaza nombres duplicados con 409 y código TIPO_ACTIVIDAD_DUPLICADO', async () => {
    await crearTipo({ nombre: 'Riego por Goteo', categoria: 'RIEGO' });
    const resDuplicado = await crearTipo({ nombre: 'Riego por Goteo', categoria: 'RIEGO' });

    expect(resDuplicado.statusCode).toBe(409);
    expect(resDuplicado.json().error.code).toBe('TIPO_ACTIVIDAD_DUPLICADO');
  });

  it('CU22 valida existencia de cultivo asociado rechazando con 404 si no existe', async () => {
    const idInexistente = '00000000-0000-4000-8000-000000000099';
    const res = await crearTipo({
      nombre: 'Deshierbe',
      categoria: 'MANTENIMIENTO',
      cultivoIds: [idInexistente],
    });

    expect(res.statusCode).toBe(404);
  });

  it('CU23 consulta por id y lista con filtros por categoria, estado y cultivoId', async () => {
    const res1 = await crearTipo({
      nombre: 'Fertilización Foliar',
      categoria: 'FERTILIZACION',
      cultivoIds: [cultivoArandanoId],
    });
    const res2 = await crearTipo({
      nombre: 'Control Fitosanitario Mosca',
      categoria: 'CONTROL_SANITARIO',
    });
    const otraCategoria = await crearTipo({ nombre: 'Riego de prueba', categoria: 'RIEGO', cultivoIds: [cultivoArandanoId] });
    expect(otraCategoria.statusCode).toBe(201);

    const id1 = res1.json().data.id;
    const id2 = res2.json().data.id;

    // Consulta por ID
    const resConsultaId = await app.inject({
      method: 'GET',
      url: `/api/v1/tipos-actividad/${id1}`,
      headers: headersEncargado, // Encargado puede consultar
    });
    expect(resConsultaId.statusCode).toBe(200);
    expect(resConsultaId.json().data.nombre).toBe(nombrePrueba('Fertilización Foliar'));

    // Listar filtrando por categoría
    const resFiltroCat = await app.inject({
      method: 'GET',
      url: `/api/v1/tipos-actividad?categoria=FERTILIZACION&cultivoId=${cultivoArandanoId}`,
      headers: headersEncargado,
    });
    expect(resFiltroCat.statusCode).toBe(200);
    expect(resFiltroCat.json().data).toHaveLength(1);
    expect(resFiltroCat.json().data[0].id).toBe(id1);

    // Listar filtrando por cultivoId
    const resFiltroCultivo = await app.inject({
      method: 'GET',
      url: `/api/v1/tipos-actividad?cultivoId=${cultivoArandanoId}`,
      headers: headersEncargado,
    });
    expect(resFiltroCultivo.statusCode).toBe(200);
    expect(resFiltroCultivo.json().data).toHaveLength(2);
    expect(resFiltroCultivo.json().data.map((tipo: { id: string }) => tipo.id)).toEqual(expect.arrayContaining([id1, otraCategoria.json().data.id]));
    expect(resFiltroCultivo.json().data.map((tipo: { id: string }) => tipo.id)).not.toContain(id2);
  });

  it('la limpieza elimina solo tipos propios y conserva los catálogos preexistentes', async () => {
    const anteriores = await connection.pool.query('select row_to_json(t) as fila from tipos_actividad t order by id');
    const creado = await crearTipo({ nombre: 'Temporal propio', categoria: 'OTRO', cultivoIds: [cultivoArandanoId] });
    expect(creado.statusCode).toBe(201);
    await limpiarTiposPropios();
    expect((await connection.pool.query('select row_to_json(t) as fila from tipos_actividad t order by id')).rows).toEqual(anteriores.rows);
    expect((await connection.pool.query('select * from tipos_actividad_cultivos where tipo_actividad_id=$1', [creado.json().data.id])).rows).toEqual([]);
  });

  it('CU24 modifica nombre, categoría y cultivos asociados', async () => {
    const resCreado = await crearTipo({
      nombre: 'Siembra en Almácigo',
      categoria: 'PLANTACION',
    });
    const id = resCreado.json().data.id;

    const resModif = await app.inject({
      method: 'PUT',
      url: `/api/v1/tipos-actividad/${id}`,
      headers: headersAdmin,
      payload: {
        nombre: nombrePrueba('Siembra Directa'),
        categoria: 'PLANTACION',
        descripcion: 'Siembra en camellón',
        cultivoIds: [cultivoArandanoId],
      },
    });

    expect(resModif.statusCode).toBe(200);
    expect(resModif.json().data.nombre).toBe(nombrePrueba('Siembra Directa'));
    expect(resModif.json().data.cultivoIds).toEqual([cultivoArandanoId]);

    const { rows } = await connection.pool.query('select nombre from tipos_actividad where id = $1', [id]);
    expect(rows[0].nombre).toBe(nombrePrueba('Siembra Directa'));
  });

  it('CU25 desactiva lógicamente el tipo de actividad (RN-26)', async () => {
    const resCreado = await crearTipo({
      nombre: 'Pase de Rastreador',
      categoria: 'PREPARACION_SUELO',
    });
    const id = resCreado.json().data.id;

    const resDesactivar = await app.inject({
      method: 'PATCH',
      url: `/api/v1/tipos-actividad/${id}/desactivar`,
      headers: headersAdmin,
    });

    expect(resDesactivar.statusCode).toBe(200);
    expect(resDesactivar.json().data.estado).toBe('INACTIVA');

    const { rows } = await connection.pool.query('select estado from tipos_actividad where id = $1', [id]);
    expect(rows[0].estado).toBe('INACTIVA');
  });

  it('exige rol ADMINISTRADOR para mutaciones rechazando a ENCARGADO con 403', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/tipos-actividad',
      headers: headersEncargado,
      payload: { nombre: 'Poda Indebida', categoria: 'MANTENIMIENTO' },
    });
    expect(res.statusCode).toBe(403);
  });
});
