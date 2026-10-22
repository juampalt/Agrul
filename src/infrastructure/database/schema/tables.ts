import { pgTable, uuid, varchar, numeric, timestamp, jsonb, index, boolean, text, integer } from 'drizzle-orm/pg-core';
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
  observacionMonitoreoId: uuid('observacion_monitoreo_id'),
  estado: varchar('estado', { length: 30 }).notNull().default('REALIZADA'), // REALIZADA | PLANIFICADA | VENCIDA | CANCELADA
  motivoCancelacion: text('motivo_cancelacion'),
  canceladoEn: timestamp('cancelado_en', { withTimezone: true, mode: 'string' }),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_actividades_lote').on(table.loteId),
  index('idx_actividades_ciclo').on(table.cicloId),
  index('idx_actividades_tipo').on(table.tipoActividadId),
  index('idx_actividades_fecha').on(table.fechaHecho),
  index('idx_actividades_monitoreo').on(table.observacionMonitoreoId),
]);

// TABLA READ/WRITE MODEL: Observaciones de Monitoreo de Campo (AGRUL-023 / RF-M3-11)
export const observacionesMonitoreoTable = pgTable('observaciones_monitoreo', {
  id: uuid('id').defaultRandom().primaryKey(),
  loteId: uuid('lote_id').notNull().references(() => lotesTable.id, { onDelete: 'restrict' }),
  cicloId: uuid('ciclo_id').notNull().references(() => ciclosProductivosTable.id, { onDelete: 'restrict' }),
  fecha: varchar('fecha', { length: 30 }).notNull(),
  sintomas: text('sintomas').notNull(),
  plagas: text('plagas'),
  estadoCultivo: varchar('estado_cultivo', { length: 60 }).notNull().default('GENERAL'),
  fotosUrls: jsonb('fotos_urls').notNull().default([]),
  usuarioId: uuid('usuario_id').notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_obs_monitoreo_lote').on(table.loteId),
  index('idx_obs_monitoreo_ciclo').on(table.cicloId),
  index('idx_obs_monitoreo_fecha').on(table.fecha),
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

// TABLA MAESTRA: Catálogo de Insumos (AGRUL-024 / RF-M4-01 / RF-M9-08)
export const insumosCatalogoTable = pgTable('insumos_catalogo', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombreComercial: varchar('nombre_comercial', { length: 200 }).notNull().unique(),
  categoria: varchar('categoria', { length: 50 }).notNull(), // SEMILLA_PLANTIN | FERTILIZANTE | FITOSANITARIO | ENMIENDA | OTRO
  unidadMedidaId: varchar('unidad_medida_id', { length: 30 }).notNull(),
  presentacion: varchar('presentacion', { length: 150 }).notNull(),
  stockMinimoConfigurable: numeric('stock_minimo_configurable', { precision: 14, scale: 4 }),
  activo: boolean('activo').default(true).notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_insumos_cat').on(table.categoria),
  index('idx_insumos_nombre').on(table.nombreComercial),
]);

// TABLA DETALLE: Ficha Técnica Fitosanitaria de Insumo (AGRUL-024 / RF-M4-02 / RN-14)
export const insumosFitosanitariosFichaTable = pgTable('insumos_fitosanitarios_ficha', {
  insumoId: uuid('insumo_id').primaryKey().references(() => insumosCatalogoTable.id, { onDelete: 'cascade' }),
  principioActivo: varchar('principio_activo', { length: 250 }).notNull(),
  periodoCarenciaDias: integer('periodo_carencia_dias').notNull(),
  periodoReingresoHoras: integer('periodo_reingreso_horas').notNull(),
  nroRegistroSenasa: varchar('nro_registro_senasa', { length: 100 }).notNull(),
  toxicologia: varchar('toxicologia', { length: 100 }),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_ficha_fito_principio').on(table.principioActivo),
  index('idx_ficha_fito_senasa').on(table.nroRegistroSenasa),
]);

// TABLA DETALLE: Insumos Previstos en Actividad Agrícola (AGRUL-044 / RF-M9-18 / RN-13)
export const actividadInsumosTable = pgTable('actividad_insumos', {
  id: uuid('id').defaultRandom().primaryKey(),
  actividadId: uuid('actividad_id').notNull().references(() => actividadesAgricolasTable.id, { onDelete: 'cascade' }),
  insumoId: uuid('insumo_id').notNull().references(() => insumosCatalogoTable.id, { onDelete: 'restrict' }),
  cantidad: numeric('cantidad', { precision: 14, scale: 4 }).notNull(),
  unidadMedidaId: varchar('unidad_medida_id', { length: 50 }),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_act_insumo_actividad').on(table.actividadId),
  index('idx_act_insumo_insumo').on(table.insumoId),
]);
// ============================================================================
// ÉPICA 10: MÓDULO 4 — APLICACIONES DE CAMPO Y DOSIS (AGRUL-025)
// ============================================================================

// TABLA READ/WRITE MODEL: Aplicación Agrícola de Campo (RF-M4-03 / RF-M4-11 / RF-M4-12)
export const aplicacionesAgricolasTable = pgTable('aplicaciones_agricolas', {
  id: uuid('id').defaultRandom().primaryKey(),
  actividadId: uuid('actividad_id').notNull().references(() => actividadesAgricolasTable.id, { onDelete: 'restrict' }),
  loteId: uuid('lote_id').notNull().references(() => lotesTable.id, { onDelete: 'restrict' }),
  cicloId: uuid('ciclo_id').notNull().references(() => ciclosProductivosTable.id, { onDelete: 'restrict' }),
  fecha: varchar('fecha', { length: 30 }).notNull(),
  responsableId: uuid('responsable_id'),
  metodo: varchar('metodo', { length: 50 }).notNull(),
  motivo: text('motivo').notNull(),
  equipoAplicacion: varchar('equipo_aplicacion', { length: 200 }).notNull(),
  condicionesClima: jsonb('condiciones_clima'),
  recomendacionTecnica: jsonb('recomendacion_tecnica'), // RF-M4-08
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_aplicaciones_lote').on(table.loteId),
  index('idx_aplicaciones_ciclo').on(table.cicloId),
  index('idx_aplicaciones_actividad').on(table.actividadId),
  index('idx_aplicaciones_fecha').on(table.fecha),
]);

// TABLA DETALLE: Línea de Insumo de Aplicación (RF-M4-04 / RF-M4-06)
export const aplicacionLineaInsumoTable = pgTable('aplicacion_linea_insumo', {
  id: uuid('id').defaultRandom().primaryKey(),
  aplicacionId: uuid('aplicacion_id').notNull().references(() => aplicacionesAgricolasTable.id, { onDelete: 'cascade' }),
  insumoId: uuid('insumo_id').notNull().references(() => insumosCatalogoTable.id, { onDelete: 'restrict' }),
  cantidadTotal: numeric('cantidad_total', { precision: 12, scale: 3 }).notNull(),
  unidadMedidaId: varchar('unidad_medida_id', { length: 30 }).notNull(),
  dosisPorSuperficie: numeric('dosis_por_superficie', { precision: 10, scale: 3 }),
  dosisPorPlanta: numeric('dosis_por_planta', { precision: 10, scale: 3 }),
  concentracion: varchar('concentracion', { length: 100 }),
}, (table) => [
  index('idx_apl_linea_aplicacion').on(table.aplicacionId),
  index('idx_apl_linea_insumo').on(table.insumoId),
]);

// ============================================================================
// ÉPICA 11: MÓDULO 5 — COSECHA, DESTINOS Y SALDO COMERCIALIZABLE (AGRUL-028)
// ============================================================================

// TABLA READ/WRITE MODEL: Cosechas de Campo y Código de Trazabilidad Único (RF-M5-01 a RF-M5-06 / RN-07, RN-08, RN-09)
export const cosechasTable = pgTable('cosechas', {
  id: uuid('id').defaultRandom().primaryKey(),
  codigoTrazabilidad: varchar('codigo_trazabilidad', { length: 80 }).notNull().unique(),
  loteId: uuid('lote_id').notNull().references(() => lotesTable.id, { onDelete: 'restrict' }),
  cicloId: uuid('ciclo_id').notNull().references(() => ciclosProductivosTable.id, { onDelete: 'restrict' }),
  fecha: varchar('fecha', { length: 30 }).notNull(),
  cantidadCosechadaKg: numeric('cantidad_cosechada_kg', { precision: 14, scale: 4 }).notNull(),
  cantidadComercializableKg: numeric('cantidad_comercializable_kg', { precision: 14, scale: 4 }).notNull(),
  cantidadDescarteKg: numeric('cantidad_descarte_kg', { precision: 14, scale: 4 }).notNull(),
  motivoDescarte: varchar('motivo_descarte', { length: 150 }),
  observacionesCalidad: text('observaciones_calidad'),
  responsableId: uuid('responsable_id'),
  cuadrillaId: uuid('cuadrilla_id'),
  recipientes: jsonb('recipientes'),
  superficieCosechadaHa: numeric('superficie_cosechada_ha', { precision: 10, scale: 2 }),
  estado: varchar('estado', { length: 30 }).notNull().default('ACTIVA'), // ACTIVA | ANULADA
  motivoAnulacion: text('motivo_anulacion'),
  usuarioAnulacionId: uuid('usuario_anulacion_id'),
  anuladoEn: timestamp('anulado_en', { withTimezone: true, mode: 'string' }),
  historialModificaciones: jsonb('historial_modificaciones').notNull().default([]),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_cosechas_lote').on(table.loteId),
  index('idx_cosechas_ciclo').on(table.cicloId),
  index('idx_cosechas_codigo').on(table.codigoTrazabilidad),
  index('idx_cosechas_fecha').on(table.fecha),
  index('idx_cosechas_estado').on(table.estado),
]);

// TABLA MAESTRA: Catálogo de Destinatarios (AGRUL-029 / RF-M5-08)
export const destinatariosCatalogoTable = pgTable('destinatarios_catalogo', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 150 }).notNull(),
  tipo: varchar('tipo', { length: 50 }).notNull(), // MERCADO_FRESCO | INDUSTRIA | EXPORTACION | VENTA_DIRECTA | EMPAQUE | OTRO
  cuit: varchar('cuit', { length: 30 }),
  direccion: varchar('direccion', { length: 250 }),
  localidad: varchar('localidad', { length: 100 }),
  provincia: varchar('provincia', { length: 100 }),
  contacto: varchar('contacto', { length: 100 }),
  telefono: varchar('telefono', { length: 50 }),
  email: varchar('email', { length: 120 }),
  activo: boolean('activo').default(true).notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_destinatarios_nombre').on(table.nombre),
  index('idx_destinatarios_tipo').on(table.tipo),
  index('idx_destinatarios_activo').on(table.activo),
]);

