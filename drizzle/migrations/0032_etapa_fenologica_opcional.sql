-- CU32: la etapa fenológica es opcional; si se informa no puede ser vacía.
ALTER TABLE "monitoreos" ALTER COLUMN "etapa_fenologica" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "monitoreos" DROP CONSTRAINT "monitoreos_textos_obligatorios";
--> statement-breakpoint
ALTER TABLE "monitoreos" ADD CONSTRAINT "monitoreos_textos_obligatorios" CHECK (
  ("etapa_fenologica" IS NULL OR length(trim("etapa_fenologica")) > 0)
  AND length(trim("estado_general_cultivo")) > 0
  AND length(trim("tipo_observacion")) > 0 AND length(trim("descripcion_hallazgos")) > 0);
