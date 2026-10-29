-- Migración 0014: Tipos de actividad y relación N:M con cultivos (CU22–CU25 / RF-M3-01 / SPEC.md)
CREATE TABLE "tipos_actividad" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nombre" varchar(40) NOT NULL,
  "categoria" varchar(20) NOT NULL,
  "descripcion" text,
  "estado" varchar(8) DEFAULT 'ACTIVA' NOT NULL,
  CONSTRAINT "tipos_actividad_nombre_unique" UNIQUE ("nombre"),
  CONSTRAINT "tipos_actividad_nombre_valido" CHECK (length(trim("nombre")) > 0 AND "nombre" = trim("nombre")),
  CONSTRAINT "tipos_actividad_categoria_valida" CHECK ("categoria" IN ('PREPARACION_SUELO', 'PLANTACION', 'RIEGO', 'FERTILIZACION', 'MANTENIMIENTO', 'CONTROL_SANITARIO', 'OTRO')),
  CONSTRAINT "tipos_actividad_estado_valido" CHECK ("estado" IN ('ACTIVA', 'INACTIVA'))
);
--> statement-breakpoint
CREATE INDEX "idx_tipos_actividad_categoria" ON "tipos_actividad" ("categoria");
--> statement-breakpoint
CREATE INDEX "idx_tipos_actividad_estado" ON "tipos_actividad" ("estado");
--> statement-breakpoint
CREATE TABLE "tipos_actividad_cultivos" (
  "tipo_actividad_id" uuid NOT NULL REFERENCES "tipos_actividad"("id") ON DELETE RESTRICT,
  "cultivo_id" uuid NOT NULL REFERENCES "cultivos"("id") ON DELETE RESTRICT,
  CONSTRAINT "tipos_actividad_cultivos_pk" PRIMARY KEY ("tipo_actividad_id", "cultivo_id")
);
--> statement-breakpoint
CREATE INDEX "idx_tipos_actividad_cultivos_cultivo" ON "tipos_actividad_cultivos" ("cultivo_id");
