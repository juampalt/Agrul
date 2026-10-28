CREATE TABLE "ciclos_productivos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plantacion_id" uuid NOT NULL REFERENCES "plantaciones"("id") ON DELETE RESTRICT,
  "nombre_codigo" varchar(30) NOT NULL CONSTRAINT "ciclos_productivos_nombre_codigo_unique" UNIQUE,
  "fecha_inicio_prevista" date NOT NULL,
  "fecha_fin_prevista" date NOT NULL,
  "fecha_inicio_efectiva" date,
  "fecha_fin_efectiva" date,
  "responsable_seguimiento_id" uuid NOT NULL,
  "estado" varchar(11) DEFAULT 'PLANIFICADO' NOT NULL,
  "observaciones" text,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  "actualizado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "ciclos_nombre_valido" CHECK (length(trim("nombre_codigo")) > 0 AND "nombre_codigo" = trim("nombre_codigo")),
  CONSTRAINT "ciclos_fechas_previstas" CHECK ("fecha_fin_prevista" >= "fecha_inicio_prevista"),
  CONSTRAINT "ciclos_estado_fechas" CHECK (
    ("estado" = 'PLANIFICADO' AND "fecha_inicio_efectiva" IS NULL AND "fecha_fin_efectiva" IS NULL) OR
    ("estado" = 'ACTIVO' AND "fecha_inicio_efectiva" IS NOT NULL AND "fecha_fin_efectiva" IS NULL) OR
    ("estado" = 'FINALIZADO' AND "fecha_inicio_efectiva" IS NOT NULL AND "fecha_fin_efectiva" IS NOT NULL AND "fecha_fin_efectiva" >= "fecha_inicio_efectiva")
  )
);
--> statement-breakpoint
CREATE INDEX "idx_ciclos_plantacion_estado" ON "ciclos_productivos" ("plantacion_id", "estado");
--> statement-breakpoint
ALTER TABLE "actividades_programadas" ADD CONSTRAINT "actividades_programadas_ciclo_fk"
  FOREIGN KEY ("ciclo_id") REFERENCES "ciclos_productivos"("id") ON DELETE RESTRICT;
--> statement-breakpoint
-- Un escritor que esperó al cierre no puede crear/reabrir un pendiente sobre el ciclo ya finalizado.
CREATE FUNCTION validar_pendiente_ciclo_abierto() RETURNS trigger AS $$
DECLARE estado_ciclo text;
BEGIN
  IF NEW.estado = 'PENDIENTE' THEN
    SELECT estado INTO estado_ciclo FROM ciclos_productivos WHERE id = NEW.ciclo_id FOR SHARE;
    IF estado_ciclo = 'FINALIZADO' THEN
      RAISE EXCEPTION 'No se pueden registrar pendientes sobre un ciclo finalizado.'
        USING ERRCODE = '23514', CONSTRAINT = 'actividades_programadas_ciclo_abierto';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_pendiente_ciclo_abierto BEFORE INSERT OR UPDATE OF ciclo_id, estado ON actividades_programadas
  FOR EACH ROW EXECUTE FUNCTION validar_pendiente_ciclo_abierto();
