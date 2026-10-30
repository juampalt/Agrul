CREATE TABLE camaras_sector (
  id uuid PRIMARY KEY, finca_id uuid NOT NULL REFERENCES fincas(id) ON DELETE RESTRICT,
  nombre varchar(40) NOT NULL UNIQUE, descripcion text, temperatura_objetivo_c numeric(5,2),
  creado_por uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT, solicitud jsonb NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(), CONSTRAINT camaras_nombre CHECK(length(trim(nombre))>0 AND nombre=trim(nombre))
);
CREATE INDEX idx_camaras_finca ON camaras_sector(finca_id);
CREATE TABLE movimientos_almacenamiento (
  id uuid PRIMARY KEY, partida_produccion_id uuid NOT NULL REFERENCES partidas_produccion(id) ON DELETE RESTRICT,
  camara_sector_id uuid NOT NULL REFERENCES camaras_sector(id) ON DELETE RESTRICT, tipo_movimiento text NOT NULL,
  cantidad_kg numeric(10,2) NOT NULL, fecha_movimiento date NOT NULL,
  responsable_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  registrado_por uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT, solicitud jsonb NOT NULL,
  timestamp_captura_local timestamptz NOT NULL DEFAULT now(), creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT almacenamiento_tipo CHECK(tipo_movimiento IN ('INGRESO','SALIDA')), CONSTRAINT almacenamiento_cantidad CHECK(cantidad_kg>0)
);
CREATE INDEX idx_almacenamiento_partida_camara_fecha ON movimientos_almacenamiento(partida_produccion_id,camara_sector_id,fecha_movimiento);
CREATE TABLE destinos_produccion (
  id uuid PRIMARY KEY, partida_produccion_id uuid NOT NULL REFERENCES partidas_produccion(id) ON DELETE RESTRICT,
  fecha_destino date NOT NULL, tipo_destino text NOT NULL, destino_especifico text NOT NULL,
  cantidad_destinada_kg numeric(10,2) NOT NULL, responsable_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  registrado_por uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT, solicitud jsonb NOT NULL,
  timestamp_captura_local timestamptz NOT NULL DEFAULT now(), creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT destinos_tipo CHECK(tipo_destino IN ('MERCADO_FRESCO','INDUSTRIA','OTRO')),
  CONSTRAINT destinos_cantidad CHECK(cantidad_destinada_kg>0), CONSTRAINT destinos_especifico CHECK(length(trim(destino_especifico))>0)
);
CREATE INDEX idx_destinos_partida_fecha ON destinos_produccion(partida_produccion_id,fecha_destino);
--> statement-breakpoint
CREATE FUNCTION contexto_partida_almacenamiento(partida uuid)
RETURNS TABLE(finca_id uuid,lote_id uuid,cosecha_id uuid,clasificacion_id uuid,fecha_clasificacion date,disponible numeric)
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM partidas_produccion p WHERE p.id=partida FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partida aprovechable inexistente' USING ERRCODE='23503'; END IF;
  RETURN QUERY SELECT l.finca_id,h.lote_id,h.id,c.id,c.fecha_clasificacion,p.cantidad_disponible_kg
    FROM partidas_produccion p JOIN clasificaciones c ON c.id=p.clasificacion_id
    JOIN cosechas h ON h.id=c.cosecha_id JOIN lotes l ON l.id=h.lote_id WHERE p.id=partida;
END $$;
CREATE FUNCTION validar_camara_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM validar_actores_poscosecha(NEW.creado_por,NEW.creado_por);
  RETURN NEW;
