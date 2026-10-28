import { sql } from 'drizzle-orm';
import { VerificarCierreCicloUseCase } from '../../application/use-cases/verificar-cierre-ciclo.use-case.js';
import { AgrulDatabase, AgrulTransaction } from './connection.js';
import { DrizzleActividadesProgramadasConsultaRepository } from './repositories/drizzle-actividades-programadas-consulta.repository.js';

export class DrizzleCierreCicloGuard {
  constructor(private readonly db: AgrulDatabase) {}

  /** CU21 deberá validar el ciclo y persistir su cierre usando exclusivamente la transacción recibida. */
  async ejecutar<T>(cicloId: string, cierre: (tx: AgrulTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      // SHARE admite verificaciones simultáneas pero impide INSERT/UPDATE/DELETE hasta el commit.
      // También espera a escritores anteriores antes de consultar los pendientes confirmados.
      await tx.execute(sql`LOCK TABLE actividades_programadas IN SHARE MODE`);
      const actividades = new DrizzleActividadesProgramadasConsultaRepository(tx);
      await new VerificarCierreCicloUseCase(actividades).execute(cicloId);
      return cierre(tx);
    });
  }
}
