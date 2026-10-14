CREATE TABLE "eventos_trazabilidad" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lote_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"ubicacion_id" uuid NOT NULL,
	"tipo_evento" varchar(50) NOT NULL,
	"timestamp_captura_local" timestamp with time zone NOT NULL,
	"timestamp_servidor" timestamp with time zone DEFAULT now() NOT NULL,
	"payload_especifico" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evento_referenciado_id" uuid,
	"estado_sincronizacion" varchar(30) DEFAULT 'SINCRONIZADO' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lote_genealogia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lote_padre_id" uuid NOT NULL,
	"lote_hijo_id" uuid NOT NULL,
	"cantidad_aportada" numeric(14, 4) NOT NULL,
	"unidad_medida" varchar(20) NOT NULL,
	"motivo_relacion" varchar(50) NOT NULL,
	"fecha_utc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo_lote" varchar(60) NOT NULL,
	"producto" varchar(120) NOT NULL,
	"variedad" varchar(100),
	"estado_actual" varchar(30) DEFAULT 'CREADO' NOT NULL,
	"cantidad_actual" numeric(14, 4) DEFAULT '0' NOT NULL,
	"unidad_medida" varchar(20) NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lotes_codigo_lote_unique" UNIQUE("codigo_lote")
);
--> statement-breakpoint
ALTER TABLE "eventos_trazabilidad" ADD CONSTRAINT "eventos_trazabilidad_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_genealogia" ADD CONSTRAINT "lote_genealogia_lote_padre_id_lotes_id_fk" FOREIGN KEY ("lote_padre_id") REFERENCES "public"."lotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lote_genealogia" ADD CONSTRAINT "lote_genealogia_lote_hijo_id_lotes_id_fk" FOREIGN KEY ("lote_hijo_id") REFERENCES "public"."lotes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_eventos_lote_timestamp" ON "eventos_trazabilidad" USING btree ("lote_id","timestamp_captura_local");--> statement-breakpoint
CREATE INDEX "idx_eventos_tipo" ON "eventos_trazabilidad" USING btree ("tipo_evento");--> statement-breakpoint
CREATE INDEX "idx_eventos_referenciado" ON "eventos_trazabilidad" USING btree ("evento_referenciado_id");--> statement-breakpoint
CREATE INDEX "idx_genealogia_padre" ON "lote_genealogia" USING btree ("lote_padre_id");--> statement-breakpoint
CREATE INDEX "idx_genealogia_hijo" ON "lote_genealogia" USING btree ("lote_hijo_id");