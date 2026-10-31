import { isDeepStrictEqual } from 'node:util';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import {
  ActorCosechas, ConflictoRegistroCosechaError, CosechaRegistrada, RegistrarCosecha,
  RegistroCosechaInvalidoError, validarPesajeCosecha,
} from '../../../core/domain/entities/cosecha-registrada.js';
import { SECTOR_SIN_ESPECIFICAR } from '../../../core/domain/entities/cosecha-programada.entity.js';
import { AccesoDenegadoFincaError, EntidadNoEncontradaError } from '../../../core/domain/errors/domain.error.js';
import { CosechasRegistroRepositoryPort, FiltrosCosechasRegistro } from '../../../core/ports/cosechas-registro-repository.port.js';
import { AgrulDatabase } from '../connection.js';
import { alcanceFincasPorLote } from '../alcance-fincas-agricolas.js';
import { cosechasTable as cosechas, lotesTable as lotes, plantacionesTable as plantas, ciclosProductivosTable as ciclos } from '../schema/tables.js';
import { cosechasProgramadasTable as jornadas } from '../schema/cosechas-programadas.js';

type Fila = typeof cosechas.$inferSelect;
function mapear(f: Fila): CosechaRegistrada {
  return { id: f.id, codigoTrazabilidad: f.codigoTrazabilidad, cicloId: f.cicloId, loteId: f.loteId,
    cosechaProgramadaId: f.cosechaProgramadaId, fecha: f.fecha, fechaEfectiva: f.fechaEfectiva,
    numeroPasada: f.numeroPasada, sector: f.sector, observaciones: f.observaciones, origen: f.origen,
    cantidadCosechadaKg: Number(f.cantidadCosechadaKg),
    cantidadComercializableKg: f.cantidadComercializableKg === null ? null : Number(f.cantidadComercializableKg),
    cantidadDescarteKg: f.cantidadDescarteKg === null ? null : Number(f.cantidadDescarteKg),
    responsableId: f.responsableId, registradoPor: f.registradoPor,
    timestampCapturaLocal: f.timestampCapturaLocal, creadoEn: f.creadoEn, estado: f.estado };
}
function autorizar(fincaId: string | null, actor: ActorCosechas) {
  if (actor.fincaIds !== undefined && (!fincaId || !actor.fincaIds.includes(fincaId))) {
    throw new AccesoDenegadoFincaError(fincaId ?? 'sin finca');
  }
}
export class DrizzleCosechasRegistroRepository implements CosechasRegistroRepositoryPort {
  constructor(private readonly db: AgrulDatabase) {}

