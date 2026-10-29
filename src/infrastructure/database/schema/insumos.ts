import { sql } from 'drizzle-orm';
import { check, date, foreignKey, index, numeric, pgTable, text, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { CategoriaInsumoCanonico } from '../../../core/domain/entities/insumo.entity.js';
import { actividadesRealizadasTable } from './actividades-realizadas.js';
import { fincasTable, usuariosTable } from './tables.js';

export const insumosTable = pgTable('insumos', {
  id: uuid('id').defaultRandom().primaryKey(),
  codigo: varchar('codigo', { length: 15 }).notNull().unique('insumos_codigo_unique'),
  nombre: varchar('nombre', { length: 200 }).notNull(),
  categoria: varchar('categoria', { length: 20 }).$type<CategoriaInsumoCanonico>().notNull(),
  tipoProducto: varchar('tipo_producto', { length: 150 }),
  unidadMedida: varchar('unidad_medida', { length: 30 }).notNull(),
  fabricanteMarca: varchar('fabricante_marca', { length: 150 }),
  nivelMinimo: numeric('nivel_minimo', { precision: 10, scale: 2 }).notNull(),
  estado: varchar('estado', { length: 8 }).$type<'ACTIVO' | 'INACTIVO'>().notNull().default('ACTIVO'),
}, t => [
  index('idx_insumos_estado_categoria_codigo').on(t.estado, t.categoria, t.codigo),
  check('insumos_textos_validos', sql`${t.codigo} = btrim(${t.codigo}) AND length(${t.codigo}) > 0 AND
    ${t.nombre} = btrim(${t.nombre}) AND length(${t.nombre}) > 0 AND
    ${t.unidadMedida} = btrim(${t.unidadMedida}) AND length(${t.unidadMedida}) > 0 AND
    (${t.tipoProducto} IS NULL OR (${t.tipoProducto} = btrim(${t.tipoProducto}) AND length(${t.tipoProducto}) > 0)) AND
    (${t.fabricanteMarca} IS NULL OR (${t.fabricanteMarca} = btrim(${t.fabricanteMarca}) AND length(${t.fabricanteMarca}) > 0))`),
  check('insumos_categoria_valida', sql`${t.categoria} IN ('FERTILIZANTE','FITOSANITARIO','ENMIENDA','OTRO')`),
  check('insumos_estado_valido', sql`${t.estado} IN ('ACTIVO','INACTIVO')`),
  check('insumos_minimo_valido', sql`${t.nivelMinimo} >= 0 AND ${t.nivelMinimo} <> 'NaN'::numeric`),
]);

export const partidasInsumoTable = pgTable('partidas_insumo', {
  id: uuid('id').defaultRandom().primaryKey(),
  fincaId: uuid('finca_id').references(() => fincasTable.id, { onDelete: 'restrict' }),
  unidadMedida: varchar('unidad_medida', { length: 30 }),
  insumoId: uuid('insumo_id').notNull().references(() => insumosTable.id, { onDelete: 'restrict' }),
  fechaIngreso: date('fecha_ingreso', { mode: 'string' }).notNull(),
  cantidadInicial: numeric('cantidad_inicial', { precision: 10, scale: 2 }).notNull(),
  cantidadDisponible: numeric('cantidad_disponible', { precision: 10, scale: 2 }).notNull(),
  proveedor: text('proveedor').notNull(),
  fechaVencimiento: date('fecha_vencimiento', { mode: 'string' }),
}, t => [
  unique().on(t.id, t.insumoId),
  unique('partidas_id_insumo_finca_unique').on(t.id, t.insumoId, t.fincaId),
  index('idx_partidas_finca_insumo').on(t.fincaId, t.insumoId),
  index('idx_partidas_insumo_vencimiento').on(t.insumoId, t.fechaVencimiento, t.fechaIngreso, t.id),
  check('partidas_insumo_cantidad_inicial_check', sql`${t.cantidadInicial} > 0 AND ${t.cantidadInicial} <> 'NaN'::numeric`),
  check('partidas_insumo_cantidad_disponible_check', sql`${t.cantidadDisponible} >= 0 AND ${t.cantidadDisponible} <> 'NaN'::numeric`),
]);

export const aplicacionesInsumoTable = pgTable('aplicaciones_insumo', {
  id: uuid('id').defaultRandom().primaryKey(),
  actividadRealizadaId: uuid('actividad_realizada_id').notNull().references(() => actividadesRealizadasTable.id, { onDelete: 'restrict' }),
  superficieTratada: numeric('superficie_tratada', { precision: 8, scale: 2 }).notNull(),
  metodoAplicacion: text('metodo_aplicacion').notNull(),
  motivoAplicacion: text('motivo_aplicacion').notNull(),
  responsableId: uuid('responsable_id').notNull(),
  observaciones: text('observaciones'),
}, t => [
  foreignKey({ columns: [t.responsableId], foreignColumns: [usuariosTable.id] }).onDelete('restrict'),
  index('idx_aplicaciones_insumo_actividad').on(t.actividadRealizadaId),
  check('aplicaciones_insumo_superficie_tratada_check', sql`${t.superficieTratada} > 0 AND ${t.superficieTratada} <> 'NaN'::numeric`),
]);

export const aplicacionesInsumoItemsTable = pgTable('aplicaciones_insumo_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  aplicacionId: uuid('aplicacion_id').notNull().references(() => aplicacionesInsumoTable.id, { onDelete: 'restrict' }),
  insumoId: uuid('insumo_id').notNull().references(() => insumosTable.id, { onDelete: 'restrict' }),
  partidaInsumoId: uuid('partida_insumo_id').notNull(),
  cantidadAplicada: numeric('cantidad_aplicada', { precision: 10, scale: 2 }).notNull(),
  dosis: numeric('dosis', { precision: 8, scale: 2 }).notNull(),
}, t => [
  foreignKey({ columns: [t.partidaInsumoId, t.insumoId], foreignColumns: [partidasInsumoTable.id, partidasInsumoTable.insumoId] }).onDelete('restrict'),
  index('idx_aplicaciones_items_insumo').on(t.insumoId),
  index('idx_aplicaciones_items_aplicacion').on(t.aplicacionId),
  check('aplicaciones_insumo_items_cantidad_aplicada_check', sql`${t.cantidadAplicada} > 0 AND ${t.cantidadAplicada} <> 'NaN'::numeric`),
  check('aplicaciones_insumo_items_dosis_check', sql`${t.dosis} > 0 AND ${t.dosis} <> 'NaN'::numeric`),
]);
