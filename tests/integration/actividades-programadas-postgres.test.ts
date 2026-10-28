import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { runMigrations } from '../../src/infrastructure/database/migrate.js';
import { DrizzleUsuarioFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-usuario-fincas.repository.js';
import { DrizzleActividadesProgramadasRepository } from '../../src/infrastructure/database/repositories/drizzle-actividades-programadas.repository.js';
import { EstadoActividadInvalidoError } from '../../src/core/domain/entities/actividad-programada.entity.js';
import { CicloConActividadesPendientesError } from '../../src/application/use-cases/verificar-cierre-ciclo.use-case.js';
import { autenticarOperadorPrueba } from '../helpers/operador-postgres.fixture.js';
import { sembrarCiclosRn09 } from '../helpers/sembrar-ciclos-rn09.js';

const url = process.env.ACTIVIDADES_TEST_DATABASE_URL;
const CICLO = 'c0000000-0000-4000-8000-000000000054';
const OTRO = 'c0000000-0000-4000-8000-000000000055';
const ADMIN = 'a0000000-0000-4000-8000-000000000054';
const ENCARGADO = 'b0000000-0000-4000-8000-000000000054';
const LECTOR = 'd0000000-0000-4000-8000-000000000054';

describe.skipIf(!url)('AGRUL-054 CU26–CU29 PostgreSQL real', () => {
  const connection = createDatabaseConnection(url);
  const repo = new DrizzleActividadesProgramadasRepository(connection.db);
  let servidor: ReturnType<typeof crearServidorProduccion>;
  let admin: { authorization: string };
  let encargado: { authorization: string };
  let lector: { authorization: string };
  let tipoId: string;
  const ruta = '/api/v1/actividades-programadas';
  const datos = () => ({ cicloId: CICLO, tipoActividadId: tipoId, responsableId: ENCARGADO, fechaProgramada: '2026-11-15' });
  const crear = () => servidor.app.inject({ method: 'POST', url: ruta, headers: encargado, payload: datos() });

  beforeAll(async () => {
    if (!url) throw new Error('Falta conexión explícita.');
    const target = new URL(url);
    if (target.hostname !== '127.0.0.1' || target.port !== '5432' || target.pathname !== '/agrul_test_agrul_054' || target.username !== 'agrul_test_user' || target.password || target.search) {
      throw new Error('Solo se admite el rol y la base descartable autorizados, sin contraseña ni parámetros en URL.');
    }
    const { rows } = await connection.pool.query("select current_database() as db, current_user as usuario, current_setting('server_version_num')::int as version, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls from pg_roles where rolname=current_user");
    expect(rows[0]).toMatchObject({ db: 'agrul_test_agrul_054', usuario: 'agrul_test_user', rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false });
    expect(rows[0].version).toBeGreaterThanOrEqual(180000);
    expect(rows[0].version).toBeLessThan(190000);
    await runMigrations(url);
    await sembrarCiclosRn09(connection.pool, [CICLO, OTRO]);
    servidor = crearServidorProduccion({ connectionString: url, logger: false });
    await servidor.app.ready();
    const actor = { nombre: 'Prueba', apellido: 'Actividades' };
    admin = await autenticarOperadorPrueba(connection.pool, servidor.app, { ...actor, sub: ADMIN, email: 'admin054@example.test' });
    encargado = await autenticarOperadorPrueba(connection.pool, servidor.app, { ...actor, sub: ENCARGADO, email: 'encargado054@example.test', perfil: 'ENCARGADO_CAMPO' });
    lector = await autenticarOperadorPrueba(connection.pool, servidor.app, { ...actor, sub: LECTOR, email: 'lector054@example.test', perfil: 'OPERARIO' });
    await new DrizzleUsuarioFincasRepository(connection.db).asignarFincas(ENCARGADO, ['f0000000-0000-4000-8000-000000000059']);
    const tipo = await servidor.app.inject({ method: 'POST', url: '/api/v1/tipos-actividad', headers: admin, payload: { nombre: `Riego ${randomUUID().slice(0, 8)}`, categoria: 'RIEGO' } });
    expect(tipo.statusCode).toBe(201);
    tipoId = tipo.json().data.id;
  }, 30000);

  beforeEach(async () => {
    await connection.pool.query('delete from actividades_programadas where ciclo_id = ANY($1::uuid[])', [[CICLO, OTRO]]);
  });
  afterAll(async () => { await servidor?.app.close(); await connection.pool.end(); });

  it('CU26 programa y persiste sin superficie opcional', async () => {
    const res = await crear();
    expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ ...datos(), estado: 'PENDIENTE', superficiePrevista: null });
    const { rows } = await connection.pool.query('select estado, superficie_prevista from actividades_programadas where id=$1', [res.json().data.id]);
    expect(rows[0]).toEqual({ estado: 'PENDIENTE', superficie_prevista: null });
  });

  it('CU27 consulta detalle y filtra por ciclo, tipo, responsable, estado y fechas', async () => {
    const id = (await crear()).json().data.id;
    const detalle = await servidor.app.inject({ method: 'GET', url: `${ruta}/${id}`, headers: encargado });
    expect(detalle.statusCode).toBe(200);
    expect(detalle.json().data.id).toBe(id);
    const listado = await servidor.app.inject({ method: 'GET', url: `${ruta}?cicloId=${CICLO}&tipoActividadId=${tipoId}&responsableId=${ENCARGADO}&estado=PENDIENTE&desde=2026-11-01&hasta=2026-11-30&limit=1&offset=0`, headers: encargado });
    expect(listado.statusCode).toBe(200);
    expect(listado.json().data.map((a: { id: string }) => a.id)).toEqual([id]);
    const vacio = await servidor.app.inject({ method: 'GET', url: `${ruta}?cicloId=${OTRO}`, headers: encargado });
    expect(vacio.json().data).toEqual([]);
  });

  it('CU28 reprograma fecha y responsable en la base real', async () => {
    const id = (await crear()).json().data.id;
    const res = await servidor.app.inject({ method: 'PATCH', url: `${ruta}/${id}/reprogramar`, headers: encargado, payload: { fechaProgramada: '2026-11-20', responsableId: ADMIN } });
    expect(res.statusCode).toBe(200);
    expect((await repo.buscarPorId(id))?.toJSON()).toMatchObject({ fechaProgramada: '2026-11-20', responsableId: ADMIN, estado: 'PENDIENTE' });
  });

  it('CU29 conserva cancelación y motivo; rechaza reprogramarla', async () => {
    const id = (await crear()).json().data.id;
    const cancelada = await servidor.app.inject({ method: 'PATCH', url: `${ruta}/${id}/cancelar`, headers: encargado, payload: { motivoCancelacion: '  Lluvia  ' } });
    expect(cancelada.statusCode).toBe(200);
    expect((await repo.buscarPorId(id))?.toJSON()).toMatchObject({ estado: 'CANCELADA', motivoCancelacion: 'Lluvia' });
    const res = await servidor.app.inject({ method: 'PATCH', url: `${ruta}/${id}/reprogramar`, headers: encargado, payload: { fechaProgramada: '2026-11-20' } });
    expect(res.statusCode).toBe(422);
  });

  it('RN-09 bloquea pendientes y reprogramaciones, libera canceladas y aísla ciclos', async () => {
    const id = (await crear()).json().data.id;
    await expect(servidor.cierreCicloGuard.ejecutar(CICLO, async () => true)).rejects.toBeInstanceOf(CicloConActividadesPendientesError);
    await repo.actualizar((await repo.buscarPorId(id))!.reprogramar({ fechaProgramada: '2026-11-20' }));
    await expect(servidor.cierreCicloGuard.ejecutar(CICLO, async () => true)).rejects.toBeInstanceOf(CicloConActividadesPendientesError);
    await expect(servidor.cierreCicloGuard.ejecutar(OTRO, async () => true)).resolves.toBe(true);
    await repo.actualizar((await repo.buscarPorId(id))!.cancelar('Lluvia'));
    await expect(servidor.cierreCicloGuard.ejecutar(CICLO, async () => true)).resolves.toBe(true);
  });

  it('rechaza una escritura obsoleta después de cancelar desde otra conexión', async () => {
    const id = (await crear()).json().data.id;
    const leida = (await repo.buscarPorId(id))!;
    const escritor = await connection.pool.connect();
    try {
      await escritor.query("update actividades_programadas set estado='CANCELADA',motivo_cancelacion='Otra solicitud' where id=$1", [id]);
      await expect(repo.actualizar(leida.reprogramar({ fechaProgramada: '2026-11-20' }))).rejects.toBeInstanceOf(EstadoActividadInvalidoError);
      expect((await repo.buscarPorId(id))?.toJSON()).toMatchObject({ estado: 'CANCELADA', motivoCancelacion: 'Otra solicitud', fechaProgramada: '2026-11-15' });
    } finally { escritor.release(); }
  });

  it.each(['2026-02-30', '2026-04-31'])('rechaza fecha inexistente %s antes de insertar', async (fechaProgramada) => {
    const res = await servidor.app.inject({ method: 'POST', url: ruta, headers: encargado, payload: { ...datos(), fechaProgramada } });
    expect(res.statusCode).toBe(400);
    expect(await repo.listar({ cicloId: CICLO, limit: 10, offset: 0 })).toEqual([]);
  });

  it('rechaza motivo vacío y mantiene el pendiente', async () => {
    const id = (await crear()).json().data.id;
    const res = await servidor.app.inject({ method: 'PATCH', url: `${ruta}/${id}/cancelar`, headers: encargado, payload: { motivoCancelacion: ' ' } });
    expect(res.statusCode).toBe(400);
    expect((await repo.buscarPorId(id))?.estado).toBe('PENDIENTE');
  });

  it('rechaza anónimos y perfiles sin permiso', async () => {
    const anonimo = await servidor.app.inject({ method: 'POST', url: ruta, payload: datos() });
    expect(anonimo.statusCode).toBe(401);
    const denegado = await servidor.app.inject({ method: 'POST', url: ruta, headers: lector, payload: datos() });
    expect(denegado.statusCode).toBe(403);
  });

  it('migra un histórico cancelado sin motivo sin modificarlo y exige motivo en nuevas escrituras', async () => {
    const client = await connection.pool.connect();
    try {
      await client.query('begin');
      await client.query('create schema agrul054_historico_prueba');
      await client.query('set local search_path to agrul054_historico_prueba, public');
      await client.query('create table actividades_programadas(id uuid primary key default gen_random_uuid(), ciclo_id uuid, estado text)');
      await client.query("insert into actividades_programadas(estado) values('CANCELADA')");
      const migracion = readFileSync(new URL('../../drizzle/migrations/0015_ampliar_actividades_programadas.sql', import.meta.url), 'utf8');
      await client.query(migracion);
      const { rows } = await client.query('select estado,motivo_cancelacion from actividades_programadas');
      expect(rows).toEqual([{ estado: 'CANCELADA', motivo_cancelacion: null }]);
      await expect(client.query("insert into actividades_programadas(estado) values('CANCELADA')")).rejects.toMatchObject({ code: '23514' });
    } finally { await client.query('rollback'); client.release(); }
  });
});
