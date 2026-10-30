import { isDeepStrictEqual } from 'node:util';
import { eq, sql } from 'drizzle-orm';
import { ActorCosechas } from '../../../core/domain/entities/cosecha-registrada.js';
import { RegistrarCamara, RegistrarDestinoProduccion, RegistrarMovimientoAlmacenamiento,
  validarCamara, validarDestinoProduccion, validarMovimientoAlmacenamiento } from '../../../core/domain/entities/almacenamiento-produccion.js';
import { ConflictoPoscosechaError, PoscosechaInvalidaError } from '../../../core/domain/entities/poscosecha.js';
import { AccesoDenegadoFincaError, EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { AlmacenamientoProduccionRepositoryPort, FiltrosAlmacenamiento } from '../../../core/ports/poscosecha-almacenamiento-repository.port.js';
import { DestinosRepositoryPort, FiltrosDestinosProduccion } from '../../../core/ports/destinos-repository.port.js';
import { AgrulDatabase, AgrulTransaction } from '../connection.js';
import { consultarCamaras, consultarDestinos, consultarMovimientosAlmacenamiento, consultarSaldosCamaras, totalesDestinosPorTipo } from '../almacenamiento-consultas.js';
import { camarasSectorTable as cam, movimientosAlmacenamientoTable as m, destinosProduccionTable as d } from '../schema/almacenamiento-produccion.js';
import { partidasProduccionTable as p, clasificacionesTable as c } from '../schema/poscosecha.js';
import { cosechasTable as h, lotesTable as l, fincasTable as fincas } from '../schema/tables.js';

export class DrizzleAlmacenamientoProduccionRepository implements AlmacenamientoProduccionRepositoryPort, DestinosRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}
  async registrarCamara(entrada: RegistrarCamara, actor: ActorCosechas) {
    const datos = validarCamara(entrada);
    return this.conErrores(() => this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'camara:' + datos.operacionId},0))`);
      const [finca] = await tx.select({ id: fincas.id }).from(fincas).where(eq(fincas.id, datos.fincaId)).for('share');
      if (!finca) throw new EntidadNoEncontradaError('Finca', datos.fincaId);
      this.autorizar(finca.id, actor);
      const solicitud = { ...datos, creadoPor: actor.usuarioId };
      const [existente] = await tx.select({ solicitud: cam.solicitud }).from(cam).where(eq(cam.id, datos.operacionId));
      if (existente && !isDeepStrictEqual(existente.solicitud, solicitud)) throw new ConflictoPoscosechaError();
      if (!existente) {
        const { operacionId, temperaturaObjetivoC, ...campos } = datos;
        await tx.insert(cam).values({ ...campos, id: operacionId, temperaturaObjetivoC: temperaturaObjetivoC?.toFixed(2) ?? null,
          creadoPor: actor.usuarioId, solicitud });
      }
      const [salida] = await consultarCamaras(tx, { limit: 1, offset: 0 }, actor, datos.operacionId);
      if (!salida) throw new EntidadNoEncontradaError('Cámara', datos.operacionId);
      return salida;
    }));
  }
  async registrarMovimiento(entrada: RegistrarMovimientoAlmacenamiento, actor: ActorCosechas) {
    const datos = validarMovimientoAlmacenamiento(entrada);
    return this.conErrores(() => this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'almacenamiento:' + datos.operacionId},0))`);
      const fincaId = await this.cargarPartida(tx, datos.partidaProduccionId, actor);
      const [camara] = await tx.select({ fincaId: cam.fincaId }).from(cam).where(eq(cam.id, datos.camaraSectorId)).for('share');
      if (!camara) throw new EntidadNoEncontradaError('Cámara', datos.camaraSectorId);
      this.autorizar(camara.fincaId, actor);
      if (camara.fincaId !== fincaId) throw new PoscosechaInvalidaError('Partida y cámara deben pertenecer a la misma finca.');
      const solicitud = { ...datos, registradoPor: actor.usuarioId };
      const [existente] = await tx.select({ solicitud: m.solicitud }).from(m).where(eq(m.id, datos.operacionId));
      if (existente && !isDeepStrictEqual(existente.solicitud, solicitud)) throw new ConflictoPoscosechaError();
      if (!existente) {
        const { operacionId, cantidadKg, ...campos } = datos;
        await tx.insert(m).values({ ...campos, id: operacionId, cantidadKg: cantidadKg.toFixed(2), registradoPor: actor.usuarioId,
          solicitud, timestampCapturaLocal: datos.timestampCapturaLocal ?? sql`CURRENT_TIMESTAMP` });
      }
      const [salida] = await consultarMovimientosAlmacenamiento(tx, { limit: 1, offset: 0 }, actor, datos.operacionId);
      if (!salida) throw new EntidadNoEncontradaError('Movimiento de almacenamiento', datos.operacionId);
      return salida;
    }));
  }
  async registrarDestino(entrada: RegistrarDestinoProduccion, actor: ActorCosechas) {
    const datos = validarDestinoProduccion(entrada);
    return this.conErrores(() => this.db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'destino:' + datos.operacionId},0))`);
      await this.cargarPartida(tx, datos.partidaProduccionId, actor);
      const solicitud = { ...datos, registradoPor: actor.usuarioId };
      const [existente] = await tx.select({ solicitud: d.solicitud }).from(d).where(eq(d.id, datos.operacionId));
      if (existente && !isDeepStrictEqual(existente.solicitud, solicitud)) throw new ConflictoPoscosechaError();
      if (!existente) {
        const { operacionId, cantidadDestinadaKg, ...campos } = datos;
        await tx.insert(d).values({ ...campos, id: operacionId, cantidadDestinadaKg: cantidadDestinadaKg.toFixed(2), registradoPor: actor.usuarioId,
          solicitud, timestampCapturaLocal: datos.timestampCapturaLocal ?? sql`CURRENT_TIMESTAMP` });
      }
      const [salida] = await consultarDestinos(tx, { limit: 1, offset: 0 }, actor, datos.operacionId);
      if (!salida) throw new EntidadNoEncontradaError('Destino de producción', datos.operacionId);
      return salida;
    }));
  }
  listarCamaras(f: FiltrosAlmacenamiento, actor: ActorCosechas) { return consultarCamaras(this.db, f, actor); }
  async obtenerCamara(id: string, actor: ActorCosechas) { return (await consultarCamaras(this.db, { limit: 1, offset: 0 }, actor, id))[0] ?? null; }
  listarMovimientos(f: FiltrosAlmacenamiento, actor: ActorCosechas) { return consultarMovimientosAlmacenamiento(this.db, f, actor); }
  async obtenerMovimiento(id: string, actor: ActorCosechas) { return (await consultarMovimientosAlmacenamiento(this.db, { limit: 1, offset: 0 }, actor, id))[0] ?? null; }
  consultarSaldos(f: FiltrosAlmacenamiento, actor: ActorCosechas) { return consultarSaldosCamaras(this.db, f, actor); }
  listarDestinos(f: FiltrosDestinosProduccion, actor: ActorCosechas) { return consultarDestinos(this.db, f, actor); }
  totalesDestinos(f: FiltrosDestinosProduccion, actor: ActorCosechas) { return totalesDestinosPorTipo(this.db, f, actor); }
  async obtenerDestino(id: string, actor: ActorCosechas) { return (await consultarDestinos(this.db, { limit: 1, offset: 0 }, actor, id))[0] ?? null; }
  private autorizar(fincaId: string, actor: ActorCosechas) {
    if (actor.fincaIds !== undefined && !actor.fincaIds.includes(fincaId)) throw new AccesoDenegadoFincaError(fincaId);
  }
  private async cargarPartida(tx: AgrulTransaction, id: string, actor: ActorCosechas) {
    const [partida] = await tx.select({ clasificacionId: p.clasificacionId }).from(p).where(eq(p.id, id)).for('update');
    if (!partida) throw new EntidadNoEncontradaError('Partida de producción', id);
    const [origen] = await tx.select({ fincaId: l.fincaId }).from(c).innerJoin(h, eq(c.cosechaId, h.id))
      .innerJoin(l, eq(h.loteId, l.id)).where(eq(c.id, partida.clasificacionId));
    if (!origen?.fincaId) throw new PoscosechaInvalidaError('La partida debe tener una finca persistida.');
    this.autorizar(origen.fincaId, actor); return origen.fincaId;
  }
  private async conErrores<T>(accion: () => Promise<T>): Promise<T> {
    try { return await accion(); } catch (error) {
      if (error instanceof Error && 'code' in error) {
        if (['23505','40001','40P01'].includes(String(error.code))) throw new ConflictoPoscosechaError();
        if (error.code === '23503') throw new EntidadNoEncontradaError('Referencia de producción', 'partida, finca, cámara o usuario');
        if (error.code === '23514' || error.code === '22003') throw new PoscosechaInvalidaError('Operación rechazada por saldo actual o histórico, fecha, finca o responsable inválidos.');
      }
      throw error;
    }
  }
}
