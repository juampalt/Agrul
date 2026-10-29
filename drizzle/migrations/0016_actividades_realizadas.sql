-- CU30: tabla canónica de hechos ejecutados. El vínculo nullable reserva RN-10;
-- este bloque solo permite ejecutar actividades previamente programadas.
CREATE TABLE "actividades_realizadas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ciclo_id" uuid NOT NULL REFERENCES "ciclos_productivos"("id") ON DELETE RESTRICT,
  "lote_id" uuid NOT NULL REFERENCES "lotes"("id") ON DELETE RESTRICT,
  "actividad_programada_id" uuid UNIQUE REFERENCES "actividades_programadas"("id") ON DELETE RESTRICT,
  "tipo_actividad_id" uuid NOT NULL REFERENCES "tipos_actividad"("id") ON DELETE RESTRICT,
  "fecha_ejecucion" date NOT NULL,
  "responsable_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "superficie_trabajada" numeric(8,2) NOT NULL,
  "duracion_horas" numeric(5,2),
  "descripcion_trabajo" text,
  "datos_especificos" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "realizadas_superficie_positiva" CHECK ("superficie_trabajada" > 0),
  CONSTRAINT "realizadas_duracion_positiva" CHECK ("duracion_horas" IS NULL OR "duracion_horas" > 0)
);
--> statement-breakpoint
CREATE INDEX "idx_realizadas_ciclo_fecha" ON "actividades_realizadas"("ciclo_id", "fecha_ejecucion");
