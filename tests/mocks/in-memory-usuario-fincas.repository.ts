import { UsuarioFincasRepositoryPort } from '../../src/core/ports/usuario-fincas-repository.port.js';
import { UsuarioFinca } from '../../src/core/domain/entities/usuario-finca.entity.js';
import crypto from 'node:crypto';

export class InMemoryUsuarioFincasRepository implements UsuarioFincasRepositoryPort {
  private asignaciones: Map<string, UsuarioFinca> = new Map();

  async asignarFincas(usuarioId: string, fincaIds: string[]): Promise<void> {
    for (const fincaId of fincaIds) {
      const existe = Array.from(this.asignaciones.values()).find(
        a => a.usuarioId === usuarioId && a.fincaId === fincaId
      );
      if (existe) {
        existe.activar();
      } else {
        const id = crypto.randomUUID();
        const nueva = UsuarioFinca.crear({ id, usuarioId, fincaId, activo: true });
        this.asignaciones.set(id, nueva);
      }
    }
  }

  async obtenerFincasPorUsuario(usuarioId: string): Promise<string[]> {
    return Array.from(this.asignaciones.values())
      .filter(a => a.usuarioId === usuarioId && a.activo)
      .map(a => a.fincaId);
  }

  async obtenerUsuariosPorFinca(fincaId: string): Promise<string[]> {
    return Array.from(this.asignaciones.values())
      .filter(a => a.fincaId === fincaId && a.activo)
      .map(a => a.usuarioId);
  }

  async desasignarFinca(usuarioId: string, fincaId: string): Promise<void> {
    for (const [id, a] of this.asignaciones.entries()) {
      if (a.usuarioId === usuarioId && a.fincaId === fincaId) {
        a.desactivar();
      }
    }
  }

  async reemplazarFincas(usuarioId: string, fincaIds: string[]): Promise<void> {
    // Desactivar todas las actuales del usuario
    for (const a of this.asignaciones.values()) {
      if (a.usuarioId === usuarioId) {
        a.desactivar();
      }
    }
    // Asignar nuevas
    await this.asignarFincas(usuarioId, fincaIds);
  }

  async listarTodas(): Promise<UsuarioFinca[]> {
    return Array.from(this.asignaciones.values());
  }

  clear(): void {
    this.asignaciones.clear();
  }
}
