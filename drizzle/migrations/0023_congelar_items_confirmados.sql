-- Una aplicación queda confirmada al registrar su evento inmutable. Sus items
-- se construyen antes de ese evento, dentro de la transacción de registro.
CREATE FUNCTION proteger_items_aplicacion_confirmada() RETURNS trigger AS $$
BEGIN
  -- Comparte el bloqueo de cabecera con CU40, antes de bloquear insumos.
  PERFORM id FROM aplicaciones_insumo WHERE id=NEW.aplicacion_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM eventos_trazabilidad
      WHERE tipo_evento='APLICACION_INSUMOS' AND payload_especifico->>'aplicacionId'=NEW.aplicacion_id::text)
    OR EXISTS (SELECT 1 FROM correcciones_aplicaciones_insumo
      WHERE aplicacion_anterior_id=NEW.aplicacion_id) THEN
    RAISE EXCEPTION 'No se agregan consumos a una aplicación confirmada o sustituida.'
      USING ERRCODE='23514', CONSTRAINT='aplicacion_items_confirmados';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
-- El nombre ordena este control antes de trg_bloquear_insumo_aplicado.
CREATE TRIGGER trg_aplicacion_confirmada_items BEFORE INSERT ON aplicaciones_insumo_items
FOR EACH ROW EXECUTE FUNCTION proteger_items_aplicacion_confirmada();