// TABLA TRANSACCIONAL: Despacho a Destino y Saldo Comercializable (AGRUL-029 / RF-M5-07, RF-M5-09, RF-M5-10, RN-09)
export const despachosDestinoTable = pgTable('despacho_destino', {
  id: uuid('id').defaultRandom().primaryKey(),
  cosechaId: uuid('cosecha_id').notNull().references(() => cosechasTable.id, { onDelete: 'restrict' }),
  destinatarioId: uuid('destinatario_id').notNull().references(() => destinatariosCatalogoTable.id, { onDelete: 'restrict' }),
  tipoDestino: varchar('tipo_destino', { length: 50 }).notNull(),
  cantidadEnviadaKg: numeric('cantidad_enviada_kg', { precision: 14, scale: 4 }).notNull(),
  fecha: varchar('fecha', { length: 30 }).notNull(),
  nroGuiaRemito: varchar('nro_guia_remito', { length: 80 }).notNull(),
  renspaFinca: varchar('renspa_finca', { length: 60 }).notNull(),
  productor: varchar('productor', { length: 150 }).notNull(),
  precinto: varchar('precinto', { length: 60 }),
  chofer: varchar('chofer', { length: 120 }),
  patenteCamion: varchar('patente_camion', { length: 30 }),
  temperaturaTransporteC: numeric('temperatura_transporte_c', { precision: 5, scale: 2 }),
  observaciones: text('observaciones'),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_despachos_cosecha').on(table.cosechaId),
  index('idx_despachos_destinatario').on(table.destinatarioId),
  index('idx_despachos_fecha').on(table.fecha),
  index('idx_despachos_remito').on(table.nroGuiaRemito),
]);

