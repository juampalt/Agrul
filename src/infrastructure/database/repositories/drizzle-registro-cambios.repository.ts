import { sql } from 'drizzle-orm';
import { CambioRegistrado, RegistroCambiosPort } from '../../../core/ports/registro-cambios.port.js';
import { AgrulDatabase } from '../connection.js';

/** Entidades auditables y su tabla; nunca se interpola texto de la solicitud en el SQL. */
const TABLAS: Record<string, string> = {
  FINCA: 'fincas', LOTE: 'lotes', CULTIVO: 'cultivos', VARIEDAD: 'variedades', PLANTACION: 'plantaciones',
  TIPO_ACTIVIDAD: 'tipos_actividad', CICLO_PRODUCTIVO: 'ciclos_productivos',
};

export class DrizzleRegistroCambiosRepository implements RegistroCambiosPort {
  constructor(private readonly db: AgrulDatabase) {}

  async capturar(entidad: string, id?: string) {
    const tabla = TABLAS[entidad];
    if (!tabla) return null;
    const consulta = id
      ? sql`SELECT t.id::text AS id, to_jsonb(t) AS valor FROM ${sql.identifier(tabla)} t WHERE t.id = ${id}::uuid`
      : sql`SELECT t.id::text AS id, to_jsonb(t) AS valor FROM ${sql.identifier(tabla)} t ORDER BY t.id LIMIT 1`;
    const { rows } = await this.db.execute<{ id: string; valor: unknown }>(consulta);
    return rows[0] ?? null;
  }

  async registrar(c: CambioRegistrado) {
    const json = (valor: unknown) => (valor === null ? null : JSON.stringify(valor));
    await this.db.execute(sql`INSERT INTO registro_cambios (entidad, entidad_id, accion, usuario_id, valor_previo, valor_nuevo)
      VALUES (${c.entidad}, ${c.entidadId}::uuid, ${c.accion}, ${c.usuarioId}::uuid, ${json(c.valorPrevio)}::jsonb, ${json(c.valorNuevo)}::jsonb)`);
  }
}
