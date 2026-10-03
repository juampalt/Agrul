import { pgTable, uuid, varchar, numeric, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// TABLA READ MODEL: Lotes
export const lotesTable = pgTable('lotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  codigoLote: varchar('codigo_lote', { length: 60 }).notNull().unique(),
  producto: varchar('producto', { length: 120 }).notNull(),
  variedad: varchar('variedad', { length: 100 }),
  estadoActual: varchar('estado_actual', { length: 30 }).notNull().default('CREADO'),
  cantidadActual: numeric('cantidad_actual', { precision: 14, scale: 4 }).notNull().default('0'),
  unidadMedida: varchar('unidad_medida', { length: 20 }).notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

// TABLA WRITE MODEL: Eventos de Trazabilidad (Append-Only)
export const eventosTrazabilidadTable = pgTable('eventos_trazabilidad', {
  id: uuid('id').defaultRandom().primaryKey(),
  loteId: uuid('lote_id').notNull().references(() => lotesTable.id, { onDelete: 'restrict' }),
  actorId: uuid('actor_id').notNull(),
  ubicacionId: uuid('ubicacion_id').notNull(),
  tipoEvento: varchar('tipo_evento', { length: 50 }).notNull(),
  timestampCapturaLocal: timestamp('timestamp_captura_local', { withTimezone: true, mode: 'string' }).notNull(),
  timestampServidor: timestamp('timestamp_servidor', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  payloadEspecifico: jsonb('payload_especifico').notNull().default({}),
  eventoReferenciadoId: uuid('evento_referenciado_id'), // Para eventos compensatorios
  estadoSincronizacion: varchar('estado_sincronizacion', { length: 30 }).notNull().default('SINCRONIZADO'),
}, (table) => [
  index('idx_eventos_lote_timestamp').on(table.loteId, table.timestampCapturaLocal),
  index('idx_eventos_tipo').on(table.tipoEvento),
  index('idx_eventos_referenciado').on(table.eventoReferenciadoId),
]);

// TABLA GRAFO DE LINAJE N:M: Genealogía de Lotes
export const loteGenealogiaTable = pgTable('lote_genealogia', {
  id: uuid('id').defaultRandom().primaryKey(),
  lotePadreId: uuid('lote_padre_id').notNull().references(() => lotesTable.id, { onDelete: 'restrict' }),
  loteHijoId: uuid('lote_hijo_id').notNull().references(() => lotesTable.id, { onDelete: 'restrict' }),
  cantidadAportada: numeric('cantidad_aportada', { precision: 14, scale: 4 }).notNull(),
  unidadMedida: varchar('unidad_medida', { length: 20 }).notNull(),
  motivoRelacion: varchar('motivo_relacion', { length: 50 }).notNull(), // SPLIT, BLEND_MERGE, REPROCESO
  fechaUtc: timestamp('fecha_utc', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_genealogia_padre').on(table.lotePadreId),
  index('idx_genealogia_hijo').on(table.loteHijoId),
]);

// RELACIONES DRIZZLE
export const lotesRelations = relations(lotesTable, ({ many }) => ({
  eventos: many(eventosTrazabilidadTable),
  relacionesComoPadre: many(loteGenealogiaTable, { relationName: 'lotePadre' }),
  relacionesComoHijo: many(loteGenealogiaTable, { relationName: 'loteHijo' }),
}));

export const eventosRelations = relations(eventosTrazabilidadTable, ({ one }) => ({
  lote: one(lotesTable, {
    fields: [eventosTrazabilidadTable.loteId],
    references: [lotesTable.id],
  }),
}));

export const genealogiaRelations = relations(loteGenealogiaTable, ({ one }) => ({
  lotePadre: one(lotesTable, {
    fields: [loteGenealogiaTable.lotePadreId],
    references: [lotesTable.id],
    relationName: 'lotePadre',
  }),
  loteHijo: one(lotesTable, {
    fields: [loteGenealogiaTable.loteHijoId],
    references: [lotesTable.id],
    relationName: 'loteHijo',
  }),
}));
