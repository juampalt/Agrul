-- CU33: una labor puede registrarse como respuesta a un monitoreo del mismo ciclo.
ALTER TABLE "actividades_realizadas" ADD COLUMN "monitoreo_id" uuid REFERENCES "monitoreos"("id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX "idx_realizadas_monitoreo" ON "actividades_realizadas" ("monitoreo_id");
