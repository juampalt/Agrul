import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { AnyPgColumn } from 'drizzle-orm/pg-core';
import { ActorInventario } from '../../core/domain/entities/inventario-insumos.js';
import { FiltrosInventario } from '../../core/ports/inventario-insumos-repository.port.js';
import { AgrulDatabase } from './connection.js';
import { insumosTable as i, partidasInsumoTable as p } from './schema/insumos.js';
import { movimientosInventarioTable as m } from './schema/movimientos-inventario.js';
import { fincasTable as f } from './schema/tables.js';

function alcance(columna: AnyPgColumn, actor: ActorInventario) {
  return actor.fincaIds === undefined ? undefined : actor.fincaIds.length ? inArray(columna, [...actor.fincaIds]) : sql`false`;
}
export const camposMovimiento = { id: m.id, partidaId: m.partidaId, fincaId: m.fincaId, insumoId: m.insumoId,
  aplicacionItemId: m.aplicacionItemId, correccionId: m.correccionId, movimientoCompensadoId: m.movimientoCompensadoId,
  cantidad: m.cantidad, unidadMedida: m.unidadMedida, tipoMovimiento: m.tipoMovimiento,
  fechaMovimiento: m.fechaMovimiento, motivo: m.motivo, responsableId: m.responsableId };

export class ConsultasInventario {
  constructor(protected readonly db: AgrulDatabase) {}
  async partidas(filtros: FiltrosInventario, actor: ActorInventario) {
    return this.db.select().from(p).where(and(alcance(p.fincaId, actor),
      filtros.insumoId ? eq(p.insumoId, filtros.insumoId) : undefined,
      filtros.fincaId ? eq(p.fincaId, filtros.fincaId) : undefined,
      filtros.partidaId ? eq(p.id, filtros.partidaId) : undefined))
      .orderBy(desc(p.fechaIngreso), asc(p.id)).limit(filtros.limit).offset(filtros.offset);
  }
  async partida(id: string, actor: ActorInventario) {
    const [fila] = await this.db.select().from(p).where(and(eq(p.id, id), alcance(p.fincaId, actor)));
    return fila ?? null;
  }
  async movimientos(filtros: FiltrosInventario, actor: ActorInventario) {
    return this.db.select(camposMovimiento).from(m).where(and(alcance(m.fincaId, actor),
      filtros.insumoId ? eq(m.insumoId, filtros.insumoId) : undefined,
      filtros.fincaId ? eq(m.fincaId, filtros.fincaId) : undefined,
      filtros.partidaId ? eq(m.partidaId, filtros.partidaId) : undefined,
      filtros.tipoMovimiento ? sql`${m.tipoMovimiento} = ${filtros.tipoMovimiento}` : undefined,
      filtros.desde ? sql`${m.fechaMovimiento} >= ${filtros.desde}` : undefined,
      filtros.hasta ? sql`${m.fechaMovimiento} <= ${filtros.hasta}` : undefined))
      .orderBy(desc(m.fechaMovimiento), asc(m.id)).limit(filtros.limit).offset(filtros.offset);
  }
  async movimiento(id: string, actor: ActorInventario) {
    const [fila] = await this.db.select(camposMovimiento).from(m).where(and(eq(m.id, id), alcance(m.fincaId, actor)));
    return fila ?? null;
  }
  async existencias(filtros: FiltrosInventario, actor: ActorInventario, soloAlertas = false) {
    const hoy = sql`(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`;
    const utilizable = sql`coalesce(sum(${p.cantidadDisponible}) FILTER (WHERE ${p.unidadMedida} = ${i.unidadMedida} AND (${p.fechaVencimiento} IS NULL OR ${p.fechaVencimiento} >= ${hoy})),0)`;
    const vencido = sql`coalesce(sum(${p.cantidadDisponible}) FILTER (WHERE ${p.fechaVencimiento} < ${hoy}),0)`;
    // Nunca sumar cantidades expresadas en unidades diferentes ni inventar la
    // unidad de partidas históricas. El mínimo solo aplica a la unidad vigente.
    // La unidad vigente debe existir también con saldo cero cuando todas las
    // partidas conservan una unidad anterior. UNION evita duplicar esa fila.
    const unidades = sql`LATERAL (SELECT ${i.unidadMedida} AS unidad
      UNION SELECT ${p.unidadMedida} FROM ${p}
      WHERE ${p.insumoId}=${i.id} AND ${p.fincaId}=${f.id}) AS unidades`;
    const unidad = sql<string | null>`unidades.unidad`;
    const minimo = sql<boolean>`((${unidad}) = ${i.unidadMedida} AND ${utilizable} <= ${i.nivelMinimo})`;
    return this.db.select({ fincaId: f.id, insumoId: i.id, codigo: i.codigo, nombre: i.nombre,
      unidadMedida: unidad, nivelMinimo: i.nivelMinimo,
      stockFisico: sql<string>`coalesce(sum(${p.cantidadDisponible}),0)::text`,
      stockUtilizable: sql<string>`${utilizable}::text`, stockVencido: sql<string>`${vencido}::text`,
      alertaStockMinimo: sql<boolean>`coalesce(${minimo},false)`, alertaVencimiento: sql<boolean>`${vencido} > 0`,
    }).from(i).innerJoin(f, sql`true`).innerJoin(unidades, sql`true`)
      .leftJoin(p, and(eq(p.insumoId, i.id), eq(p.fincaId, f.id), sql`${p.unidadMedida} IS NOT DISTINCT FROM ${unidad}`))
      .where(and(alcance(f.id, actor), filtros.fincaId ? eq(f.id, filtros.fincaId) : undefined,
        filtros.insumoId ? eq(i.id, filtros.insumoId) : undefined,
        soloAlertas ? eq(i.estado, 'ACTIVO') : undefined))
      .groupBy(f.id, i.id, unidad)
      .having(soloAlertas ? sql`${minimo} OR ${vencido} > 0` : undefined)
      .orderBy(asc(f.id), asc(i.codigo), asc(unidad)).limit(filtros.limit).offset(filtros.offset);
  }
}
