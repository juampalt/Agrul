CREATE TABLE acondicionamientos (
  id uuid PRIMARY KEY, partida_produccion_id uuid NOT NULL REFERENCES partidas_produccion(id) ON DELETE RESTRICT,
  fecha_acondicionamiento date NOT NULL, tipo_acondicionamiento text NOT NULL, tipo_envase text NOT NULL,
  cantidad_kg numeric(10,2) NOT NULL, cantidad_envases integer NOT NULL,
  responsable_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  registrado_por uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT, solicitud jsonb NOT NULL,
  timestamp_captura_local timestamptz NOT NULL DEFAULT now(), creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT acondicionamientos_cantidad CHECK(cantidad_kg>0 AND cantidad_envases>0),
  CONSTRAINT acondicionamientos_descripcion CHECK(length(trim(tipo_acondicionamiento))>0 AND length(trim(tipo_envase))>0)
);
CREATE INDEX idx_acondicionamientos_partida_fecha ON acondicionamientos(partida_produccion_id,fecha_acondicionamiento);
--> statement-breakpoint
CREATE FUNCTION validar_acondicionamiento_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE partida record; acondicionado numeric;
BEGIN
  SELECT p.*,c.fecha_clasificacion INTO partida FROM partidas_produccion p
    JOIN clasificaciones c ON c.id=p.clasificacion_id WHERE p.id=NEW.partida_produccion_id FOR UPDATE OF p;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partida aprovechable inexistente' USING ERRCODE='23503'; END IF;
  IF NEW.fecha_acondicionamiento<partida.fecha_clasificacion OR NEW.fecha_acondicionamiento>(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN
    RAISE EXCEPTION 'Fecha de acondicionamiento inválida' USING ERRCODE='23514',CONSTRAINT='poscosecha_fecha';
  END IF;
  SELECT coalesce(sum(cantidad_kg),0) INTO acondicionado FROM acondicionamientos WHERE partida_produccion_id=NEW.partida_produccion_id;
  IF acondicionado+NEW.cantidad_kg>partida.cantidad_inicial_kg OR NEW.cantidad_kg>partida.cantidad_disponible_kg THEN
    RAISE EXCEPTION 'El acondicionamiento supera los kg aún no acondicionados o disponibles' USING ERRCODE='23514',CONSTRAINT='acondicionamiento_saldo';
  END IF;
  PERFORM validar_actores_poscosecha(NEW.responsable_id,NEW.registrado_por);
  RETURN NEW;
END $$;
CREATE TRIGGER acondicionamientos_validar BEFORE INSERT ON acondicionamientos FOR EACH ROW EXECUTE FUNCTION validar_acondicionamiento_produccion();
CREATE TRIGGER acondicionamientos_inmutables BEFORE UPDATE OR DELETE ON acondicionamientos FOR EACH ROW EXECUTE FUNCTION proteger_hecho_poscosecha();
CREATE TRIGGER acondicionamientos_no_truncate BEFORE TRUNCATE ON acondicionamientos FOR EACH STATEMENT EXECUTE FUNCTION proteger_hecho_poscosecha();
CREATE FUNCTION confirmar_acondicionamiento_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE referencia record;
BEGIN
  SELECT p.clasificacion_id,c.cosecha_id,h.lote_id,l.finca_id INTO referencia FROM partidas_produccion p
    JOIN clasificaciones c ON c.id=p.clasificacion_id JOIN cosechas h ON h.id=c.cosecha_id
    JOIN lotes l ON l.id=h.lote_id WHERE p.id=NEW.partida_produccion_id;
  INSERT INTO eventos_trazabilidad(lote_id,actor_id,ubicacion_id,tipo_evento,timestamp_captura_local,timestamp_servidor,payload_especifico)
  VALUES(referencia.lote_id,NEW.registrado_por,referencia.finca_id,'ACONDICIONAMIENTO',NEW.timestamp_captura_local,clock_timestamp(),
    jsonb_build_object('acondicionamientoId',NEW.id,'partidaProduccionId',NEW.partida_produccion_id,
      'clasificacionId',referencia.clasificacion_id,'cosechaId',referencia.cosecha_id,'cantidadKg',NEW.cantidad_kg,
      'cantidadEnvases',NEW.cantidad_envases,'tipoEnvase',NEW.tipo_envase,'tipoAcondicionamiento',NEW.tipo_acondicionamiento));
  -- El empaque no crea ni elimina masa física. Su consumo de capacidad de
  -- acondicionamiento se deriva de la bitácora, separada del saldo físico.
  RETURN NEW;
END $$;
CREATE TRIGGER acondicionamientos_confirmar AFTER INSERT ON acondicionamientos FOR EACH ROW EXECUTE FUNCTION confirmar_acondicionamiento_produccion();
