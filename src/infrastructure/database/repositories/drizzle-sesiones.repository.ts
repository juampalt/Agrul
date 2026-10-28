import { and, eq, sql } from 'drizzle-orm';
import { SesionesRepositoryPort } from '../../../core/ports/sesiones-repository.port.js';
import { AgrulDatabase, AgrulTransaction } from '../connection.js';
import { sesionesUsuariosTable as tabla } from '../schema/tables.js';

export class DrizzleSesionesRepository implements SesionesRepositoryPort {
  constructor(private readonly db: AgrulDatabase | AgrulTransaction) {}
  async abrir(tokenHash: string, usuarioId: string, expiraEn: string): Promise<void> {
    await this.db.insert(tabla).values({ tokenHash, usuarioId, expiraEn });
  }
  async validar(tokenHash: string, usuarioId: string, timeoutMs: number): Promise<boolean> {
    const filas = await this.db.update(tabla).set({ ultimaActividad: sql`now()` }).where(and(
      eq(tabla.tokenHash, tokenHash), eq(tabla.usuarioId, usuarioId), eq(tabla.revocada, false),
      sql`${tabla.expiraEn} > now()`,
      sql`${tabla.ultimaActividad} > now() - ${timeoutMs} * interval '1 millisecond'`,
    )).returning({ id: tabla.tokenHash });
    return filas.length > 0;
  }
  async cerrar(tokenHash: string, usuarioId: string): Promise<boolean> {
    return (await this.db.update(tabla).set({ revocada: true })
      .where(and(eq(tabla.tokenHash, tokenHash), eq(tabla.usuarioId, usuarioId), eq(tabla.revocada, false)))
      .returning({ id: tabla.tokenHash })).length > 0;
  }
  async estaRevocada(tokenHash: string): Promise<boolean> {
    const [fila] = await this.db.select({ revocada: tabla.revocada }).from(tabla).where(eq(tabla.tokenHash, tokenHash));
    return fila?.revocada ?? false;
  }
  async simularInactividad(usuarioId: string, fecha: string): Promise<void> {
    await this.db.update(tabla).set({ ultimaActividad: fecha }).where(eq(tabla.usuarioId, usuarioId));
  }
}
