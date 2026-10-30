import { sql } from 'drizzle-orm';
import { check, date, foreignKey, index, integer, numeric, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { EstadoPlantacion } from '../../../core/domain/entities/plantacion.entity.js';
import { cultivosTable } from './cultivos.js';
import { variedadesTable } from './variedades.js';
import { lotesTable } from './tables.js';

export const plantacionesTable = pgTable('plantaciones', {
  id: uuid('id').defaultRandom().primaryKey(),
  loteId: uuid('lote_id').notNull().references(() => lotesTable.id, { onDelete: 'restrict' }),
  cultivoId: uuid('cultivo_id').notNull().references(() => cultivosTable.id, { onDelete: 'restrict' }),
  variedadId: uuid('variedad_id').notNull(),
  fechaPlantacion: date('fecha_plantacion', { mode: 'string' }).notNull(),
  superficieHa: numeric('superficie_ha', { precision: 8, scale: 2 }).notNull(),
  cantidadInicialPlantas: integer('cantidad_inicial_plantas').notNull(),
  procedencia: text('procedencia'),
  observaciones: text('observaciones'),
  estado: varchar('estado', { length: 10 }).$type<EstadoPlantacion>().notNull().default('ACTIVA'),
  fechaFinalizacion: date('fecha_finalizacion', { mode: 'string' }),
}, (table) => [
  foreignKey({ name: 'plantaciones_variedad_cultivo_fk', columns: [table.variedadId, table.cultivoId],
    foreignColumns: [variedadesTable.id, variedadesTable.cultivoId] }).onDelete('restrict'),
  index('idx_plantaciones_lote_estado').on(table.loteId, table.estado),
  index('idx_plantaciones_cultivo_variedad').on(table.cultivoId, table.variedadId),
  check('plantaciones_superficie_positiva', sql`${table.superficieHa} > 0`),
  check('plantaciones_plantas_positivas', sql`${table.cantidadInicialPlantas} > 0`),
  check('plantaciones_estado_fechas', sql`(${table.estado} = 'ACTIVA' AND ${table.fechaFinalizacion} IS NULL)
    OR (${table.estado} = 'FINALIZADA' AND ${table.fechaFinalizacion} IS NOT NULL AND ${table.fechaFinalizacion} >= ${table.fechaPlantacion})`),
]);
