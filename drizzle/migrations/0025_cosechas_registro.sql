-- La tabla estaba declarada en Drizzle pero ausente del journal. Si existe
-- una instalación anterior, se conservan todos sus datos y columnas.
CREATE TABLE IF NOT EXISTS cosechas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo_trazabilidad varchar(80) NOT NULL UNIQUE,
  lote_id uuid NOT NULL REFERENCES lotes(id) ON DELETE RESTRICT,
  ciclo_id uuid NOT NULL REFERENCES ciclos_productivos(id) ON DELETE RESTRICT,
  fecha varchar(30) NOT NULL, cantidad_cosechada_kg numeric(14,4) NOT NULL,
  cantidad_comercializable_kg numeric(14,4), cantidad_descarte_kg numeric(14,4),
  motivo_descarte varchar(150), observaciones_calidad text, responsable_id uuid,
  cuadrilla_id uuid, recipientes jsonb, superficie_cosechada_ha numeric(10,2),
  estado varchar(30) NOT NULL DEFAULT 'ACTIVA', motivo_anulacion text,
  usuario_anulacion_id uuid, anulado_en timestamptz,
  historial_modificaciones jsonb NOT NULL DEFAULT '[]', clave_idempotencia varchar(150) UNIQUE,
  creado_en timestamptz NOT NULL DEFAULT now(), actualizado_en timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cosechas ALTER COLUMN cantidad_comercializable_kg DROP NOT NULL;
