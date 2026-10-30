import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from '../helpers/esquema-postgres-aislado.fixture.js';
import { DrizzleActividadesProgramadasRepository } from '../../src/infrastructure/database/repositories/drizzle-actividades-programadas.repository.js';
import { DrizzleUsuarioFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-usuario-fincas.repository.js';
import { ActividadProgramadaProps, ConflictoActividadProgramadaError } from '../../src/core/domain/entities/actividad-programada.entity.js';
import { autenticarOperadorPrueba } from '../helpers/operador-postgres.fixture.js';
import { sembrarCiclosRn09 } from '../helpers/sembrar-ciclos-rn09.js';

const url = process.env.ACTIVIDADES_TEST_DATABASE_URL;
const aislado = url ? await crearEsquemaPostgresAislado(url) : undefined;
const urlAislada = aislado?.connectionString;
afterAll(async () => { await aislado?.cerrar(); });
const baseEsperada = url ? new URL(url).pathname.slice(1) : '';
const BASE = 'c0000000-0000-4000-8000-000000000054';
const ADMIN = randomUUID(), ENCARGADO = randomUUID();

describe.skipIf(!url)('P2: conflictos reales entre escrituras de programaciones', () => {
  const connection = createDatabaseConnection(urlAislada);
  const otra = createDatabaseConnection(urlAislada);
  const repo = new DrizzleActividadesProgramadasRepository(connection.db);
  const otroRepo = new DrizzleActividadesProgramadasRepository(otra.db);
  let servidor: ReturnType<typeof crearServidorProduccion>;
  let admin: { authorization: string }, encargado: { authorization: string };
  let tipoId: string, cicloId: string, id: string;
  const ciclos: string[] = [];
  const solicitud = (accion: 'reprogramar' | 'cancelar', payload: Record<string, unknown>) => servidor.app.inject({
    method: 'PATCH', url: `/api/v1/actividades-programadas/${id}/${accion}`, headers: encargado, payload,
  });
  const leer = async () => { const actividad = await repo.buscarPorId(id); if (!actividad) throw new Error('Falta la actividad de prueba.'); return actividad; };
  const normalizarInstantes = (a: ActividadProgramadaProps) => ({ ...a,
    creadoEn: new Date(a.creadoEn).toISOString(), actualizadoEn: new Date(a.actualizadoEn).toISOString() });

  beforeAll(async () => {
    if (!['postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_054', 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055', 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_056'].includes(url ?? '')) throw new Error('Solo se admite la base y el rol autorizados, sin contraseña en URL.');
    const { rows } = await connection.pool.query("select current_database() as db,current_user as usuario,current_setting('server_version_num')::int as version,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls from pg_roles where rolname=current_user");
    expect(rows[0]).toMatchObject({ db: baseEsperada, usuario: 'agrul_test_user', rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false });
    expect(rows[0].version).toBeGreaterThanOrEqual(180000); expect(rows[0].version).toBeLessThan(190000);
    await sembrarCiclosRn09(connection.pool, [BASE]);
    servidor = crearServidorProduccion({ connectionString: urlAislada, logger: false }); await servidor.app.ready();
    const actor = { nombre: 'Prueba', apellido: 'P2' };
    admin = await autenticarOperadorPrueba(connection.pool, servidor.app, { ...actor, sub: ADMIN, email: `p2-${ADMIN}@example.test` });
    encargado = await autenticarOperadorPrueba(connection.pool, servidor.app, { ...actor, sub: ENCARGADO, email: `p2-${ENCARGADO}@example.test`, perfil: 'ENCARGADO_CAMPO' });
    await new DrizzleUsuarioFincasRepository(connection.db).asignarFincas(ENCARGADO, ['f0000000-0000-4000-8000-000000000059']);
    const tipo = await servidor.app.inject({ method: 'POST', url: '/api/v1/tipos-actividad', headers: admin,
      payload: { nombre: `Riego P2 ${randomUUID().slice(0, 8)}`, categoria: 'RIEGO' } });
    expect(tipo.statusCode).toBe(201); tipoId = tipo.json().data.id;
  }, 30000);

  beforeEach(async () => {
    cicloId = randomUUID(); ciclos.push(cicloId);
    await connection.pool.query(`insert into ciclos_productivos(id,plantacion_id,nombre_codigo,fecha_inicio_prevista,fecha_fin_prevista,fecha_inicio_efectiva,responsable_seguimiento_id,estado)
      select $1,plantacion_id,$2,'2026-10-01','2026-10-27','2026-10-01',$3,'ACTIVO' from ciclos_productivos where id=$4`, [cicloId, `P2-${cicloId.slice(0, 20)}`, ADMIN, BASE]);
    const creada = await servidor.app.inject({ method: 'POST', url: '/api/v1/actividades-programadas', headers: encargado,
      payload: { cicloId, tipoActividadId: tipoId, responsableId: ENCARGADO, fechaProgramada: '2026-10-15', descripcion: 'Descripción original' } });
    expect(creada.statusCode).toBe(201); id = creada.json().data.id;
  });
  afterAll(async () => {
    try {
      // Únicamente filas de los ciclos aleatorios creados por esta suite.
      if (ciclos.length) {
        await connection.pool.query('delete from actividades_programadas where ciclo_id=ANY($1::uuid[])', [ciclos]);
        await connection.pool.query('delete from ciclos_productivos where id=ANY($1::uuid[])', [ciclos]);
      }
      if (tipoId) await connection.pool.query('delete from tipos_actividad where id=$1', [tipoId]);
    } finally { await servidor?.app.close(); await connection.pool.end(); await otra.pool.end(); }
  });

  async function competirHttp(acciones: { accion: 'reprogramar' | 'cancelar'; payload: Record<string, unknown> }[]) {
    const bloqueo = await connection.pool.connect();
    const pendientes: ReturnType<typeof solicitud>[] = [];
    try {
      await bloqueo.query('begin');
      await bloqueo.query('select id from actividades_programadas where id=$1 for update', [id]);
      for (const a of acciones) pendientes.push(solicitud(a.accion, a.payload));
      const resultado = Promise.all(pendientes); // Inicia ambas solicitudes antes de liberar la fila.
      await expect.poll(async () => (await connection.pool.query(`select count(*)::int as total from pg_stat_activity
        where datname=current_database() and query like 'update "actividades_programadas"%' and cardinality(pg_blocking_pids(pid))>0`)).rows[0].total,
      { timeout: 5000 }).toBe(acciones.length);
      await bloqueo.query('commit');
      return await resultado;
    } finally { await bloqueo.query('rollback'); bloqueo.release(); await Promise.all(pendientes); }
  }

  it('dos conexiones que leen la misma versión no pueden confirmar ambas modificaciones', async () => {
    const primera = await leer(), segunda = await otroRepo.buscarPorId(id);
    if (!segunda) throw new Error('Falta la segunda lectura.');
    expect(primera.versionPersistida).toBeDefined(); expect(segunda.versionPersistida).toBe(primera.versionPersistida);
    const resultados = await Promise.allSettled([
      repo.actualizar(primera.reprogramar({ fechaProgramada: '2026-10-17' })),
      otroRepo.actualizar(segunda.reprogramar({ fechaProgramada: '2026-10-20', responsableId: ADMIN })),
    ]);
    expect(resultados.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const fallida = resultados.find(r => r.status === 'rejected');
    expect(fallida?.status === 'rejected' && fallida.reason).toBeInstanceOf(ConflictoActividadProgramadaError);
    const actual = await leer(); expect(actual.versionPersistida).not.toBe(primera.versionPersistida);
    expect(actual.toJSON()).toMatchObject(resultados[0].status === 'fulfilled'
      ? { fechaProgramada: '2026-10-17', responsableId: ENCARGADO }
      : { fechaProgramada: '2026-10-20', responsableId: ADMIN });
  });

  it('una cancelación obsoleta no restaura fecha o responsable; releer permite cancelar el estado actual', async () => {
    const obsoleta = await leer();
    const fresca = await otroRepo.buscarPorId(id); if (!fresca) throw new Error('Falta la actividad.');
    await otroRepo.actualizar(fresca.reprogramar({ fechaProgramada: '2026-10-20', responsableId: ADMIN }));
    await expect(repo.actualizar(obsoleta.cancelar('Lluvia'))).rejects.toBeInstanceOf(ConflictoActividadProgramadaError);
    expect((await leer()).toJSON()).toMatchObject({ estado: 'PENDIENTE', fechaProgramada: '2026-10-20', responsableId: ADMIN, motivoCancelacion: null });
    const cancelada = await solicitud('cancelar', { motivoCancelacion: 'Lluvia' });
    expect(cancelada.statusCode).toBe(200); expect(cancelada.json().data).toMatchObject({ estado: 'CANCELADA', fechaProgramada: '2026-10-20', responsableId: ADMIN });
  });

  it('dos reprogramaciones HTTP simultáneas devuelven 200 y 409 sin éxito ficticio', async () => {
    const respuestas = await competirHttp([
      { accion: 'reprogramar', payload: { fechaProgramada: '2026-10-17' } },
      { accion: 'reprogramar', payload: { fechaProgramada: '2026-10-20', responsableId: ADMIN } },
    ]);
    expect(respuestas.map(r => r.statusCode).sort()).toEqual([200, 409]);
    expect(respuestas.find(r => r.statusCode === 409)?.json().error.code).toBe('ACTIVIDAD_PROGRAMADA_DESACTUALIZADA');
    const ganadora = respuestas.find(r => r.statusCode === 200); if (!ganadora) throw new Error('Falta respuesta exitosa.');
    expect(normalizarInstantes((await leer()).toJSON())).toEqual(normalizarInstantes(ganadora.json<{ data: ActividadProgramadaProps }>().data));
  }, 10000);

  it('cancelación y reprogramación HTTP sobre la misma lectura conservan solo la decisión ganadora', async () => {
    const respuestas = await competirHttp([
      { accion: 'cancelar', payload: { motivoCancelacion: 'Lluvia' } },
      { accion: 'reprogramar', payload: { fechaProgramada: '2026-10-20', responsableId: ADMIN } },
    ]);
    expect(respuestas.map(r => r.statusCode).sort()).toEqual([200, 409]);
    const actual = (await leer()).toJSON();
    const ganadora = respuestas.find(r => r.statusCode === 200); if (!ganadora) throw new Error('Falta respuesta exitosa.');
    expect(normalizarInstantes(actual)).toEqual(normalizarInstantes(ganadora.json<{ data: ActividadProgramadaProps }>().data));
    expect(actual).toMatchObject(actual.estado === 'CANCELADA'
      ? { fechaProgramada: '2026-10-15', responsableId: ENCARGADO, motivoCancelacion: 'Lluvia' }
      : { fechaProgramada: '2026-10-20', responsableId: ADMIN, motivoCancelacion: null });
    expect(actual.descripcion).toBe('Descripción original');
  }, 10000);

  it('detecta escrituras SQL ajenas al repositorio aunque no cambien actualizado_en', async () => {
    const obsoleta = await leer();
    await otra.pool.query('update actividades_programadas set descripcion=$1 where id=$2', ['Cambio confirmado', id]);
    expect((await leer()).actualizadoEn).toBe(obsoleta.actualizadoEn);
    await expect(repo.actualizar(obsoleta.reprogramar({ fechaProgramada: '2026-10-20' }))).rejects.toBeInstanceOf(ConflictoActividadProgramadaError);
    expect((await leer()).toJSON()).toMatchObject({ descripcion: 'Cambio confirmado', fechaProgramada: '2026-10-15' });
  });

  it('un rollback no invalida la versión del último estado confirmado', async () => {
    const original = await leer();
    const escritor = await otra.pool.connect();
    try {
      await escritor.query('begin'); await escritor.query('update actividades_programadas set descripcion=$1 where id=$2', ['Cambio revertido', id]);
    } finally { await escritor.query('rollback'); escritor.release(); }
    expect((await leer()).versionPersistida).toBe(original.versionPersistida);
    await expect(repo.actualizar(original.reprogramar({ fechaProgramada: '2026-10-20' }))).resolves.toBeUndefined();
    expect((await leer()).toJSON()).toMatchObject({ descripcion: 'Descripción original', fechaProgramada: '2026-10-20' });
  });
});
