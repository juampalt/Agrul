import { sql } from 'drizzle-orm';
import { check, date, foreignKey, index, jsonb, numeric, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { TipoMovimientoInventario } from '../../../core/domain/entities/inventario-insumos.js';
import { insumosTable, partidasInsumoTable } from './insumos.js';
import { fincasTable, usuariosTable } from './tables.js';

export const movimientosInventarioTable = pgTable('movimientos_inventario', {
  id: uuid('id').defaultRandom().primaryKey(),
  insumoId: uuid('insumo_id').notNull().references(() => insumosTable.id, { onDelete: 'restrict' }),
  fincaId: uuid('finca_id').notNull().references(() => fincasTable.id, { onDelete: 'restrict' }),
  partidaId: uuid('partida_id'),
  tipoMovimiento: varchar('tipo_movimiento', { length: 30 }).$type<TipoMovimientoInventario>().notNull(),
  cantidad: numeric('cantidad', { precision: 10, scale: 2 }).notNull(),
  unidadMedida: varchar('unidad_medida', { length: 30 }).notNull(),
  fechaMovimiento: date('fecha_movimiento', { mode: 'string' }).notNull(),
  motivo: text('motivo').notNull(),
  responsableId: uuid('responsable_id').notNull(),
  solicitud: jsonb('solicitud').$type<Record<string, unknown>>().notNull(),
}, t => [
  foreignKey({ columns: [t.responsableId], foreignColumns: [usuariosTable.id] }).onDelete('restrict'),
  foreignKey({ columns: [t.partidaId, t.insumoId, t.fincaId], foreignColumns: [partidasInsumoTable.id, partidasInsumoTable.insumoId, partidasInsumoTable.fincaId] }).onDelete('restrict'),
  index('idx_movimientos_inventario_finca_fecha').on(t.fincaId, t.fechaMovimiento, t.id),
  index('idx_movimientos_inventario_partida').on(t.partidaId),
  check('movimientos_inventario_tipo_movimiento_check', sql`${t.tipoMovimiento} IN ('INGRESO','EXISTENCIA_INICIAL','AJUSTE_POSITIVO','AJUSTE_NEGATIVO','DEVOLUCION','PERDIDA','EGRESO_APLICACION','REGULARIZACION_CORRECCION')`),
  check('movimientos_inventario_cantidad_check', sql`${t.cantidad} <> 0 AND ${t.cantidad} <> 'NaN'::numeric AND (${t.cantidad} > 0 OR ${t.tipoMovimiento}='REGULARIZACION_CORRECCION')`),
  check('movimientos_inventario_unidad_medida_check', sql`length(btrim(${t.unidadMedida})) > 0`),
  check('movimientos_inventario_motivo_check', sql`length(btrim(${t.motivo})) > 0`),
]);
