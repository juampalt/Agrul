import { sql } from 'drizzle-orm';
import { check, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';
import { EstadoCultivo, TipoCicloVida } from '../../../core/domain/entities/cultivo.entity.js';

export const cultivosTable = pgTable('cultivos', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 40 }).notNull().unique(),
  tipoCicloVida: varchar('tipo_ciclo_vida', { length: 7 }).$type<TipoCicloVida>().notNull(),
  descripcion: text('descripcion'),
  estado: varchar('estado', { length: 8 }).$type<EstadoCultivo>().notNull().default('ACTIVO'),
}, (table) => [
  check('cultivos_nombre_valido', sql`length(trim(${table.nombre})) > 0 AND ${table.nombre} = trim(${table.nombre})`),
  check('cultivos_tipo_valido', sql`${table.tipoCicloVida} IN ('ANUAL', 'PERENNE')`),
  check('cultivos_estado_valido', sql`${table.estado} IN ('ACTIVO', 'INACTIVO')`),
]);
