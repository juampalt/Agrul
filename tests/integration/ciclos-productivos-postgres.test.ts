import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';
import { emitirSesionPrueba } from '../helpers/operador-postgres.fixture.js';
import { CiclosPostgresFixture, HEADERS_CICLOS as headers, INEXISTENTE_CICLO as inexistente, USUARIO_CICLOS, OPERADOR_CICLOS } from '../helpers/ciclos-postgres.fixture.js';

const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;
describe.skipIf(!connectionString)('AGRUL-052 CU18-CU21 con bootstrap y PostgreSQL reales', () => {
  const f = new CiclosPostgresFixture(connectionString);
  beforeAll(async () => { await f.preparar(); }, 60000);
  beforeEach(async () => { await f.sembrar(); });
  afterAll(async () => { await f.cerrar(); });
  const registrar = (extra: object = {}) => f.app.inject({ method: 'POST', url: '/api/v1/ciclos-productivos', headers, payload: { ...f.datos, ...extra } });
  const consultar = (id: string) => f.app.inject({ method: 'GET', url: `/api/v1/ciclos-productivos/${id}`, headers });

  it('CU18 registra un ciclo PLANIFICADO persistente vinculado a la plantación', async () => {
    const respuesta = await registrar();
    expect(respuesta.statusCode).toBe(201);
    expect(respuesta.json().data).toMatchObject({ ...f.datos, estado: 'PLANIFICADO', fechaInicioEfectiva: null, fechaFinEfectiva: null });
    const { rows } = await f.conexion.pool.query('select plantacion_id, estado from ciclos_productivos where id=$1', [respuesta.json().data.id]);
    expect(rows[0]).toEqual({ plantacion_id: f.plantacionId, estado: 'PLANIFICADO' });
    expect(await f.estadoLote()).toBe('DISPONIBLE');
  });

  it('admite previsiones futuras y rechaza orden de fechas y plantación inexistente', async () => {
    expect((await registrar({ fechaInicioPrevista: '2999-01-01', fechaFinPrevista: '2999-12-31' })).statusCode).toBe(201);
    expect((await registrar({ nombreCodigo: 'Otro', fechaFinPrevista: '2026-10-09' })).statusCode).toBe(422);
    expect((await registrar({ nombreCodigo: 'Otro', fechaInicioPrevista: '2026-09-30' })).statusCode).toBe(422);
    expect((await registrar({ plantacionId: inexistente })).statusCode).toBe(404);
  });

  it('resuelve códigos duplicados concurrentes con 201 y 409', async () => {
    const respuestas = await Promise.all([registrar(), registrar()]);
    expect(respuestas.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    expect(respuestas.find((r) => r.statusCode === 409)?.json().error.code).toBe('CODIGO_CICLO_DUPLICADO');
  });

  it('CU19 consulta por id, filtros y paginación', async () => {
    const id = await f.crear();
    await f.crear('CICLO-2026-B');
    const respuesta = await consultar(id);
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toMatchObject({ success: true, error: null, timestamp: expect.any(String), data: { id, estado: 'PLANIFICADO' } });
    const url = `/api/v1/ciclos-productivos?plantacionId=${f.plantacionId}&loteId=${f.loteId}&estado=PLANIFICADO&limit=1&offset=1`;
    const lista = await f.app.inject({ method: 'GET', url, headers });
    expect(lista.statusCode).toBe(200);
    expect(lista.json().data).toMatchObject([{ nombreCodigo: 'CICLO-2026-B' }]);
    expect((await f.app.inject({ method: 'GET', url: '/api/v1/ciclos-productivos?estado=ACTIVO', headers })).json().data).toEqual([]);
  });

  it('CU20 inicia y actualiza el lote a EN_PRODUCCION de forma persistente', async () => {
    const id = await f.crear();
    const respuesta = await f.iniciar(id);
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json().data).toMatchObject({ estado: 'ACTIVO', fechaInicioEfectiva: '2026-10-10', fechaInicioPrevista: '2026-10-10' });
    expect(await f.estadoLote()).toBe('EN_PRODUCCION');
    const otra = crearServidorProduccion({ connectionString: f.connectionString, logger: false });
    try {
      expect((await otra.app.inject({ method: 'GET', url: `/api/v1/ciclos-productivos/${id}`, headers })).json().data.estado).toBe('ACTIVO');
    } finally { await otra.app.close(); }
  });

  it('CU21 bloquea por pendientes con 422 y permite cerrar tras su ejecución', async () => {
    const id = await f.crear();
    await f.iniciar(id);
    await f.conexion.pool.query("insert into actividades_programadas(ciclo_id,estado) values ($1,'PENDIENTE')", [id]);
    const otra = crearServidorProduccion({ connectionString: f.connectionString, logger: false });
    try {
      const bloqueado = await otra.app.inject({ method: 'PATCH', url: `/api/v1/ciclos-productivos/${id}/finalizar`, headers,
        payload: { fechaFinEfectiva: '2026-10-27' } });
      expect(bloqueado.statusCode).toBe(422);
      expect(bloqueado.json().error.code).toBe('CICLO_CON_ACTIVIDADES_PENDIENTES');
    } finally { await otra.app.close(); }
    expect((await consultar(id)).json().data).toMatchObject({ estado: 'ACTIVO', fechaFinEfectiva: null });
    expect(await f.estadoLote()).toBe('EN_PRODUCCION');
    await f.conexion.pool.query("update actividades_programadas set estado='EJECUTADA' where ciclo_id=$1", [id]);
    const cierre = await f.finalizar(id);
    expect(cierre.statusCode).toBe(200);
    expect(cierre.json().data).toMatchObject({ estado: 'FINALIZADO', fechaFinEfectiva: '2026-10-27' });
    expect(await f.estadoLote()).toBe('DISPONIBLE');
  });

  it('una actividad cancelada no bloquea el cierre ni permite reabrir pendientes después', async () => {
    const id = await f.crear();
    await f.iniciar(id);
    await f.conexion.pool.query("insert into actividades_programadas(ciclo_id,estado,motivo_cancelacion) values ($1,'CANCELADA','Cancelación del fixture de cierre')", [id]);
    expect((await f.finalizar(id)).statusCode).toBe(200);
    await expect(f.conexion.pool.query("insert into actividades_programadas(ciclo_id,estado) values ($1,'PENDIENTE')", [id]))
      .rejects.toMatchObject({ code: '23514' });
    await expect(f.conexion.pool.query("update actividades_programadas set estado='PENDIENTE' where ciclo_id=$1", [id]))
      .rejects.toMatchObject({ code: '23514' });
  });

  it('conserva la plantación perenne y mantiene el lote en producción hasta cerrar su último ciclo activo', async () => {
    const a = await f.crear(); const b = await f.crear('CICLO-2026-B');
    expect((await f.iniciar(a)).statusCode).toBe(200);
    expect((await f.iniciar(b)).statusCode).toBe(200);
    expect((await f.finalizar(a)).statusCode).toBe(200);
    expect(await f.estadoLote()).toBe('EN_PRODUCCION');
    expect((await f.finalizar(b)).statusCode).toBe(200);
    expect(await f.estadoLote()).toBe('DISPONIBLE');
    expect((await f.conexion.pool.query('select estado from plantaciones where id=$1', [f.plantacionId])).rows[0].estado).toBe('ACTIVA');
    expect((await registrar({ nombreCodigo: 'CICLO-2027', fechaInicioPrevista: '2027-01-01', fechaFinPrevista: '2027-12-31' })).statusCode).toBe(201);
  });

  it('serializa el cierre de un ciclo con el inicio concurrente de otro en el mismo lote', async () => {
    const a = await f.crear(); const b = await f.crear('CICLO-2026-B');
    await f.iniciar(a);
    const respuestas = await Promise.all([f.finalizar(a), f.iniciar(b)]);
    expect(respuestas.map((r) => r.statusCode)).toEqual([200, 200]);
    expect(await f.estadoLote()).toBe('EN_PRODUCCION');
  });

  it('impide saltear estados y reescribir un inicio o cierre efectivo', async () => {
    const id = await f.crear();
    expect((await f.finalizar(id)).statusCode).toBe(422);
    expect((await f.iniciar(id)).statusCode).toBe(200);
    expect((await f.iniciar(id, '2026-10-11')).statusCode).toBe(422);
    const respuestas = await Promise.all([f.finalizar(id), f.finalizar(id)]);
    expect(respuestas.map((r) => r.statusCode).sort()).toEqual([200, 422]);
    expect((await consultar(id)).json().data).toMatchObject({ fechaInicioEfectiva: '2026-10-10', fechaFinEfectiva: '2026-10-27' });
  });

  it('bloquea cambios territoriales incompatibles y finalización prematura de la plantación', async () => {
    const id = await f.crear();
    const finalizarPlantacion = (fechaFinalizacion = '2026-10-27') => f.app.inject({ method: 'PATCH',
      url: `/api/v1/plantaciones/${f.plantacionId}/finalizar`, headers, payload: { fechaFinalizacion } });
    expect((await finalizarPlantacion()).statusCode).toBe(422);
    await f.iniciar(id);
    expect((await f.app.inject({ method: 'PUT', url: `/api/v1/lotes-territorio/${f.loteId}`, headers,
      payload: { nombre: 'Lote ciclos', superficieHa: 10, estado: 'DISPONIBLE' } })).statusCode).toBe(422);
    expect((await f.app.inject({ method: 'PATCH', url: `/api/v1/lotes-territorio/${f.loteId}/desactivar`, headers })).statusCode).toBe(422);
    expect((await finalizarPlantacion()).statusCode).toBe(422);
    expect((await f.finalizar(id)).statusCode).toBe(200);
    expect((await finalizarPlantacion('2026-10-26')).statusCode).toBe(422);
    expect((await finalizarPlantacion()).statusCode).toBe(200);
    expect((await registrar({ nombreCodigo: 'Invalido' })).statusCode).toBe(422);
  });

  it('los consumidores existentes de actividades encuentran el ciclo SQL y reconocen ACTIVO/FINALIZADO', async () => {
    const id = await f.crear();
    const tipoActividadId = await f.alta('/catalogos/tipos-actividad', { nombre: 'Riego', categoria: 'RIEGO' });
    const payload = { tipoActividadId, loteId: f.loteId, cicloId: id, fechaHecho: '2026-10-10', usuarioCargaId: USUARIO_CICLOS.sub };
    const actividad = () => f.app.inject({ method: 'POST', url: '/api/v1/actividades', payload });
    expect((await actividad()).statusCode).toBe(422);
    await f.iniciar(id);
    expect((await actividad()).statusCode).toBe(201);
    await f.finalizar(id);
    expect((await actividad()).statusCode).toBe(422);
  });

  it('no cierra si RN-09 no se puede consultar', async () => {
    const id = await f.crear(); await f.iniciar(id);
    await f.conexion.pool.query('alter table actividades_programadas rename column estado to estado_indisponible');
    try { expect((await f.finalizar(id)).statusCode).toBe(500); }
    finally { await f.conexion.pool.query('alter table actividades_programadas rename column estado_indisponible to estado'); }
    expect((await consultar(id)).json().data.estado).toBe('ACTIVO');
    expect(await f.estadoLote()).toBe('EN_PRODUCCION');
  });

  it('revierte el cierre del ciclo si falla la actualización del lote', async () => {
    const id = await f.crear(); await f.iniciar(id);
    await f.conexion.pool.query("create function fallo_lote_prueba() returns trigger as $$ begin raise exception 'Fallo de prueba'; end; $$ language plpgsql");
    await f.conexion.pool.query('create trigger fallo_lote_prueba before update on lotes for each row execute function fallo_lote_prueba()');
    try { expect((await f.finalizar(id)).statusCode).toBe(500); }
    finally { await f.conexion.pool.query('drop trigger fallo_lote_prueba on lotes'); await f.conexion.pool.query('drop function fallo_lote_prueba()'); }
    expect((await consultar(id)).json().data.estado).toBe('ACTIVO');
    expect(await f.estadoLote()).toBe('EN_PRODUCCION');
  });

  it('valida fechas efectivas sin alterar estados ante el rechazo', async () => {
    const id = await f.crear();
    expect((await f.iniciar(id, '2999-01-01')).statusCode).toBe(422);
    expect((await f.iniciar(id, '2026-09-30')).statusCode).toBe(422);
    expect((await f.iniciar(id)).statusCode).toBe(200);
    expect((await f.finalizar(id, '2999-01-01')).statusCode).toBe(422);
    expect((await f.finalizar(id, '2026-10-09')).statusCode).toBe(422);
    expect((await consultar(id)).json().data.estado).toBe('ACTIVO');
  });

  it.each([{ nombreCodigo: ' ' }, { nombreCodigo: 'x'.repeat(31) }, { fechaInicioPrevista: '2026-02-30' },
    { responsableSeguimientoId: 'no-uuid' }, { estado: 'ACTIVO' }, { plantacionId: 'no-uuid' }])('valida el contrato estricto %j', async (extra) => {
    expect((await registrar(extra)).statusCode).toBe(400);
  });
  it.each(['?estado=ABIERTO', '?limit=0', '?offset=-1', '?plantacionId=no-uuid', '?extra=1', '/no-uuid'])(
    'valida parámetros y filtros %s', async (sufijo) => {
      expect((await f.app.inject({ method: 'GET', url: `/api/v1/ciclos-productivos${sufijo}`, headers })).statusCode).toBe(400);
    });
  it('devuelve 404 para ciclos inexistentes', async () => {
    expect((await consultar(inexistente)).statusCode).toBe(404);
    expect((await f.iniciar(inexistente)).statusCode).toBe(404);
    expect((await f.finalizar(inexistente)).statusCode).toBe(404);
  });
  it('exige autenticación, rol Administrador y cambio de contraseña inicial', async () => {
    expect((await f.app.inject({ method: 'GET', url: '/api/v1/ciclos-productivos' })).statusCode).toBe(401);
    for (const perfil of ['ENCARGADO', 'ADMINISTRADOR'] as const) {
      try {
        await f.conexion.pool.query('update usuarios set perfil=$1,debe_cambiar_password=$2 where id=$3', [perfil, perfil === 'ADMINISTRADOR', OPERADOR_CICLOS.sub]);
        const token = await emitirSesionPrueba(f.conexion.pool, { ...OPERADOR_CICLOS, perfil, debeCambiarPassword: perfil === 'ADMINISTRADOR' });
        expect((await f.app.inject({ method: 'POST', url: '/api/v1/ciclos-productivos', payload: f.datos,
          headers: { authorization: `Bearer ${token}` } })).statusCode).toBe(403);
      } finally { await f.restaurarOperador(); }
    }
  });
  it('SQL mantiene las referencias históricas y restringe estados inconsistentes', async () => {
    const id = await f.crear();
    await expect(f.conexion.pool.query('delete from plantaciones where id=$1', [f.plantacionId])).rejects.toMatchObject({ code: expect.stringMatching(/^(23001|23503)$/) });
    expect((await f.conexion.pool.query('select id from plantaciones where id=$1', [f.plantacionId])).rows).toHaveLength(1);
    await expect(f.conexion.pool.query("update ciclos_productivos set estado='FINALIZADO' where id=$1", [id])).rejects.toMatchObject({ code: '23514' });
    await expect(f.conexion.pool.query("insert into actividades_programadas(ciclo_id) values ($1)", [inexistente])).rejects.toMatchObject({ code: '23503' });
  });
  it('exige un responsable existente y activo y conserva su referencia histórica', async () => {
    expect((await registrar({ responsableSeguimientoId: inexistente })).statusCode).toBe(404);
    await f.conexion.pool.query("update usuarios set estado='INACTIVO' where id=$1", [USUARIO_CICLOS.sub]);
    expect((await registrar()).statusCode).toBe(422);
    await f.conexion.pool.query("update usuarios set estado='ACTIVO' where id=$1", [USUARIO_CICLOS.sub]);
    const id = await f.crear();
    await expect(f.conexion.pool.query('delete from usuarios where id=$1', [USUARIO_CICLOS.sub])).rejects.toMatchObject({ code: expect.stringMatching(/^(23001|23503)$/) });
    expect((await f.conexion.pool.query('select id from usuarios where id=$1', [USUARIO_CICLOS.sub])).rows).toHaveLength(1);
    await expect(f.conexion.pool.query('update ciclos_productivos set responsable_seguimiento_id=$1 where id=$2', [inexistente, id]))
      .rejects.toMatchObject({ code: '23503' });
    await f.conexion.pool.query("update usuarios set estado='INACTIVO' where id=$1", [USUARIO_CICLOS.sub]);
    expect((await consultar(id)).json().data.responsableSeguimientoId).toBe(USUARIO_CICLOS.sub);
  });
  it('crea un responsable por HTTP y permite autenticarlo y asignarlo desde otra instancia', async () => {
    const sistemaId = crypto.randomUUID();
    const sistemaEmail = `sistema-${sistemaId}@example.test`;
    const { hash, salt } = CryptoAuthService.hashPassword('SistemaPrueba123!');
    await f.conexion.pool.query(`insert into usuarios(id,nombre,apellido,email,password_hash,salt,perfil,debe_cambiar_password)
      values ($1,'Admin','Sistema',$2,$3,$4,'ADMIN_SISTEMA',false)`, [sistemaId, sistemaEmail, hash, salt]);
    const sesion = await f.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: sistemaEmail, password: 'SistemaPrueba123!' } });
    expect(sesion.statusCode).toBe(200);
    const headersSistema = { authorization: `Bearer ${sesion.json().data.token}` };
    const email = `responsable-${crypto.randomUUID()}@example.test`;
    const creado = await f.app.inject({ method: 'POST', url: '/api/v1/usuarios', headers: headersSistema,
      payload: { nombre: 'Responsable', apellido: 'Persistente', nombreUsuario: crypto.randomUUID(), email,
        password: 'PruebaSegura123!', perfil: 'ENCARGADO_CAMPO' } });
    expect(creado.statusCode).toBe(201);
    const responsableId = creado.json().data.id;
    const otra = crearServidorProduccion({ connectionString: f.connectionString, logger: false });
    try {
      const login = await otra.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'PruebaSegura123!' } });
      expect(login.statusCode).toBe(200);
      expect(login.body).not.toContain('passwordHash');
      expect((await registrar({ responsableSeguimientoId: responsableId })).statusCode).toBe(201);
      const duplicado = await otra.app.inject({ method: 'POST', url: '/api/v1/usuarios', headers: headersSistema,
        payload: { nombre: 'Responsable', apellido: 'Duplicado', nombreUsuario: crypto.randomUUID(), email,
          password: 'PruebaSegura123!', perfil: 'ENCARGADO_CAMPO' } });
      expect(duplicado.statusCode).toBe(409);
    } finally { await otra.app.close(); }
  });
});
