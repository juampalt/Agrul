import type { Pool } from 'pg';

/** Limpieza privilegiada de fixtures; nunca se usa desde el servidor ni admite bases productivas. */
export async function limpiarUsuariosSeguridad(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('select current_database() as nombre');
    const permitidas = [1, 2, 3, 4].map(etapa => `agrul_test_agrul_053_etapa${etapa}`);
    if (!permitidas.includes(rows[0].nombre)) throw new Error('Limpieza permitida solo en las bases descartables de seguridad.');
    await client.query('BEGIN');
    try {
      // Se restablecen los triggers dentro de la misma transacción antes de devolver la conexión.
      await client.query('ALTER TABLE auditoria_seguridad_log DISABLE TRIGGER USER');
      await client.query('ALTER TABLE registro_modificaciones DISABLE TRIGGER USER');
      await client.query('DELETE FROM registro_modificaciones');
      await client.query('DELETE FROM auditoria_seguridad_log');
      await client.query('DELETE FROM usuario_finca_asignacion');
      await client.query('DELETE FROM usuarios');
      await client.query('ALTER TABLE auditoria_seguridad_log ENABLE TRIGGER USER');
      await client.query('ALTER TABLE registro_modificaciones ENABLE TRIGGER USER');
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  } finally { client.release(); }
}
