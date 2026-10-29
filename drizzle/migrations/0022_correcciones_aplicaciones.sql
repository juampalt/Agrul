CREATE TABLE correcciones_aplicaciones_insumo (
  id uuid PRIMARY KEY,
  aplicacion_anterior_id uuid NOT NULL UNIQUE REFERENCES aplicaciones_insumo(id) ON DELETE RESTRICT,
  aplicacion_nueva_id uuid NOT NULL UNIQUE REFERENCES aplicaciones_insumo(id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
  evento_original_id uuid NOT NULL REFERENCES eventos_trazabilidad(id) ON DELETE RESTRICT,
  motivo text NOT NULL CHECK(length(btrim(motivo)) > 0),
  responsable_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  registrado_en timestamptz NOT NULL DEFAULT now(),
  solicitud jsonb NOT NULL,
  CHECK(aplicacion_anterior_id <> aplicacion_nueva_id)
);
--> statement-breakpoint
ALTER TABLE movimientos_inventario ADD COLUMN correccion_id uuid REFERENCES correcciones_aplicaciones_insumo(id) ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE movimientos_inventario ADD COLUMN movimiento_compensado_id uuid UNIQUE REFERENCES movimientos_inventario(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE INDEX idx_movimientos_correccion ON movimientos_inventario(correccion_id);
--> statement-breakpoint
ALTER TABLE movimientos_inventario ADD CONSTRAINT regularizacion_requiere_origen
CHECK (tipo_movimiento <> 'REGULARIZACION_CORRECCION' OR (correccion_id IS NOT NULL AND movimiento_compensado_id IS NOT NULL)) NOT VALID;
--> statement-breakpoint
CREATE FUNCTION validar_regularizacion_correccion() RETURNS trigger AS $$
BEGIN
  IF NEW.tipo_movimiento='REGULARIZACION_CORRECCION' THEN
    IF NOT EXISTS (
      SELECT 1 FROM movimientos_inventario origen
        JOIN aplicaciones_insumo_items item ON item.id=origen.aplicacion_item_id
        JOIN correcciones_aplicaciones_insumo c ON c.aplicacion_anterior_id=item.aplicacion_id
      WHERE origen.id=NEW.movimiento_compensado_id AND origen.tipo_movimiento='EGRESO_APLICACION'
        AND c.id=NEW.correccion_id AND origen.cantidad=NEW.cantidad AND origen.partida_id=NEW.partida_id
        AND origen.insumo_id=NEW.insumo_id AND origen.finca_id=NEW.finca_id AND origen.unidad_medida=NEW.unidad_medida
        AND c.responsable_id=NEW.responsable_id AND NEW.aplicacion_item_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Regularización sin procedencia exacta.' USING ERRCODE='23514', CONSTRAINT='regularizacion_incompatible';
    END IF;
  ELSIF NEW.correccion_id IS NOT NULL OR NEW.movimiento_compensado_id IS NOT NULL THEN
    RAISE EXCEPTION 'Referencias de compensación fuera de una regularización.' USING ERRCODE='23514', CONSTRAINT='regularizacion_incompatible';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_validar_regularizacion BEFORE INSERT ON movimientos_inventario
FOR EACH ROW EXECUTE FUNCTION validar_regularizacion_correccion();
--> statement-breakpoint
-- Toda operación de una corrección se agrega con fecha actual: no reescribe la
-- cronología de consumos posteriores ni vuelve a fecharlos en la labor original.
CREATE FUNCTION fechar_movimiento_correccion() RETURNS trigger AS $$
BEGIN
  IF NEW.tipo_movimiento='REGULARIZACION_CORRECCION' OR
    (NEW.tipo_movimiento='EGRESO_APLICACION' AND EXISTS (
      SELECT 1 FROM aplicaciones_insumo_items item JOIN correcciones_aplicaciones_insumo c ON c.aplicacion_nueva_id=item.aplicacion_id
      WHERE item.id=NEW.aplicacion_item_id
    )) THEN
    NEW.fecha_movimiento := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_fechar_movimiento_correccion BEFORE INSERT ON movimientos_inventario
FOR EACH ROW EXECUTE FUNCTION fechar_movimiento_correccion();
--> statement-breakpoint
CREATE FUNCTION validar_version_correccion() RETURNS trigger AS $$
BEGIN
  PERFORM id FROM aplicaciones_insumo WHERE id=NEW.aplicacion_anterior_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM correcciones_aplicaciones_insumo WHERE aplicacion_anterior_id=NEW.aplicacion_nueva_id) THEN
    RAISE EXCEPTION 'La versión reemplazante ya fue sustituida.' USING ERRCODE='23514', CONSTRAINT='correccion_version_invalida';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_validar_version_correccion BEFORE INSERT ON correcciones_aplicaciones_insumo
FOR EACH ROW EXECUTE FUNCTION validar_version_correccion();
--> statement-breakpoint
CREATE TRIGGER trg_historial_correcciones BEFORE UPDATE OR DELETE ON correcciones_aplicaciones_insumo
FOR EACH ROW EXECUTE FUNCTION rechazar_mutacion_evento_trazabilidad();
--> statement-breakpoint
CREATE TRIGGER trg_no_truncar_correcciones BEFORE TRUNCATE ON correcciones_aplicaciones_insumo
FOR EACH STATEMENT EXECUTE FUNCTION rechazar_mutacion_evento_trazabilidad();
--> statement-breakpoint
-- El commit tampoco admite correcciones parciales creadas mediante SQL directo.
CREATE FUNCTION verificar_correccion_completa() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM aplicaciones_insumo WHERE id=NEW.aplicacion_nueva_id AND responsable_id=NEW.responsable_id
      AND solicitud IS NOT NULL AND registrado_en >= NEW.registrado_en) OR
    NOT EXISTS (SELECT 1 FROM aplicaciones_insumo_items WHERE aplicacion_id=NEW.aplicacion_anterior_id) OR
    NOT EXISTS (SELECT 1 FROM aplicaciones_insumo_items WHERE aplicacion_id=NEW.aplicacion_nueva_id) OR
    EXISTS (SELECT 1 FROM aplicaciones_insumo_items item LEFT JOIN movimientos_inventario origen ON origen.aplicacion_item_id=item.id
      WHERE item.aplicacion_id=NEW.aplicacion_anterior_id AND (origen.id IS NULL OR NOT EXISTS (
        SELECT 1 FROM movimientos_inventario regularizacion WHERE regularizacion.movimiento_compensado_id=origen.id
          AND regularizacion.correccion_id=NEW.id AND regularizacion.tipo_movimiento='REGULARIZACION_CORRECCION'
      ))) OR
    NOT EXISTS (SELECT 1 FROM eventos_trazabilidad WHERE id=NEW.evento_original_id AND tipo_evento='APLICACION_INSUMOS'
      AND payload_especifico->>'aplicacionId'=NEW.aplicacion_anterior_id::text) OR
    NOT EXISTS (SELECT 1 FROM eventos_trazabilidad WHERE tipo_evento='CORRECCION' AND evento_referenciado_id=NEW.evento_original_id
      AND payload_especifico->>'correccionId'=NEW.id::text AND payload_especifico->>'aplicacionNuevaId'=NEW.aplicacion_nueva_id::text)
  THEN
    RAISE EXCEPTION 'La corrección debe confirmar restitución, nueva versión y auditoría juntas.' USING ERRCODE='23514', CONSTRAINT='correccion_incompleta';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trg_correccion_completa AFTER INSERT ON correcciones_aplicaciones_insumo
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION verificar_correccion_completa();
