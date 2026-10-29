-- Catálogo canónico. No reemplaza ni borra las estructuras históricas.
CREATE TABLE insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(15) NOT NULL CONSTRAINT insumos_codigo_unique UNIQUE,
  nombre varchar(200) NOT NULL,
  categoria varchar(20) NOT NULL,
  tipo_producto varchar(150),
  unidad_medida varchar(30) NOT NULL,
  fabricante_marca varchar(150),
  nivel_minimo numeric(10,2) NOT NULL,
  estado varchar(8) NOT NULL DEFAULT 'ACTIVO',
  CONSTRAINT insumos_textos_validos CHECK (
    codigo = btrim(codigo) AND length(codigo) > 0 AND
    nombre = btrim(nombre) AND length(nombre) > 0 AND
    unidad_medida = btrim(unidad_medida) AND length(unidad_medida) > 0 AND
    (tipo_producto IS NULL OR (tipo_producto = btrim(tipo_producto) AND length(tipo_producto) > 0)) AND
    (fabricante_marca IS NULL OR (fabricante_marca = btrim(fabricante_marca) AND length(fabricante_marca) > 0))
  ),
  CONSTRAINT insumos_categoria_valida CHECK (categoria IN ('FERTILIZANTE','FITOSANITARIO','ENMIENDA','OTRO')),
  CONSTRAINT insumos_estado_valido CHECK (estado IN ('ACTIVO','INACTIVO')),
  CONSTRAINT insumos_minimo_valido CHECK (nivel_minimo >= 0 AND nivel_minimo <> 'NaN'::numeric)
);
--> statement-breakpoint
CREATE INDEX idx_insumos_estado_categoria_codigo ON insumos(estado,categoria,codigo);
--> statement-breakpoint
-- Estructuras de referencia para RN-15. No se habilita aún el registro HTTP
-- de partidas ni aplicaciones: se implementará en sus bloques funcionales.
CREATE TABLE partidas_insumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  fecha_ingreso date NOT NULL,
  cantidad_inicial numeric(10,2) NOT NULL CHECK (cantidad_inicial > 0 AND cantidad_inicial <> 'NaN'::numeric),
  cantidad_disponible numeric(10,2) NOT NULL CHECK (cantidad_disponible >= 0 AND cantidad_disponible <> 'NaN'::numeric),
  proveedor text NOT NULL,
  fecha_vencimiento date,
  UNIQUE(id, insumo_id)
);
--> statement-breakpoint
CREATE INDEX idx_partidas_insumo_vencimiento ON partidas_insumo(insumo_id,fecha_vencimiento,fecha_ingreso,id);
--> statement-breakpoint
CREATE TABLE aplicaciones_insumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actividad_realizada_id uuid NOT NULL REFERENCES actividades_realizadas(id) ON DELETE RESTRICT,
  superficie_tratada numeric(8,2) NOT NULL CHECK (superficie_tratada > 0 AND superficie_tratada <> 'NaN'::numeric),
  metodo_aplicacion text NOT NULL,
  motivo_aplicacion text NOT NULL,
  responsable_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  observaciones text
);
--> statement-breakpoint
CREATE INDEX idx_aplicaciones_insumo_actividad ON aplicaciones_insumo(actividad_realizada_id);
--> statement-breakpoint
CREATE TABLE aplicaciones_insumo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aplicacion_id uuid NOT NULL REFERENCES aplicaciones_insumo(id) ON DELETE RESTRICT,
  insumo_id uuid NOT NULL REFERENCES insumos(id) ON DELETE RESTRICT,
  partida_insumo_id uuid NOT NULL,
  cantidad_aplicada numeric(10,2) NOT NULL CHECK (cantidad_aplicada > 0 AND cantidad_aplicada <> 'NaN'::numeric),
  dosis numeric(8,2) NOT NULL CHECK (dosis > 0 AND dosis <> 'NaN'::numeric),
  FOREIGN KEY(partida_insumo_id,insumo_id) REFERENCES partidas_insumo(id,insumo_id) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX idx_aplicaciones_items_insumo ON aplicaciones_insumo_items(insumo_id);
--> statement-breakpoint
CREATE INDEX idx_aplicaciones_items_aplicacion ON aplicaciones_insumo_items(aplicacion_id);
--> statement-breakpoint
-- Serializa aplicaciones y cambios de unidad sobre la misma fila del insumo.
CREATE FUNCTION bloquear_insumo_aplicado() RETURNS trigger AS $$
BEGIN
  PERFORM id FROM insumos WHERE id = NEW.insumo_id FOR UPDATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_bloquear_insumo_aplicado BEFORE INSERT ON aplicaciones_insumo_items
FOR EACH ROW EXECUTE FUNCTION bloquear_insumo_aplicado();
--> statement-breakpoint
CREATE FUNCTION proteger_unidad_insumo() RETURNS trigger AS $$
BEGIN
  IF NEW.unidad_medida IS DISTINCT FROM OLD.unidad_medida AND
    EXISTS(SELECT 1 FROM aplicaciones_insumo_items WHERE insumo_id = OLD.id) THEN
    RAISE EXCEPTION 'UNIDAD_INSUMO_INMUTABLE' USING ERRCODE = '23514', CONSTRAINT = 'insumos_unidad_inmutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_proteger_unidad_insumo BEFORE UPDATE ON insumos
FOR EACH ROW EXECUTE FUNCTION proteger_unidad_insumo();
--> statement-breakpoint
CREATE TRIGGER trg_historial_aplicaciones_insumo BEFORE UPDATE OR DELETE ON aplicaciones_insumo
FOR EACH ROW EXECUTE FUNCTION rechazar_mutacion_evento_trazabilidad();
--> statement-breakpoint
CREATE TRIGGER trg_historial_aplicaciones_items BEFORE UPDATE OR DELETE ON aplicaciones_insumo_items
FOR EACH ROW EXECUTE FUNCTION rechazar_mutacion_evento_trazabilidad();
