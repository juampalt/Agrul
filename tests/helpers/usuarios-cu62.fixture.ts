import { expect } from 'vitest';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { runMigrations } from '../../src/infrastructure/database/migrate.js';
import { DrizzleUsuariosRepository } from '../../src/infrastructure/database/repositories/drizzle-usuarios.repository.js';
import { DrizzleFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-fincas.repository.js';
import { Usuario } from '../../src/core/domain/entities/usuario.entity.js';
import { Finca } from '../../src/core/domain/entities/finca.entity.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';
import { limpiarUsuariosSeguridad } from './limpiar-usuarios-seguridad.js';

export const SISTEMA_CU62 = 'a0000000-0000-4000-8000-000000000062';
export const USUARIO_CU62 = 'b0000000-0000-4000-8000-000000000062';
export const FINCA_CU62 = 'f0000000-0000-4000-8000-000000000062';
export const INEXISTENTE_CU62 = 'e0000000-0000-4000-8000-000000000062';

export interface DeltaCu62 { dato_modificado: string; valor_anterior: unknown; valor_nuevo: unknown;
  usuario_id: string; usuario_afectado_id: string; fecha_hora: Date }

export class UsuariosCu62Fixture {
  readonly conexion;
  readonly repo;
  servidor!: ReturnType<typeof crearServidorProduccion>;
  token = '';
  readonly password = 'PruebaSegura123!';
  hash = '';
  salt = '';
  constructor(readonly connectionString?: string, private readonly nombreBase = 'agrul_test_agrul_053_etapa4') {
    this.conexion = createDatabaseConnection(connectionString);
    this.repo = new DrizzleUsuariosRepository(this.conexion.db);
  }
  get app() { return this.servidor.app; }
  async preparar() {
    const { rows } = await this.conexion.pool.query('select current_database() as nombre');
    if (!['agrul_test_agrul_053_etapa4', 'agrul_test_agrul_053_etapa5'].includes(this.nombreBase)
      || rows[0].nombre !== this.nombreBase) throw new Error('Base de pruebas de seguridad incorrecta.');
    await runMigrations(this.connectionString);
    ({ hash: this.hash, salt: this.salt } = CryptoAuthService.hashPassword(this.password));
    this.servidor = crearServidorProduccion({ connectionString: this.connectionString, logger: false });
    await this.app.ready();
  }
  async sembrar() {
    await limpiarUsuariosSeguridad(this.conexion.pool);
    await this.conexion.pool.query('delete from fincas');
    await new DrizzleFincasRepository(this.conexion.db).guardar(Finca.crear({ id: FINCA_CU62, nombre: 'Finca CU62',
      provincia: 'Tucumán', departamento: 'Lules', localidad: 'San Pablo', superficieTotalHa: 10 }));
    for (const usuario of [
      { id: SISTEMA_CU62, nombre: 'Admin', apellido: 'Sistema', nombreUsuario: 'sistema', email: 'sistema@example.test', perfil: 'ADMIN_SISTEMA' as const },
      { id: USUARIO_CU62, nombre: 'Ana', apellido: 'Prueba', nombreUsuario: 'ana.campo', email: 'ana@example.test', perfil: 'ENCARGADO_CAMPO' as const },
    ]) await this.repo.guardar(Usuario.crear({ ...usuario, passwordHash: this.hash, salt: this.salt }));
    this.token = await this.login();
  }
  async login(nombreUsuario = 'sistema') {
    const respuesta = await this.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { nombreUsuario, password: this.password } });
    expect(respuesta.statusCode).toBe(200);
    return respuesta.json<{ data: { token: string } }>().data.token;
  }
  modificar(payload: object, id = USUARIO_CU62, token: string | null = this.token) {
    return this.app.inject({ method: 'PUT', url: `/api/v1/usuarios/${id}`, payload,
      headers: token ? { authorization: `Bearer ${token}` } : {} });
  }
  cambios() {
    return this.conexion.pool.query<DeltaCu62>('select * from registro_modificaciones where usuario_afectado_id=$1', [USUARIO_CU62]);
  }
  async cantidadLogs() {
    return (await this.conexion.pool.query<{ total: number }>('select count(*)::int as total from auditoria_seguridad_log where entidad_id=$1', [USUARIO_CU62])).rows[0].total;
  }
  async cerrar() { await this.servidor?.app.close(); await this.conexion.pool.end(); }
}
