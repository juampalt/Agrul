import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import { ActorInventario } from '../../core/domain/entities/inventario-insumos.js';
import { CorreccionAplicacionInsumos } from '../../core/ports/correcciones-aplicaciones-repository.port.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { AgrulDatabase, AgrulTransaction } from './connection.js';
import { consultarAplicacionesInsumos } from './aplicaciones-insumos-consultas.js';
import { correccionesAplicacionesTable as c } from './schema/correcciones-aplicaciones.js';
import { aplicacionesInsumoTable as a } from './schema/insumos.js';
import { movimientosInventarioTable as m } from './schema/movimientos-inventario.js';
import { actividadesRealizadasTable as r } from './schema/actividades-realizadas.js';
import { lotesTable as l } from './schema/tables.js';

export async function consultarCorreccionesAplicacion(db: AgrulDatabase | AgrulTransaction, aplicacionId: string, actor: ActorInventario, correccionId?: string): Promise<CorreccionAplicacionInsumos[]> {
  if (!(await consultarAplicacionesInsumos(db, { limit: 1, offset: 0 }, actor, aplicacionId)).length) throw new EntidadNoEncontradaError('Aplicación', aplicacionId);
  const visibles = db.select({ id: a.id }).from(a).innerJoin(r, eq(r.id, a.actividadRealizadaId)).innerJoin(l, eq(l.id, r.loteId))
    .where(actor.fincaIds?.length ? inArray(l.fincaId, [...actor.fincaIds]) : sql`false`);
  const filas = await db.select({ id: c.id, aplicacionAnteriorId: c.aplicacionAnteriorId, aplicacionNuevaId: c.aplicacionNuevaId,
    eventoOriginalId: c.eventoOriginalId, motivo: c.motivo, responsableId: c.responsableId, registradoEn: c.registradoEn,
  }).from(c).where(and(or(eq(c.aplicacionAnteriorId, aplicacionId), eq(c.aplicacionNuevaId, aplicacionId)),
    correccionId ? eq(c.id, correccionId) : undefined,
    actor.fincaIds === undefined ? undefined : and(inArray(c.aplicacionAnteriorId, visibles), inArray(c.aplicacionNuevaId, visibles))))
    .orderBy(asc(c.registradoEn), asc(c.id));
  if (!filas.length) return [];
  const movimientos = await db.select({ correccionId: m.correccionId, id: m.id, partidaId: m.partidaId,
    cantidad: m.cantidad, movimientoCompensadoId: m.movimientoCompensadoId }).from(m)
    .where(inArray(m.correccionId, filas.map(c => c.id))).orderBy(asc(m.id));
  return filas.map(fila => ({ ...fila, movimientos: movimientos.filter(m => m.correccionId === fila.id)
    .map(({ correccionId: _privada, ...movimiento }) => movimiento) }));
}
