# Database & Event Sourcing Patterns

> **Cuándo usar esta skill:** Al diseñar tablas en Drizzle ORM, migraciones SQL en PostgreSQL, transacciones ACID, bitácoras append-only, índices o triggers de protección.

---

## 1. Contexto & Propósito
Agrul utiliza **PostgreSQL** administrado vía **Drizzle ORM**. Implementa un modelo dual:
1. **Read Model:** Tabla `lotes` indexada para lecturas ultrarrápidas de estado y stock actual.
2. **Write Model (Append-Only):** Tabla `eventos_trazabilidad` protegida a nivel motor de base de datos para impedir cualquier intento de modificación o borrado.
3. **Grafo de Linaje:** Tabla `lote_genealogia` para relaciones N:M (división y mezcla de lotes).

---

## 2. Invariantes y Reglas No Negociables
1. **Atomicidad Transaccional Indivisible:** Todo evento registrado debe guardarse en `eventos_trazabilidad` y actualizar el estado/cantidad de `lotes` dentro de `db.transaction(async tx => ...)`. Si algo falla, se produce un rollback completo.
2. **Protección a Nivel Motor (Trigger PostgreSQL):** No confiar exclusivamente en el código Node.js. Un trigger en PostgreSQL debe disparar una excepción fatal ante cualquier sentencia `UPDATE` o `DELETE` sobre `eventos_trazabilidad`.
3. **Timestamps en UTC:** `TIMESTAMPTZ` obligatorio. Timestamps duales para eventos: `timestamp_captura_local` (reloj de dispositivo) y `timestamp_servidor` (ingesta `NOW()`).

---

## 3. Esquema Canónico en Drizzle ORM (`drizzle/schema.ts`)

```typescript
import { pgTable, uuid, varchar, numeric, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// READ MODEL: Lotes
export const lotes = pgTable('lotes', {
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

// WRITE MODEL: Eventos de Trazabilidad (Append-Only)
export const eventosTrazabilidad = pgTable('eventos_trazabilidad', {
  id: uuid('id').defaultRandom().primaryKey(),
  loteId: uuid('lote_id').notNull().references(() => lotes.id, { onDelete: 'restrict' }),
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

// LINAJE N:M: Genealogía de Lotes
export const loteGenealogia = pgTable('lote_genealogia', {
  id: uuid('id').defaultRandom().primaryKey(),
  lotePadreId: uuid('lote_padre_id').notNull().references(() => lotes.id, { onDelete: 'restrict' }),
  loteHijoId: uuid('lote_hijo_id').notNull().references(() => lotes.id, { onDelete: 'restrict' }),
  cantidadAportada: numeric('cantidad_aportada', { precision: 14, scale: 4 }).notNull(),
  unidadMedida: varchar('unidad_medida', { length: 20 }).notNull(),
  motivoRelacion: varchar('motivo_relacion', { length: 50 }).notNull(), // SPLIT, BLEND_MERGE, REPROCESO
  fechaUtc: timestamp('fecha_utc', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
  index('idx_genealogia_padre').on(table.lotePadreId),
  index('idx_genealogia_hijo').on(table.loteHijoId),
]);
```

---

## 4. Trigger SQL de Inmutabilidad (Migración PostgreSQL)

```sql
-- Este trigger se aplica en la migración inicial de PostgreSQL
CREATE OR REPLACE FUNCTION rechazar_mutacion_evento_trazabilidad()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'VIOLACION_DE_INMUTABILIDAD: Los eventos de trazabilidad en Agrul son legalmente inmutables y no admiten UPDATE ni DELETE.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bloquear_mutacion_eventos
BEFORE UPDATE OR DELETE ON eventos_trazabilidad
FOR EACH ROW EXECUTE FUNCTION rechazar_mutacion_evento_trazabilidad();
```

---

## 5. DOs and DON'Ts

### DO
- **DO:** Usar `db.transaction()` de Drizzle para asegurar que el write model y el read model permanezcan 100% consistentes.
- **DO:** Usar `ON DELETE RESTRICT` en todas las referencias foráneas de trazabilidad.
- **DO:** Probar en tests de integración que el trigger de Postgres cancele cualquier intento de `db.delete(eventosTrazabilidad)`.

### DON'T
- **DON'T:** No usar float o double para cantidades de stock. Usar `numeric(14, 4)` para evitar errores de redondeo de punto flotante en kilos, litros o cajas.
- **DON'T:** No omitir el índice compuesto `(lote_id, timestamp_captura_local)`; es la clave del rendimiento del árbol de trazabilidad.

---

## 6. Registro de Decisiones (Self-Correction Log)
- *2026-10-03:* Se adopta Drizzle ORM sobre PostgreSQL con schema tipado.
- *2026-10-03:* Se implementa trigger nativo PL/pgSQL para garantizar inmutabilidad forzada a nivel de base de datos.
