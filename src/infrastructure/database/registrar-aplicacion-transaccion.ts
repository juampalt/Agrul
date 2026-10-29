import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { and, asc, eq, gt, inArray, or, sql } from 'drizzle-orm';
import { AplicacionInsumosDuplicadaError, AplicacionInsumosInvalidaError, RegistrarAplicacionInsumos, planificarConsumo, validarAplicacionInsumos } from '../../core/domain/entities/aplicacion-insumos.js';
import { ActorInventario } from '../../core/domain/entities/inventario-insumos.js';
import { AccesoDenegadoFincaError, EntidadNoEncontradaError } from '../../core/domain/errors/domain.error.js';
import { AgrulTransaction } from './connection.js';
import { consultarAplicacionesInsumos } from './aplicaciones-insumos-consultas.js';
import { aplicacionesInsumoTable as a, aplicacionesInsumoItemsTable as item, insumosTable as i, partidasInsumoTable as p } from './schema/insumos.js';
import { actividadesRealizadasTable as r } from './schema/actividades-realizadas.js';
import { eventosTrazabilidadTable as eventos, lotesTable as l } from './schema/tables.js';

/** Conserva una única implementación del consumo dentro de la transacción del llamador. */
export async function registrarAplicacionEnTransaccion(tx: AgrulTransaction, datos: RegistrarAplicacionInsumos, actor: ActorInventario) {
  validarAplicacionInsumos(datos);
  const [labor] = await tx.select({ fincaId: l.fincaId, loteId: r.loteId }).from(r)
    .innerJoin(l, eq(r.loteId, l.id)).where(eq(r.id, datos.actividadRealizadaId)).for('share');
  if (!labor) throw new EntidadNoEncontradaError('Actividad realizada', datos.actividadRealizadaId);
  if (!labor.fincaId) throw new AplicacionInsumosInvalidaError('La labor debe pertenecer a una finca.');
  if (actor.fincaIds !== undefined && !actor.fincaIds.includes(labor.fincaId)) throw new AccesoDenegadoFincaError(labor.fincaId);
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'aplicacion:' + datos.operacionId},0))`);
  const solicitud = { ...datos, responsableId: actor.usuarioId };
  const [existente] = await tx.select({ solicitud: a.solicitud }).from(a).where(eq(a.id, datos.operacionId));
  if (existente && !isDeepStrictEqual(existente.solicitud, solicitud)) throw new AplicacionInsumosDuplicadaError();
  if (!existente) {
    const insumos = await tx.select().from(i).where(inArray(i.id, datos.items.map(linea => linea.insumoId)))
      .orderBy(asc(i.id)).for('update');
    await tx.insert(a).values({ id: datos.operacionId, actividadRealizadaId: datos.actividadRealizadaId,
      superficieTratada: datos.superficieTratada.toFixed(2), metodoAplicacion: datos.metodoAplicacion,
      motivoAplicacion: datos.motivoAplicacion, responsableId: actor.usuarioId, observaciones: datos.observaciones,
      solicitud, registradoEn: sql`CURRENT_TIMESTAMP` });
    for (const linea of datos.items) {
      const insumo = insumos.find(insumo => insumo.id === linea.insumoId.toLowerCase());
      if (!insumo) throw new EntidadNoEncontradaError('Insumo', linea.insumoId);
      if (insumo.estado !== 'ACTIVO' || insumo.unidadMedida !== linea.unidadMedida) throw new AplicacionInsumosInvalidaError('Insumo inactivo o unidad incompatible.');
      const partidas = await tx.select().from(p).where(and(eq(p.insumoId, insumo.id), eq(p.fincaId, labor.fincaId),
        eq(p.unidadMedida, linea.unidadMedida), gt(p.cantidadDisponible, '0'),
        or(sql`${p.fechaVencimiento} IS NULL`, sql`${p.fechaVencimiento} >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`)))
        .orderBy(asc(p.id)).for('update');
      for (const consumo of planificarConsumo(partidas, linea.cantidad)) {
        await tx.insert(item).values({ id: randomUUID(), aplicacionId: datos.operacionId, insumoId: insumo.id,
          partidaInsumoId: consumo.partidaId, cantidadAplicada: consumo.cantidad, dosis: linea.dosis.toFixed(2) });
      }
    }
  }
  const [salida] = await consultarAplicacionesInsumos(tx, { limit: 1, offset: 0 }, actor, datos.operacionId);
  if (!salida) throw new EntidadNoEncontradaError('Aplicación', datos.operacionId);
  if (!existente) await tx.insert(eventos).values({ loteId: labor.loteId, actorId: actor.usuarioId,
    ubicacionId: labor.fincaId, tipoEvento: 'APLICACION_INSUMOS', timestampCapturaLocal: sql`CURRENT_TIMESTAMP`,
    timestampServidor: sql`CURRENT_TIMESTAMP`, payloadEspecifico: { aplicacionId: salida.id,
      actividadRealizadaId: salida.actividadRealizadaId, items: salida.items } });
  return salida;
}