// TABLA TRANSACCIONAL: Registro de Pérdidas e Incidentes Climáticos (AGRUL-030 / RF-M5-14)
export const perdidasCosechaTable = pgTable('perdidas_cosecha', {
  id: uuid('id').defaultRandom().primaryKey(),
  cosechaId: uuid('cosecha_id').references(() => cosechasTable.id, { onDelete: 'set null' }),
  loteId: uuid('lote_id').notNull().references(() => lotesTable.id, { onDelete: 'restrict' }),
  cicloId: uuid('ciclo_id').references(() => ciclosProductivosTable.id, { onDelete: 'restrict' }),
  fecha: varchar('fecha', { length: 30 }).notNull(),
  tipo: varchar('tipo', { length: 50 }).notNull(), // GRANIZO | HELADA | VIENTO | PLAGA | ENFERMEDAD | ROBO | OTRO
  cantidadEstimadaKg: numeric('cantidad_estimada_kg', { precision: 14, scale: 4 }).notNull(),
  superficieAfectadaHa: numeric('superficie_afectada_ha', { precision: 10, scale: 2 }),
  descripcion: text('descripcion').notNull(),
  responsableRegistroId: uuid('responsable_registro_id'),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_perdidas_cosecha').on(table.cosechaId),
  index('idx_perdidas_lote').on(table.loteId),
  index('idx_perdidas_ciclo').on(table.cicloId),
  index('idx_perdidas_fecha').on(table.fecha),
  index('idx_perdidas_tipo').on(table.tipo),
]);

