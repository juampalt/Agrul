import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/tables.js';

const { Pool } = pg;

export type AgrulDatabase = NodePgDatabase<typeof schema>;

export function createDatabaseConnection(connectionString?: string): { db: AgrulDatabase; pool: pg.Pool } {
  const connStr = connectionString || process.env.DATABASE_URL || 'postgresql://agrul_user:agrul_pass@localhost:5432/agrul_db';
  const pool = new Pool({ connectionString: connStr });
  const db = drizzle(pool, { schema });

  return { db, pool };
}
