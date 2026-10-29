import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from '../helpers/esquema-postgres-aislado.fixture.js';
import { DrizzleUsuariosRepository } from '../../src/infrastructure/database/repositories/drizzle-usuarios.repository.js';
import { PERFILES_CANONICOS, PERFILES_USUARIO, Usuario } from '../../src/core/domain/entities/usuario.entity.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';

const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;
const responsableId = 'a0000000-0000-4000-8000-000000000060';
const password = 'Password1234';
const datos = { nombre: 'Ana', apellido: 'Prueba', nombreUsuario: 'ana.campo', email: 'ana@example.test',
  password, perfil: 'ENCARGADO_CAMPO' };

describe.skipIf(!connectionString)('AGRUL-053 CU60 con HTTP y PostgreSQL reales', () => {
  let aislado: Awaited<ReturnType<typeof crearEsquemaPostgresAislado>> | undefined;
  let conexion: ReturnType<typeof createDatabaseConnection>;
  let repo: DrizzleUsuariosRepository;
  let app: FastifyInstance;
  let token: string;
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
    app = crearServidorProduccion({ connectionString: aislado.connectionString, logger: false }).app;
    await app.ready();
    const { hash, salt } = CryptoAuthService.hashPassword(password);
    await repo.guardar(Usuario.crear({ id: responsableId, nombre: 'Admin', apellido: 'Sistema',
      nombreUsuario: 'sistema', email: 'sistema@example.test', perfil: 'ADMIN_SISTEMA', passwordHash: hash, salt }));
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { nombreUsuario: 'sistema', password } });
    expect(login.statusCode).toBe(200);
    token = login.json().data.token;
  }, 60000);
  afterEach(async () => {
    try {
      await app?.close();
      if (aislado) expect(await snapshotPublico()).toEqual(estadoPublico);
    } finally { await aislado?.cerrar(); aislado = undefined; }
  });

  function registrar(payload: object = datos, authToken: string | null = token) {
    return app.inject({ method: 'POST', url: '/api/v1/usuarios', payload,
      headers: authToken ? { authorization: `Bearer ${authToken}` } : {} });
  }

  it.each(PERFILES_CANONICOS)('registra %s y permite autenticar la cuenta persistida', async perfil => {
    const res = await registrar({ ...datos, perfil, nombreUsuario: ' ANA.CAMPO ' });
    expect(res.statusCode).toBe(201);
    expect(res.json().data).toMatchObject({ perfil, nombreUsuario: 'ana.campo', debeCambiarPassword: true });
    expect(res.body).not.toContain(password);
    expect(res.body).not.toContain('passwordHash');
    expect(res.body).not.toContain('salt');
    const { rows } = await conexion.pool.query('select * from usuarios where nombre_usuario=$1', ['ana.campo']);
    expect(rows[0].perfil).toBe(perfil);
    expect(CryptoAuthService.verifyPassword(password, rows[0].password_hash, rows[0].salt)).toBe(true);
    await app.close();
    app = crearServidorProduccion({ connectionString: aislado!.connectionString, logger: false }).app;
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { nombreUsuario: 'ana.campo', password } });
    expect(login.statusCode).toBe(200);
    expect(CryptoAuthService.verifyToken(login.json().data.token)?.perfil).toBe(perfil);
  });

  it('rechaza el acceso anónimo', async () => {
    expect((await registrar(datos, null)).statusCode).toBe(401);
  });

  it.each(PERFILES_USUARIO.filter(perfil => perfil !== 'ADMIN_SISTEMA'))('deniega el registro al perfil %s', async perfil => {
    await conexion.pool.query('update usuarios set perfil=$1 where id=$2', [perfil, responsableId]);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { nombreUsuario: 'sistema', password } });
    expect((await registrar(datos, login.json().data.token)).statusCode).toBe(403);
    expect(await repo.buscarPorNombreUsuario(datos.nombreUsuario)).toBeNull();
  });

  it.each(["estado='INACTIVO'", "estado='BLOQUEADO'", "perfil='ADMINISTRADOR'", 'debe_cambiar_password=true'])(
    'revalida al responsable aunque conserve un JWT previo: %s', async cambio => {
      await conexion.pool.query(`update usuarios set ${cambio} where id=$1`, [responsableId]);
      expect((await registrar()).statusCode).toBe(403);
      expect(await repo.buscarPorEmail(datos.email)).toBeNull();
    });

  it.each(['nombreUsuario', 'email'] as const)('resuelve altas concurrentes con %s equivalente sin filtrar SQL', async campo => {
    const segundo = { ...datos, nombreUsuario: 'otra', email: 'otra@example.test', [campo]: datos[campo].toUpperCase() };
    const respuestas = await Promise.all([registrar(), registrar(segundo)]);
    expect(respuestas.map(res => res.statusCode).sort()).toEqual([201, 409]);
    const conflicto = respuestas.find(res => res.statusCode === 409)!;
    expect(conflicto.json().error.code).toBe('USUARIO_DUPLICADO');
    expect(conflicto.body).not.toContain('constraint');
    expect(conflicto.body).not.toContain(password);
    expect((await repo.listar()).length).toBe(2);
  });

  it.each([
    { nombreUsuario: '' }, { nombreUsuario: 'con espacios' }, { nombreUsuario: undefined },
    { nombre: ' ' }, { apellido: ' ' }, { password: 'sololetras' }, { perfil: 'OPERARIO' },
    { perfil: 'ADMINISTRADOR_DEL_SISTEMA' }, { perfil: 'SUPERUSUARIO' }, { passwordHash: 'inyectado' },
  ])('rechaza entradas inválidas sin guardar la cuenta: %j', async cambio => {
    const res = await registrar({ ...datos, ...cambio });
    expect([400, 422]).toContain(res.statusCode);
    expect((await repo.listar()).length).toBe(1);
  });

  it('no concede permisos productivos al Administrador del Sistema por herencia implícita', async () => {
    const res = await app.inject({ url: '/api/v1/cultivos', headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(403);
  });

  it('PostgreSQL impide perfiles arbitrarios y correos equivalentes aunque se omita la API', async () => {
    await expect(conexion.pool.query("update usuarios set perfil='SUPERUSUARIO' where id=$1", [responsableId]))
      .rejects.toMatchObject({ code: '23514' });
    await expect(conexion.pool.query(`insert into usuarios(id,nombre,apellido,email,password_hash,salt,perfil)
      select 'b0000000-0000-4000-8000-000000000060',nombre,apellido,upper(email),password_hash,salt,perfil
      from usuarios where id=$1`, [responsableId])).rejects.toMatchObject({ code: '23505' });
  });
});
