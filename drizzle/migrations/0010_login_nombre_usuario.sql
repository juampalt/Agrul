-- Los usuarios existentes conservan el ingreso por correo, sin inventar identificadores.
ALTER TABLE "usuarios" ADD COLUMN "nombre_usuario" varchar(100);
--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_nombre_usuario_unique" ON "usuarios" (lower("nombre_usuario"));
--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_nombre_usuario_formato"
  CHECK ("nombre_usuario" IS NULL OR "nombre_usuario" ~ '^[a-zA-Z0-9._-]{1,100}$');
