CREATE FUNCTION saldo_exterior_produccion(partida uuid) RETURNS numeric LANGUAGE sql AS $$
  SELECT p.cantidad_inicial_kg
    -coalesce((SELECT sum(CASE WHEN m.tipo_movimiento='INGRESO' THEN m.cantidad_kg ELSE -m.cantidad_kg END) FROM movimientos_almacenamiento m WHERE m.partida_produccion_id=p.id),0)
    -coalesce((SELECT sum(d.cantidad_destinada_kg) FROM destinos_produccion d WHERE d.partida_produccion_id=p.id),0)
  FROM partidas_produccion p WHERE p.id=partida
$$;
CREATE OR REPLACE FUNCTION proteger_partida_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE cantidad numeric; esperado numeric;
BEGIN
  IF TG_OP='UPDATE' AND pg_trigger_depth()=2 THEN
    esperado := saldo_exterior_produccion(OLD.id);
    IF ROW(NEW.id,NEW.clasificacion_id,NEW.categoria,NEW.cantidad_inicial_kg) IS NOT DISTINCT FROM ROW(OLD.id,OLD.clasificacion_id,OLD.categoria,OLD.cantidad_inicial_kg)
      AND NEW.cantidad_disponible_kg=esperado AND esperado>=0 AND esperado<=OLD.cantidad_inicial_kg THEN RETURN NEW; END IF;
  ELSIF TG_OP='INSERT' AND pg_trigger_depth()=2 THEN
    SELECT CASE NEW.categoria WHEN 'FRESCO' THEN kg_fresco WHEN 'INDUSTRIA' THEN kg_industria ELSE 0 END
      INTO cantidad FROM clasificaciones WHERE id=NEW.clasificacion_id;
    IF cantidad>0 AND NEW.cantidad_inicial_kg=cantidad AND NEW.cantidad_disponible_kg=cantidad THEN RETURN NEW; END IF;
  END IF;
  RAISE EXCEPTION 'La partida conserva identidad y solo proyecta su bitácora inmutable' USING ERRCODE='23514',CONSTRAINT='partida_produccion_protegida';
END $$;
--> statement-breakpoint
CREATE FUNCTION verificar_saldos_temporales_produccion(partida uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE inicial numeric; minimo numeric;
BEGIN
  SELECT cantidad_inicial_kg INTO inicial FROM partidas_produccion WHERE id=partida;
  -- Las fechas tienen precisión de día. Ninguna operación retroactiva puede
  -- hacer negativo el saldo exterior ni el saldo de una cámara en otro día.
  SELECT min(inicial+acumulado) INTO minimo FROM (
    SELECT sum(delta) OVER(ORDER BY dia ROWS UNBOUNDED PRECEDING) AS acumulado FROM (
      SELECT dia,sum(delta) AS delta FROM (
        SELECT fecha_movimiento AS dia,CASE WHEN tipo_movimiento='INGRESO' THEN -cantidad_kg ELSE cantidad_kg END AS delta
          FROM movimientos_almacenamiento WHERE partida_produccion_id=partida
        UNION ALL SELECT fecha_destino,-cantidad_destinada_kg FROM destinos_produccion WHERE partida_produccion_id=partida
      ) movimientos GROUP BY dia
    ) dias
  ) saldos;
  IF minimo<0 THEN RAISE EXCEPTION 'La operación dejaría un saldo exterior histórico negativo' USING ERRCODE='23514',CONSTRAINT='produccion_saldo_temporal'; END IF;
  SELECT min(acumulado) INTO minimo FROM (
    SELECT sum(delta) OVER(PARTITION BY camara_sector_id ORDER BY dia ROWS UNBOUNDED PRECEDING) AS acumulado FROM (
      SELECT camara_sector_id,fecha_movimiento AS dia,sum(CASE WHEN tipo_movimiento='INGRESO' THEN cantidad_kg ELSE -cantidad_kg END) AS delta
        FROM movimientos_almacenamiento WHERE partida_produccion_id=partida GROUP BY camara_sector_id,fecha_movimiento
    ) dias
  ) saldos;
  IF minimo<0 THEN RAISE EXCEPTION 'La operación dejaría un saldo histórico negativo en una cámara' USING ERRCODE='23514',CONSTRAINT='produccion_saldo_temporal'; END IF;
END $$;
CREATE FUNCTION confirmar_movimiento_almacenamiento() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE origen record;
BEGIN
  PERFORM verificar_saldos_temporales_produccion(NEW.partida_produccion_id);
  UPDATE partidas_produccion SET cantidad_disponible_kg=saldo_exterior_produccion(id) WHERE id=NEW.partida_produccion_id;
  SELECT * INTO origen FROM contexto_partida_almacenamiento(NEW.partida_produccion_id);
  INSERT INTO eventos_trazabilidad(lote_id,actor_id,ubicacion_id,tipo_evento,timestamp_captura_local,timestamp_servidor,payload_especifico)
  VALUES(origen.lote_id,NEW.registrado_por,origen.finca_id,'ALMACENAMIENTO',NEW.timestamp_captura_local,clock_timestamp(),
    jsonb_build_object('movimientoAlmacenamientoId',NEW.id,'partidaProduccionId',NEW.partida_produccion_id,'camaraSectorId',NEW.camara_sector_id,
      'clasificacionId',origen.clasificacion_id,'cosechaId',origen.cosecha_id,'tipoMovimiento',NEW.tipo_movimiento,'cantidadKg',NEW.cantidad_kg,'unidadMedida','kg'));
  RETURN NEW;
END $$;
CREATE FUNCTION confirmar_destino_produccion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE origen record;
BEGIN
  PERFORM verificar_saldos_temporales_produccion(NEW.partida_produccion_id);
  UPDATE partidas_produccion SET cantidad_disponible_kg=saldo_exterior_produccion(id) WHERE id=NEW.partida_produccion_id;
  SELECT * INTO origen FROM contexto_partida_almacenamiento(NEW.partida_produccion_id);
  INSERT INTO eventos_trazabilidad(lote_id,actor_id,ubicacion_id,tipo_evento,timestamp_captura_local,timestamp_servidor,payload_especifico)
  VALUES(origen.lote_id,NEW.registrado_por,origen.finca_id,'DESTINO_PRODUCCION',NEW.timestamp_captura_local,clock_timestamp(),
    jsonb_build_object('destinoProduccionId',NEW.id,'partidaProduccionId',NEW.partida_produccion_id,'clasificacionId',origen.clasificacion_id,
      'cosechaId',origen.cosecha_id,'tipoDestino',NEW.tipo_destino,'destinoEspecifico',NEW.destino_especifico,'cantidadDestinadaKg',NEW.cantidad_destinada_kg,'unidadMedida','kg'));
  RETURN NEW;
END $$;
CREATE TRIGGER almacenamiento_confirmar AFTER INSERT ON movimientos_almacenamiento FOR EACH ROW EXECUTE FUNCTION confirmar_movimiento_almacenamiento();
CREATE TRIGGER destinos_confirmar AFTER INSERT ON destinos_produccion FOR EACH ROW EXECUTE FUNCTION confirmar_destino_produccion();
