import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from '../helpers/esquema-postgres-aislado.fixture.js';
import { DrizzleUsuarioFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-usuario-fincas.repository.js';
import { autenticarOperadorPrueba } from '../helpers/operador-postgres.fixture.js';
import { sembrarCiclosRn09 } from '../helpers/sembrar-ciclos-rn09.js';

const url = process.env.ACTIVIDADES_TEST_DATABASE_URL;
const aislado = url ? await crearEsquemaPostgresAislado(url) : undefined;
const urlAislada = aislado?.connectionString;
afterAll(async () => { await aislado?.cerrar(); });
const baseEsperada = url ? new URL(url).pathname.slice(1) : '';
const BASE = 'c0000000-0000-4000-8000-000000000054';
const usuarios = Array.from({ length: 4 }, () => randomUUID());
type Recurso = { fincaId: string; loteId: string; plantacionId: string; cicloId: string; programadaId: string; realizadaId: string; monitoreoId: string };
const rutas = ['actividades-programadas', 'actividades-realizadas', 'monitoreos'] as const;
const campoId = { 'actividades-programadas': 'programadaId', 'actividades-realizadas': 'realizadaId', monitoreos: 'monitoreoId' } as const;

describe.skipIf(!url)('S1: aislamiento por finca desde bootstrap y sesiones reales', () => {
  const connection = createDatabaseConnection(urlAislada);
  const asignaciones = new DrizzleUsuarioFincasRepository(connection.db);
  let servidor: ReturnType<typeof crearServidorProduccion>;
  let headers: { authorization: string }[];
  let tipoId: string;
  const recursos: Recurso[] = [];
  const request = (actor: number, method: 'GET' | 'POST' | 'PATCH', path: string, payload?: Record<string, unknown>) =>
    servidor.app.inject({ method, url: `/api/v1/${path}`, headers: headers[actor], payload });
  const programar = (r: Recurso) => ({ cicloId: r.cicloId, tipoActividadId: tipoId, responsableId: usuarios[1], fechaProgramada: '2026-10-15' });
  const directa = (r: Recurso) => ({ origen: 'NO_PROGRAMADA', cicloId: r.cicloId, tipoActividadId: tipoId,
    responsableId: usuarios[1], fechaEjecucion: '2026-10-15', superficieTrabajadaHa: 1 });
  const monitoreo = (r: Recurso) => ({ cicloId: r.cicloId, responsableId: usuarios[1], fechaInspeccion: '2026-10-15',
    etapaFenologica: 'Floración', estadoGeneralCultivo: 'Bueno', tipoObservacion: 'Sanitaria', descripcionHallazgos: 'Sin síntomas' });

  beforeAll(async () => {
    if (!['postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_054', 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_055'].includes(url ?? '')) throw new Error('Solo se admite la base y rol autorizados sin contraseña en URL.');
    const { rows } = await connection.pool.query("select current_database() as db,current_user as usuario,current_setting('server_version_num')::int as version,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls from pg_roles where rolname=current_user");
    expect(rows[0]).toMatchObject({ db: baseEsperada, usuario: 'agrul_test_user', rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false });
    expect(rows[0].version).toBeGreaterThanOrEqual(180000); expect(rows[0].version).toBeLessThan(190000);
    await sembrarCiclosRn09(connection.pool, [BASE]);
    servidor = crearServidorProduccion({ connectionString: urlAislada, logger: false }); await servidor.app.ready();
    headers = [];
    for (let i = 0; i < usuarios.length; i++) headers.push(await autenticarOperadorPrueba(connection.pool, servidor.app,
      { sub: usuarios[i], nombre: 'Prueba', apellido: 'S1', email: `s1-${usuarios[i]}@example.test`, perfil: i === 0 ? 'ADMINISTRADOR' : 'ENCARGADO_CAMPO' }));
    const tipo = await request(0, 'POST', 'tipos-actividad', { nombre: `Riego S1 ${randomUUID().slice(0, 8)}`, categoria: 'RIEGO' });
    expect(tipo.statusCode).toBe(201); tipoId = tipo.json().data.id;
    for (let i = 0; i < 2; i++) {
      const r: Recurso = { fincaId: randomUUID(), loteId: randomUUID(), plantacionId: randomUUID(), cicloId: randomUUID(), programadaId: '', realizadaId: '', monitoreoId: '' };
      recursos.push(r);
      await connection.pool.query("insert into fincas(id,nombre,localidad,departamento,provincia,superficie_total_ha) values($1,$2,'San Pablo','Lules','Tucumán',10)", [r.fincaId, `S1-${r.fincaId}`]);
      await connection.pool.query("insert into lotes(id,codigo_lote,producto,unidad_medida,finca_id,superficie_ha) values($1,$2,'S1','HA',$3,10)", [r.loteId, `S1-${r.loteId}`, r.fincaId]);
      await connection.pool.query(`insert into plantaciones(id,lote_id,cultivo_id,variedad_id,fecha_plantacion,superficie_ha,cantidad_inicial_plantas)
        select $1,$2,p.cultivo_id,p.variedad_id,'2026-10-01',10,100 from plantaciones p inner join ciclos_productivos c on c.plantacion_id=p.id where c.id=$3`, [r.plantacionId, r.loteId, BASE]);
      await connection.pool.query("insert into ciclos_productivos(id,plantacion_id,nombre_codigo,fecha_inicio_prevista,fecha_fin_prevista,fecha_inicio_efectiva,responsable_seguimiento_id,estado) values($1,$2,$3,'2026-10-01','2026-10-27','2026-10-01',$4,'ACTIVO')", [r.cicloId, r.plantacionId, `S1-${r.cicloId.slice(0, 20)}`, usuarios[0]]);
      const plan = await request(0, 'POST', rutas[0], { ...programar(r), fechaProgramada: i ? '2026-10-14' : '2026-10-15' });
      expect(plan.statusCode).toBe(201); r.programadaId = plan.json().data.id;
      const labor = await request(0, 'POST', rutas[1], { ...directa(r), fechaEjecucion: i ? '2026-10-16' : '2026-10-15' });
      expect(labor.statusCode).toBe(201); r.realizadaId = labor.json().data.id;
      const obs = await request(0, 'POST', rutas[2], { ...monitoreo(r), fechaInspeccion: i ? '2026-10-16' : '2026-10-15' });
      expect(obs.statusCode).toBe(201); r.monitoreoId = obs.json().data.id;
      await asignaciones.asignarFincas(usuarios[i + 1], [r.fincaId]);
    }
  }, 30000);

  afterAll(async () => {
    try {
      // Solo filas pertenecientes a los UUID aleatorios creados por esta suite.
      for (const r of recursos) {
        await connection.pool.query('delete from monitoreos where ciclo_id=$1', [r.cicloId]);
        await connection.pool.query('delete from actividades_realizadas where ciclo_id=$1', [r.cicloId]);
        await connection.pool.query('delete from actividades_programadas where ciclo_id=$1', [r.cicloId]);
        await connection.pool.query('delete from ciclos_productivos where id=$1', [r.cicloId]);
        await connection.pool.query('delete from plantaciones where id=$1', [r.plantacionId]);
        await connection.pool.query('delete from lotes where id=$1', [r.loteId]);
        await connection.pool.query('delete from usuario_finca_asignacion where finca_id=$1', [r.fincaId]);
        await connection.pool.query('delete from fincas where id=$1', [r.fincaId]);
      }
      if (tipoId) await connection.pool.query('delete from tipos_actividad where id=$1', [tipoId]);
    } finally { await servidor?.app.close(); await connection.pool.end(); }
  });

  it.each(rutas)('filtra %s antes de paginar, permite lo propio y deniega acceso cruzado', async ruta => {
    for (const actor of [1, 2]) {
      const propio = recursos[actor - 1], ajeno = recursos[2 - actor];
      const lista = await request(actor, 'GET', `${ruta}?limit=1`);
      expect(lista.statusCode).toBe(200); expect(lista.json().data.map((r: { id: string }) => r.id)).toEqual([propio[campoId[ruta]]]);
      expect((await request(actor, 'GET', `${ruta}/${propio[campoId[ruta]]}`)).statusCode).toBe(200);
      expect((await request(actor, 'GET', `${ruta}/${ajeno[campoId[ruta]]}`)).statusCode).toBe(403);
      const filtrada = await request(actor, 'GET', `${ruta}?cicloId=${ajeno.cicloId}`);
      expect(filtrada.statusCode).toBe(200); expect(filtrada.json().data).toEqual([]);
      expect((await request(0, 'GET', `${ruta}/${ajeno[campoId[ruta]]}`)).statusCode).toBe(200);
    }
  });

  it('deniega todas las escrituras ajenas y conserva los datos originales', async () => {
    const r = recursos[1];
    const snapshot = async () => (await connection.pool.query(`select
      (select row_to_json(a) from actividades_programadas a where id=$1) as programada,
      (select count(*)::int from actividades_programadas where ciclo_id=$2) as planes,
      (select count(*)::int from actividades_realizadas where ciclo_id=$2) as labores,
      (select count(*)::int from monitoreos where ciclo_id=$2) as monitoreos`, [r.programadaId, r.cicloId])).rows[0];
    const antes = await snapshot();
    expect((await request(1, 'POST', rutas[0], programar(r))).statusCode).toBe(403);
    expect((await request(1, 'POST', rutas[1], directa(r))).statusCode).toBe(403);
    expect((await request(1, 'POST', rutas[2], monitoreo(r))).statusCode).toBe(403);
    expect((await request(1, 'POST', rutas[1], { actividadProgramadaId: r.programadaId, responsableId: usuarios[1], fechaEjecucion: '2026-10-15', superficieTrabajadaHa: 1 })).statusCode).toBe(403);
    expect((await request(1, 'PATCH', `${rutas[0]}/${r.programadaId}/reprogramar`, { fechaProgramada: '2026-10-20' })).statusCode).toBe(403);
    expect((await request(1, 'PATCH', `${rutas[0]}/${r.programadaId}/cancelar`, { motivoCancelacion: 'Intento ajeno' })).statusCode).toBe(403);
    expect(await snapshot()).toEqual(antes);
  });

  it('permite altas propias, reprogramación, cancelación y ejecución; administrador mantiene alcance global', async () => {
    const r = recursos[0];
    expect((await request(1, 'POST', rutas[1], directa(r))).statusCode).toBe(201);
    expect((await request(1, 'POST', rutas[2], monitoreo(r))).statusCode).toBe(201);
    const nueva = await request(1, 'POST', rutas[0], programar(r)); expect(nueva.statusCode).toBe(201);
    const id = nueva.json().data.id;
    expect((await request(1, 'PATCH', `${rutas[0]}/${id}/reprogramar`, { fechaProgramada: '2026-10-20' })).statusCode).toBe(200);
    expect((await request(1, 'PATCH', `${rutas[0]}/${id}/cancelar`, { motivoCancelacion: 'Prueba propia' })).statusCode).toBe(200);
    const ejecutable = (await request(1, 'POST', rutas[0], programar(r))).json().data.id;
    expect((await request(1, 'POST', rutas[1], { actividadProgramadaId: ejecutable, responsableId: usuarios[1], fechaEjecucion: '2026-10-15', superficieTrabajadaHa: 1 })).statusCode).toBe(201);
    expect((await request(0, 'PATCH', `${rutas[0]}/${recursos[1].programadaId}/reprogramar`, { fechaProgramada: '2026-10-20' })).statusCode).toBe(200);
  });

  it('un encargado sin asignaciones no lista recursos ni puede consultar o crear', async () => {
    for (const ruta of rutas) {
      const res = await request(3, 'GET', ruta); expect(res.statusCode).toBe(200); expect(res.json().data).toEqual([]);
      expect((await request(3, 'GET', `${ruta}/${recursos[0][campoId[ruta]]}`)).statusCode).toBe(403);
    }
    expect((await request(3, 'POST', rutas[0], programar(recursos[0]))).statusCode).toBe(403);
    expect((await request(3, 'POST', rutas[1], directa(recursos[0]))).statusCode).toBe(403);
    expect((await request(3, 'POST', rutas[2], monitoreo(recursos[0]))).statusCode).toBe(403);
  });

  it('revalida una revocación de finca con el mismo token en los tres recursos', async () => {
    await asignaciones.desasignarFinca(usuarios[1], recursos[0].fincaId);
    try {
      for (const ruta of rutas) {
        const lista = await request(1, 'GET', ruta); expect(lista.statusCode).toBe(200); expect(lista.json().data).toEqual([]);
        expect((await request(1, 'GET', `${ruta}/${recursos[0][campoId[ruta]]}`)).statusCode).toBe(403);
      }
      expect((await request(1, 'PATCH', `${rutas[0]}/${recursos[0].programadaId}/cancelar`, { motivoCancelacion: 'Revocado' })).statusCode).toBe(403);
    } finally { await asignaciones.asignarFincas(usuarios[1], [recursos[0].fincaId]); }
  });

  it('no admite alcance de finca suministrado por el cliente', async () => {
    for (const ruta of rutas) expect((await request(1, 'GET', `${ruta}?fincaIds=${recursos[1].fincaId}`)).statusCode).toBe(400);
    expect((await request(1, 'POST', rutas[0], { ...programar(recursos[1]), fincaId: recursos[0].fincaId })).statusCode).toBe(400);
  });
});
