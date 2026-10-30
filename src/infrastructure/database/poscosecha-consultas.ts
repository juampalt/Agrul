import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { ActorCosechas } from '../../core/domain/entities/cosecha-registrada.js';
import { AcondicionamientoProduccion, ClasificacionProduccion, PartidaProduccion } from '../../core/domain/entities/poscosecha.js';
import { FiltrosPoscosecha } from '../../core/ports/clasificaciones-repository.port.js';
import { AgrulDatabase, AgrulTransaction } from './connection.js';
import { condicionesOrigen } from './filtros-origen.js';
import { clasificacionesTable as c, partidasProduccionTable as p, acondicionamientosTable as a } from './schema/poscosecha.js';
import { movimientosAlmacenamientoTable as m, destinosProduccionTable as d } from './schema/almacenamiento-produccion.js';
import { cosechasTable as h, lotesTable as l } from './schema/tables.js';

type Consulta = AgrulDatabase | AgrulTransaction;
const alcance = (actor: ActorCosechas) => actor.fincaIds === undefined ? undefined
  : actor.fincaIds.length ? inArray(l.fincaId, [...actor.fincaIds]) : sql`false`;

export async function consultarPartidasProduccion(db: Consulta, filtros: FiltrosPoscosecha, actor: ActorCosechas,
  id?: string, clasificacionIds?: string[]): Promise<PartidaProduccion[]> {
  // Fragmento externo propio para conservar el prefijo en la subconsulta Drizzle.
  const partidaExterna = sql`${p.id}`;
  const acondicionado = sql<string>`(SELECT coalesce(sum(${a.cantidadKg}),0) FROM ${a} WHERE ${a.partidaProduccionId}=${partidaExterna})`;
  const almacenado = sql<string>`(SELECT coalesce(sum(CASE WHEN ${m.tipoMovimiento}='INGRESO' THEN ${m.cantidadKg} ELSE -${m.cantidadKg} END),0) FROM ${m} WHERE ${m.partidaProduccionId}=${partidaExterna})`;
  const destinado = sql<string>`(SELECT coalesce(sum(${d.cantidadDestinadaKg}),0) FROM ${d} WHERE ${d.partidaProduccionId}=${partidaExterna})`;
  const filas = await db.select({ id: p.id, clasificacionId: p.clasificacionId, cosechaId: c.cosechaId,
    loteId: h.loteId, cicloId: h.cicloId, categoria: p.categoria, cantidadInicialKg: p.cantidadInicialKg,
    cantidadDisponibleKg: p.cantidadDisponibleKg,
    cantidadAcondicionadaKg: sql<string>`${acondicionado}::text`, cantidadEnCamaraKg: sql<string>`${almacenado}::text`,
    cantidadDestinadaKg: sql<string>`${destinado}::text`, cantidadFisicaKg: sql<string>`(${p.cantidadInicialKg}-${destinado})::text`,
    cantidadSinAcondicionarKg: sql<string>`(${p.cantidadInicialKg}-${acondicionado})::text`,
    cantidadAcondicionableKg: sql<string>`least(${p.cantidadDisponibleKg},${p.cantidadInicialKg}-${acondicionado})::text`,
  }).from(p).innerJoin(c, eq(p.clasificacionId, c.id)).innerJoin(h, eq(c.cosechaId, h.id)).innerJoin(l, eq(h.loteId, l.id))
    .where(and(alcance(actor), id ? eq(p.id, id) : undefined,
      filtros.cosechaId ? eq(c.cosechaId, filtros.cosechaId) : undefined,
      filtros.clasificacionId ? eq(p.clasificacionId, filtros.clasificacionId) : undefined,
      clasificacionIds ? inArray(p.clasificacionId, clasificacionIds) : undefined,
      filtros.categoria ? eq(p.categoria, filtros.categoria) : undefined, ...condicionesOrigen(filtros)))
    .orderBy(asc(p.id)).limit(filtros.limit).offset(filtros.offset);
  return filas.map(f => ({ ...f, cantidadInicialKg: Number(f.cantidadInicialKg), cantidadDisponibleKg: Number(f.cantidadDisponibleKg),
    cantidadAcondicionadaKg: Number(f.cantidadAcondicionadaKg), cantidadSinAcondicionarKg: Number(f.cantidadSinAcondicionarKg),
    cantidadEnCamaraKg: Number(f.cantidadEnCamaraKg), cantidadDestinadaKg: Number(f.cantidadDestinadaKg),
    cantidadFisicaKg: Number(f.cantidadFisicaKg), cantidadAcondicionableKg: Number(f.cantidadAcondicionableKg) }));
}
export async function consultarClasificaciones(db: Consulta, filtros: FiltrosPoscosecha, actor: ActorCosechas, id?: string): Promise<ClasificacionProduccion[]> {
  const filas = await db.select({ clasificacion: c }).from(c).innerJoin(h, eq(c.cosechaId, h.id)).innerJoin(l, eq(h.loteId, l.id))
    .where(and(alcance(actor), id ? eq(c.id, id) : undefined,
      filtros.cosechaId ? eq(c.cosechaId, filtros.cosechaId) : undefined,
      filtros.desde ? gte(c.fechaClasificacion, filtros.desde) : undefined,
      filtros.hasta ? lte(c.fechaClasificacion, filtros.hasta) : undefined, ...condicionesOrigen(filtros)))
    .orderBy(desc(c.fechaClasificacion), asc(c.id)).limit(filtros.limit).offset(filtros.offset);
  if (!filas.length) return [];
  const partidas = await consultarPartidasProduccion(db, { limit: filas.length * 2, offset: 0 }, actor, undefined, filas.map(f => f.clasificacion.id));
  return filas.map(({ clasificacion: { solicitud: _solicitud, ...f } }) => ({ ...f,
    cantidadRecibidaKg: Number(f.cantidadRecibidaKg), kgFresco: Number(f.kgFresco), kgIndustria: Number(f.kgIndustria), kgDescarte: Number(f.kgDescarte),
    partidas: partidas.filter(p => p.clasificacionId === f.id) }));
}
export async function consultarAcondicionamientos(db: Consulta, filtros: FiltrosPoscosecha, actor: ActorCosechas, id?: string): Promise<AcondicionamientoProduccion[]> {
  const filas = await db.select({ acondicionamiento: a }).from(a).innerJoin(p, eq(a.partidaProduccionId, p.id))
    .innerJoin(c, eq(p.clasificacionId, c.id)).innerJoin(h, eq(c.cosechaId, h.id)).innerJoin(l, eq(h.loteId, l.id))
    .where(and(alcance(actor), id ? eq(a.id, id) : undefined,
      filtros.partidaProduccionId ? eq(a.partidaProduccionId, filtros.partidaProduccionId) : undefined,
      filtros.cosechaId ? eq(c.cosechaId, filtros.cosechaId) : undefined,
      filtros.desde ? gte(a.fechaAcondicionamiento, filtros.desde) : undefined,
      filtros.hasta ? lte(a.fechaAcondicionamiento, filtros.hasta) : undefined, ...condicionesOrigen(filtros)))
    .orderBy(desc(a.fechaAcondicionamiento), asc(a.id)).limit(filtros.limit).offset(filtros.offset);
  return filas.map(({ acondicionamiento: { solicitud: _solicitud, ...f } }) => ({ ...f, cantidadKg: Number(f.cantidadKg) }));
}

