-- Campos opcionales del documento TFI: observaciones en las capturas de campo y poscosecha,
-- y kg estimados / cantidad de envases que pueden no conocerse al registrar.
ALTER TABLE "actividades_programadas" ADD COLUMN "observaciones" text;
--> statement-breakpoint
ALTER TABLE "cosechas_programadas" ADD COLUMN "observaciones" text;
--> statement-breakpoint
ALTER TABLE "cosechas_programadas" ALTER COLUMN "cantidad_estimada_kg" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "cosechas" ADD COLUMN "observaciones" text;
--> statement-breakpoint
ALTER TABLE "clasificaciones" ADD COLUMN "observaciones" text;
--> statement-breakpoint
-- CU47: kg descartados por cada causa; deben sumar el descarte total.
ALTER TABLE "clasificaciones" ADD COLUMN "descarte_por_causa" jsonb;
--> statement-breakpoint
ALTER TABLE "acondicionamientos" ADD COLUMN "observaciones" text;
--> statement-breakpoint
ALTER TABLE "acondicionamientos" ALTER COLUMN "cantidad_envases" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "movimientos_almacenamiento" ADD COLUMN "observaciones" text;
--> statement-breakpoint
ALTER TABLE "destinos_produccion" ADD COLUMN "observaciones" text;
--> statement-breakpoint
-- CU43: una jornada pendiente puede reprogramarse también en sector, kg estimados y observaciones.
-- Siguen siendo inmutables el identificador, el ciclo y la fecha de creación.
CREATE OR REPLACE FUNCTION validar_jornada_cosecha() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ciclo_estado text;
BEGIN
  IF TG_OP IN ('DELETE','TRUNCATE') THEN
    RAISE EXCEPTION 'No se elimina el historial de jornadas' USING ERRCODE='23514',CONSTRAINT='jornada_cosecha_inmutable';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.estado <> 'PENDIENTE' OR NEW.version <> 1 THEN
      RAISE EXCEPTION 'La jornada debe comenzar pendiente' USING ERRCODE='23514',CONSTRAINT='jornada_cosecha_transicion';
    END IF;
  ELSE
    IF OLD.estado <> 'PENDIENTE' OR NEW.estado NOT IN ('PENDIENTE','CANCELADA','EJECUTADA')
      OR ROW(NEW.id,NEW.ciclo_id,NEW.creado_en) IS DISTINCT FROM ROW(OLD.id,OLD.ciclo_id,OLD.creado_en)
      OR (NEW.estado IN ('CANCELADA','EJECUTADA') AND ROW(NEW.fecha_prevista,NEW.responsable_id,NEW.sector,NEW.cantidad_estimada_kg,NEW.observaciones)
          IS DISTINCT FROM ROW(OLD.fecha_prevista,OLD.responsable_id,OLD.sector,OLD.cantidad_estimada_kg,OLD.observaciones)) THEN
      RAISE EXCEPTION 'Transición de jornada inválida' USING ERRCODE='23514',CONSTRAINT='jornada_cosecha_transicion';
    END IF;
    IF NEW.estado='EJECUTADA' AND NOT EXISTS(SELECT 1 FROM cosechas WHERE cosecha_programada_id=NEW.id AND origen='PROGRAMADA' AND registrado_por=NEW.actualizado_por) THEN
      RAISE EXCEPTION 'La ejecución requiere una cosecha real' USING ERRCODE='23514',CONSTRAINT='jornada_cosecha_transicion';
    END IF;
    NEW.version := OLD.version+1;
  END IF;
  SELECT estado INTO ciclo_estado FROM ciclos_productivos WHERE id=NEW.ciclo_id FOR SHARE;
  IF NEW.estado='PENDIENTE' AND ciclo_estado='FINALIZADO' THEN
    RAISE EXCEPTION 'No se programa en ciclos finalizados' USING ERRCODE='23514',CONSTRAINT='jornada_cosecha_ciclo';
  END IF;
  IF TG_OP='INSERT' OR NEW.responsable_id IS DISTINCT FROM OLD.responsable_id THEN
    PERFORM 1 FROM usuarios WHERE id=NEW.responsable_id AND estado='ACTIVO' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Responsable inexistente o inactivo' USING ERRCODE='23514',CONSTRAINT='jornada_cosecha_responsable'; END IF;
  END IF;
  PERFORM 1 FROM usuarios WHERE id=NEW.actualizado_por AND estado='ACTIVO' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Actor inexistente o inactivo' USING ERRCODE='23514',CONSTRAINT='jornada_cosecha_actor'; END IF;
  NEW.actualizado_en := clock_timestamp();
  RETURN NEW;
END $$;
