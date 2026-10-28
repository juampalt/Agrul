ALTER TABLE usuarios ADD COLUMN version_sesion integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE FUNCTION actualizar_version_sesion_usuario() RETURNS trigger AS $$
BEGIN
  IF ROW(OLD.password_hash, OLD.salt, OLD.perfil, OLD.estado, OLD.debe_cambiar_password)
    IS DISTINCT FROM ROW(NEW.password_hash, NEW.salt, NEW.perfil, NEW.estado, NEW.debe_cambiar_password) THEN
    NEW.version_sesion := OLD.version_sesion + 1;
  ELSE NEW.version_sesion := OLD.version_sesion;
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_version_sesion_usuario BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION actualizar_version_sesion_usuario();
--> statement-breakpoint
CREATE TABLE sesiones_usuarios (
  token_hash varchar(64) PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  expira_en timestamptz NOT NULL,
  ultima_actividad timestamptz NOT NULL DEFAULT now(),
  revocada boolean NOT NULL DEFAULT false
);
CREATE INDEX idx_sesiones_usuario ON sesiones_usuarios(usuario_id);
