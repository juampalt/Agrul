import { and, eq, sql } from 'drizzle-orm';
import { Usuario, PerfilUsuario, EstadoUsuario } from '../../../core/domain/entities/usuario.entity.js';
import { EntidadNoEncontradaError, UsuarioDuplicadoError } from '../../../core/domain/errors/domain.error.js';
import { FiltrosUsuarios, UsuariosRepositoryPort } from '../../../core/ports/usuarios-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { usuariosTable } from '../schema/tables.js';

export class DrizzleUsuariosRepository implements UsuariosRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async guardar(usuario: Usuario): Promise<void> {
    await this.conUnicidad(usuario.email, () => this.db.insert(usuariosTable).values(this.valores(usuario)));
  }
  async actualizar(usuario: Usuario): Promise<void> {
    const filas = await this.conUnicidad(usuario.email, () => this.db.update(usuariosTable)
      .set(this.valores(usuario)).where(eq(usuariosTable.id, usuario.id)).returning({ id: usuariosTable.id }));
    if (!filas.length) throw new EntidadNoEncontradaError('Usuario', usuario.id);
  }
  async buscarPorId(id: string): Promise<Usuario | null> {
    const [fila] = await this.db.select().from(usuariosTable).where(eq(usuariosTable.id, id));
    return fila ? this.mapear(fila) : null;
  }
  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const [fila] = await this.db.select().from(usuariosTable).where(eq(usuariosTable.email, email.trim().toLowerCase()));
    return fila ? this.mapear(fila) : null;
  }
  async listar(filtros: FiltrosUsuarios = {}): Promise<Usuario[]> {
    const condiciones = [];
    if (filtros.perfil) condiciones.push(eq(usuariosTable.perfil, filtros.perfil));
    if (filtros.estado) condiciones.push(eq(usuariosTable.estado, filtros.estado));
    if (filtros.busqueda) condiciones.push(sql`position(lower(${filtros.busqueda}) in lower(concat_ws(' ', ${usuariosTable.nombre}, ${usuariosTable.apellido}, ${usuariosTable.email}))) > 0`);
    return (await this.db.select().from(usuariosTable).where(and(...condiciones))).map((fila) => this.mapear(fila));
  }

  private valores(usuario: Usuario) {
    const { nombreCompleto: _nombreCompleto, ...datos } = usuario.toJSON();
    return { ...datos, passwordHash: usuario.passwordHash, salt: usuario.salt };
  }
  private mapear(fila: typeof usuariosTable.$inferSelect): Usuario {
    return Usuario.reconstituir({ ...fila, perfil: fila.perfil as PerfilUsuario, estado: fila.estado as EstadoUsuario });
  }
  private async conUnicidad<T>(email: string, operacion: () => PromiseLike<T>): Promise<T> {
    try { return await operacion(); }
    catch (error) {
      if (error instanceof Error && 'code' in error && error.code === '23505'
        && 'constraint' in error && error.constraint === 'usuarios_email_unique') throw new UsuarioDuplicadoError(email);
      throw error;
    }
  }
}
