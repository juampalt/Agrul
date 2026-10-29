import { expect } from 'vitest';
import { crearServidorProduccion } from '../../src/bootstrap.js';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from './esquema-postgres-aislado.fixture.js';
import { DrizzleUsuariosRepository } from '../../src/infrastructure/database/repositories/drizzle-usuarios.repository.js';
import { DrizzleFincasRepository } from '../../src/infrastructure/database/repositories/drizzle-fincas.repository.js';
import { Usuario } from '../../src/core/domain/entities/usuario.entity.js';
import { Finca } from '../../src/core/domain/entities/finca.entity.js';
import { CryptoAuthService } from '../../src/infrastructure/services/crypto-auth.service.js';

export const SISTEMA_CU62 = 'a0000000-0000-4000-8000-000000000062';
export const USUARIO_CU62 = 'b0000000-0000-4000-8000-000000000062';
export const FINCA_CU62 = 'f0000000-0000-4000-8000-000000000062';
export const INEXISTENTE_CU62 = 'e0000000-0000-4000-8000-000000000062';

export interface DeltaCu62 { dato_modificado: string; valor_anterior: unknown; valor_nuevo: unknown;
  usuario_id: string; usuario_afectado_id: string; fecha_hora: Date }

export class UsuariosCu62Fixture {
  conexion!: ReturnType<typeof createDatabaseConnection>;
  repo!: DrizzleUsuariosRepository;
  private aislado?: Awaited<ReturnType<typeof crearEsquemaPostgresAislado>>;
  private estadoPublico: unknown;
  connectionString = '';
  servidor!: ReturnType<typeof crearServidorProduccion>;
  token = '';
  readonly password = 'PruebaSegura123!';
  hash = '';
  salt = '';
  constructor(private readonly urlBase?: string) {}
  get app() { return this.servidor.app; }
  async preparar() {
    if (!this.urlBase) throw new Error('Se requiere conexión explícita.');
    this.aislado = await crearEsquemaPostgresAislado(this.urlBase);
    this.conexion = this.aislado.connection;
    this.repo = new DrizzleUsuariosRepository(this.conexion.db);
    this.connectionString = this.aislado.connectionString;
    this.estadoPublico = await this.snapshotPublico();
    ({ hash: this.hash, salt: this.salt } = CryptoAuthService.hashPassword(this.password));
    this.servidor = crearServidorProduccion({ connectionString: this.connectionString, logger: false });
    await this.app.ready();
  }
  async sembrar() {
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
  private async snapshotPublico() {
    return (await this.conexion.pool.query(`select
      md5(coalesce(jsonb_agg(jsonb_build_object('id',id,'perfil',perfil,'estado',estado,'version',version_sesion) order by id)::text,'')) as usuarios,
      (select count(*)::int from public.sesiones_usuarios) as sesiones,
      (select count(*)::int from public.auditoria_seguridad_log) as auditoria,
      (select count(*)::int from public.registro_modificaciones) as modificaciones,
      (select count(*)::int from public.usuario_finca_asignacion) as asignaciones,
      (select md5(coalesce(jsonb_agg(to_jsonb(f) order by id)::text,'')) from public.fincas f) as fincas
      from public.usuarios`)).rows;
  }
  async cerrar() {
    try {
      await this.servidor?.app.close();
      if (this.aislado) expect(await this.snapshotPublico()).toEqual(this.estadoPublico);
    } finally { await this.aislado?.cerrar(); this.aislado = undefined; }
  }
}
