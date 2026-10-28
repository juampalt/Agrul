import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { EstadoVariedad } from '../../../core/domain/entities/variedad.entity.js';
import { cultivosTable } from './cultivos.js';

export const variedadesTable = pgTable('variedades', {
  id: uuid('id').defaultRandom().primaryKey(),
  cultivoId: uuid('cultivo_id').notNull().references(() => cultivosTable.id, { onDelete: 'restrict' }),
  nombre: varchar('nombre', { length: 40 }).notNull(),
  descripcion: text('descripcion'),
  estado: varchar('estado', { length: 8 }).$type<EstadoVariedad>().notNull().default('ACTIVO'),
}, (table) => [
  unique('variedades_cultivo_nombre_unique').on(table.cultivoId, table.nombre),
  index('idx_variedades_cultivo_estado').on(table.cultivoId, table.estado),
  check('variedades_nombre_valido', sql`length(trim(${table.nombre})) > 0 AND ${table.nombre} = trim(${table.nombre})`),
  check('variedades_estado_valido', sql`${table.estado} IN ('ACTIVO', 'INACTIVO')`),
]);
