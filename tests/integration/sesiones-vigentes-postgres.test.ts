import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';
import { SessionInactivityService } from '../../src/infrastructure/services/session-inactivity.service.js';
import { UsuariosCu62Fixture, USUARIO_CU62, FINCA_CU62 } from '../helpers/usuarios-cu62.fixture.js';

const connectionString = process.env.SESIONES_TEST_DATABASE_URL;
describe.skipIf(!connectionString)('AGRUL-053: vigencia y revocación real de sesiones PostgreSQL', () => {
  const f = new UsuariosCu62Fixture(connectionString, 'agrul_test_agrul_053_etapa5');
  beforeAll(async () => { await f.preparar(); });
  beforeEach(async () => { await f.sembrar(); });
  afterEach(() => { SessionInactivityService.setTimeoutMs(900000); });
  afterAll(async () => { await f.cerrar(); });

  const headers = (token: string) => ({ authorization: `Bearer ${token}` });
  const me = (token = f.token) => f.app.inject({ url: '/api/v1/auth/me', headers: headers(token) });
  const logout = (token = f.token) => f.app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: headers(token) });
  const cambiar = (token: string, payload: object) => f.app.inject({ method: 'POST', url: '/api/v1/auth/cambiar-password', headers: headers(token), payload });

  it('emite tokens diferentes aun en el mismo segundo y solo guarda sus huellas', async () => {
    const segundo = await f.login();
    expect(segundo).not.toBe(f.token);
    const { rows } = await f.conexion.pool.query('select token_hash from sesiones_usuarios');
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(rows)).not.toContain(f.token);
    expect(JSON.stringify(rows)).not.toContain(segundo);
  });

  it('cierra y audita una sesión; no puede reutilizarse desde otra instancia', async () => {
    expect((await logout()).statusCode).toBe(200);
    expect((await me()).statusCode).toBe(401);
    const otra = crearServidorProduccion({ connectionString, logger: false });
    try { expect((await otra.app.inject({ url: '/api/v1/auth/me', headers: headers(f.token) })).statusCode).toBe(401); }
    finally { await otra.app.close(); }
    const { rows } = await f.conexion.pool.query("select * from auditoria_seguridad_log where accion='LOGOUT'");
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(f.token);
  });

  it('el cierre afecta al token elegido y conserva las otras sesiones del usuario', async () => {
    const segundo = await f.login();
    expect((await logout()).statusCode).toBe(200);
    expect((await me(segundo)).statusCode).toBe(200);
    expect((await me()).statusCode).toBe(401);
  });

  it('exige contraseña actual y revoca los tokens previos cuando cambia la credencial', async () => {
    const token = await f.login('ana.campo');
    const passwordNueva = 'NuevaClaveSegura123!';
    expect((await cambiar(token, { passwordNueva })).statusCode).toBe(401);
    expect((await cambiar(token, { passwordNueva, passwordActual: 'Incorrecta123' })).statusCode).toBe(401);
    expect((await cambiar(token, { passwordNueva, passwordActual: f.password })).statusCode).toBe(200);
    expect((await me(token)).statusCode).toBe(401);
    const login = await f.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { nombreUsuario: 'ana.campo', password: passwordNueva } });
    expect(login.statusCode).toBe(200);
    expect((await me(login.json().data.token)).statusCode).toBe(200);
    const { rows } = await f.conexion.pool.query("select * from auditoria_seguridad_log where accion='CAMBIO_PASSWORD'");
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain(passwordNueva);
    expect(JSON.stringify(rows)).not.toContain('passwordHash');
    expect(JSON.stringify(rows)).not.toContain('salt');
  });

  it.each(['BLOQUEADO', 'INACTIVO'])('rechaza una cuenta %s y no resucita el token al reactivarla', async estado => {
    const token = await f.login('ana.campo');
    expect((await me(token)).statusCode).toBe(200);
    expect((await f.modificar({ estado })).statusCode).toBe(200);
    expect((await me(token)).statusCode).toBe(403);
    expect((await f.modificar({ estado: 'ACTIVO' })).statusCode).toBe(200);
    expect((await me(token)).statusCode).toBe(401);
    expect((await me(await f.login('ana.campo'))).statusCode).toBe(200);
  });

  it('aplica la revocación del rol también a las rutas operativas protegidas', async () => {
    expect((await f.modificar({ perfil: 'ADMINISTRADOR' })).statusCode).toBe(200);
    const token = await f.login('ana.campo');
    expect((await f.app.inject({ url: '/api/v1/cultivos', headers: headers(token) })).statusCode).toBe(200);
    expect((await f.modificar({ perfil: 'ENCARGADO_CAMPO' })).statusCode).toBe(200);
    expect((await f.app.inject({ url: '/api/v1/cultivos', headers: headers(token) })).statusCode).toBe(403);
  });

  it('las asignaciones vigentes reemplazan a las que conserva un JWT antiguo', async () => {
    expect((await f.modificar({ fincaIds: [FINCA_CU62] })).statusCode).toBe(200);
    const token = await f.login('ana.campo');
    const ruta = `/api/v1/fincas/${FINCA_CU62}`;
    expect((await f.app.inject({ url: ruta, headers: headers(token) })).statusCode).toBe(200);
    expect((await f.modificar({ fincaIds: [] })).statusCode).toBe(200);
    expect((await f.app.inject({ url: ruta, headers: headers(token) })).statusCode).toBe(403);
    expect((await f.app.inject({ url: ruta, headers: headers('token-invalido') })).statusCode).toBe(401);
  });

  it('la expiración por inactividad persiste entre instancias y no se evade con cabeceras o un nuevo login', async () => {
    await f.conexion.pool.query("update sesiones_usuarios set ultima_actividad=now()-interval '16 minutes' where token_hash=$1", [CryptoAuthService.hashToken(f.token)]);
    const otra = crearServidorProduccion({ connectionString, logger: false });
    try {
      const res = await otra.app.inject({ url: '/api/v1/auth/me', headers: { ...headers(f.token), 'x-last-activity': String(Date.now() + 3600000) } });
      expect(res.statusCode).toBe(401);
    } finally { await otra.app.close(); }
    expect((await me(await f.login())).statusCode).toBe(200);
    expect((await me()).statusCode).toBe(401);
  });

  it('no acepta un JWT que no tenga una sesión emitida por el login', async () => {
    const payload = CryptoAuthService.verifyToken(f.token)!;
    const noRegistrado = CryptoAuthService.generateToken(payload);
    expect((await me(noRegistrado)).statusCode).toBe(401);
    expect((await me(CryptoAuthService.generateToken({ ...payload, sub: 'no-uuid' }))).statusCode).toBe(401);
  });

  it('el primer ingreso permite cambiar contraseña y exige un nuevo login después', async () => {
    await f.conexion.pool.query('update usuarios set debe_cambiar_password=true where id=$1', [USUARIO_CU62]);
    const token = await f.login('ana.campo');
    expect((await me(token)).statusCode).toBe(200);
    expect((await cambiar(token, { passwordNueva: 'PrimeraClaveNueva123!' })).statusCode).toBe(200);
    expect((await me(token)).statusCode).toBe(401);
  });

  it('confirma todos los intentos fallidos concurrentes y bloquea exactamente al quinto', async () => {
    const respuestas = await Promise.all(Array.from({ length: 5 }, () => f.app.inject({ method: 'POST', url: '/api/v1/auth/login',
      payload: { nombreUsuario: 'ana.campo', password: 'Incorrecta123!' } })));
    expect(respuestas.map(res => res.statusCode).sort()).toEqual([401, 401, 401, 401, 403]);
    expect(await f.repo.buscarPorId(USUARIO_CU62)).toMatchObject({ estado: 'BLOQUEADO', intentosFallidos: 5 });
    expect((await f.conexion.pool.query('select * from sesiones_usuarios where usuario_id=$1', [USUARIO_CU62])).rows).toEqual([]);
  });

  it('protege la utilidad de inactividad de usuarios anónimos y roles operativos', async () => {
    const ruta = '/api/v1/auditoria/simular-inactividad';
    expect((await f.app.inject({ method: 'POST', url: ruta, payload: { timeoutMs: 60000 } })).statusCode).toBe(401);
    const token = await f.login('ana.campo');
    expect((await f.app.inject({ method: 'POST', url: ruta, headers: headers(token), payload: { timeoutMs: 60000 } })).statusCode).toBe(403);
    expect(SessionInactivityService.getTimeoutMs()).toBe(900000);
    expect((await f.app.inject({ method: 'POST', url: ruta, headers: headers(f.token), payload: { timeoutMs: 60000 } })).statusCode).toBe(200);
    expect((await f.app.inject({ method: 'POST', url: ruta, headers: headers(f.token), payload: { desconocido: true } })).statusCode).toBe(400);
  });

  it('el simulador autorizado afecta a las sesiones persistidas del usuario elegido', async () => {
    const token = await f.login('ana.campo');
    const res = await f.app.inject({ method: 'POST', url: '/api/v1/auditoria/simular-inactividad', headers: headers(f.token),
      payload: { usuarioId: USUARIO_CU62, simularSegundosInactividad: 960 } });
    expect(res.statusCode).toBe(200);
    expect((await me(token)).statusCode).toBe(401);
  });

  async function conFalloAuditoria(accion: 'LOGIN' | 'CAMBIO_PASSWORD' | 'LOGOUT', trabajo: () => Promise<void>) {
    await f.conexion.pool.query(`CREATE FUNCTION sesiones_fallar_audit() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'fallo-controlado-sesiones'; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER sesiones_fallo BEFORE INSERT ON auditoria_seguridad_log FOR EACH ROW
      WHEN (NEW.accion='${accion}') EXECUTE FUNCTION sesiones_fallar_audit();`);
    try { await trabajo(); }
    finally { await f.conexion.pool.query('DROP TRIGGER sesiones_fallo ON auditoria_seguridad_log; DROP FUNCTION sesiones_fallar_audit();'); }
  }

  it('revierte sesión y último acceso si falla la auditoría del login', async () => {
    await conFalloAuditoria('LOGIN', async () => {
      const res = await f.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { nombreUsuario: 'ana.campo', password: f.password } });
      expect(res.statusCode).toBe(500);
      expect((await f.repo.buscarPorId(USUARIO_CU62))?.ultimoAcceso).toBeNull();
      expect((await f.conexion.pool.query('select * from sesiones_usuarios where usuario_id=$1', [USUARIO_CU62])).rows).toEqual([]);
    });
  });

  it('revierte la contraseña y su versión de sesión si falla la auditoría', async () => {
    const token = await f.login('ana.campo');
    await conFalloAuditoria('CAMBIO_PASSWORD', async () => {
      expect((await cambiar(token, { passwordActual: f.password, passwordNueva: 'NoGuardarClave123!' })).statusCode).toBe(500);
      const usuario = (await f.repo.buscarPorId(USUARIO_CU62))!;
      expect(CryptoAuthService.verifyPassword(f.password, usuario.passwordHash, usuario.salt)).toBe(true);
      expect(usuario.versionSesion).toBe(0);
      expect((await me(token)).statusCode).toBe(200);
    });
  });

  it('no declara cerrada una sesión si su auditoría falla y la transacción se revierte', async () => {
    await conFalloAuditoria('LOGOUT', async () => {
      expect((await logout()).statusCode).toBe(500);
      expect((await me()).statusCode).toBe(200);
    });
  });
});
