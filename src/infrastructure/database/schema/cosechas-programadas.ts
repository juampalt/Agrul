import { sql } from 'drizzle-orm';
import { check, date, index, integer, jsonb, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { EstadoJornadaCosecha } from '../../../core/domain/entities/cosecha-programada.entity.js';
import { HistorialJornadaCosecha } from '../../../core/ports/cosechas-programadas-repository.port.js';
import { ciclosProductivosTable } from './ciclos-productivos.js';
import { usuariosTable } from './tables.js';

export const cosechasProgramadasTable = pgTable('cosechas_programadas', {
  id: uuid('id').primaryKey(),
  cicloId: uuid('ciclo_id').notNull().references(() => ciclosProductivosTable.id, { onDelete: 'restrict' }),
  fechaPrevista: date('fecha_prevista', { mode: 'string' }).notNull(),
  responsableId: uuid('responsable_id').notNull().references(() => usuariosTable.id, { onDelete: 'restrict' }),
  sector: text('sector').notNull(),
  cantidadEstimadaKg: numeric('cantidad_estimada_kg', { precision: 10, scale: 2 }).notNull(),
  estado: varchar('estado', { length: 10 }).$type<EstadoJornadaCosecha>().notNull().default('PENDIENTE'),
  motivoCancelacion: text('motivo_cancelacion'),
  version: integer('version').notNull().default(1),
  actualizadoPor: uuid('actualizado_por').notNull().references(() => usuariosTable.id, { onDelete: 'restrict' }),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => [
  index('idx_cosechas_programadas_ciclo_fecha').on(t.cicloId, t.fechaPrevista),
  index('idx_cosechas_programadas_responsable').on(t.responsableId),
  check('cosechas_programadas_estado', sql`${t.estado} IN ('PENDIENTE','EJECUTADA','CANCELADA')`),
  check('cosechas_programadas_estimacion', sql`${t.cantidadEstimadaKg} >= 0 AND ${t.cantidadEstimadaKg} <= 99999999.99`),
  check('cosechas_programadas_sector', sql`length(trim(${t.sector})) > 0 AND ${t.sector} = trim(${t.sector})`),
  check('cosechas_programadas_cancelacion', sql`(${t.estado} = 'CANCELADA' AND length(trim(${t.motivoCancelacion})) > 0 AND ${t.motivoCancelacion} IS NOT NULL) OR (${t.estado} <> 'CANCELADA' AND ${t.motivoCancelacion} IS NULL)`),
  check('cosechas_programadas_version', sql`${t.version} > 0`),
]);
export const historialJornadasCosechaTable = pgTable('cosechas_programadas_historial', {
  id: uuid('id').primaryKey().defaultRandom(),
  jornadaId: uuid('jornada_id').notNull().references(() => cosechasProgramadasTable.id, { onDelete: 'restrict' }),
  operacion: text('operacion').$type<HistorialJornadaCosecha['operacion']>().notNull(),
  actorId: uuid('actor_id').notNull().references(() => usuariosTable.id, { onDelete: 'restrict' }),
  anterior: jsonb('anterior').$type<Record<string, unknown> | null>(),
  nuevo: jsonb('nuevo').$type<Record<string, unknown>>().notNull(),
  registradoEn: timestamp('registrado_en', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, t => [
  index('idx_cosechas_programadas_historial_jornada').on(t.jornadaId, t.registradoEn),
  check('cosechas_programadas_historial_operacion', sql`${t.operacion} IN ('PROGRAMACION','REPROGRAMACION','CANCELACION')`),
]);
