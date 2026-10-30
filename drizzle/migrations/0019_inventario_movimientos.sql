-- Sin atribuir una finca ni una unidad a partidas históricas desconocidas.
ALTER TABLE partidas_insumo ADD COLUMN finca_id uuid REFERENCES fincas(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE partidas_insumo ADD COLUMN unidad_medida varchar(30);
--> statement-breakpoint
ALTER TABLE partidas_insumo ADD CONSTRAINT partidas_finca_obligatoria CHECK (finca_id IS NOT NULL) NOT VALID;
--> statement-breakpoint
ALTER TABLE partidas_insumo ADD CONSTRAINT partidas_unidad_obligatoria CHECK (unidad_medida IS NOT NULL AND length(btrim(unidad_medida)) > 0) NOT VALID;
--> statement-breakpoint
ALTER TABLE partidas_insumo ADD CONSTRAINT partidas_id_insumo_finca_unique UNIQUE(id,insumo_id,finca_id);
--> statement-breakpoint
CREATE INDEX idx_partidas_finca_insumo ON partidas_insumo(finca_id,insumo_id);
--> statement-breakpoint
CREATE TABLE movimientos_inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  finca_id uuid NOT NULL REFERENCES fincas(id) ON DELETE RESTRICT,
  partida_id uuid,
  tipo_movimiento varchar(30) NOT NULL CHECK (tipo_movimiento IN ('INGRESO','EXISTENCIA_INICIAL','AJUSTE_POSITIVO','AJUSTE_NEGATIVO','DEVOLUCION','PERDIDA','EGRESO_APLICACION','REGULARIZACION_CORRECCION')),
  cantidad numeric(10,2) NOT NULL CHECK (cantidad <> 0 AND cantidad <> 'NaN'::numeric AND (cantidad > 0 OR tipo_movimiento='REGULARIZACION_CORRECCION')),
  unidad_medida varchar(30) NOT NULL CHECK (length(btrim(unidad_medida)) > 0),
  fecha_movimiento date NOT NULL,
  motivo text NOT NULL CHECK (length(btrim(motivo)) > 0),
  responsable_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  solicitud jsonb NOT NULL,
  FOREIGN KEY(partida_id,insumo_id,finca_id) REFERENCES partidas_insumo(id,insumo_id,finca_id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX idx_movimientos_inventario_finca_fecha ON movimientos_inventario(finca_id,fecha_movimiento,id);
--> statement-breakpoint
CREATE INDEX idx_movimientos_inventario_partida ON movimientos_inventario(partida_id);
--> statement-breakpoint
CREATE FUNCTION proteger_partida_inventario() RETURNS trigger AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.cantidad_disponible <> 0 THEN
      RAISE EXCEPTION 'El saldo inicial se registra mediante un movimiento.' USING ERRCODE='23514', CONSTRAINT='partidas_saldo_solo_movimientos';
    END IF;
  ELSE
    IF ROW(NEW.insumo_id,NEW.finca_id,NEW.unidad_medida,NEW.cantidad_inicial,NEW.fecha_ingreso,NEW.fecha_vencimiento,NEW.proveedor)
      IS DISTINCT FROM ROW(OLD.insumo_id,OLD.finca_id,OLD.unidad_medida,OLD.cantidad_inicial,OLD.fecha_ingreso,OLD.fecha_vencimiento,OLD.proveedor) OR
      (NEW.cantidad_disponible IS DISTINCT FROM OLD.cantidad_disponible AND pg_trigger_depth() < 2) THEN
      RAISE EXCEPTION 'La partida conserva su origen y el saldo solo cambia con movimientos.' USING ERRCODE='23514', CONSTRAINT='partidas_saldo_solo_movimientos';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_proteger_partida_inventario BEFORE INSERT OR UPDATE ON partidas_insumo
FOR EACH ROW EXECUTE FUNCTION proteger_partida_inventario();
--> statement-breakpoint
CREATE FUNCTION aplicar_movimiento_inventario() RETURNS trigger AS $$
DECLARE partida partidas_insumo%ROWTYPE; cambio numeric; unidad_actual text;
BEGIN
  SELECT unidad_medida INTO unidad_actual FROM insumos WHERE id=NEW.insumo_id FOR UPDATE;
  SELECT * INTO partida FROM partidas_insumo WHERE id=NEW.partida_id FOR UPDATE;
  IF NOT FOUND OR partida.insumo_id <> NEW.insumo_id OR partida.finca_id IS DISTINCT FROM NEW.finca_id OR
    partida.unidad_medida IS DISTINCT FROM NEW.unidad_medida OR unidad_actual IS DISTINCT FROM NEW.unidad_medida THEN
    RAISE EXCEPTION 'Partida, finca o unidad incompatibles.' USING ERRCODE='23514', CONSTRAINT='inventario_referencia_invalida';
  END IF;
  IF NEW.tipo_movimiento='DEVOLUCION' THEN
    RAISE EXCEPTION 'Devolución pendiente de definición.' USING ERRCODE='23514', CONSTRAINT='inventario_tipo_no_habilitado';
  END IF;
  cambio := CASE WHEN NEW.tipo_movimiento IN ('AJUSTE_NEGATIVO','PERDIDA','EGRESO_APLICACION') THEN -NEW.cantidad ELSE NEW.cantidad END;
  IF partida.cantidad_disponible + cambio < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente: no se admiten saldos negativos.' USING ERRCODE='23514', CONSTRAINT='inventario_stock_insuficiente';
  END IF;
  UPDATE partidas_insumo SET cantidad_disponible=cantidad_disponible+cambio WHERE id=NEW.partida_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_aplicar_movimiento_inventario BEFORE INSERT ON movimientos_inventario
FOR EACH ROW EXECUTE FUNCTION aplicar_movimiento_inventario();
--> statement-breakpoint
CREATE TRIGGER trg_historial_movimientos_inventario BEFORE UPDATE OR DELETE ON movimientos_inventario
FOR EACH ROW EXECUTE FUNCTION rechazar_mutacion_evento_trazabilidad();
--> statement-breakpoint
CREATE TRIGGER trg_no_truncar_movimientos_inventario BEFORE TRUNCATE ON movimientos_inventario
FOR EACH STATEMENT EXECUTE FUNCTION rechazar_mutacion_evento_trazabilidad();
