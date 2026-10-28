-- Materializa el modelo usuarios ya existente; no crea un catálogo paralelo de responsables.
CREATE TABLE IF NOT EXISTS "usuarios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organizacion_id" uuid,
  "nombre" varchar(100) NOT NULL,
  "apellido" varchar(100) NOT NULL,
  "email" varchar(150) NOT NULL CONSTRAINT "usuarios_email_unique" UNIQUE,
  "password_hash" varchar(255) NOT NULL,
  "salt" varchar(64) NOT NULL,
  "perfil" varchar(50) NOT NULL,
  "estado" varchar(30) DEFAULT 'ACTIVO' NOT NULL,
  "intentos_fallidos" integer DEFAULT 0 NOT NULL,
  "debe_cambiar_password" boolean DEFAULT true NOT NULL,
  "bloqueado_hasta" timestamptz,
  "ultimo_acceso" timestamptz,
  "creado_en" timestamptz DEFAULT now() NOT NULL,
  "actualizado_en" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usuarios_email" ON "usuarios" ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usuarios_perfil" ON "usuarios" ("perfil");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usuarios_estado" ON "usuarios" ("estado");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_usuarios_organizacion" ON "usuarios" ("organizacion_id");
--> statement-breakpoint
-- Si hubiera responsables huérfanos, la migración falla: no inventa usuarios ni modifica históricos.
ALTER TABLE "ciclos_productivos" ADD CONSTRAINT "ciclos_responsable_usuario_fk"
  FOREIGN KEY ("responsable_seguimiento_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT;
