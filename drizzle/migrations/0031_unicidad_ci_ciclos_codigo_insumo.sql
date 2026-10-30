-- Unicidad sin distinguir mayúsculas (CU07, CU09, CU11, CU13, CU22, CU24, CU18),
-- código de insumo invariable (CU36) y código de ciclo único por plantación (CU18).
CREATE UNIQUE INDEX "cultivos_nombre_ci_unique" ON "cultivos" (lower("nombre"));
--> statement-breakpoint
CREATE UNIQUE INDEX "variedades_cultivo_nombre_ci_unique" ON "variedades" ("cultivo_id", lower("nombre"));
--> statement-breakpoint
CREATE UNIQUE INDEX "tipos_actividad_nombre_ci_unique" ON "tipos_actividad" (lower("nombre"));
--> statement-breakpoint
ALTER TABLE "ciclos_productivos" DROP CONSTRAINT "ciclos_productivos_nombre_codigo_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "ciclos_plantacion_codigo_ci_unique" ON "ciclos_productivos" ("plantacion_id", lower("nombre_codigo"));
--> statement-breakpoint
CREATE FUNCTION impedir_cambio_codigo_insumo() RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS DISTINCT FROM OLD.codigo THEN
    RAISE EXCEPTION 'El código del insumo es invariable.'
      USING ERRCODE = '23514', CONSTRAINT = 'insumos_codigo_inmutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_insumos_codigo_inmutable BEFORE UPDATE OF codigo ON "insumos"
  FOR EACH ROW EXECUTE FUNCTION impedir_cambio_codigo_insumo();
