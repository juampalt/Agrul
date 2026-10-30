import { sql } from 'drizzle-orm';
import { check, foreignKey, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { aplicacionesInsumoTable } from './insumos.js';
import { eventosTrazabilidadTable, usuariosTable } from './tables.js';

export const correccionesAplicacionesTable = pgTable('correcciones_aplicaciones_insumo', {
  id: uuid('id').primaryKey(),
  aplicacionAnteriorId: uuid('aplicacion_anterior_id').notNull().unique().references(() => aplicacionesInsumoTable.id, { onDelete: 'restrict' }),
  // La migración declara la FK de nueva versión DEFERRABLE INITIALLY DEFERRED.
  aplicacionNuevaId: uuid('aplicacion_nueva_id').notNull().unique().references(() => aplicacionesInsumoTable.id, { onDelete: 'restrict' }),
  eventoOriginalId: uuid('evento_original_id').notNull(),
  motivo: text('motivo').notNull(),
  responsableId: uuid('responsable_id').notNull(),
  registradoEn: timestamp('registrado_en', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  solicitud: jsonb('solicitud').$type<Record<string, unknown>>().notNull(),
}, t => [
  foreignKey({ columns: [t.eventoOriginalId], foreignColumns: [eventosTrazabilidadTable.id] }).onDelete('restrict'),
  foreignKey({ columns: [t.responsableId], foreignColumns: [usuariosTable.id] }).onDelete('restrict'),
  check('correcciones_aplicaciones_insumo_motivo_check', sql`length(btrim(${t.motivo})) > 0`),
  check('correcciones_aplicaciones_insumo_check', sql`${t.aplicacionAnteriorId} <> ${t.aplicacionNuevaId}`),
]);
