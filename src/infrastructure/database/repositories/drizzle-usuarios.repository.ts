import { and, eq, sql } from 'drizzle-orm';
import { Usuario, PerfilUsuario, EstadoUsuario } from '../../../core/domain/entities/usuario.entity.js';
import { EntidadNoEncontradaError, UsuarioDuplicadoError } from '../../../core/domain/errors/domain.error.js';
import { FiltrosUsuarios, UsuariosRepositoryPort } from '../../../core/ports/usuarios-repository.port.js';
import { AgrulDatabase, AgrulTransaction } from '../connection.js';
import { usuariosTable } from '../schema/tables.js';

export class DrizzleUsuariosRepository implements UsuariosRepositoryPort {
  constructor(private readonly db: AgrulDatabase | AgrulTransaction) {}

  async guardar(usuario: Usuario): Promise<void> {
    await this.conUnicidad(usuario, () => this.db.insert(usuariosTable).values(this.valores(usuario)));
  }
  async actualizar(usuario: Usuario): Promise<void> {
    const filas = await this.conUnicidad(usuario, () => this.db.update(usuariosTable)
      .set(this.valores(usuario)).where(eq(usuariosTable.id, usuario.id)).returning({ id: usuariosTable.id }));
    if (!filas.length) throw new EntidadNoEncontradaError('Usuario', usuario.id);
  }
  async buscarPorId(id: string): Promise<Usuario | null> {
    const [fila] = await this.db.select().from(usuariosTable).where(eq(usuariosTable.id, id));
    return fila ? this.mapear(fila) : null;
  }
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const [fila] = await this.db.select().from(usuariosTable).where(sql`lower(${usuariosTable.email}) = ${email.trim().toLowerCase()}`);
    return fila ? this.mapear(fila) : null;
  }
  async listar(filtros: FiltrosUsuarios = {}): Promise<Usuario[]> {
    const condiciones = [];
    if (filtros.perfil) condiciones.push(eq(usuariosTable.perfil, filtros.perfil));
    if (filtros.estado) condiciones.push(eq(usuariosTable.estado, filtros.estado));
    const busqueda = filtros.busqueda?.trim();
    if (busqueda) condiciones.push(sql`position(lower(${busqueda}) in lower(concat_ws(' ', ${usuariosTable.nombre}, ${usuariosTable.apellido}, ${usuariosTable.nombreUsuario}, ${usuariosTable.email}))) > 0`);
    return (await this.db.select().from(usuariosTable).where(and(...condiciones))
      .orderBy(usuariosTable.apellido, usuariosTable.nombre, usuariosTable.id)).map((fila) => this.mapear(fila));
  }

  async buscarPorNombreUsuario(nombreUsuario: string): Promise<Usuario | null> {
    const [fila] = await this.db.select().from(usuariosTable)
      .where(sql`lower(${usuariosTable.nombreUsuario}) = ${nombreUsuario.trim().toLowerCase()}`);
    return fila ? this.mapear(fila) : null;
  }

  private valores(usuario: Usuario) {
    const { nombreCompleto: _nombreCompleto, versionSesion: _versionSesion, ...datos } = usuario.toJSON();
    return { ...datos, passwordHash: usuario.passwordHash, salt: usuario.salt };
  }
  private mapear(fila: typeof usuariosTable.$inferSelect): Usuario {
    return Usuario.reconstituir({ ...fila, perfil: fila.perfil as PerfilUsuario, estado: fila.estado as EstadoUsuario });
  }
  private async conUnicidad<T>(usuario: Usuario, operacion: () => PromiseLike<T>): Promise<T> {
    try { return await operacion(); }
    catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505' && 'constraint' in error) {
        if (error.constraint === 'usuarios_email_unique' || error.constraint === 'usuarios_email_normalizado_unique') {
          throw new UsuarioDuplicadoError(usuario.email);
        }
        if (error.constraint === 'usuarios_nombre_usuario_unique') {
          throw new UsuarioDuplicadoError(usuario.nombreUsuario ?? '', 'nombre de usuario');
        }
      }
      throw error;
    }
  }
}
