import { sql } from 'drizzle-orm';
import { check, index, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

/** Subconjunto canónico de SPEC.md para RN-09; AGRUL-054 ampliará esta misma tabla. */
export const actividadesProgramadasTable = pgTable('actividades_programadas', {
  id: uuid('id').defaultRandom().primaryKey(),
  // La FK se agregará con la migración de ciclos de CU18–CU21: esa tabla aún no está versionada.
  cicloId: uuid('ciclo_id').notNull(),
  estado: varchar('estado', { length: 10 }).$type<'PENDIENTE' | 'EJECUTADA' | 'CANCELADA'>().notNull().default('PENDIENTE'),
}, (table) => [
  index('idx_actividades_programadas_ciclo_estado').on(table.cicloId, table.estado),
  check('actividades_programadas_estado_valido', sql`${table.estado} IN ('PENDIENTE', 'EJECUTADA', 'CANCELADA')`),
]);
