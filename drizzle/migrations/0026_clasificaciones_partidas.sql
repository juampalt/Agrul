CREATE TABLE clasificaciones (
  id uuid PRIMARY KEY, cosecha_id uuid NOT NULL REFERENCES cosechas(id) ON DELETE RESTRICT,
  fecha_clasificacion date NOT NULL, cantidad_recibida_kg numeric(10,2) NOT NULL,
  kg_fresco numeric(10,2) NOT NULL, kg_industria numeric(10,2) NOT NULL, kg_descarte numeric(10,2) NOT NULL,
  motivos_descarte jsonb NOT NULL DEFAULT '[]',
  responsable_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  registrado_por uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT, solicitud jsonb NOT NULL,
  timestamp_captura_local timestamptz NOT NULL DEFAULT now(), creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clasificaciones_cantidades CHECK(cantidad_recibida_kg>0 AND kg_fresco>=0 AND kg_industria>=0 AND kg_descarte>=0),
  CONSTRAINT clasificaciones_balance CHECK(cantidad_recibida_kg=kg_fresco+kg_industria+kg_descarte)
);
CREATE INDEX idx_clasificaciones_cosecha_fecha ON clasificaciones(cosecha_id,fecha_clasificacion);
CREATE TABLE partidas_produccion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clasificacion_id uuid NOT NULL REFERENCES clasificaciones(id) ON DELETE RESTRICT,
  categoria text NOT NULL, cantidad_inicial_kg numeric(10,2) NOT NULL, cantidad_disponible_kg numeric(10,2) NOT NULL,
  CONSTRAINT partidas_produccion_categoria CHECK(categoria IN ('FRESCO','INDUSTRIA')),
  CONSTRAINT partidas_produccion_saldo CHECK(cantidad_inicial_kg>0 AND cantidad_disponible_kg>=0 AND cantidad_disponible_kg<=cantidad_inicial_kg)
);
CREATE UNIQUE INDEX partidas_produccion_clasificacion_categoria_unique ON partidas_produccion(clasificacion_id,categoria);
--> statement-breakpoint
CREATE FUNCTION proteger_hecho_poscosecha() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'VIOLACION_DE_INMUTABILIDAD: hecho de poscosecha protegido' USING ERRCODE='23514',CONSTRAINT='poscosecha_inmutable';
END $$;
CREATE FUNCTION validar_actores_poscosecha(responsable uuid,actor uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM 1 FROM usuarios WHERE id=responsable AND estado='ACTIVO' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Responsable inexistente o inactivo' USING ERRCODE='23514',CONSTRAINT='poscosecha_actor'; END IF;
  PERFORM 1 FROM usuarios WHERE id=actor AND estado='ACTIVO' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Actor inexistente o inactivo' USING ERRCODE='23514',CONSTRAINT='poscosecha_actor'; END IF;
END $$;
CREATE FUNCTION validar_clasificacion_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE origen record; clasificado numeric;
BEGIN
  SELECT * INTO origen FROM cosechas WHERE id=NEW.cosecha_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cosecha inexistente' USING ERRCODE='23503'; END IF;
  IF origen.solicitud IS NULL OR origen.estado<>'ACTIVA' OR origen.cantidad_comercializable_kg IS NOT NULL OR origen.cantidad_descarte_kg IS NOT NULL THEN
    RAISE EXCEPTION 'La cosecha histórica o anulada requiere conciliación, no clasificación automática' USING ERRCODE='23514',CONSTRAINT='clasificacion_origen';
  END IF;
  IF NEW.fecha_clasificacion<origen.fecha_efectiva OR NEW.fecha_clasificacion>(CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN
    RAISE EXCEPTION 'Fecha de clasificación inválida' USING ERRCODE='23514',CONSTRAINT='poscosecha_fecha';
  END IF;
  SELECT coalesce(sum(cantidad_recibida_kg),0) INTO clasificado FROM clasificaciones WHERE cosecha_id=NEW.cosecha_id;
  IF clasificado+NEW.cantidad_recibida_kg>origen.cantidad_cosechada_kg THEN
    RAISE EXCEPTION 'La clasificación supera los kg cosechados aún disponibles' USING ERRCODE='23514',CONSTRAINT='clasificacion_saldo';
  END IF;
  IF jsonb_typeof(NEW.motivos_descarte) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Los motivos deben ser una lista de causas' USING ERRCODE='23514',CONSTRAINT='clasificacion_descarte';
  END IF;
  IF (NEW.kg_descarte>0 AND jsonb_array_length(NEW.motivos_descarte)=0) OR EXISTS(
    SELECT 1 FROM jsonb_array_elements(NEW.motivos_descarte) causa
      WHERE jsonb_typeof(causa)<>'string' OR length(trim(causa#>>'{}'))=0) THEN
    RAISE EXCEPTION 'El descarte requiere causas no vacías' USING ERRCODE='23514',CONSTRAINT='clasificacion_descarte';
  END IF;
  PERFORM validar_actores_poscosecha(NEW.responsable_id,NEW.registrado_por);
  RETURN NEW;
END $$;
CREATE TRIGGER clasificaciones_validar BEFORE INSERT ON clasificaciones FOR EACH ROW EXECUTE FUNCTION validar_clasificacion_produccion();
CREATE TRIGGER clasificaciones_inmutables BEFORE UPDATE OR DELETE ON clasificaciones FOR EACH ROW EXECUTE FUNCTION proteger_hecho_poscosecha();
CREATE TRIGGER clasificaciones_no_truncate BEFORE TRUNCATE ON clasificaciones FOR EACH STATEMENT EXECUTE FUNCTION proteger_hecho_poscosecha();
--> statement-breakpoint
CREATE FUNCTION proteger_partida_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cantidad numeric;
BEGIN
  IF TG_OP<>'INSERT' OR pg_trigger_depth()<>2 THEN
    RAISE EXCEPTION 'Las partidas solo nacen de su clasificación y no se duplican ni alteran' USING ERRCODE='23514',CONSTRAINT='partida_produccion_protegida';
  END IF;
  SELECT CASE NEW.categoria WHEN 'FRESCO' THEN kg_fresco WHEN 'INDUSTRIA' THEN kg_industria ELSE 0 END
    INTO cantidad FROM clasificaciones WHERE id=NEW.clasificacion_id;
  IF cantidad IS NULL OR cantidad<=0 OR NEW.cantidad_inicial_kg<>cantidad OR NEW.cantidad_disponible_kg<>cantidad THEN
    RAISE EXCEPTION 'Partida incompatible con su clasificación' USING ERRCODE='23514',CONSTRAINT='partida_produccion_protegida';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER partidas_produccion_proteger BEFORE INSERT OR UPDATE OR DELETE ON partidas_produccion FOR EACH ROW EXECUTE FUNCTION proteger_partida_produccion();
CREATE TRIGGER partidas_produccion_no_truncate BEFORE TRUNCATE ON partidas_produccion FOR EACH STATEMENT EXECUTE FUNCTION proteger_partida_produccion();
CREATE FUNCTION confirmar_clasificacion_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE lote uuid; finca uuid;
BEGIN
  IF NEW.kg_fresco>0 THEN
    INSERT INTO partidas_produccion(clasificacion_id,categoria,cantidad_inicial_kg,cantidad_disponible_kg) VALUES(NEW.id,'FRESCO',NEW.kg_fresco,NEW.kg_fresco);
  END IF;
  IF NEW.kg_industria>0 THEN
    INSERT INTO partidas_produccion(clasificacion_id,categoria,cantidad_inicial_kg,cantidad_disponible_kg) VALUES(NEW.id,'INDUSTRIA',NEW.kg_industria,NEW.kg_industria);
  END IF;
  SELECT c.lote_id,l.finca_id INTO lote,finca FROM cosechas c JOIN lotes l ON l.id=c.lote_id WHERE c.id=NEW.cosecha_id;
  INSERT INTO eventos_trazabilidad(lote_id,actor_id,ubicacion_id,tipo_evento,timestamp_captura_local,timestamp_servidor,payload_especifico)
  VALUES(lote,NEW.registrado_por,finca,'CLASIFICACION',NEW.timestamp_captura_local,clock_timestamp(),
    jsonb_build_object('clasificacionId',NEW.id,'cosechaId',NEW.cosecha_id,'cantidadRecibidaKg',NEW.cantidad_recibida_kg,
      'kgFresco',NEW.kg_fresco,'kgIndustria',NEW.kg_industria,'kgDescarte',NEW.kg_descarte,'motivosDescarte',NEW.motivos_descarte,
      'partidas',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.categoria) FROM partidas_produccion p WHERE p.clasificacion_id=NEW.id),'[]'::jsonb)));
  RETURN NEW;
END $$;
CREATE TRIGGER clasificaciones_confirmar AFTER INSERT ON clasificaciones FOR EACH ROW EXECUTE FUNCTION confirmar_clasificacion_produccion();