// ============================================================================
// ÉPICA 12: MÓDULO 6 — TRAZABILIDAD E INFORMES OFICIALES (AGRUL-033)
// ============================================================================

// TABLA APPEND-ONLY: Bitácora Inmutable de Emisión de Informes de Trazabilidad (RF-M6-13 / RN-06)
export const informeTrazabilidadLogTable = pgTable('informe_trazabilidad_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  codigoInforme: varchar('codigo_informe', { length: 80 }).notNull().unique(),
  cosechaId: uuid('cosecha_id').notNull().references(() => cosechasTable.id, { onDelete: 'restrict' }),
  loteId: uuid('lote_id').notNull().references(() => lotesTable.id, { onDelete: 'restrict' }),
  codigoTrazabilidad: varchar('codigo_trazabilidad', { length: 80 }).notNull(),
  tipoFormato: varchar('tipo_formato', { length: 20 }).notNull(), // PDF | CSV | EXCEL
  usuarioEmisor: varchar('usuario_emisor', { length: 150 }).notNull(),
  rolEmisor: varchar('rol_emisor', { length: 80 }),
  filtrosAplicados: jsonb('filtros_aplicados').notNull().default({}),
  emitidoEn: timestamp('emitido_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  hashContenido: varchar('hash_contenido', { length: 128 }),
}, (table) => [
  index('idx_informe_log_cosecha').on(table.cosechaId),
  index('idx_informe_log_lote').on(table.loteId),
  index('idx_informe_log_codigo').on(table.codigoInforme),
  index('idx_informe_log_emisor').on(table.usuarioEmisor),
  index('idx_informe_log_fecha').on(table.emitidoEn),
]);

// ============================================================================
// ÉPICA 14: MÓDULO 8 — USUARIOS, ROLES, SEGURIDAD Y AUDITORÍA (AGRUL-038)
// ============================================================================