ALTER TABLE cosechas ALTER COLUMN cantidad_descarte_kg DROP NOT NULL;
ALTER TABLE cosechas ADD COLUMN cosecha_programada_id uuid REFERENCES cosechas_programadas(id) ON DELETE RESTRICT;
ALTER TABLE cosechas ADD COLUMN fecha_efectiva date;
ALTER TABLE cosechas ADD COLUMN sector text;
ALTER TABLE cosechas ADD COLUMN numero_pasada integer;
ALTER TABLE cosechas ADD COLUMN origen varchar(13);
ALTER TABLE cosechas ADD COLUMN registrado_por uuid REFERENCES usuarios(id) ON DELETE RESTRICT;
ALTER TABLE cosechas ADD COLUMN solicitud jsonb;
ALTER TABLE cosechas ADD COLUMN timestamp_captura_local timestamptz;
ALTER TABLE cosechas ADD CONSTRAINT cosechas_responsable_fk FOREIGN KEY(responsable_id) REFERENCES usuarios(id) ON DELETE RESTRICT NOT VALID;
ALTER TABLE cosechas ADD CONSTRAINT cosechas_registro_valido CHECK (solicitud IS NULL OR (
  origen IS NOT NULL AND origen IN ('PROGRAMADA','NO_PROGRAMADA') AND numero_pasada IS NOT NULL AND numero_pasada > 0
  AND sector IS NOT NULL AND length(trim(sector)) > 0 AND sector=trim(sector)
  AND fecha_efectiva IS NOT NULL AND fecha=fecha_efectiva::text AND responsable_id IS NOT NULL AND registrado_por IS NOT NULL
  AND cantidad_cosechada_kg > 0 AND cantidad_cosechada_kg <= 99999999.99 AND cantidad_cosechada_kg=trunc(cantidad_cosechada_kg,2)
  AND cantidad_comercializable_kg IS NULL AND cantidad_descarte_kg IS NULL AND estado='ACTIVA'
  AND ((origen='PROGRAMADA' AND cosecha_programada_id IS NOT NULL) OR (origen='NO_PROGRAMADA' AND cosecha_programada_id IS NULL))
)) NOT VALID;
CREATE UNIQUE INDEX cosechas_ciclo_pasada_unique ON cosechas(ciclo_id,numero_pasada);
CREATE UNIQUE INDEX cosechas_programada_unique ON cosechas(cosecha_programada_id);
CREATE INDEX IF NOT EXISTS idx_cosechas_lote ON cosechas(lote_id);
CREATE INDEX IF NOT EXISTS idx_cosechas_ciclo ON cosechas(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_cosechas_codigo ON cosechas(codigo_trazabilidad);
CREATE INDEX IF NOT EXISTS idx_cosechas_fecha ON cosechas(fecha);
CREATE INDEX IF NOT EXISTS idx_cosechas_estado ON cosechas(estado);
CREATE INDEX IF NOT EXISTS idx_cosechas_clave_idempotencia ON cosechas(clave_idempotencia);
--> statement-breakpoint
CREATE FUNCTION validar_registro_cosecha() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE jornada record; contexto record;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'VIOLACION_DE_INMUTABILIDAD: cosechas históricas protegidas' USING ERRCODE='23514',CONSTRAINT='cosechas_inmutables';
  END IF;
  IF NEW.solicitud IS NULL THEN
    RAISE EXCEPTION 'Las nuevas cosechas requieren el contrato vigente' USING ERRCODE='23514',CONSTRAINT='cosechas_registro_valido';
  END IF;
  IF NEW.cosecha_programada_id IS NOT NULL THEN
    SELECT * INTO jornada FROM cosechas_programadas WHERE id=NEW.cosecha_programada_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Jornada inexistente' USING ERRCODE='23503'; END IF;
    IF jornada.estado <> 'PENDIENTE' OR jornada.ciclo_id <> NEW.ciclo_id
       OR (NEW.solicitud->>'versionProgramacion') IS DISTINCT FROM jornada.version::text THEN
      RAISE EXCEPTION 'La jornada cambió o ya fue ejecutada' USING ERRCODE='23514',CONSTRAINT='cosechas_jornada_conflicto';
    END IF;
  END IF;
  SELECT c.estado,c.fecha_inicio_efectiva,p.lote_id,l.finca_id INTO contexto
    FROM ciclos_productivos c JOIN plantaciones p ON p.id=c.plantacion_id JOIN lotes l ON l.id=p.lote_id
    WHERE c.id=NEW.ciclo_id FOR SHARE OF c,p,l;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo inexistente' USING ERRCODE='23503'; END IF;
  IF contexto.estado <> 'ACTIVO' OR contexto.lote_id <> NEW.lote_id OR contexto.finca_id IS NULL
     OR NEW.fecha_efectiva < contexto.fecha_inicio_efectiva
     OR NEW.fecha_efectiva > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN
    RAISE EXCEPTION 'Ciclo, lote o fecha real inválidos' USING ERRCODE='23514',CONSTRAINT='cosechas_contexto_invalido';
  END IF;
  PERFORM 1 FROM usuarios WHERE id=NEW.responsable_id AND estado='ACTIVO' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Responsable inexistente o inactivo' USING ERRCODE='23514',CONSTRAINT='cosechas_responsable_invalido'; END IF;
  PERFORM 1 FROM usuarios WHERE id=NEW.registrado_por AND estado='ACTIVO' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Actor inexistente o inactivo' USING ERRCODE='23514',CONSTRAINT='cosechas_actor_invalido'; END IF;
  NEW.timestamp_captura_local := coalesce(NEW.timestamp_captura_local,clock_timestamp());
  RETURN NEW;
END $$;
CREATE TRIGGER cosechas_validar BEFORE INSERT OR UPDATE OR DELETE ON cosechas
  FOR EACH ROW EXECUTE FUNCTION validar_registro_cosecha();
CREATE TRIGGER cosechas_no_truncate BEFORE TRUNCATE ON cosechas
  FOR EACH STATEMENT EXECUTE FUNCTION validar_registro_cosecha();
--> statement-breakpoint
-- La ejecución solo es válida después de insertar el pesaje en la misma
-- transacción. No se habilita un PATCH que pueda ejecutarla sin cosecha real.
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
      OR ROW(NEW.id,NEW.ciclo_id,NEW.sector,NEW.cantidad_estimada_kg,NEW.creado_en)
         IS DISTINCT FROM ROW(OLD.id,OLD.ciclo_id,OLD.sector,OLD.cantidad_estimada_kg,OLD.creado_en)
      OR (NEW.estado IN ('CANCELADA','EJECUTADA') AND ROW(NEW.fecha_prevista,NEW.responsable_id) IS DISTINCT FROM ROW(OLD.fecha_prevista,OLD.responsable_id)) THEN
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
ALTER TABLE cosechas_programadas_historial DROP CONSTRAINT cosechas_programadas_historial_operacion_check;
ALTER TABLE cosechas_programadas_historial ADD CONSTRAINT cosechas_programadas_historial_operacion_check
  CHECK(operacion IN ('PROGRAMACION','REPROGRAMACION','CANCELACION','EJECUCION'));
CREATE OR REPLACE FUNCTION auditar_jornada_cosecha() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO cosechas_programadas_historial(jornada_id,operacion,actor_id,anterior,nuevo)
  VALUES(NEW.id,CASE WHEN TG_OP='INSERT' THEN 'PROGRAMACION' WHEN NEW.estado='CANCELADA' THEN 'CANCELACION'
    WHEN NEW.estado='EJECUTADA' THEN 'EJECUCION' ELSE 'REPROGRAMACION' END,
    NEW.actualizado_por,CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,to_jsonb(NEW));
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION confirmar_registro_cosecha() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE finca uuid;
BEGIN
  SELECT finca_id INTO finca FROM lotes WHERE id=NEW.lote_id;
  INSERT INTO eventos_trazabilidad(lote_id,actor_id,ubicacion_id,tipo_evento,timestamp_captura_local,timestamp_servidor,payload_especifico)
  VALUES(NEW.lote_id,NEW.registrado_por,finca,'COSECHA',NEW.timestamp_captura_local,clock_timestamp(),
    jsonb_build_object('cosechaId',NEW.id,'codigoTrazabilidad',NEW.codigo_trazabilidad,'cicloId',NEW.ciclo_id,
      'cosechaProgramadaId',NEW.cosecha_programada_id,'numeroPasada',NEW.numero_pasada,
      'cantidadCosechadaKg',NEW.cantidad_cosechada_kg,'unidadMedida','kg','responsableId',NEW.responsable_id,'origen',NEW.origen));
  IF NEW.cosecha_programada_id IS NOT NULL THEN
    UPDATE cosechas_programadas SET estado='EJECUTADA',actualizado_por=NEW.registrado_por WHERE id=NEW.cosecha_programada_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cosechas_confirmar AFTER INSERT ON cosechas FOR EACH ROW EXECUTE FUNCTION confirmar_registro_cosecha();