  async registrar(entrada: RegistrarCosecha, actor: ActorCosechas): Promise<CosechaRegistrada> {
    const datos = validarPesajeCosecha(entrada);
    try {
      return await this.db.transaction(async tx => {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'cosecha:' + datos.operacionId},0))`);
        let cicloId: string;
        let sectorJornada: string | null = null;
        if (datos.origen === 'PROGRAMADA') {
          const [jornada] = await tx.select().from(jornadas).where(eq(jornadas.id, datos.cosechaProgramadaId)).for('update');
          if (!jornada) throw new EntidadNoEncontradaError('CosechaProgramada', datos.cosechaProgramadaId);
          cicloId = jornada.cicloId;
          sectorJornada = jornada.sector;
        } else cicloId = datos.cicloId;
        const [contexto] = await tx.select({ loteId: lotes.id, fincaId: lotes.fincaId, estado: ciclos.estado,
          fechaInicio: ciclos.fechaInicioEfectiva }).from(ciclos)
          .innerJoin(plantas, eq(ciclos.plantacionId, plantas.id)).innerJoin(lotes, eq(plantas.loteId, lotes.id))
          .where(eq(ciclos.id, cicloId)).for('share');
        if (!contexto) throw new EntidadNoEncontradaError('CicloProductivo', cicloId);
        autorizar(contexto.fincaId, actor);
        const solicitud = { ...datos, registradoPor: actor.usuarioId };
        const [existente] = await tx.select().from(cosechas).where(eq(cosechas.id, datos.operacionId));
        if (existente) {
          if (!isDeepStrictEqual(existente.solicitud, solicitud)) throw new ConflictoRegistroCosechaError();
          return mapear(existente);
        }
        if (contexto.estado !== 'ACTIVO' || !contexto.fechaInicio || datos.fechaEfectiva < contexto.fechaInicio || !contexto.fincaId) {
          throw new RegistroCosechaInvalidoError('La cosecha requiere un ciclo ACTIVO, su lote y una fecha desde el inicio efectivo.');
        }
        const [fila] = await tx.insert(cosechas).values({
          id: datos.operacionId, codigoTrazabilidad: `COS-${datos.operacionId.toUpperCase()}`,
          cicloId, loteId: contexto.loteId, fecha: datos.fechaEfectiva, fechaEfectiva: datos.fechaEfectiva,
          cosechaProgramadaId: datos.origen === 'PROGRAMADA' ? datos.cosechaProgramadaId : null,
          origen: datos.origen, sector: datos.sector ?? sectorJornada ?? SECTOR_SIN_ESPECIFICAR, observaciones: datos.observaciones ?? null, numeroPasada: datos.numeroPasada,
          cantidadCosechadaKg: datos.cantidadCosechadaKg.toFixed(2), responsableId: datos.responsableId,
          cantidadComercializableKg: null, cantidadDescarteKg: null, registradoPor: actor.usuarioId, solicitud,
          timestampCapturaLocal: datos.timestampCapturaLocal ?? sql`CURRENT_TIMESTAMP`,
        }).returning();
        return mapear(fila);
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        if (error.code === '23505' || error.code === '40001' || error.code === '40P01' ||
          ('constraint' in error && error.constraint === 'cosechas_jornada_conflicto')) throw new ConflictoRegistroCosechaError();
        if (error.code === '23503') throw new EntidadNoEncontradaError('Referencia de cosecha', 'ciclo, jornada o usuario');
        if (error.code === '23514') throw new RegistroCosechaInvalidoError('Pesaje, fecha, responsable o estado de cosecha inválidos.');
      }
      throw error;
    }
  }
  async buscarPorId(id: string, actor: ActorCosechas) {
    const [fila] = await this.db.select({ cosecha: cosechas, fincaId: lotes.fincaId }).from(cosechas)
      .innerJoin(lotes, eq(cosechas.loteId, lotes.id)).where(eq(cosechas.id, id));
    if (!fila) return null;
    autorizar(fila.fincaId, actor);
    return mapear(fila.cosecha); // Reconstruir historia no aplica validaciones nuevas.
  }
  private condiciones(filtros: FiltrosCosechasRegistro, actor: ActorCosechas) {
    const condiciones = [alcanceFincasPorLote(this.db, cosechas.loteId, actor.fincaIds)];
    if (filtros.cosechaId) condiciones.push(eq(cosechas.id, filtros.cosechaId));
    if (filtros.cultivoId || filtros.variedadId) {
      condiciones.push(sql`${cosechas.cicloId} IN (SELECT c.id FROM ciclos_productivos c JOIN plantaciones p ON p.id = c.plantacion_id WHERE true
        ${filtros.cultivoId ? sql`AND p.cultivo_id = ${filtros.cultivoId}` : sql``}
        ${filtros.variedadId ? sql`AND p.variedad_id = ${filtros.variedadId}` : sql``})`);
    }
    if (filtros.cicloId) condiciones.push(eq(cosechas.cicloId, filtros.cicloId));
    if (filtros.loteId) condiciones.push(eq(cosechas.loteId, filtros.loteId));
    if (filtros.origen) condiciones.push(eq(cosechas.origen, filtros.origen));
    if (filtros.numeroPasada) condiciones.push(eq(cosechas.numeroPasada, filtros.numeroPasada));
    if (filtros.desde) condiciones.push(gte(cosechas.fecha, filtros.desde));
    if (filtros.hasta) condiciones.push(lte(cosechas.fecha, filtros.hasta));
    return condiciones;
  }
  async totalizar(filtros: FiltrosCosechasRegistro, actor: ActorCosechas) {
    const [fila] = await this.db.select({ cantidad: sql<string>`count(*)`, total: sql<string>`coalesce(sum(${cosechas.cantidadCosechadaKg}), 0)` })
      .from(cosechas).where(and(...this.condiciones(filtros, actor)));
    return { cantidadCosechas: Number(fila?.cantidad ?? 0), totalCosechadoKg: Number(fila?.total ?? 0) };
  }
  async listar(filtros: FiltrosCosechasRegistro, actor: ActorCosechas) {
    const condiciones = this.condiciones(filtros, actor);
    return (await this.db.select().from(cosechas).where(and(...condiciones))
      .orderBy(desc(cosechas.fecha), desc(cosechas.id)).limit(filtros.limit).offset(filtros.offset)).map(mapear);
  }
}
