-- No promueve cuentas previas ni modifica sus permisos.
-- Si hubiera correos equivalentes, se detiene sin eliminar ni renombrar usuarios.
CREATE UNIQUE INDEX "usuarios_email_normalizado_unique" ON "usuarios" (lower("email"));
--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_perfil_valido"
  CHECK ("perfil" IN ('ADMINISTRADOR', 'ENCARGADO_CAMPO', 'ADMIN_SISTEMA', 'ENCARGADO', 'OPERARIO', 'ASESOR_AGRONOMO'));