/** CU48: kg clasificados, aprovechables (fresco + industria) y descartados de las clasificaciones que cumplen los criterios. */
export async function totalesClasificaciones(db: Consulta, filtros: FiltrosPoscosecha, actor: ActorCosechas) {
  const [fila] = await db.select({ cantidad: sql<string>`count(*)`, recibido: sql<string>`coalesce(sum(${c.cantidadRecibidaKg}),0)::text`,
    fresco: sql<string>`coalesce(sum(${c.kgFresco}),0)::text`, industria: sql<string>`coalesce(sum(${c.kgIndustria}),0)::text`,
    descarte: sql<string>`coalesce(sum(${c.kgDescarte}),0)::text` })
    .from(c).innerJoin(h, eq(c.cosechaId, h.id)).innerJoin(l, eq(h.loteId, l.id))
    .where(and(alcance(actor), filtros.cosechaId ? eq(c.cosechaId, filtros.cosechaId) : undefined,
      filtros.desde ? gte(c.fechaClasificacion, filtros.desde) : undefined,
      filtros.hasta ? lte(c.fechaClasificacion, filtros.hasta) : undefined, ...condicionesOrigen(filtros)));
  const fresco = Number(fila?.fresco ?? 0), industria = Number(fila?.industria ?? 0);
  return { cantidadClasificaciones: Number(fila?.cantidad ?? 0), clasificadoKg: Number(fila?.recibido ?? 0),
    aprovechableKg: fresco + industria, frescoKg: fresco, industriaKg: industria, descarteKg: Number(fila?.descarte ?? 0) };
}