// TABLA TRANSACCIONAL: Usuarios del Sistema y Roles RBAC (RF-M8-01 / RF-M8-03 / RF-M8-04)
export const usuariosTable = pgTable('usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  apellido: varchar('apellido', { length: 100 }).notNull(),
  email: varchar('email', { length: 150 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  salt: varchar('salt', { length: 64 }).notNull(),
  perfil: varchar('perfil', { length: 50 }).notNull(), // ADMINISTRADOR | ENCARGADO | OPERARIO | ASESOR_AGRONOMO
  estado: varchar('estado', { length: 30 }).notNull().default('ACTIVO'), // ACTIVO | INACTIVO | BLOQUEADO
  intentosFallidos: integer('intentos_fallidos').notNull().default(0),
  debeCambiarPassword: boolean('debe_cambiar_password').notNull().default(true),
  bloqueadoHasta: timestamp('bloqueado_hasta', { withTimezone: true, mode: 'string' }),
  ultimoAcceso: timestamp('ultimo_acceso', { withTimezone: true, mode: 'string' }),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_usuarios_email').on(table.email),
  index('idx_usuarios_perfil').on(table.perfil),
  index('idx_usuarios_estado').on(table.estado),
]);

// TABLA TRANSACCIONAL: Asignación N:M de Usuarios a Fincas (RF-M8-02 / RF-M8-05 / RN-16)
export const usuarioFincaAsignacionTable = pgTable('usuario_finca_asignacion', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').notNull().references(() => usuariosTable.id, { onDelete: 'cascade' }),
  fincaId: uuid('finca_id').notNull().references(() => fincasTable.id, { onDelete: 'cascade' }),
  activo: boolean('activo').notNull().default(true),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_usuario_finca_usuario').on(table.usuarioId),
  index('idx_usuario_finca_finca').on(table.fincaId),
]);

// ============================================================================
// ÉPICA 14: MÓDULO 8 — BITÁCORA CENTRALIZADA DE AUDITORÍA Y SEGURIDAD (AGRUL-040)
// ============================================================================

// TABLA APPEND-ONLY: Bitácora Centralizada de Auditoría de Seguridad (RF-M8-08 / RN-06)
export const auditoriaSeguridadLogTable = pgTable('auditoria_seguridad_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuarioId: uuid('usuario_id').references(() => usuariosTable.id, { onDelete: 'set null' }),
  usuarioEmail: varchar('usuario_email', { length: 150 }),
  accion: varchar('accion', { length: 50 }).notNull(), // LOGIN | CREAR | EDITAR | ANULAR | EMITIR_REPORTE | BLOQUEO | DESBLOQUEO | CAMBIO_PASSWORD
  entidad: varchar('entidad', { length: 100 }).notNull(), // USUARIO | LOTE | ACTIVIDAD | COSECHA | DESPACHO | REPORTE | SESION
  entidadId: varchar('entidad_id', { length: 100 }),
  valorPrevioJson: jsonb('valor_previo_json'),
  valorNuevoJson: jsonb('valor_nuevo_json'),
  ip: varchar('ip', { length: 60 }),
  userAgent: varchar('user_agent', { length: 255 }),
  timestamp: timestamp('timestamp', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_auditoria_usuario').on(table.usuarioId),
  index('idx_auditoria_accion').on(table.accion),
  index('idx_auditoria_entidad').on(table.entidad),
  index('idx_auditoria_timestamp').on(table.timestamp),
]);

// ============================================================================
// ÉPICA 15: MÓDULO 9 — INVENTARIO DE INSUMOS Y STOCK (AGRUL-041)
// ============================================================================

// TABLA MAESTRA: Proveedores Comerciales (RF-M9-01)
export const proveedoresTable = pgTable('proveedores', {
  id: uuid('id').defaultRandom().primaryKey(),
  razonSocial: varchar('razon_social', { length: 200 }).notNull(),
  cuit: varchar('cuit', { length: 30 }),
  contacto: varchar('contacto', { length: 150 }),
  telefono: varchar('telefono', { length: 50 }),
  email: varchar('email', { length: 150 }),
  direccion: varchar('direccion', { length: 255 }),
  activo: boolean('activo').default(true).notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_proveedores_razon').on(table.razonSocial),
  index('idx_proveedores_cuit').on(table.cuit),
  index('idx_proveedores_activo').on(table.activo),
]);

