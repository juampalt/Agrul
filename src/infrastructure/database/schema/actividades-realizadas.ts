import { sql } from 'drizzle-orm';
import { check, date, foreignKey, index, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { ciclosProductivosTable } from './ciclos-productivos.js';
import { actividadesProgramadasTable } from './actividades-programadas.js';
import { tiposActividadTable } from './tipos-actividad.js';
import { lotesTable, usuariosTable } from './tables.js';

export const actividadesRealizadasTable = pgTable('actividades_realizadas', {
  id: uuid('id').defaultRandom().primaryKey(),
  cicloId: uuid('ciclo_id').notNull().references(() => ciclosProductivosTable.id, { onDelete: 'restrict' }),
  loteId: uuid('lote_id').notNull(),
  actividadProgramadaId: uuid('actividad_programada_id').unique().references(() => actividadesProgramadasTable.id, { onDelete: 'restrict' }),
  tipoActividadId: uuid('tipo_actividad_id').notNull().references(() => tiposActividadTable.id, { onDelete: 'restrict' }),
  fechaEjecucion: date('fecha_ejecucion', { mode: 'string' }).notNull(),
  responsableId: uuid('responsable_id').notNull(),
  superficieTrabajadaHa: numeric('superficie_trabajada', { precision: 8, scale: 2 }),
  observaciones: text('observaciones'),
  duracionHoras: numeric('duracion_horas', { precision: 5, scale: 2 }),
  descripcionTrabajo: text('descripcion_trabajo'),
  monitoreoId: uuid('monitoreo_id'),
  datosEspecificos: jsonb('datos_especificos').$type<Record<string, unknown>>().notNull().default({}),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (t) => [
  foreignKey({ columns: [t.loteId], foreignColumns: [lotesTable.id] }).onDelete('restrict'),
  foreignKey({ columns: [t.responsableId], foreignColumns: [usuariosTable.id] }).onDelete('restrict'),
  index('idx_realizadas_ciclo_fecha').on(t.cicloId, t.fechaEjecucion),
  check('realizadas_superficie_positiva', sql`${t.superficieTrabajadaHa} IS NULL OR ${t.superficieTrabajadaHa} > 0`),
  check('realizadas_duracion_positiva', sql`${t.duracionHoras} IS NULL OR ${t.duracionHoras} > 0`),
]);
