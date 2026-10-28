import { inArray } from 'drizzle-orm';
import { UsuariosTransaccionContext, UsuariosTransaccionPort } from '../../core/ports/usuarios-transaccion.port.js';
import { AgrulDatabase } from './connection.js';
import { usuariosTable } from './schema/tables.js';
import { DrizzleUsuariosRepository } from './repositories/drizzle-usuarios.repository.js';
import { DrizzleUsuarioFincasRepository } from './repositories/drizzle-usuario-fincas.repository.js';
import { DrizzleAuditoriaSeguridadRepository } from './repositories/drizzle-auditoria-seguridad.repository.js';

export class DrizzleUsuariosTransaccion implements UsuariosTransaccionPort {
  constructor(private readonly db: AgrulDatabase) {}

  async ejecutar<T>(usuarioIds: string[], trabajo: (repos: UsuariosTransaccionContext) => Promise<T>): Promise<T> {
    return this.db.transaction(async tx => {
      // El orden estable evita bloqueos cruzados entre responsables y usuarios afectados.
      const ids = [...new Set(usuarioIds)].sort();
      if (ids.length) await tx.select({ id: usuariosTable.id }).from(usuariosTable)
        .where(inArray(usuariosTable.id, ids)).orderBy(usuariosTable.id).for('update');
      return trabajo({ usuariosRepo: new DrizzleUsuariosRepository(tx),
        usuarioFincasRepo: new DrizzleUsuarioFincasRepository(tx), auditoriaRepo: new DrizzleAuditoriaSeguridadRepository(tx) });
    });
  }
}
