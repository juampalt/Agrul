ALTER TABLE "fincas" ADD COLUMN IF NOT EXISTS "propietario" varchar(150);
ALTER TABLE "fincas" ADD COLUMN IF NOT EXISTS "telefono" varchar(50);
ALTER TABLE "fincas" ADD COLUMN IF NOT EXISTS "observaciones" text;

ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "nombre_territorial" varchar(150);
ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "ubicacion_sector" varchar(150);
ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "tipo_suelo" varchar(100);
ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "sistema_riego" varchar(100);
ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "estado_territorial" varchar(15) NOT NULL DEFAULT 'DISPONIBLE';
ALTER TABLE "lotes" ADD COLUMN IF NOT EXISTS "fecha_registro" varchar(10);

CREATE INDEX IF NOT EXISTS "idx_lotes_territorio_filtros"
  ON "lotes" ("estado_territorial", "codigo_lote", "nombre_territorial");

ALTER TABLE "lotes" DROP CONSTRAINT IF EXISTS "chk_lotes_estado_territorial";
ALTER TABLE "lotes" ADD CONSTRAINT "chk_lotes_estado_territorial"
  CHECK ("estado_territorial" IN ('DISPONIBLE', 'EN_PRODUCCION', 'INACTIVO'));
