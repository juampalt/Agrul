CREATE TABLE IF NOT EXISTS "usuario_finca_asignacion" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
  "finca_id" uuid NOT NULL REFERENCES "fincas"("id") ON DELETE CASCADE,
  "activo" boolean DEFAULT true NOT NULL,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  "actualizado_en" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "usuario_finca_par_unique" ON "usuario_finca_asignacion" ("usuario_id", "finca_id");
CREATE INDEX IF NOT EXISTS "idx_usuario_finca_usuario" ON "usuario_finca_asignacion" ("usuario_id");
CREATE INDEX IF NOT EXISTS "idx_usuario_finca_finca" ON "usuario_finca_asignacion" ("finca_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auditoria_seguridad_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "usuario_id" uuid,
  "usuario_email" varchar(150),
  "accion" varchar(50) NOT NULL,
  "entidad" varchar(100) NOT NULL,
  "entidad_id" varchar(100),
  "valor_previo_json" jsonb,
  "valor_nuevo_json" jsonb,
  "ip" varchar(60),
  "user_agent" varchar(255),
  "timestamp" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Un responsable auditado conserva su identidad: SET NULL modificaría el historial inmutable.
ALTER TABLE "auditoria_seguridad_log" DROP CONSTRAINT IF EXISTS "auditoria_seguridad_log_usuario_id_usuarios_id_fk";
ALTER TABLE "auditoria_seguridad_log" ADD CONSTRAINT "auditoria_seguridad_log_usuario_id_usuarios_id_fk"
  FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS "idx_auditoria_usuario" ON "auditoria_seguridad_log" ("usuario_id");
CREATE INDEX IF NOT EXISTS "idx_auditoria_accion" ON "auditoria_seguridad_log" ("accion");
CREATE INDEX IF NOT EXISTS "idx_auditoria_entidad" ON "auditoria_seguridad_log" ("entidad");
CREATE INDEX IF NOT EXISTS "idx_auditoria_timestamp" ON "auditoria_seguridad_log" ("timestamp");
--> statement-breakpoint
CREATE TABLE "registro_modificaciones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fecha_hora" timestamptz DEFAULT now() NOT NULL,
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "usuario_afectado_id" uuid NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT,
  "dato_modificado" varchar(100) NOT NULL,
  "valor_anterior" jsonb,
  "valor_nuevo" jsonb
);
CREATE INDEX "idx_modificaciones_usuario_fecha" ON "registro_modificaciones" ("usuario_afectado_id", "fecha_hora");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION rechazar_mutacion_auditoria_usuarios() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'VIOLACION_DE_INMUTABILIDAD: El historial de seguridad no admite cambios ni borrados.';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_auditoria_usuarios_inmutable BEFORE UPDATE OR DELETE ON "auditoria_seguridad_log"
  FOR EACH ROW EXECUTE FUNCTION rechazar_mutacion_auditoria_usuarios();
CREATE TRIGGER trg_auditoria_usuarios_no_truncate BEFORE TRUNCATE ON "auditoria_seguridad_log"
  FOR EACH STATEMENT EXECUTE FUNCTION rechazar_mutacion_auditoria_usuarios();
CREATE TRIGGER trg_modificaciones_inmutables BEFORE UPDATE OR DELETE ON "registro_modificaciones"
  FOR EACH ROW EXECUTE FUNCTION rechazar_mutacion_auditoria_usuarios();
CREATE TRIGGER trg_modificaciones_no_truncate BEFORE TRUNCATE ON "registro_modificaciones"
  FOR EACH STATEMENT EXECUTE FUNCTION rechazar_mutacion_auditoria_usuarios();
