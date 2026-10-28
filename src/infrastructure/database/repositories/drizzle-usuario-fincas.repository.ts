import { and, eq, inArray } from 'drizzle-orm';
import { UsuarioFinca } from '../../../core/domain/entities/usuario-finca.entity.js';
import { EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { UsuarioFincasRepositoryPort } from '../../../core/ports/usuario-fincas-repository.port.js';
import { AgrulDatabase, AgrulTransaction } from '../connection.js';
import { fincasTable, usuarioFincaAsignacionTable as tabla } from '../schema/tables.js';

export class DrizzleUsuarioFincasRepository implements UsuarioFincasRepositoryPort {
  constructor(private readonly db: AgrulDatabase | AgrulTransaction) {}

  async asignarFincas(usuarioId: string, fincaIds: string[]): Promise<void> {
    const ids = [...new Set(fincaIds.map(id => id.trim().toLowerCase()))];
    if (!ids.length) return;
    const existentes = await this.db.select({ id: fincasTable.id }).from(fincasTable).where(inArray(fincasTable.id, ids));
    const faltante = ids.find(id => !existentes.some(finca => finca.id === id));
    if (faltante) throw new EntidadNoEncontradaError('Finca', faltante);
    for (const fincaId of ids) {
      await this.db.insert(tabla).values({ usuarioId, fincaId }).onConflictDoUpdate({
        target: [tabla.usuarioId, tabla.fincaId], set: { activo: true, actualizadoEn: new Date().toISOString() },
      });
    }
  }
  async obtenerFincasPorUsuario(usuarioId: string): Promise<string[]> {
    return (await this.db.select({ id: tabla.fincaId }).from(tabla)
      .where(and(eq(tabla.usuarioId, usuarioId), eq(tabla.activo, true))).orderBy(tabla.fincaId)).map(fila => fila.id);
  }
  async obtenerUsuariosPorFinca(fincaId: string): Promise<string[]> {
    return (await this.db.select({ id: tabla.usuarioId }).from(tabla)
      .where(and(eq(tabla.fincaId, fincaId), eq(tabla.activo, true))).orderBy(tabla.usuarioId)).map(fila => fila.id);
  }
  async desasignarFinca(usuarioId: string, fincaId: string): Promise<void> {
    await this.db.update(tabla).set({ activo: false, actualizadoEn: new Date().toISOString() })
      .where(and(eq(tabla.usuarioId, usuarioId), eq(tabla.fincaId, fincaId)));
  }
  async reemplazarFincas(usuarioId: string, fincaIds: string[]): Promise<void> {
    await this.db.transaction(async tx => {
      await tx.update(tabla).set({ activo: false, actualizadoEn: new Date().toISOString() }).where(eq(tabla.usuarioId, usuarioId));
      await new DrizzleUsuarioFincasRepository(tx).asignarFincas(usuarioId, fincaIds);
    });
  }
  async listarTodas(): Promise<UsuarioFinca[]> {
    return (await this.db.select().from(tabla)).map(fila => UsuarioFinca.reconstituir(fila));
  }
}
