import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { CorregirAplicacionInsumos, ConciliacionInventarioRequeridaError, ConflictoCorreccionAplicacionError, validarCorreccionAplicacion } from '../../../core/domain/entities/correccion-aplicacion-insumos.js';
import { AplicacionInsumosInvalidaError } from '../../../core/domain/entities/aplicacion-insumos.js';
import { ActorInventario } from '../../../core/domain/entities/inventario-insumos.js';
import { CorreccionesAplicacionesRepositoryPort } from '../../../core/ports/correcciones-aplicaciones-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { cargarAplicacionParaCorreccion } from '../aplicacion-para-correccion.js';
import { verificarConciliacionCorreccion } from '../conciliar-inventario-correccion.js';
import { consultarCorreccionesAplicacion } from '../correcciones-aplicaciones-consultas.js';
import { cargarLaborAplicacion, registrarAplicacionEnTransaccion } from '../registrar-aplicacion-transaccion.js';
import { correccionesAplicacionesTable as c } from '../schema/correcciones-aplicaciones.js';
import { insumosTable as i } from '../schema/insumos.js';
import { movimientosInventarioTable as m } from '../schema/movimientos-inventario.js';
import { eventosTrazabilidadTable as eventos } from '../schema/tables.js';

export class DrizzleCorreccionesAplicacionesRepository implements CorreccionesAplicacionesRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}
  listar(id: string, actor: ActorInventario) { return consultarCorreccionesAplicacion(this.db, id, actor); }
  async corregir(id: string, datos: CorregirAplicacionInsumos, actor: ActorInventario) {
    validarCorreccionAplicacion(datos);
    try {
      return await this.db.transaction(async tx => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'correccion:' + datos.operacionId},0))`);
        const origen = await cargarAplicacionParaCorreccion(tx, id, actor).catch(error => {
          if (error instanceof AplicacionInsumosInvalidaError) throw new ConciliacionInventarioRequeridaError();
          throw error;
        });
        const destino = await cargarLaborAplicacion(tx, datos.nuevaAplicacion.actividadRealizadaId, actor);
        const solicitud = { ...datos, aplicacionAnteriorId: id, responsableId: actor.usuarioId };
        const [repetida] = await tx.select().from(c).where(eq(c.id, datos.operacionId));
        if (repetida && !isDeepStrictEqual(repetida.solicitud, solicitud)) throw new ConflictoCorreccionAplicacionError();
        if (!repetida) {
          if ((await tx.select({ id: c.id }).from(c).where(eq(c.aplicacionAnteriorId, id))).length) throw new ConflictoCorreccionAplicacionError();
          const insumoIds = [...new Set([...origen.items.map(i => i.insumoId), ...datos.nuevaAplicacion.items.map(i => i.insumoId)])];
          // Incluye insumos que se eliminan de la nueva versión: restituciones y
          // consumos comparten el mismo orden de bloqueos con el inventario.
          await tx.select({ id: i.id }).from(i).where(inArray(i.id, insumoIds)).orderBy(asc(i.id)).for('update');
          const fincaOrigen = origen.original.fincaId;
          if (!fincaOrigen) throw new ConciliacionInventarioRequeridaError();
          const fincas = [...new Set([fincaOrigen, destino.fincaId])];
          await verificarConciliacionCorreccion(tx, insumoIds, fincas);
          const nuevaId = randomUUID();
          await tx.insert(c).values({ id: datos.operacionId, aplicacionAnteriorId: id, aplicacionNuevaId: nuevaId,
            eventoOriginalId: origen.eventoId, motivo: datos.motivoCorreccion, responsableId: actor.usuarioId, solicitud });
          for (const item of origen.items) {
            if (!item.movimientoId || !item.unidadMedida) throw new ConciliacionInventarioRequeridaError();
            await tx.insert(m).values({ id: randomUUID(), insumoId: item.insumoId, partidaId: item.partidaId,
              fincaId: fincaOrigen, tipoMovimiento: 'REGULARIZACION_CORRECCION', cantidad: item.cantidad,
              unidadMedida: item.unidadMedida, fechaMovimiento: sql`(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`,
              motivo: datos.motivoCorreccion, responsableId: actor.usuarioId, correccionId: datos.operacionId,
              movimientoCompensadoId: item.movimientoId, solicitud: { correccionId: datos.operacionId, movimientoOriginalId: item.movimientoId } });
          }
          await registrarAplicacionEnTransaccion(tx, { ...datos.nuevaAplicacion, operacionId: nuevaId }, actor);
          await verificarConciliacionCorreccion(tx, insumoIds, fincas);
          await tx.insert(eventos).values({ loteId: origen.original.loteId, actorId: actor.usuarioId, ubicacionId: fincaOrigen,
            tipoEvento: 'CORRECCION', eventoReferenciadoId: origen.eventoId, timestampCapturaLocal: sql`CURRENT_TIMESTAMP`,
            timestampServidor: sql`CURRENT_TIMESTAMP`, payloadEspecifico: { correccionId: datos.operacionId,
              aplicacionAnteriorId: id, aplicacionNuevaId: nuevaId, motivo: datos.motivoCorreccion } });
        }
        const [salida] = await consultarCorreccionesAplicacion(tx, id, actor, datos.operacionId);
        if (!salida) throw new ConciliacionInventarioRequeridaError();
        return salida;
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        if (error.code === '23505') throw new ConflictoCorreccionAplicacionError();
        if (['23514', '23503', '22003'].includes(String(error.code))) throw new ConciliacionInventarioRequeridaError();
      }
      throw error;
    }
  }
}
