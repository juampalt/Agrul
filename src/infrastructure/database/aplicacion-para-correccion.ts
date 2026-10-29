import { and, eq, inArray, sql } from 'drizzle-orm';
import { AplicacionInsumosInvalidaError } from '../../core/domain/entities/aplicacion-insumos.js';
import { ActorInventario } from '../../core/domain/entities/inventario-insumos.js';
import { EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { AgrulTransaction } from './connection.js';
import { aplicacionesInsumoTable as a, aplicacionesInsumoItemsTable as item } from './schema/insumos.js';
import { movimientosInventarioTable as m } from './schema/movimientos-inventario.js';
import { actividadesRealizadasTable as r } from './schema/actividades-realizadas.js';
import { eventosTrazabilidadTable as eventos, lotesTable as l } from './schema/tables.js';

/** Comprueba la procedencia real antes de permitir cualquier regularización. */
export async function cargarAplicacionParaCorreccion(tx: AgrulTransaction, id: string, actor: ActorInventario) {
  const [original] = await tx.select({ id: a.id, solicitud: a.solicitud, registradoEn: a.registradoEn,
    actividadRealizadaId: a.actividadRealizadaId, responsableId: a.responsableId, fincaId: l.fincaId, loteId: r.loteId,
  }).from(a).innerJoin(r, eq(r.id, a.actividadRealizadaId)).innerJoin(l, eq(l.id, r.loteId))
    .where(and(eq(a.id, id), actor.fincaIds === undefined ? undefined : actor.fincaIds.length ? inArray(l.fincaId, [...actor.fincaIds]) : sql`false`))
    .for('update', { of: a });
  if (!original) throw new EntidadNoEncontradaError('Aplicación', id);
  if (!original.fincaId || !original.solicitud || !original.registradoEn) {
    throw new AplicacionInsumosInvalidaError('La aplicación histórica no tiene procedencia de consumo verificable.');
  }
  const items = await tx.select({ id: item.id, insumoId: item.insumoId, partidaId: item.partidaInsumoId,
    cantidad: item.cantidadAplicada, movimientoId: m.id, tipoMovimiento: m.tipoMovimiento,
    cantidadMovimiento: m.cantidad, unidadMedida: m.unidadMedida, fincaId: m.fincaId,
    insumoMovimiento: m.insumoId, partidaMovimiento: m.partidaId, responsableId: m.responsableId,
  }).from(item).leftJoin(m, eq(m.aplicacionItemId, item.id)).where(eq(item.aplicacionId, id));
  if (!items.length || items.some(i => !i.movimientoId || !i.unidadMedida || i.tipoMovimiento !== 'EGRESO_APLICACION' ||
    i.cantidad !== i.cantidadMovimiento || i.fincaId !== original.fincaId || i.insumoMovimiento !== i.insumoId ||
    i.partidaMovimiento !== i.partidaId || i.responsableId !== original.responsableId)) {
    throw new AplicacionInsumosInvalidaError('Falta el movimiento de consumo original o sus referencias no coinciden.');
  }
  const origenes = await tx.select({ id: eventos.id }).from(eventos).where(and(eq(eventos.tipoEvento, 'APLICACION_INSUMOS'),
    sql`${eventos.payloadEspecifico}->>'aplicacionId'=${id}`));
  if (origenes.length !== 1) throw new AplicacionInsumosInvalidaError('El evento original de la aplicación no puede determinarse de forma única.');
  return { original, items, eventoId: origenes[0].id };
}
