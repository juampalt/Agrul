import { pgTable, uuid, varchar, numeric, timestamp, jsonb, index, boolean, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// TABLA FINCAS: Gestión de Fincas y Establecimientos Productivos
export const fincasTable = pgTable('fincas', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 150 }).notNull().unique(),
  localidad: varchar('localidad', { length: 120 }).notNull(),
  departamento: varchar('departamento', { length: 120 }).notNull(),
  provincia: varchar('provincia', { length: 120 }).notNull(),
  superficieTotalHa: numeric('superficie_total_ha', { precision: 10, scale: 2 }).notNull(),
  responsableId: uuid('responsable_id'),
  renspa: varchar('renspa', { length: 50 }),
  geometria: jsonb('geometria'),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_fincas_provincia_depto').on(table.provincia, table.departamento),
]);

// TABLA READ MODEL: Lotes
export const lotesTable = pgTable('lotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  codigoLote: varchar('codigo_lote', { length: 60 }).notNull().unique(),
  producto: varchar('producto', { length: 120 }).notNull(),
  variedad: varchar('variedad', { length: 100 }),
  estadoActual: varchar('estado_actual', { length: 30 }).notNull().default('CREADO'),
  cantidadActual: numeric('cantidad_actual', { precision: 14, scale: 4 }).notNull().default('0'),
  unidadMedida: varchar('unidad_medida', { length: 20 }).notNull(),
  fincaId: uuid('finca_id').references(() => fincasTable.id, { onDelete: 'set null' }),
  superficieHa: numeric('superficie_ha', { precision: 10, scale: 2 }),
  geometria: jsonb('geometria'),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_lotes_finca').on(table.fincaId),
  index('idx_lotes_estado').on(table.estadoActual),
]);

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
export const fincasRelations = relations(fincasTable, ({ many }) => ({
  lotes: many(lotesTable),
}));

export const lotesRelations = relations(lotesTable, ({ one, many }) => ({
  finca: one(fincasTable, {
    fields: [lotesTable.fincaId],
    references: [fincasTable.id],
  }),
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

// ============================================================================
// ÉPICA 9: MÓDULO 3 — CATÁLOGOS DE ACTIVIDADES AGRÍCOLAS (AGRUL-020)
// ============================================================================

// TABLA CATÁLOGO: Tipos de Actividad Agrícola (RF-M3-01 / RNF-13)
export const tiposActividadTable = pgTable('tipo_actividad_catalogo', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 120 }).notNull().unique(),
  categoria: varchar('categoria', { length: 50 }).notNull().default('MANEJO'),
  descripcion: text('descripcion'),
  requiereMaquinaria: boolean('requiere_maquinaria').notNull().default(false),
  requiereInsumos: boolean('requiere_insumos').notNull().default(false),
  activo: boolean('activo').notNull().default(true),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_tipos_actividad_categoria').on(table.categoria),
  index('idx_tipos_actividad_activo').on(table.activo),
]);

// TABLA CATÁLOGO: Personal y Cuadrillas de Campo (RF-M3-03)
export const personalCuadrillasTable = pgTable('personal_cuadrilla', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 150 }).notNull(),
  tipo: varchar('tipo', { length: 30 }).notNull().default('INDIVIDUAL'), // INDIVIDUAL | CUADRILLA
  dniOIdentificacion: varchar('dni_o_identificacion', { length: 50 }),
  usuarioId: uuid('usuario_id'), // Opcionalmente asociado a un usuario del sistema
  telefono: varchar('telefono', { length: 50 }),
  activo: boolean('activo').notNull().default(true),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_personal_tipo').on(table.tipo),
  index('idx_personal_activo').on(table.activo),
]);

// TABLA CATÁLOGO: Maquinaria Agrícola (RF-M3-06)
export const maquinariaCatalogoTable = pgTable('maquinaria_catalogo', {
  id: uuid('id').defaultRandom().primaryKey(),
  identificacion: varchar('identificacion', { length: 120 }).notNull().unique(),
  tipo: varchar('tipo', { length: 50 }).notNull().default('TRACTOR'),
  condicion: varchar('condicion', { length: 40 }).notNull().default('PROPIO'), // PROPIO | ALQUILADO | SERVICIO_CONTRATADO
  marcaModelo: varchar('marca_modelo', { length: 120 }),
  activo: boolean('activo').notNull().default(true),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_maquinaria_condicion').on(table.condicion),
  index('idx_maquinaria_activo').on(table.activo),
]);

// ============================================================================
// ÉPICA 8 & 9: CICLOS PRODUCTIVOS Y ACTIVIDADES AGRÍCOLAS (AGRUL-021)
// ============================================================================

