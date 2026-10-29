import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from '../helpers/esquema-postgres-aislado.fixture.js';
import { DrizzleUsuariosRepository } from '../../src/infrastructure/database/repositories/drizzle-usuarios.repository.js';
import { PerfilUsuario, Usuario } from '../../src/core/domain/entities/usuario.entity.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';

const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;
const sistemaId = 'a0000000-0000-4000-8000-000000000061';
const anaId = 'b0000000-0000-4000-8000-000000000061';
const juanId = 'c0000000-0000-4000-8000-000000000061';
const inexistente = 'd0000000-0000-4000-8000-000000000061';
const password = 'PruebaSegura123!';

describe.skipIf(!connectionString)('AGRUL-053 CU61 con HTTP y PostgreSQL reales', () => {
  let aislado: Awaited<ReturnType<typeof crearEsquemaPostgresAislado>> | undefined;
  let conexion: ReturnType<typeof createDatabaseConnection>;
  let repo: DrizzleUsuariosRepository;
  let app: FastifyInstance;
  let token: string;
  let hash: string;
  let salt: string;
  let estadoPublico: unknown;
  const snapshotPublico = async () => (await conexion.pool.query(`select
    md5(coalesce(jsonb_agg(jsonb_build_object('id',id,'perfil',perfil,'estado',estado,'version',version_sesion) order by id)::text,'')) as usuarios,
    (select count(*)::int from public.sesiones_usuarios) as sesiones,
    (select count(*)::int from public.auditoria_seguridad_log) as auditoria,
    (select count(*)::int from public.registro_modificaciones) as modificaciones from public.usuarios`)).rows;

  beforeEach(async () => {
    aislado = undefined;
    if (!connectionString) throw new Error('Se requiere conexión explícita.');
    aislado = await crearEsquemaPostgresAislado(connectionString);
    conexion = aislado.connection;
    repo = new DrizzleUsuariosRepository(conexion.db);
    estadoPublico = await snapshotPublico();
    ({ hash, salt } = CryptoAuthService.hashPassword(password));
    app = crearServidorProduccion({ connectionString: aislado.connectionString, logger: false }).app;
    await app.ready();
    for (const usuario of [
      { id: sistemaId, nombre: 'Admin', apellido: 'Sistema', nombreUsuario: 'sistema', email: 'sistema@example.test', perfil: 'ADMIN_SISTEMA' as const },
      { id: anaId, nombre: 'Ana', apellido: 'Pérez', nombreUsuario: 'huerta.norte', email: 'ana@example.test', perfil: 'ENCARGADO_CAMPO' as const, estado: 'INACTIVO' as const },
      { id: juanId, nombre: 'Juan', apellido: 'Pérez', nombreUsuario: 'huerta.sur', email: 'juan@example.test', perfil: 'ENCARGADO_CAMPO' as const },
    ]) await repo.guardar(Usuario.crear({ ...usuario, passwordHash: hash, salt }));
    token = await iniciarSesion();
  }, 60000);
  afterEach(async () => {
    try {
      await app?.close();
      if (aislado) expect(await snapshotPublico()).toEqual(estadoPublico);
    } finally { await aislado?.cerrar(); aislado = undefined; }
  });

  async function iniciarSesion(nombreUsuario = 'sistema') {
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { nombreUsuario, password } });
    expect(login.statusCode).toBe(200);
    return login.json<{ data: { token: string } }>().data.token;
  }
  function consultar(ruta = '/usuarios', authToken: string | null = token) {
    return app.inject({ url: `/api/v1${ruta}`, headers: authToken ? { authorization: `Bearer ${authToken}` } : {} });
  }

  it('combina filtros y busca por nombre de usuario sin distinguir mayúsculas', async () => {
    const res = await consultar('/usuarios?perfil=ENCARGADO_CAMPO&estado=INACTIVO&busqueda=%20HUERTA.NORTE%20');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ success: true, error: null, data: [{ id: anaId, nombreUsuario: 'huerta.norte' }] });
    expect(res.json().data).toHaveLength(1);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).not.toContain(hash);
    expect(res.body).not.toContain(salt);
    expect(res.body).not.toContain(password);
    expect(res.body).not.toContain('passwordHash');
    expect(res.body).not.toContain('salt');
  });

  it.each(['Ana', 'Pérez', 'ana@example.test', 'huerta.norte'])('busca el texto literal en %s', async busqueda => {
    const res = await consultar(`/usuarios?estado=INACTIVO&busqueda=${encodeURIComponent(busqueda)}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().data.map((usuario: { id: string }) => usuario.id)).toEqual([anaId]);
  });

  it('devuelve una lista vacía cuando los filtros no coinciden y trata SQL y comodines como texto', async () => {
    for (const busqueda of ["' OR 1=1 --", '%']) {
      const res = await consultar(`/usuarios?busqueda=${encodeURIComponent(busqueda)}`);
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([]);
    }
    expect((await consultar('/usuarios?perfil=ADMINISTRADOR&busqueda=huerta.norte')).json().data).toEqual([]);
  });

  it('consulta por id después de reconstruir el servidor y no expone credenciales', async () => {
    await app.close();
    app = crearServidorProduccion({ connectionString: aislado!.connectionString, logger: false }).app;
    const res = await consultar(`/usuarios/${anaId}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toMatchObject({ id: anaId, perfil: 'ENCARGADO_CAMPO', estado: 'INACTIVO' });
    expect(res.json().data).not.toHaveProperty('passwordHash');
    expect(res.json().data).not.toHaveProperty('salt');
    expect(res.headers['cache-control']).toBe('no-store');
    expect((await consultar(`/usuarios/${inexistente}`)).statusCode).toBe(404);
  });

  it.each(['/usuarios', `/usuarios/${anaId}`])('exige autenticación en %s', async ruta => {
    expect((await consultar(ruta, null)).statusCode).toBe(401);
  });

  it.each(['ADMINISTRADOR', 'ENCARGADO'] as const)('preserva la consulta general existente de %s', async perfil => {
    await conexion.pool.query('update usuarios set perfil=$1 where id=$2', [perfil, sistemaId]);
    const sesion = await iniciarSesion();
    expect((await consultar('/usuarios', sesion)).statusCode).toBe(200);
    expect((await consultar(`/usuarios/${anaId}`, sesion)).statusCode).toBe(200);
  });

  it.each(['ENCARGADO_CAMPO', 'OPERARIO', 'ASESOR_AGRONOMO'] satisfies PerfilUsuario[])(
    '%s solo puede consultar su propia ficha', async perfil => {
      await conexion.pool.query('update usuarios set perfil=$1 where id=$2', [perfil, sistemaId]);
      const sesion = await iniciarSesion();
      expect((await consultar(`/usuarios/${sistemaId}`, sesion)).statusCode).toBe(200);
      expect((await consultar(`/usuarios/${sistemaId.toUpperCase()}`, sesion)).statusCode).toBe(200);
      expect((await consultar('/usuarios', sesion)).statusCode).toBe(403);
      expect((await consultar(`/usuarios/${anaId}`, sesion)).statusCode).toBe(403);
      expect((await consultar(`/usuarios/${inexistente}`, sesion)).statusCode).toBe(403);
    });

  it.each(["estado='INACTIVO'", "estado='BLOQUEADO'", "perfil='OPERARIO'", 'debe_cambiar_password=true'])(
    'revalida permisos y estado con un token anterior: %s', async cambio => {
      await conexion.pool.query(`update usuarios set ${cambio} where id=$1`, [sistemaId]);
      for (const ruta of ['/usuarios', `/usuarios/${anaId}`]) {
        const res = await consultar(ruta);
        expect(res.statusCode).toBe(403);
        expect(res.json().data).toBeNull();
        expect(res.body).not.toContain('ana@example.test');
      }
    });

  it('la propia ficha sigue disponible durante el cambio inicial de contraseña', async () => {
    await conexion.pool.query('update usuarios set debe_cambiar_password=true where id=$1', [sistemaId]);
    const sesionInicial = await iniciarSesion();
    expect((await consultar(`/usuarios/${sistemaId}`, sesionInicial)).statusCode).toBe(200);
  });

  it.each(['?perfil=SUPERUSUARIO', '?estado=OTRO', '?rol=ADMIN_SISTEMA', '?desconocido=valor',
    `?busqueda=${'x'.repeat(256)}`, '?perfil=ADMIN_SISTEMA&perfil=ENCARGADO_CAMPO'])(
    'rechaza filtros inválidos o desconocidos: %s', async query => {
      const res = await consultar(`/usuarios${query}`);
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });

  it('acepta filtros canónicos e históricos y mantiene el orden de los resultados', async () => {
    for (const perfil of ['ADMIN_SISTEMA', 'ADMINISTRADOR', 'ENCARGADO_CAMPO', 'ENCARGADO', 'OPERARIO', 'ASESOR_AGRONOMO']) {
      const res = await consultar(`/usuarios?perfil=${perfil}`);
      expect(res.statusCode).toBe(200);
      expect(res.json().data.every((usuario: { perfil: string }) => usuario.perfil === perfil)).toBe(true);
    }
    const res = await consultar('/usuarios?busqueda=huerta');
    expect(res.json().data.map((usuario: { id: string }) => usuario.id)).toEqual([anaId, juanId]);
  });
});
