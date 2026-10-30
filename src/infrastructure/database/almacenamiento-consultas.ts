import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { ActorCosechas } from '../../core/domain/entities/cosecha-registrada.js';
import { CamaraProduccion, DestinoProduccion, MovimientoAlmacenamiento, SaldoCamaraProduccion } from '../../core/domain/entities/almacenamiento-produccion.js';
import { FiltrosAlmacenamiento } from '../../core/ports/poscosecha-almacenamiento-repository.port.js';
import { FiltrosDestinosProduccion } from '../../core/ports/destinos-repository.port.js';
import { AgrulDatabase, AgrulTransaction } from './connection.js';
import { condicionesOrigen } from './filtros-origen.js';
import { camarasSectorTable as cam, movimientosAlmacenamientoTable as m, destinosProduccionTable as d } from './schema/almacenamiento-produccion.js';
import { partidasProduccionTable as p, clasificacionesTable as c } from './schema/poscosecha.js';
import { cosechasTable as h, lotesTable as l } from './schema/tables.js';

type Consulta = AgrulDatabase | AgrulTransaction;
const alcanceLote = (actor: ActorCosechas) => actor.fincaIds === undefined ? undefined
  : actor.fincaIds.length ? inArray(l.fincaId, [...actor.fincaIds]) : sql`false`;
export async function consultarCamaras(db: Consulta, f: FiltrosAlmacenamiento, actor: ActorCosechas, id?: string): Promise<CamaraProduccion[]> {
  const filas = await db.select().from(cam).where(and(id ? eq(cam.id, id) : undefined,
    actor.fincaIds === undefined ? undefined : actor.fincaIds.length ? inArray(cam.fincaId, [...actor.fincaIds]) : sql`false`,
    f.fincaId ? eq(cam.fincaId, f.fincaId) : undefined)).orderBy(asc(cam.nombre), asc(cam.id)).limit(f.limit).offset(f.offset);
  return filas.map(({ solicitud: _solicitud, ...fila }) => ({ ...fila,
    temperaturaObjetivoC: fila.temperaturaObjetivoC === null ? null : Number(fila.temperaturaObjetivoC) }));
}
export async function consultarMovimientosAlmacenamiento(db: Consulta, f: FiltrosAlmacenamiento, actor: ActorCosechas, id?: string): Promise<MovimientoAlmacenamiento[]> {
  const filas = await db.select({ movimiento: m }).from(m).innerJoin(p, eq(m.partidaProduccionId, p.id))
    .innerJoin(c, eq(p.clasificacionId, c.id)).innerJoin(h, eq(c.cosechaId, h.id)).innerJoin(l, eq(h.loteId, l.id))
    .where(and(alcanceLote(actor), id ? eq(m.id, id) : undefined,
      f.fincaId ? eq(l.fincaId, f.fincaId) : undefined, f.camaraSectorId ? eq(m.camaraSectorId, f.camaraSectorId) : undefined,
      f.partidaProduccionId ? eq(m.partidaProduccionId, f.partidaProduccionId) : undefined, f.cosechaId ? eq(c.cosechaId, f.cosechaId) : undefined,
      f.tipoMovimiento ? eq(m.tipoMovimiento, f.tipoMovimiento) : undefined,
      f.desde ? gte(m.fechaMovimiento, f.desde) : undefined, f.hasta ? lte(m.fechaMovimiento, f.hasta) : undefined, ...condicionesOrigen(f)))
    .orderBy(desc(m.fechaMovimiento), asc(m.id)).limit(f.limit).offset(f.offset);
  return filas.map(({ movimiento: { solicitud: _solicitud, ...fila } }) => ({ ...fila, cantidadKg: Number(fila.cantidadKg) }));
}
export async function consultarDestinos(db: Consulta, f: FiltrosDestinosProduccion, actor: ActorCosechas, id?: string): Promise<DestinoProduccion[]> {
  const filas = await db.select({ destino: d }).from(d).innerJoin(p, eq(d.partidaProduccionId, p.id))
    .innerJoin(c, eq(p.clasificacionId, c.id)).innerJoin(h, eq(c.cosechaId, h.id)).innerJoin(l, eq(h.loteId, l.id))
    .where(and(alcanceLote(actor), id ? eq(d.id, id) : undefined, f.fincaId ? eq(l.fincaId, f.fincaId) : undefined,
      f.partidaProduccionId ? eq(d.partidaProduccionId, f.partidaProduccionId) : undefined, f.cosechaId ? eq(c.cosechaId, f.cosechaId) : undefined,
      f.tipoDestino ? eq(d.tipoDestino, f.tipoDestino) : undefined,
      f.desde ? gte(d.fechaDestino, f.desde) : undefined, f.hasta ? lte(d.fechaDestino, f.hasta) : undefined, ...condicionesOrigen(f)))
    .orderBy(desc(d.fechaDestino), asc(d.id)).limit(f.limit).offset(f.offset);
  return filas.map(({ destino: { solicitud: _solicitud, ...fila } }) => ({ ...fila, cantidadDestinadaKg: Number(fila.cantidadDestinadaKg) }));
}
export async function consultarSaldosCamaras(db: Consulta, f: FiltrosAlmacenamiento, actor: ActorCosechas): Promise<SaldoCamaraProduccion[]> {
  const filas = await db.select({ camaraSectorId: m.camaraSectorId, partidaProduccionId: m.partidaProduccionId,
    clasificacionId: c.id, cosechaId: c.cosechaId, loteId: h.loteId,
    cantidadKg: sql<string>`sum(CASE WHEN ${m.tipoMovimiento}='INGRESO' THEN ${m.cantidadKg} ELSE -${m.cantidadKg} END)::text`,
  }).from(m).innerJoin(p, eq(m.partidaProduccionId, p.id)).innerJoin(c, eq(p.clasificacionId, c.id))
    .innerJoin(h, eq(c.cosechaId, h.id)).innerJoin(l, eq(h.loteId, l.id))
    .where(and(alcanceLote(actor), f.fincaId ? eq(l.fincaId, f.fincaId) : undefined,
      f.camaraSectorId ? eq(m.camaraSectorId, f.camaraSectorId) : undefined,
      f.partidaProduccionId ? eq(m.partidaProduccionId, f.partidaProduccionId) : undefined,
      f.cosechaId ? eq(c.cosechaId, f.cosechaId) : undefined, ...condicionesOrigen(f)))
    .groupBy(m.camaraSectorId, m.partidaProduccionId, c.id, c.cosechaId, h.loteId)
    .orderBy(asc(m.camaraSectorId), asc(m.partidaProduccionId)).limit(f.limit).offset(f.offset);
  return filas.map(fila => ({ ...fila, cantidadKg: Number(fila.cantidadKg) }));
}

