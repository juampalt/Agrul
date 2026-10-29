-- Las columnas nuevas permanecen nulas para hechos históricos: no se inventan
-- solicitudes, movimientos ni fechas de registro anteriores.
ALTER TABLE aplicaciones_insumo ADD COLUMN solicitud jsonb;
--> statement-breakpoint
ALTER TABLE aplicaciones_insumo ADD COLUMN registrado_en timestamptz;
--> statement-breakpoint
ALTER TABLE movimientos_inventario ADD COLUMN aplicacion_item_id uuid UNIQUE REFERENCES aplicaciones_insumo_items(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE movimientos_inventario ADD CONSTRAINT egreso_aplicacion_requiere_item
CHECK (tipo_movimiento <> 'EGRESO_APLICACION' OR aplicacion_item_id IS NOT NULL) NOT VALID;
--> statement-breakpoint
CREATE FUNCTION validar_egreso_aplicacion() RETURNS trigger AS $$
BEGIN
  IF NEW.tipo_movimiento='EGRESO_APLICACION' AND NOT EXISTS (
    SELECT 1 FROM aplicaciones_insumo_items item JOIN aplicaciones_insumo app ON app.id=item.aplicacion_id
      JOIN actividades_realizadas labor ON labor.id=app.actividad_realizada_id JOIN lotes lote ON lote.id=labor.lote_id
    WHERE item.id=NEW.aplicacion_item_id AND item.partida_insumo_id=NEW.partida_id AND item.insumo_id=NEW.insumo_id
      AND item.cantidad_aplicada=NEW.cantidad AND lote.finca_id=NEW.finca_id AND app.responsable_id=NEW.responsable_id
  ) THEN
    RAISE EXCEPTION 'El egreso debe corresponder al item de aplicación.' USING ERRCODE='23514', CONSTRAINT='egreso_aplicacion_incompatible';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_validar_egreso_aplicacion BEFORE INSERT ON movimientos_inventario
FOR EACH ROW EXECUTE FUNCTION validar_egreso_aplicacion();
--> statement-breakpoint
CREATE FUNCTION consumir_item_aplicacion() RETURNS trigger AS $$
DECLARE origen record;
BEGIN
  SELECT app.responsable_id,app.motivo_aplicacion,labor.fecha_ejecucion,lote.finca_id,
    partida.finca_id AS finca_partida,partida.fecha_vencimiento,partida.unidad_medida,partida.insumo_id,insumo.estado
  INTO origen FROM aplicaciones_insumo app
    JOIN actividades_realizadas labor ON labor.id=app.actividad_realizada_id
    JOIN lotes lote ON lote.id=labor.lote_id
    JOIN partidas_insumo partida ON partida.id=NEW.partida_insumo_id
    JOIN insumos insumo ON insumo.id=NEW.insumo_id
  WHERE app.id=NEW.aplicacion_id;
  IF NOT FOUND OR origen.finca_id IS NULL OR origen.finca_id IS DISTINCT FROM origen.finca_partida OR
    origen.insumo_id <> NEW.insumo_id OR origen.estado <> 'ACTIVO' OR
    origen.fecha_vencimiento < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date THEN
    RAISE EXCEPTION 'Partida vencida, inactiva o ajena a la finca de la labor.' USING ERRCODE='23514', CONSTRAINT='aplicacion_partida_invalida';
  END IF;
  INSERT INTO movimientos_inventario(id,insumo_id,finca_id,partida_id,tipo_movimiento,cantidad,unidad_medida,
    fecha_movimiento,motivo,responsable_id,solicitud,aplicacion_item_id)
  VALUES(NEW.id,NEW.insumo_id,origen.finca_id,NEW.partida_insumo_id,'EGRESO_APLICACION',NEW.cantidad_aplicada,
    origen.unidad_medida,origen.fecha_ejecucion,origen.motivo_aplicacion,origen.responsable_id,
    jsonb_build_object('aplicacionId',NEW.aplicacion_id,'itemId',NEW.id),NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_consumir_item_aplicacion AFTER INSERT ON aplicaciones_insumo_items
FOR EACH ROW EXECUTE FUNCTION consumir_item_aplicacion();
--> statement-breakpoint
CREATE TRIGGER trg_no_truncar_aplicaciones BEFORE TRUNCATE ON aplicaciones_insumo
FOR EACH STATEMENT EXECUTE FUNCTION rechazar_mutacion_evento_trazabilidad();
--> statement-breakpoint
CREATE TRIGGER trg_no_truncar_items_aplicaciones BEFORE TRUNCATE ON aplicaciones_insumo_items
FOR EACH STATEMENT EXECUTE FUNCTION rechazar_mutacion_evento_trazabilidad();
