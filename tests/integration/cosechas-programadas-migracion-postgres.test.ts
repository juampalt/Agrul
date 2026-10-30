import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createDatabaseConnection } from '../../src/infrastructure/database/connection.js';
import { crearEsquemaPostgresAislado } from '../helpers/esquema-postgres-aislado.fixture.js';
import { sembrarCiclosRn09 } from '../helpers/sembrar-ciclos-rn09.js';
import { URL_COSECHAS } from '../helpers/cosechas-programadas-postgres.fixture.js';

const url = process.env.COSECHAS_TEST_DATABASE_URL;
if (url && url !== URL_COSECHAS) throw new Error('Destino AGRUL-056 no autorizado.');
describe.skipIf(!url)('AGRUL-056: cadena completa y compatibilidad histórica', () => {
  let base: Awaited<ReturnType<typeof crearEsquemaPostgresAislado>> | undefined;
  let nueva: ReturnType<typeof createDatabaseConnection> | undefined;
  const esquema = `agrul056_upgrade_${randomUUID().replaceAll('-', '')}`;
  const ciclo = randomUUID(), evento = randomUUID(), insumo = randomUUID();
  let historico: unknown, publico: unknown;
  let aplicadas = 0;
  let creado = false;
  const snapshot = async () => (await nueva!.pool.query(`select
    (select row_to_json(c) from ciclos_productivos c where id=$1) as ciclo,
    (select row_to_json(e) from eventos_trazabilidad e where id=$2) as evento,
    (select row_to_json(i) from insumos i where id=$3) as insumo`, [ciclo, evento, insumo])).rows;
  const snapshotPublico = async () => (await base!.connection.pool.query(`select
    (select count(*) from public.usuarios) as usuarios,(select count(*) from public.ciclos_productivos) as ciclos,
    (select count(*) from public.cosechas_programadas) as jornadas,(select count(*) from public.eventos_trazabilidad) as eventos`)).rows;
  beforeAll(async () => {
    base = await crearEsquemaPostgresAislado(url!); // Verifica destino, PG18 y rol mínimo antes de crear esquemas.
    publico = await snapshotPublico();
    if (!/^agrul056_upgrade_[a-f0-9]{32}$/.test(esquema)) throw new Error('Esquema inválido.');
    await base.connection.pool.query(`create schema "${esquema}"`); creado = true;
    const scoped = new URL(url!); scoped.searchParams.set('options', `-c search_path=${esquema},pg_catalog`);
    nueva = createDatabaseConnection(scoped.toString());
    const journal = z.object({ entries: z.array(z.object({ idx: z.number(), tag: z.string().regex(/^\d{4}_[a-z0-9_]+$/) })) })
      .parse(JSON.parse(await readFile('drizzle/migrations/meta/_journal.json', 'utf8')));
    for (const entrada of journal.entries) {
      const ddl = (await readFile(`drizzle/migrations/${entrada.tag}.sql`, 'utf8')).replace(/\bpublic\b/g, esquema);
      await nueva.pool.query(ddl); aplicadas++;
      if (entrada.idx === 23) {
        await sembrarCiclosRn09(nueva.pool, [ciclo]);
        await nueva.pool.query(`insert into eventos_trazabilidad(id,lote_id,actor_id,ubicacion_id,tipo_evento,timestamp_captura_local)
          select $1,p.lote_id,c.responsable_seguimiento_id,p.lote_id,'HISTORICO_PRE_056','2026-10-01T12:00:00Z'
          from ciclos_productivos c join plantaciones p on p.id=c.plantacion_id where c.id=$2`, [evento, ciclo]);
        await nueva.pool.query("insert into insumos(id,codigo,nombre,categoria,unidad_medida,nivel_minimo) values($1,'PRE-056','Insumo anterior','OTRO','kg',1)", [insumo]);
        historico = await snapshot();
      }
    }
  }, 30000);
  afterAll(async () => {
    try {
      await nueva?.pool.end();
      if (base) {
        if (creado) await base.connection.pool.query(`drop schema "${esquema}" cascade`);
        expect(await snapshotPublico()).toEqual(publico);
      }
    } finally { await base?.cerrar(); }
  });
  it('ejecuta las 28 migraciones desde un esquema vacío y no cambia hechos anteriores', async () => {
    expect(aplicadas).toBe(28);
    expect(await snapshot()).toEqual(historico);
    expect((await nueva!.pool.query('select count(*)::int as n from cosechas_programadas')).rows[0].n).toBe(0);
  });
  it('la programación nueva se vincula al ciclo histórico sin transformar el inventario', async () => {
    const id = randomUUID();
    await nueva!.pool.query(`insert into cosechas_programadas(id,ciclo_id,fecha_prevista,responsable_id,sector,cantidad_estimada_kg,actualizado_por)
      select $1,id,'2026-11-15',responsable_seguimiento_id,'Norte',10.25,responsable_seguimiento_id from ciclos_productivos where id=$2`, [id, ciclo]);
    expect((await nueva!.pool.query('select nuevo from cosechas_programadas_historial where jornada_id=$1', [id])).rows[0].nuevo).toMatchObject({ ciclo_id: ciclo, cantidad_estimada_kg: 10.25 });
    expect(await snapshot()).toEqual(historico);
    expect((await nueva!.pool.query('select count(*)::int as n from movimientos_inventario')).rows[0].n).toBe(0);
  });
  it('la migración conserva activos los triggers anteriores de inmutabilidad', async () => {
    await expect(nueva!.pool.query("update eventos_trazabilidad set tipo_evento='ALTERADO' where id=$1", [evento])).rejects.toThrow(/INMUTABILIDAD/);
    await expect(nueva!.pool.query('delete from eventos_trazabilidad where id=$1', [evento])).rejects.toThrow(/INMUTABILIDAD/);
    expect(await snapshot()).toEqual(historico);
  });
});
