CREATE TABLE "cultivos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nombre" varchar(40) NOT NULL,
  "tipo_ciclo_vida" varchar(7) NOT NULL,
  "descripcion" text,
  "estado" varchar(8) DEFAULT 'ACTIVO' NOT NULL,
  CONSTRAINT "cultivos_nombre_unique" UNIQUE ("nombre"),
  CONSTRAINT "cultivos_nombre_valido" CHECK (length(trim("nombre")) > 0 AND "nombre" = trim("nombre")),
  CONSTRAINT "cultivos_tipo_valido" CHECK ("tipo_ciclo_vida" IN ('ANUAL', 'PERENNE')),
  CONSTRAINT "cultivos_estado_valido" CHECK ("estado" IN ('ACTIVO', 'INACTIVO'))
);
