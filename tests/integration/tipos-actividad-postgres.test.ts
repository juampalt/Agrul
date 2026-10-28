import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { runMigrations } from '../../src/infrastructure/database/migrate.js';
import { autenticarOperadorPrueba } from '../helpers/operador-postgres.fixture.js';

const connectionString = process.env.TIPOS_ACTIVIDAD_TEST_DATABASE_URL;

const usuarioAdmin = {
  sub: 'a0000000-0000-4000-8000-000000000054',
  email: 'admin.actividades@example.test',
  nombre: 'Admin',
  apellido: 'Actividades',
  fincas: [],
};

const usuarioEncargado = {
  sub: 'b0000000-0000-4000-8000-000000000054',
  email: 'encargado.actividades@example.test',
  nombre: 'Encargado',
  apellido: 'Campo',
  perfil: 'ENCARGADO_CAMPO',
  fincas: [],
};

let headersAdmin = { authorization: '' };
let headersEncargado = { authorization: '' };

describe.skipIf(!connectionString)('AGRUL-054 CU22-CU25: Tipos de Actividad Agrícola con PostgreSQL y bootstrap reales', () => {
  const connection = createDatabaseConnection(connectionString);
  let app: FastifyInstance;
  let cultivoArandanoId: string;

  beforeAll(async () => {
    const { rows } = await connection.pool.query<{ nombre: string }>('select current_database() as nombre');
    if (rows[0]?.nombre !== 'agrul_test_agrul_054_etapa1') {
      throw new Error('Esta suite solo puede modificar agrul_test_agrul_054_etapa1.');
    }
    await runMigrations(connectionString);
    app = crearServidorProduccion({ connectionString, logger: false }).app;
    await app.ready();
    headersAdmin = await autenticarOperadorPrueba(connection.pool, app, usuarioAdmin);
    headersEncargado = await autenticarOperadorPrueba(connection.pool, app, usuarioEncargado);

    await connection.pool.query('delete from tipos_actividad_cultivos');
    await connection.pool.query('delete from tipos_actividad');
    await connection.pool.query('delete from cultivos');

    // Crear un cultivo previo para pruebas de vinculación N:M
    const resCultivo = await app.inject({
      method: 'POST',
      url: '/api/v1/cultivos',
      headers: headersAdmin,
      payload: { nombre: 'Arándano Duke', tipoCicloVida: 'PERENNE', descripcion: 'Variedad Duke' },
    });
    expect(resCultivo.statusCode).toBe(201);
    cultivoArandanoId = resCultivo.json().data.id;
  });

  beforeEach(async () => {
    await connection.pool.query('delete from tipos_actividad_cultivos');
    await connection.pool.query('delete from tipos_actividad');
  });

  afterAll(async () => {
    await app?.close();
    await connection.pool.end();
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
      payload,
    });
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
    expect(data.nombre).toBe('Poda de Formación');
    expect(data.categoria).toBe('MANTENIMIENTO');
    expect(data.estado).toBe('ACTIVA');
    expect(data.cultivoIds).toEqual([cultivoArandanoId]);

    const { rows } = await connection.pool.query('select * from tipos_actividad where id = $1', [data.id]);
    expect(rows[0]).toMatchObject({
      id: data.id,
      nombre: 'Poda de Formación',
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

    const id1 = res1.json().data.id;
    const id2 = res2.json().data.id;

    // Consulta por ID
    const resConsultaId = await app.inject({
      method: 'GET',
      url: `/api/v1/tipos-actividad/${id1}`,
      headers: headersEncargado, // Encargado puede consultar
    });
    expect(resConsultaId.statusCode).toBe(200);
    expect(resConsultaId.json().data.nombre).toBe('Fertilización Foliar');

    // Listar filtrando por categoría
    const resFiltroCat = await app.inject({
      method: 'GET',
      url: '/api/v1/tipos-actividad?categoria=FERTILIZACION',
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
    expect(resFiltroCultivo.json().data).toHaveLength(1);
    expect(resFiltroCultivo.json().data[0].id).toBe(id1);
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
        nombre: 'Siembra Directa',
        categoria: 'PLANTACION',
        descripcion: 'Siembra en camellón',
        cultivoIds: [cultivoArandanoId],
      },
    });

    expect(resModif.statusCode).toBe(200);
    expect(resModif.json().data.nombre).toBe('Siembra Directa');
    expect(resModif.json().data.cultivoIds).toEqual([cultivoArandanoId]);

    const { rows } = await connection.pool.query('select nombre from tipos_actividad where id = $1', [id]);
    expect(rows[0].nombre).toBe('Siembra Directa');
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
