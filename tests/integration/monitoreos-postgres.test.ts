import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { runMigrations } from '../../src/infrastructure/database/migrate.js';
import { autenticarOperadorPrueba } from '../helpers/operador-postgres.fixture.js';
import { sembrarCiclosRn09 } from '../helpers/sembrar-ciclos-rn09.js';
import { InMemoryAplicacionesRepository } from '../mocks/in-memory-aplicaciones.repository.js';
import { InMemoryActividadesRepository } from '../mocks/in-memory-actividades.repository.js';

const url = process.env.ACTIVIDADES_TEST_DATABASE_URL;
const BASE = 'c0000000-0000-4000-8000-000000000054';
const ADMIN = 'a0000000-0000-4000-8000-000000000132';
const RESPONSABLE = 'b0000000-0000-4000-8000-000000000132';
const LECTOR = 'd0000000-0000-4000-8000-000000000132';
const LOTE = 'a0000000-0000-4000-8000-000000000059';

describe.skipIf(!url)('CU32/CU33: monitoreos con PostgreSQL y bootstrap reales', () => {
  const connection = createDatabaseConnection(url);
  let servidor: ReturnType<typeof crearServidorProduccion>;
  let admin: { authorization: string };
  let encargado: { authorization: string };
  let lector: { authorization: string };
  let cicloId: string;
  const datos = () => ({ cicloId, responsableId: RESPONSABLE, fechaInspeccion: '2026-10-15', sectorObservado: 'Sector norte',
    etapaFenologica: 'Floración', estadoGeneralCultivo: 'Bueno', tipoObservacion: 'Sanitaria',
    problemaDetectado: 'Sequedad', descripcionHallazgos: 'Hojas con pérdida de turgencia', accionRecomendada: 'Evaluar riego' });
  const registrar = (cambios: Partial<ReturnType<typeof datos>> = {}) => servidor.app.inject({ method: 'POST', url: '/api/v1/monitoreos', headers: encargado, payload: { ...datos(), ...cambios } });
  const listar = (query = '') => servidor.app.inject({ method: 'GET', url: `/api/v1/monitoreos?cicloId=${cicloId}${query}`, headers: encargado });

  beforeAll(async () => {
    if (url !== 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_054') throw new Error('Se requiere la URL autorizada sin contraseña.');
    const { rows } = await connection.pool.query("select current_database() as db,current_user as usuario,current_setting('server_version_num')::int as version,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls from pg_roles where rolname=current_user");
    expect(rows[0]).toMatchObject({ db: 'agrul_test_agrul_054', usuario: 'agrul_test_user', rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false });
    expect(rows[0].version).toBeGreaterThanOrEqual(180000); expect(rows[0].version).toBeLessThan(190000);
    await runMigrations(url);
    await sembrarCiclosRn09(connection.pool, [BASE]);
    servidor = crearServidorProduccion({ connectionString: url, logger: false }); await servidor.app.ready();
    const actor = { nombre: 'Prueba', apellido: 'CU32' };
    admin = await autenticarOperadorPrueba(connection.pool, servidor.app, { ...actor, sub: ADMIN, email: 'admin-cu32@example.test' });
    encargado = await autenticarOperadorPrueba(connection.pool, servidor.app, { ...actor, sub: RESPONSABLE, email: 'encargado-cu32@example.test', perfil: 'ENCARGADO_CAMPO' });
    lector = await autenticarOperadorPrueba(connection.pool, servidor.app, { ...actor, sub: LECTOR, email: 'operario-cu32@example.test', perfil: 'OPERARIO' });
  }, 30000);

  beforeEach(async () => {
    cicloId = randomUUID();
    await connection.pool.query(`insert into ciclos_productivos(id,plantacion_id,nombre_codigo,fecha_inicio_prevista,fecha_fin_prevista,fecha_inicio_efectiva,responsable_seguimiento_id,estado)
      select $1,plantacion_id,$2,'2026-10-01','2026-10-27','2026-10-01',$3,'ACTIVO' from ciclos_productivos where id=$4`,
    [cicloId, `CU32-${cicloId.slice(0, 20)}`, RESPONSABLE, BASE]);
  });
  afterAll(async () => { await servidor?.app.close(); await connection.pool.end(); });

  it('registra todos los campos y permite consultar el detalle persistido', async () => {
    const res = await registrar(); expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ ...datos(), loteId: LOTE });
    const id = res.json().data.id;
    const detalle = await servidor.app.inject({ method: 'GET', url: `/api/v1/monitoreos/${id}`, headers: admin });
    expect(detalle.statusCode).toBe(200); expect(detalle.json().data).toEqual(res.json().data);
    expect((await connection.pool.query('select accion_recomendada from monitoreos where id=$1', [id])).rows[0].accion_recomendada).toBe('Evaluar riego');
  });

  it('RN-13 no genera actividades, aplicaciones ni bloqueos RN-09 a partir de recomendaciones', async () => {
    const aplicaciones = vi.spyOn(InMemoryAplicacionesRepository.prototype, 'guardar');
    const actividades = vi.spyOn(InMemoryActividadesRepository.prototype, 'guardar');
    const contar = async () => (await connection.pool.query(`select
      (select count(*)::int from actividades_programadas) as programadas,
      (select count(*)::int from actividades_realizadas) as realizadas,
      (select count(*)::int from eventos_trazabilidad) as eventos`)).rows[0];
    try {
      const antes = await contar(); expect((await registrar()).statusCode).toBe(201);
      expect(await contar()).toEqual(antes); expect(aplicaciones).not.toHaveBeenCalled(); expect(actividades).not.toHaveBeenCalled();
      await expect(servidor.cierreCicloGuard.ejecutar(cicloId, async () => true)).resolves.toBe(true);
    } finally { aplicaciones.mockRestore(); actividades.mockRestore(); }
  });

  it('admite inspecciones sin recomendación ni problema detectado', async () => {
    const { accionRecomendada: _accion, problemaDetectado: _problema, sectorObservado: _sector, ...payload } = datos();
    const res = await servidor.app.inject({ method: 'POST', url: '/api/v1/monitoreos', headers: encargado, payload });
    expect(res.statusCode).toBe(201); expect(res.json().data).toMatchObject({ accionRecomendada: null, problemaDetectado: null, sectorObservado: null });
  });

  it('filtra por lote, responsable, etapa, estado, tipo y fechas y pagina con orden estable', async () => {
    const primero = (await registrar()).json().data.id;
    const segundo = (await registrar({ fechaInspeccion: '2026-10-16' })).json().data.id;
    const filtro = '&loteId=' + LOTE + '&responsableId=' + RESPONSABLE + '&etapaFenologica=' + encodeURIComponent('Floración') + '&estadoGeneralCultivo=Bueno&tipoObservacion=Sanitaria&desde=2026-10-15&hasta=2026-10-16';
    const lista = await listar(filtro); expect(lista.statusCode).toBe(200);
    expect(lista.json().data.map((m: { id: string }) => m.id)).toEqual([segundo, primero]);
    expect((await listar(`${filtro}&limit=1&offset=1`)).json().data.map((m: { id: string }) => m.id)).toEqual([primero]);
    expect((await listar('&tipoObservacion=Otra')).json().data).toEqual([]);
    const otro = await servidor.app.inject({ method: 'GET', url: `/api/v1/monitoreos?cicloId=${randomUUID()}`, headers: encargado });
    expect(otro.json().data).toEqual([]);
  });

  it.each(['2026-09-30', '2026-10-28', '2099-01-01'])('rechaza inspecciones fuera del ciclo o futuras: %s', async fechaInspeccion => {
    expect((await registrar({ fechaInspeccion })).statusCode).toBe(422); expect((await listar()).json().data).toEqual([]);
  });

  it('rechaza referencias inexistentes y responsable inactivo', async () => {
    expect((await registrar({ cicloId: randomUUID() })).statusCode).toBe(404);
    expect((await registrar({ responsableId: randomUUID() })).statusCode).toBe(404);
    await connection.pool.query("update usuarios set estado='INACTIVO' where id=$1", [LECTOR]);
    try { expect((await registrar({ responsableId: LECTOR })).statusCode).toBe(422); }
    finally { await connection.pool.query("update usuarios set estado='ACTIVO' where id=$1", [LECTOR]); }
    expect((await listar()).json().data).toEqual([]);
  });

  it('rechaza ciclo no activo pero conserva consultable su histórico', async () => {
    const id = (await registrar()).json().data.id;
    await connection.pool.query("update ciclos_productivos set estado='FINALIZADO',fecha_fin_efectiva='2026-10-27' where id=$1", [cicloId]);
    expect((await registrar()).statusCode).toBe(422);
    const detalle = await servidor.app.inject({ method: 'GET', url: `/api/v1/monitoreos/${id}`, headers: encargado });
    expect(detalle.statusCode).toBe(200);
  });

  it('valida calendario, texto obligatorio, UUID y campos inesperados antes de persistir', async () => {
    for (const cambios of [{ fechaInspeccion: '2026-02-30' }, { etapaFenologica: ' ' }, { descripcionHallazgos: ' ' }, { responsableId: 'no-uuid' }, { loteId: randomUUID() }]) {
      expect((await servidor.app.inject({ method: 'POST', url: '/api/v1/monitoreos', headers: encargado, payload: { ...datos(), ...cambios } })).statusCode).toBe(400);
    }
    expect((await listar()).json().data).toEqual([]);
  });

  it('protege la consulta con validación y devuelve 404 para un UUID inexistente', async () => {
    for (const query of ['&desde=2026-02-30', '&desde=2026-10-20&hasta=2026-10-01', '&limit=101', '&offset=-1', '&extra=1']) expect((await listar(query)).statusCode).toBe(400);
    expect((await servidor.app.inject({ method: 'GET', url: '/api/v1/monitoreos/no-uuid', headers: encargado })).statusCode).toBe(400);
    expect((await servidor.app.inject({ method: 'GET', url: `/api/v1/monitoreos/${randomUUID()}`, headers: encargado })).statusCode).toBe(404);
  });

  it('la base rechaza hallazgos vacíos y conserva el registro original', async () => {
    const id = (await registrar()).json().data.id;
    await expect(connection.pool.query("update monitoreos set descripcion_hallazgos=' ' where id=$1", [id])).rejects.toMatchObject({ code: '23514' });
    expect((await listar()).json().data[0].descripcionHallazgos).toBe(datos().descripcionHallazgos);
  });

  it('exige sesión y permisos para alta, listado y detalle', async () => {
    lector = await autenticarOperadorPrueba(connection.pool, servidor.app, { sub: LECTOR, nombre: 'Prueba', apellido: 'CU32', email: 'operario-cu32@example.test', perfil: 'OPERARIO' });
    for (const path of ['/api/v1/monitoreos', `/api/v1/monitoreos/${randomUUID()}`]) {
      expect((await servidor.app.inject({ method: 'GET', url: path })).statusCode).toBe(401);
      expect((await servidor.app.inject({ method: 'GET', url: path, headers: lector })).statusCode).toBe(403);
    }
    expect((await servidor.app.inject({ method: 'POST', url: '/api/v1/monitoreos', payload: datos() })).statusCode).toBe(401);
    expect((await servidor.app.inject({ method: 'POST', url: '/api/v1/monitoreos', headers: lector, payload: datos() })).statusCode).toBe(403);
  });
});
