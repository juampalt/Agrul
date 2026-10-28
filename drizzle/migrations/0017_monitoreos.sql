-- CU32/CU33: inspecciones y recomendaciones técnicas desacopladas (RN-13).
CREATE TABLE "monitoreos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ciclo_id" uuid NOT NULL REFERENCES "ciclos_productivos"("id") ON DELETE RESTRICT,
  "lote_id" uuid NOT NULL REFERENCES "lotes"("id") ON DELETE RESTRICT,
  "responsable_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "fecha_inspeccion" date NOT NULL,
  "sector_observado" varchar(120),
  "etapa_fenologica" varchar(100) NOT NULL,
  "estado_general_cultivo" varchar(100) NOT NULL,
  "tipo_observacion" varchar(100) NOT NULL,
  "problema_detectado" text,
  "descripcion_hallazgos" text NOT NULL,
  "accion_recomendada" text,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "monitoreos_textos_obligatorios" CHECK (
    length(trim("etapa_fenologica")) > 0 AND length(trim("estado_general_cultivo")) > 0
    AND length(trim("tipo_observacion")) > 0 AND length(trim("descripcion_hallazgos")) > 0)
);
--> statement-breakpoint
CREATE INDEX "idx_monitoreos_ciclo_fecha" ON "monitoreos"("ciclo_id", "fecha_inspeccion");
--> statement-breakpoint
CREATE INDEX "idx_monitoreos_lote_fecha" ON "monitoreos"("lote_id", "fecha_inspeccion");
