CREATE TABLE "variedades" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "cultivo_id" uuid NOT NULL,
  "nombre" varchar(40) NOT NULL,
  "descripcion" text,
  "estado" varchar(8) DEFAULT 'ACTIVO' NOT NULL,
  CONSTRAINT "variedades_cultivo_nombre_unique" UNIQUE ("cultivo_id", "nombre"),
  CONSTRAINT "variedades_cultivo_id_cultivos_id_fk" FOREIGN KEY ("cultivo_id") REFERENCES "cultivos"("id") ON DELETE RESTRICT,
  CONSTRAINT "variedades_nombre_valido" CHECK (length(trim("nombre")) > 0 AND "nombre" = trim("nombre")),
  CONSTRAINT "variedades_estado_valido" CHECK ("estado" IN ('ACTIVO', 'INACTIVO'))
);
--> statement-breakpoint
CREATE INDEX "idx_variedades_cultivo_estado" ON "variedades" ("cultivo_id", "estado");
