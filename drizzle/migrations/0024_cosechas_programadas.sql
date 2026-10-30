CREATE TABLE cosechas_programadas (
  id uuid PRIMARY KEY,
  ciclo_id uuid NOT NULL REFERENCES ciclos_productivos(id) ON DELETE RESTRICT,
  fecha_prevista date NOT NULL,
  responsable_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  sector text NOT NULL,
  cantidad_estimada_kg numeric(10,2) NOT NULL,
  estado varchar(10) NOT NULL DEFAULT 'PENDIENTE',
  motivo_cancelacion text,
  version integer NOT NULL DEFAULT 1,
  actualizado_por uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cosechas_programadas_estado CHECK (estado IN ('PENDIENTE','EJECUTADA','CANCELADA')),
  CONSTRAINT cosechas_programadas_estimacion CHECK (cantidad_estimada_kg >= 0 AND cantidad_estimada_kg <= 99999999.99),
  CONSTRAINT cosechas_programadas_sector CHECK (length(trim(sector)) > 0 AND sector = trim(sector)),
  CONSTRAINT cosechas_programadas_cancelacion CHECK (
    (estado = 'CANCELADA' AND motivo_cancelacion IS NOT NULL AND length(trim(motivo_cancelacion)) > 0)
    OR (estado <> 'CANCELADA' AND motivo_cancelacion IS NULL)),
  CONSTRAINT cosechas_programadas_version CHECK (version > 0)
);
CREATE INDEX idx_cosechas_programadas_ciclo_fecha ON cosechas_programadas(ciclo_id,fecha_prevista);
CREATE INDEX idx_cosechas_programadas_responsable ON cosechas_programadas(responsable_id);
CREATE TABLE cosechas_programadas_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id uuid NOT NULL REFERENCES cosechas_programadas(id) ON DELETE RESTRICT,
  operacion text NOT NULL CHECK (operacion IN ('PROGRAMACION','REPROGRAMACION','CANCELACION')),
  actor_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  anterior jsonb,
  nuevo jsonb NOT NULL,
  registrado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cosechas_programadas_historial_jornada ON cosechas_programadas_historial(jornada_id,registrado_en);
--> statement-breakpoint
CREATE FUNCTION validar_jornada_cosecha() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ciclo_estado text;
BEGIN
  IF TG_OP IN ('DELETE','TRUNCATE') THEN
    RAISE EXCEPTION 'No se elimina el historial de jornadas' USING ERRCODE='23514', CONSTRAINT='jornada_cosecha_inmutable';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.estado <> 'PENDIENTE' OR NEW.version <> 1 THEN
      RAISE EXCEPTION 'La jornada debe comenzar pendiente' USING ERRCODE='23514', CONSTRAINT='jornada_cosecha_transicion';
    END IF;
  ELSE
    IF OLD.estado <> 'PENDIENTE' OR NEW.estado NOT IN ('PENDIENTE','CANCELADA')
      OR ROW(NEW.id,NEW.ciclo_id,NEW.sector,NEW.cantidad_estimada_kg,NEW.creado_en)
         IS DISTINCT FROM ROW(OLD.id,OLD.ciclo_id,OLD.sector,OLD.cantidad_estimada_kg,OLD.creado_en)
      OR (NEW.estado='CANCELADA' AND ROW(NEW.fecha_prevista,NEW.responsable_id) IS DISTINCT FROM ROW(OLD.fecha_prevista,OLD.responsable_id)) THEN
      RAISE EXCEPTION 'Transición de jornada inválida' USING ERRCODE='23514', CONSTRAINT='jornada_cosecha_transicion';
    END IF;
    NEW.version := OLD.version + 1;
  END IF;
  -- El bloqueo comparte la fila con el cierre del ciclo: no decide sobre un
  -- estado que pueda cambiar hasta confirmar esta escritura y su historial.
  SELECT estado INTO ciclo_estado FROM ciclos_productivos WHERE id=NEW.ciclo_id FOR SHARE;
  IF NEW.estado='PENDIENTE' AND ciclo_estado='FINALIZADO' THEN
    RAISE EXCEPTION 'No se programa en ciclos finalizados' USING ERRCODE='23514', CONSTRAINT='jornada_cosecha_ciclo';
  END IF;
  IF TG_OP='INSERT' OR NEW.responsable_id IS DISTINCT FROM OLD.responsable_id THEN
    PERFORM 1 FROM usuarios WHERE id=NEW.responsable_id AND estado='ACTIVO' FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Responsable inexistente o inactivo' USING ERRCODE='23514', CONSTRAINT='jornada_cosecha_responsable';
    END IF;
  END IF;
  PERFORM 1 FROM usuarios WHERE id=NEW.actualizado_por AND estado='ACTIVO' FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Actor inexistente o inactivo' USING ERRCODE='23514', CONSTRAINT='jornada_cosecha_actor';
  END IF;
  NEW.actualizado_en := clock_timestamp();
  RETURN NEW;
END $$;
CREATE TRIGGER jornada_cosecha_validar BEFORE INSERT OR UPDATE OR DELETE ON cosechas_programadas
  FOR EACH ROW EXECUTE FUNCTION validar_jornada_cosecha();
CREATE TRIGGER jornada_cosecha_no_truncate BEFORE TRUNCATE ON cosechas_programadas
  FOR EACH STATEMENT EXECUTE FUNCTION validar_jornada_cosecha();
--> statement-breakpoint
CREATE FUNCTION auditar_jornada_cosecha() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO cosechas_programadas_historial(jornada_id,operacion,actor_id,anterior,nuevo)
  VALUES (NEW.id,CASE WHEN TG_OP='INSERT' THEN 'PROGRAMACION' WHEN NEW.estado='CANCELADA' THEN 'CANCELACION' ELSE 'REPROGRAMACION' END,
    NEW.actualizado_por,CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,to_jsonb(NEW));
  RETURN NEW;
END $$;
CREATE TRIGGER jornada_cosecha_auditar AFTER INSERT OR UPDATE ON cosechas_programadas
  FOR EACH ROW EXECUTE FUNCTION auditar_jornada_cosecha();
CREATE FUNCTION proteger_historial_jornada() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' AND pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'VIOLACION_DE_INMUTABILIDAD: historial de jornadas protegido' USING ERRCODE='23514', CONSTRAINT='jornada_cosecha_inmutable';
END $$;
CREATE TRIGGER historial_jornada_inmutable BEFORE INSERT OR UPDATE OR DELETE ON cosechas_programadas_historial
  FOR EACH ROW EXECUTE FUNCTION proteger_historial_jornada();
CREATE TRIGGER historial_jornada_no_truncate BEFORE TRUNCATE ON cosechas_programadas_historial
  FOR EACH STATEMENT EXECUTE FUNCTION proteger_historial_jornada();
