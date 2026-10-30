import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../src/infrastructure/http/app.js';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from '../helpers/esquema-postgres-aislado.fixture.js';
import { autenticarOperadorPrueba } from '../helpers/operador-postgres.fixture.js';
import { DrizzleFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-fincas.repository.js';
import { DrizzleLotesTerritorialesRepository } from '../../src/infrastructure/database/repositories/drizzle-lotes-territoriales.repository.js';
import { Finca } from '../../src/core/domain/entities/finca.entity.js';
import { CicloProductivo } from '../../src/core/domain/entities/ciclo-productivo.entity.js';
import { InMemoryEventosRepository } from '../mocks/in-memory-eventos.repository.js';
import { InMemoryGenealogiaRepository } from '../mocks/in-memory-genealogia.repository.js';
import { InMemoryCiclosRepository } from '../mocks/in-memory-ciclos.repository.js';

const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;
if (connectionString && ![
  'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_054',
  'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055',
].includes(connectionString)) {
  throw new Error('Territorio solo admite la base descartable autorizada, con rol exclusivo y sin contraseña en URL.');
}
const FINCA_ID = 'f0000000-0000-4000-8000-000000000151';

describe.skipIf(!connectionString)('AGRUL-0511 con PostgreSQL real (CU01-CU06)', () => {
  let aislado: Awaited<ReturnType<typeof crearEsquemaPostgresAislado>> | undefined;
  let connection: ReturnType<typeof createDatabaseConnection>;
  let fincas: DrizzleFincasRepository;
  let lotes: DrizzleLotesTerritorialesRepository;
  const ciclos = new InMemoryCiclosRepository();
  let app: FastifyInstance;
  let estadoPublico: unknown;
  const snapshotPublico = async () => (await connection.pool.query(`select
    md5(coalesce((select jsonb_agg(to_jsonb(f) order by id)::text from public.fincas f),'')) as fincas,
    md5(coalesce((select jsonb_agg(to_jsonb(l) order by id)::text from public.lotes l),'')) as lotes`)).rows;

  beforeAll(async () => {
    if (!connectionString) throw new Error('Se requiere conexión explícita.');
    aislado = await crearEsquemaPostgresAislado(connectionString);
    connection = aislado.connection;
    fincas = new DrizzleFincasRepository(connection.db);
    lotes = new DrizzleLotesTerritorialesRepository(connection.db);
    estadoPublico = await snapshotPublico();

    app = buildApp({
      fincasRepo: fincas,
      lotesRepo: lotes,
      ciclosRepo: ciclos,
      eventosRepo: new InMemoryEventosRepository(),
      genealogiaRepo: new InMemoryGenealogiaRepository(),
      logger: false,
    });
    await app.ready();
  }, 60000);

  beforeEach(async () => {
    // Solo tablas del esquema temporal; la conexión no tiene fallback a public.
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
    try {
      await app?.close();
      if (aislado) expect(await snapshotPublico()).toEqual(estadoPublico);
    } finally { await aislado?.cerrar(); }
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
    if (!aislado) throw new Error('Falta el esquema temporal.');
    const production = crearServidorProduccion({ connectionString: aislado.connectionString, logger: false });
    try {
      await production.app.ready();
      const headers = await autenticarOperadorPrueba(connection.pool, production.app, {
        sub: randomUUID(), email: `territorio-${randomUUID()}@example.test`, nombre: 'Prueba', apellido: 'Territorio',
      });
      const response = await production.app.inject({ method: 'GET', url: '/api/v1/finca', headers });
      expect(response.statusCode).toBe(200);
      expect(response.json().data.id).toBe(FINCA_ID);
    } finally { await production.app.close(); }
  });

  it('mantiene las claves foráneas dentro del esquema propio y conserva public', async () => {
    const { rows } = await connection.pool.query(`select destino.relnamespace::regnamespace::text as esquema
      from pg_constraint c join pg_class origen on origen.oid=c.conrelid
      join pg_class destino on destino.oid=c.confrelid
      where c.contype='f' and origen.relnamespace=current_schema()::regnamespace`);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(fila => fila.esquema === aislado?.esquema)).toBe(true);
    expect(await snapshotPublico()).toEqual(estadoPublico);
  });
});
