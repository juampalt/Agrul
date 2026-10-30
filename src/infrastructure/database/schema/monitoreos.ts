import { sql } from 'drizzle-orm';
import { check, date, foreignKey, index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { ciclosProductivosTable } from './ciclos-productivos.js';
import { lotesTable, usuariosTable } from './tables.js';

export const monitoreosTable = pgTable('monitoreos', {
  id: uuid('id').defaultRandom().primaryKey(),
  cicloId: uuid('ciclo_id').notNull().references(() => ciclosProductivosTable.id, { onDelete: 'restrict' }),
  loteId: uuid('lote_id').notNull(),
  responsableId: uuid('responsable_id').notNull(),
  fechaInspeccion: date('fecha_inspeccion', { mode: 'string' }).notNull(),
  sectorObservado: varchar('sector_observado', { length: 120 }),
  etapaFenologica: varchar('etapa_fenologica', { length: 100 }),
  estadoGeneralCultivo: varchar('estado_general_cultivo', { length: 100 }).notNull(),
  tipoObservacion: varchar('tipo_observacion', { length: 100 }).notNull(),
  problemaDetectado: text('problema_detectado'),
  descripcionHallazgos: text('descripcion_hallazgos').notNull(),
  accionRecomendada: text('accion_recomendada'),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => [
  foreignKey({ columns: [t.loteId], foreignColumns: [lotesTable.id] }).onDelete('restrict'),
  foreignKey({ columns: [t.responsableId], foreignColumns: [usuariosTable.id] }).onDelete('restrict'),
  index('idx_monitoreos_ciclo_fecha').on(t.cicloId, t.fechaInspeccion),
  index('idx_monitoreos_lote_fecha').on(t.loteId, t.fechaInspeccion),
  check('monitoreos_textos_obligatorios', sql`(${t.etapaFenologica} IS NULL OR length(trim(${t.etapaFenologica})) > 0) AND length(trim(${t.estadoGeneralCultivo})) > 0 AND length(trim(${t.tipoObservacion})) > 0 AND length(trim(${t.descripcionHallazgos})) > 0`),
]);
