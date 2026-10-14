CREATE OR REPLACE FUNCTION rechazar_mutacion_evento_trazabilidad()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'VIOLACION_DE_INMUTABILIDAD: Los eventos de trazabilidad en Agrul son legalmente inmutables y no admiten UPDATE ni DELETE.';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_bloquear_mutacion_eventos
BEFORE UPDATE OR DELETE ON eventos_trazabilidad
FOR EACH ROW EXECUTE FUNCTION rechazar_mutacion_evento_trazabilidad();