END $$;
CREATE TRIGGER camaras_validar BEFORE INSERT ON camaras_sector FOR EACH ROW EXECUTE FUNCTION validar_camara_produccion();
CREATE TRIGGER camaras_inmutables BEFORE UPDATE OR DELETE ON camaras_sector FOR EACH ROW EXECUTE FUNCTION proteger_hecho_poscosecha();
CREATE TRIGGER camaras_no_truncate BEFORE TRUNCATE ON camaras_sector FOR EACH STATEMENT EXECUTE FUNCTION proteger_hecho_poscosecha();
CREATE FUNCTION validar_movimiento_almacenamiento() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE origen record; finca_camara uuid; saldo numeric;
BEGIN
  SELECT * INTO origen FROM contexto_partida_almacenamiento(NEW.partida_produccion_id);
  SELECT finca_id INTO finca_camara FROM camaras_sector WHERE id=NEW.camara_sector_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cámara inexistente' USING ERRCODE='23503'; END IF;
  IF origen.finca_id IS NULL OR origen.finca_id IS DISTINCT FROM finca_camara THEN
    RAISE EXCEPTION 'Partida y cámara deben pertenecer a la misma finca' USING ERRCODE='23514',CONSTRAINT='almacenamiento_finca';
  END IF;
  IF NEW.fecha_movimiento<origen.fecha_clasificacion OR NEW.fecha_movimiento>(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN
    RAISE EXCEPTION 'Fecha de almacenamiento inválida' USING ERRCODE='23514',CONSTRAINT='poscosecha_fecha';
  END IF;
  IF NEW.tipo_movimiento='INGRESO' THEN
    IF NEW.cantidad_kg>origen.disponible THEN RAISE EXCEPTION 'Kilos insuficientes fuera de almacenamiento' USING ERRCODE='23514',CONSTRAINT='almacenamiento_saldo'; END IF;
  ELSE
    SELECT coalesce(sum(CASE WHEN tipo_movimiento='INGRESO' THEN cantidad_kg ELSE -cantidad_kg END),0) INTO saldo
      FROM movimientos_almacenamiento WHERE partida_produccion_id=NEW.partida_produccion_id AND camara_sector_id=NEW.camara_sector_id;
    IF NEW.cantidad_kg>saldo THEN RAISE EXCEPTION 'Kilos insuficientes en esta cámara y partida' USING ERRCODE='23514',CONSTRAINT='almacenamiento_saldo'; END IF;
  END IF;
  PERFORM validar_actores_poscosecha(NEW.responsable_id,NEW.registrado_por);
  RETURN NEW;
END $$;
CREATE FUNCTION validar_destino_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE origen record;
BEGIN
  SELECT * INTO origen FROM contexto_partida_almacenamiento(NEW.partida_produccion_id);
  IF origen.finca_id IS NULL OR NEW.cantidad_destinada_kg>origen.disponible THEN
    RAISE EXCEPTION 'El destino supera la producción disponible fuera de almacenamiento' USING ERRCODE='23514',CONSTRAINT='destino_saldo';
  END IF;
  IF NEW.fecha_destino<origen.fecha_clasificacion OR NEW.fecha_destino>(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN
    RAISE EXCEPTION 'Fecha de destino inválida' USING ERRCODE='23514',CONSTRAINT='poscosecha_fecha';
  END IF;
  PERFORM validar_actores_poscosecha(NEW.responsable_id,NEW.registrado_por);
  RETURN NEW;
END $$;
CREATE TRIGGER almacenamiento_validar BEFORE INSERT ON movimientos_almacenamiento FOR EACH ROW EXECUTE FUNCTION validar_movimiento_almacenamiento();
CREATE TRIGGER almacenamiento_inmutable BEFORE UPDATE OR DELETE ON movimientos_almacenamiento FOR EACH ROW EXECUTE FUNCTION proteger_hecho_poscosecha();
CREATE TRIGGER almacenamiento_no_truncate BEFORE TRUNCATE ON movimientos_almacenamiento FOR EACH STATEMENT EXECUTE FUNCTION proteger_hecho_poscosecha();
CREATE TRIGGER destinos_validar BEFORE INSERT ON destinos_produccion FOR EACH ROW EXECUTE FUNCTION validar_destino_produccion();
CREATE TRIGGER destinos_inmutables BEFORE UPDATE OR DELETE ON destinos_produccion FOR EACH ROW EXECUTE FUNCTION proteger_hecho_poscosecha();
CREATE TRIGGER destinos_no_truncate BEFORE TRUNCATE ON destinos_produccion FOR EACH STATEMENT EXECUTE FUNCTION proteger_hecho_poscosecha();
