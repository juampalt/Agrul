import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from '../helpers/esquema-postgres-aislado.fixture.js';
import { DrizzleUsuarioFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-usuario-fincas.repository.js';
import { autenticarOperadorPrueba } from '../helpers/operador-postgres.fixture.js';
import { sembrarCiclosRn09 } from '../helpers/sembrar-ciclos-rn09.js';
import { CicloConActividadesPendientesError } from '../../src/application/use-cases/verificar-cierre-ciclo.use-case.js';

const url = process.env.ACTIVIDADES_TEST_DATABASE_URL;
const aislado = url ? await crearEsquemaPostgresAislado(url) : undefined;
const urlAislada = aislado?.connectionString;
afterAll(async () => { await aislado?.cerrar(); });
const baseEsperada = url ? new URL(url).pathname.slice(1) : '';
const BASE = 'c0000000-0000-4000-8000-000000000054';
const ADMIN = 'a0000000-0000-4000-8000-000000000130';
const RESPONSABLE = 'b0000000-0000-4000-8000-000000000130';
const LECTOR = 'd0000000-0000-4000-8000-000000000130';

describe.skipIf(!url)('CU30/CU31: labores realizadas con PostgreSQL y bootstrap reales', () => {
  const connection = createDatabaseConnection(urlAislada);
  let servidor: ReturnType<typeof crearServidorProduccion>;
  let admin: { authorization: string };
  let encargado: { authorization: string };
  let lector: { authorization: string };
  let tipoId: string;
  let cicloId: string;
  let programadaId: string;
  const datos = () => ({ actividadProgramadaId: programadaId, responsableId: RESPONSABLE,
    fechaEjecucion: '2026-10-15', superficieTrabajadaHa: 1.25, duracionHoras: 2.5 });
  const ejecutar = (body = datos()) => servidor.app.inject({ method: 'POST', url: '/api/v1/actividades-realizadas', headers: encargado, payload: body });
  const datosDirectos = () => ({ origen: 'NO_PROGRAMADA', cicloId, tipoActividadId: tipoId,
    responsableId: RESPONSABLE, fechaEjecucion: '2026-10-15', superficieTrabajadaHa: 1.25 });
  const directa = (cambios: Partial<ReturnType<typeof datosDirectos>> = {}) => servidor.app.inject({
    method: 'POST', url: '/api/v1/actividades-realizadas', headers: encargado, payload: { ...datosDirectos(), ...cambios },
  });
  const estado = async () => (await connection.pool.query('select estado from actividades_programadas where id=$1', [programadaId])).rows[0].estado;
  const cantidad = async () => (await connection.pool.query('select count(*)::int as total from actividades_realizadas where actividad_programada_id=$1', [programadaId])).rows[0].total;

  beforeAll(async () => {
    if (!['postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_054', 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055'].includes(url ?? '')) throw new Error('Se requiere la URL explícita autorizada sin contraseña.');
    const { rows } = await connection.pool.query("select current_database() as db,current_user as usuario,current_setting('server_version_num')::int as version,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls from pg_roles where rolname=current_user");
    expect(rows[0]).toMatchObject({ db: baseEsperada, usuario: 'agrul_test_user', rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false });
    expect(rows[0].version).toBeGreaterThanOrEqual(180000);
    expect(rows[0].version).toBeLessThan(190000);

    await sembrarCiclosRn09(connection.pool, [BASE]);
    servidor = crearServidorProduccion({ connectionString: urlAislada, logger: false });
    await servidor.app.ready();
    const actor = { nombre: 'Prueba', apellido: 'CU30' };
    admin = await autenticarOperadorPrueba(connection.pool, servidor.app, { ...actor, sub: ADMIN, email: 'admin-cu30@example.test' });
    encargado = await autenticarOperadorPrueba(connection.pool, servidor.app, { ...actor, sub: RESPONSABLE, email: 'encargado-cu30@example.test', perfil: 'ENCARGADO_CAMPO' });
    lector = await autenticarOperadorPrueba(connection.pool, servidor.app, { ...actor, sub: LECTOR, email: 'operario-cu30@example.test', perfil: 'OPERARIO' });
    await new DrizzleUsuarioFincasRepository(connection.db).asignarFincas(RESPONSABLE, ['f0000000-0000-4000-8000-000000000059']);
    const tipo = await servidor.app.inject({ method: 'POST', url: '/api/v1/tipos-actividad', headers: admin, payload: { nombre: `Riego CU30 ${randomUUID().slice(0, 8)}`, categoria: 'RIEGO' } });
    expect(tipo.statusCode).toBe(201); tipoId = tipo.json().data.id;
  }, 30000);

  beforeEach(async () => {
    cicloId = randomUUID();
    await connection.pool.query(`insert into ciclos_productivos(id,plantacion_id,nombre_codigo,fecha_inicio_prevista,fecha_fin_prevista,fecha_inicio_efectiva,responsable_seguimiento_id,estado)
      select $1,plantacion_id,$2,'2026-10-01','2026-10-27','2026-10-01',$3,'ACTIVO' from ciclos_productivos where id=$4`,
    [cicloId, `CU30-${cicloId.slice(0, 20)}`, RESPONSABLE, BASE]);
    const res = await servidor.app.inject({ method: 'POST', url: '/api/v1/actividades-programadas', headers: encargado,
      payload: { cicloId, tipoActividadId: tipoId, responsableId: RESPONSABLE, fechaProgramada: '2026-10-15' } });
    expect(res.statusCode).toBe(201); programadaId = res.json().data.id;
  });
  afterAll(async () => { await servidor?.app.close(); await connection.pool.end(); });

  it('persiste el hecho y marca EJECUTADA, liberando RN-09', async () => {
    await expect(servidor.cierreCicloGuard.ejecutar(cicloId, async () => true)).rejects.toBeInstanceOf(CicloConActividadesPendientesError);
    const res = await ejecutar();
    expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ ...datos(), cicloId, tipoActividadId: tipoId });
    expect(res.json().data.loteId).toBe('a0000000-0000-4000-8000-000000000059');
    expect(await estado()).toBe('EJECUTADA'); expect(await cantidad()).toBe(1);
    const { rows } = await connection.pool.query('select superficie_trabajada,duracion_horas from actividades_realizadas where id=$1', [res.json().data.id]);
    expect(rows[0]).toEqual({ superficie_trabajada: '1.25', duracion_horas: '2.50' });
    await expect(servidor.cierreCicloGuard.ejecutar(cicloId, async () => true)).resolves.toBe(true);
  });

  it('serializa dos ejecuciones simultáneas y registra exactamente una labor', async () => {
    const respuestas = await Promise.all([ejecutar(), ejecutar()]);
    expect(respuestas.map(r => r.statusCode).sort()).toEqual([201, 422]);
    expect(await cantidad()).toBe(1); expect(await estado()).toBe('EJECUTADA');
  });

  it('rechaza una programación cancelada conservando su motivo', async () => {
    await connection.pool.query("update actividades_programadas set estado='CANCELADA',motivo_cancelacion='Lluvia' where id=$1", [programadaId]);
    expect((await ejecutar()).statusCode).toBe(422);
    expect(await cantidad()).toBe(0); expect(await estado()).toBe('CANCELADA');
  });

  it('revierte la inserción del hecho si falla la transición posterior', async () => {
    await connection.pool.query("alter table actividades_programadas add constraint cu30_fallo_prueba check (estado <> 'EJECUTADA') NOT VALID");
    try {
      expect((await ejecutar()).statusCode).toBe(500);
      expect(await cantidad()).toBe(0); expect(await estado()).toBe('PENDIENTE');
    } finally { await connection.pool.query('alter table actividades_programadas drop constraint cu30_fallo_prueba'); }
  });

  it.each(['PLANIFICADO', 'FINALIZADO'])('rechaza ciclo %s sin escribir hechos', async (estadoCiclo) => {
    await connection.pool.query(`update ciclos_productivos set estado=$1::varchar,
      fecha_inicio_efectiva=case when $1::varchar='PLANIFICADO' then null else '2026-10-01'::date end,
      fecha_fin_efectiva=case when $1::varchar='FINALIZADO' then '2026-10-27'::date else null end where id=$2`, [estadoCiclo, cicloId]);
    expect((await ejecutar()).statusCode).toBe(422); expect(await cantidad()).toBe(0);
  });

  it.each(['2026-09-30', '2026-10-28', '2099-10-15'])('rechaza fecha fuera del ciclo o futura %s', async (fechaEjecucion) => {
    expect((await ejecutar({ ...datos(), fechaEjecucion })).statusCode).toBe(422);
    expect(await cantidad()).toBe(0); expect(await estado()).toBe('PENDIENTE');
  });

  it('rechaza responsable inexistente', async () => {
    expect((await ejecutar({ ...datos(), responsableId: randomUUID() })).statusCode).toBe(404);
    expect(await cantidad()).toBe(0);
  });

  it('rechaza responsable inactivo', async () => {
    await connection.pool.query("update usuarios set estado='INACTIVO' where id=$1", [LECTOR]);
    try {
      expect((await ejecutar({ ...datos(), responsableId: LECTOR })).statusCode).toBe(422);
      expect(await cantidad()).toBe(0);
    } finally { await connection.pool.query("update usuarios set estado='ACTIVO' where id=$1", [LECTOR]); }
  });

  it('rechaza UUID y fecha inexistente en HTTP, y campos de lote inyectados', async () => {
    for (const payload of [{ ...datos(), actividadProgramadaId: 'no-uuid' }, { ...datos(), fechaEjecucion: '2026-02-30' }, { ...datos(), loteId: randomUUID() }]) {
      const res = await servidor.app.inject({ method: 'POST', url: '/api/v1/actividades-realizadas', headers: encargado, payload });
      expect(res.statusCode).toBe(400);
    }
    expect(await cantidad()).toBe(0);
  });

  it('registra y consulta NO_PROGRAMADA sin crear ni modificar programaciones', async () => {
    const res = await directa(); expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ ...datosDirectos(), actividadProgramadaId: null, loteId: 'a0000000-0000-4000-8000-000000000059' });
    const id = res.json().data.id;
    const fila = (await connection.pool.query('select actividad_programada_id from actividades_realizadas where id=$1', [id])).rows[0];
    expect(fila.actividad_programada_id).toBeNull(); expect(await estado()).toBe('PENDIENTE');
    const detalle = await servidor.app.inject({ method: 'GET', url: `/api/v1/actividades-realizadas/${id}`, headers: encargado });
    expect(detalle.statusCode).toBe(200); expect(detalle.json().data).toEqual(res.json().data);
    const total = (await connection.pool.query('select count(*)::int as total from actividades_programadas where ciclo_id=$1', [cicloId])).rows[0].total;
    expect(total).toBe(1);
  });

  it('filtra y pagina labores directas y programadas con orden estable', async () => {
    const primera = (await directa()).json().data.id;
    const segunda = (await directa({ fechaEjecucion: '2026-10-16' })).json().data.id;
    const programada = (await ejecutar()).json().data.id;
    const filtro = `/api/v1/actividades-realizadas?cicloId=${cicloId}&loteId=a0000000-0000-4000-8000-000000000059&tipoActividadId=${tipoId}&responsableId=${RESPONSABLE}&origen=NO_PROGRAMADA&desde=2026-10-15&hasta=2026-10-16`;
    const lista = await servidor.app.inject({ method: 'GET', url: filtro, headers: encargado });
    expect(lista.statusCode).toBe(200); expect(lista.json().data.map((a: { id: string }) => a.id)).toEqual([segunda, primera]);
    const pagina = await servidor.app.inject({ method: 'GET', url: `${filtro}&limit=1&offset=1`, headers: encargado });
    expect(pagina.json().data.map((a: { id: string }) => a.id)).toEqual([primera]);
    const plan = await servidor.app.inject({ method: 'GET', url: `/api/v1/actividades-realizadas?cicloId=${cicloId}&origen=PROGRAMADA`, headers: encargado });
    expect(plan.json().data.map((a: { id: string }) => a.id)).toEqual([programada]);
    const otro = await servidor.app.inject({ method: 'GET', url: `/api/v1/actividades-realizadas?cicloId=${randomUUID()}`, headers: encargado });
    expect(otro.json().data).toEqual([]);
  });

  it('rechaza referencias inexistentes en registro directo', async () => {
    for (const cambios of [{ cicloId: randomUUID() }, { tipoActividadId: randomUUID() }, { responsableId: randomUUID() }]) {
      expect((await directa(cambios)).statusCode).toBe(404);
    }
  });

  it('rechaza tipo inactivo y ciclo no activo sin crear una labor directa', async () => {
    await connection.pool.query("update tipos_actividad set estado='INACTIVA' where id=$1", [tipoId]);
    try { expect((await directa()).statusCode).toBe(422); }
    finally { await connection.pool.query("update tipos_actividad set estado='ACTIVA' where id=$1", [tipoId]); }
    await connection.pool.query("update ciclos_productivos set estado='FINALIZADO',fecha_fin_efectiva='2026-10-27' where id=$1", [cicloId]);
    expect((await directa()).statusCode).toBe(422);
    expect((await connection.pool.query('select count(*)::int as total from actividades_realizadas where ciclo_id=$1', [cicloId])).rows[0].total).toBe(0);
  });

  it('mantiene consultable el histórico tras finalizar ciclo e inactivar responsable', async () => {
    const id = (await directa({ responsableId: LECTOR })).json().data.id;
    await connection.pool.query("update ciclos_productivos set estado='FINALIZADO',fecha_fin_efectiva='2026-10-27' where id=$1", [cicloId]);
    await connection.pool.query("update usuarios set estado='INACTIVO' where id=$1", [LECTOR]);
    try {
      const res = await servidor.app.inject({ method: 'GET', url: `/api/v1/actividades-realizadas/${id}`, headers: encargado });
      expect(res.statusCode).toBe(200); expect(res.json().data.origen).toBe('NO_PROGRAMADA');
    } finally { await connection.pool.query("update usuarios set estado='ACTIVO' where id=$1", [LECTOR]); }
  });

  it('espera un cierre concurrente y rechaza el registro directo si el ciclo termina finalizado', async () => {
    const escritor = await connection.pool.connect();
    let respuesta: ReturnType<typeof directa> | undefined;
    try {
      await escritor.query('begin');
      const { rows } = await escritor.query('select pg_backend_pid() as pid');
      await escritor.query("update ciclos_productivos set estado='FINALIZADO',fecha_fin_efectiva='2026-10-27' where id=$1", [cicloId]);
      respuesta = directa();
      const resultado = respuesta.then(r => r);
      await expect.poll(async () => (await connection.pool.query(
        'select exists(select 1 from pg_stat_activity where datname=current_database() and $1=ANY(pg_blocking_pids(pid))) as bloqueada', [rows[0].pid]
      )).rows[0].bloqueada, { timeout: 3000 }).toBe(true);
      await escritor.query('commit');
      expect((await resultado).statusCode).toBe(422);
      expect((await connection.pool.query('select count(*)::int as total from actividades_realizadas where ciclo_id=$1', [cicloId])).rows[0].total).toBe(0);
    } finally { await escritor.query('rollback'); escritor.release(); await respuesta; }
  }, 10000);

  it('valida parámetros de consulta y diferencia inexistente de UUID inválido', async () => {
    for (const query of ['desde=2026-02-30', 'desde=2026-10-20&hasta=2026-10-01', 'limit=101', 'offset=-1', 'origen=OTRO', 'extra=1']) {
      expect((await servidor.app.inject({ method: 'GET', url: `/api/v1/actividades-realizadas?${query}`, headers: encargado })).statusCode).toBe(400);
    }
    expect((await servidor.app.inject({ method: 'GET', url: '/api/v1/actividades-realizadas/no-uuid', headers: encargado })).statusCode).toBe(400);
    expect((await servidor.app.inject({ method: 'GET', url: `/api/v1/actividades-realizadas/${randomUUID()}`, headers: encargado })).statusCode).toBe(404);
  });

  it('exige autenticación y permiso de operación', async () => {
    // El caso de usuario inactivo revocó su sesión anterior: iniciar una vigente.
    lector = await autenticarOperadorPrueba(connection.pool, servidor.app, { sub: LECTOR, nombre: 'Prueba', apellido: 'CU30', email: 'operario-cu30@example.test', perfil: 'OPERARIO' });
    const anonimo = await servidor.app.inject({ method: 'POST', url: '/api/v1/actividades-realizadas', payload: datos() });
    expect(anonimo.statusCode).toBe(401);
    const denegado = await servidor.app.inject({ method: 'POST', url: '/api/v1/actividades-realizadas', headers: lector, payload: datos() });
    expect(denegado.statusCode).toBe(403);
    for (const path of ['/api/v1/actividades-realizadas', `/api/v1/actividades-realizadas/${randomUUID()}`]) {
      expect((await servidor.app.inject({ method: 'GET', url: path })).statusCode).toBe(401);
      expect((await servidor.app.inject({ method: 'GET', url: path, headers: lector })).statusCode).toBe(403);
    }
  });
});