// TABLA DETALLE: Equivalencias de Unidades de Medida y Densidad de Insumos (RF-M9-01 / RF-M9-14 / RN-12)
export const insumoUnidadesEquivalenciaTable = pgTable('insumo_unidades_equivalencia', {
  id: uuid('id').defaultRandom().primaryKey(),
  insumoId: uuid('insumo_id').notNull().references(() => insumosCatalogoTable.id, { onDelete: 'cascade' }),
  unidadCompra: varchar('unidad_compra', { length: 50 }).notNull(),
  unidadConsumo: varchar('unidad_consumo', { length: 50 }).notNull(),
  factorMultiplicador: numeric('factor_multiplicador', { precision: 14, scale: 4 }).notNull(),
  densidadKgL: numeric('densidad_kg_l', { precision: 10, scale: 4 }),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_equiv_insumo').on(table.insumoId),
  index('idx_equiv_compra_consumo').on(table.unidadCompra, table.unidadConsumo),
]);

export const proveedoresRelations = relations(proveedoresTable, () => ({}));

export const insumoUnidadesEquivalenciaRelations = relations(insumoUnidadesEquivalenciaTable, ({ one }) => ({
  insumo: one(insumosCatalogoTable, {
    fields: [insumoUnidadesEquivalenciaTable.insumoId],
    references: [insumosCatalogoTable.id],
  }),
}));

// TABLA MAESTRA: Depósitos de Almacenamiento y Segregación Física BPA (RF-M9-19)
export const depositoAlmacenamientoTable = pgTable('deposito_almacenamiento', {
  id: uuid('id').defaultRandom().primaryKey(),
  fincaId: uuid('finca_id').notNull().references(() => fincasTable.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 150 }).notNull(),
  tipoPermitido: varchar('tipo_permiso', { length: 50 }).notNull(), // FITOSANITARIOS | FERTILIZANTES | INSUMOS_GENERALES | ZONA_VENCIDOS
  ubicacionFisica: varchar('ubicacion_fisica', { length: 255 }),
  capacidadMaxima: numeric('capacidad_maxima', { precision: 14, scale: 4 }),
  activo: boolean('activo').default(true).notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_deposito_finca').on(table.fincaId),
  index('idx_deposito_tipo').on(table.tipoPermitido),
  index('idx_deposito_activo').on(table.activo),
]);

// TABLA TRANSACCIONAL: Ingresos por Compra de Insumos (RF-M9-03 / RN-10)
export const ingresosCompraInsumosTable = pgTable('ingresos_compra_insumos', {
  id: uuid('id').defaultRandom().primaryKey(),
  insumoId: uuid('insumo_id').notNull().references(() => insumosCatalogoTable.id, { onDelete: 'restrict' }),
  proveedorId: uuid('proveedor_id').notNull().references(() => proveedoresTable.id, { onDelete: 'restrict' }),
  depositoId: uuid('deposito_id').notNull().references(() => depositoAlmacenamientoTable.id, { onDelete: 'restrict' }),
  cantidad: numeric('cantidad', { precision: 14, scale: 4 }).notNull(),
  unidadMedida: varchar('unidad_medida', { length: 50 }).notNull(),
  loteFabricacion: varchar('lote_fabricacion', { length: 100 }).notNull(),
  fechaVencimiento: varchar('fecha_vencimiento', { length: 30 }).notNull(),
  nroFacturaRemito: varchar('nro_factura_remito', { length: 100 }).notNull(),
  fechaIngreso: varchar('fecha_ingreso', { length: 30 }).notNull(),
  precioUnitarioCompra: numeric('precio_unitario_compra', { precision: 14, scale: 4 }),
  comprobanteAdjuntoUrl: varchar('comprobante_adjunto_url', { length: 255 }),
  observaciones: text('observaciones'),
  usuarioCargaId: uuid('usuario_carga_id'),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  actualizadoEn: timestamp('actualizado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_ingreso_insumo').on(table.insumoId),
  index('idx_ingreso_proveedor').on(table.proveedorId),
  index('idx_ingreso_deposito').on(table.depositoId),
  index('idx_ingreso_lote_fab').on(table.loteFabricacion),
  index('idx_ingreso_fecha').on(table.fechaIngreso),
]);

