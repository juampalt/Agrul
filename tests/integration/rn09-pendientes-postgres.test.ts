import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { AgrulTransaction, createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from '../helpers/esquema-postgres-aislado.fixture.js';
import { CicloConActividadesPendientesError } from '../../src/application/use-cases/verificar-cierre-ciclo.use-case.js';
import { sembrarCiclosRn09 } from '../helpers/sembrar-ciclos-rn09.js';

const connectionString = process.env.RN09_TEST_DATABASE_URL;
const aislado = connectionString ? await crearEsquemaPostgresAislado(connectionString) : undefined;
const urlAislada = aislado?.connectionString;
afterAll(async () => { await aislado?.cerrar(); });
const baseEsperada = connectionString ? new URL(connectionString).pathname.slice(1) : '';
// Validar antes de construir pools o ejecutar cualquier consulta.
if (connectionString && !['postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_054', 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055'].includes(connectionString ?? '')) {
  throw new Error('RN-09 solo admite la base descartable autorizada y el rol exclusivo, sin contraseña en URL.');
}
const CICLO = 'c0000000-0000-4000-8000-000000000052';
const OTRO = 'c0000000-0000-4000-8000-000000000053';

describe.skipIf(!connectionString)('RN-09: consulta persistente y transacción de cierre', () => {
  const connection = createDatabaseConnection(urlAislada);
  let servidor: ReturnType<typeof crearServidorProduccion>;

  // Representa un efecto SQL de la futura operación CU21; no implementa un ciclo ni un endpoint productivo.
  async function efecto(tx: AgrulTransaction) {
    await tx.execute(sql`insert into rn09_efectos_prueba (id) values (${CICLO})`);
    return 'verificado';
  }
  async function cantidadEfectos() {
    return (await connection.pool.query<{ total: number }>('select count(*)::int as total from rn09_efectos_prueba')).rows[0].total;
  }
  async function actividad(estado: string, cicloId = CICLO) {
    await connection.pool.query('insert into actividades_programadas(ciclo_id, estado, motivo_cancelacion) values ($1, $2, $3)',
      [cicloId, estado, estado === 'CANCELADA' ? 'Cancelación del fixture RN-09' : null]);
  }

  beforeAll(async () => {
    const { rows } = await connection.pool.query("select current_database() as db, current_user as usuario, current_setting('server_version_num')::int as version, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls from pg_roles where rolname=current_user");
    expect(rows[0]).toMatchObject({ db: baseEsperada, usuario: 'agrul_test_user', rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false });
    expect(rows[0].version).toBeGreaterThanOrEqual(180000);
    expect(rows[0].version).toBeLessThan(190000);

    await sembrarCiclosRn09(connection.pool, [CICLO, OTRO]);
    await connection.pool.query('create table if not exists rn09_efectos_prueba (id uuid primary key)');
    servidor = crearServidorProduccion({ connectionString: urlAislada, logger: false });
    // Ruta exclusiva de la prueba para verificar el errorHandler real sin desarrollar CU21.
    servidor.app.post('/__test/rn09', async () => servidor.cierreCicloGuard.ejecutar(CICLO, efecto));
    await servidor.app.ready();
  });
  beforeEach(async () => {
    await connection.pool.query('delete from actividades_programadas where ciclo_id=ANY($1::uuid[])', [[CICLO, OTRO]]);
    await connection.pool.query('delete from rn09_efectos_prueba');
  });
  afterAll(async () => { await servidor?.app.close(); await connection.pool.end(); });

  it('permite la operación únicamente cuando se confirma que no hay pendientes', async () => {
    await expect(servidor.cierreCicloGuard.ejecutar(CICLO, efecto)).resolves.toBe('verificado');
    expect(await cantidadEfectos()).toBe(1);
  });

  it('devuelve 422 y no ejecuta la operación con una actividad PENDIENTE persistida', async () => {
    await actividad('PENDIENTE');
    const respuesta = await servidor.app.inject({ method: 'POST', url: '/__test/rn09' });
    expect(respuesta.statusCode).toBe(422);
    expect(respuesta.json()).toMatchObject({ success: false, data: null, error: { code: 'CICLO_CON_ACTIVIDADES_PENDIENTES' } });
    expect(await cantidadEfectos()).toBe(0);
  });

  it.each(['EJECUTADA', 'CANCELADA'])('una actividad %s no bloquea RN-09', async (estado) => {
    await actividad(estado);
    await expect(servidor.cierreCicloGuard.ejecutar(CICLO, efecto)).resolves.toBe('verificado');
  });

  it.each([null, '', '   '])('mantiene la restricción de motivo para nuevas cancelaciones (%s)', async (motivo) => {
    await expect(connection.pool.query("insert into actividades_programadas(ciclo_id,estado,motivo_cancelacion) values ($1,'CANCELADA',$2)", [CICLO, motivo]))
      .rejects.toMatchObject({ code: '23514' });
    expect((await connection.pool.query('select count(*)::int as total from actividades_programadas where ciclo_id=$1', [CICLO])).rows[0].total).toBe(0);
  });

  it('aísla pendientes por ciclo y detecta un pendiente entre actividades resueltas', async () => {
    await actividad('PENDIENTE', OTRO);
    await actividad('EJECUTADA');
    await expect(servidor.cierreCicloGuard.ejecutar(CICLO, async () => undefined)).resolves.toBeUndefined();
    await actividad('PENDIENTE');
    await expect(servidor.cierreCicloGuard.ejecutar(CICLO, efecto)).rejects.toBeInstanceOf(CicloConActividadesPendientesError);
    expect(await cantidadEfectos()).toBe(0);
  });

  it('consulta el mismo pendiente desde otra instancia del bootstrap', async () => {
    await actividad('PENDIENTE');
    const otra = crearServidorProduccion({ connectionString: urlAislada, logger: false });
    try {
      await expect(otra.cierreCicloGuard.ejecutar(CICLO, efecto)).rejects.toBeInstanceOf(CicloConActividadesPendientesError);
      expect(await cantidadEfectos()).toBe(0);
    } finally { await otra.app.close(); }
  });

  it('bloquea la operación si falta la tabla de actividades', async () => {
    await connection.pool.query('alter table actividades_programadas rename to rn09_fuente_temporal');
    try {
      await expect(servidor.cierreCicloGuard.ejecutar(CICLO, efecto)).rejects.toMatchObject({ code: '42P01' });
      expect(await cantidadEfectos()).toBe(0);
    } finally { await connection.pool.query('alter table rn09_fuente_temporal rename to actividades_programadas'); }
  });

  it('no convierte un error real de consulta en ausencia de pendientes', async () => {
    await connection.pool.query('alter table actividades_programadas rename column estado to rn09_estado_temporal');
    try {
      const respuesta = await servidor.app.inject({ method: 'POST', url: '/__test/rn09' });
      expect(respuesta.statusCode).toBe(500);
      expect(respuesta.json().error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(await cantidadEfectos()).toBe(0);
    } finally { await connection.pool.query('alter table actividades_programadas rename column rn09_estado_temporal to estado'); }
  });

  it('revierte los efectos SQL si falla la operación después de verificar RN-09', async () => {
    const error = new Error('Fallo de la futura operación de cierre');
    await expect(servidor.cierreCicloGuard.ejecutar(CICLO, async (tx) => { await efecto(tx); throw error; }))
      .rejects.toBe(error);
    expect(await cantidadEfectos()).toBe(0);
  });

  it('espera a un escritor previo y detecta el pendiente que ese escritor confirma', async () => {
    const escritor = await connection.pool.connect();
    await escritor.query('begin');
    let confirmado = false;
    await escritor.query("insert into actividades_programadas(ciclo_id, estado) values ($1, 'PENDIENTE')", [CICLO]);
    const resultado = servidor.cierreCicloGuard.ejecutar(CICLO, efecto).then(() => null, (error: unknown) => error);
    try {
      await expect.poll(async () => (await connection.pool.query<{ total: number }>(
        "select count(*)::int as total from pg_stat_activity where datname=current_database() and query like 'LOCK TABLE actividades_programadas IN SHARE MODE%' and cardinality(pg_blocking_pids(pid))>0"
      )).rows[0].total, { timeout: 3000 }).toBeGreaterThan(0);
      await escritor.query('commit');
      confirmado = true;
      expect(await resultado).toBeInstanceOf(CicloConActividadesPendientesError);
      expect(await cantidadEfectos()).toBe(0);
    } finally { if (!confirmado) await escritor.query('rollback'); escritor.release(); await resultado; }
  }, 10000);

  it('impide escrituras entre la verificación y el commit de la operación', async () => {
    let liberar: () => void = () => undefined;
    let notificarEntrada: () => void = () => undefined;
    const espera = new Promise<void>((resolve) => { liberar = resolve; });
    const entrada = new Promise<void>((resolve) => { notificarEntrada = resolve; });
    const operacion = servidor.cierreCicloGuard.ejecutar(CICLO, async (tx) => {
      await efecto(tx);
      notificarEntrada();
      await espera;
    });
    const escritor = await connection.pool.connect();
    const { rows } = await escritor.query<{ pid: number }>('select pg_backend_pid() as pid');
    let escritura: Promise<unknown> | undefined;
    try {
      await Promise.race([entrada, operacion]);
      escritura = escritor.query("insert into actividades_programadas(ciclo_id, estado) values ($1, 'PENDIENTE')", [CICLO]);
      await expect.poll(async () => (await connection.pool.query<{ bloqueado: boolean }>(
        'select cardinality(pg_blocking_pids($1))>0 as bloqueado', [rows[0].pid]
      )).rows[0].bloqueado, { timeout: 3000 }).toBe(true);
    } finally { liberar(); await operacion; await escritura; escritor.release(); }
    expect(await cantidadEfectos()).toBe(1);
    await expect(servidor.cierreCicloGuard.ejecutar(CICLO, efecto)).rejects.toBeInstanceOf(CicloConActividadesPendientesError);
  }, 10000);

  it('la base rechaza estados desconocidos y consultas sin un ciclo válido', async () => {
    await expect(actividad('OTRO')).rejects.toMatchObject({ code: '23514' });
    await expect(servidor.cierreCicloGuard.ejecutar('no-uuid', efecto)).rejects.toMatchObject({ code: '22P02' });
    expect(await cantidadEfectos()).toBe(0);
  });
});
