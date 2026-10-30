-- Definición confirmada por el usuario: DEVOLUCION suma insumos sin usar a
-- la partida de origen; no representa una devolución a un proveedor.
CREATE OR REPLACE FUNCTION aplicar_movimiento_inventario() RETURNS trigger AS $$
DECLARE partida partidas_insumo%ROWTYPE; cambio numeric; unidad_actual text;
BEGIN
  SELECT unidad_medida INTO unidad_actual FROM insumos WHERE id=NEW.insumo_id FOR UPDATE;
  SELECT * INTO partida FROM partidas_insumo WHERE id=NEW.partida_id FOR UPDATE;
  IF NOT FOUND OR partida.insumo_id <> NEW.insumo_id OR partida.finca_id IS DISTINCT FROM NEW.finca_id OR
    partida.unidad_medida IS DISTINCT FROM NEW.unidad_medida OR unidad_actual IS DISTINCT FROM NEW.unidad_medida THEN
    RAISE EXCEPTION 'Partida, finca o unidad incompatibles.' USING ERRCODE='23514', CONSTRAINT='inventario_referencia_invalida';
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
CREATE TRIGGER trg_no_borrar_partidas_inventario BEFORE DELETE ON partidas_insumo
FOR EACH ROW EXECUTE FUNCTION rechazar_mutacion_evento_trazabilidad();