// TABLA TRANSACCIONAL: Carga de Saldo Inicial de Insumos (RF-M9-05 / RN-10)
export const stockInicialInsumosTable = pgTable('stock_inicial_insumos', {
  id: uuid('id').defaultRandom().primaryKey(),
  insumoId: uuid('insumo_id').notNull().references(() => insumosCatalogoTable.id, { onDelete: 'restrict' }),
  depositoId: uuid('deposito_id').notNull().references(() => depositoAlmacenamientoTable.id, { onDelete: 'restrict' }),
  cantidad: numeric('cantidad', { precision: 14, scale: 4 }).notNull(),
  unidadMedida: varchar('unidad_medida', { length: 50 }).notNull(),
  loteFabricacion: varchar('lote_fabricacion', { length: 100 }).notNull().default('STOCK-INICIAL'),
  fechaVencimiento: varchar('fecha_vencimiento', { length: 30 }),
  motivo: text('motivo').notNull(),
  usuarioCargaId: uuid('usuario_carga_id').notNull(),
  fecha: varchar('fecha', { length: 30 }).notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_stock_inicial_insumo').on(table.insumoId),
  index('idx_stock_inicial_deposito').on(table.depositoId),
  index('idx_stock_inicial_usuario').on(table.usuarioCargaId),
]);

// TABLA TRANSACCIONAL (APPEND-ONLY): Libro Mayor de Movimientos de Stock (AGRUL-043 / RF-M9-04 / RN-10 / RN-11)
export const stockMovimientosTable = pgTable('stock_movimientos', {
  id: uuid('id').defaultRandom().primaryKey(),
  insumoId: uuid('insumo_id').notNull().references(() => insumosCatalogoTable.id, { onDelete: 'restrict' }),
  depositoId: uuid('deposito_id').notNull().references(() => depositoAlmacenamientoTable.id, { onDelete: 'restrict' }),
  loteFabricacion: varchar('lote_fabricacion', { length: 100 }),
  tipoMovimiento: varchar('tipo_movimiento', { length: 50 }).notNull(), // SALDO_INICIAL | INGRESO_COMPRA | SALIDA_CONSUMO | DEVOLUCION | PERDIDA | AJUSTE_FISICO | REVERSION
  cantidad: numeric('cantidad', { precision: 14, scale: 4 }).notNull(),
  unidadMedida: varchar('unidad_medida', { length: 50 }).notNull(),
  fecha: varchar('fecha', { length: 30 }).notNull(),
  usuarioId: uuid('usuario_id').notNull(),
  referenciaTipo: varchar('referencia_tipo', { length: 50 }),
  referenciaId: varchar('referencia_id', { length: 100 }),
  claveIdempotencia: varchar('clave_idempotencia', { length: 150 }).notNull().unique(),
  esSaldoNegativo: boolean('es_saldo_negativo').default(false).notNull(),
  motivoJustificacion: text('motivo_justificacion'),
  movimientoRevertidoId: uuid('movimiento_revertido_id'),
  esEnvaseAbierto: boolean('es_envase_abierto').default(false).notNull(),
  creadoEn: timestamp('creado_en', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_stock_mov_insumo').on(table.insumoId),
  index('idx_stock_mov_deposito').on(table.depositoId),
  index('idx_stock_mov_tipo').on(table.tipoMovimiento),
  index('idx_stock_mov_fecha').on(table.fecha),
  index('idx_stock_mov_clave_idempotencia').on(table.claveIdempotencia),
  index('idx_stock_mov_revertido').on(table.movimientoRevertidoId),
]);



