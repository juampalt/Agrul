import { sql } from 'drizzle-orm';
import { check, date, foreignKey, index, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { ciclosProductivosTable } from './ciclos-productivos.js';
import { tiposActividadTable } from './tipos-actividad.js';
import { usuariosTable } from './tables.js';

export type EstadoActividadProgramada = 'PENDIENTE' | 'EJECUTADA' | 'CANCELADA';

/**
 * Tabla canónica de actividades programadas (SPEC.md / Módulo 3 / RN-09 / RN-12).
 * Vincula la planificación de labores agrícolas a un ciclo productivo, tipo de actividad y responsable.
 */
export const actividadesProgramadasTable = pgTable('actividades_programadas', {
  id: uuid('id').defaultRandom().primaryKey(),
  cicloId: uuid('ciclo_id').notNull().references(() => ciclosProductivosTable.id, { onDelete: 'restrict' }),
  tipoActividadId: uuid('tipo_actividad_id').references(() => tiposActividadTable.id, { onDelete: 'restrict' }),
  fechaProgramada: date('fecha_programada', { mode: 'string' }),
  responsableId: uuid('responsable_id'),
  superficiePrevista: numeric('superficie_prevista', { precision: 8, scale: 2 }),
  descripcion: text('descripcion'),
  observaciones: text('observaciones'),
  estado: varchar('estado', { length: 10 }).$type<EstadoActividadProgramada>().notNull().default('PENDIENTE'),
  motivoCancelacion: text('motivo_cancelacion'),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({ name: 'actividades_programadas_responsable_fk', columns: [table.responsableId], foreignColumns: [usuariosTable.id] }).onDelete('restrict'),
  index('idx_actividades_programadas_ciclo_estado').on(table.cicloId, table.estado),
  index('idx_actividades_programadas_tipo').on(table.tipoActividadId),
  index('idx_actividades_programadas_responsable').on(table.responsableId),
  index('idx_actividades_programadas_fecha').on(table.fechaProgramada),
  check('actividades_programadas_estado_valido', sql`${table.estado} IN ('PENDIENTE', 'EJECUTADA', 'CANCELADA')`),
  check('actividades_programadas_motivo_cancelacion_check', sql`${table.estado} != 'CANCELADA' OR (${table.motivoCancelacion} IS NOT NULL AND length(trim(${table.motivoCancelacion})) > 0)`),
  check('actividades_programadas_superficie_prevista_check', sql`${table.superficiePrevista} IS NULL OR ${table.superficiePrevista} > 0`),
]);
