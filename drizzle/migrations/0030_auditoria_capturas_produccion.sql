-- Política conservadora, consistente con el ingreso offline existente:
-- capturas anteriores a la transacción de ingesta requieren auditoría.
-- No inventa una ventana temporal de negocio ni modifica eventos históricos.
CREATE FUNCTION marcar_captura_produccion_offline() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo_evento IN ('COSECHA','CLASIFICACION','ACONDICIONAMIENTO','ALMACENAMIENTO','DESTINO_PRODUCCION')
     AND NEW.timestamp_captura_local < transaction_timestamp() THEN
    NEW.estado_sincronizacion := 'PENDIENTE_AUDITORIA_OFFLINE';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_auditoria_captura_produccion
BEFORE INSERT ON eventos_trazabilidad
FOR EACH ROW EXECUTE FUNCTION marcar_captura_produccion_offline();
