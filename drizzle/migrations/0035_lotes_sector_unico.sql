-- CU03/CU05: los lotes no inactivos de una finca no pueden coincidir en ubicación o sector.
CREATE UNIQUE INDEX "lotes_sector_activo_unique" ON "lotes" ("finca_id", lower(btrim("ubicacion_sector")))
  WHERE "estado_territorial" <> 'INACTIVO' AND "ubicacion_sector" IS NOT NULL AND btrim("ubicacion_sector") <> '';
