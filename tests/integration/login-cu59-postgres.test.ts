import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FastifyInstance } from 'fastify';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { runMigrations } from '../../src/infrastructure/database/migrate.js';
import { limpiarUsuariosSeguridad } from '../helpers/limpiar-usuarios-seguridad.js';
import { DrizzleUsuariosRepository } from '../../src/infrastructure/database/repositories/drizzle-usuarios.repository.js';
import { Usuario } from '../../src/core/domain/entities/usuario.entity.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';

const connectionString = process.env.SEGURIDAD_TEST_DATABASE_URL;
const id = 'a0000000-0000-4000-8000-000000000053';
const password = 'Password1234';

describe.skipIf(!connectionString)('AGRUL-053 CU59 con PostgreSQL y bootstrap reales', () => {
  const conexion = createDatabaseConnection(connectionString);
  const repo = new DrizzleUsuariosRepository(conexion.db);
  let app: FastifyInstance;

  beforeAll(async () => {
    const { rows } = await conexion.pool.query('select current_database() as nombre');
    if (rows[0].nombre !== 'agrul_test_agrul_053_etapa1') throw new Error('Base de pruebas CU59 incorrecta.');
    await runMigrations(connectionString);
    app = crearServidorProduccion({ connectionString, logger: false }).app;
    await app.ready();
  });
  beforeEach(async () => {
    await limpiarUsuariosSeguridad(conexion.pool);
    const { hash, salt } = CryptoAuthService.hashPassword(password);
    await repo.guardar(Usuario.crear({ id, nombre: 'Ana', apellido: 'Prueba', email: 'ana@example.test',
      nombreUsuario: 'Ana.Campo', perfil: 'ENCARGADO', passwordHash: hash, salt }));
  });
  afterAll(async () => { await app?.close(); await conexion.pool.end(); });

  function login(identificador: object, clave = password) {
    return app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { ...identificador, password: clave } });
  }

  it('persiste credenciales protegidas y autentica por ambos identificadores tras reconstruir el servidor', async () => {
    await app.close();
    app = crearServidorProduccion({ connectionString, logger: false }).app;
    await app.ready();
    for (const identificador of [{ nombreUsuario: ' ANA.CAMPO ' }, { email: 'ana@example.test' }]) {
      const respuesta = await login(identificador);
      expect(respuesta.statusCode).toBe(200);
      expect(CryptoAuthService.verifyToken(respuesta.json().data.token)?.sub).toBe(id);
      expect(respuesta.body).not.toContain('passwordHash');
      expect(respuesta.body).not.toContain(password);
    }
    const { rows } = await conexion.pool.query('select nombre_usuario,password_hash,salt,ultimo_acceso from usuarios where id=$1', [id]);
    expect(rows[0].nombre_usuario).toBe('ana.campo');
    expect(rows[0].password_hash).not.toBe(password);
    expect(rows[0].salt).toBeTruthy();
    expect(rows[0].ultimo_acceso).not.toBeNull();
  });

  it('mantiene el ingreso por correo de usuarios anteriores sin nombre de usuario', async () => {
    await conexion.pool.query('update usuarios set nombre_usuario=null where id=$1', [id]);
    expect((await login({ email: 'ana@example.test' })).statusCode).toBe(200);
    expect((await login({ nombreUsuario: 'ana.campo' })).statusCode).toBe(401);
  });

  it('enforce unicidad sin distinción de mayúsculas en PostgreSQL', async () => {
    await expect(conexion.pool.query(`insert into usuarios(id,nombre,apellido,email,password_hash,salt,perfil,nombre_usuario)
      select 'b0000000-0000-4000-8000-000000000053',nombre,apellido,'otra@example.test',password_hash,salt,perfil,'ANA.CAMPO'
      from usuarios where id=$1`, [id])).rejects.toMatchObject({ code: '23505' });
  });

  it('persiste los intentos y rechaza cuentas bloqueadas o inactivas', async () => {
    for (let intento = 1; intento <= 5; intento++) {
      expect((await login({ nombreUsuario: 'ana.campo' }, 'Incorrecta123')).statusCode).toBe(intento < 5 ? 401 : 403);
    }
    expect((await repo.buscarPorId(id))?.estado).toBe('BLOQUEADO');
    expect((await repo.buscarPorId(id))?.intentosFallidos).toBe(5);
    expect((await login({ email: 'ana@example.test' })).statusCode).toBe(403);
    await conexion.pool.query("update usuarios set estado='INACTIVO' where id=$1", [id]);
    expect((await login({ nombreUsuario: 'ana.campo' })).statusCode).toBe(403);
  });
});
