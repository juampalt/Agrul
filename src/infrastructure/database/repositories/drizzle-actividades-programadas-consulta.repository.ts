import { and, eq } from 'drizzle-orm';
import { ActividadesProgramadasConsultaPort } from '../../../core/ports/actividades-programadas-consulta.port.js';
import { AgrulTransaction } from '../connection.js';
import { actividadesProgramadasTable } from '../schema/actividades-programadas.js';

/** Debe usarse dentro de la transacción protegida por DrizzleCierreCicloGuard. */
export class DrizzleActividadesProgramadasConsultaRepository implements ActividadesProgramadasConsultaPort {
  constructor(private readonly tx: AgrulTransaction) {}

  async tienePendientes(cicloId: string): Promise<boolean> {
    const [fila] = await this.tx.select({ id: actividadesProgramadasTable.id }).from(actividadesProgramadasTable)
      .where(and(eq(actividadesProgramadasTable.cicloId, cicloId), eq(actividadesProgramadasTable.estado, 'PENDIENTE'))).limit(1);
    return fila !== undefined;
  }
}
