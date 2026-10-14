import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabaseConnection } from './connection.js';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

/**
 * Aplica todas las migraciones versionadas de Drizzle contra la base de datos PostgreSQL,
 * incluyendo tablas base, índices y triggers PL/pgSQL de inmutabilidad.
 */
export async function runMigrations(connectionString?: string): Promise<void> {
  const { db, pool } = createDatabaseConnection(connectionString);
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = resolve(__dirname, '../../../drizzle/migrations');

  try {
    console.log(`[Agrul DB Migrate] Aplicando migraciones desde: ${migrationsFolder}`);
    await migrate(db, { migrationsFolder });
    console.log('[Agrul DB Migrate] ✅ Migraciones y triggers aplicados exitosamente.');
  } finally {
    await pool.end();
  }
}

// Ejecutar si se invoca directamente desde CLI
const currentFilePath = fileURLToPath(import.meta.url);
const executedFilePath = process.argv[1] ? resolve(process.argv[1]) : '';

if (executedFilePath && currentFilePath === executedFilePath) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Agrul DB Migrate] ❌ Error fatal ejecutando migraciones:', err);
      process.exit(1);
    });
}
