CREATE TABLE IF NOT EXISTS "fincas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organizacion_id" uuid,
  "nombre" varchar(150) NOT NULL,
  "localidad" varchar(120) NOT NULL,
  "departamento" varchar(120) NOT NULL,
  "provincia" varchar(120) NOT NULL,
  "superficie_total_ha" numeric(10, 2) NOT NULL,
  "responsable_id" uuid,
  "renspa" varchar(50),
  "geometria" jsonb,
  "propietario" varchar(150),
  "telefono" varchar(50),
  "observaciones" text,
  "creado_en" timestamp with time zone DEFAULT now() NOT NULL,
  "actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "fincas_nombre_unique" UNIQUE("nombre")
);

ALTER TABLE "fincas" ADD COLUMN IF NOT EXISTS "propietario" varchar(150);
ALTER TABLE "fincas" ADD COLUMN IF NOT EXISTS "telefono" varchar(50);
ALTER TABLE "fincas" ADD COLUMN IF NOT EXISTS "observaciones" text;

ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "finca_id" uuid;
ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "superficie_ha" numeric(10, 2);
ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "geometria" jsonb;
ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "nombre_territorial" varchar(150);
ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "ubicacion_sector" varchar(150);
ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "tipo_suelo" varchar(100);
ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "sistema_riego" varchar(100);
ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "estado_territorial" varchar(15) NOT NULL DEFAULT 'DISPONIBLE';
ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "fecha_registro" varchar(10);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lotes_finca_id_fincas_id_fk'
  ) THEN
    ALTER TABLE "lotes" ADD CONSTRAINT "lotes_finca_id_fincas_id_fk"
      FOREIGN KEY ("finca_id") REFERENCES "public"."fincas"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS "idx_fincas_provincia_depto"
  ON "fincas" ("provincia", "departamento");
CREATE INDEX IF NOT EXISTS "idx_fincas_organizacion"
  ON "fincas" ("organizacion_id");
CREATE INDEX IF NOT EXISTS "idx_lotes_finca" ON "lotes" ("finca_id");
CREATE INDEX IF NOT EXISTS "idx_lotes_estado" ON "lotes" ("estado_actual");

CREATE INDEX IF NOT EXISTS "idx_lotes_territorio_filtros"
  ON "lotes" ("estado_territorial", "codigo_lote", "nombre_territorial");

ALTER TABLE "lotes" DROP CONSTRAINT IF EXISTS "chk_lotes_estado_territorial";
ALTER TABLE "lotes" ADD CONSTRAINT "chk_lotes_estado_territorial"
  CHECK ("estado_territorial" IN ('DISPONIBLE', 'EN_PRODUCCION', 'INACTIVO'));
