import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { runMigrations } from '../../src/infrastructure/database/migrate.js';

const ejecutar = promisify(execFile);
const urlAutorizada = 'postgresql://agrul_test_user@127.0.0.1:5432/agrul_test_agrul_054';

/** Copia solo DDL al esquema temporal: conserva FK, índices y triggers reales. */
export async function crearEsquemaPostgresAislado(url: string) {
  if (url !== urlAutorizada) throw new Error('Solo se admite la base descartable autorizada sin contraseña en URL.');
  const esquema = `agrul054_aislado_${randomUUID().replaceAll('-', '')}`;
  if (!/^agrul054_aislado_[a-f0-9]{32}$/.test(esquema)) throw new Error('Esquema de prueba inválido.');
  const base = createDatabaseConnection(url);
  let creado = false;
  let aislada: ReturnType<typeof createDatabaseConnection> | undefined;
  try {
    const { rows } = await base.pool.query("select current_database() as db,current_user as usuario,current_setting('server_version_num')::int as version,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls from pg_roles where rolname=current_user");
    const rol = rows[0];
    if (rol?.db !== 'agrul_test_agrul_054' || rol.usuario !== 'agrul_test_user' || rol.version < 180000 || rol.version >= 190000 ||
      rol.rolsuper || rol.rolcreatedb || rol.rolcreaterole || rol.rolreplication || rol.rolbypassrls) {
      throw new Error('Se requiere PostgreSQL 18 y el rol de pruebas sin privilegios administrativos.');
    }
    await runMigrations(url);
    // pg_dump usa pgpass por su mecanismo habitual; nunca se captura su contenido.
    const { stdout } = await ejecutar('C:/Program Files/PostgreSQL/18/bin/pg_dump.exe', [
      '--host=127.0.0.1', '--port=5432', '--username=agrul_test_user', '--dbname=agrul_test_agrul_054',
      '--no-password', '--schema-only', '--schema=public', '--no-owner', '--no-privileges', '--no-comments', '--quote-all-identifiers',
    ], { maxBuffer: 8 * 1024 * 1024, timeout: 30000 });
    // El DDL no se imprime ni se persiste. Todas las referencias a public se
    // redirigen al esquema propio, incluidas las FK y cuerpos de funciones.
    const ddl = stdout.replace(/^\\(?:un)?restrict\b.*$/gm, '').replace(/\bpublic\b/g, esquema);
    if (!ddl.includes(`CREATE SCHEMA "${esquema}";`)) throw new Error('El dump no contiene el esquema esperado.');
    const client = await base.pool.connect();
    try {
      await client.query('begin');
      await client.query(ddl);
      await client.query('commit');
      creado = true;
    } catch (error) { await client.query('rollback'); throw error; }
    finally { await client.query('reset all'); client.release(); }
    const scoped = new URL(url);
    // Sin fallback a public: una tabla ausente debe fallar, nunca usar datos ajenos.
    scoped.searchParams.set('options', `-c search_path=${esquema},pg_catalog`);
    const connectionString = scoped.toString();
    aislada = createDatabaseConnection(connectionString);
    if ((await aislada.pool.query('select current_schema() as esquema')).rows[0].esquema !== esquema) {
      throw new Error('La conexión no está aislada en el esquema temporal.');
    }
    const connection = aislada;
    return {
      esquema, connectionString, connection,
      async cerrar() {
        try { await connection.pool.end(); }
        finally {
          try { await base.pool.query(`drop schema "${esquema}" cascade`); }
          finally { await base.pool.end(); }
        }
      },
    };
  } catch (error) {
    try {
      await aislada?.pool.end();
      if (creado) await base.pool.query(`drop schema "${esquema}" cascade`);
    } finally { await base.pool.end(); }
    throw error;
  }
}