/** CU54: kg destinados agrupados por tipo de destino; no se suman a la producción cosechada. */
export async function totalesDestinosPorTipo(db: Consulta, f: FiltrosDestinosProduccion, actor: ActorCosechas) {
  const filas = await db.select({ tipoDestino: d.tipoDestino, cantidadDestinos: sql<string>`count(*)`, totalKg: sql<string>`sum(${d.cantidadDestinadaKg})::text` })
    .from(d).innerJoin(p, eq(d.partidaProduccionId, p.id)).innerJoin(c, eq(p.clasificacionId, c.id))
    .innerJoin(h, eq(c.cosechaId, h.id)).innerJoin(l, eq(h.loteId, l.id))
    .where(and(alcanceLote(actor), f.fincaId ? eq(l.fincaId, f.fincaId) : undefined,
      f.partidaProduccionId ? eq(d.partidaProduccionId, f.partidaProduccionId) : undefined, f.cosechaId ? eq(c.cosechaId, f.cosechaId) : undefined,
      f.tipoDestino ? eq(d.tipoDestino, f.tipoDestino) : undefined,
      f.desde ? gte(d.fechaDestino, f.desde) : undefined, f.hasta ? lte(d.fechaDestino, f.hasta) : undefined, ...condicionesOrigen(f)))
    .groupBy(d.tipoDestino).orderBy(asc(d.tipoDestino));
  const porTipo = filas.map(x => ({ tipoDestino: x.tipoDestino, cantidadDestinos: Number(x.cantidadDestinos), totalKg: Number(x.totalKg) }));
  return { porTipo, totalDestinadoKg: porTipo.reduce((suma, x) => suma + x.totalKg, 0) };
}
