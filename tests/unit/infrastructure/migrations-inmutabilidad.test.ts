import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { runMigrations } from '../../../src/infrastructure/database/migrate.js';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, '../../../drizzle/migrations');

describe('AGRUL-009: Migraciones SQL y Triggers de Inmutabilidad', () => {
  it('debe existir el directorio drizzle/migrations con meta/_journal.json versionado', () => {
    expect(existsSync(migrationsFolder)).toBe(true);

    const journalPath = resolve(migrationsFolder, 'meta/_journal.json');
    expect(existsSync(journalPath)).toBe(true);

    const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
    expect(journal.dialect).toBe('postgresql');
    expect(journal.entries.length).toBeGreaterThanOrEqual(2);
  });

  it('debe contener la migración DDL con las tablas canónicas e índices', () => {
    const files = readdirSync(migrationsFolder).filter(f => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThanOrEqual(2);

    const ddlFile = files.find(f => f.startsWith('0000_'));
    expect(ddlFile).toBeDefined();

    const ddlContent = readFileSync(resolve(migrationsFolder, ddlFile!), 'utf-8');

    // Tablas obligatorias
    expect(ddlContent).toContain('CREATE TABLE "lotes"');
    expect(ddlContent).toContain('CREATE TABLE "eventos_trazabilidad"');
    expect(ddlContent).toContain('CREATE TABLE "lote_genealogia"');

    // Índices compuestos y de consulta
    expect(ddlContent).toContain('idx_eventos_lote_timestamp');
    expect(ddlContent).toContain('idx_eventos_tipo');
    expect(ddlContent).toContain('idx_eventos_referenciado');
    expect(ddlContent).toContain('idx_genealogia_padre');
    expect(ddlContent).toContain('idx_genealogia_hijo');
  });

  it('debe contener la migración custom con la función y trigger PL/pgSQL de inmutabilidad', () => {
    const triggerFile = resolve(migrationsFolder, '0001_inmutabilidad_trigger.sql');
    expect(existsSync(triggerFile)).toBe(true);

    const triggerContent = readFileSync(triggerFile, 'utf-8');

    expect(triggerContent).toContain('CREATE OR REPLACE FUNCTION rechazar_mutacion_evento_trazabilidad()');
    expect(triggerContent).toContain('VIOLACION_DE_INMUTABILIDAD');
    expect(triggerContent).toContain('CREATE TRIGGER trg_bloquear_mutacion_eventos');
    expect(triggerContent).toContain('BEFORE UPDATE OR DELETE ON eventos_trazabilidad');
  });

  it('debe contener la migración 0002 con la función y triggers PL/pgSQL de retención BPA de 3 años (RNF-06 / RN-05)', () => {
    const triggerFile = resolve(migrationsFolder, '0002_retencion_bpa_triggers.sql');
    expect(existsSync(triggerFile)).toBe(true);

    const triggerContent = readFileSync(triggerFile, 'utf-8');

    expect(triggerContent).toContain('CREATE OR REPLACE FUNCTION rechazar_delete_registros_productivos_bpa()');
    expect(triggerContent).toContain('VIOLACION_RETENCION_BPA');
    expect(triggerContent).toContain('trg_bloquear_delete_cosechas_bpa');
    expect(triggerContent).toContain('trg_bloquear_delete_actividades_bpa');
    expect(triggerContent).toContain('trg_bloquear_delete_stock_mov_bpa');
  });

  it('debe rechazar UPDATE y DELETE en eventos_trazabilidad arrojando VIOLACION_DE_INMUTABILIDAD (si hay PostgreSQL disponible)', async () => {
    const connStr = process.env.DATABASE_URL || 'postgresql://agrul_user:agrul_pass@localhost:5432/agrul_db';
    const pool = new Pool({ connectionString: connStr, connectionTimeoutMillis: 1500 });

    let client: pg.PoolClient | null = null;
    let dbAvailable = false;

    try {
      client = await pool.connect();
      dbAvailable = true;
    } catch {
      console.log('ℹ️ PostgreSQL no se encuentra levantado localmente. Saltando validación dinámica de trigger en vivo.');
    }

    if (!dbAvailable || !client) {
      await pool.end();
      return;
    }

    try {
      // 1. Aplicar migraciones
      await runMigrations(connStr);

      const loteId = '00000000-0000-0000-0000-000000000001';
      const actorId = '00000000-0000-0000-0000-000000000002';
      const ubicacionId = '00000000-0000-0000-0000-000000000003';
      const eventoId = '00000000-0000-0000-0000-000000000004';

      // 2. Insertar lote de prueba
      await client.query(`
        INSERT INTO lotes (id, codigo_lote, producto, unidad_medida)
        VALUES ($1, 'LOT-TEST-IMMUTABLE', 'Uva de Prueba', 'KG')
        ON CONFLICT (codigo_lote) DO NOTHING;
      `, [loteId]);

      // 3. Insertar evento de prueba
      await client.query(`
        INSERT INTO eventos_trazabilidad (id, lote_id, actor_id, ubicacion_id, tipo_evento, timestamp_captura_local)
        VALUES ($1, $2, $3, $4, 'COSECHA', now());
      `, [eventoId, loteId, actorId, ubicacionId]);

      // 4. Intentar UPDATE y verificar que el trigger lo bloquea
      let updateError: Error | null = null;
      try {
        await client.query(`
          UPDATE eventos_trazabilidad SET tipo_evento = 'MUTADO' WHERE id = $1;
        `, [eventoId]);
      } catch (err: unknown) {
        updateError = err as Error;
      }
      expect(updateError).toBeDefined();
      expect(updateError?.message).toContain('VIOLACION_DE_INMUTABILIDAD');

      // 5. Intentar DELETE y verificar que el trigger lo bloquea
      let deleteError: Error | null = null;
      try {
        await client.query(`
          DELETE FROM eventos_trazabilidad WHERE id = $1;
        `, [eventoId]);
      } catch (err: unknown) {
        deleteError = err as Error;
      }
      expect(deleteError).toBeDefined();
      expect(deleteError?.message).toContain('VIOLACION_DE_INMUTABILIDAD');
    } finally {
      client.release();
      await pool.end();
    }
  });
});
