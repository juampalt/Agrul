import { UsuariosRepositoryPort, FiltrosUsuarios } from '../../src/core/ports/usuarios-repository.port.js';
import { Usuario } from '../../src/core/domain/entities/usuario.entity.js';

export class InMemoryUsuariosRepository implements UsuariosRepositoryPort {
  private usuarios: Map<string, Usuario> = new Map();

  async guardar(usuario: Usuario): Promise<void> {
    this.usuarios.set(usuario.id, usuario);
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const usuario = this.usuarios.get(id);
    return usuario ?? null;
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const emailNorm = email.trim().toLowerCase();
    for (const u of this.usuarios.values()) {
      if (u.email.toLowerCase() === emailNorm) {
        return u;
      }
    }
    return null;
  }

  async listar(filtros?: FiltrosUsuarios): Promise<Usuario[]> {
    let list = Array.from(this.usuarios.values());

    if (filtros?.perfil) {
      list = list.filter(u => u.perfil === filtros.perfil);
    }

    if (filtros?.estado) {
      list = list.filter(u => u.estado === filtros.estado);
    }

    if (filtros?.busqueda) {
      const q = filtros.busqueda.trim().toLowerCase();
      list = list.filter(u =>
        u.nombre.toLowerCase().includes(q) ||
        u.apellido.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => a.apellido.localeCompare(b.apellido));
  }

  async buscarPorNombreUsuario(nombreUsuario: string): Promise<Usuario | null> {
    const normalizado = nombreUsuario.trim().toLowerCase();
    return Array.from(this.usuarios.values()).find(u => u.nombreUsuario === normalizado) ?? null;
  }

  async actualizar(usuario: Usuario): Promise<void> {
    this.usuarios.set(usuario.id, usuario);
  }

  // Métodos auxiliares para tests
  clear(): void {
    this.usuarios.clear();
  }

  getAll(): Usuario[] {
    return Array.from(this.usuarios.values());
  }
}
