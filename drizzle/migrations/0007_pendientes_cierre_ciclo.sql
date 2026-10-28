-- Tabla canónica de SPEC.md. AGRUL-054 (#48) ampliará esta tabla, sin crear una proyección paralela.
-- La FK de ciclo_id se añadirá cuando CU18–CU21 versionen ciclos_productivos.
CREATE TABLE "actividades_programadas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ciclo_id" uuid NOT NULL,
  "estado" varchar(10) DEFAULT 'PENDIENTE' NOT NULL,
  CONSTRAINT "actividades_programadas_estado_valido" CHECK ("estado" IN ('PENDIENTE', 'EJECUTADA', 'CANCELADA'))
);
--> statement-breakpoint
CREATE INDEX "idx_actividades_programadas_ciclo_estado" ON "actividades_programadas" ("ciclo_id", "estado");
