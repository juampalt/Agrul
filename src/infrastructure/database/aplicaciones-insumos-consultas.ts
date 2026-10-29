import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { ActorInventario } from '../../core/domain/entities/inventario-insumos.js';
import { AplicacionInsumos, FiltrosAplicacionesInsumos } from '../../core/ports/aplicaciones-insumos-repository.port.js';
import { AgrulDatabase, AgrulTransaction } from './connection.js';
import { aplicacionesInsumoTable as a, aplicacionesInsumoItemsTable as item } from './schema/insumos.js';
import { movimientosInventarioTable as m } from './schema/movimientos-inventario.js';
import { actividadesRealizadasTable as r } from './schema/actividades-realizadas.js';
import { lotesTable as l } from './schema/tables.js';

export async function consultarAplicacionesInsumos(db: AgrulDatabase | AgrulTransaction, filtros: FiltrosAplicacionesInsumos, actor: ActorInventario, id?: string): Promise<AplicacionInsumos[]> {
  const cabeceras = await db.select({ id: a.id, actividadRealizadaId: a.actividadRealizadaId,
    superficieTratada: a.superficieTratada, metodoAplicacion: a.metodoAplicacion, motivoAplicacion: a.motivoAplicacion,
    responsableId: a.responsableId, observaciones: a.observaciones, registradoEn: a.registradoEn,
  }).from(a).innerJoin(r, eq(a.actividadRealizadaId, r.id)).innerJoin(l, eq(r.loteId, l.id))
    .where(and(id ? eq(a.id, id) : undefined,
      actor.fincaIds === undefined ? undefined : actor.fincaIds.length ? inArray(l.fincaId, [...actor.fincaIds]) : sql`false`,
      filtros.fincaId ? eq(l.fincaId, filtros.fincaId) : undefined,
      filtros.actividadRealizadaId ? eq(a.actividadRealizadaId, filtros.actividadRealizadaId) : undefined,
      filtros.insumoId ? inArray(a.id, db.select({ aplicacionId: item.aplicacionId }).from(item).where(eq(item.insumoId, filtros.insumoId))) : undefined))
    .orderBy(sql`${a.registradoEn} DESC NULLS LAST`, asc(a.id)).limit(filtros.limit).offset(filtros.offset);
  if (!cabeceras.length) return [];
  const items = await db.select({ aplicacionId: item.aplicacionId, id: item.id, insumoId: item.insumoId,
    partidaInsumoId: item.partidaInsumoId, cantidadAplicada: item.cantidadAplicada, dosis: item.dosis, movimientoId: m.id,
  }).from(item).leftJoin(m, eq(m.aplicacionItemId, item.id)).where(inArray(item.aplicacionId, cabeceras.map(a => a.id)))
    .orderBy(asc(item.id));
  return cabeceras.map(cabecera => ({ ...cabecera,
    items: items.filter(i => i.aplicacionId === cabecera.id).map(({ aplicacionId: _cabecera, ...salida }) => salida) }));
}

export class ConsultasAplicacionesInsumos {
  constructor(protected readonly db: AgrulDatabase) {}
  listar(filtros: FiltrosAplicacionesInsumos, actor: ActorInventario) { return consultarAplicacionesInsumos(this.db, filtros, actor); }
  async obtener(id: string, actor: ActorInventario) {
    return (await consultarAplicacionesInsumos(this.db, { limit: 1, offset: 0 }, actor, id))[0] ?? null;
  }
}
