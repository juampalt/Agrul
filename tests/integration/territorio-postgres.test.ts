import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { DrizzleFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-fincas.repository.js';
import { DrizzleLotesTerritorialesRepository } from '../../src/infrastructure/database/repositories/drizzle-lotes-territoriales.repository.js';
import { Finca } from '../../src/core/domain/entities/finca.entity.js';
import { CicloProductivo } from '../../src/core/domain/entities/ciclo-productivo.entity.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryCiclosRepository } from '../mocks/in-memory-ciclos.repository.js';

const connectionString = process.env.TEST_DATABASE_URL;
const FINCA_ID = 'f0000000-0000-4000-8000-000000000151';

describe.skipIf(!connectionString)('AGRUL-0511 con PostgreSQL real (CU01-CU06)', () => {
  const connection = createDatabaseConnection(connectionString);
  const fincas = new DrizzleFincasRepository(connection.db);
  const lotes = new DrizzleLotesTerritorialesRepository(connection.db);
  const ciclos = new InMemoryCiclosRepository();
  let app: FastifyInstance;

  beforeAll(async () => {
    const { rows } = await connection.pool.query<{ current_database: string }>('select current_database()');
    expect(rows[0]?.current_database).toBe('agrul_test_agrul_0511');

    app = buildApp({
      fincasRepo: fincas,
      lotesRepo: lotes,
      ciclosRepo: ciclos,
      eventosRepo: new InMemoryEventosRepository(),
      genealogiaRepo: new InMemoryGenealogiaRepository(),
      logger: false,
    });
    await app.ready();
  });

  beforeEach(async () => {
    await connection.pool.query('delete from lotes');
    await connection.pool.query('delete from fincas');
    await fincas.guardar(Finca.crear({
      id: FINCA_ID,
      nombre: 'Finca PostgreSQL AGRUL-0511',
      provincia: 'Tucumán',
      departamento: 'Lules',
      localidad: 'San Pablo',
      superficieTotalHa: 100,
      propietario: 'Productor de prueba',
    }));
  });

  afterAll(async () => {
    await app?.close();
    await connection.pool.end();
  });

  async function registrar(codigo: string, nombre: string, superficieHa: number, estado = 'DISPONIBLE') {
    return app.inject({
      method: 'POST',
      url: '/api/v1/lotes-territorio',
      payload: { codigo, nombre, superficieHa, ubicacionSector: 'Norte', estado },
    });
  }

  it('CU01 consulta la finca persistida', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/finca' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toMatchObject({ id: FINCA_ID, superficieTotalHa: 100 });
  });

  it('CU02 modifica la finca y conserva la validación de superficie', async () => {
    expect((await registrar('LOT-2026-15101', 'Lote Norte', 40)).statusCode).toBe(201);
    const invalida = await app.inject({
      method: 'PUT', url: '/api/v1/finca',
      payload: { nombre: 'Finca PostgreSQL AGRUL-0511', provincia: 'Tucumán', departamento: 'Lules', localidad: 'San Pablo', superficieTotalHa: 30 },
    });
    expect(invalida.statusCode).toBe(422);

    const valida = await app.inject({
      method: 'PUT', url: '/api/v1/finca',
      payload: { nombre: 'Finca PostgreSQL Actualizada', provincia: 'Tucumán', departamento: 'Lules', localidad: 'San Pablo', superficieTotalHa: 80 },
    });
    expect(valida.statusCode).toBe(200);
    const persisted = await connection.pool.query('select nombre, superficie_total_ha from fincas where id = $1', [FINCA_ID]);
    expect(persisted.rows[0]).toMatchObject({ nombre: 'Finca PostgreSQL Actualizada', superficie_total_ha: '80.00' });
  });

  it('CU03 registra un lote y rechaza código repetido y exceso de superficie', async () => {
    expect((await registrar('LOT-2026-15102', 'Lote A', 60)).statusCode).toBe(201);
    expect((await registrar('LOT-2026-15102', 'Duplicado', 10)).statusCode).toBe(409);
    expect((await registrar('LOT-2026-15103', 'Lote B', 41)).statusCode).toBe(422);
    const persisted = await connection.pool.query('select count(*)::int as total from lotes where codigo_lote = $1', ['LOT-2026-15102']);
    expect(persisted.rows[0].total).toBe(1);
  });

  it('CU04 combina filtros territoriales', async () => {
    await registrar('LOT-2026-15104', 'Norte Productivo', 10, 'EN_PRODUCCION');
    await registrar('LOT-2026-15105', 'Sur Disponible', 10);
    const response = await app.inject({
      method: 'GET', url: '/api/v1/lotes-territorio?codigo=15104&nombre=Norte&sector=Norte&estado=EN_PRODUCCION',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data).toHaveLength(1);
    expect(response.json().data[0].codigoLote).toBe('LOT-2026-15104');
  });

  it('CU05 modifica el lote conservando código y finca', async () => {
    const created = (await registrar('LOT-2026-15106', 'Original', 20)).json().data;
    const response = await app.inject({
      method: 'PUT', url: `/api/v1/lotes-territorio/${created.id}`,
      payload: { nombre: 'Modificado', superficieHa: 25, ubicacionSector: 'Oeste', tipoSuelo: 'Franco' },
    });
    expect(response.statusCode).toBe(200);
    const persisted = await connection.pool.query('select codigo_lote, finca_id, nombre_territorial, superficie_ha from lotes where id = $1', [created.id]);
    expect(persisted.rows[0]).toMatchObject({ codigo_lote: 'LOT-2026-15106', finca_id: FINCA_ID, nombre_territorial: 'Modificado', superficie_ha: '25.00' });
  });

  it('CU06 desactiva solo lotes disponibles sin ciclos abiertos', async () => {
    const available = (await registrar('LOT-2026-15107', 'Disponible', 30)).json().data;
    const deactivated = await app.inject({ method: 'PATCH', url: `/api/v1/lotes-territorio/${available.id}/desactivar` });
    expect(deactivated.statusCode).toBe(200);
    expect(deactivated.json().data.estadoTerritorial).toBe('INACTIVO');

    const withCycle = (await registrar('LOT-2026-15108', 'Con ciclo', 30)).json().data;
    await ciclos.guardar(CicloProductivo.crear({
      id: 'c0000000-0000-4000-8000-000000000151', codigoCiclo: 'CICLO-2026-0151',
      loteId: withCycle.id, cultivo: 'Arándano', superficieCultivadaHa: 10,
      fechaInicio: '2026-10-27', estado: 'ABIERTO',
    }));
    const blocked = await app.inject({ method: 'PATCH', url: `/api/v1/lotes-territorio/${withCycle.id}/desactivar` });
    expect(blocked.statusCode).toBe(422);
    const persisted = await connection.pool.query('select estado_territorial from lotes where id = $1', [withCycle.id]);
    expect(persisted.rows[0].estado_territorial).toBe('DISPONIBLE');
  });

  it('el bootstrap real usa los repositorios Drizzle sobre la base de prueba', async () => {
    const production = crearServidorProduccion({ connectionString, logger: false });
    await production.app.ready();
    const response = await production.app.inject({ method: 'GET', url: '/api/v1/finca' });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.id).toBe(FINCA_ID);
    await production.app.close();
  });
});
