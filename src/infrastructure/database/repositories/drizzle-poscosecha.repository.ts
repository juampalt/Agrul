import { isDeepStrictEqual } from 'node:util';
import { eq, sql } from 'drizzle-orm';
import { ActorCosechas } from '../../../core/domain/entities/cosecha-registrada.js';
import { ConflictoPoscosechaError, PoscosechaInvalidaError, RegistrarAcondicionamiento, RegistrarClasificacion,
  validarAcondicionamiento, validarClasificacion } from '../../../core/domain/entities/poscosecha.js';
import { AccesoDenegadoFincaError, EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { ClasificacionesRepositoryPort, FiltrosPoscosecha } from '../../../core/ports/clasificaciones-repository.port.js';
import { PoscosechaAlmacenamientoRepositoryPort } from '../../../core/ports/poscosecha-almacenamiento-repository.port.js';
import { AgrulDatabase, AgrulTransaction } from '../connection.js';
import { consultarAcondicionamientos, consultarClasificaciones, consultarPartidasProduccion, totalesClasificaciones as totalesClasificacionesDb } from '../poscosecha-consultas.js';
import { clasificacionesTable as c, partidasProduccionTable as p, acondicionamientosTable as a } from '../schema/poscosecha.js';
import { cosechasTable as h, lotesTable as l } from '../schema/tables.js';

export class DrizzlePoscosechaRepository implements ClasificacionesRepositoryPort, PoscosechaAlmacenamientoRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}
  async registrarClasificacion(entrada: RegistrarClasificacion, actor: ActorCosechas) {
    const datos = validarClasificacion(entrada);
    return this.conErrores(() => this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'clasificacion:' + datos.operacionId},0))`);
      const [origen] = await tx.select({ loteId: h.loteId }).from(h).where(eq(h.id, datos.cosechaId)).for('update');
      if (!origen) throw new EntidadNoEncontradaError('Cosecha', datos.cosechaId);
      await this.autorizar(tx, origen.loteId, actor);
      const solicitud = { ...datos, registradoPor: actor.usuarioId };
      const [existente] = await tx.select({ solicitud: c.solicitud }).from(c).where(eq(c.id, datos.operacionId));
      if (existente && !isDeepStrictEqual(existente.solicitud, solicitud)) throw new ConflictoPoscosechaError();
      if (!existente) {
        const { operacionId, cantidadRecibidaKg, kgFresco, kgIndustria, kgDescarte, ...campos } = datos;
        await tx.insert(c).values({ ...campos, id: operacionId, cantidadRecibidaKg: cantidadRecibidaKg.toFixed(2),
          kgFresco: kgFresco.toFixed(2), kgIndustria: kgIndustria.toFixed(2), kgDescarte: kgDescarte.toFixed(2),
          registradoPor: actor.usuarioId, solicitud, timestampCapturaLocal: datos.timestampCapturaLocal ?? sql`CURRENT_TIMESTAMP` });
      }
      const [salida] = await consultarClasificaciones(tx, { limit: 1, offset: 0 }, actor, datos.operacionId);
      if (!salida) throw new EntidadNoEncontradaError('Clasificación', datos.operacionId);
      return salida;
    }));
  }
  async registrarAcondicionamiento(entrada: RegistrarAcondicionamiento, actor: ActorCosechas) {
    const datos = validarAcondicionamiento(entrada);
    return this.conErrores(() => this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'acondicionamiento:' + datos.operacionId},0))`);
      const [partida] = await tx.select({ clasificacionId: p.clasificacionId }).from(p).where(eq(p.id, datos.partidaProduccionId)).for('update');
      if (!partida) throw new EntidadNoEncontradaError('Partida de producción', datos.partidaProduccionId);
      const [origen] = await tx.select({ loteId: h.loteId }).from(c).innerJoin(h, eq(c.cosechaId, h.id)).where(eq(c.id, partida.clasificacionId));
      if (!origen) throw new EntidadNoEncontradaError('Clasificación', partida.clasificacionId);
      await this.autorizar(tx, origen.loteId, actor);
      const solicitud = { ...datos, registradoPor: actor.usuarioId };
      const [existente] = await tx.select({ solicitud: a.solicitud }).from(a).where(eq(a.id, datos.operacionId));
      if (existente && !isDeepStrictEqual(existente.solicitud, solicitud)) throw new ConflictoPoscosechaError();
      if (!existente) {
        const { operacionId, cantidadKg, ...campos } = datos;
        await tx.insert(a).values({ ...campos, id: operacionId, cantidadKg: cantidadKg.toFixed(2), registradoPor: actor.usuarioId,
          solicitud, timestampCapturaLocal: datos.timestampCapturaLocal ?? sql`CURRENT_TIMESTAMP` });
      }
      const [salida] = await consultarAcondicionamientos(tx, { limit: 1, offset: 0 }, actor, datos.operacionId);
      if (!salida) throw new EntidadNoEncontradaError('Acondicionamiento', datos.operacionId);
      return salida;
    }));
  }
  listarClasificaciones(f: FiltrosPoscosecha, actor: ActorCosechas) { return consultarClasificaciones(this.db, f, actor); }
  totalesClasificaciones(f: FiltrosPoscosecha, actor: ActorCosechas) { return totalesClasificacionesDb(this.db, f, actor); }
  async obtenerClasificacion(id: string, actor: ActorCosechas) { return (await consultarClasificaciones(this.db, { limit: 1, offset: 0 }, actor, id))[0] ?? null; }
  listarAcondicionamientos(f: FiltrosPoscosecha, actor: ActorCosechas) { return consultarAcondicionamientos(this.db, f, actor); }
  async obtenerAcondicionamiento(id: string, actor: ActorCosechas) { return (await consultarAcondicionamientos(this.db, { limit: 1, offset: 0 }, actor, id))[0] ?? null; }
  listarPartidas(f: FiltrosPoscosecha, actor: ActorCosechas) { return consultarPartidasProduccion(this.db, f, actor); }
  async obtenerPartida(id: string, actor: ActorCosechas) { return (await consultarPartidasProduccion(this.db, { limit: 1, offset: 0 }, actor, id))[0] ?? null; }

  private async autorizar(tx: AgrulTransaction, loteId: string, actor: ActorCosechas) {
    const [lote] = await tx.select({ fincaId: l.fincaId }).from(l).where(eq(l.id, loteId)).for('share');
    if (!lote?.fincaId) throw new PoscosechaInvalidaError('La producción debe pertenecer a una finca persistida.');
    if (actor.fincaIds !== undefined && !actor.fincaIds.includes(lote.fincaId)) throw new AccesoDenegadoFincaError(lote.fincaId);
  }
  private async conErrores<T>(accion: () => Promise<T>): Promise<T> {
    try { return await accion(); } catch (error) {
      if (error instanceof Error && 'code' in error) {
        if (error.code === '23505' || error.code === '40001' || error.code === '40P01') throw new ConflictoPoscosechaError();
        if (error.code === '23503') throw new EntidadNoEncontradaError('Referencia de poscosecha', 'cosecha, partida o usuario');
        if (error.code === '23514' || error.code === '22003') throw new PoscosechaInvalidaError('Operación rechazada por balance, saldo, descarte, fecha, origen histórico o responsable inválidos.');
      }
      throw error;
    }
  }
}
