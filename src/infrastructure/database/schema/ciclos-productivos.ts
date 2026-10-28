import { sql } from 'drizzle-orm';
import { check, date, foreignKey, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { EstadoCicloPlanificado } from '../../../core/domain/value-objects/planificacion-ciclo.vo.js';
import { plantacionesTable } from './plantaciones.js';
import { usuariosTable } from './tables.js';

export const ciclosProductivosTable = pgTable('ciclos_productivos', {
  id: uuid('id').defaultRandom().primaryKey(),
  plantacionId: uuid('plantacion_id').notNull().references(() => plantacionesTable.id, { onDelete: 'restrict' }),
  nombreCodigo: varchar('nombre_codigo', { length: 30 }).notNull().unique(),
  fechaInicioPrevista: date('fecha_inicio_prevista', { mode: 'string' }).notNull(),
  fechaFinPrevista: date('fecha_fin_prevista', { mode: 'string' }).notNull(),
  fechaInicioEfectiva: date('fecha_inicio_efectiva', { mode: 'string' }),
  fechaFinEfectiva: date('fecha_fin_efectiva', { mode: 'string' }),
  responsableSeguimientoId: uuid('responsable_seguimiento_id').notNull(),
  estado: varchar('estado', { length: 11 }).$type<EstadoCicloPlanificado>().notNull().default('PLANIFICADO'),
  observaciones: text('observaciones'),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  foreignKey({ name: 'ciclos_responsable_usuario_fk', columns: [table.responsableSeguimientoId], foreignColumns: [usuariosTable.id] }).onDelete('restrict'),
  index('idx_ciclos_plantacion_estado').on(table.plantacionId, table.estado),
  check('ciclos_nombre_valido', sql`length(trim(${table.nombreCodigo})) > 0 AND ${table.nombreCodigo} = trim(${table.nombreCodigo})`),
  check('ciclos_fechas_previstas', sql`${table.fechaFinPrevista} >= ${table.fechaInicioPrevista}`),
  check('ciclos_estado_fechas', sql`(${table.estado} = 'PLANIFICADO' AND ${table.fechaInicioEfectiva} IS NULL AND ${table.fechaFinEfectiva} IS NULL)
    OR (${table.estado} = 'ACTIVO' AND ${table.fechaInicioEfectiva} IS NOT NULL AND ${table.fechaFinEfectiva} IS NULL)
    OR (${table.estado} = 'FINALIZADO' AND ${table.fechaInicioEfectiva} IS NOT NULL AND ${table.fechaFinEfectiva} IS NOT NULL AND ${table.fechaFinEfectiva} >= ${table.fechaInicioEfectiva})`),
]);
