import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from '../helpers/esquema-postgres-aislado.fixture.js';
import { DrizzleUsuarioFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-usuario-fincas.repository.js';
import { CicloConActividadesPendientesError } from '../../src/application/use-cases/verificar-cierre-ciclo.use-case.js';
import { autenticarOperadorPrueba } from '../helpers/operador-postgres.fixture.js';
import { sembrarCiclosRn09 } from '../helpers/sembrar-ciclos-rn09.js';

const url = process.env.ACTIVIDADES_TEST_DATABASE_URL;
const aislado = url ? await crearEsquemaPostgresAislado(url) : undefined;
const esquemaBase = aislado?.esquema;
afterAll(async () => { await aislado?.cerrar(); });
const baseEsperada = url ? new URL(url).pathname.slice(1) : '';
const BASE = 'c0000000-0000-4000-8000-000000000054';
const FINCA = 'f0000000-0000-4000-8000-000000000059';
const esquema = `agrul054_p1_${randomUUID().replaceAll('-', '')}`;
const ciclos = Array.from({ length: 3 }, () => randomUUID());
const filas = Array.from({ length: 5 }, () => randomUUID());
const usuarios = Array.from({ length: 3 }, () => randomUUID());
const desconocidos = { tipoActividadId: null, fechaProgramada: null, responsableId: null,
  superficiePrevista: null, descripcion: null, motivoCancelacion: null };

describe.skipIf(!url)('P1: históricos reales anteriores a 0015 desde bootstrap', () => {
  const base = createDatabaseConnection(aislado?.connectionString);
  let historico: ReturnType<typeof createDatabaseConnection>;
  let servidor: ReturnType<typeof crearServidorProduccion>;
  let headers: { authorization: string }[];
  let tipoId: string;
  let modernaId: string;
  let esquemaCreado = false;
  let ciclosCreados = false;
  let totalPublico: number;
  const ruta = '/api/v1/actividades-programadas';
  const request = (actor: number, method: 'GET' | 'POST' | 'PATCH', path: string, payload?: Record<string, unknown>) =>
    servidor.app.inject({ method, url: `${ruta}${path}`, headers: headers[actor], payload });
  const snapshot = async (id: string) => (await historico.pool.query('select row_to_json(a) as fila from actividades_programadas a where id=$1', [id])).rows[0].fila;

  beforeAll(async () => {
    if (!['postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_054', 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055', 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_056'].includes(url ?? '')) throw new Error('Solo se admite la base autorizada con rol exclusivo y sin contraseña en URL.');
    expect(esquema).toMatch(/^agrul054_p1_[a-f0-9]{32}$/);
    const { rows } = await base.pool.query("select current_database() as db,current_user as usuario,current_setting('server_version_num')::int as version,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls from pg_roles where rolname=current_user");
    expect(rows[0]).toMatchObject({ db: baseEsperada, usuario: 'agrul_test_user', rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false });
    expect(rows[0].version).toBeGreaterThanOrEqual(180000); expect(rows[0].version).toBeLessThan(190000);
    await sembrarCiclosRn09(base.pool, [BASE]);
    totalPublico = (await base.pool.query(`select count(*)::int as total from "${esquemaBase}".actividades_programadas`)).rows[0].total;
    ciclosCreados = true;
    for (const id of ciclos) await base.pool.query(`insert into ciclos_productivos(id,plantacion_id,nombre_codigo,fecha_inicio_prevista,fecha_fin_prevista,fecha_inicio_efectiva,responsable_seguimiento_id,estado)
      select $1,plantacion_id,$2,'2026-10-01','2026-10-27','2026-10-01',responsable_seguimiento_id,'ACTIVO' from ciclos_productivos where id=$3`, [id, `P1-${id.slice(0, 20)}`, BASE]);
    const client = await base.pool.connect();
    try {
      await client.query('begin');
      await client.query(`create schema "${esquema}"`);
      await client.query(`set local search_path to "${esquema}", "${esquemaBase}", pg_catalog`);
      await client.query(readFileSync(new URL('../../drizzle/migrations/0007_pendientes_cierre_ciclo.sql', import.meta.url), 'utf8'));
      await client.query(`alter table actividades_programadas add constraint p1_ciclo_fk foreign key(ciclo_id) references "${esquemaBase}".ciclos_productivos(id) on delete restrict`);
      await client.query(`create trigger trg_pendiente_ciclo_abierto before insert or update of ciclo_id, estado on actividades_programadas for each row execute function "${esquemaBase}".validar_pendiente_ciclo_abierto()`);
      await client.query(`insert into actividades_programadas(id,ciclo_id,estado) values
        ($1,$6,'PENDIENTE'),($2,$6,'CANCELADA'),($3,$6,'EJECUTADA'),($4,$7,'PENDIENTE'),($5,$8,'PENDIENTE')`, [...filas, ...ciclos]);
      // Se aplica el SQL real sobre filas ya existentes, sin relajar ningún CHECK.
      await client.query(readFileSync(new URL('../../drizzle/migrations/0015_ampliar_actividades_programadas.sql', import.meta.url), 'utf8'));
      await client.query('alter table actividades_programadas add column observaciones text'); // migración 0036
      await client.query('commit'); esquemaCreado = true;
    } catch (error) { await client.query('rollback'); throw error; }
    finally { client.release(); }
    if (!url) throw new Error('Se requiere conexión explícita.');
    const scopedUrl = new URL(url);
    scopedUrl.searchParams.set('options', `-c search_path=${esquema},${esquemaBase},pg_catalog`);
    historico = createDatabaseConnection(scopedUrl.toString());
    expect((await historico.pool.query('select current_schema() as esquema,current_database() as db')).rows[0])
      .toEqual({ esquema, db: baseEsperada });
    servidor = crearServidorProduccion({ connectionString: scopedUrl.toString(), logger: false }); await servidor.app.ready();
    headers = [];
    for (let i = 0; i < usuarios.length; i++) headers.push(await autenticarOperadorPrueba(base.pool, servidor.app,
      { sub: usuarios[i], nombre: 'Prueba', apellido: 'P1', email: `p1-${usuarios[i]}@example.test`, perfil: i ? 'ENCARGADO_CAMPO' : 'ADMINISTRADOR' }));
    await new DrizzleUsuarioFincasRepository(base.db).asignarFincas(usuarios[1], [FINCA]);
    const tipo = await servidor.app.inject({ method: 'POST', url: '/api/v1/tipos-actividad', headers: headers[0], payload: { nombre: `Historial P1 ${randomUUID().slice(0, 8)}`, categoria: 'RIEGO', cultivoIds: ['b0000000-0000-4000-8000-000000000059'] } });
    expect(tipo.statusCode).toBe(201); tipoId = tipo.json().data.id;
    const moderna = await request(1, 'POST', '', { cicloId: ciclos[0], tipoActividadId: tipoId, responsableId: usuarios[1], fechaProgramada: '2030-10-15' });
    expect(moderna.statusCode).toBe(201); modernaId = moderna.json().data.id;
  }, 30000);

  afterAll(async () => {
    try {
      await servidor?.app.close(); await historico?.pool.end();
      // Se elimina únicamente el esquema aleatorio creado por esta suite y sus ciclos.
      if (esquemaCreado) await base.pool.query(`drop schema "${esquema}" cascade`);
      if (ciclosCreados) await base.pool.query('delete from ciclos_productivos where id=ANY($1::uuid[])', [ciclos]);
      if (tipoId) { await base.pool.query('delete from tipos_actividad_cultivos where tipo_actividad_id=$1', [tipoId]); await base.pool.query('delete from tipos_actividad where id=$1', [tipoId]); }
    } finally { await base.pool.end(); }
  });

  it.each(['PENDIENTE', 'CANCELADA', 'EJECUTADA'])('recupera un histórico %s sin inventar datos ni modificar la fila', async estado => {
    const id = filas[['PENDIENTE', 'CANCELADA', 'EJECUTADA'].indexOf(estado)];
    const antes = await snapshot(id);
    const res = await request(1, 'GET', `/${id}`);
    expect(res.statusCode).toBe(200); expect(res.json().data).toMatchObject({ id, estado, ...desconocidos });
    expect(await snapshot(id)).toEqual(antes);
  });

  it('lista históricos y datos nuevos juntos, con paginación y filtros que no inventan fechas', async () => {
    const lista = await request(1, 'GET', `?cicloId=${ciclos[0]}&limit=10`);
    expect(lista.statusCode).toBe(200);
    expect(lista.json().data.map((a: { id: string }) => a.id).sort()).toEqual([...filas.slice(0, 3), modernaId].sort());
    const pagina = await request(1, 'GET', `?cicloId=${ciclos[0]}&limit=1&offset=1`);
    expect(pagina.statusCode).toBe(200); expect(pagina.json().data).toHaveLength(1);
    const fechadas = await request(1, 'GET', `?cicloId=${ciclos[0]}&desde=2030-10-01&hasta=2030-10-27`);
    expect(fechadas.statusCode).toBe(200); expect(fechadas.json().data.map((a: { id: string }) => a.id)).toEqual([modernaId]);
  });

  it('resuelve un pendiente antiguo mediante cancelación justificada y libera RN-09', async () => {
    const id = filas[3];
    await expect(servidor.cierreCicloGuard.ejecutar(ciclos[1], async () => true)).rejects.toBeInstanceOf(CicloConActividadesPendientesError);
    expect((await request(1, 'PATCH', `/${id}/cancelar`, { motivoCancelacion: ' ' })).statusCode).toBe(400);
    const res = await request(1, 'PATCH', `/${id}/cancelar`, { motivoCancelacion: '  No se realizará  ' });
    expect(res.statusCode).toBe(200); expect(res.json().data).toMatchObject({ ...desconocidos, id, estado: 'CANCELADA', motivoCancelacion: 'No se realizará' });
    expect((await snapshot(id)).motivo_cancelacion).toBe('No se realizará');
    await expect(servidor.cierreCicloGuard.ejecutar(ciclos[1], async () => true)).resolves.toBe(true);
  });

  it('reprograma solo información explícita de un pendiente histórico sin completar el tipo', async () => {
    const res = await request(1, 'PATCH', `/${filas[4]}/reprogramar`, { fechaProgramada: '2030-10-20' });
    expect(res.statusCode).toBe(200); expect(res.json().data).toMatchObject({ tipoActividadId: null, responsableId: null, fechaProgramada: '2030-10-20' });
  });

  it('no inventa un tipo para ejecutar una programación incompleta', async () => {
    const antes = await snapshot(filas[0]);
    const res = await servidor.app.inject({ method: 'POST', url: '/api/v1/actividades-realizadas', headers: headers[1],
      payload: { actividadProgramadaId: filas[0], responsableId: usuarios[1], fechaEjecucion: '2026-10-15', superficieTrabajadaHa: 1, descripcionTrabajo: 'Labor de prueba' } });
    expect(res.statusCode).toBe(422); expect(res.json().error.code).toBe('EJECUCION_ACTIVIDAD_INVALIDA');
    expect(await snapshot(filas[0])).toEqual(antes);
  });

  it('no permite crear nuevas actividades incompletas ni cancelaciones sin motivo', async () => {
    const completa = { cicloId: ciclos[0], tipoActividadId: tipoId, responsableId: usuarios[1], fechaProgramada: '2030-10-15' };
    for (const campo of ['tipoActividadId', 'responsableId', 'fechaProgramada']) {
      expect((await request(1, 'POST', '', { ...completa, [campo]: null })).statusCode).toBe(400);
    }
    await expect(historico.pool.query("insert into actividades_programadas(ciclo_id,estado) values($1,'CANCELADA')", [ciclos[0]])).rejects.toMatchObject({ code: '23514' });
  });

  it('mantiene S1 en históricos y no altera programaciones públicas existentes', async () => {
    expect((await request(2, 'GET', `/${filas[1]}`)).statusCode).toBe(403);
    const lista = await request(2, 'GET', ''); expect(lista.statusCode).toBe(200); expect(lista.json().data).toEqual([]);
    expect((await request(2, 'PATCH', `/${filas[0]}/cancelar`, { motivoCancelacion: 'Sin permiso' })).statusCode).toBe(403);
    expect((await base.pool.query(`select count(*)::int as total from "${esquemaBase}".actividades_programadas`)).rows[0].total).toBe(totalPublico);
  });
});
