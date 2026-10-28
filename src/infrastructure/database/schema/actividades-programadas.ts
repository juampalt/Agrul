import { sql } from 'drizzle-orm';
import { check, index, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { ciclosProductivosTable } from './ciclos-productivos.js';

/** Subconjunto canónico de SPEC.md para RN-09; AGRUL-054 ampliará esta misma tabla. */
export const actividadesProgramadasTable = pgTable('actividades_programadas', {
  id: uuid('id').defaultRandom().primaryKey(),
  cicloId: uuid('ciclo_id').notNull().references(() => ciclosProductivosTable.id, { onDelete: 'restrict' }),
  estado: varchar('estado', { length: 10 }).$type<'PENDIENTE' | 'EJECUTADA' | 'CANCELADA'>().notNull().default('PENDIENTE'),
}, (table) => [
  index('idx_actividades_programadas_ciclo_estado').on(table.cicloId, table.estado),
  check('actividades_programadas_estado_valido', sql`${table.estado} IN ('PENDIENTE', 'EJECUTADA', 'CANCELADA')`),
]);
