import { and, asc, inArray, sql } from 'drizzle-orm';
import { ConciliacionInventarioRequeridaError } from '../../core/domain/entities/correccion-aplicacion-insumos.js';
import { AgrulTransaction } from './connection.js';
import { partidasInsumoTable as p } from './schema/insumos.js';
import { movimientosInventarioTable as m } from './schema/movimientos-inventario.js';

/** El llamador ya mantiene bloqueados todos los insumos involucrados en orden único. */
export async function verificarConciliacionCorreccion(tx: AgrulTransaction, insumoIds: string[], fincaIds: string[]) {
  // Mantener la columna correlacionada dentro de un fragmento SQL propio:
  // Drizzle no debe quitarle el prefijo en una selección de una sola tabla.
  const partidaExterna = sql`${p.id}`;
  const partidas = await tx.select({ id: p.id,
    conciliada: sql<boolean>`${p.cantidadDisponible} = (SELECT coalesce(sum(CASE
      WHEN ${m.tipoMovimiento} IN ('AJUSTE_NEGATIVO','PERDIDA','EGRESO_APLICACION') THEN -${m.cantidad}
      ELSE ${m.cantidad} END),0) FROM ${m} WHERE ${m.partidaId}=${partidaExterna})`,
    dudosa: sql<boolean>`EXISTS (SELECT 1 FROM ${m} WHERE ${m.partidaId}=${partidaExterna}
      AND ${m.tipoMovimiento}='REGULARIZACION_CORRECCION'
      AND (${m.correccionId} IS NULL OR ${m.movimientoCompensadoId} IS NULL))`,
  }).from(p).where(and(inArray(p.insumoId, insumoIds), inArray(p.fincaId, fincaIds))).orderBy(asc(p.id)).for('update');
  if (partidas.some(p => !p.conciliada || p.dudosa)) throw new ConciliacionInventarioRequeridaError();
}
