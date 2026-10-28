import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { AuditoriaSeguridadLog } from '../../../core/domain/entities/auditoria-seguridad-log.entity.js';
import { AuditoriaSeguridadRepositoryPort, FiltrosAuditoria } from '../../../core/ports/auditoria-seguridad-repository.port.js';
import { AgrulDatabase, AgrulTransaction } from '../connection.js';
import { auditoriaSeguridadLogTable as tabla, registroModificacionesTable } from '../schema/tables.js';

const CAMPOS_USUARIO = ['nombre', 'apellido', 'nombreUsuario', 'email', 'perfil', 'estado',
  'intentosFallidos', 'bloqueadoHasta', 'fincas', 'debeCambiarPassword'];

export class DrizzleAuditoriaSeguridadRepository implements AuditoriaSeguridadRepositoryPort {
  constructor(private readonly db: AgrulDatabase | AgrulTransaction) {}

  async registrar(log: AuditoriaSeguridadLog): Promise<void> {
    await this.db.transaction(async tx => {
      await tx.insert(tabla).values({ ...log.toJSON(), userAgent: log.userAgent?.slice(0, 255), ip: log.ip?.slice(0, 60) });
      if (log.entidad !== 'USUARIO' || !log.valorPrevioJson || !log.valorNuevoJson) return;
      const usuarioId = log.usuarioId;
      const usuarioAfectadoId = log.entidadId;
      if (!usuarioId || !usuarioAfectadoId) throw new Error('Una modificación de usuario requiere responsable y usuario afectado.');
      const previo = log.valorPrevioJson;
      const nuevo = log.valorNuevoJson;
      const cambios = CAMPOS_USUARIO
        .filter(campo => JSON.stringify(previo[campo] ?? null) !== JSON.stringify(nuevo[campo] ?? null))
        .map(datoModificado => ({ fechaHora: log.timestamp, usuarioId, usuarioAfectadoId, datoModificado,
          valorAnterior: previo[datoModificado] ?? null, valorNuevo: nuevo[datoModificado] ?? null }));
      if (cambios.length) await tx.insert(registroModificacionesTable).values(cambios);
    });
  }

  async listar(filtros: FiltrosAuditoria = {}) {
    const condiciones = [];
    if (filtros.usuarioId) condiciones.push(eq(tabla.usuarioId, filtros.usuarioId));
    if (filtros.accion) condiciones.push(eq(tabla.accion, filtros.accion));
    if (filtros.entidad) condiciones.push(eq(tabla.entidad, filtros.entidad));
    if (filtros.entidadId) condiciones.push(eq(tabla.entidadId, filtros.entidadId));
    if (filtros.fechaDesde) condiciones.push(gte(tabla.timestamp, filtros.fechaDesde));
    if (filtros.fechaHasta) condiciones.push(lte(tabla.timestamp, filtros.fechaHasta));
    const where = and(...condiciones);
    const filas = await this.db.select().from(tabla).where(where).orderBy(desc(tabla.timestamp), desc(tabla.id))
      .limit(filtros.limit ?? 100).offset(filtros.offset ?? 0);
    const [conteo] = await this.db.select({ total: sql<number>`count(*)::int` }).from(tabla).where(where);
    return { logs: filas.map(fila => this.mapear(fila)), total: conteo.total };
  }

  async obtenerPorId(id: string): Promise<AuditoriaSeguridadLog | null> {
    const [fila] = await this.db.select().from(tabla).where(eq(tabla.id, id));
    return fila ? this.mapear(fila) : null;
  }

  private mapear(fila: typeof tabla.$inferSelect): AuditoriaSeguridadLog {
    const accion = AuditoriaSeguridadLog.ACCIONES_VALIDAS.find(valor => valor === fila.accion);
    if (!accion) throw new Error('Acción de auditoría persistida inválida.');
    return AuditoriaSeguridadLog.reconstituir({ ...fila, accion });
  }
}
