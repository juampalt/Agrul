-- Trazabilidad de cambios en finca, lotes, cultivos, variedades, plantaciones, tipos de actividad y ciclos
-- (CU02, CU05-CU07, CU09-CU11, CU13-CU15, CU17, CU18, CU20-CU25): fecha, responsable, valores anteriores y nuevos.
CREATE TABLE "registro_cambios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entidad" varchar(40) NOT NULL,
  "entidad_id" uuid,
  "accion" varchar(30) NOT NULL,
  "usuario_id" uuid,
  "valor_previo" jsonb,
  "valor_nuevo" jsonb,
  "creado_en" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_registro_cambios_entidad" ON "registro_cambios" ("entidad", "entidad_id", "creado_en");
--> statement-breakpoint
CREATE FUNCTION proteger_registro_cambios() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VIOLACION_DE_INMUTABILIDAD: el registro de cambios no admite UPDATE ni DELETE.';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_registro_cambios_inmutable BEFORE UPDATE OR DELETE ON "registro_cambios"
  FOR EACH ROW EXECUTE FUNCTION proteger_registro_cambios();
