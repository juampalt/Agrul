ALTER TABLE "variedades" ADD CONSTRAINT "variedades_id_cultivo_unique" UNIQUE ("id", "cultivo_id");
--> statement-breakpoint
CREATE TABLE "plantaciones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lote_id" uuid NOT NULL REFERENCES "lotes"("id") ON DELETE RESTRICT,
  "cultivo_id" uuid NOT NULL REFERENCES "cultivos"("id") ON DELETE RESTRICT,
  "variedad_id" uuid NOT NULL,
  "fecha_plantacion" date NOT NULL,
  "superficie_ha" numeric(8,2) NOT NULL,
  "cantidad_inicial_plantas" integer NOT NULL,
  "procedencia" text,
  "estado" varchar(10) DEFAULT 'ACTIVA' NOT NULL,
  "fecha_finalizacion" date,
  CONSTRAINT "plantaciones_variedad_cultivo_fk" FOREIGN KEY ("variedad_id", "cultivo_id") REFERENCES "variedades"("id", "cultivo_id") ON DELETE RESTRICT,
  CONSTRAINT "plantaciones_superficie_positiva" CHECK ("superficie_ha" > 0),
  CONSTRAINT "plantaciones_plantas_positivas" CHECK ("cantidad_inicial_plantas" > 0),
  CONSTRAINT "plantaciones_estado_fechas" CHECK (
    ("estado" = 'ACTIVA' AND "fecha_finalizacion" IS NULL) OR
    ("estado" = 'FINALIZADA' AND "fecha_finalizacion" IS NOT NULL AND "fecha_finalizacion" >= "fecha_plantacion")
  )
);
--> statement-breakpoint
CREATE INDEX "idx_plantaciones_lote_estado" ON "plantaciones" ("lote_id", "estado");
--> statement-breakpoint
CREATE INDEX "idx_plantaciones_cultivo_variedad" ON "plantaciones" ("cultivo_id", "variedad_id");
