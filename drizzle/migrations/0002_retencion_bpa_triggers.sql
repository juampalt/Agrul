CREATE OR REPLACE FUNCTION rechazar_delete_registros_productivos_bpa()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'VIOLACION_RETENCION_BPA: Los registros productivos en Agrul deben conservarse al menos 3 años según normativa BPA y no admiten DELETE físico (RNF-06 / RN-05). Utilice la anulación lógica auditada.';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DO $$
BEGIN
    IF to_regclass('public.cosechas') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_bloquear_delete_cosechas_bpa ON cosechas;
        CREATE TRIGGER trg_bloquear_delete_cosechas_bpa
        BEFORE DELETE ON cosechas
        FOR EACH ROW EXECUTE FUNCTION rechazar_delete_registros_productivos_bpa();
    END IF;
END;
$$;
--> statement-breakpoint
DO $$
BEGIN
    IF to_regclass('public.actividades_agricolas') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_bloquear_delete_actividades_bpa ON actividades_agricolas;
        CREATE TRIGGER trg_bloquear_delete_actividades_bpa
        BEFORE DELETE ON actividades_agricolas
        FOR EACH ROW EXECUTE FUNCTION rechazar_delete_registros_productivos_bpa();
    END IF;
END;
$$;
--> statement-breakpoint
DO $$
BEGIN
    IF to_regclass('public.stock_movimientos') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_bloquear_delete_stock_mov_bpa ON stock_movimientos;
        CREATE TRIGGER trg_bloquear_delete_stock_mov_bpa
        BEFORE DELETE ON stock_movimientos
        FOR EACH ROW EXECUTE FUNCTION rechazar_delete_registros_productivos_bpa();
    END IF;
END;
$$;
