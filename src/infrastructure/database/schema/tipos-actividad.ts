import { sql } from 'drizzle-orm';
import { check, index, pgTable, primaryKey, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { cultivosTable } from './cultivos.js';

export const CATEGORIAS_TIPO_ACTIVIDAD = [
  'PREPARACION_SUELO',
  'PLANTACION',
  'RIEGO',
  'FERTILIZACION',
  'MANTENIMIENTO',
  'CONTROL_SANITARIO',
  'OTRO',
] as const;

export type CategoriaTipoActividad = typeof CATEGORIAS_TIPO_ACTIVIDAD[number];
export type EstadoTipoActividad = 'ACTIVA' | 'INACTIVA';

export const tiposActividadTable = pgTable('tipos_actividad', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 40 }).notNull().unique(),
  categoria: varchar('categoria', { length: 20 }).$type<CategoriaTipoActividad>().notNull(),
  descripcion: text('descripcion'),
  estado: varchar('estado', { length: 8 }).$type<EstadoTipoActividad>().notNull().default('ACTIVA'),
}, (table) => [
  index('idx_tipos_actividad_categoria').on(table.categoria),
  index('idx_tipos_actividad_estado').on(table.estado),
  check('tipos_actividad_nombre_valido', sql`length(trim(${table.nombre})) > 0 AND ${table.nombre} = trim(${table.nombre})`),
  check('tipos_actividad_categoria_valida', sql`${table.categoria} IN ('PREPARACION_SUELO', 'PLANTACION', 'RIEGO', 'FERTILIZACION', 'MANTENIMIENTO', 'CONTROL_SANITARIO', 'OTRO')`),
  check('tipos_actividad_estado_valido', sql`${table.estado} IN ('ACTIVA', 'INACTIVA')`),
]);

export const tiposActividadCultivosTable = pgTable('tipos_actividad_cultivos', {
  tipoActividadId: uuid('tipo_actividad_id').notNull().references(() => tiposActividadTable.id, { onDelete: 'restrict' }),
  cultivoId: uuid('cultivo_id').notNull().references(() => cultivosTable.id, { onDelete: 'restrict' }),
}, (table) => [
  primaryKey({ name: 'tipos_actividad_cultivos_pk', columns: [table.tipoActividadId, table.cultivoId] }),
  index('idx_tipos_actividad_cultivos_cultivo').on(table.cultivoId),
]);
