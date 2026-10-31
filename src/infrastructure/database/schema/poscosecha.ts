import { sql } from 'drizzle-orm';
import { check, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { cosechasTable, usuariosTable } from './tables.js';

export const clasificacionesTable = pgTable('clasificaciones', {
  id: uuid('id').primaryKey(),
  cosechaId: uuid('cosecha_id').notNull().references(() => cosechasTable.id, { onDelete: 'restrict' }),
  fechaClasificacion: date('fecha_clasificacion', { mode: 'string' }).notNull(),
  cantidadRecibidaKg: numeric('cantidad_recibida_kg', { precision: 10, scale: 2 }).notNull(),
  kgFresco: numeric('kg_fresco', { precision: 10, scale: 2 }).notNull(),
  kgIndustria: numeric('kg_industria', { precision: 10, scale: 2 }).notNull(),
  kgDescarte: numeric('kg_descarte', { precision: 10, scale: 2 }).notNull(),
  motivosDescarte: jsonb('motivos_descarte').$type<string[]>().notNull().default([]),
  descartePorCausa: jsonb('descarte_por_causa').$type<{ causa: string; kg: number }[] | null>(),
  observaciones: text('observaciones'),
  responsableId: uuid('responsable_id').notNull().references(() => usuariosTable.id, { onDelete: 'restrict' }),
  registradoPor: uuid('registrado_por').notNull().references(() => usuariosTable.id, { onDelete: 'restrict' }),
  solicitud: jsonb('solicitud').$type<Record<string, unknown>>().notNull(),
  timestampCapturaLocal: timestamp('timestamp_captura_local', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => [
  index('idx_clasificaciones_cosecha_fecha').on(t.cosechaId, t.fechaClasificacion),
  check('clasificaciones_cantidades', sql`${t.cantidadRecibidaKg}>0 AND ${t.kgFresco}>=0 AND ${t.kgIndustria}>=0 AND ${t.kgDescarte}>=0`),
  check('clasificaciones_balance', sql`${t.cantidadRecibidaKg}=${t.kgFresco}+${t.kgIndustria}+${t.kgDescarte}`),
]);
export const partidasProduccionTable = pgTable('partidas_produccion', {
  id: uuid('id').primaryKey().defaultRandom(),
  clasificacionId: uuid('clasificacion_id').notNull().references(() => clasificacionesTable.id, { onDelete: 'restrict' }),
  categoria: text('categoria').$type<'FRESCO' | 'INDUSTRIA'>().notNull(),
  cantidadInicialKg: numeric('cantidad_inicial_kg', { precision: 10, scale: 2 }).notNull(),
  cantidadDisponibleKg: numeric('cantidad_disponible_kg', { precision: 10, scale: 2 }).notNull(),
}, t => [
  uniqueIndex('partidas_produccion_clasificacion_categoria_unique').on(t.clasificacionId, t.categoria),
  check('partidas_produccion_categoria', sql`${t.categoria} IN ('FRESCO','INDUSTRIA')`),
  check('partidas_produccion_saldo', sql`${t.cantidadInicialKg}>0 AND ${t.cantidadDisponibleKg}>=0 AND ${t.cantidadDisponibleKg}<=${t.cantidadInicialKg}`),
]);
export const acondicionamientosTable = pgTable('acondicionamientos', {
  id: uuid('id').primaryKey(),
  partidaProduccionId: uuid('partida_produccion_id').notNull().references(() => partidasProduccionTable.id, { onDelete: 'restrict' }),
  fechaAcondicionamiento: date('fecha_acondicionamiento', { mode: 'string' }).notNull(),
  tipoAcondicionamiento: text('tipo_acondicionamiento').notNull(), tipoEnvase: text('tipo_envase').notNull(), observaciones: text('observaciones'),
  cantidadKg: numeric('cantidad_kg', { precision: 10, scale: 2 }).notNull(),
  cantidadEnvases: integer('cantidad_envases'),
  responsableId: uuid('responsable_id').notNull().references(() => usuariosTable.id, { onDelete: 'restrict' }),
  registradoPor: uuid('registrado_por').notNull().references(() => usuariosTable.id, { onDelete: 'restrict' }),
  solicitud: jsonb('solicitud').$type<Record<string, unknown>>().notNull(),
  timestampCapturaLocal: timestamp('timestamp_captura_local', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => [
  index('idx_acondicionamientos_partida_fecha').on(t.partidaProduccionId, t.fechaAcondicionamiento),
  check('acondicionamientos_cantidad', sql`${t.cantidadKg}>0 AND (${t.cantidadEnvases} IS NULL OR ${t.cantidadEnvases}>0)`),
  check('acondicionamientos_descripcion', sql`length(trim(${t.tipoAcondicionamiento}))>0 AND length(trim(${t.tipoEnvase}))>0`),
]);
