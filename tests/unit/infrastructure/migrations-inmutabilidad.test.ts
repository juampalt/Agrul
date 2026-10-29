import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { runMigrations } from '../../../src/infrastructure/database/migrate.js';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, '../../../drizzle/migrations');
const connectionString = process.env.ACTIVIDADES_TEST_DATABASE_URL;
if (connectionString && connectionString !== 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_054') {
  throw new Error('La prueba de inmutabilidad solo admite la base descartable autorizada con rol exclusivo y sin contraseña en URL.');
}

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
    expect(triggerContent).toContain("to_regclass('public.cosechas')");
    expect(triggerContent).toContain("to_regclass('public.actividades_agricolas')");
    expect(triggerContent).toContain("to_regclass('public.stock_movimientos')");
  });

  it('debe poder crear la estructura territorial desde una base vacía', () => {
    const territorioFile = resolve(migrationsFolder, '0003_territorio_finca_lotes.sql');
    const territorioContent = readFileSync(territorioFile, 'utf-8');

    expect(territorioContent).toContain('CREATE TABLE IF NOT EXISTS "fincas"');
    expect(territorioContent).toContain('ADD COLUMN IF NOT EXISTS "finca_id"');
    expect(territorioContent).toContain('ADD COLUMN IF NOT EXISTS "superficie_ha"');
    expect(territorioContent).toContain('lotes_finca_id_fincas_id_fk');
    expect(territorioContent).toContain('idx_lotes_finca');
    expect(territorioContent).toContain('idx_fincas_provincia_depto');
  });

  it.skipIf(!connectionString)('rechaza UPDATE y DELETE con el trigger PostgreSQL real', async () => {
    const pool = new Pool({ connectionString, connectionTimeoutMillis: 1500 });
    let client: pg.PoolClient | undefined;
    const loteId = crypto.randomUUID();
    const actorId = '00000000-0000-0000-0000-000000000002';
    const ubicacionId = '00000000-0000-0000-0000-000000000003';
    const eventoId = crypto.randomUUID();
    try {
      client = await pool.connect();
      const { rows } = await client.query("select current_database() as db,current_user as usuario,current_setting('server_version_num')::int as version,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls from pg_roles where rolname=current_user");
      expect(rows[0]).toMatchObject({ db: 'agrul_test_agrul_054', usuario: 'agrul_test_user', rolsuper: false, rolcreatedb: false, rolcreaterole: false, rolreplication: false, rolbypassrls: false });
      expect(rows[0].version).toBeGreaterThanOrEqual(180000);
      expect(rows[0].version).toBeLessThan(190000);
      await runMigrations(connectionString);
      await client.query('begin');

      // 2. Insertar lote de prueba
      await client.query(`
        INSERT INTO lotes (id, codigo_lote, producto, unidad_medida)
        VALUES ($1, $2, 'Uva de Prueba', 'KG');
      `, [loteId, `LOT-TEST-${loteId}`]);

      // 3. Insertar evento de prueba
      await client.query(`
        INSERT INTO eventos_trazabilidad (id, lote_id, actor_id, ubicacion_id, tipo_evento, timestamp_captura_local)
        VALUES ($1, $2, $3, $4, 'COSECHA', now());
      `, [eventoId, loteId, actorId, ubicacionId]);

      const original = await client.query('select * from eventos_trazabilidad where id=$1', [eventoId]);
      for (const sentencia of [
        "UPDATE eventos_trazabilidad SET tipo_evento = 'MUTADO' WHERE id = $1",
        'DELETE FROM eventos_trazabilidad WHERE id = $1',
      ]) {
        await client.query('savepoint intento_mutacion');
        await expect(client.query(sentencia, [eventoId])).rejects.toMatchObject({
          code: 'P0001', message: expect.stringContaining('VIOLACION_DE_INMUTABILIDAD'),
        });
        await client.query('rollback to savepoint intento_mutacion');
        expect((await client.query('select * from eventos_trazabilidad where id=$1', [eventoId])).rows).toEqual(original.rows);
        await client.query('release savepoint intento_mutacion');
      }
      await client.query('rollback');
      expect((await client.query('select id from eventos_trazabilidad where id=$1', [eventoId])).rows).toEqual([]);
      expect((await client.query('select id from lotes where id=$1', [loteId])).rows).toEqual([]);
    } finally {
      try { if (client) await client.query('rollback'); }
      finally { client?.release(); await pool.end(); }
    }
  });
});