// TABLA READ/WRITE MODEL: Ciclos Productivos (Módulo 2 / RF-M2-02 / RF-M3-02)
export const ciclosProductivosTable = pgTable('ciclos_productivos', {
  id: uuid('id').defaultRandom().primaryKey(),
  codigoCiclo: varchar('codigo_ciclo', { length: 60 }).notNull().unique(),
  loteId: uuid('lote_id').notNull().references(() => lotesTable.id, { onDelete: 'restrict' }),
  cultivo: varchar('cultivo', { length: 120 }).notNull(),
  variedad: varchar('variedad', { length: 100 }),
  estado: varchar('estado', { length: 30 }).notNull().default('ABIERTO'), // PLANIFICADO | ABIERTO | CERRADO
  superficieCultivadaHa: numeric('superficie_cultivada_ha', { precision: 10, scale: 2 }).notNull(),
  fechaInicio: varchar('fecha_inicio', { length: 30 }).notNull(),
  fechaFin: varchar('fecha_fin', { length: 30 }),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_ciclos_lote_estado').on(table.loteId, table.estado),
  index('idx_ciclos_codigo').on(table.codigoCiclo),
]);

// TABLA READ/WRITE MODEL: Actividades Agrícolas / Labores de Campo (RF-M3-02 / RN-01)
export const actividadesAgricolasTable = pgTable('actividades_agricolas', {
  id: uuid('id').defaultRandom().primaryKey(),
  codigoActividad: varchar('codigo_actividad', { length: 60 }).notNull().unique(),
  tipoActividadId: uuid('tipo_actividad_id').notNull().references(() => tiposActividadTable.id, { onDelete: 'restrict' }),
  loteId: uuid('lote_id').notNull().references(() => lotesTable.id, { onDelete: 'restrict' }),
  cicloId: uuid('ciclo_id').notNull().references(() => ciclosProductivosTable.id, { onDelete: 'restrict' }),
  fechaHecho: varchar('fecha_hecho', { length: 30 }).notNull(),
  hora: varchar('hora', { length: 15 }),
  usuarioCargaId: uuid('usuario_carga_id').notNull(),
  trabajadorResponsableId: uuid('trabajador_responsable_id').references(() => personalCuadrillasTable.id, { onDelete: 'set null' }),
  superficieTrabajadaHa: numeric('superficie_trabajada_ha', { precision: 10, scale: 2 }).notNull(),
  observaciones: text('observaciones'),
  estado: varchar('estado', { length: 30 }).notNull().default('REALIZADA'), // REALIZADA | PLANIFICADA | VENCIDA | CANCELADA
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_actividades_lote').on(table.loteId),
  index('idx_actividades_ciclo').on(table.cicloId),
  index('idx_actividades_tipo').on(table.tipoActividadId),
  index('idx_actividades_fecha').on(table.fechaHecho),
]);

// TABLA DETALLE: Maquinaria Utilizada en Actividad (RF-M3-05)
export const actividadMaquinariaTable = pgTable('actividad_maquinaria', {
  id: uuid('id').defaultRandom().primaryKey(),
  actividadId: uuid('actividad_id').notNull().references(() => actividadesAgricolasTable.id, { onDelete: 'cascade' }),
  maquinariaId: uuid('maquinaria_id').notNull().references(() => maquinariaCatalogoTable.id, { onDelete: 'restrict' }),
  horasUso: numeric('horas_uso', { precision: 8, scale: 2 }).notNull(),
}, (table) => [
  index('idx_act_maq_actividad').on(table.actividadId),
  index('idx_act_maq_maquinaria').on(table.maquinariaId),
]);

// TABLA DETALLE: Mano de Obra Consumida en Actividad (RF-M3-15)
export const actividadManoObraTable = pgTable('actividad_mano_obra', {
  id: uuid('id').defaultRandom().primaryKey(),
  actividadId: uuid('actividad_id').notNull().references(() => actividadesAgricolasTable.id, { onDelete: 'cascade' }),
  personalCuadrillaId: uuid('personal_cuadrilla_id').notNull().references(() => personalCuadrillasTable.id, { onDelete: 'restrict' }),
  cantidadPersonas: numeric('cantidad_personas', { precision: 6, scale: 0 }).notNull(),
  horasTrabajadas: numeric('horas_trabajadas', { precision: 8, scale: 2 }).notNull(),
  jornales: numeric('jornales', { precision: 8, scale: 2 }).notNull(),
}, (table) => [
  index('idx_act_mo_actividad').on(table.actividadId),
  index('idx_act_mo_personal').on(table.personalCuadrillaId),
]);


