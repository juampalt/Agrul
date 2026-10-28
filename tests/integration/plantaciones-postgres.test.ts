import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { runMigrations } from '../../src/infrastructure/database/migrate.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';
import { Finca } from '../../src/core/domain/entities/finca.entity.js';
import { DrizzleFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-fincas.repository.js';

const connectionString = process.env.PLANTACIONES_TEST_DATABASE_URL;
const usuario = { sub: 'a0000000-0000-4000-8000-000000000054', email: 'admin@example.test', nombre: 'Admin', apellido: 'Prueba', fincas: [] };
const headers = { authorization: `Bearer ${CryptoAuthService.generateToken({ ...usuario, perfil: 'ADMINISTRADOR' })}` };
const inexistente = '00000000-0000-4000-8000-000000000054';
const datos = { fechaPlantacion: '2026-10-01', superficieHa: 4, cantidadInicialPlantas: 1000, procedencia: 'Vivero de prueba' };

describe.skipIf(!connectionString)('AGRUL-052 CU15-CU17 con bootstrap y PostgreSQL reales', () => {
  const connection = createDatabaseConnection(connectionString);
  let app: FastifyInstance;
  let loteId: string;
  let cultivoId: string;
  let variedadId: string;

  beforeAll(async () => {
    const { rows } = await connection.pool.query<{ nombre: string }>('select current_database() as nombre');
    if (rows[0]?.nombre !== 'agrul_test_agrul_052_etapa3') throw new Error('Esta suite solo puede modificar agrul_test_agrul_052_etapa3.');
    await runMigrations(connectionString);
    app = crearServidorProduccion({ connectionString, logger: false }).app;
    await app.ready();
  });
  beforeEach(async () => {
    for (const tabla of ['plantaciones', 'variedades', 'cultivos', 'lotes', 'fincas']) {
      // Nombres constantes, únicamente en la base descartable verificada arriba.
      await connection.pool.query(`delete from ${tabla}`);
    }
    await new DrizzleFincasRepository(connection.db).guardar(Finca.crear({ id: inexistente, nombre: 'Finca de prueba',
      provincia: 'Tucumán', departamento: 'Lules', localidad: 'San Pablo', superficieTotalHa: 100 }));
    loteId = await alta('/lotes-territorio', { codigo: 'LOT-2026-0054', nombre: 'Lote de prueba', superficieHa: 10 });
    cultivoId = await alta('/cultivos', { nombre: 'Arándano', tipoCicloVida: 'PERENNE' });
    variedadId = await alta('/variedades', { cultivoId, nombre: 'Emerald' });
  });
  afterAll(async () => { await app?.close(); await connection.pool.end(); });

  async function alta(ruta: string, payload: object) {
    const respuesta = await app.inject({ method: 'POST', url: `/api/v1${ruta}`, headers, payload });
    expect(respuesta.statusCode).toBe(201);
    return respuesta.json<{ data: { id: string } }>().data.id;
  }
  function registrar(extra: object = {}) {
    return app.inject({ method: 'POST', url: '/api/v1/plantaciones', headers,
      payload: { ...datos, loteId, cultivoId, variedadId, ...extra } });
  }
  function finalizar(id: string, fechaFinalizacion = '2026-10-27') {
    return app.inject({ method: 'PATCH', url: `/api/v1/plantaciones/${id}/finalizar`, headers, payload: { fechaFinalizacion } });
  }

  it('CU15 registra una plantación con superficie, plantas y vínculos persistidos', async () => {
    const respuesta = await registrar();
    expect(respuesta.statusCode).toBe(201);
    const id = respuesta.json().data.id;
    expect((await connection.pool.query('select * from plantaciones where id = $1', [id])).rows[0])
      .toMatchObject({ id, lote_id: loteId, cultivo_id: cultivoId, variedad_id: variedadId, superficie_ha: '4.00', cantidad_inicial_plantas: 1000, estado: 'ACTIVA', fecha_finalizacion: null });
    expect((await connection.pool.query('select estado_territorial from lotes where id = $1', [loteId])).rows[0].estado_territorial).toBe('DISPONIBLE');
  });

  it('controla la suma de superficies y revierte el alta excedida', async () => {
    expect((await registrar({ superficieHa: 6 })).statusCode).toBe(201);
    expect((await registrar({ superficieHa: 4.01 })).statusCode).toBe(422);
    expect((await registrar({ superficieHa: 4 })).statusCode).toBe(201);
    expect((await connection.pool.query('select sum(superficie_ha) as total from plantaciones')).rows[0].total).toBe('10.00');
  });

  it('serializa altas concurrentes que competirían por la misma superficie', async () => {
    const respuestas = await Promise.all([registrar({ superficieHa: 6 }), registrar({ superficieHa: 6 })]);
    expect(respuestas.map((r) => r.statusCode).sort()).toEqual([201, 422]);
    expect((await connection.pool.query('select count(*)::int as total from plantaciones')).rows[0].total).toBe(1);
  });

  it('permite ocupar exactamente 0.3 ha con 0.1 y 0.2 ha', async () => {
    const loteDecimal = await alta('/lotes-territorio', { codigo: 'LOT-2026-0055', nombre: 'Decimal', superficieHa: 0.3 });
    expect((await registrar({ loteId: loteDecimal, superficieHa: 0.1 })).statusCode).toBe(201);
    expect((await registrar({ loteId: loteDecimal, superficieHa: 0.2 })).statusCode).toBe(201);
    expect((await registrar({ loteId: loteDecimal, superficieHa: 0.01 })).statusCode).toBe(422);
  });

  it.each(['loteId', 'cultivoId', 'variedadId'])('rechaza referencia inexistente: %s', async (campo) => {
    expect((await registrar({ [campo]: inexistente })).statusCode).toBe(404);
  });

  it.each(['cultivos', 'variedades'])('RN-06 rechaza catálogo inactivo: %s', async (catalogo) => {
    const id = catalogo === 'cultivos' ? cultivoId : variedadId;
    expect((await app.inject({ method: 'PATCH', url: `/api/v1/${catalogo}/${id}/desactivar`, headers })).statusCode).toBe(200);
    expect((await registrar()).statusCode).toBe(422);
  });

  it('rechaza una variedad de otro cultivo y un lote inactivo', async () => {
    const otro = await alta('/cultivos', { nombre: 'Frambuesa', tipoCicloVida: 'PERENNE' });
    expect((await registrar({ cultivoId: otro })).statusCode).toBe(422);
    expect((await app.inject({ method: 'PATCH', url: `/api/v1/lotes-territorio/${loteId}/desactivar`, headers })).statusCode).toBe(200);
    expect((await registrar()).statusCode).toBe(422);
  });

  it('CU16 consulta por id y combina filtros de lote, cultivo, variedad y estado', async () => {
    const id = (await registrar()).json().data.id;
    const consulta = await app.inject({ method: 'GET', url: `/api/v1/plantaciones/${id}`, headers });
    expect(consulta.statusCode).toBe(200);
    expect(consulta.json()).toMatchObject({ success: true, error: null, data: { ...datos, id, loteId, cultivoId, variedadId, estado: 'ACTIVA' } });
    const url = `/api/v1/plantaciones?loteId=${loteId}&cultivoId=${cultivoId}&variedadId=${variedadId}&estado=ACTIVA&limit=1&offset=0`;
    expect((await app.inject({ method: 'GET', url, headers })).json().data).toHaveLength(1);
    expect((await app.inject({ method: 'GET', url: `${url.slice(0, -1)}1`, headers })).json().data).toEqual([]);
    expect((await app.inject({ method: 'GET', url: `/api/v1/plantaciones?loteId=${inexistente}`, headers })).json().data).toEqual([]);
  });

  it('CU17 finaliza, libera superficie y preserva el histórico tras desactivar catálogos', async () => {
    const id = (await registrar({ superficieHa: 10 })).json().data.id;
    expect((await registrar()).statusCode).toBe(422);
    const respuesta = await finalizar(id);
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().data).toMatchObject({ id, loteId, cultivoId, variedadId, superficieHa: 10, estado: 'FINALIZADA', fechaFinalizacion: '2026-10-27' });
    expect((await registrar({ superficieHa: 10 })).statusCode).toBe(201);
    for (const [ruta, catalogoId] of [['cultivos', cultivoId], ['variedades', variedadId]]) {
      expect((await app.inject({ method: 'PATCH', url: `/api/v1/${ruta}/${catalogoId}/desactivar`, headers })).statusCode).toBe(200);
    }
    const otra = crearServidorProduccion({ connectionString, logger: false }).app;
    try {
      const consulta = await otra.inject({ method: 'GET', url: `/api/v1/plantaciones/${id}`, headers });
      expect(consulta.statusCode).toBe(200);
      expect(consulta.json().data).toMatchObject({ id, cultivoId, variedadId, estado: 'FINALIZADA' });
    } finally { await otra.close(); }
  });

  it('impide reescribir una finalización y conserva su fecha original', async () => {
    const id = (await registrar()).json().data.id;
    expect((await finalizar(id, '2026-10-20')).statusCode).toBe(200);
    expect((await finalizar(id)).statusCode).toBe(422);
    expect((await app.inject({ method: 'GET', url: `/api/v1/plantaciones/${id}`, headers })).json().data.fechaFinalizacion).toBe('2026-10-20');
  });

  it('integra el control de superficie con la modificación territorial del Módulo 1', async () => {
    const id = (await registrar({ superficieHa: 8 })).json().data.id;
    const modificar = () => app.inject({ method: 'PUT', url: `/api/v1/lotes-territorio/${loteId}`, headers,
      payload: { nombre: 'Lote modificado', superficieHa: 7 } });
    expect((await modificar()).statusCode).toBe(422);
    expect((await connection.pool.query('select superficie_ha from lotes where id = $1', [loteId])).rows[0].superficie_ha).toBe('10.00');
    expect((await finalizar(id)).statusCode).toBe(200);
    expect((await modificar()).statusCode).toBe(200);
  });

  it('serializa el alta de plantación contra una reducción simultánea del lote', async () => {
    const respuestas = await Promise.all([registrar({ superficieHa: 8 }), app.inject({ method: 'PUT',
      url: `/api/v1/lotes-territorio/${loteId}`, headers, payload: { nombre: 'Reducido', superficieHa: 7 } })]);
    expect(respuestas.filter((r) => r.statusCode === 422)).toHaveLength(1);
    expect(respuestas.every((r) => [200, 201, 422].includes(r.statusCode))).toBe(true);
    const { rows } = await connection.pool.query('select superficie_ha::float8 as superficie, (select coalesce(sum(superficie_ha),0)::float8 from plantaciones where lote_id=$1 and estado=\'ACTIVA\') as ocupada from lotes where id=$1', [loteId]);
    expect(rows[0].ocupada).toBeLessThanOrEqual(rows[0].superficie);
  });

  it.each([{ superficieHa: 0 }, { superficieHa: 0.001 }, { cantidadInicialPlantas: 1.5 }, { cantidadInicialPlantas: 0 },
    { fechaPlantacion: '2026-02-30' }, { estado: 'FINALIZADA' }])('valida el cuerpo estricto: %j', async (extra) => {
    expect((await registrar(extra)).statusCode).toBe(400);
  });

  it('rechaza fechas futuras y finalizaciones anteriores sin mutar el estado', async () => {
    expect((await registrar({ fechaPlantacion: '2999-01-01' })).statusCode).toBe(422);
    const id = (await registrar()).json().data.id;
    expect((await finalizar(id, '2026-09-30')).statusCode).toBe(422);
    expect((await finalizar(id, '2999-01-01')).statusCode).toBe(422);
    expect((await app.inject({ method: 'GET', url: `/api/v1/plantaciones/${id}`, headers })).json().data.estado).toBe('ACTIVA');
  });

  it.each(['GET', 'PATCH'] as const)('devuelve 404 en %s para una plantación inexistente', async (method) => {
    const respuesta = method === 'PATCH' ? await finalizar(inexistente)
      : await app.inject({ method, url: `/api/v1/plantaciones/${inexistente}`, headers });
    expect(respuesta.statusCode).toBe(404);
  });

  it.each(['?estado=OTRO', '?loteId=no-uuid', '?limit=0', '?offset=-1', '?extra=1', '/no-uuid'])(
    'valida parámetros y query %s', async (sufijo) => {
      expect((await app.inject({ method: 'GET', url: `/api/v1/plantaciones${sufijo}`, headers })).statusCode).toBe(400);
    });

  it('exige autenticación y permisos y bloquea el borrado físico', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/plantaciones' })).statusCode).toBe(401);
    for (const perfil of ['ENCARGADO', 'ADMINISTRADOR'] as const) {
      const token = CryptoAuthService.generateToken({ ...usuario, perfil, debeCambiarPassword: perfil === 'ADMINISTRADOR' });
      expect((await app.inject({ method: 'POST', url: '/api/v1/plantaciones', payload: { ...datos, loteId, cultivoId, variedadId },
        headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(403);
    }
    const id = (await registrar()).json().data.id;
    expect((await app.inject({ method: 'DELETE', url: `/api/v1/plantaciones/${id}`, headers })).statusCode).toBe(405);
  });

  it('SQL protege relaciones históricas y rechaza pares cultivo-variedad inconsistentes', async () => {
    const id = (await registrar()).json().data.id;
    const otro = await alta('/cultivos', { nombre: 'Otro', tipoCicloVida: 'ANUAL' });
    await expect(connection.pool.query('update plantaciones set cultivo_id=$1 where id=$2', [otro, id])).rejects.toMatchObject({ code: '23503' });
    await expect(connection.pool.query('delete from variedades where id=$1', [variedadId])).rejects.toMatchObject({ code: '23001' });
    await expect(connection.pool.query('delete from lotes where id=$1', [loteId])).rejects.toMatchObject({ code: '23001' });
    await expect(connection.pool.query("update plantaciones set estado='FINALIZADA' where id=$1", [id])).rejects.toMatchObject({ code: '23514' });
  });
});
