-- Migración 0015: Ampliación de actividades_programadas para CU26-CU29 (SPEC.md / Issue #48)
-- Se preservan la tabla canónica, los índices existentes y el trigger trg_pendiente_ciclo_abierto de RN-09.

ALTER TABLE "actividades_programadas"
  ADD COLUMN "tipo_actividad_id" uuid REFERENCES "tipos_actividad"("id") ON DELETE RESTRICT,
  ADD COLUMN "fecha_programada" date,
  ADD COLUMN "responsable_id" uuid REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  ADD COLUMN "superficie_prevista" numeric(8, 2),
  ADD COLUMN "descripcion" text,
  ADD COLUMN "motivo_cancelacion" text,
  ADD COLUMN "creado_en" timestamptz DEFAULT now() NOT NULL,
  ADD COLUMN "actualizado_en" timestamptz DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE INDEX "idx_actividades_programadas_tipo" ON "actividades_programadas" ("tipo_actividad_id");
--> statement-breakpoint
CREATE INDEX "idx_actividades_programadas_responsable" ON "actividades_programadas" ("responsable_id");
--> statement-breakpoint
CREATE INDEX "idx_actividades_programadas_fecha" ON "actividades_programadas" ("fecha_programada");
--> statement-breakpoint
-- Invariante RN-12: Las actividades canceladas deben registrar obligatoriamente motivo de cancelación
-- NOT VALID conserva cancelaciones históricas sin inventar motivos ni modificar filas.
-- PostgreSQL exigirá el CHECK para toda inserción o actualización posterior.
-- No ejecutar VALIDATE CONSTRAINT hasta auditar y resolver los históricos.
ALTER TABLE "actividades_programadas"
  ADD CONSTRAINT "actividades_programadas_motivo_cancelacion_check"
  CHECK ("estado" != 'CANCELADA' OR ("motivo_cancelacion" IS NOT NULL AND length(trim("motivo_cancelacion")) > 0)) NOT VALID;
--> statement-breakpoint
-- Restricción de superficie prevista si se especifica
ALTER TABLE "actividades_programadas"
  ADD CONSTRAINT "actividades_programadas_superficie_prevista_check"
  CHECK ("superficie_prevista" IS NULL OR "superficie_prevista" > 0);
