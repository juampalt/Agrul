import { sql } from 'drizzle-orm';
import { check, date, index, jsonb, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { fincasTable, usuariosTable } from './tables.js';
import { partidasProduccionTable } from './poscosecha.js';

export const camarasSectorTable = pgTable('camaras_sector', {
  id: uuid('id').primaryKey(), fincaId: uuid('finca_id').notNull().references(() => fincasTable.id, { onDelete: 'restrict' }),
  nombre: varchar('nombre', { length: 40 }).notNull().unique(), descripcion: text('descripcion'),
  temperaturaObjetivoC: numeric('temperatura_objetivo_c', { precision: 5, scale: 2 }),
  creadoPor: uuid('creado_por').notNull().references(() => usuariosTable.id, { onDelete: 'restrict' }),
  solicitud: jsonb('solicitud').$type<Record<string, unknown>>().notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => [index('idx_camaras_finca').on(t.fincaId), check('camaras_nombre', sql`length(trim(${t.nombre}))>0 AND ${t.nombre}=trim(${t.nombre})`)]);
export const movimientosAlmacenamientoTable = pgTable('movimientos_almacenamiento', {
  id: uuid('id').primaryKey(),
  partidaProduccionId: uuid('partida_produccion_id').notNull().references(() => partidasProduccionTable.id, { onDelete: 'restrict' }),
  camaraSectorId: uuid('camara_sector_id').notNull().references(() => camarasSectorTable.id, { onDelete: 'restrict' }),
  tipoMovimiento: text('tipo_movimiento').$type<'INGRESO' | 'SALIDA'>().notNull(),
  cantidadKg: numeric('cantidad_kg', { precision: 10, scale: 2 }).notNull(), fechaMovimiento: date('fecha_movimiento', { mode: 'string' }).notNull(),
  responsableId: uuid('responsable_id').notNull().references(() => usuariosTable.id, { onDelete: 'restrict' }),
  registradoPor: uuid('registrado_por').notNull().references(() => usuariosTable.id, { onDelete: 'restrict' }),
  solicitud: jsonb('solicitud').$type<Record<string, unknown>>().notNull(),
  timestampCapturaLocal: timestamp('timestamp_captura_local', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => [
  index('idx_almacenamiento_partida_camara_fecha').on(t.partidaProduccionId, t.camaraSectorId, t.fechaMovimiento),
  check('almacenamiento_tipo', sql`${t.tipoMovimiento} IN ('INGRESO','SALIDA')`), check('almacenamiento_cantidad', sql`${t.cantidadKg}>0`),
]);
export const destinosProduccionTable = pgTable('destinos_produccion', {
  id: uuid('id').primaryKey(),
  partidaProduccionId: uuid('partida_produccion_id').notNull().references(() => partidasProduccionTable.id, { onDelete: 'restrict' }),
  fechaDestino: date('fecha_destino', { mode: 'string' }).notNull(), tipoDestino: text('tipo_destino').$type<'MERCADO_FRESCO' | 'INDUSTRIA' | 'OTRO'>().notNull(),
  destinoEspecifico: text('destino_especifico').notNull(), cantidadDestinadaKg: numeric('cantidad_destinada_kg', { precision: 10, scale: 2 }).notNull(),
  responsableId: uuid('responsable_id').notNull().references(() => usuariosTable.id, { onDelete: 'restrict' }),
  registradoPor: uuid('registrado_por').notNull().references(() => usuariosTable.id, { onDelete: 'restrict' }),
  solicitud: jsonb('solicitud').$type<Record<string, unknown>>().notNull(),
  timestampCapturaLocal: timestamp('timestamp_captura_local', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => [
  index('idx_destinos_partida_fecha').on(t.partidaProduccionId, t.fechaDestino),
  check('destinos_tipo', sql`${t.tipoDestino} IN ('MERCADO_FRESCO','INDUSTRIA','OTRO')`),
  check('destinos_cantidad', sql`${t.cantidadDestinadaKg}>0`), check('destinos_especifico', sql`length(trim(${t.destinoEspecifico}))>0`),
]);
